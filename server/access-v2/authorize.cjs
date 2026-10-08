'use strict';

/**
 * AT Studio Access V2 authorization primitives.
 *
 * IMPORTANT:
 * - This is a pure POLICY MODULE, not a login or session implementation.
 * - Principals MUST be obtained from a verified server-side session, never from
 *   client-supplied JSON, headers, query parameters or editable JWT metadata.
 * - Resources MUST come from trusted database queries with tenant ID and ownership.
 * - Every protected endpoint MUST check its own action/ownership and log writes.
 * - Not wired to any production route; deployment requires security review.
 */

const ACTIONS = Object.freeze(new Set([
  'case:read','case:answer','case:request-info',
  'proposal:read','proposal:prepare','proposal:approve','proposal:accept',
  'task:read','task:submit','task:approve',
  'project:read','payment:read','payment:approve','staff:manage'
]));
const ROLES = Object.freeze(new Set(['founder','studio_admin','reviewer','contributor','client']));
const ROOT_ACTIONS = Object.freeze(new Set([...ACTIONS]));
const ADMIN_ACTIONS = Object.freeze(new Set([
  'case:read','case:request-info','proposal:read','proposal:prepare',
  'task:read','project:read','payment:read'
]));
const REVIEW_ACTIONS = Object.freeze(new Set([
  'case:read','proposal:read','task:read','task:approve','project:read'
]));
const CONTRIBUTOR_ACTIONS = Object.freeze(new Set(['task:read','task:submit']));
const CLIENT_ACTIONS = Object.freeze(new Set([
  'case:read','case:answer','proposal:read','proposal:accept','project:read','payment:read'
]));

function isId(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 150;
}
function hasMember(list,id) {
  return Array.isArray(list) && list.some(v=>isId(v) && v===id);
}
function hasValidPrincipal(p) {
  return !!p && typeof p === 'object' && p.verified === true &&
    isId(p.id) && isId(p.tenantId) && ROLES.has(p.role) &&
    (p.role !== 'client' || isId(p.clientId));
}
function hasValidResource(r) {
  return !!r && typeof r === 'object' && isId(r.id) &&
    isId(r.tenantId) && typeof r.kind === 'string';
}
function can(principal,action,resource) {
  if(!ACTIONS.has(action) || !hasValidPrincipal(principal) || !hasValidResource(resource))return false;
  const [type] = action.split(':');
  if(resource.kind !== type || resource.tenantId !== principal.tenantId)return false;
  if(principal.role === 'founder') return ROOT_ACTIONS.has(action);
  if(principal.role === 'studio_admin') return ADMIN_ACTIONS.has(action);
  const assignedReviewer = hasMember(resource.reviewerIds,principal.id);
  const assignedContributor = resource.assigneeId === principal.id;
  if(principal.role === 'reviewer') {
    return REVIEW_ACTIONS.has(action) && assignedReviewer;
  }
  if(principal.role === 'contributor') {
    return CONTRIBUTOR_ACTIONS.has(action) && assignedContributor;
  }
  if(principal.role === 'client') {
    if(!CLIENT_ACTIONS.has(action) || !isId(resource.clientId) || resource.clientId !== principal.clientId)return false;
    // Draft commercial data must not be exposed or acted on by clients.
    if(type==='proposal') {
      const status=resource.status;
      if(!['sent','accepted','declined','expired'].includes(status))return false;
      if(action==='proposal:accept' && status!=='sent')return false;
    }
    return true;
  }
  return false;
}
class AccessDenied extends Error {
  constructor(message='Access denied') {
    super(message); this.name='AccessDenied'; this.status=403;this.code='FORBIDDEN';
  }
}
function requireAccess(principal,action,resource) {
  if(!can(principal,action,resource))throw new AccessDenied();
  return true;
}

module.exports={can,requireAccess,AccessDenied,ACTIONS,ROLES};
