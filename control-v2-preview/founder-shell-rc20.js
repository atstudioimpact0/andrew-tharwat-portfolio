/* AT STUDIO RC20 — Shared protected Founder UI chrome.
 * No API, cookies, storage, AI, browser credential or autonomous actions.
 * Accessible mobile navigation and AR/EN applied to the real RC13/14 pages.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ATS_RC20_SHELL=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const dict=Object.freeze({
  ar:{
   clients:'العملاء',workspace:'مساحة المالك',journey:'ابدأ بالمشكلة، مش بالخدمة.',
   principle:'عقول مختلفة. أدوات مختلفة. اتجاه واحد.',
   subtitle:'من الفهم إلى قرار قابل للتنفيذ',menu:'فتح القائمة',close:'إغلاق القائمة',
   navigation:'التنقل بين ملفات العملاء',
   preview:'نسخة تطوير محمية · قراءة فقط'
  },
  en:{
   clients:'Clients',workspace:'Founder space',journey:'Start with the problem, not the service.',
   principle:'Different minds. Different tools. One direction.',
   subtitle:'From understanding to an actionable decision',
   menu:'Open menu',close:'Close menu',
   navigation:'Client case navigation',
   preview:'Protected development candidate · Read only'
  }
 });
 function create({documentRef}={}){
  if(!documentRef||typeof documentRef.getElementById!=='function')throw Error('RC20 shell requires DOM');
  const el=id=>documentRef.getElementById(id);
  const rootEl=el('rc20-layout'),sidebar=el('rc20-rail'),button=el('rc20-menu'),
    overlay=el('rc20-overlay'),dismiss=el('rc20-dismiss');
  if(!rootEl||!sidebar||!button||!overlay||!dismiss)throw Error('RC20 shell markup missing');
  let open=false,disposed=false;
  const getLang=()=>documentRef.documentElement.lang==='en'?'en':'ar';
  const words=()=>dict[getLang()];
  function translate(){
   if(disposed)return;
   const w=words();
   if(el('rc20-rail-kicker'))el('rc20-rail-kicker').textContent=w.workspace;
   if(el('rc20-brand-line'))el('rc20-brand-line').textContent=w.journey;
   if(el('rc20-philosophy'))el('rc20-philosophy').textContent=w.principle;
   if(el('rc20-subtitle'))el('rc20-subtitle').textContent=w.subtitle;
   if(el('rc20-nav-clients'))el('rc20-nav-clients').textContent=w.clients;
   if(el('rc20-statusline'))el('rc20-statusline').textContent=w.preview;
   button.setAttribute('aria-label',w.menu);
   dismiss.setAttribute('aria-label',w.close);
   sidebar.setAttribute('aria-label',w.navigation);
  }
  function setOpen(next){
   if(disposed)return;
   open=!!next;
   rootEl.classList.toggle('rc20-nav-open',open);
   overlay.hidden=!open;
   button.setAttribute('aria-expanded',String(open));
   if(open) dismiss.focus();
   else button.focus();
  }
  function onKey(e){if(e?.key==='Escape'&&open)setOpen(false)}
  function onLink(){if(open)setOpen(false)}
  function onResize(){if(open&&documentRef.defaultView?.innerWidth>800)setOpen(false)}
  button.addEventListener('click',()=>setOpen(!open));
  dismiss.addEventListener('click',()=>setOpen(false));
  overlay.addEventListener('click',()=>setOpen(false));
  documentRef.addEventListener('keydown',onKey);
  sidebar.querySelectorAll('a').forEach(a=>a.addEventListener('click',onLink));
  documentRef.defaultView?.addEventListener('resize',onResize);
  // Existing RC13/14 translate() changes <html lang/dir> without callbacks.
  // Observe only those two attributes; this makes shell localization coherent.
  const Obs=documentRef.defaultView?.MutationObserver;
  let observer=null;
  if(typeof Obs==='function'){
   observer=new Obs(translate);
   observer.observe(documentRef.documentElement,{attributes:true,attributeFilter:['lang','dir']});
  }
  translate();
  return Object.freeze({translate,open:()=>setOpen(true),close:()=>setOpen(false),
   dispose(){
    if(disposed)return;
    disposed=true;observer?.disconnect();
    documentRef.removeEventListener('keydown',onKey);
    documentRef.defaultView?.removeEventListener('resize',onResize);
    rootEl.classList.remove('rc20-nav-open');overlay.hidden=true;open=false;
   }});
 }
 return Object.freeze({create});
});
