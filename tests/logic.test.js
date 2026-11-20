const test=require('node:test');
const assert=require('node:assert/strict');
const {score,priority,candidate,saved,csv}=require('../dist/logic.js');
const {normalize,scenario}=require('../dist/logic.js');
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
test('old browser records migrate without losing their issue or resolution',()=>{
  const migrated=normalize({...issue,id:'existing',status:'open'});
  assert.equal(migrated.status,'new');
  assert.equal(migrated.id,'existing');
  assert.equal(migrated.title,issue.title);
  assert.equal(migrated.path,'undecided');
  assert.equal(migrated.actualMinutes,null);
  assert.deepEqual(migrated.activity,[]);
  assert.equal(normalize({...issue,status:'resolved'}).status,'resolved');
  assert.equal(normalize({...issue,status:'pilot',owner:'Jo',path:'process'}).path,'process');
});
test('scenarios separate estimated savings, payback and measured results',()=>{
  assert.deepEqual(scenario(normalize({...issue,reduction:50,effort:3,actualMinutes:60})),{weekly:90,payback:2,measured:120});
  assert.equal(scenario(normalize({...issue,reduction:0})).payback,null);
  assert.equal(scenario(normalize({...issue})).measured,null);
  assert.equal(scenario(normalize({...issue,actualMinutes:200})).measured,-20);
  assert.equal(scenario(normalize({...issue,actualMinutes:0})).measured,180);
});
test('workflow export includes owner, path, zero outcomes and escaped multiline notes',()=>{
  const exported=csv([normalize({...issue,owner:'=SUM(A1)',path:'automation',actualMinutes:0,notes:'First line\n"Second"'})]);
  assert.ok(exported.includes('"Owner","Resolution path"'));
  assert.ok(exported.includes('"\'=SUM(A1)"'));
  assert.ok(exported.includes('"automation","50","2","0","First line\n""Second"""'));
});
