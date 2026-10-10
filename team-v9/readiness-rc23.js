/* ATS / RC23 - read-only task readiness for the existing authorized Team workspace.
 * Advisory only: all permissions and mutations remain server-owned.
 * No network calls, writes, token computation, or synthetic assignment.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ATS_TASK_READINESS=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const arr=x=>Array.isArray(x)?x:[];
 const finished=s=>s==='accepted'||s==='closed';
 const active=s=>s==='assigned'||s==='in_progress'||s==='review';
 const hint=Object.freeze({
   prereq:'Previous tasks must be accepted first.',
   reviewer:'The current reviewer is the only available qualified specialist. Choose a different reviewer or add another qualified contributor.',
   skill:'No available member meets this skill and level. Check the team skills before assigning.',
   capacity:'Qualified members have reached capacity. Review workload before requesting an override.',
   ready:'A qualified, available contributor can be considered. Server approval still applies.'
 });
 function derive({projectId,tasks=[],members=[],skills=[],dependencies=[]}={}){
   if(typeof projectId!=='string'||!projectId)return Object.freeze({ready:false});
   const scoped=arr(tasks).filter(t=>t?.project_id===projectId);
   const byId=new Map(scoped.map(t=>[t.id,t]));
   const memberMap=new Map(arr(members).filter(m=>m?.id).map(m=>[m.id,m]));
   const memberLoad=new Map();
   for(const t of arr(tasks))if(t?.owner_id&&active(t.status))
     memberLoad.set(t.owner_id,(memberLoad.get(t.owner_id)||0)+1);
   const eligibleSkills=new Map();
   for(const s of arr(skills)){
     if(!memberMap.has(s?.member_id))continue;
     const k=s.skill;
     if(!eligibleSkills.has(k))eligibleSkills.set(k,[]);
     eligibleSkills.get(k).push(s);
   }
   const edges=new Map();
   for(const d of arr(dependencies)){
     if(!byId.has(d?.task_id))continue;
     if(!edges.has(d.task_id))edges.set(d.task_id,[]);
     edges.get(d.task_id).push(d.depends_on);
   }
   const items=scoped.filter(t=>t.status==='available').map(t=>{
     const requiredLevel=Number(t.required_level)||1;
     const matches=[...new Set(arr(eligibleSkills.get(t.required_skill))
       .filter(s=>Number(s.level)>=requiredLevel).map(s=>s.member_id))]
       .map(id=>memberMap.get(id)).filter(m=>m?.active&&m?.available);
     const other=matches.filter(m=>m.id!==t.reviewer_id);
     const within=other.filter(m=>{
       const cap=Number(m.capacity);
       return Number.isFinite(cap)&&cap>0&&(memberLoad.get(m.id)||0)<cap;
     });
     const unmet=arr(edges.get(t.id)).filter(id=>!byId.has(id)||!finished(byId.get(id).status));
     const reasons=[];
     if(unmet.length)reasons.push('prereq');
     if(!other.length)reasons.push(matches.length===1&&matches[0].id===t.reviewer_id?'reviewer':'skill');
     else if(!within.length)reasons.push('capacity');
     return Object.freeze({
       id:t.id,title:String(t.title||'Untitled task').slice(0,180),
       requiredSkill:String(t.required_skill||'—').slice(0,90),
       unmet:unmet.length,candidates:other.length,
       reasons:Object.freeze(reasons),
       ready:reasons.length===0
     });
   });
   const count=k=>items.filter(t=>t.reasons.includes(k)).length;
   // A meaningful first action can already exist even when ZERO new tasks
   // are assignable. Never propose bypassing reviewer or dependency rules.
   const unmetFor=t=>arr(edges.get(t.id)).filter(id=>!byId.has(id)||!finished(byId.get(id).status)).length;
   const selected = scoped.find(t=>t.status==='review') ||
     scoped.find(t=>t.status==='assigned'&&t.owner_id&&unmetFor(t)===0) ||
     scoped.find(t=>t.status==='in_progress'&&t.owner_id) ||
     scoped.find(t=>t.status==='available'&&items.some(x=>x.id===t.id&&x.ready)) ||
     scoped.find(t=>t.status==='available'&&items.some(x=>x.id===t.id&&x.unmet===0&&x.reasons.includes('reviewer'))) ||
     null;
   const stepKind=selected?.status==='review'?'review':
     selected?.status==='assigned'?'assigned':
     selected?.status==='in_progress'?'in_progress':
     selected?.status==='available'&&items.some(x=>x.id===selected.id&&x.ready)?'assign':
     selected?.status==='available'?'reviewer_setup':'none';
   const stepText=Object.freeze({
     review:'A submitted task needs a decision from its authorized reviewer.',
     assigned:'This task is already assigned and has no unmet prerequisites. The assigned employee can start it.',
     in_progress:'Work is underway. The assigned employee must submit evidence before a reviewer can accept it.',
     assign:'This task passes the advisory readiness checks. Founder can review assignment using existing controls.',
     reviewer_setup:'Separate reviewer and owner before assigning this root task.',
     none:'No actionable task is visible in the loaded project records.'
   });
   const nextStep=Object.freeze({
     kind:stepKind,
     taskId:selected?.id||null,
     title:selected?.title?String(selected.title).slice(0,180):'',
     instruction:stepText[stepKind],
     // Real actions stay on the already-authorized Team task dialog.
     action:stepKind==='reviewer_setup'?'task':'details'
   });
   return Object.freeze({
     ready:true,projectId,available:items.length,
     canAssign:items.filter(t=>t.ready).length,
     needsReviewSeparation:count('reviewer'),
     noSkillMatch:count('skill'),
     waitingOnPrerequisites:count('prereq'),
     capacityBlocked:count('capacity'),
     nextStep,
     items:Object.freeze(items)
   });
 }
 function render(node,model,doc){
   if(!node||!doc?.createElement)return;
   node.replaceChildren();
   if(!model?.ready)return;
   function add(parent,tag,className,text){
     const el=doc.createElement(tag);
     if(className)el.className=className;
     if(text!==undefined)el.textContent=String(text);
     parent.appendChild(el);return el;
   }
   const header=add(node,'div','ats-readiness-head');
   const title=add(header,'div','');
   add(title,'span','ats-readiness-kicker','PROJECT · ASSIGNMENT PREFLIGHT');
   add(title,'h3','','Know what blocks the next assignment.');
   const step=model.nextStep;
   if(step?.taskId){
     const feature=add(node,'section','ats-readiness-next');
     const detail=add(feature,'div','ats-readiness-next-copy');
     add(detail,'span','ats-readiness-kicker','NEXT HUMAN ACTION · NO AUTOMATIC TRANSITION');
     add(detail,'h4','',step.title);
     add(detail,'p','',step.instruction);
     const btn=add(feature,'button','ats-readiness-next-open',
       step.action==='task'?'REVIEW TASK & REASSIGN REVIEWER →':'OPEN ORIGINAL TASK DETAILS →');
     btn.type='button';
     btn.dataset.teamAction=step.action;
     btn.dataset.id=step.taskId;
   }
   const sums=add(node,'div','ats-readiness-metrics');
   for(const [name,value] of [
     ['Ready for assignment',model.canAssign],
     ['Reviewer separation',model.needsReviewSeparation],
     ['Waiting on prior tasks',model.waitingOnPrerequisites],
     ['Skills / capacity',model.noSkillMatch+model.capacityBlocked]]){
     const item=add(sums,'div','ats-readiness-metric');
     add(item,'strong','',value);
     add(item,'small','',name);
   }
   const issues=model.items.filter(t=>!t.ready&&t.unmet===0).slice(0,5);
   if(issues.length){
     const list=add(node,'div','ats-readiness-issues');
     add(list,'h4','','First blockers to resolve');
     for(const task of issues){
       const article=add(list,'article','ats-readiness-item');
       add(article,'b','',task.title);
       add(article,'small','','Required: '+task.requiredSkill);
       for(const key of task.reasons)add(article,'p','',hint[key]||key);
     }
   }else{
     add(node,'p','ats-readiness-quiet',model.available?
       'No independent root blocker found. Complete accepted prerequisites to unlock the next tasks.':
       'No unassigned tasks are present in this project.');
   }
   add(node,'p','ats-readiness-disclaimer','Read-only guidance, not a permission or assignment. The existing authorized task commands remain the source of truth.');
 }
 return Object.freeze({derive,render});
});
