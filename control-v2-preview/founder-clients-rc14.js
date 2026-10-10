/* AT STUDIO RC14 — Staging-only Founder case selector.
 * Read-only client browser. No bearer token, service keys, client-side cache,
 * analytics, payment, POST, AI, or XSS-prone HTML insertion.
 * Only runs at https://staging.atstudioimpact.com/control-v2/clients
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ATS_RC14_LIST=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const ORIGIN='https://staging.atstudioimpact.com';
 const PAGE='/control-v2/clients';
 const API='/api/v2/founder/cases';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const STRINGS={
  ar:{heading:'العملاء',kicker:'ابدأ من المشكلة',search:'ابحث باسم العميل أو الخدمة أو المشكلة',
   loading:'تحميل العملاء المسموح لك بمراجعتهم…',none:'لا توجد ملفات عملاء مرتبطة بصلاحيتك حتى الآن.',
   count:'ملفات متاحة للمراجعة',open:'افتح الملف',only:'كل ملف يحتاج مراجعة بشرية؛ لا تحليل AI تلقائي.',
   limited:'النتائج المعروضة أحدث 25 ملفًا. التحميل الإضافي غير متاح لهذه الاستجابة.',
   more:'تحميل المزيد من الملفات',moreError:'تعذر تحميل ملفات إضافية. لم نفقد الملفات المعروضة؛ جرّب مرة أخرى.',
   retry:'إعادة المحاولة',refresh:'تحديث',expired:'انتهت الجلسة. سجّل الدخول من المسار الرسمي.',
   forbidden:'حسابك غير مصرح له بمراجعة ملفات العملاء.',
   failed:'تعذّر قراءة الملفات بأمان. حاول مرة أخرى.',invalid:'تعذر التأكد من البيانات.',
   host:'الصفحة متاحة فقط على Staging الآمن.',noMatch:'لا توجد نتائج مطابقة للبحث.',
   title:'ATS — اختيار العميل'},
  en:{heading:'Clients',kicker:'Start with the problem',search:'Search by client, service or challenge',
   loading:'Loading cases within your approved scope…',none:'No client cases are assigned to your authorized scope yet.',
   count:'Cases for human review',open:'Open case',only:'Every case requires human review; no automatic AI analysis.',
   limited:'Showing the newest 25 cases. This response has no verified continuation.',
   more:'Load more cases',moreError:'More cases could not be loaded. Existing cases remain; please retry.',
   retry:'Try again',refresh:'Refresh',expired:'Your session expired. Sign in through the official route.',
   forbidden:'You do not have access to the Founder client workspace.',
   failed:'Cases could not be loaded safely. Please try again.',invalid:'Case data could not be verified.',
   host:'This page is restricted to protected HTTPS Staging.',noMatch:'No cases match your search.',
   title:'ATS — Select a client'}
 };
 const clean=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
 function validUrl(input){
  let u;try{u=new URL(input)}catch{return false}
  return u.protocol==='https:'&&u.origin===ORIGIN&&!u.username&&!u.password&&
   (u.pathname===PAGE||u.pathname===PAGE+'/')&&!u.search&&!u.hash;
 }
 function project(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||
    !Array.isArray(body.cases)||body.cases.length>25||
    typeof body.has_more!=='boolean')return null;
  const cursor=body.next_cursor??null;
  if(cursor!==null && (typeof cursor!=='string'||cursor.length<40||cursor.length>700||
     !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cursor)))return null;
  if(!body.has_more && cursor!==null)return null;
  const ids=new Set(),items=[];
  for(const x of body.cases){
   if(!x||typeof x!=='object'||Array.isArray(x)||!UUID.test(x.case_id||'')||
      typeof x.label!=='string'||typeof x.service!=='string'||
      typeof x.problem_preview!=='string'||typeof x.analysis_state!=='string'||
      typeof x.updated_at!=='string'||!Number.isFinite(Date.parse(x.updated_at)))return null;
   const id=x.case_id.toLowerCase();
   if(ids.has(id))return null;
   ids.add(id);
   items.push(Object.freeze({
    case_id:id,label:clean(x.label,120)||'Case',service:clean(x.service,120),
    problem_preview:clean(x.problem_preview,180),analysis_state:clean(x.analysis_state,40)
   }));
  }
  return Object.freeze({cases:items,has_more:body.has_more,next_cursor:cursor});
 }
 function create({locationHref,fetchFn,documentRef,AbortControllerImpl}){
  if(typeof fetchFn!=='function'||!documentRef||typeof AbortControllerImpl!=='function')
   throw Error('RC14 missing browser adapters');
  const el=id=>documentRef.getElementById(id);
  const ids=['rc14-status','rc14-list','rc14-lang','rc14-retry','rc14-refresh',
   'rc14-search','rc14-count','rc14-limit','rc14-title','rc14-kicker','rc14-caption'];
  if(ids.some(id=>!el(id)))throw Error('RC14 incomplete page');
  let lang='ar',cases=null,seq=0,abort=null,disposed=false,key='loading';
  let moreAbort=null,moreSeq=0,loadingMore=false;
  const consumedCursors=new Set();
  function t(k){return STRINGS[lang][k]||k}
  function put(id,value){el(id).textContent=String(value||'')}
  function state(kind){
   key=kind;el('rc14-list').replaceChildren();cases=null;
   const more=el('rc15-more');if(more){more.hidden=true;more.disabled=true}
   put('rc14-count','');put('rc14-limit','');
   put('rc14-status',t(kind));
   el('rc14-status').hidden=false;
   el('rc14-retry').hidden=kind!=='failed'&&kind!=='invalid';
  }
  function translate(){
   documentRef.documentElement.lang=lang;documentRef.documentElement.dir=lang==='ar'?'rtl':'ltr';
   documentRef.title=t('title');
   put('rc14-title',t('heading'));put('rc14-kicker',t('kicker'));
   put('rc14-caption',t('only'));
   put('rc14-lang',lang==='ar'?'EN':'عربي');
   put('rc14-retry',t('retry'));put('rc14-refresh',t('refresh'));
   if(el('rc15-more'))put('rc15-more',t('more'));
   el('rc14-search').placeholder=t('search');
  }
  function list(){
   const rootEl=el('rc14-list');rootEl.replaceChildren();
   if(!cases)return;
   const needle=el('rc14-search').value.trim().toLocaleLowerCase();
   const filtered=cases.cases.filter(c=>(c.label+' '+c.service+' '+c.problem_preview).toLocaleLowerCase().includes(needle));
   if(filtered.length===0){
    el('rc14-status').hidden=false;
    put('rc14-status',t(cases.cases.length?'noMatch':'none'));
   }else el('rc14-status').hidden=true;
   for(const c of filtered){
    const li=documentRef.createElement('li');
    li.className='rc14-entry';
    const link=documentRef.createElement('a');
    link.className='rc14-entry-link';
    link.href='/control-v2/cases/'+c.case_id;
    const top=documentRef.createElement('span');top.className='rc14-entry-top';
    const title=documentRef.createElement('strong');title.textContent=c.label;
    const service=documentRef.createElement('small');service.textContent=c.service;
    top.append(title,service);
    const desc=documentRef.createElement('span');desc.className='rc14-preview';
    desc.textContent=c.problem_preview||'—';
    const action=documentRef.createElement('span');action.className='rc14-open';action.textContent=t('open')+' ↗';
    link.append(top,desc,action);li.append(link);rootEl.append(li);
   }
   put('rc14-count',cases.cases.length+' · '+t('count'));
   const hasCursor=cases.has_more&&typeof cases.next_cursor==='string';
   put('rc14-limit',cases.has_more&&!hasCursor?t('limited'):'');
   const more=el('rc15-more');if(more){more.hidden=!hasCursor;more.disabled=loadingMore||!hasCursor}
  }
  async function load(){
   if(disposed)return;
   const id=++seq;if(abort)abort.abort();
   moreSeq++;if(moreAbort)moreAbort.abort();moreAbort=null;loadingMore=false;
   consumedCursors.clear();
   abort=null;translate();state('loading');el('rc14-refresh').disabled=true;
   if(!validUrl(locationHref)){state('host');return}
   const attempt=new AbortControllerImpl();abort=attempt;
   try{
    const res=await fetchFn(API,{method:'GET',credentials:'same-origin',
      mode:'same-origin',cache:'no-store',redirect:'error',
      headers:{Accept:'application/json'},signal:attempt.signal});
    if(disposed||id!==seq)return;
    if(!res||typeof res.status!=='number')throw Error('bad-response');
    if(res.status!==200){
      state(res.status===401?'expired':res.status===403?'forbidden':'failed');return;
    }
    const mime=res.headers?.get?.('content-type')||'';
    if(!/^application\/json(?:;|$)/i.test(mime))throw Error('invalid-mime');
    const body=await res.text();
    if(disposed||id!==seq)return;
    if(typeof body!=='string'||body.length>45000)throw Error('too-large');
    const value=project(JSON.parse(body));
    if(!value){state('invalid');return}
    cases=value;list();
   }catch(e){
    if(disposed||id!==seq)return;
    if(e?.name==='AbortError')return;
    state('failed');
   }finally{if(id===seq){abort=null;el('rc14-refresh').disabled=false}}
  }
  async function loadMore(){
   if(disposed||loadingMore||!cases||!cases.has_more||
     typeof cases.next_cursor!=='string'||!validUrl(locationHref))return;
   const cursor=cases.next_cursor;
   if(consumedCursors.has(cursor)){put('rc14-limit',t('moreError'));return}
   const id=++moreSeq,parent=seq;
   const requestAbort=new AbortControllerImpl();moreAbort=requestAbort;loadingMore=true;
   const button=el('rc15-more');if(button)button.disabled=true;
   try{
    const res=await fetchFn(API+'?cursor='+encodeURIComponent(cursor),{
     method:'GET',credentials:'same-origin',mode:'same-origin',
     cache:'no-store',redirect:'error',headers:{Accept:'application/json'},
     signal:requestAbort.signal
    });
    if(disposed||id!==moreSeq||parent!==seq)return;
    if(!res||typeof res.status!=='number')throw Error('bad-response');
    if(res.status===401||res.status===403){
     // Immediately remove even previously authorized client names.
     consumedCursors.clear();state(res.status===401?'expired':'forbidden');return;
    }
    if(res.status!==200)throw Error('server-error');
    const mime=res.headers?.get?.('content-type')||'';
    if(!/^application\/json(?:;|$)/i.test(mime))throw Error('invalid-mime');
    const body=await res.text();
    if(disposed||id!==moreSeq||parent!==seq)return;
    if(typeof body!=='string'||body.length>45000)throw Error('too-large');
    const next=project(JSON.parse(body));
    if(!next||!('next_cursor' in next)||next.has_more&&!next.next_cursor||
      next.next_cursor===cursor||next.next_cursor&&consumedCursors.has(next.next_cursor))
      throw Error('invalid-continuation');
    const existing=new Set(cases.cases.map(c=>c.case_id));
    const merged=cases.cases.concat(next.cases.filter(c=>!existing.has(c.case_id)));
    // Mutable updated_at may move cases during browsing; de-duplicate in UI.
    consumedCursors.add(cursor);
    cases={cases:merged,has_more:next.has_more,next_cursor:next.next_cursor};
    list();
   }catch(err){
    if(disposed||id!==moreSeq||parent!==seq)return;
    if(err?.name==='AbortError')return;
    put('rc14-limit',t('moreError'));
   }finally{
    if(id===moreSeq){loadingMore=false;moreAbort=null;
     if(el('rc15-more'))el('rc15-more').disabled=!cases?.has_more||!cases?.next_cursor}
   }
  }
  function toggle(){
   if(disposed)return;
   lang=lang==='ar'?'en':'ar';translate();
   if(cases)list();else put('rc14-status',t(key));
  }
  function dispose(){
   disposed=true;seq++;moreSeq++;if(abort)abort.abort();abort=null;
   if(moreAbort)moreAbort.abort();moreAbort=null;cases=null;consumedCursors.clear();
   el('rc14-list').replaceChildren();put('rc14-count','');put('rc14-limit','');
  }
  el('rc14-search').addEventListener('input',()=>{if(cases)list()});
  el('rc14-lang').addEventListener('click',toggle);
  el('rc14-retry').addEventListener('click',load);
  el('rc14-refresh').addEventListener('click',load);
  if(el('rc15-more'))el('rc15-more').addEventListener('click',loadMore);
  return Object.freeze({load,loadMore,dispose,toggle,validUrl,project});
 }
 return Object.freeze({validUrl,project,create});
});