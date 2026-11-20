const test = require('node:test');
const assert = require('node:assert/strict');
const {validate} = require('../dist/import.js');
const {csv, normalize} = require('../dist/logic.js');

const header = 'Title,Team,Impact,Urgency,Occurrences per week,Minutes per occurrence,Repeatable';

test('CSV validates required columns, quoted fields, bad values and duplicates', () => {
  assert.throws(() => validate('Title,Team\nTest,Lab operations', []), /Missing columns/);
  assert.throws(() => validate(header+'\n"Unclosed', []), /Malformed CSV near row 2/);
  const preview = validate([
    '\uFEFF'+header,
    '"Reconcile, ""daily"" logs",Lab operations,2,1,15,12,Yes',
    'Broken value,Lab operations,4,1,15,0,Yes',
    '" reconcile,  ""daily"" logs ",lab operations,2,1,15,12,yes',
    'Existing task,Digital services,2,1,15,12,No',
    ',Application support,1,2,10,2,No'
  ].join('\r\n'), [{title:'Existing task', team:'Digital services'}]);
  assert.equal(preview.valid[0].issue.title, 'Reconcile, "daily" logs');
  assert.deepEqual(preview.invalid.map(item => item.row), [3,4,5,6]);
  assert.match(preview.invalid[0].errors.join(' '), /impact.*minutes per occurrence/);
  assert.deepEqual(preview.invalid[1].errors, ['duplicate title and team']);
  assert.deepEqual(preview.invalid[2].errors, ['duplicate title and team']);
  assert.match(preview.invalid[3].errors.join(' '), /title must be/);
});

test('current exports preserve multiline notes and distinguish zero from unmeasured', () => {
  const issue = normalize({title:'Task', team:'Lab operations', impact:2, urgency:1, frequency:15,
    minutes:12, repeatable:true, status:'pilot', path:'automation', notes:'First line\r\n"Second"', actualMinutes:0});
  const {valid, invalid} = validate(csv([issue, {...issue,title:'Task 2',actualMinutes:null}]), []);
  assert.deepEqual(invalid, []);
  assert.deepEqual(valid.map(row => row.issue.actualMinutes), [0,null]);
  assert.equal(valid[0].issue.notes, issue.notes);
  assert.equal(valid[0].issue.status, 'pilot');
});
