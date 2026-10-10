/* AT STUDIO / RC21 — Project Continuity Pulse.
 * Read-only projection of the EXISTING operational records.
 * No new API, no token calculation, no auth change, no client messaging,
 * no writes, no automatic stage/task transitions.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ATS_PROJECT_CONTINUITY=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const CLOSED=new Set(['accepted','closed']);
const ACTIVE=new Set(['assigned','in_progress','review']);
const TEXT=Object.freeze({
  noData:'Project details are not loaded yet.',
  noDomains:'No delivery domains have been built. Review the approved blueprint first.',
  reviewDomain:'A Domain Lead submitted an outcome for your review.',
  noLead:'A delivery domain needs one accountable lead.',
  taskReview:'An employee delivery is waiting for its assigned reviewer.',
  overdue:'A team task is past its due date.',
  unassigned:'A delivery task still needs an owner.',
  clientReply:'The latest project message is from the client.',
  pendingClient:'A published client review is waiting for a response.',
  nextInternal:'The project has an outstanding internal action.',
  steady:'No priority exception is visible in the loaded project records.',
  progress:'accepted',
  action:'ONE NEXT HUMAN ACTION'
});
const arr=v=>Array.isArray(v)?v:[];
function asText(v,max=180){return typeof v==='string'?v.trim().slice(0,max):''}
function later(a,b){const aa=Date.parse(a?.created_at||''),bb=Date.parse(b?.created_at||'');return (Number.isFinite(aa)?aa:-Infinity)-(Number.isFinite(bb)?bb:-Infinity)}
function derive({project,domains=[],tasks=[],messages=[],reviews=[]},clock=Date.now()){
 if(!project||typeof project.id!=='string'||!project.id)return Object.freeze({ready:false,reason:TEXT.noData});
 // Never mix another project's records into the current project.
 const scoped=list=>arr(list).filter(row=>row&&row.project_id===project.id);
 const ds=scoped(domains),ts=scoped(tasks),ms=scoped(messages),rs=scoped(reviews);
 const finished=ts.filter(t=>CLOSED.has(t.status)).length;
 const reviewTasks=ts.filter(t=>t.status==='review');
 const unassigned=ts.filter(t=>t.status==='available'||(!t.owner_id&&!CLOSED.has(t.status)));
 const overdue=ts.filter(t=>!CLOSED.has(t.status)&&
   Number.isFinite(Date.parse(t.due_at))&&Date.parse(t.due_at)<clock);
 const reviewDomains=ds.filter(d=>d.status==='review');
 const noLead=ds.filter(d=>!d.lead_member_id&&d.status!=='accepted'&&d.status!=='closed');
 const lastMessage=[...ms].sort(later).at(-1);
 const pendingReviews=rs.filter(r=>['awaiting_review','pending','in_review'].includes(r.status));
 // Deterministic priority. Never infer payment or token values.
 let action={key:'steady',text:TEXT.steady,target:'project-domain-list'};
 if(lastMessage?.sender_type==='client')action={key:'clientReply',text:TEXT.clientReply,target:'project-message-input'};
 else if(reviewDomains.length)action={key:'reviewDomain',text:TEXT.reviewDomain,target:'project-domain-list'};
 else if(noLead.length)action={key:'noLead',text:TEXT.noLead,target:'project-domain-list'};
 else if(reviewTasks.length)action={key:'taskReview',text:TEXT.taskReview,target:'team'};
 else if(overdue.length)action={key:'overdue',text:TEXT.overdue,target:'team'};
 else if(unassigned.length)action={key:'unassigned',text:TEXT.unassigned,target:'team'};
 else if(pendingReviews.length)action={key:'pendingClient',text:TEXT.pendingClient,target:'project-review-list'};
 else if(asText(project.internal_action)&&project.internal_action!=='No action required')
   action={key:'nextInternal',text:asText(project.internal_action),target:'open-project-team-tasks'};
 else if(!ds.length)action={key:'noDomains',text:TEXT.noDomains,target:'project-domain-list'};
 return Object.freeze({
  ready:true,
  projectId:project.id,
  projectTitle:asText(project.title,120)||'Project',
  counts:Object.freeze({domains:ds.length,tasks:ts.length,accepted:finished,
   reviews:reviewTasks.length,unassigned:unassigned.length,overdue:overdue.length,
   messages:ms.length,publishedReviews:rs.length}),
  action:Object.freeze(action),
  tokens:'Existing Team Wallet (no new balance calculation)',
  detailsAvailable:true
 });
}
function render(node,pulse,doc){
 if(!node||!doc||typeof doc.createElement!=='function')return;
 node.replaceChildren();
 const div=(tag,cls,text)=>{
  const el=doc.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);
  return el;
 };
 if(!pulse?.ready){
  node.appendChild(div('p','ats-pulse-empty',TEXT.noData));
  return;
 }
 const top=div('div','ats-pulse-top');
 const name=div('div','ats-pulse-name');
 name.append(div('span','ats-pulse-eyebrow','ATS · PROJECT CONTINUITY'),
  div('h3','', 'One clear decision. Full delivery capability.'));
 top.appendChild(name);
 const tags=div('div','ats-pulse-metrics');
 for(const [label,count] of [['Domains',pulse.counts.domains],
   ['Team tasks',pulse.counts.tasks],
   ['Accepted',pulse.counts.accepted],
   ['Reviews',pulse.counts.reviews]]){
  const badge=div('span','ats-pulse-metric');
  badge.appendChild(div('strong','',count));
  badge.appendChild(div('small','',label));
  tags.appendChild(badge);
 }
 top.appendChild(tags);
 const action=div('div','ats-pulse-next');
 const words=div('div','ats-pulse-next-words');
 words.appendChild(div('span','ats-pulse-eyebrow',TEXT.action));
 words.appendChild(div('p','',pulse.action.text));
 const btn=div('button','ats-pulse-go','OPEN RELEVANT WORKSPACE →');
 btn.type='button';btn.dataset.atsPulseTarget=pulse.action.target;
 btn.setAttribute('aria-label','Open relevant project workspace');
 action.append(words,btn);
 const footer=div('p','ats-pulse-footer',
  'All project messages, evidence, assigned work, reviews and Token Wallet remain in their existing workspaces. Nothing was changed by this summary.');
 node.append(top,action,footer);
}
return Object.freeze({derive,render});
});
