/* AT Studio — RC13 / protected Founder read-only browser adapter.
 * Only activate on https://staging.atstudioimpact.com/control-v2/cases/:uuid
 * Data source: RC8 authenticated same-origin server response + RC12 DTO bridge.
 * No local storage, service-role key, bearer JWT, unsafe HTML, AI, POST or writes.
 * This file and its HTML are NOT deployed or routed automatically.
 */
(function(root,factory){
  const moduleApi=factory();
  if(typeof module==='object' && module.exports) module.exports=moduleApi;
  else root.ATS_RC13_CASE=moduleApi;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const ORIGIN='https://staging.atstudioimpact.com';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const PATH=/^\/control-v2\/cases\/([0-9a-f-]{36})\/?$/i;
  const L={
    ar:{page:'ملف العميل',source:'بيانات من طلب العميل — لم يتم تأكيدها بالأدلة',
      problem:'المشكلة',known:'ما نعرفه',missing:'ما ينقصنا',next:'الخطوة التالية',
      more:'سياق إضافي',service:'مجال الطلب',uploads:'مرفقات مسجلة',
      state:'حالة التحليل',pending:'مراجعات تنتظر القرار',work:'مهام جارية',
      copy:'مراجعة بشرية مطلوبة؛ لا اعتماد أو مراسلة أو تشغيل AI تلقائيًا.',
      loading:'جاري تحميل ملف العميل من اتصال آمن...',reload:'تحديث البيانات',
      title:'ATS — فهم العميل',ready:'ملف العميل للقراءة والمراجعة',
      invalidPath:'لا يوجد رابط ملف عميل صحيح.',
      invalidHost:'هذه الشاشة لا تعمل إلا على Staging المعتمد عبر HTTPS.',
      invalid:'لم نتمكن من التحقق من البيانات؛ لن يتم عرض أي تفاصيل.',
      failed:'تعذر تحميل الملف بأمان. يمكنك إعادة المحاولة.',
      expired:'انتهت الجلسة. سجّل الدخول من المسار الرسمي.',
      blocked:'ليست لديك صلاحية الوصول لهذا الملف.',
      unavailable:'الملف غير متاح أو لا ينتمي لنطاقك.',
      noCount:'غير معروف'},
    en:{page:'Client case',source:'Client intake statement — evidence not yet verified',
      problem:'The challenge',known:'What we know',missing:'What is missing',next:'Next human action',
      more:'Additional context',service:'Service area',uploads:'Recorded uploads',
      state:'Analysis state',pending:'Pending review',work:'Active work',
      copy:'Human review required; no approval, customer message or automatic AI.',
      loading:'Loading this case over a secure connection...',reload:'Refresh data',
      title:'ATS — Understand the client',ready:'Case available for human review',
      invalidPath:'No valid case link was supplied.',
      invalidHost:'This screen is restricted to the approved HTTPS staging origin.',
      invalid:'Case data could not be verified; no details will be shown.',
      failed:'The case could not be loaded safely. You can try again.',
      expired:'Your session has expired. Sign in through the official route.',
      blocked:'You are not permitted to view this case.',
      unavailable:'This case is unavailable or outside your scope.',
      noCount:'Unknown'}
  };
  function route(value){
    let u;
    try{u=new URL(value)}catch{return {error:'invalidPath'}}
    if(u.origin!==ORIGIN||u.protocol!=='https:'||u.username||u.password)return {error:'invalidHost'};
    if(u.search||u.hash)return {error:'invalidPath'};
    const m=PATH.exec(u.pathname);
    if(!m||!UUID.test(m[1]))return {error:'invalidPath'};
    return {caseId:m[1].toLowerCase()};
  }
  function create({locationHref,fetchFn,bridge,documentRef,AbortControllerImpl}){
    if(typeof locationHref!=='string'||typeof fetchFn!=='function'||
       typeof bridge?.fromResponse!=='function'||!documentRef||
       typeof AbortControllerImpl!=='function') throw new Error('RC13 runtime dependencies missing');
    const dom=id=>documentRef.getElementById(id);
    const required=['rc13-state','rc13-case','rc13-retry','rc13-lang',
      'rc13-title','rc13-source','rc13-subtitle','rc13-problem',
      'rc13-known','rc13-missing','rc13-next','rc13-extra','rc13-metrics',
      'rc13-note','rc13-reload'];
    for(const id of required) if(!dom(id))throw new Error('RC13 required view missing: '+id);
    const parsed=route(locationHref);
    let lang='ar', seq=0,abort=null,disposed=false,model=null,raw=null;
    function label(key){return L[lang][key]||key}
    function setText(id,value){dom(id).textContent=typeof value==='string'?value:''}
    function showStatus(key){
      dom('rc13-case').hidden=true;
      dom('rc13-state').hidden=false;
      setText('rc13-state',label(key));
      dom('rc13-state').dataset.stateKey=key;
      dom('rc13-retry').hidden=key!=='failed'&&key!=='invalid';
      dom('rc13-reload').disabled=true;
      dom('rc13-extra').open=false;
      model=null;raw=null;clearCase();
    }
    function clearCase(){
      for(const id of ['rc13-title','rc13-source','rc13-subtitle','rc13-problem','rc13-known',
        'rc13-missing','rc13-next','rc13-metrics','rc13-note'])setText(id,'');
    }
    function translate(){
      setText('rc13-page-title',label('page'));
      setText('rc13-label-problem',label('problem'));
      setText('rc13-label-known',label('known'));
      setText('rc13-label-missing',label('missing'));
      setText('rc13-label-next',label('next'));
      setText('rc13-label-extra',label('more'));
      setText('rc13-reload',label('reload'));
      setText('rc13-retry',label('reload'));
      setText('rc13-lang',lang==='ar'?'EN':'عربي');
      documentRef.documentElement.lang=lang;
      documentRef.documentElement.dir=lang==='ar'?'rtl':'ltr';
      documentRef.title=label('title');
    }
    function render(){
      if(!model||!raw)return;
      translate();
      dom('rc13-state').hidden=true;dom('rc13-case').hidden=false;
      dom('rc13-reload').disabled=false;dom('rc13-retry').hidden=true;
      setText('rc13-title',model.name[lang]);
      setText('rc13-source',label('source'));
      setText('rc13-subtitle',model.subtitle[lang]);
      setText('rc13-problem',model.problem[lang]);
      setText('rc13-known',model.known[lang]);
      setText('rc13-missing',model.missing[lang]);
      setText('rc13-next',model.next[lang]);
      setText('rc13-note',label('copy'));
      const c=v=>Number.isSafeInteger(v)&&v>=0?String(v):label('noCount');
      setText('rc13-metrics',[
        label('uploads')+': '+c(raw.supporting_upload_count),
        label('pending')+': '+c(raw.review_pending_count),
        label('work')+': '+c(raw.active_work_count)
      ].join('  ·  '));
    }
    async function load(){
      if(disposed)return;
      const id=++seq;if(abort)abort.abort();abort=null;
      translate();
      if(parsed.error){showStatus(parsed.error);return}
      // Invalidate previous workspace immediately: changing language or a failed
      // refresh must never re-display a stale authorized case.
      model=null;raw=null;
      clearCase();dom('rc13-case').hidden=true;dom('rc13-state').hidden=false;
      dom('rc13-retry').hidden=true;dom('rc13-reload').disabled=true;
      setText('rc13-state',label('loading'));
      dom('rc13-state').dataset.stateKey='loading';
      const requestAbort=new AbortControllerImpl();abort=requestAbort;
      try{
        const relative='/api/v2/founder/cases/'+parsed.caseId+'/workspace';
        const result=await fetchFn(relative,{
          method:'GET',credentials:'same-origin',mode:'same-origin',cache:'no-store',
          redirect:'error',headers:{Accept:'application/json'},signal:requestAbort.signal
        });
        if(disposed||id!==seq)return;
        if(!result||typeof result.status!=='number')throw new Error('bad_response');
        if(result.status!==200){
          const kind=({401:'expired',403:'blocked',404:'unavailable'})[result.status]||'failed';
          showStatus(kind);return;
        }
        const mime=result.headers?.get?.('content-type')||'';
        if(!/^application\/json(?:;|$)/i.test(mime))throw new Error('invalid_mime');
        // Restrict maximum response before JSON parse; do not expose error bodies.
        const text=await result.text();
        if(disposed||id!==seq)return;
        if(typeof text!=='string'||text.length>24000)throw new Error('response_too_large');
        const dto=JSON.parse(text);
        if(!dto||typeof dto.case_id!=='string'||dto.case_id.toLowerCase()!==parsed.caseId)throw new Error('case_mismatch');
        const mapped=bridge.fromResponse(200,dto,lang);
        if(mapped.state!=='ready'||!mapped.caseView)throw new Error('invalid_dto');
        // Store only validated allowlisted view + limited metrics, never tokens.
        raw={supporting_upload_count:dto.supporting_upload_count,
          review_pending_count:dto.review_pending_count,active_work_count:dto.active_work_count};
        model=mapped.caseView;
        dom('rc13-extra').open=false;
        render();
      }catch(e){
        if(disposed||id!==seq)return;
        if(e?.name==='AbortError')return;
        showStatus('failed');
      }finally{if(id===seq)abort=null}
    }
    function toggle(){
      if(disposed)return;
      lang=lang==='ar'?'en':'ar';
      if(model)render();else{translate();if(!dom('rc13-state').hidden) {
        const state=dom('rc13-state').dataset.stateKey||'loading';
        setText('rc13-state',label(state));
      }}
    }
    function statusLoad(){
      // Wrap status output so language toggle never replays stale error text.
      return load();
    }
    function dispose(){
      disposed=true;seq++;if(abort)abort.abort();abort=null;model=null;raw=null;clearCase();
    }
    dom('rc13-lang').addEventListener('click',toggle);
    dom('rc13-reload').addEventListener('click',statusLoad);
    dom('rc13-retry').addEventListener('click',statusLoad);
    return Object.freeze({load:statusLoad,toggle,dispose,route:parsed});
  }
  return Object.freeze({route,create});
});
