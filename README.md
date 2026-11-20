# Ops Triage Lab

A portfolio prototype for investigating operational issues, comparing improvements and measuring results. All examples use fictional lab operations, digital services and application support data.

## Try it locally

Open `dist/index.html` in a modern browser. No packages, credentials or backend services are needed. For GitHub Pages, publish `dist/` as the site root.

## Explore the workflow

- Use the **New**, **Investigating**, **Pilot** and **Resolved** board columns to see work in progress. Cards are ordered by priority, then weekly workload.
- Click an issue title to assign an owner, write investigation notes and choose a manual fix, process improvement or automation approach.
- Change stages directly in the issue details. Issues can move back to investigation or skip a pilot when appropriate.
- Adjust expected time reduction and implementation effort to compare weekly savings and payback before saving a scenario.
- Record weekly time after a change to compare measured savings with the estimate. Blank means unmeasured; zero means no time remains; a negative saving indicates increased workload.
- Save changes to add an activity entry. Search by title, team or owner, filter by team or approach, and export all issues as CSV.

Fresh browser storage includes examples across all four stages. Existing records from the earlier version are retained: open issues become New and resolved issues stay Resolved. Workflow changes persist under the same browser storage key. Different browsers, devices or origins do not share records.

## Calculations

The **Analysis** view ranks up to eight active issues by weekly manual workload, independently of priority. The suggested pilot is the highest-workload active issue that meets the automation threshold. The results table compares the current scenario estimate with recorded weekly savings and excludes unmeasured issues.

## Demo walkthrough

1. Open **Analysis**. On a fresh browser, the shift handoff task ranks first at four hours of manual work per week and qualifies for a pilot.
2. Compare the two simulated outcomes. Daily test logs saved 120 minutes per week against 90 estimated. The onboarding checklist saved 12 minutes against 15 estimated.
3. Open the **Board**, choose **Import CSV**, and download the sample. Select that file to preview the rows and confirm the import. Select it a second time to see the duplicate checks.

The CSV preview checks required headers, blank fields, allowed teams and numeric ranges. It skips duplicates by team and title, ignoring case and extra spaces in titles. Valid rows are added only after confirmation. The updated CSV export includes all required import fields. Existing browser records stay in place, so use a private window if you want to see the fresh demo examples.

## Scoring and estimates

Priority = twice the impact + urgency + a frequency band. Impact and urgency range from 1 to 3. Frequency bands are 1 for 1–4 occurrences, 2 for 5–14 and 3 for 15 or more. High priority starts at 10; medium at 7.

Repeatable tasks with at least 60 minutes of weekly manual work are automation candidates. The overview's potential savings use a fixed 50% reduction for active candidates. Per-issue scenarios use the selected reduction, including for manual and process improvements. Payback is implementation minutes divided by expected weekly savings. A 0% reduction has no payback.

Measured savings equal original weekly workload minus the recorded weekly time after the change. The measured overview aggregates all records with an outcome, independently of stage. These figures are user-entered results, not automatically verified measurements.

## Implementation

Buildless HTML, CSS and vanilla JavaScript. `dist/logic.js` contains calculations, migration and CSV exports; `dist/app.js` manages the board, dialogs and browser storage. No AI service or external database is involved. The app was built with Codex.

## Tests

With Node.js installed, run `node --test tests/logic.test.js tests/import.test.js`. Tests cover scoring, migration, estimates, measured outcomes, CSV escaping and import validation.
