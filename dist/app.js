'use strict';
const $ = id => document.getElementById(id);
const key = 'ops-triage-lab-v1';
const stageNames = {new:'New',investigating:'Investigating',pilot:'Pilot',resolved:'Resolved'};
const pathNames = {undecided:'Approach undecided',manual:'Manual fix',process:'Process improvement',automation:'Automation'};
const hints = {undecided:'Investigate the cause before choosing an approach.',manual:'Describe the direct fix and how you will verify it.',process:'Consider a clearer handoff, checklist or simpler process.',automation:'Check that the steps are consistent, then run a small pilot against a timed baseline.'};
const seed = [
  {id:'sample-1',title:'Manually compile daily test logs',team:'Lab operations',impact:3,urgency:2,frequency:15,minutes:12,repeatable:true,status:'pilot',owner:'Alex',path:'automation',notes:'Trial a reusable log template with one shift before rolling it out.',reduction:50,effort:3},
  {id:'sample-2',title:'Review intermittent form upload failures',team:'Application support',impact:3,urgency:3,frequency:3,minutes:25,repeatable:false,status:'investigating',owner:'Sam',path:'manual',notes:'Compare failed uploads by file type and check the validation messages.'},
  {id:'sample-3',title:'Copy weekly status updates into report',team:'Digital services',impact:2,urgency:2,frequency:5,minutes:15,repeatable:true,status:'new'},
  {id:'sample-4',title:'Clarify onboarding checklist instructions',team:'Digital services',impact:1,urgency:1,frequency:4,minutes:5,repeatable:false,status:'resolved',owner:'Jo',path:'process',actualMinutes:8,notes:'Added examples and a named contact. Weekly clarification time fell from 20 to 8 minutes.'}
];
let issues = seed.map(OpsLogic.normalize);
let storageWarning = '';
try {
  const previous = JSON.parse(localStorage.getItem(key));
  if (Array.isArray(previous)) issues = previous.map(OpsLogic.normalize);
} catch { storageWarning = 'Browser storage could not be read. Showing demo records.'; }
let selectedId = null;
function el(tag, text, cls) { const node=document.createElement(tag); node.textContent=text; if(cls)node.className=cls; return node; }
function persist(message) {
  try { localStorage.setItem(key, JSON.stringify(issues)); }
  catch { message += ' Browser storage is unavailable; changes last for this session only.'; }
  $('notice').textContent=message;
  if ($('detail').open) $('detail-notice').textContent=message;
  render();
}
function render() {
  const active=issues.filter(i=>i.status!=='resolved');
  $('open').textContent=active.length;
  $('high').textContent=active.filter(i=>OpsLogic.priority(i)==='High').length;
  $('hours').textContent=(active.reduce((sum,i)=>sum+OpsLogic.saved(i),0)/60).toFixed(1);
  const measured=issues.filter(i=>i.actualMinutes!==null);
  $('measured').textContent=measured.length?(measured.reduce((sum,i)=>sum+OpsLogic.scenario(i).measured,0)/60).toFixed(1):'—';
  $('measured-count').textContent=measured.length?`${measured.length} recorded outcome${measured.length===1?'':'s'}`:'No results recorded';
  const query=$('search').value.trim().toLowerCase();
  const rows=issues.filter(i=>[i.title,i.team,i.owner].some(value=>value.toLowerCase().includes(query))&&($('team-filter').value==='all'||i.team===$('team-filter').value)&&($('path-filter').value==='all'||i.path===$('path-filter').value)).sort((a,b)=>OpsLogic.score(b)-OpsLogic.score(a)||OpsLogic.time(b)-OpsLogic.time(a));
  $('board').replaceChildren();
  OpsLogic.stages.forEach(stage=>{
    const column=el('section','','column '+stage), head=el('div','','column-head');
    const records=rows.filter(i=>i.status===stage);
    head.append(el('h3',stageNames[stage]),el('span',String(records.length),'count'));
    const list=el('ul','');list.setAttribute('aria-label',stageNames[stage]+' issues');
    if(!records.length)list.append(el('li','No issues in this view.','empty'));
    records.forEach(i=>{
      const card=el('li','','card'), top=el('div','','item-head');
      const priority=OpsLogic.priority(i);
      top.append(el('span',i.team,'meta'),el('span',priority+' · '+OpsLogic.score(i),'badge '+priority.toLowerCase()));
      const heading=el('h4',''), button=el('button',i.title,'card-title');button.type='button';button.addEventListener('click',()=>openDetail(i.id));heading.append(button);
      const note=i.actualMinutes!==null?`${OpsLogic.scenario(i).measured} min / week measured savings`:OpsLogic.candidate(i)?`~${OpsLogic.saved(i)} min / week potential savings`:'Investigate an improvement';
      card.append(top,heading,el('p',pathNames[i.path],'path'),el('p',note,'meta'),el('p',i.owner||'Unassigned','owner'));
      list.append(card);
    });
    column.append(head,list);$('board').append(column);
  });
}
function detailValues(issue) {
  const data=new FormData($('detail-form'));
  return {...issue,status:data.get('status'),owner:data.get('owner').trim(),path:data.get('path'),notes:data.get('notes').trim(),reduction:Number(data.get('reduction')),effort:Number(data.get('effort')),actualMinutes:data.get('actualMinutes')===''?null:Number(data.get('actualMinutes'))};
}
function updateScenario() {
  const issue=issues.find(i=>i.id===selectedId);if(!issue)return;
  const draft=detailValues(issue), result=OpsLogic.scenario(draft);
  $('path-hint').textContent=hints[draft.path];
  if (!$('detail-reduction').validity.valid || !$('detail-effort').validity.valid) {
    $('scenario-output').textContent='Enter a reduction from 0 to 100 and a valid implementation effort.';
  } else {
    $('scenario-output').textContent=`${result.weekly.toFixed(1)} min saved / week · ${result.payback===null?'No payback at 0% reduction':result.payback.toFixed(1)+' weeks to recover implementation time'}`;
  }
  if (!$('detail-actual').validity.valid) $('outcome-output').textContent='Enter a valid weekly time.';
  else $('outcome-output').textContent=result.measured===null?'No measured result yet.':`${result.measured.toFixed(1)} min / week measured savings · expected ${result.weekly.toFixed(1)} min / week`;
}
function renderActivity(issue) {
  $('activity').replaceChildren();
  if(!issue.activity.length)$('activity').append(el('li','No updates recorded yet.','meta'));
  issue.activity.slice().reverse().forEach(entry=>{
    const row=el('li','');row.append(el('p',entry.message));
    const date=new Date(entry.at);row.append(el('small',Number.isNaN(date.getTime())?'':date.toLocaleString()));$('activity').append(row);
  });
}
function openDetail(id) {
  const issue=issues.find(i=>i.id===id);selectedId=id;
  $('detail-title').textContent=issue.title;$('detail-team').textContent=issue.team;
  $('detail-baseline').textContent=`Baseline: ${issue.frequency} occurrences × ${issue.minutes} min = ${OpsLogic.time(issue)} min / week · ${OpsLogic.priority(issue)} priority`;
  for (const name of ['status','owner','path','notes','reduction','effort','actualMinutes']) $('detail-form').elements.namedItem(name).value=issue[name]??'';
  $('detail-notice').textContent='';renderActivity(issue);updateScenario();$('detail').showModal();
}
$('detail-form').addEventListener('input',()=>{ $('detail-notice').textContent='Unsaved changes';updateScenario(); });
$('detail-form').addEventListener('submit',event=>{
  event.preventDefault();const index=issues.findIndex(i=>i.id===selectedId),before=issues[index],after=detailValues(before);
  const changes=[];
  if(before.status!==after.status)changes.push(`Stage: ${stageNames[before.status]} to ${stageNames[after.status]}`);
  if(before.path!==after.path)changes.push(`Approach: ${pathNames[after.path]}`);
  if(before.owner!==after.owner)changes.push(`Owner: ${after.owner||'Unassigned'}`);
  if(before.notes!==after.notes)changes.push('Investigation notes updated');
  if(before.reduction!==after.reduction||before.effort!==after.effort)changes.push('Scenario updated');
  if(before.actualMinutes!==after.actualMinutes)changes.push(after.actualMinutes===null?'Measured outcome cleared':`Measured weekly time: ${after.actualMinutes} min`);
  if(!changes.length){$('detail-notice').textContent='No changes to save.';return;}
  after.activity=[...before.activity,{at:new Date().toISOString(),message:changes.join(' · ')}];issues[index]=after;
  persist('Changes saved.');renderActivity(after);
});
$('add').addEventListener('click',()=>$('intake').showModal());
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>$(button.dataset.close).close());
$('detail').addEventListener('close',()=>{
  const trigger=[...document.querySelectorAll('.card-title')].find(button=>button.textContent===issues.find(i=>i.id===selectedId)?.title);
  (trigger||$('add')).focus();
});
$('form').addEventListener('submit',event=>{
  event.preventDefault();const data=new FormData(event.currentTarget),title=data.get('title').trim();
  if(!title){event.currentTarget.elements.title.setCustomValidity('Enter an issue title.');event.currentTarget.elements.title.reportValidity();return;}
  issues.push(OpsLogic.normalize({id:globalThis.crypto?.randomUUID?.()??String(Date.now()),title,team:data.get('team'),owner:data.get('owner').trim(),impact:Number(data.get('impact')),urgency:Number(data.get('urgency')),frequency:Number(data.get('frequency')),minutes:Number(data.get('minutes')),repeatable:data.has('repeatable'),status:'new',activity:[{at:new Date().toISOString(),message:'Issue logged'}]}));
  event.currentTarget.reset();$('search').value='';$('team-filter').value='all';$('path-filter').value='all';$('intake').close();persist('Issue added to the board.');
});
$('form').elements.title.addEventListener('input',event=>event.target.setCustomValidity(''));
$('search').addEventListener('input',render);
for(const id of ['team-filter','path-filter'])$(id).addEventListener('change',render);
$('export').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([OpsLogic.csv(issues)],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
  link.href=url;link.download='ops-triage-issues.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('notice').textContent=storageWarning;
render();
