/* AT Studio Access V2 — non-authenticating design walkthrough.
No credentials, emails, tokens, cookies, API requests, or local storage. */
(()=>{
'use strict';
const $=q=>document.querySelector(q);
const $$=q=>Array.from(document.querySelectorAll(q));
const dict={
 ar:{banner:'لا تسجيل دخول حقيقي · لا إرسال بريد · لا اتصال بقاعدة بيانات',back:'← غرفة التحكم التجريبية',title:'دخول أبسط. حماية أقوى.',intro:'كل شخص يدخل للمساحة اللي تخصه. بدون أكواد أجهزة تتبعت في محادثات، وبدون صلاحيات مفتوحة، وبدون تكرار غير ضروري.',prototype:'دي معاينة للتجربة فقط، وليست خدمة تسجيل دخول جاهزة.',choose:'اختار نوع المستخدم',founder:'المالك',team:'الفريق',client:'العميل',stepsHeading:'الرحلة المقترحة',nextStep:'الخطوة التالية في المعاينة',restart:'ابدأ من الأول',safe:'الأزرار بتغيّر الشرح داخل الصفحة فقط. لا يوجد تحقق حقيقي من الهوية.',permissions:'الصلاحيات لا تتبع شكل الشاشة',principleA:'الخادم هو اللي يقرر',principleADesc:'الواجهة لا تمنح صلاحيات. كل طلب محمي يتراجع منه الدور وملكية البيانات على الخادم.',principleB:'التحقق مش مجرد بريد',principleBDesc:'Zoho Mail للمراسلات، وإثبات الهوية والجلسات لهم نظام مستقل يتم اختباره.',principleC:'بيانات العملاء لا تتحرك',principleCDesc:'قاعدة بيانات Supabase باقية مؤقتًا، لكن الوصول إليها هينتقل تدريجيًا إلى واجهات آمنة.',noticeTitle:'قبل أول دخول حقيقي',noticeText:'لازم نختار نظام هوية موثوقًا، ونجهز بيئة اختبار معزولة، ونختبر الصلاحيات وإلغاء الجلسة واسترجاع الحساب والإرسال الآلي قبل التشغيل. لن نجمع أكواد أو كلمات مرور في هذه المعاينة.',finished:'نهاية المعاينة — مفيش تسجيل دخول حصل'},
 en:{banner:'No live login · No email sending · No database connection',back:'← Control Room preview',title:'Simpler access. Stronger trust.',intro:'Each person enters only their own space. No device codes shared in chats, no open permissions, no unnecessary repetition.',prototype:'This is an experience preview, not a working authentication service.',choose:'Choose an access journey',founder:'Founder',team:'Team',client:'Client',stepsHeading:'Proposed journey',nextStep:'Next preview step',restart:'Start over',safe:'Buttons change this on-screen explanation only. No identity verification occurs.',permissions:'A screen never grants permission',principleA:'The server decides',principleADesc:'The interface grants no permissions. The server checks role and data ownership on every protected request.',principleB:'Email is not identity',principleBDesc:'Zoho Mail handles correspondence. Identity verification and sessions use a separate tested service.',principleC:'Customer records remain',principleCDesc:'Supabase Postgres stays temporarily, while access migrates behind secure server endpoints.',noticeTitle:'Before the first real login',noticeText:'Select a vetted identity stack, isolate staging, then test permissions, session revocation, recovery and transactional mail before production use. This prototype never asks for credentials.',finished:'End of preview — no login took place'}
};
const roles={
 founder:{
  eyebrow:'FOUNDER / CONTROL',icon:'◈',
  title:{ar:'قرار واحد لدخول المالك',en:'One clear founder entry'},
  intro:{ar:'تأكيد الهوية بمفتاح مرور أو تحقق قوي، وبعده غرفة تحكم بصلاحية المالك.',en:'Strong passkey or MFA verification, followed by a founder-scoped Control Room.'},
  steps:[
   [{ar:'التعريف بحساب المالك',en:'Identify the founder'},{ar:'حساب مالك معروف ومحدد مسبقًا. لا يوجد تسجيل مالك من واجهة عامة.',en:'A pre-approved founder identity. Public sign-up cannot create owners.'}],
   [{ar:'التحقق القوي',en:'Strong verification'},{ar:'مفتاح مرور أو MFA معتمد، مش كود جهاز يُرسل في الشات.',en:'Passkey or approved MFA, not a device code passed via chat.'}],
   [{ar:'جلسة محمية',en:'Protected session'},{ar:'الخادم يصدر جلسة قصيرة وآمنة وقابلة للإلغاء، دون أسرار إدارة في المتصفح.',en:'Server-controlled, revocable session without browser-held admin secrets.'}],
   [{ar:'قرارات المالك',en:'Founder decisions'},{ar:'الوصول لـToday والقرارات المسموح بها فقط، مع سجل بالموافقات.',en:'Access Today and explicitly authorized decisions with audit logs.'}]
  ],
  permissions:{ar:['مراجعة العملاء','اعتماد النطاق والعروض','إدارة الفريق','إلغاء الجلسات'],en:['Review clients','Approve scope & offers','Manage team','Revoke sessions']}
 },
 team:{
  eyebrow:'TEAM / ASSIGNED WORK',icon:'◎',
  title:{ar:'كل فرد يشوف شغله بس',en:'Only assigned work for each teammate'},
  intro:{ar:'دعوة من الإدارة وصلاحيات على قد الدور، مش نفس وصول المالك.',en:'Founder-approved invitation with role-limited access, not owner rights.'},
  steps:[
   [{ar:'دعوة معتمدة',en:'Approved invitation'},{ar:'الإدارة تختار العضو والدور قبل الدعوة.',en:'Founder selects role before inviting the member.'}],
   [{ar:'إثبات الهوية',en:'Identity verification'},{ar:'تحقق مناسب للدور، مع تحديد عدد المحاولات.',en:'Role-appropriate verification with rate limits.'}],
   [{ar:'المهام المعيّنة',en:'Assigned tasks'},{ar:'المهام المسندة ومعايير التسليم والمواعيد فقط.',en:'Assigned tasks, acceptance criteria and due dates only.'}],
   [{ar:'مراجعة واعتماد',en:'Review & approval'},{ar:'المراجِع يعتمد عمل الفريق، وصلاحيات الماليات تظل محدودة.',en:'Named reviewer signs off; finances stay with authorized roles.'}]
  ],
  permissions:{ar:['المهام المسندة','رفع أدلة','تحديث تقدم','بدون صلاحيات مالية'],en:['Assigned tasks','Upload evidence','Progress updates','No finance access']}
 },
 client:{
  eyebrow:'CLIENT / A CLEAR NEXT STEP',icon:'◇',
  title:{ar:'العميل يوصل للمطلوب منه مباشرة',en:'A client sees one clear next step'},
  intro:{ar:'بيانات كل عميل مستقلة، بدون تكرار أسئلة أو كشف معلومات الآخرين.',en:'Client data stays isolated, with no repeated questions or exposure of others.'},
  steps:[
   [{ar:'فتح رابط الطلب',en:'Open case link'},{ar:'رابط واضح لا يحمل أسرار الدخول أو بيانات حساسة.',en:'Clear link without access tokens or secrets in the URL.'}],
   [{ar:'تحقق لمرة واحدة',en:'One-time verification'},{ar:'رمز قصير العمر من مزود معاملات معتمد، أو طريقة دخول آمنة بديلة.',en:'Short-lived verification via approved transactional sender or secure alternative.'}],
   [{ar:'طلبه فقط',en:'Own case only'},{ar:'الخادم يفحص ملكية الطلب قبل إظهار الملفات والعروض.',en:'Server checks ownership before showing files and offers.'}],
   [{ar:'إجراء واضح',en:'One clear action'},{ar:'العميل يرد ويعرف الحالة من غير ما يعيد نفس التفاصيل.',en:'Client responds and tracks status without repeating context.'}]
  ],
  permissions:{ar:['طلبه فقط','رفع المطلوب','مراجعة عرضه','لا بيانات عملاء آخرين'],en:['Own case','Requested uploads','Review own offer','No other client data']}
 }
};
let lang='ar',role='founder',step=0;
const T=key=>dict[lang][key]||key;
const L=item=>item[lang];
const element=(tag,className,value)=>{const e=document.createElement(tag);if(className)e.className=className;if(value!==undefined)e.textContent=value;return e;};
function render(){
 document.documentElement.lang=lang;
 document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 $('#locale').textContent=lang==='ar'?'EN':'عربي';
 $$('[data-i18n]').forEach(el=>{el.textContent=T(el.dataset.i18n);});
 const profile=roles[role],done=step>=profile.steps.length;
 $$('[data-role]').forEach(tab=>{const active=tab.dataset.role===role;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
 $('#role-panel').setAttribute('aria-labelledby','role-'+role);
 $('#role-eyebrow').textContent=profile.eyebrow;
 $('#role-heading').textContent=L(profile.title);
 $('#role-description').textContent=L(profile.intro);
 const list=$('#role-steps');list.replaceChildren();
 profile.steps.forEach((item,index)=>{
  const li=element('li',index<step?'done':index===step?'active':'');
  li.append(element('strong','',L(item[0])),element('span','',L(item[1])));list.append(li);
 });
 const focusStep=profile.steps[Math.min(step,profile.steps.length-1)];
 $('#preview-icon').textContent=done?'✓':profile.icon;
 $('#step-counter').textContent=String(Math.min(step+1,profile.steps.length)).padStart(2,'0')+' / '+String(profile.steps.length).padStart(2,'0');
 $('#preview-title').textContent=done?T('finished'):L(focusStep[0]);
 $('#preview-detail').textContent=done?T('safe'):L(focusStep[1]);
 $('#continue-demo').hidden=done;
 const tags=$('#role-permissions');tags.replaceChildren();
 L(profile.permissions).forEach(item=>tags.append(element('span','',item)));
}
function switchRole(next){if(!Object.prototype.hasOwnProperty.call(roles,next))return;role=next;step=0;render();}
$$('[data-role]').forEach(tab=>{
 tab.addEventListener('click',()=>switchRole(tab.dataset.role));
 tab.addEventListener('keydown',event=>{
  if(!['Home','End','ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();
  const list=['founder','team','client'];let index=list.indexOf(role);
  if(event.key==='Home')index=0;
  else if(event.key==='End')index=list.length-1;
  else index=(index+(event.key==='ArrowRight'?1:-1)+list.length)%list.length;
  switchRole(list[index]);$('#role-'+role).focus();
 });
});
$('#continue-demo').addEventListener('click',()=>{step=Math.min(step+1,roles[role].steps.length);render();});
$('#restart-demo').addEventListener('click',()=>{step=0;render();});
$('#locale').addEventListener('click',()=>{lang=lang==='ar'?'en':'ar';render();});
render();
})();