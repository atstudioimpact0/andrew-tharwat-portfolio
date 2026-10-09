'use strict';

/**
 * AT STUDIO / OFFLINE ULTRA-PREMIUM DESIGN REVIEW
 * Build portable HTML files from EXACT feature-branch CSS, JS and HTML.
 * No database, auth endpoints, analytics, live client data, or build-time fetches.
 * This is a design QA fallback when Vercel free build quota temporarily blocks.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'control-v2-preview');
const output = path.resolve(process.argv[2] || path.join(root, 'dist', 'control-v2-offline'));
const logo = fs.readFileSync(path.join(root, 'assets', 'logo-mark-official.png'));
const logoURI = 'data:image/png;base64,' + logo.toString('base64');

const pages = [
  {
    file: 'index.html',
    output: 'control-room-preview.html',
    styles: ['control-v2.css', 'premium.css', 'ultra.css', 'founder-case-rc11.css'],
    javascript: 'control-v2.js'
  },
  {
    file: 'access.html',
    output: 'access-preview.html',
    styles: ['access.css', 'access-premium.css'],
    javascript: 'access.js'
  }
];

function replaceExactly(input, oldText, newText, expected=1) {
  const occurrences = input.split(oldText).length - 1;
  if (occurrences !== expected) {
    throw new Error('Unexpected preview structure for ' + oldText.slice(0, 64) + ': expected ' + expected + ', got ' + occurrences);
  }
  return input.split(oldText).join(newText);
}
function inlineCSS(file) {
  const css = fs.readFileSync(path.join(source, file), 'utf8').replace(/<\/style/gi, '<\\/style');
  return '<style data-offline-source="' + file + '">\n' + css + '\n</style>';
}
function inlineJS(file) {
  const js = fs.readFileSync(path.join(source, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  return '<script data-offline-source="' + file + '">\n' + js + '\n</script>';
}
function pack(page) {
  let html = fs.readFileSync(path.join(source, page.file), 'utf8');
  for (const filename of page.styles) {
    html = replaceExactly(html, '<link rel="stylesheet" href="/control-v2-preview/' + filename + '">', inlineCSS(filename));
  }
  if (page.file === 'index.html') {
    html = replaceExactly(html,
      '<script src="/control-v2-preview/founder-case-contract-rc12.js" defer></script>',
      inlineJS('founder-case-contract-rc12.js'));
  }
  html = replaceExactly(html, '<script src="/control-v2-preview/' + page.javascript + '" defer></script>', '');
  html = replaceExactly(html, '</body>', inlineJS(page.javascript) + '\n</body>');
  html = html.replaceAll('/assets/logo-mark-official.png?v=24', logoURI);

  // Offline HTML only; production/staging CSP and headers are not modified.
  const policy = [
    "default-src 'none'",
    'img-src data:',
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    "script-src 'unsafe-inline'",
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "object-src 'none'"
  ].join('; ');
  html = html.replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]+(">)/,
    (_whole, open, close) => open + policy + close);

  if (page.file === 'index.html') {
    html = replaceExactly(html, 'href="/control-v2-preview/access"', 'href="./access-preview.html"');
  } else {
    html = replaceExactly(html, 'href="/control-v2-preview"', 'href="./control-room-preview.html"', 2);
  }
  html = replaceExactly(html, '</head>',
    '<meta name="ats-review-build" content="OFFLINE DESIGN REVIEW; MOCK DATA ONLY; NO LOGIN OR NETWORK">\n</head>');

  for (const file of page.styles.concat(page.file === 'index.html' ? ['founder-case-contract-rc12.js', page.javascript] : [page.javascript])) {
    if (!html.includes('data-offline-source="' + file + '"')) throw new Error('Missing inline resource: ' + file);
  }
  if (/src="\/control-v2-preview\/|href="\/control-v2-preview\/|src="\/assets\//.test(html)) {
    throw new Error('An unresolved root-absolute resource remains in offline HTML');
  }
  fs.writeFileSync(path.join(output, page.output), html);
  console.log('Created ' + page.output + ': ' + Buffer.byteLength(html) + ' bytes');
}

fs.mkdirSync(output, {recursive:true});
pages.forEach(pack);
fs.writeFileSync(path.join(output, 'README.txt'), [
 'AT STUDIO — ULTRA-PREMIUM DESIGN REVIEW',
 '',
 '1. Extract this artifact ZIP into a folder.',
 '2. Double-click control-room-preview.html in Chrome or Edge.',
 '3. Use Ctrl+K to search and navigate. Explore Clients and Studio.',
 '4. Use Studio > Access Preview to open access-preview.html.',
 '5. Fonts may require internet access to load Google Fonts.',
 '',
 'This is an OFFLINE DESIGN PREVIEW using MOCK DATA ONLY. It does not authenticate,',
 'send email, use Supabase, connect to Zoho or save real client information.',
 'Changes made inside the preview reset on page reload. This is NOT Production.',
 ''
].join('\n'));
