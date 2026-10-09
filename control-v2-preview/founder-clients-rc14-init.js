/* RC14 protected client picker boot. No JWT/secret or API host string. */
(() => {
 'use strict';
 const app=window.ATS_RC14_LIST.create({
  locationHref:window.location.href,
  fetchFn:window.fetch.bind(window),
  documentRef:document,
  AbortControllerImpl:window.AbortController
 });
 window.addEventListener('pagehide',()=>app.dispose(),{once:true});
 void app.load();
})();
