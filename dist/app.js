'use strict';
const $ = id => document.getElementById(id);
const key = 'ops-triage-lab-v1';
const seed = [
  {id:'sample-1',title:'Manually compile daily test logs',team:'Lab operations',impact:3,urgency:2,frequency:15,minutes:12,repeatable:true,status:'open'},
  {id:'sample-2',title:'Review intermittent form upload failures',team:'Application support',impact:3,urgency:3,frequency:3,minutes:25,repeatable:false,status:'open'},
  {id:'sample-3',title:'Copy weekly status updates into report',team:'Digital services',impact:2,urgency:2,frequency:5,minutes:15,repeatable:true,status:'open'},
  {id:'sample-4',title:'Clarify onboarding checklist instructions',team:'Digital services',impact:1,urgency:1,frequency:4,minutes:5,repeatable:false,status:'resolved'}
];
let issues=seed.map(i=>({...i}));
try { const previous=JSON.parse(localStorage.getItem(key)); if(Array.isArray(previous))issues=previous; } catch {}
function el(tag,t,cls){const n=document.createElement(tag);n.textContent=t;if(cls)n.className=cls;return n;}
function save(message){
  try{localStorage.setItem(key,JSON.stringify(issues));}
  catch{message+=' Browser storage is unavailable, so changes last for this session only.';}
  $('notice').textContent=message;
  render();
}
function render(){
  const open=issues.filter(i=>i.status==='open');
  $('open').textContent=open.length;
  $('high').textContent=open.filter(i=>OpsLogic.priority(i)==='High').length;
  $('hours').textContent=(open.reduce((s,i)=>s+OpsLogic.saved(i),0)/60).toFixed(1);
  const query=$('search').value.trim().toLowerCase(), filter=$('filter').value;
  const rows=issues.filter(i=>(filter==='all'||i.status===filter)&&[i.title,i.team].some(s=>s.toLowerCase().includes(query))).sort((a,b)=>OpsLogic.score(b)-OpsLogic.score(a)||OpsLogic.time(b)-OpsLogic.time(a));
  const list=$('queue'); list.replaceChildren();
  if(!rows.length)list.append(el('li','No issues match this view.','empty'));
  rows.forEach(i=>{
    const li=el('li',''), head=el('div','','item-head'), p=OpsLogic.priority(i);
    head.append(el('h3',i.title),el('span',p+' · '+OpsLogic.score(i),'badge '+p.toLowerCase()));
    const row=el('div','','actions');
    const note=OpsLogic.candidate(i)?'Pilot candidate · ~'+OpsLogic.saved(i)+' min saved / week':i.repeatable?'Below automation threshold':'Review manually';
    const b=el('button',i.status==='open'?'Resolve':'Reopen','secondary');b.type='button';
    b.setAttribute('aria-label',b.textContent+' '+i.title);
    b.addEventListener('click',()=>{i.status=i.status==='open'?'resolved':'open';save(i.status==='open'?'Issue reopened.':'Issue resolved.');$('filter').focus();});
    row.append(el('p',note),b);
    li.append(head,el('p',i.team+' · '+OpsLogic.time(i)+' min / week · '+(i.status==='open'?'Open':'Resolved'),'meta'),row);list.append(li);
  });
}
$('form').addEventListener('submit',e=>{
  e.preventDefault();const f=new FormData(e.currentTarget), title=f.get('title').trim();
  if(!title){$('notice').textContent='Enter an issue title.';return;}
  issues.push({id:globalThis.crypto?.randomUUID?.()??String(Date.now()), title, team:f.get('team'), impact:Number(f.get('impact')), urgency:Number(f.get('urgency')), frequency:Number(f.get('frequency')), minutes:Number(f.get('minutes')), repeatable:f.has('repeatable'), status:'open'});
  e.currentTarget.reset();$('filter').value='open';$('search').value='';save('Issue added to the queue.');
});
$('search').addEventListener('input',render);$('filter').addEventListener('change',render);
$('export').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([OpsLogic.csv(issues)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ops-triage-issues.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
render();
