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

/**
 * RC13 secure-staging-screen VISUAL REVIEW only. This third portable page
 * replaces the real network request with a fixed synthetic response.
 * Never inject customer data, credentials or a real connection into ZIPs.
 */
function packFounderStageOffline() {
  const styles=['control-v2.css','premium.css','ultra.css',
    'founder-case-rc11.css','founder-staging-rc13.css','founder-shell-rc20.css'];
  let html=fs.readFileSync(path.join(source,'founder-staging-rc13.html'),'utf8');
  html=replaceExactly(html,'href="/control-v2/clients"','href="./founder-rc14-offline.html"',2);
  html=replaceExactly(html,'src="/control-v2/assets/logo-mark-official.png"','src="'+logoURI+'"');
  for (const filename of styles) {
    html=replaceExactly(html,
      '<link rel="stylesheet" href="/control-v2-preview/'+filename+'">',
      inlineCSS(filename));
  }
  for (const file of ['founder-case-contract-rc12.js',
    'founder-staging-rc13.js','founder-staging-rc13-init.js','founder-shell-rc20.js']) {
    html=replaceExactly(html,
      '<script src="/control-v2-preview/'+file+'" defer></script>','');
  }
  const id='83b5d6ae-73c4-42de-9f78-78c2c5100001';
  const sample={
    case_id:id,input_version:1,analysis_state:'collecting',
    intake_brief:{
      source:'unconfirmed_client_intake',
      service:'Digital / Customer journey',
      project_goal:'A small business receives inquiries but cannot track each follow-up.',
      current_assets:[],timeline:null
    },
    known:{
      current_state:'Customer questions reach several channels with no shared owner.',
      impact:'Responses may be delayed',desired_outcome:null,evidence:null
    },
    missing_fields:['evidence'],supporting_upload_count:0,
    review_pending_count:0,active_work_count:0,
    next_action:{kind:'collect_evidence',
      text:'Request one real inquiry-to-follow-up example before recommending a system.',
      task_hint:null}
  };
  const fixture=JSON.stringify(sample).replace(/</g,'\\u003c');
  const demoScript=[
    '(function(){',
    '  "use strict";',
    '  const sample='+fixture+';',
    '  const shell=window.ATS_RC20_SHELL.create({documentRef:document});',
    '  const app=window.ATS_RC13_CASE.create({',
    '    locationHref:"https://staging.atstudioimpact.com/control-v2/cases/'+id+'",',
    '    fetchFn:async()=>({status:200,',
    '      headers:{get:()=> "application/json"},',
    '      text:async()=>JSON.stringify(sample)}),',
    '    bridge:window.ATS_RC12_CASE,documentRef:document,',
    '    AbortControllerImpl:window.AbortController',
    '  });',
    '  window.addEventListener("pagehide",()=>{app.dispose();shell.dispose();},{once:true});',
    '  void app.load();',
    '})();'
  ].join('\n');
  html=replaceExactly(html,'</body>',
    inlineJS('founder-shell-rc20.js')+'\n'+
    inlineJS('founder-case-contract-rc12.js')+'\n'+
    inlineJS('founder-staging-rc13.js')+'\n'+
    '<script data-offline-source="rc13-synthetic-only">\n'+demoScript+'\n</script>\n</body>');
  html=replaceExactly(html,'<body class="rc13-body">',
    '<body class="rc13-body"><div role="status" '+
    'style="background:#fff4dc;color:#47381f;padding:12px 25px;font:700 13px Arial,sans-serif;text-align:center">'+
    'OFFLINE MOCK — FAKE CLIENT / FAKE SESSION. NO API, NO DATABASE, NO LOGIN.</div>');
  const policy=[
    "default-src 'none'",
    'img-src data:',
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "connect-src 'none'",
    "font-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "object-src 'none'"
  ].join('; ');
  html=html.replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]+(">)/,
    (_all,open,close)=>open+policy+close);
  html=replaceExactly(html,'</head>',
    '<meta name="ats-review-build" content="RC13 MOCK ONLY; NO NETWORK OR LOGIN">\n</head>');
  if (/src="\/control-v2-preview\/|href="\/control-v2-preview\/|src="\/assets\//.test(html))
    throw Error('RC13 offline output contains live asset links');
  if(!html.includes("connect-src 'none'")||!html.includes('rc13-synthetic-only'))
    throw Error('RC13 offline output failed network isolation');
  fs.writeFileSync(path.join(output,'founder-rc13-offline.html'),html);
  console.log('Created founder-rc13-offline.html: '+Buffer.byteLength(html)+' bytes');
}

/**
 * RC14 selectable Founder client index — FAKE cases, FAKE sessions,
 * zero outbound network. The listed demo client opens RC13 offline.
 */
