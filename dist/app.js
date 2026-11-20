'use strict';
const $ = id => document.getElementById(id);
const key = 'ops-triage-lab-v1';
const stageNames = {new:'New',investigating:'Investigating',pilot:'Pilot',resolved:'Resolved'};
const pathNames = {undecided:'Approach undecided',manual:'Manual fix',process:'Process improvement',automation:'Automation'};
const seed = [
  {id:'sample-1',title:'Manually compile daily test logs',team:'Lab operations',impact:3,urgency:2,frequency:15,minutes:12,repeatable:true,status:'resolved',owner:'Alex',path:'automation',notes:'A reusable log template reduced weekly work from 180 to 60 minutes in this simulated pilot.',reduction:50,effort:3,actualMinutes:60},
  {id:'sample-2',title:'Review intermittent form upload failures',team:'Application support',impact:3,urgency:3,frequency:3,minutes:25,repeatable:false,status:'investigating',owner:'Sam',path:'manual',notes:'Compare failed uploads by file type and check the validation messages.'},
  {id:'sample-3',title:'Copy weekly status updates into report',team:'Digital services',impact:2,urgency:2,frequency:5,minutes:15,repeatable:true,status:'new'},
  {id:'sample-4',title:'Clarify onboarding checklist instructions',team:'Digital services',impact:1,urgency:1,frequency:4,minutes:5,repeatable:false,status:'resolved',owner:'Jo',path:'process',reduction:75,actualMinutes:8,notes:'Added examples and a named contact. Weekly clarification time fell from 20 to 8 minutes.'},
  {id:'sample-5',title:'Consolidate shift handoff reports',team:'Lab operations',impact:2,urgency:1,frequency:20,minutes:12,repeatable:true,status:'pilot',owner:'Alex',path:'automation',effort:3,notes:'Compare the current handoff with a shared report template.'}
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
function stageChange(from, to) {
  return `Stage: ${stageNames[from]} to ${stageNames[to]}`;
}
function stageControl(issue) {
  const select = el('select', '', 'card-stage');
  select.dataset.issueId = issue.id;
  select.setAttribute('aria-label', `Move ${issue.title} to another stage`);
  const prompt = new Option('Move to…', '', true, true);
  prompt.disabled = true;
  select.add(prompt);
  for (const stage of OpsLogic.stages) {
    if (stage !== issue.status) select.add(new Option(stageNames[stage], stage));
  }
  select.addEventListener('click', event => event.stopPropagation());
  select.addEventListener('change', () => {
    const nextStage = select.value;
    issue.activity.push({at: new Date().toISOString(), message: stageChange(issue.status, nextStage)});
    issue.status = nextStage;
    persist(`Moved “${issue.title}” to ${stageNames[nextStage]}.`);
    const movedControl = [...$('board').querySelectorAll('.card-stage')]
      .find(control => control.dataset.issueId === String(issue.id));
    movedControl?.focus();
    movedControl?.closest('.card').scrollIntoView({block: 'nearest'});
  });
  return select;
}
function render() {
  const active=issues.filter(i=>i.status!=='resolved');
  $('open').textContent=active.length;
  $('high').textContent=active.filter(i=>OpsLogic.priority(i)==='High').length;
  $('hours').textContent=(active.reduce((sum,i)=>sum+OpsLogic.saved(i),0)/60).toFixed(1);
  const measured=issues.filter(i=>i.actualMinutes!==null);
  $('measured').textContent=measured.length?(measured.reduce((sum,i)=>sum+OpsLogic.scenario(i).measured,0)/60).toFixed(1):'—';
  const query=$('search').value.trim().toLowerCase();
  const rows=issues.filter(i=>[i.title,i.team,i.owner].some(value=>value.toLowerCase().includes(query))&&($('team-filter').value==='all'||i.team===$('team-filter').value)&&($('path-filter').value==='all'||i.path===$('path-filter').value)).sort((a,b)=>OpsLogic.score(b)-OpsLogic.score(a)||OpsLogic.time(b)-OpsLogic.time(a));
  $('board').replaceChildren();
  OpsLogic.stages.forEach(stage=>{
    const column=el('section','','column '+stage), head=el('div','','column-head');
    const records=rows.filter(i=>i.status===stage);
    head.append(el('h2',stageNames[stage]),el('span',String(records.length),'count'));
    const list=el('ul','');list.setAttribute('aria-label',stageNames[stage]+' issues');
    if(!records.length)list.append(el('li','No issues','empty'));
    records.forEach(i=>{
      const card=el('li','','card'), top=el('div','','item-head');
      const priority=OpsLogic.priority(i);
      top.append(el('span',i.team,'meta'),el('span',priority,'badge '+priority.toLowerCase()));
      const heading=el('h3',''), button=el('button',i.title,'card-title');
      button.type='button';
      button.dataset.issueId=i.id;
      button.setAttribute('aria-haspopup','dialog');
      card.addEventListener('click',()=>openDetail(i.id));
      heading.append(button);
      card.append(top,heading);
      if(i.actualMinutes!==null) {
        card.append(el('p',`${OpsLogic.scenario(i).measured} min/wk measured`,'card-savings'));
      } else if(i.status!=='resolved'&&OpsLogic.candidate(i)) {
        card.append(el('p',`~${OpsLogic.saved(i)} min/wk potential`,'card-savings'));
      }
      const context=[i.owner, i.path==='undecided'?'':pathNames[i.path]].filter(Boolean);
      if(context.length)card.append(el('p',context.join(' · '),'meta'));
      card.append(stageControl(i));
      list.append(card);
    });
    column.append(head,list);$('board').append(column);
  });
  if (!$('analysis-view').hidden) renderAnalysis();
}
const hours = new Intl.NumberFormat(undefined, {maximumFractionDigits: 2});
const minutes = new Intl.NumberFormat(undefined, {maximumFractionDigits: 2});
const signedMinutes = new Intl.NumberFormat(undefined, {maximumFractionDigits: 2, signDisplay: 'exceptZero'});

function analysisLink(issue) {
  const button = el('button', issue.title, 'analysis-link');
  button.type = 'button';
  button.dataset.issueId = issue.id;
  button.setAttribute('aria-haspopup', 'dialog');
  button.addEventListener('click', () => openDetail(issue.id));
  return button;
}

function renderAnalysis() {
  const active = issues.filter(issue => issue.status !== 'resolved')
    .sort((a, b) => OpsLogic.time(b) - OpsLogic.time(a));
  const chart = $('workload-chart');
  chart.replaceChildren();
  const ranking = active.slice(0, 8);
  $('workload-scope').textContent = active.length > ranking.length ? `Top ${ranking.length} of ${active.length} active issues` : 'Active issues · highest workload first';
  if (!ranking.length) chart.append(el('li', 'No active issues.', 'empty'));
  for (const issue of ranking) {
    const row = el('li', '', 'workload-item');
    const label = el('div', '', 'workload-label');
    const duration = OpsLogic.time(issue);
    label.append(analysisLink(issue), el('span', `${hours.format(duration / 60)} h`));
    const track = el('div', '', 'bar-track');
    track.setAttribute('aria-hidden', 'true');
    const fill = el('div', '', 'bar-fill');
    fill.style.width = `${duration / OpsLogic.time(ranking[0]) * 100}%`;
    track.append(fill);
    row.append(label, track);
    chart.append(row);
  }
  const suggested = active.find(OpsLogic.candidate);
  $('recommendation').textContent = suggested
    ? `Suggested pilot: ${suggested.title} · ${hours.format(OpsLogic.time(suggested) / 60)} h/week of repeatable work.`
    : 'No active tasks meet the automation threshold.';

  const recorded = issues.filter(issue => issue.actualMinutes !== null);
  const unmeasured = issues.length - recorded.length;
  $('results-scope').textContent = recorded.length
    ? `Min / week · ${recorded.length} measured · ${unmeasured} unmeasured`
    : 'No measured results yet.';
  $('results-table-wrap').hidden = !recorded.length;
  const table = $('results-table');
  table.replaceChildren();
  for (const issue of recorded) {
    const {weekly, measured} = OpsLogic.scenario(issue);
    const difference = measured - weekly;
    const row = el('tr', '');
    const title = el('th', '');
    title.scope = 'row';
    title.append(analysisLink(issue));
    row.append(title, el('td', minutes.format(weekly)), el('td', minutes.format(measured)),
      el('td', signedMinutes.format(difference), difference >= 0 ? 'positive' : 'negative'));
    table.append(row);
  }
}
function detailValues(issue) {
  const data=new FormData($('detail-form'));
  return {...issue,status:data.get('status'),owner:data.get('owner').trim(),path:data.get('path'),notes:data.get('notes').trim(),reduction:Number(data.get('reduction')),effort:Number(data.get('effort')),actualMinutes:data.get('actualMinutes')===''?null:Number(data.get('actualMinutes'))};
}
function updateScenario() {
  const issue=issues.find(i=>i.id===selectedId);if(!issue)return;
  const draft=detailValues(issue), result=OpsLogic.scenario(draft);
  if (!$('detail-reduction').validity.valid || !$('detail-effort').validity.valid) {
    $('scenario-output').textContent='Enter a reduction from 0 to 100 and a valid implementation effort.';
  } else {
    $('scenario-output').textContent=`${result.weekly.toFixed(1)} min saved / week · ${result.payback===null?'No payback':result.payback.toFixed(1)+' weeks to pay back'}`;
  }
  if (!$('detail-actual').validity.valid) $('outcome-output').textContent='Enter a valid weekly time.';
  else $('outcome-output').textContent=result.measured===null?'':`${result.measured.toFixed(1)} min / week measured savings · ${result.weekly.toFixed(1)} estimated`;
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
  $('detail-baseline').textContent=`${OpsLogic.time(issue)} min / week baseline · ${OpsLogic.priority(issue)} priority (${OpsLogic.score(issue)})`;
  for (const name of ['status','owner','path','notes','reduction','effort','actualMinutes']) $('detail-form').elements.namedItem(name).value=issue[name]??'';
  for(const section of $('detail').querySelectorAll('details'))section.open=false;
  $('detail-notice').textContent='';renderActivity(issue);updateScenario();$('detail').showModal();
}
$('detail-form').addEventListener('invalid',event=>{
  const section=event.target.closest('details');
  if(section)section.open=true;
},true);
$('detail-form').addEventListener('input',()=>{ $('detail-notice').textContent='Unsaved changes';updateScenario(); });
$('detail-form').addEventListener('submit',event=>{
  event.preventDefault();const index=issues.findIndex(i=>i.id===selectedId),before=issues[index],after=detailValues(before);
  const changes=[];
  if(before.status!==after.status)changes.push(stageChange(before.status,after.status));
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
  const analysisOpen = !$('analysis-view').hidden;
  const links = analysisOpen ? $('analysis-view').querySelectorAll('.analysis-link') : $('board').querySelectorAll('.card-title');
  const trigger = [...links].find(button => button.dataset.issueId === String(selectedId));
  (trigger || $(analysisOpen ? 'show-analysis' : 'add')).focus();
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

function showAnalysis(visible) {
  $('board-view').hidden = visible;
  $('analysis-view').hidden = !visible;
  $('show-board').setAttribute('aria-pressed', String(!visible));
  $('show-analysis').setAttribute('aria-pressed', String(visible));
  if (visible) renderAnalysis();
}
$('show-board').addEventListener('click', () => showAnalysis(false));
$('show-analysis').addEventListener('click', () => showAnalysis(true));

let importRows = [];
function clearPreview() {
  importRows = [];
  $('import-preview').replaceChildren();
  $('import-errors').replaceChildren();
  $('import-status').textContent = '';
  $('confirm-import').disabled = true;
}
$('open-import').addEventListener('click', () => {
  $('import-file').value = '';
  clearPreview();
  $('import-dialog').showModal();
});
$('import-file').addEventListener('change', async event => {
  const input = event.target;
  const file = input.files[0];
  clearPreview();
  if (!file) return;
  if (file.size > 512 * 1024) {
    $('import-status').textContent = 'Choose a CSV under 512 KB.';
    return;
  }
  try {
    const text = await file.text();
    if (file !== input.files[0] || !$('import-dialog').open) return;
    const {valid, invalid} = OpsImport.validate(text, issues);
    importRows = valid;
    $('import-status').textContent = valid.length || invalid.length
      ? `${valid.length} ready · ${invalid.length} skipped`
      : 'No issue rows found.';
    for (const {row, title, errors} of invalid.slice(0, 12)) {
      $('import-errors').append(el('li', `Row ${row}${title ? ` (${title.slice(0, 90)})` : ''}: ${errors.join('; ')}`));
    }
    if (invalid.length > 12) $('import-errors').append(el('li', `${invalid.length - 12} more skipped rows`));
    for (const {issue} of valid.slice(0, 8)) {
      $('import-preview').append(el('li', `${issue.title} · ${issue.team} · ${OpsLogic.time(issue)} min/week`));
    }
    if (valid.length > 8) $('import-preview').append(el('li', `${valid.length - 8} more ready to import`));
    $('confirm-import').disabled = !valid.length;
    $('confirm-import').textContent = `Import ${valid.length} ${valid.length === 1 ? 'issue' : 'issues'}`;
  } catch (error) {
    if (file === input.files[0] && $('import-dialog').open) $('import-status').textContent = error.message;
  }
});
$('confirm-import').addEventListener('click', () => {
  const at = new Date().toISOString();
  const imported = importRows.map(({issue}, index) => ({
    ...issue,
    id: globalThis.crypto?.randomUUID?.() ?? `import-${Date.now()}-${index}`,
    activity: [{at, message: 'Imported from CSV'}]
  }));
  issues.push(...imported);
  clearPreview();
  $('import-dialog').close();
  $('search').value = '';
  $('team-filter').value = 'all';
  $('path-filter').value = 'all';
  persist(`Imported ${imported.length} ${imported.length === 1 ? 'issue' : 'issues'}.`);
});
$('notice').textContent=storageWarning;
render();
