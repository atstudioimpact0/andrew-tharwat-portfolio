'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(base,file),'utf8');
const html=read('v9/index.html');
const css=read('v9/v9-launch-hero.css');
const config=JSON.parse(read('vercel.json'));
const home=html.slice(html.indexOf('<section class="hero'),html.indexOf('<section class="studio-intro"'));
test('Launch uses the homepage actually served by "/" Vercel rewrite',()=>{
 const rootRule=config.rewrites.find(r=>r.source==='/');
 assert.equal(rootRule?.destination,'/v9/index.html');
 assert.match(home,/class="hero grid-bg ats-launch-hero"/);
 assert.match(html,/href="\/v9\/v9-launch-hero\.css\?v=1"/);
 assert.ok(html.indexOf('v9-launch-hero.css')<html.indexOf('</head>'));
});
test('Launch starts with the problem: bilingual copy and authentic approved ATS method',()=>{
 for(const literal of ['THE PROBLEM','COMES FIRST.','Different minds. Different tools. One direction.',
  'TELL US THE CHALLENGE','BUILD WHAT WORKS','01 / UNDERSTAND',
  '02 / ASSEMBLE','03 / BUILD','04 / VERIFY',
  'المشكلة أولًا','والحل يتبني حواليها','عقول مختلفة. أدوات مختلفة. اتجاه واحد.']){
  assert.ok(home.includes(literal),literal);
 }
 assert.equal((home.match(/<h1\b/g)||[]).length,1);
 assert.match(home,/data-en-html="THE PROBLEM<br><span>COMES FIRST.<\/span>"/);
 assert.match(home,/data-ar-html="المشكلة أولًا.<br><span>والحل يتبني حواليها.<\/span>"/);
});
test('Primary CTA uses EXISTING Concierge, never a new form or insecure external link',()=>{
 assert.match(home,/<a class="btn primary ats-launch-cta" href="#contact"/);
 assert.match(html,/id="contact"/);
 assert.match(html,/id="studio-concierge"/);
 assert.match(html,/src="\/v9\/v9-concierge\.js\?v=6"/);
 assert.match(home,/href="#work"/);
 assert.doesNotMatch(home,/<form|https?:\/\/|mailto:/i);
});
test('Launch is pure CSS/HTML: no fake KPIs, credentials, scripts or storage',()=>{
 assert.doesNotMatch(home,/data:image|<script|fetch\s*\(|<iframe|localStorage|client_secret|ACCESS_TOKEN/i);
 assert.doesNotMatch(home,/100\+|trusted by|projects delivered|99% success/i);
 assert.doesNotMatch(css,/@import|url\(|fetch|https?:\/\//i);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/body\[data-lang=ar\]/);
});
test('Homepage remains fully integrated with existing pages, nav, client intake and projects',()=>{
 for(const id of ['id="home"','id="studio"','id="capabilities"','id="work"','id="contact"','id="studio-concierge"','id="main-content"']){
  assert.ok(html.includes(id),id);
 }
 assert.match(html,/href="\/air"/);
 assert.match(html,/src="\/v9\/v9-lead-submit\.js\?v=4"/);
 assert.match(html,/src="\/v9\/v9-brief-recovery\.js\?v=1"/);
 assert.match(html,/src="\/v9\/v9-polish\.js\?v=16"/);
});
test('Launch illustration is accessible text, not a fake screenshot of client data',()=>{
 assert.match(home,/class="hero-visual ats-launch-visual" role="group" aria-labelledby="ats-launch-method-label"/);
 assert.match(home,/id="ats-launch-method-label" data-en=/);
 assert.match(home,/data-en="WHAT NEEDS TO CHANGE\?"/);
 assert.match(home,/data-ar="إيه اللي محتاج يتغيّر؟"/);
 assert.match(home,/data-en="A SYSTEM FOR MAKING THINGS WORK"/);
 assert.match(home,/data-en="START HERE"/);
 assert.doesNotMatch(home,/image\/|<img|<canvas/);
});

test('Social previews, canonical metadata and launch-oriented title use existing official artwork',()=>{
 assert.match(html,/<meta name="robots" content="index,follow,max-image-preview:large"/);
 assert.match(html,/<link rel="canonical" href="https:\/\/atstudioimpact\.com\/"/);
 assert.match(html,/<meta property="og:site_name" content="AT Studio"/);
 assert.match(html,/<meta property="og:image" content="https:\/\/atstudioimpact\.com\/assets\/logo-mark-official\.png"/);
 assert.match(html,/<meta name="twitter:card" content="summary"/);
 const runtime=read('v9/v9.js');
 assert.match(runtime,/Different minds, different tools, one direction/);
 assert.match(runtime,/استوديو متعدد التخصصات لحل المشكلات/);
});
test('Launch SEO files do not list private Studio OS or employee portals for discovery',()=>{
 const robots=read('robots.txt'),site=read('sitemap.xml');
 assert.match(robots,/Disallow: \/admin\//);
 assert.match(robots,/Disallow: \/team-v9\//);
 assert.match(robots,/Disallow: \/client-access\//);
 assert.match(robots,/Disallow: \/ats-control-test\//);
 assert.match(robots,/Sitemap: https:\/\/atstudioimpact\.com\/sitemap\.xml/);
 assert.match(site,/<loc>https:\/\/atstudioimpact\.com\/<\/loc>/);
 assert.doesNotMatch(site,/admin|team-v9|ats-control-test|client-access/);
});
