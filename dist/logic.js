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
  const api={time,score,priority,candidate,saved,csv};
  if(typeof module!=='undefined')module.exports=api;else root.OpsLogic=api;
})(globalThis);
