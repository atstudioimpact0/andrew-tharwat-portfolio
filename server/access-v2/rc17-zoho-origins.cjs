'use strict';
/**
 * Shared, immutable ATS staging allowlist of Zoho Accounts issuer DCs.
 * This is a server-only constant: never infer issuer from a browser location.
 */
const SUPPORTED_ZOHO_ORIGINS=Object.freeze([
 'https://accounts.zoho.com','https://accounts.zoho.eu',
 'https://accounts.zoho.in','https://accounts.zoho.com.au',
 'https://accounts.zoho.jp','https://accounts.zoho.com.cn',
 'https://accounts.zoho.ca','https://accounts.zoho.sa'
]);
module.exports={SUPPORTED_ZOHO_ORIGINS};
