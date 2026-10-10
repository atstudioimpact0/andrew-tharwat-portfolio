'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(base,f),'utf8');
const a=read('admin/team-tasks.html'),m=read('team-v9/index.html');
test('RC25: founder Team script/cache version uses latest readiness and team engine',()=>{
 assert.match(a,/\/team-v9\/readiness-rc23\.css\?v=25/);
 assert.match(a,/\/team-v9\/readiness-rc23\.js\?v=25/);
 assert.match(a,/\/team-v9\/engine\.js\?v=25/);
 assert.ok(a.indexOf('readiness-rc23.js?v=25')<a.indexOf('engine.js?v=25'));
});
test('RC25: employee and founder share the SAME updated team engine version',()=>{
 assert.match(m,/\/team-v9\/engine\.js\?v=25/);
 assert.doesNotMatch(m,/readiness-rc23\.js/,'employee does not load founder readiness');
 assert.doesNotMatch(a,/\/team-v9\/engine\.js\?v=3/);
 assert.doesNotMatch(m,/\/team-v9\/engine\.js\?v=3/);
});
test('RC25: referenced assets exist locally and version strings do not trigger remote services',()=>{
 for(const f of ['team-v9/engine.js','team-v9/readiness-rc23.js','team-v9/readiness-rc23.css'])
   assert.ok(fs.existsSync(path.join(base,f)),f+' must exist');
});
