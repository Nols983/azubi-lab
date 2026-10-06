# Codex Batch Template

Use this template for future feature batches.

Batch <N> — <Name>

Baseline:
<12-char SHA>

Read before implementation:

- AGENTS.md
- docs/CODEX_WORKFLOW.md
- docs/CODEX_CONTEXT.md

Run:

`npm run codex:preflight -- --expected-head <12-char SHA>`

Goal:

- <feature requirement>
- <feature requirement>
- <feature requirement>

Feature-specific constraints:

- <constraint>
- <constraint>

Reuse existing architecture.

Repository code and migrations are authoritative.

During implementation:

- use `npm run verify:focused -- <affected profiles>`
- use `npm run verify:db -- <affected suites>` only when database or persistence
  behavior is affected
- perform browser UAT only for affected workflows
- do not repeatedly run the full project suite after small edits

Before completion:

- run `npm run verify:full`
- run `npm run codex:report -- --baseline <12-char SHA>`

Do not commit.
Do not push.
Do not deploy.
Do not access production.

The final report should be concise and contain:

- implementation summary
- important architecture/security decisions
- migration decision
- tests and UAT performed
- remaining manual UAT, if any
- git status / diff summary

Finish with:

`===Ergebnis=== PASS`

or:

`===Ergebnis=== FAIL`

Do not repeat generic repository rules in every future batch specification.
Keep batch prompts focused on the actual feature requirements.
