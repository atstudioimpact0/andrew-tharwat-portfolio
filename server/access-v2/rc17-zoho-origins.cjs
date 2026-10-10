'use strict';
/* Keep the approved Zoho Accounts issuer regions as a strict origin allowlist.
 * Do not allow user-supplied OIDC endpoints or redirect origins.
 */
const SUPPORTED_ZOHO_ORIGINS=Object.freeze(new Set([
 'https://accounts.zoho.com','https://accounts.zoho.eu',
 'https://accounts.zoho.in','https://accounts.zoho.com.au',
 'https://accounts.zoho.jp','https://accounts.zoho.com.cn',
 'https://accounts.zoho.ca','https://accounts.zoho.sa'
]));
module.exports={SUPPORTED_ZOHO_ORIGINS};
