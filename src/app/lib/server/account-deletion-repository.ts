import "server-only";

import type { PoolClient } from "pg";
import { isUuid } from "../account-security.ts";
import { accountDeletionIdentityReasons, isAccountDeletionConfirmation, type AccountDeletionReason } from "../account-deletion.ts";
import { lockActiveAdministrators } from "./admin-repository.ts";
import { erasePersonalAccountData } from "./account-erasure.ts";
import { getDatabasePool, withTransaction } from "./db.ts";

type Queryable = Pick<PoolClient, "query">;
// Every known inbound users FK has an explicit erasure or preservation policy.
const managedReferences = new Set([
  "lesson_progress.user_id", "quiz_progress.user_id", "local_progress_imports.user_id",
  "xp_events.user_id", "lesson_completion_history.user_id", "learner_lab_hint_history.user_id",
  "learner_lab_completion_history.user_id", "practice_quiz_attempts.user_id", "ihk_exam_attempts.user_id",
  "interactive_lab_attempts.user_id", "team_members.user_id", "profile_preferences.user_id",
  "notifications.user_id", "web_push_subscriptions.user_id", "challenges.created_by",
  "challenge_assignments.learner_id", "challenge_assignments.assigned_by", "challenge_reviews.reviewed_by",
  "challenge_assignment_comments.author_id", "curriculum_assignments.learner_id", "curriculum_assignments.assigned_by",
  "teams.created_by_user_id", "topic_proposals.created_by", "topic_proposals.reviewed_by",
  "avatar_moderation_events.moderator_user_id", "avatar_moderation_events.target_user_id",
  "password_reset_tokens.user_id", "password_reset_tokens.created_by_admin_id",
]);
const quoteIdentifier = (value: string) => `"${value.replace(/"/g, '""')}"`;

export async function protectedAccountReferenceReasons(userId: string, queryable: Queryable = getDatabasePool()) {
  const references = await queryable.query<{ schema_name: string; table_name: string; column_names: string[]; delete_rule: string }>(
    `SELECT namespace.nspname AS schema_name, relation.relname AS table_name,
       ARRAY(SELECT attribute.attname::text FROM unnest(constraint_record.conkey) WITH ORDINALITY AS key(attnum, position)
         JOIN pg_attribute attribute ON attribute.attrelid = constraint_record.conrelid AND attribute.attnum = key.attnum
         ORDER BY key.position) AS column_names,
       constraint_record.confdeltype AS delete_rule
     FROM pg_constraint constraint_record
     JOIN pg_class relation ON relation.oid = constraint_record.conrelid
     JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
     WHERE constraint_record.contype = 'f' AND constraint_record.confrelid = 'public.users'::regclass
     ORDER BY namespace.nspname, relation.relname, constraint_record.conname`,
  );
  const reasons = new Set<AccountDeletionReason>();
  for (const reference of references.rows) {
    if (reference.column_names.length !== 1) { reasons.add("other"); continue; }
    const column = reference.column_names[0];
    if (reference.schema_name === "public" && managedReferences.has(`${reference.table_name}.${column}`)) continue;
    // Identifiers come exclusively from the PostgreSQL catalog and are still quoted.
    const present = await queryable.query(
      `SELECT 1 FROM ${quoteIdentifier(reference.schema_name)}.${quoteIdentifier(reference.table_name)} WHERE ${quoteIdentifier(column)} = $1 LIMIT 1`, [userId],
    );
    if (present.rowCount) reasons.add("other");
  }
  return [...reasons];
}

export async function inspectAccountDeletion(actorId: string, targetId: string) {
  const target = (await getDatabasePool().query<{ role: string; disabled_at: Date | null }>("SELECT role, disabled_at FROM users WHERE id = $1", [targetId])).rows[0];
  if (!target) throw new AccountDeletionTargetError();
  const admins = Number((await getDatabasePool().query<{ count: string }>("SELECT count(*) FROM users WHERE role = 'admin' AND disabled_at IS NULL")).rows[0].count);
  const reasons = [...accountDeletionIdentityReasons({ actorId, targetId, targetRole: target.role, targetDisabled: Boolean(target.disabled_at), activeAdminCount: admins }), ...await protectedAccountReferenceReasons(targetId)];
  return { allowed: reasons.length === 0, reasons };
}

export async function deleteManagedAccount(input: { actorId: string; actorAuthVersion: number; targetUserId: string; confirmed: unknown; confirmationLogin: unknown }) {
  if (!isUuid(input.actorId) || !isUuid(input.targetUserId)) throw new AccountDeletionTargetError();
  try {
    return await withTransaction(async (client) => {
      // Same lock order as role/status administration serializes concurrent admin changes.
      const admins = await lockActiveAdministrators(client);
      const actor = admins.rows.find((row) => row.id === input.actorId);
      if (!actor || actor.must_change_password || actor.auth_version !== input.actorAuthVersion) throw new AccountDeletionTargetError();
      const target = (await client.query<{ id: string; login_identifier: string; role: string; disabled_at: Date | null }>(
        "SELECT id, login_identifier, role, disabled_at FROM users WHERE id = $1 FOR UPDATE", [input.targetUserId],
      )).rows[0];
      if (!target) throw new AccountDeletionTargetError();
      const identityReasons = accountDeletionIdentityReasons({ actorId: input.actorId, targetId: target.id, targetRole: target.role, targetDisabled: Boolean(target.disabled_at), activeAdminCount: admins.rows.length });
      if (identityReasons.length) throw new AccountDeletionBlockedError(identityReasons);
      if (!isAccountDeletionConfirmation(input.confirmed, input.confirmationLogin, target.login_identifier)) throw new AccountDeletionConfirmationError();
      // FOR UPDATE conflicts with FK insertion's key-share locks: a new reference
      // cannot slip between this check and DELETE. Unknown references fail closed.
      const reasons = await protectedAccountReferenceReasons(target.id, client);
      if (reasons.length) throw new AccountDeletionBlockedError(reasons);
      await erasePersonalAccountData(client, target.id, actor.id);
      await client.query("DELETE FROM users WHERE id = $1", [target.id]);
      return { deletedUserId: target.id };
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") throw new AccountDeletionBlockedError(["other"]);
    throw error;
  }
}

export async function countPendingAccountFileCleanups() {
  return Number((await getDatabasePool().query<{ count: string }>("SELECT count(*) FROM account_file_cleanup_jobs")).rows[0].count);
}
export class AccountDeletionTargetError extends Error {
  constructor() { super("Account deletion is unavailable."); this.name = "AccountDeletionTargetError"; }
}
export class AccountDeletionConfirmationError extends Error {
  constructor() { super("Account deletion confirmation does not match."); this.name = "AccountDeletionConfirmationError"; }
}
export class AccountDeletionBlockedError extends Error {
  readonly reasons: readonly AccountDeletionReason[];
  constructor(reasons: readonly AccountDeletionReason[]) { super("Protected account dependencies prevent deletion."); this.reasons = reasons; this.name = "AccountDeletionBlockedError"; }
}
