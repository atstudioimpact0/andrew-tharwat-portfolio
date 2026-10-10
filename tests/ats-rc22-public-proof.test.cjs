'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file), 'utf8');

test('RC22: current production-root V9 HTML includes audience note immediately below subtitle', () => {
  const html = read('v9/index.html');
  assert.match(html, /id="hero-subtitle"[^>]*>[^<]*<\/p>\s*<p class="ats-audience-note" lang="ar" dir="rtl">للمقاولين والمصانع في مصر<\/p>/);
  assert.match(html, /\/v9\/ats-home-audience-rc22\.css\?v=1/);
  assert.match(read('vercel.json'), /"source": "\/",\s*"destination": "\/v9\/index\.html"/);
});
test('RC22: audience note is Arabic-only and works with real language toggle', () => {
  const css=read('v9/ats-home-audience-rc22.css');
  assert.match(css,/\.ats-audience-note\s*\{\s*display:none/);
  assert.match(css,/body\[data-lang="ar"\][\s\S]*?\.ats-audience-note\s*\{/);
  assert.match(read('v9/v9.js'),/document\.body\.dataset\.lang=lang/);
});
test('RC22: contact buttons, form flow and review CTA remain in place', () => {
  const html=read('v9/index.html');
  assert.match(html,/id="concierge-submit"/);
  assert.match(html,/id="concierge-contact-back"/);
  assert.match(html,/href="#contact" data-en="START WITH YOUR PROBLEM/);
  const v10=read('v9/v9-home-v10.js');
  assert.match(v10,/actions\[0\]\.href='#contact'/);
  assert.match(v10,/actions\[1\]\.href='#work'/);
});
test('RC22: HSE case has four scoped sections, gallery evidence and no invented impact', () => {
  const js=read('project-v9-case-study.js');
  const scoped=js.match(/function hseProofMarkup\(\) \{[\s\S]*?\n  \}\n\n  function markup\(\)/);
  assert.ok(scoped,'Scoped HSE renderer exists');
  assert.match(scoped[0],/المشكلة/);
  assert.match(scoped[0],/اللي اتعمل/);
  assert.match(scoped[0],/النتيجة/);
  assert.match(scoped[0],/الصورة/);
  assert.match(scoped[0],/case-visual-evidence/);
  assert.match(js,/if \(slug === 'hse-awareness-series'\) return hseProofMarkup\(\)/);
  assert.match(js,/if \(slug === 'do-personalized-stories'\) return doMarkup\(\)/);
  assert.match(read('project.html'),/project-hse-proof-rc22\.css/);
  assert.doesNotMatch(scoped[0],/\d+%\s*(?:impact|improvement|reduction)/i);
  assert.match(read('project-hse-series.js'),/6 CONNECTED AWARENESS TOPICS/);
});
test('RC22: JavaScript syntax and responsive/reduced-motion styles are valid', () => {
  for (const file of ['project-v9-case-study.js','v9/v9-home-v10.js']) {
    const run=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});
    assert.equal(run.status,0, `${file}: ${run.stderr}`);
  }
  assert.match(read('project-hse-proof-rc22.css'),/@media\(max-width:760px\)/);
  assert.match(read('project-hse-proof-rc22.css'),/prefers-reduced-motion/);
});
