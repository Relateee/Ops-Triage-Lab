(function(root){
  'use strict';
  const time = issue => issue.frequency * issue.minutes;
  const score = issue => 2 * issue.impact + issue.urgency + (issue.frequency >= 15 ? 3 : issue.frequency >= 5 ? 2 : 1);
  const priority = issue => score(issue) >= 10 ? 'High' : score(issue) >= 7 ? 'Medium' : 'Low';
  const candidate = issue => issue.repeatable && time(issue) >= 60;
  const saved = issue => candidate(issue) ? time(issue) * 0.5 : 0;
  function csvCell(value) {
    let s = String(value);
    if (/^\s*[=+@-]|^[\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"','""') + '"';
  }
  function csv(issues) {
    return [['Title','Team','Status','Priority','Score','Occurrences per week','Minutes per occurrence','Automation candidate','Estimated minutes saved per week'],
      ...issues.map(i=>[i.title,i.team,i.status,priority(i),score(i),i.frequency,i.minutes,candidate(i)?'Yes':'No',saved(i)])]
      .map(row=>row.map(csvCell).join(',')).join('\r\n');
  }
  const stages = ['new','investigating','pilot','resolved'];
  const paths = ['undecided','manual','process','automation'];
  function normalize(issue) {
    return {...issue, status:stages.includes(issue.status)?issue.status:'new',
      owner:typeof issue.owner==='string'?issue.owner:'',
      path:paths.includes(issue.path)?issue.path:'undecided',
      notes:typeof issue.notes==='string'?issue.notes:'',
      reduction:Number.isFinite(issue.reduction)?Math.min(100,Math.max(0,issue.reduction)):50,
      effort:Number.isFinite(issue.effort)?Math.max(0,issue.effort):2,
      actualMinutes:Number.isFinite(issue.actualMinutes)&&issue.actualMinutes>=0?issue.actualMinutes:null,
      activity:Array.isArray(issue.activity)?issue.activity:[]};
  }
  function scenario(issue) {
    const weekly = time(issue) * issue.reduction / 100;
    return {weekly, payback:weekly>0?issue.effort*60/weekly:null,
      measured:issue.actualMinutes===null?null:time(issue)-issue.actualMinutes};
  }
  function workflowCsv(issues) {
    const extra=['Owner','Resolution path','Expected reduction (%)','Implementation hours','Measured minutes per week','Notes'];
    const baseHeader=csv([]);
    return [baseHeader+','+extra.map(csvCell).join(','), ...issues.map(i=>
      csv([i]).slice(baseHeader.length+2)+','+[i.owner??'',i.path??'undecided',i.reduction??50,i.effort??2,i.actualMinutes??'',i.notes??''].map(csvCell).join(','))].join('\r\n');
  }
  const api={time,score,priority,candidate,saved,csv:workflowCsv,stages,normalize,scenario};
  if(typeof module!=='undefined')module.exports=api;else root.OpsLogic=api;
})(globalThis);
