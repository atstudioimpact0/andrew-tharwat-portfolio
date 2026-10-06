const dayparts=[
  {name:'AFTER DARK',start:0,end:360,desc:'هدوء آخر الليل ومساحة للأفكار.'},
  {name:'WAKE',start:360,end:600,desc:'بداية خفيفة وإيقاع يصحّي اليوم.'},
  {name:'FLOW',start:600,end:840,desc:'موسيقى تساعد اليوم يمشي بسلاسة.'},
  {name:'RESET',start:840,end:1020,desc:'إعادة شحن قبل زحمة المساء.'},
  {name:'DRIVE',start:1020,end:1200,desc:'طاقة أعلى لوقت الحركة والرجوع.'},
  {name:'PRIME',start:1200,end:1440,desc:'المساء: مساحة للحكايات والصوت الأقرب.'}
];
const pad=n=>String(n).padStart(2,'0');
const timeLabel=m=>`${pad(Math.floor(m/60)%24)}:${pad(m%60)}`;
function cairoParts(){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
  const h=Number(parts.find(p=>p.type==='hour')?.value||0),m=Number(parts.find(p=>p.type==='minute')?.value||0);
  return {h,m,total:h*60+m};
}
function currentIndex(total){return dayparts.findIndex(d=>total>=d.start&&total<d.end)}
function render(){
  const now=cairoParts(),idx=currentIndex(now.total),next=(idx+1)%dayparts.length;
  document.getElementById('cairo-clock').textContent=`${pad(now.h)}:${pad(now.m)} CAIRO`;
  document.getElementById('now-title').textContent=dayparts[idx]?.name||'—';
  document.getElementById('now-window').textContent=dayparts[idx]?`${timeLabel(dayparts[idx].start)} — ${timeLabel(dayparts[idx].end)}`:'—';
  document.getElementById('next-title').textContent=dayparts[next]?.name||'—';
  document.getElementById('next-window').textContent=dayparts[next]?`${timeLabel(dayparts[next].start)} — ${timeLabel(dayparts[next].end)}`:'—';
  const grid=document.getElementById('schedule-grid');
  grid.replaceChildren(...dayparts.map((d,i)=>{
    const el=document.createElement('article');el.className='daypart'+(i===idx?' is-current':'');
    el.innerHTML=`<span class="num">${pad(i+1)}</span><h3 dir="ltr">${d.name}</h3><span class="time" dir="ltr">${timeLabel(d.start)} — ${timeLabel(d.end)}</span><p>${d.desc}</p>`;
    return el;
  }));
}
render();setInterval(render,30000);