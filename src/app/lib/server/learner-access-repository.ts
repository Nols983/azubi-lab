import "server-only";

import type { PoolClient } from "pg";
import { isUuid } from "../account-security.ts";
import { getDatabasePool } from "./db.ts";

type Queryable = Pick<PoolClient, "query">;

// Arguments are trusted SQL expressions from repository code, never user input.
// Read current database roles/memberships on every call; do not cache this scope.
export function managedTeamPredicate(actor: string, team: string) {
  return `EXISTS (
    SELECT 1 FROM users scope_actor
    JOIN team_members scope_manager ON scope_manager.user_id = scope_actor.id
    JOIN teams scope_team ON scope_team.id = scope_manager.team_id
    WHERE scope_actor.id = ${actor} AND scope_actor.role = 'instructor'
      AND scope_actor.disabled_at IS NULL AND scope_actor.must_change_password = false
      AND scope_manager.team_role = 'manager' AND scope_team.active = true
      AND scope_team.id = ${team}
  )`;
}

export function learnerAccessPredicate(actor: string, learner: string) {
  return `EXISTS (
    SELECT 1 FROM users scope_user
    WHERE scope_user.id = ${actor} AND scope_user.disabled_at IS NULL
      AND scope_user.must_change_password = false
      AND (scope_user.role = 'admin' OR (
        EXISTS (SELECT 1 FROM team_members scope_member
          JOIN users scope_learner ON scope_learner.id = scope_member.user_id AND scope_learner.role = 'learner'
          WHERE scope_member.user_id = ${learner}
            AND ${managedTeamPredicate(actor, "scope_member.team_id")})
      ))
  )`;
}

export async function listAccessibleLearnerIds(actorId: string, queryable: Queryable = getDatabasePool()) {
  if (!isUuid(actorId)) return [];
  const result = await queryable.query<{ id: string }>(
    `SELECT learner.id FROM users learner WHERE learner.role = 'learner'
       AND ${learnerAccessPredicate("$1", "learner.id")}`,
    [actorId],
  );
  return result.rows.map((row) => row.id);
}

export async function canAccessLearner(actorId: string, learnerId: string, queryable: Queryable = getDatabasePool()) {
  if (!isUuid(actorId) || !isUuid(learnerId)) return false;
  const result = await queryable.query(
    `SELECT id FROM users WHERE id = $2 AND role = 'learner' AND ${learnerAccessPredicate("$1", "$2")}`,
    [actorId, learnerId],
  );
  return Boolean(result.rowCount);
}

export async function assertLearnerAccess(actorId: string, learnerIds: readonly string[], queryable: Queryable = getDatabasePool()) {
  if (!isUuid(actorId) || learnerIds.length === 0 || learnerIds.some((id) => !isUuid(id))) throw new LearnerScopeError();
  // Share locks serialize writes with role, membership and active-team revocation.
  const actor = await queryable.query<{ role: string }>(
    "SELECT role FROM users WHERE id = $1 AND disabled_at IS NULL AND must_change_password = false FOR SHARE", [actorId],
  );
  if (actor.rows[0]?.role !== "admin") {
    if (actor.rows[0]?.role !== "instructor") throw new LearnerScopeError();
    await queryable.query(
      `SELECT team.id FROM teams team
       JOIN team_members manager ON manager.team_id = team.id AND manager.user_id = $1 AND manager.team_role = 'manager'
       JOIN team_members member ON member.team_id = team.id AND member.user_id = ANY($2::uuid[])
       WHERE team.active = true ORDER BY team.id FOR SHARE OF team, manager, member`,
      [actorId, learnerIds],
    );
  }
  const targets = await queryable.query<{ id: string }>(
    "SELECT id FROM users WHERE id = ANY($1::uuid[]) AND role = 'learner' ORDER BY id FOR SHARE",
    [learnerIds],
  );
  if (targets.rowCount !== new Set(learnerIds).size) throw new LearnerScopeError();
  const permitted = await queryable.query<{ id: string }>(
    `SELECT learner.id FROM users learner WHERE learner.id = ANY($2::uuid[])
       AND ${learnerAccessPredicate("$1", "learner.id")}`,
    [actorId, learnerIds],
  );
  const accessible = new Set(permitted.rows.map((row) => row.id));
  if (learnerIds.some((id) => !accessible.has(id))) throw new LearnerScopeError();
}

const resourceLearnerQueries = {
  submission: "SELECT assignment.learner_id FROM challenge_submissions submission JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id WHERE submission.id = $1",
  challenge: "SELECT learner_id FROM challenge_assignments WHERE id = $1",
  curriculum: "SELECT learner_id FROM curriculum_assignments WHERE id = $1",
} as const;

export async function assertLearnerResourceAccess(actorId: string, kind: keyof typeof resourceLearnerQueries, id: string, queryable: Queryable = getDatabasePool()) {
  if (!isUuid(id)) throw new LearnerScopeError();
  const result = await queryable.query<{ learner_id: string }>(resourceLearnerQueries[kind], [id]);
  if (!result.rows[0]) throw new LearnerScopeError();
  await assertLearnerAccess(actorId, [result.rows[0].learner_id], queryable);
}

export class LearnerScopeError extends Error {
  constructor() {
    super("The learner or resource is unavailable to the current account.");
    this.name = "LearnerScopeError";
  }
}