function packFounderClientIndexOffline() {
  const styles=['control-v2.css','premium.css','ultra.css',
    'founder-case-rc11.css','founder-staging-rc13.css','founder-clients-rc14.css','founder-shell-rc20.css'];
  let html=fs.readFileSync(path.join(source,'founder-clients-rc14.html'),'utf8');
  html=replaceExactly(html,'href="/control-v2/clients"','href="./founder-rc14-offline.html"',2);
  html=replaceExactly(html,'src="/control-v2/assets/logo-mark-official.png"','src="'+logoURI+'"');
  for(const file of styles){
    html=replaceExactly(html,'<link rel="stylesheet" href="/control-v2-preview/'+file+'">',
      inlineCSS(file));
  }
  for(const file of ['founder-clients-rc14.js','founder-clients-rc14-init.js','founder-shell-rc20.js']){
    html=replaceExactly(html,
      '<script src="/control-v2-preview/'+file+'" defer></script>','');
  }
  const syntheticCursor='A'.repeat(120)+'.'+'B'.repeat(43);
  const createSample=i=>({
    case_id:'83b5d6ae-73c4-42de-9f78-'+String(i).padStart(12,'0'),
    label:i===1?'Eastline Demo — Fictional Client':'Fictional Client '+i,
    service:'Digital / Customer journey',
    problem_preview:'Client inquiry follow-up needs a clear next step (demo '+i+').',
    analysis_state:'collecting',updated_at:'2026-10-09T18:00:00.000000Z'
  });
  const fake={cases:Array.from({length:25},(_,i)=>createSample(i+1)),
    has_more:true,next_cursor:syntheticCursor};
  const moreFake={cases:[createSample(26),createSample(27)],
    has_more:false,next_cursor:null};
  const fixture=JSON.stringify(fake).replace(/</g,'\\u003c');
  const nextFixture=JSON.stringify(moreFake).replace(/</g,'\\u003c');
  const script=[
    '(function(){',
    '  "use strict";',
    '  const first='+fixture+';',
    '  const after='+nextFixture+';',
    '  const shell=window.ATS_RC20_SHELL.create({documentRef:document});',
    '  const app=window.ATS_RC14_LIST.create({',
    '    locationHref:"https://staging.atstudioimpact.com/control-v2/clients",',
    '    fetchFn:async (path)=>({status:200,headers:{get:()=> "application/json"},',
    '      text:async()=>JSON.stringify(path.includes("?cursor=")?after:first)}),',
    '    documentRef:document,AbortControllerImpl:window.AbortController',
    '  });',
    '  document.addEventListener("click",event=>{',
    '    const link=event.target.closest("#rc14-list a");',
    '    if(link){event.preventDefault();window.location.href="./founder-rc13-offline.html"}',
    '  });',
    '  window.addEventListener("pagehide",()=>{app.dispose();shell.dispose();},{once:true});',
    '  void app.load();',
    '})();'
  ].join('\n');
  html=replaceExactly(html,'</body>',
    inlineJS('founder-shell-rc20.js')+'\n'+
    inlineJS('founder-clients-rc14.js')+'\n'+
    '<script data-offline-source="rc14-synthetic-only">\n'+script+'\n</script>\n</body>');
  html=replaceExactly(html,'<body class="rc13-body rc14-body">',
    '<body class="rc13-body rc14-body"><div role="status" '+
    'style="background:#fff4dc;color:#47381f;padding:12px 25px;font:700 13px Arial,sans-serif;text-align:center">'+
    'OFFLINE MOCK — FICTIONAL CLIENTS. NO REAL SESSION, API, DATABASE OR AI.</div>');
  const policy=[
    "default-src 'none'",'img-src data:',"style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'","connect-src 'none'","font-src 'none'",
    "form-action 'none'","base-uri 'none'","object-src 'none'"
  ].join('; ');
  html=html.replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]+(">)/,
    (_whole,start,end)=>start+policy+end);
  html=replaceExactly(html,'</head>',
    '<meta name="ats-review-build" content="RC14 MOCK ONLY; ZERO NETWORK">\n</head>');
  if(/src="\/control-v2-preview\/|href="\/control-v2-preview\/|src="\/assets\//.test(html))
    throw Error('RC14 offline build contains root-absolute assets');
  if(!html.includes("connect-src 'none'")||!html.includes('rc14-synthetic-only'))
    throw Error('RC14 offline network isolation failed');
  fs.writeFileSync(path.join(output,'founder-rc14-offline.html'),html);
  console.log('Created founder-rc14-offline.html: '+Buffer.byteLength(html)+' bytes');
}

fs.mkdirSync(output, {recursive:true});
pages.forEach(pack);
packFounderStageOffline();
packFounderClientIndexOffline();
fs.writeFileSync(path.join(output, 'README.txt'), [
 'AT STUDIO — ULTRA-PREMIUM DESIGN REVIEW',
 '',
 '1. Extract this artifact ZIP into a folder.',
 '2. Double-click control-room-preview.html in Chrome or Edge.',
 '3. Use Ctrl+K to search and navigate. Explore Clients and Studio.',
 '4. Use Studio > Access Preview to open access-preview.html.',
 '5. Open founder-rc14-offline.html: premium RC20 Founder shell with 25 FICTIONAL clients.',
 '   Test mobile navigation and Arabic / English. Click Load More for two more demo clients.',
 '   Choose a fictional client to open the RC13 offline case. No live API connection.',
 '6. You can also open founder-rc13-offline.html directly (FAKE data only).',
 '   Both RC13/RC14 pages are mock demos, with no backend or real login.',
 '7. Some legacy preview fonts may require Google Fonts; RC13/RC14 use local fallbacks.',
 '',
 'This is an OFFLINE DESIGN PREVIEW using MOCK DATA ONLY. It does not authenticate,',
 'send email, use Supabase, connect to Zoho or save real client information.',
 'Changes made inside the preview reset on page reload. This is NOT Production.',
 ''
].join('\n'));
