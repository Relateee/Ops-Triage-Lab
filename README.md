# Ops Triage Lab

A portfolio prototype for teams deciding which operational issues to tackle first and which repetitive tasks are worth automating. The demo uses fictional lab operations, digital services and application support examples.

## Try it locally

Open `dist/index.html` in your browser. There are no packages to install, credentials to enter or backend services to start. For a hosted demo on GitHub Pages, publish the contents of `dist/` as the site root.

## Demo walkthrough

1. Start with the seeded queue and open **How the scores work** to see how priority is calculated.
2. Log a repeatable task with 10 occurrences a week at 12 minutes each. The prototype flags it for a pilot and estimates one hour saved per week.
3. Resolve or reopen it, filter the queue and export all records as CSV.

Priority = twice the impact + urgency + a frequency band. Impact and urgency each range from 1 to 3. The frequency band is 1 for 1–4 occurrences, 2 for 5–14, and 3 at 15 or more. High priority starts at 10, medium at 7. Candidate tasks must be repeatable and account for at least one hour of manual work per week. Estimated savings assume a 50% reduction. In practice, validate assumptions against a timed manual baseline and a pilot.

## What this demonstrates

- **Digital transformation:** workflow intake, prioritisation, and a transparent business case for automation.
- **Lab operations:** repetitive test logging and report preparation as pilot candidates.
- **Application development:** validation, debugging-friendly separation of logic from UI, version control, and tests.

The prototype uses vanilla JavaScript and browser storage. No AI service or real operational data is involved. It was built with Codex. A next iteration could add reviewed AI categorisation, an owner field and measured pilot outcomes.

## Tests

With Node.js installed, run `node --test tests/logic.test.js`. Tests cover priority boundaries, the automation threshold and spreadsheet formula handling in CSV exports.
