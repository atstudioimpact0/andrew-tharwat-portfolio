/* AT Studio / RC13 staging-only bootstrap.
   This HTML is deliberately NOT routed in Vercel or Production. */
(() => {
  'use strict';
  const stage=window.ATS_RC13_CASE;
  const contract=window.ATS_RC12_CASE;
  if(!stage || !contract) return;
  const shell=window.ATS_RC20_SHELL.create({documentRef:document});
  const instance=stage.create({
    locationHref:window.location.href,
    fetchFn:window.fetch.bind(window),
    bridge:contract,
    documentRef:document,
    AbortControllerImpl:window.AbortController
  });
  window.addEventListener('pagehide',()=>{instance.dispose();shell.dispose();},{once:true});
  void instance.load();
})();
