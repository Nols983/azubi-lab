# Codex Workflow

This repository provides reusable validation tooling for Codex and local
development work.

Repository code and migrations are authoritative. Do not recreate existing
validation workflows manually when the repository tooling already covers them.

## Standard workflow

### 1. Start / preflight

For a clean new batch, run:

`npm run codex:preflight -- --expected-head <12-char-sha>`

For intentional continuation of an already modified working tree, run:

`npm run codex:preflight -- --expected-head <12-char-sha> --allow-dirty`

Do not silently ignore an unexpected dirty working tree or HEAD mismatch.

### 2. During implementation

Use focused validation instead of repeatedly running the full project suite.

List available profiles:

`npm run verify:focused -- --list`

Run one or more profiles:

`npm run verify:focused -- profile rewards`

Add TypeScript validation at a meaningful checkpoint:

`npm run verify:focused -- --typecheck profile rewards`

Do not run full validation after every small edit.

### 3. Database changes

List available database suites:

`npm run verify:db -- --list`

Run only affected suites when appropriate:

`npm run verify:db -- xp labs`

Run all database integration suites when complete DB validation is required:

`npm run verify:db`

The DB verifier creates its own disposable PostgreSQL 17 instance.

It must not use production databases, production credentials, or an existing
DATABASE_URL.

### 4. Browser UAT

Use `http://localhost:3000`.

Do not use `http://127.0.0.1:3000` for browser UAT.

Perform browser UAT only for affected user workflows. Prefer one grouped UAT
pass after implementation instead of repeating complete browser UAT after every
small change.

### 5. Final validation

Before reporting a completed batch, run:

`npm run verify:full`

This is the canonical final validation command.

Then generate concise repository metadata:

`npm run codex:report -- --baseline <12-char-sha>`

## Stable repository rules

- Do not commit unless explicitly instructed.
- Do not push unless explicitly instructed.
- Do not deploy unless explicitly instructed.
- Do not access production unless explicitly instructed.
- Use focused tests during development and grouped validation at the end.
- PostgreSQL integration tests use PostgreSQL 17.
- Use disposable databases for local integration testing.
- Do not add `"type": "module"` merely to silence the known Node
  `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Do not weaken authentication, authorization, privacy, or persistence rules to
  make tests easier.
- Production deployment remains external to Codex/local development tooling.
- Scripts may use strict shell behavior internally.
- Do not enable `set -e` or `set -euo pipefail` directly in the user's
  long-lived interactive SSH/Termix shell.

## Result semantics

Repository workflow tools end with either:

`===Ergebnis=== PASS`

or:

`===Ergebnis=== FAIL`

A non-zero command exit is always a failure even if earlier phases passed.
