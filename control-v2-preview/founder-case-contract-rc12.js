/* AT STUDIO / RC12
 * Pure read-only bridge: RC8 founder workspace DTO → RC11 founder case UI.
 * No fetch, auth, persistence, paid AI, HTML injection or browser data export.
 * In offline preview, data is synthetic only. A future authenticated HTTPS host
 * must fetch /api/v2/founder/cases/:uuid/workspace with its server session.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.ATS_RC12_CASE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ASK_KINDS=new Set(['collect_evidence','request_information','request_info','ask_client','collect_context']);
  const REVIEW_KINDS=new Set(['founder_review','human_review','review_direction','review']);
  const FIELDS=['current_state','desired_outcome','evidence'];
  const WORDS=Object.freeze({
    ar:{
      label:'ملف',unconfirmed:'بيانات من طلب العميل — لم تُراجع الأدلة بعد',
      noProblem:'لم يوضح العميل الهدف أو المشكلة بعد.',
      noKnown:'لا توجد معلومات كافية مؤكدة المصدر حتى الآن.',
      noGap:'لا يوجد سؤال محدد مسجّل — تحتاج مراجعة بشرية.',
      noAction:'لم يتم تحديد إجراء معتمد. راجع الملف يدويًا.',
      gap:{current_state:'ما الوضع الحالي؟',desired_outcome:'ما النتيجة المطلوبة؟',evidence:'ما الدليل أو المثال الواقعي؟'},
      error:{unauthenticated:'انتهت الجلسة أو لم تُسجل الدخول. يلزم دخول آمن.',
        forbidden:'ليس لديك تصريح لرؤية الملف.',
        not_found:'ملف العميل غير متاح أو لا ينتمي لنطاقك.',
        temporarily_unavailable:'تعذر تحميل الملف بأمان. جرّب لاحقًا.',
        invalid_response:'تعذر التحقق من بيانات الملف. لا يمكن عرضها.'}
    },
    en:{
      label:'Case',unconfirmed:'Client intake statements — evidence has not been reviewed',
      noProblem:'The client has not yet clarified the goal or problem.',
      noKnown:'No sufficiently sourced context is available yet.',
      noGap:'No specific question recorded — human review is required.',
      noAction:'No approved next action was recorded. Review the case manually.',
      gap:{current_state:'What is the current situation?',desired_outcome:'What outcome is required?',evidence:'What evidence or real example is available?'},
      error:{unauthenticated:'Your session has expired or you are not signed in.',
        forbidden:'You are not authorized to view this case.',
        not_found:'This case is unavailable or outside your scope.',
        temporarily_unavailable:'This case could not be loaded safely. Try again later.',
        invalid_response:'Case data could not be verified and will not be displayed.'}
    }
  });
  const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  function clean(x,max){
    if(typeof x!=='string')return '';
    return x.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
  }
  function valid(dto){
    return isObject(dto)&&UUID.test(dto.case_id||'')&&
      isObject(dto.intake_brief)&&dto.intake_brief.source==='unconfirmed_client_intake'&&
      isObject(dto.known)&&isObject(dto.next_action);
  }
  function model(dto){
    if(!valid(dto))return null;
    const d=dto.intake_brief,k=dto.known,n=dto.next_action;
    const info=[clean(k.current_state,500),clean(k.impact,500),
      clean(k.desired_outcome,500),clean(k.evidence,500)].filter(Boolean).slice(0,4);
    const missing=Array.isArray(dto.missing_fields)
      ? FIELDS.filter(key=>dto.missing_fields.includes(key)):FIELDS.slice(); 
    const kind=clean(n.kind,50);
    const proposed=clean(n.text,400);
    let action='none';
    // A button without a specific, approved next action is unsafe UX.
    // Never show the free-text suggestion for an unknown action kind.
    if(proposed && ASK_KINDS.has(kind))action='ask';
    else if(proposed && REVIEW_KINDS.has(kind))action='review';
    const en=WORDS.en,ar=WORDS.ar;
    const pair=(a,b)=>({ar:a,en:b});
    const caseCode=dto.case_id.slice(0,8);
    const subtitle=clean(d.service,160);
    return {
      id:dto.case_id,
      name:pair(ar.label+' '+caseCode,en.label+' '+caseCode),
      subtitle:pair(subtitle||ar.unconfirmed,subtitle||en.unconfirmed),
      problem:pair(clean(d.project_goal,1800)||ar.noProblem,clean(d.project_goal,1800)||en.noProblem),
      known:pair(info.join(' · ')||ar.noKnown,info.join(' · ')||en.noKnown),
      missing:pair(missing.map(key=>ar.gap[key]).join(' · ')||ar.noGap,
        missing.map(key=>en.gap[key]).join(' · ')||en.noGap),
      next:pair(action==='none'?ar.noAction:proposed,action==='none'?en.noAction:proposed),
      status:action==='ask'?'needs':action==='review'?'review':'pending',
      action,
      provenance:'unconfirmed_client_intake',
      inputVersion:Number.isSafeInteger(dto.input_version)?dto.input_version:null,
      // No client email, tenant, private records, source object, AI output or permissions.
      // Deliberately do NOT spread the caller-supplied object into the UI view model.
      supportingUploadCount:Number.isSafeInteger(dto.supporting_upload_count)&&dto.supporting_upload_count>=0?
        Math.min(dto.supporting_upload_count,999):0
    };
  }
  function fromResponse(status,body,locale='ar'){
    const lang=locale==='en'?'en':'ar',w=WORDS[lang];
    if(status===401)return {state:'unauthenticated',message:w.error.unauthenticated,caseView:null};
    if(status===403)return {state:'forbidden',message:w.error.forbidden,caseView:null};
    if(status===404)return {state:'not_found',message:w.error.not_found,caseView:null};
    if(status!==200)return {state:'temporarily_unavailable',message:w.error.temporarily_unavailable,caseView:null};
    const value=model(body);
    if(!value)return {state:'invalid_response',message:w.error.invalid_response,caseView:null};
    return {state:'ready',message:null,caseView:value};
  }
  return Object.freeze({toCaseView:model,fromResponse});
});