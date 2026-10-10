/* AT STUDIO | Official-domain controlled UX test.
 * Synthetic cases only. Absolutely no real HTTP API, auth, storage or AI.
 * Reuses the existing RC12–RC20 adapters, not a separate product rewrite.
 */
(function(){
'use strict';
const root='/ats-control-test/', casePage=location.pathname.endsWith('/case.html');
const shell=window.ATS_RC20_SHELL.create({documentRef:document});
const id=n=>'83b5d6ae-73c4-42de-9f78-'+String(n).padStart(12,'0');
const isDemoId=value=>/^83b5d6ae-73c4-42de-9f78-\d{12}$/.test(value)&&Number(value.slice(-12))>=1&&Number(value.slice(-12))<=27;
const selected=new URLSearchParams(location.search).get('case')||id(1);
const caseId=isDemoId(selected)?selected:id(1);
const status=()=>document.getElementById('ats-lab-scenario').value;
const response=(code,value)=>({status:code,headers:{get:()=> 'application/json; charset=utf-8'},text:async()=>JSON.stringify(value)});
const client=n=>({
 case_id:id(n),label:n===1?'Eastline Demo · عميل افتراضي':n===2?'North Studio · مثال تجريبي':'Test Client '+n,
 service:n%3===0?'HSE Learning':n%3===1?'Digital Journey':'Brand & Content',
 problem_preview:n%3===0?'كيف نتأكد إن المعلومة تحولت لقرار آمن في الموقع؟':
  n%3===1?'طلبات العملاء بتيجي من قنوات متفرقة ومن غير متابعة واضحة':
  'العميل محتاج يفهم القيمة الحقيقية للحل قبل بدء التنفيذ',
 analysis_state:'collecting',updated_at:'2026-10-10T10:00:00.000001Z'
});
const first={cases:Array.from({length:25},(_,i)=>client(i+1)),has_more:true,next_cursor:'A'.repeat(120)+'.'+'B'.repeat(43)};
const second={cases:[client(26),client(27)],has_more:false,next_cursor:null};
const sample={
 case_id:caseId,input_version:1,analysis_state:'collecting',
 intake_brief:{
  source:'unconfirmed_client_intake',service:'Digital / Customer Journey',
  project_goal:'العميل بيستقبل الطلبات من قنوات مختلفة، لكن مفيش رؤية واضحة للمتابعة أو حالة كل طلب.',
  current_assets:[],timeline:null
 },
 known:{current_state:'أسئلة وطلبات العملاء بتوصل في أوقات مختلفة بدون سجل متابعة موحد.',
  impact:'قد تتأخر الاستجابة وتضيع تفاصيل مهمة.',desired_outcome:null,evidence:null},
 missing_fields:['evidence'],supporting_upload_count:0,review_pending_count:0,active_work_count:0,
 next_action:{kind:'collect_evidence',text:'اطلب مثالًا موثّقًا لطلب واحد: وقت التواصل، الرد، والمسؤول عن المتابعة قبل اختيار الحل.',task_hint:null}
};
let app;
if(casePage){
 app=window.ATS_RC13_CASE.create({
  locationHref:'https://staging.atstudioimpact.com/control-v2/cases/'+caseId,
  fetchFn:async()=>{
   const s=status();
   if(!isDemoId(selected)||s==='empty')return response(404,{error:'not_found'});
   if(s==='expired')return response(401,{error:'unauthenticated'});
   if(s==='forbidden')return response(403,{error:'forbidden'});
   if(s==='unavailable')return response(503,{error:'temporarily_unavailable'});
   return response(200,sample);
  },
  bridge:window.ATS_RC12_CASE,documentRef:document,AbortControllerImpl:AbortController
 });
}else{
 app=window.ATS_RC14_LIST.create({
  locationHref:'https://staging.atstudioimpact.com/control-v2/clients',
  fetchFn:async path=>{
   const s=status();
   if(s==='expired')return response(401,{error:'unauthenticated'});
   if(s==='forbidden')return response(403,{error:'forbidden'});
   if(s==='unavailable')return response(503,{error:'temporarily_unavailable'});
   if(s==='empty')return response(200,{cases:[],has_more:false,next_cursor:null});
   return response(200,path.includes('?cursor=')?second:first);
  },
  documentRef:document,AbortControllerImpl:AbortController
 });
 document.addEventListener('click',event=>{
  const anchor=event.target.closest&&event.target.closest('#rc14-list a.rc14-entry-link');
  if(!anchor)return;
  event.preventDefault();
  const candidate=anchor.getAttribute('href')?.split('/').at(-1);
  if(isDemoId(candidate))location.assign(root+'case.html?case='+encodeURIComponent(candidate));
 });
}
document.getElementById('ats-lab-scenario').addEventListener('change',()=>{
 document.getElementById('ats-lab-status').textContent='اختبار: '+status();
 app.load();
});
document.getElementById('ats-lab-report').addEventListener('click',async()=>{
 const report=[
  'ATS Control Room · Official-domain UX Test (FICTIONAL DATA)',
  'Page: '+(casePage?'Client case':'Client list'),
  'Scenario: '+status(),
  'Viewport: '+innerWidth+' × '+innerHeight,
  'Language: '+document.documentElement.lang,
  'Time UTC: '+new Date().toISOString(),
  'Problem you saw: '
 ].join('\n');
 const message=document.getElementById('ats-lab-status');
 try{
  await navigator.clipboard.writeText(report);
  message.textContent='تم نسخ التقرير — ابعته في الشات';
 }catch{
  const area=document.createElement('textarea');
  area.value=report;area.readOnly=true;
  area.style.cssText='position:fixed;inset:10px;z-index:1000;width:90%;min-height:140px;background:white;color:black';
  document.body.appendChild(area);area.focus();area.select();
  message.textContent='انسخ النص الظاهر بنفسك';
  area.addEventListener('blur',()=>area.remove(),{once:true});
 }
});
window.addEventListener('pagehide',()=>{app.dispose();shell.dispose()},{once:true});
app.load();
})();
