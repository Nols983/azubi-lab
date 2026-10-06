# Codex Repository Context

> Repository code and migrations are authoritative. This document is an
> orientation aid and must be updated when architecture changes.

## Application

Azubi Lab is a German learning platform for Fachinformatiker
Systemintegration training.

Core technologies:

- Next.js and TypeScript
- React
- PostgreSQL
- Auth.js
- Docker Swarm production deployment
- Traefik production ingress

## Authorization

Authorization is capability-based.

Current account roles include:

- learner
- observer
- instructor
- admin

Security-sensitive behavior must be enforced server-side through the existing
authorization/capability architecture.

UI visibility alone is never sufficient authorization.

Do not introduce parallel ad-hoc role checks when an existing capability can be
reused or extended.

## Learner progression

Learner progression is based on canonical persisted evidence.

Important concepts include:

- lesson and module progression
- module quizzes
- challenges
- practice quizzes
- interactive Labs
- immutable XP events
- derived learner levels
- derived titles and badges

Do not create a second XP, level, title, badge, or progression system.

Profile and UI presentation must not fabricate progression evidence.

## Interactive Labs

Labs use canonical definitions and state.

Relevant concepts include:

- devices
- topology
- faults
- commands
- configuration/state transitions
- verification
- hints
- first-completion history
- Lab XP

Lab mechanics have dedicated regression coverage.

Unrelated feature work should not casually modify Lab topology, faults,
commands, verification, hint behavior, or XP rules.

## Profiles, social showcase, and avatars

The private `/profil` area remains visible only to its owner. Authenticated
social showcase profiles expose a deliberately small projection: display name,
current avatar, cosmetic title, learner level/XP, and unlocked or pinned
badges. Ordinary cross-account access requires a shared active team; team
administrators use the `manageTeams` capability. Login identifiers, detailed
learning progress, attempts, and locked reward progress remain private.

Profile images use private server-side storage rather than public static files.

Badge preferences use the single canonical `profile_preferences.pinned_badge_ids`
collection with a maximum of three entries. Learners may pin only earned badges;
instructors and administrators have capability-backed cosmetic access to the
catalog without receiving learner XP, progress, unlock history, or fabricated
unlock dates. Observers have no such entitlement. Protected social profiles
show a learner's unlocked collection but never locked progress or raw history.

Badge visual classes (`tiered`, `unique`, `prestige`) and the tier-family levels
(`bronze`, `silver`, `gold`) are catalog presentation metadata only. They do
not affect XP, levels, leaderboard ordering, or permissions.

Avatar access and mutation must preserve:

- authentication
- authorization
- UUID-based trusted path derivation
- filesystem safety
- private caching semantics

Do not create anonymous user/profile/avatar lookup surfaces.

## Teams

Teams are administrator-managed social/access groups. Account roles and the
`member`/`manager` team roles are intentionally separate; a team manager gains
no application capability. Users may belong to multiple teams. Archived teams
preserve memberships but do not grant ordinary team or social-profile access.

The team leaderboard is scoped to one active team and ranks only active learner
accounts by canonical immutable XP, with the canonical derived level. It does
not persist a second score or progression system.

## Database and migrations

SQL migrations live under:

`db/migrations/`

Applied migrations are checksum-tracked.

Do not edit an already-applied migration to change existing production schema
behavior.

Create the next migration only when a genuine schema or persistence change
requires one.

Local database verification uses disposable PostgreSQL 17 through the
repository workflow tooling.

## Validation

Use repository tooling instead of rebuilding common validation workflows.

Primary commands:

- `npm run codex:preflight`
- `npm run verify:focused -- <profiles>`
- `npm run verify:db -- <suites>`
- `npm run verify:full`
- `npm run codex:report`

Operational details are documented in:

`docs/CODEX_WORKFLOW.md`

## Local browser UAT

Use:

`http://localhost:3000`

Do not substitute `127.0.0.1` for browser UAT.

## Production boundary

Normal local Codex work must not:

- access production
- commit
- push
- deploy

unless explicitly instructed.

Production deployment is a separate controlled workflow.

Codex should leave the working tree ready for human review.
