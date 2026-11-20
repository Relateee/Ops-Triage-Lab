(function(root) {
  'use strict';
  const logic = typeof module !== 'undefined' ? require('./logic.js') : root.OpsLogic;
  const teams = ['Lab operations', 'Digital services', 'Application support'];
  const required = ['title', 'team', 'impact', 'urgency', 'occurrences per week', 'minutes per occurrence', 'repeatable'];
  const issueKey = issue => JSON.stringify([issue.team, issue.title.trim().replace(/\s+/g, ' ').toLowerCase()]);

  function parse(text) {
    const rows = [];
    // A quoted field can contain commas, line breaks and doubled quotation marks.
    const fieldPattern = /"((?:[^"]|"")*)"(?=,|\r|\n|$)|([^",\r\n]*)(?=,|\r|\n|$)/y;
    let row = [];
    let offset = 0;
    while (offset < text.length) {
      fieldPattern.lastIndex = offset;
      const match = fieldPattern.exec(text);
      if (!match) throw new Error(`Malformed CSV near row ${rows.length + 1}. Check quotation marks.`);
      row.push(match[1] === undefined ? match[2] : match[1].replaceAll('""', '"'));
      offset = fieldPattern.lastIndex;
      if (text[offset] === ',') {
        offset++;
        if (offset === text.length) row.push('');
        continue;
      }
      rows.push(row);
      row = [];
      if (text.slice(offset, offset + 2) === '\r\n') offset += 2;
      else offset++;
    }
    if (row.length) rows.push(row);
    return rows;
  }

  function validate(text, existing) {
    const [header = [], ...records] = parse(text.replace(/^\uFEFF/, ''));
    const columns = header.map(value => value.trim().toLowerCase());
    const missing = required.filter(name => !columns.includes(name));
    if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}.`);
    if (new Set(columns).size !== columns.length) throw new Error('Column names must be unique.');
    const seen = new Set(existing.map(issueKey));
    const valid = [];
    const invalid = [];
    records.forEach((cells, index) => {
      if (cells.every(cell => !cell.trim())) return;
      const row = index + 2;
      const get = name => (cells[columns.indexOf(name)] ?? '').trim();
      const errors = [];
      function numeric(name, min, max, step = 1, fallback) {
        const raw = get(name);
        if (!raw && fallback !== undefined) return fallback;
        const value = Number(raw);
        if (!/^\d+(?:\.\d+)?$/.test(raw) || value < min || value > max || !Number.isInteger(value / step)) {
          errors.push(`${name} must be ${min}–${max}${step === 1 ? ' (whole number)' : ` in steps of ${step}`}`);
        }
        return value;
      }
      const title = get('title');
      const team = teams.find(name => name.toLowerCase() === get('team').toLowerCase());
      const status = get('status').toLowerCase() || 'new';
      const path = get('resolution path').toLowerCase() || 'undecided';
      const owner = get('owner');
      const notes = get('notes');
      const repeatable = get('repeatable').toLowerCase();
      if (cells.length !== columns.length) errors.push('column count differs from the header');
      if (!title || title.length > 90) errors.push('title must be 1–90 characters');
      if (!team) errors.push('unrecognized team');
      if (!logic.stages.includes(status) && status !== 'open') errors.push('unrecognized status');
      if (logic.normalize({path}).path !== path) errors.push('unrecognized resolution path');
      if (owner.length > 80 || notes.length > 4000) errors.push('owner or notes exceed the length limit');
      if (repeatable !== 'yes' && repeatable !== 'no') errors.push('repeatable must be Yes or No');
      const issue = logic.normalize({
        title, team, status, path, owner, notes, repeatable: repeatable === 'yes',
        impact: numeric('impact', 1, 3), urgency: numeric('urgency', 1, 3),
        frequency: numeric('occurrences per week', 1, 1000), minutes: numeric('minutes per occurrence', 1, 600),
        reduction: numeric('expected reduction (%)', 0, 100, 1, 50),
        effort: numeric('implementation hours', 0, 10000, .25, 2),
        actualMinutes: numeric('measured minutes per week', 0, 600000, 1, null)
      });
      const key = issueKey(issue);
      if (seen.has(key)) errors.push('duplicate title and team');
      if (errors.length) invalid.push({row, title, errors});
      else {
        seen.add(key);
        valid.push({row, issue});
      }
    });
    return {valid, invalid};
  }

  const api = {validate};
  if (typeof module !== 'undefined') module.exports = api;
  else root.OpsImport = api;
})(globalThis);
