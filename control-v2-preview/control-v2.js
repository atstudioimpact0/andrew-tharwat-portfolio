/* ATS Control Room V2: standalone UX walkthrough.
   No API calls, storage, credentials, or live-client actions by design. */
(() => {
  'use strict';
  const $ = (selector,root=document)=>root.querySelector(selector);
  const $$ = (selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const copy = {
    ar: {
      strip:'بيانات افتراضية فقط — لا اتصال بالعملاء أو قاعدة البيانات',
      workspace:'مساحة قيادة الاستوديو',
      navToday:'اليوم',navClients:'العملاء',navDelivery:'التنفيذ',navStudio:'الاستوديو',navIntelligence:'ATS Intelligence',
      demoMode:'وضع العرض التجريبي',noRealActions:'لن يتم إرسال أو حفظ أي إجراء',
      todayTitle:'صباح واضح. قرارات أقل.',todaySub:'المهم قدامك، والتفاصيل موجودة وقت ما تحتاجها.',
      yourDecisions:'قرارات محتاجة انتباهك',sampleCases:'حالات افتراضية',
      principleTitle:'إيه اللي بنحافظ عليه؟',principleOne:'نفهم قبل ما نبيع',principleOneDesc:'أفضل حل للعميل أهم من أكبر عرض نقدر نبيعه.',
      principleTwo:'معلومة واحدة وقت الحاجة',principleTwoDesc:'لا نكرر الأسئلة ولا نظهر للعميل التعقيد الداخلي.',
      principleThree:'قرار بشري مسؤول',principleThreeDesc:'لا عرض نهائي أو اعتماد مالي من غير موافقة واضحة.',
      clientsTitle:'كل عميل، قصة واحدة واضحة.',clientsSub:'من المشكلة إلى فهمها ثم تحديد الخطوة التالية.',
      activeCases:'ملفات العملاء',searchLabel:'ابحث في الملفات',noCases:'لا توجد نتائج مطابقة.',
      clientCase:'ملف العميل',challenge:'المشكلة اللي بنحلّها',known:'إيه اللي نعرفه بالفعل؟',
      missing:'إيه اللي محتاج توضيح؟',suggestedNext:'الخطوة المقترحة — تحتاج مراجعتك',
      reviewAction:'راجع الاتجاه',askAction:'اطلب معلومة',demoDisclaimer:'أي موافقة أو رسالة هنا محاكاة فقط. لا يتم حفظ شيء في النظام الفعلي.',
      deliveryTitle:'كل مهمة لها مسؤول ونتيجة.',deliverySub:'التنفيذ والمراجعات والاعتمادات، من غير تشتيت.',
      deliveryPrinciple:'تسليم واضح، مراجعة واضحة، ثم اعتماد.',
      deliveryDescription:'لا نعتبر المهمة منتهية لمجرد تحديث حالتها. لازم تسليم قابل للمراجعة، ومسؤول معتمد، ودليل على تحقق المطلوب.',
      studioTitle:'إدارة الاستوديو بدون زحمة.',studioSub:'الأشخاص، المحتوى، الأنظمة، والإعدادات — بعيدًا عن قرارات العملاء اليومية.',
      securityTitle:'الدخول الجديد منفصل عن Supabase Auth',
      securityDesc:'المرحلة القادمة تستلزم جلسات خادم آمنة، تحقق من الهوية، صلاحيات حسب الدور، وسجلًا واضحًا لأي قرار حساس. الواجهة التجريبية لا تحتوي على تسجيل دخول.',
      intelligenceTitle:'ذكاء يقلل المجهود، مش يزود التعقيد.',intelligenceSub:'الـAI يرتب الفهم والاحتمالات، وإنت تراجع وتقرر.',
      intelligencePrinciple:'فهم واضح → إجراء مبرر → مراجعة بشرية',
      intelligenceDesc:'أي تحليل آلي يوضح مصدر المعلومة، درجة التأكد، والنواقص. لا يتم إرسال ردود للعميل أو اعتماد عروض أو تحديد أسعار تلقائيًا.',
      metricDecisions:'قرارات تنتظر المراجعة',metricDecisionsHint:'طلبات ذات خطوة بشرية مقترحة',
      metricFollowups:'متابعات مطلوبة',metricFollowupsHint:'أسئلة أو أدلة ناقصة',
      metricReviews:'ملفات قيد المراجعة',metricReviewsHint:'مثال على خطوة متقدمة',
      open:'افتح الملف',reviewState:'مراجعة',needsInfo:'مطلوب توضيح',readyReview:'جاهز للمراجعة',simulated:'تمت محاكاة الإجراء',
      askTitle:'طلب معلومة إضافية',reviewTitle:'مراجعة اتجاه الحل',askDesc:'هنطلب فقط المعلومة التي قد تغيّر القرار. لا توجد رسالة حقيقية ستُرسل.',
      reviewDesc:'تأكيد اتجاه مبدئي للمناقشة فقط. ده مش اعتماد عرض تجاري أو قرار نهائي.',
      dialogLabel:'ملاحظتك (تجريبية)',dialogWarning:'لا تُرسل رسائل، ولا تُنشأ مهام، ولا تُحفظ أي بيانات حقيقية.',
      dialogCancel:'إلغاء',dialogSubmit:'جرّب الإجراء محليًا',
      searchPlaceholder:'ابحث بالاسم أو المشكلة...',
      taskReview:'مراجعة نطاق التنفيذ',taskReviewDesc:'مراجعة ما اتفقنا عليه قبل مشاركة أي التزام مع العميل.',taskReviewMeta:'مسؤول: Domain Lead · القرار عند Founder',
      taskEvidence:'تجميع أدلة التنفيذ',taskEvidenceDesc:'تحديد المخرجات التي تدعم قرار العميل، مش مجرد تسليم ملف.',taskEvidenceMeta:'مسؤول: منفّذ المهمة · مراجع محدد',
      taskSignoff:'اعتماد التسليم',taskSignoffDesc:'لا يُغلق المشروع إلا بعد مراجعة الجودة وشروط التسليم.',taskSignoffMeta:'Gate: Acceptance · Delivery',
      teamTitle:'الفريق والمهام',teamDesc:'الأدوار والملاك والمواعيد ومعايير القبول.',teamMeta:'قرار واضح · مسؤول واحد',
      contentTitle:'الموقع والمحتوى',contentDesc:'إدارة النشر والعوالم والمشاريع بعيدًا عن متابعة العملاء.',contentMeta:'لا نشر بدون مراجعة',
      settingsTitle:'الإعدادات والأمان',settingsDesc:'الجلسات والصلاحيات والتكاملات وسجل التغييرات.',settingsMeta:'Owner approval required',
      intelOne:'نسمع',intelOneDesc:'نسجل كلمات العميل، ونفصل الحقائق عن التوقعات.',
      intelTwo:'نقترح',intelTwoDesc:'نحدد نقصًا مؤثرًا، واتجاهًا أوليًا مدعومًا بأدلة.',
      intelThree:'نراجع',intelThreeDesc:'القرار النهائي مسؤولية ATS، وليس الذكاء الاصطناعي.',
      toastDemo:'تم تحديث العرض التجريبي على هذه الصفحة فقط — لا إرسال أو حفظ فعلي.',
      noPending:'كل الحالات التجريبية اتراجعت. تقدر ترجع لقسم العملاء.'
    },
    en: {
      strip:'Illustrative data only — no client or database connection',
      workspace:'Your studio command space',
      navToday:'Today',navClients:'Clients',navDelivery:'Delivery',navStudio:'Studio',navIntelligence:'ATS Intelligence',
      demoMode:'Prototype mode',noRealActions:'Nothing is sent or persisted',
      todayTitle:'Clear day. Fewer decisions.',todaySub:'The important things first. Details when you need them.',
      yourDecisions:'What needs your attention',sampleCases:'Illustrative cases',
      principleTitle:'What we protect',principleOne:'Understand before selling',principleOneDesc:'The right answer for the client matters more than the biggest proposal.',
      principleTwo:'One useful question',principleTwoDesc:'Do not repeat questions or expose internal complexity.',
      principleThree:'Accountable human review',principleThreeDesc:'No final proposal or financial approval without explicit authorization.',
      clientsTitle:'One client. One clear story.',clientsSub:'Challenge, understanding, and one meaningful next step.',
      activeCases:'Client cases',searchLabel:'Search cases',noCases:'No matches found.',
      clientCase:'Client case',challenge:'The challenge',known:'What we already know',
      missing:'What needs clarification',suggestedNext:'Suggested next step — requires your review',
      reviewAction:'Review direction',askAction:'Request context',demoDisclaimer:'All approvals and messages are simulated. Nothing is saved to the live system.',
      deliveryTitle:'Clear ownership. Meaningful outcomes.',deliverySub:'Work, reviews and approvals without noise.',
      deliveryPrinciple:'Clear deliverable. Clear review. Then approval.',
      deliveryDescription:'A task is not complete because someone changes its status. It needs a reviewable deliverable, a named reviewer and evidence of acceptance.',
      studioTitle:'Run the studio without clutter.',studioSub:'People, content, systems and settings outside your day-to-day client decisions.',
      securityTitle:'New login independent of Supabase Auth',
      securityDesc:'The next stage needs secure server sessions, identity verification, role checks and audit trails. This prototype has no login.',
      intelligenceTitle:'Intelligence that reduces effort.',intelligenceSub:'AI structures context and alternatives. You retain decisions.',
      intelligencePrinciple:'Clear understanding → justified action → human review',
      intelligenceDesc:'AI analysis must show its evidence, confidence and gaps. It never sends client messages, commits pricing or approves proposals automatically.',
      metricDecisions:'Decisions awaiting review',metricDecisionsHint:'Cases with a suggested human action',
      metricFollowups:'Follow-ups needed',metricFollowupsHint:'Missing evidence or context',
      metricReviews:'In review',metricReviewsHint:'Sample higher-stage case',
      open:'Open case',reviewState:'In review',needsInfo:'Need context',readyReview:'Ready for review',simulated:'Action simulated',
      askTitle:'Request more context',reviewTitle:'Review the proposed direction',askDesc:'Ask only what may change the decision. No actual message will be sent.',
      reviewDesc:'Explore a possible direction only. This is not a commercial approval.',
      dialogLabel:'Your note (demo only)',dialogWarning:'No messages are sent. No tasks or real records are created.',
      dialogCancel:'Cancel',dialogSubmit:'Simulate locally',
      searchPlaceholder:'Search name or challenge...',
      taskReview:'Review delivery scope',taskReviewDesc:'Confirm the scope before committing anything to the client.',taskReviewMeta:'Owner: Domain Lead · Founder decision',
      taskEvidence:'Gather delivery evidence',taskEvidenceDesc:'Identify the outcome proof the client needs, not just a file.',taskEvidenceMeta:'Owner: Contributor · Named reviewer',
      taskSignoff:'Approve delivery',taskSignoffDesc:'Close only after quality, acceptance and delivery gates.',taskSignoffMeta:'Gate: Acceptance · Delivery',
      teamTitle:'Team & tasks',teamDesc:'Roles, owners, due dates and acceptance criteria.',teamMeta:'One task · one owner',
      contentTitle:'Website & content',contentDesc:'Manage publishing and ATS worlds separately from clients.',contentMeta:'Reviewed releases only',
      settingsTitle:'Settings & security',settingsDesc:'Sessions, permissions, integrations and audit logs.',settingsMeta:'Owner approval required',
      intelOne:'Listen',intelOneDesc:'Record the client’s words and distinguish facts from assumptions.',
      intelTwo:'Propose',intelTwoDesc:'Identify a meaningful gap and evidence-based direction.',
      intelThree:'Review',intelThreeDesc:'Final responsibility belongs to ATS, not an automated engine.',
      toastDemo:'Updated this browser-only demonstration. No real action or persistent change.'
    }
  };
  const sampleCases = [
    {id:'c1',name:{ar:'Atelier North',en:'Atelier North'},subtitle:{ar:'Brand / Customer experience',en:'Brand / Customer experience'},
     problem:{ar:'العلامة بتقدم منتج جيد، لكن العملاء مش فاهمين الفرق بينها وبين البدائل.',en:'A strong product whose customers cannot clearly see its differentiation.'},
     known:{ar:'فيه منتج موجود ومبيعات فعلية، والاعتماد الحالي على توصيات العملاء.',en:'There is an existing product, real sales and a strong referral channel.'},
     missing:{ar:'هل المشكلة في الرسالة نفسها، ولا طريقة عرض المنتج أثناء الشراء؟',en:'Is the gap in positioning or in the way products are presented during purchase?'},
     next:{ar:'راجع رحلة الشراء ومثالًا حقيقيًا قبل اقتراح تغيير الهوية.',en:'Review the purchase journey and one real example before proposing a rebrand.'},
     status:'review',action:'review'},
    {id:'c2',name:{ar:'Eastline Operations',en:'Eastline Operations'},subtitle:{ar:'Workflow / Customer follow-up',en:'Workflow / Customer follow-up'},
     problem:{ar:'الاستفسارات كتير، لكن مفيش نظام واضح للمتابعة بعد أول اتصال.',en:'There are many inquiries but no reliable follow-up after first contact.'},
     known:{ar:'الفريق بيتواصل يدويًا، وفيه بيانات عملاء متفرقة بين عدة أدوات.',en:'The team follows up manually across fragmented tools.'},
     missing:{ar:'كم عميل بيتفقد بين الاستفسار وأول متابعة؟',en:'How many customers are lost between an inquiry and first follow-up?'},
     next:{ar:'اطلب مثالًا واحدًا موثقًا لرحلة متابعة فعلية قبل اقتراح CRM.',en:'Ask for one documented follow-up example before proposing a CRM.'},
     status:'needs',action:'ask'},
    {id:'c3',name:{ar:'GreenSite Learning',en:'GreenSite Learning'},subtitle:{ar:'HSE / Learning effectiveness',en:'HSE / Learning effectiveness'},
     problem:{ar:'التدريب بيتقدم، لكن تأثيره على قرارات العاملين في الموقع غير واضح.',en:'Training happens, but its effect on site decisions is unclear.'},
     known:{ar:'مواد تدريب موجودة، وفيه إجراءات وعمليات تقييم تقليدية.',en:'Training content and conventional assessment processes exist.'},
     missing:{ar:'محتاجين أدلة أداء فعلية ومراجعة HSE مختصة قبل تحديد أي نتائج.',en:'Field evidence and qualified HSE review are needed before conclusions.'},
     next:{ar:'مراجعة بشرية متخصصة لتحديد اختبار صغير يقيس اتخاذ القرار.',en:'Qualified human review to design a small decision-making pilot.'},
     status:'review',action:'review'}
  ];
  const state={lang:'ar',view:'today',selectedCase:'c1',dialogAction:null,completed:new Set(),notes:new Map()};
  const translations=(key)=>copy[state.lang][key]||key;
  const textFor=(field)=>typeof field==='object'&&field!==null?field[state.lang]:String(field??'');
  const elt=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
  let toastTimer;
  function toast(message){const e=$('#toast');e.textContent=message;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),4400)}
  function setView(view,{focus=true}={}){
    if(!['today','clients','delivery','studio','intelligence'].includes(view))return;
    state.view=view;
    $$('.page').forEach(p=>{const yes=p.dataset.page===view;p.hidden=!yes;p.classList.toggle('is-active',yes)});
    $$('.nav-btn').forEach(b=>{const yes=b.dataset.view===view;b.classList.toggle('active',yes);if(yes)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
    $('#currentSection').textContent=translations('nav'+view.charAt(0).toUpperCase()+view.slice(1));
    document.body.classList.remove('menu-open');$('#mobile-menu').setAttribute('aria-expanded','false');
    if(view==='clients')renderCases();
    if(focus)$('#workspace').focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'auto'});
  }
  function metric(title,value,foot){const card=elt('article','metric');card.append(elt('span','metric-label',title),elt('strong','',String(value)),elt('span','metric-foot',foot));return card}
  function renderToday(){
    const outstanding=sampleCases.filter(c=>!state.completed.has(c.id));
    const metrics=$('#today-metrics');metrics.replaceChildren(
      metric(translations('metricDecisions'),outstanding.length,translations('metricDecisionsHint')),
      metric(translations('metricFollowups'),outstanding.filter(c=>c.action==='ask').length,translations('metricFollowupsHint')),
      metric(translations('metricReviews'),outstanding.filter(c=>c.action==='review').length,translations('metricReviewsHint')));
    const root=$('#priority-list');root.replaceChildren();
    if(!outstanding.length){root.append(elt('div','empty',translations('noPending')));return}
    outstanding.forEach((c,i)=>{
      const item=elt('div','priority-item'),num=elt('span','priority-num',String(i+1).padStart(2,'0')),body=elt('div','priority-body');
      body.append(elt('strong','',textFor(c.name)),elt('p','',textFor(c.next)));
      const btn=elt('button','priority-btn',translations('open'));btn.type='button';
      btn.addEventListener('click',()=>{state.selectedCase=c.id;setView('clients')});
      item.append(num,body,btn);root.append(item);
    })
  }
  function renderCases(){
    const query=($('#case-search').value||'').trim().toLocaleLowerCase();
    const list=$('#case-list');list.replaceChildren();
    const matches=sampleCases.filter(c=>(textFor(c.name)+' '+textFor(c.problem)+' '+textFor(c.subtitle)).toLocaleLowerCase().includes(query));
    $('#case-empty').hidden=matches.length>0;
    matches.forEach(c=>{
      const button=elt('button','case-choice'+(state.selectedCase===c.id?' active':''));button.type='button';button.setAttribute('aria-pressed',String(state.selectedCase===c.id));
      button.append(elt('strong','',textFor(c.name)),elt('span','',textFor(c.subtitle)),elt('em','',state.completed.has(c.id)?translations('simulated'):translations(c.status==='needs'?'needsInfo':'readyReview')));
      button.addEventListener('click',()=>{state.selectedCase=c.id;renderCases()});list.append(button);
    });
    const selected=sampleCases.find(c=>c.id===state.selectedCase)||sampleCases[0];
    $('#case-title').textContent=textFor(selected.name);
    $('#case-subtitle').textContent=textFor(selected.subtitle);
    $('#case-status').textContent=state.completed.has(selected.id)?translations('simulated'):translations(selected.status==='needs'?'needsInfo':'readyReview');
    $('#case-problem').textContent=textFor(selected.problem);
    $('#case-known').textContent=textFor(selected.known);
    $('#case-missing').textContent=textFor(selected.missing);
    $('#case-recommendation').textContent=textFor(selected.next);
  }
  function card(root,{symbol,title,desc,meta}){
    const section=elt('article',root.id==='delivery-grid'?'delivery-card':'studio-card');
    section.append(elt('div','small-icon',symbol),elt('h2','',translations(title)),elt('p','',translations(desc)),elt('small','',translations(meta))));
    root.append(section)
  }
  function renderOtherPages(){
    const delivery=$('#delivery-grid');delivery.replaceChildren();
    card(delivery,{symbol:'01',title:'taskReview',desc:'taskReviewDesc',meta:'taskReviewMeta'});
    card(delivery,{symbol:'02',title:'taskEvidence',desc:'taskEvidenceDesc',meta:'taskEvidenceMeta'});
    card(delivery,{symbol:'03',title:'taskSignoff',desc:'taskSignoffDesc',meta:'taskSignoffMeta'});
    const studio=$('#studio-grid');studio.replaceChildren();
    card(studio,{symbol:'◎',title:'teamTitle',desc:'teamDesc',meta:'teamMeta'});
    card(studio,{symbol:'▧',title:'contentTitle',desc:'contentDesc',meta:'contentMeta'});
    card(studio,{symbol:'◇',title:'settingsTitle',desc:'settingsDesc',meta:'settingsMeta'});
    const intel=$('#intel-steps');intel.replaceChildren();
    ['One','Two','Three'].forEach((x,i)=>{
      const e=elt('article','intel-step');e.append(elt('b','',String(i+1).padStart(2,'0')),elt('strong','',translations('intel'+x)),elt('p','',translations('intel'+x+'Desc')));intel.append(e)
    });
  }
  function openDialog(type){
    const c=sampleCases.find(x=>x.id===state.selectedCase);
    if(!c)return;
    state.dialogAction=type;
    $('#action-title').textContent=translations(type==='ask'?'askTitle':'reviewTitle');
    $('#action-message').textContent=translations(type==='ask'?'askDesc':'reviewDesc');
    $('#dialog-label').textContent=translations('dialogLabel');
    $('#dialog-warning').textContent=translations('dialogWarning');
    $('#cancel-action').textContent=translations('dialogCancel');
    $('#simulate-action').textContent=translations('dialogSubmit');
    $('#dialog-text').value=state.notes.get(c.id)||'';
    $('#action-dialog').showModal();
    $('#dialog-text').focus();
  }
  function updateLanguage(){
    document.documentElement.lang=state.lang;
    document.documentElement.dir=state.lang==='ar'?'rtl':'ltr';
    $('#toggle-language').textContent=state.lang==='ar'?'EN':'عربي';
    $$('[data-i18n]').forEach(el=>{el.textContent=translations(el.dataset.i18n)});
    $('#case-search').placeholder=translations('searchPlaceholder');
    renderToday();renderCases();renderOtherPages();setView(state.view,{focus:false});
  }
  $$('.nav-btn').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  $('#toggle-language').addEventListener('click',()=>{state.lang=state.lang==='ar'?'en':'ar';updateLanguage()});
  $('#case-search').addEventListener('input',renderCases);
  $('#review-direction').addEventListener('click',()=>openDialog('review'));
  $('#request-context').addEventListener('click',()=>openDialog('ask'));
  $('#mobile-menu').addEventListener('click',()=>{const open=document.body.classList.toggle('menu-open');$('#mobile-menu').setAttribute('aria-expanded',String(open))});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.body.classList.remove('menu-open');$('#mobile-menu').setAttribute('aria-expanded','false')}});
  const dialog=$('#action-dialog');
  $('#close-dialog').addEventListener('click',()=>dialog.close());
  $('#cancel-action').addEventListener('click',()=>dialog.close());
  $('#simulate-action').addEventListener('click',()=>{
    state.completed.add(state.selectedCase);
    state.notes.set(state.selectedCase,$('#dialog-text').value.slice(0,3000));
    dialog.close();renderToday();renderCases();toast(translations('toastDemo'))
  });
  updateLanguage();
})();