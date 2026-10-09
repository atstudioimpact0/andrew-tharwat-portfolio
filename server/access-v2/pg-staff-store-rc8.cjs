'use strict';

/**
 * ATS Access V2 — RC8 staging PostgreSQL session storage.
 *
 * The caller injects a trusted, PRIVATE database connection/pool implementing
 * query(text, values). No database credentials, listener, session token, or
 * staff role ever comes from a browser. Not wired to a deployed HTTP route.
 *
 * Uses the *existing* V2 issueStaffSession/authenticateStaffSession contract.
 * The DB must already have ats_access_v2.staff and .sessions (RC2 schema).
 */
const TOKEN_HASH=/^[a-f0-9]{64}$/;
const ROLES=new Set(['founder','studio_admin','reviewer','contributor']);
const TWO_HOURS=7200000;

class SessionStoreDenied extends Error{
  constructor(){super('Protected session unavailable');this.name='SessionStoreDenied';this.code='SESSION_STORE_DENIED'}
}
const denied=()=>{throw new SessionStoreDenied()};
function text(v,max=300){return typeof v==='string'&&v.length>0&&v.length<=max&&v.trim()===v}
function checkedPool(pool){if(!pool||typeof pool.query!=='function')denied();return pool}
function validRecord(x){
 return x&&text(x.id,150)&&text(x.tenantId,150)&&x.tenantId.length>=4&&
  text(x.issuer)&&text(x.subject)&&ROLES.has(x.role)&&
  Number.isSafeInteger(x.issuedAt)&&Number.isSafeInteger(x.expiresAt)&&
  x.expiresAt>x.issuedAt&&x.expiresAt-x.issuedAt<=TWO_HOURS;
}
function millis(v){
 if(v instanceof Date)return v.getTime();
 if(typeof v==='string')return Date.parse(v);
 return NaN;
}
function mapStaff(row){
 if(!row||!text(row.id,150)||!text(row.tenant_id,150)||
    !text(row.issuer)||!text(row.subject)||!ROLES.has(row.role)||
    typeof row.active!=='boolean')return null;
 return Object.freeze({id:row.id,tenantId:row.tenant_id,
   role:row.role,issuer:row.issuer,subject:row.subject,active:row.active});
}
function createPgStaffStore({pool}){
 checkedPool(pool);
 return Object.freeze({
  async lookupStaff({issuer,subject}){
   if(!text(issuer)||!text(subject))return null;
   const r=await pool.query(
    'SELECT id,tenant_id,role,issuer,subject,active FROM ats_access_v2.staff '+
    'WHERE issuer=$1 AND subject=$2 LIMIT 1',[issuer,subject]);
   return mapStaff(r?.rows?.[0]);
  },
  async create(hash,record){
   if(!TOKEN_HASH.test(hash)||!validRecord(record))denied();
   // Inserts only while *the currently approved staff record* matches every
   // claimed identifier, tenant and role. FK gives an additional safeguard.
   const r=await pool.query(
    'INSERT INTO ats_access_v2.sessions '+
    '(token_hash,staff_id,tenant_id,role,issuer,subject,issued_at,expires_at) '+
    'SELECT $1,s.id,s.tenant_id,s.role,s.issuer,s.subject,$7::timestamptz,$8::timestamptz '+
    'FROM ats_access_v2.staff s WHERE s.id=$2 AND s.tenant_id=$3 '+
    'AND s.role=$4 AND s.issuer=$5 AND s.subject=$6 AND s.active=TRUE '+
    'ON CONFLICT (token_hash) DO NOTHING RETURNING token_hash',
    [hash,record.id,record.tenantId,record.role,record.issuer,
     record.subject,new Date(record.issuedAt).toISOString(),
     new Date(record.expiresAt).toISOString()]);
   if(r?.rowCount!==1||r?.rows?.[0]?.token_hash!==hash)denied();
  },
  async get(hash){
   if(typeof hash!=='string'||!TOKEN_HASH.test(hash))return null;
   const r=await pool.query(
    'SELECT staff_id,tenant_id,role,issuer,subject,issued_at,expires_at '+
    'FROM ats_access_v2.sessions WHERE token_hash=$1 LIMIT 1',[hash]);
   const row=r?.rows?.[0];
   if(!row)return null;
   const issuedAt=millis(row.issued_at),expiresAt=millis(row.expires_at);
   if(!validRecord({id:row.staff_id,tenantId:row.tenant_id,role:row.role,
                   issuer:row.issuer,subject:row.subject,issuedAt,expiresAt}))denied();
   return Object.freeze({id:row.staff_id,tenantId:row.tenant_id,role:row.role,
       issuer:row.issuer,subject:row.subject,issuedAt,expiresAt});
  },
  async delete(hash){
   if(typeof hash!=='string'||!TOKEN_HASH.test(hash))return;
   await pool.query('DELETE FROM ats_access_v2.sessions WHERE token_hash=$1',[hash]);
  }
 });
}
module.exports={createPgStaffStore,SessionStoreDenied};
