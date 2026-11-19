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
no application capability by membership alone. A current `instructor` account with
`manager` membership in an active team may manage the learners of that team. Users may belong to multiple teams. Archived teams
preserve memberships but do not grant ordinary team or social-profile access.

`learner-access-repository.ts` is the canonical server-side scope for learner
management. It reads current database roles and active manager memberships without
persistent caching, deduplicates learners across teams and retains global admin access.
Reporting, learner details, assignments, reviews, comments, evidence downloads and
trainer notifications use this scope. Mutation transactions use share locks to
serialize authorization with membership/team revocation. Role capabilities still gate
entry to the relevant feature; team membership never grants an application role.
Instructor-facing labels use “Teamleiter”. Account creation supports all four roles
and multiple initial memberships in one transaction. `/admin/konten` is an admin-only
compact directory with URL-based search, team/role/status filters, stable sorting and
SQL pagination (repeatable-read count/page snapshot). Membership filters use EXISTS,
so multi-team accounts appear once. “Without team” includes no archived memberships
either. Existing avatar filtering is optional and uses the private avatar projection;
regular directory reads do not scan avatar files. `/admin/konten/[userId]` contains
role/status/password, team membership and avatar controls using the existing actions.

Account deletion uses `manageUsers` plus current transaction-level actor role,
auth-version and password-state checks. Exact login confirmation, a separate checkbox,
self-deletion protection and last-active-admin protection are mandatory. Personal
progress, immutable XP/reward histories, quiz/exam/Lab attempts and their children
are erased by existing owner CASCADE rules. Personal curriculum/challenge assignments,
submissions, evidence metadata, reviews and rubric results are explicitly deleted in
FK order. Own comments and topic proposals are removed; issued recovery tokens are
revoked. Trainer notifications about erased personal resources are removed too.

Teams and challenge definitions are retained; creator/assigner responsibility for
shared content and other learners' assignments transfers to the deleting admin,
without granting any role or membership. Other learners' assessment outcomes and
rubric scores are retained; deleted reviewers become NULL with “Gelöschtes Konto”
presentation and redacted feedback. Reviewer erasure must not turn an approved
assignment into a pending submission. Other users' learning data is preserved.

The PostgreSQL users FK catalog is checked against an explicit policy; unknown
references fail closed. Deletion locks active admins in the same order as role/status
changes, then the target and owned assignment/submission/review parents. FK insertion
locks serialize new descendants. Evidence uploads lock/revalidate the current account
and persist metadata in the same transaction before releasing that lock. Notification
insertion locks the related learner/assignment to prevent stale personal messages
being inserted after deletion.

`0023_account_file_cleanup_jobs.sql` remains the durable post-commit cleanup queue;
`0024_complete_account_erasure.sql` adds evidence UUID keys. Only after commit are
avatar and evidence files removed through existing storage adapters. Missing files
are idempotent, errors remain retryable, and a still-referenced evidence key is never
deleted. Profile mutations retain the existing account/auth-version lock.

Migration `0024` also makes reviewer attribution nullable and removes deleted user
IDs from retained moderation events via two specific SET NULL FKs. Their trigger
continues to forbid manual UPDATE/DELETE, reassignment, and anonymous new events;
only nested FK anonymization after actual users deletion may change participant IDs.
No applied migration is edited. See `docs/ACCOUNT_DELETION_POLICY.md` for the full
0001–0024 dependency matrix and retention boundaries.

The global activity digest is admin-only. Trainer event notifications are scoped at
insertion, read/unread counting and before push dispatch, so persisted notifications
do not keep exposing former team data after revocation.

`/admin/themenvorschlaege` stores topic proposals in the additive `0022` migration.
Team leaders submit only for managed active teams and see their own proposals even
after revocation. Admins review all proposals and update status/optional feedback;
there is no learning-module publication side effect. `submitTopicProposals` and
`reviewTopicProposals` are canonical capabilities; repository queries also enforce
current actor/team permissions.

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
- `npm run verify:db -- team-access` for team scope, provisioning and proposals
- `npm run verify:db -- account-directory` for directory/deletion/cleanup/concurrency integration
- `npm run verify:db -- team-actions` for optional isolated HTTP UAT, including account management (free localhost:3000)
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
