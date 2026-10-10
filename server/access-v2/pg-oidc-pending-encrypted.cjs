'use strict';
/**
 * ATS Access V2 / Staging-only encrypted OIDC pending transactions.
 * Candidate adapter for existing V2 beginStaffLogin / finishStaffLogin interfaces.
 * NOT deployed, not a full login implementation, not a credential manager.
 *
 * Requires an injected trusted PostgreSQL Pool and 32-byte server-only key.
 * Uses AES-256-GCM with per-value random 96-bit IV and state/field AAD.
 * Staging DB uses a 5-minute TTL and one-time DELETE ... RETURNING.
 * Sensitive values (verifier and nonce) are never passed as plaintext to SQL.
 */
const { createHash, createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');

const STATE_RE = /^[A-Za-z0-9_-]{43}$/;
const SHA_RE = /^[0-9a-f]{64}$/;
const MAX_TTL_MS = 300000;
const PREFIX = 'v1';

class PendingDenied extends Error {
  constructor() { super('OIDC pending transaction unavailable'); this.name = 'PendingDenied'; this.code = 'PENDING_DENIED'; }
}
function assertString(x, min, max) {
  if (typeof x !== 'string' || x.length < min || x.length > max) throw new PendingDenied();
}
function hashState(state) {
  if (typeof state !== 'string' || !STATE_RE.test(state)) throw new PendingDenied();
  return createHash('sha256').update(state, 'utf8').digest('hex');
}
function validHttpsUrl(x, max) {
  assertString(x, 8, max);
  let u; try { u = new URL(x); } catch { throw new PendingDenied(); }
  if (u.protocol !== 'https:' || u.username || u.password || u.hash || (u.href !== x && u.origin !== x)) throw new PendingDenied();
}
function b64(buf) { return buf.toString('base64url'); }
function from64(s, size) {
  const buf = Buffer.from(s, 'base64url');
  if (buf.length !== size || b64(buf) !== s) throw new PendingDenied();
  return buf;
}
function seal(value, hash, field, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('ats-v2:pending:' + hash + ':' + field, 'utf8'));
  const cipherText = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [PREFIX, b64(iv), b64(cipher.getAuthTag()), b64(cipherText)].join('.');
}
function unseal(envelope, hash, field, key) {
  try {
    if (typeof envelope !== 'string') throw new PendingDenied();
    const p = envelope.split('.');
    if (p.length !== 4 || p[0] !== PREFIX) throw new PendingDenied();
    const iv = from64(p[1], 12), tag = from64(p[2], 16);
    const raw = Buffer.from(p[3], 'base64url');
    if (!raw.length || b64(raw) !== p[3]) throw new PendingDenied();
    const dec = createDecipheriv('aes-256-gcm', key, iv);
    dec.setAAD(Buffer.from('ats-v2:pending:' + hash + ':' + field, 'utf8'));
    dec.setAuthTag(tag);
    return Buffer.concat([dec.update(raw), dec.final()]).toString('utf8');
  } catch { throw new PendingDenied(); }
}
function createPgOidcPendingEncrypted({ pool, encryptionKey }) {
  if (!pool || typeof pool.query !== 'function' || !Buffer.isBuffer(encryptionKey) || encryptionKey.length !== 32) throw new PendingDenied();
  const key = Buffer.from(encryptionKey);
  return Object.freeze({
    async create(state, data) {
      const stateHash = hashState(state);
      if (!data || typeof data !== 'object') throw new PendingDenied();
      assertString(data.verifier, 43, 128); assertString(data.nonce, 32, 63);
      if (!SHA_RE.test(data.browserBindingHash || '')) throw new PendingDenied();
      validHttpsUrl(data.issuer, 300); validHttpsUrl(data.callbackUrl, 500);
      assertString(data.clientId, 3, 300);
      if (!Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now() || data.expiresAt > Date.now() + MAX_TTL_MS + 15000) throw new PendingDenied();
      const verifier = seal(data.verifier, stateHash, 'verifier', key);
      const nonce = seal(data.nonce, stateHash, 'nonce', key);
      await pool.query("INSERT INTO ats_access_v2.oidc_pending " +
        "(state_hash, verifier, nonce, browser_binding_hash, issuer, client_id, callback_url, created_at, expires_at) " +
        "VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now() + interval '5 minutes')",
      [stateHash, verifier, nonce, data.browserBindingHash, data.issuer, data.clientId, data.callbackUrl]);
    },
    async consume(state) {
      const stateHash = hashState(state);
      const result = await pool.query("DELETE FROM ats_access_v2.oidc_pending " +
        "WHERE state_hash=$1 " +
        "RETURNING verifier,nonce,browser_binding_hash,issuer,client_id,callback_url,expires_at", [stateHash]);
      const row = result?.rows?.[0];
      if (!row) return null;
      const expiresAt = row.expires_at instanceof Date ? row.expires_at.valueOf() : Date.parse(row.expires_at);
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
      const verifier = unseal(row.verifier, stateHash, 'verifier', key);
      const nonce = unseal(row.nonce, stateHash, 'nonce', key);
      assertString(verifier, 43, 128); assertString(nonce, 32, 63);
      if (!SHA_RE.test(row.browser_binding_hash || '')) throw new PendingDenied();
      return Object.freeze({
        verifier, nonce, browserBindingHash: row.browser_binding_hash,
        issuer: row.issuer, clientId: row.client_id, callbackUrl: row.callback_url, expiresAt
      });
    }
  });
}
module.exports = { createPgOidcPendingEncrypted, PendingDenied };
