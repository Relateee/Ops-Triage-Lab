const test=require('node:test');
const assert=require('node:assert/strict');
const {score,priority,candidate,saved,csv}=require('../dist/logic.js');
const issue={title:'Test logs',team:'Lab operations',status:'open',impact:3,urgency:2,frequency:15,minutes:12,repeatable:true};
test('frequency and priority thresholds',()=>{
  assert.deepEqual([4,5,14,15].map(frequency=>score({...issue,frequency})),[9,10,10,11]);
  assert.equal(priority({...issue,frequency:4}),'Medium');
  assert.equal(priority(issue),'High');
  assert.equal(priority({...issue,impact:1,urgency:1,frequency:1}),'Low');
});
test('repeatability and minimum workload determine candidate savings',()=>{
  assert.equal(candidate({...issue,frequency:4,minutes:15}),true);
  assert.equal(candidate({...issue,frequency:4,minutes:14}),false);
  assert.equal(saved({...issue,repeatable:false}),0);
  assert.equal(saved(issue),90);
});
test('CSV protects formula-like titles and escapes quotation marks',()=>{
  const exportText=csv([{...issue,title:'=1+1, "check"'}]);
  assert.ok(exportText.includes('"\'=1+1, ""check"""'));
  assert.equal(exportText.split('\r\n').length,2);
});
