import "server-only";
import type { PoolClient } from "pg";

/** Called only inside the authorized deletion transaction, after locking the user. */
export async function erasePersonalAccountData(client: PoolClient, userId: string, successorId: string) {
  // Lock parents before reading file keys: existing assignments can still receive
  // submissions, reviews and evidence without taking a new users FK lock.
  await client.query("SELECT id FROM challenge_assignments WHERE learner_id = $1 ORDER BY id FOR UPDATE", [userId]);
  await client.query(`SELECT submission.id FROM challenge_submissions submission
    JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id
    WHERE assignment.learner_id = $1 ORDER BY submission.id FOR UPDATE OF submission`, [userId]);
  await client.query(`SELECT review.id FROM challenge_reviews review
    JOIN challenge_submissions submission ON submission.id = review.submission_id
    JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id
    WHERE assignment.learner_id = $1 ORDER BY review.id FOR UPDATE OF review`, [userId]);

  // The durable job and deletion commit together. No filesystem operation here.
  await client.query(`INSERT INTO account_file_cleanup_jobs (user_id, evidence_storage_keys)
    SELECT $1, COALESCE(array_agg(attachment.storage_key::uuid), '{}'::uuid[])
    FROM challenge_submission_attachments attachment
    JOIN challenge_submissions submission ON submission.id = attachment.submission_id
    JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id
    WHERE assignment.learner_id = $1`, [userId]);

  // Remove notifications containing this learner's name/URLs even in trainer inboxes.
  await client.query(`DELETE FROM notifications WHERE href = '/admin/lernende/' || $1::uuid::text
    OR href IN (SELECT '/admin/challenges/abgaben/' || submission.id::text FROM challenge_submissions submission
      JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id WHERE assignment.learner_id = $1)`, [userId]);
  await client.query(`DELETE FROM challenge_review_criterion_results WHERE review_id IN (
    SELECT review.id FROM challenge_reviews review JOIN challenge_submissions submission ON submission.id = review.submission_id
    JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id WHERE assignment.learner_id = $1)`, [userId]);
  await client.query(`DELETE FROM challenge_reviews WHERE submission_id IN (
    SELECT submission.id FROM challenge_submissions submission JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id
    WHERE assignment.learner_id = $1)`, [userId]);
  await client.query(`DELETE FROM challenge_submission_attachments WHERE submission_id IN (
    SELECT submission.id FROM challenge_submissions submission JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id
    WHERE assignment.learner_id = $1)`, [userId]);
  await client.query("DELETE FROM challenge_submissions WHERE assignment_id IN (SELECT id FROM challenge_assignments WHERE learner_id = $1)", [userId]);
  await client.query("DELETE FROM challenge_assignment_comments WHERE author_id = $1 OR assignment_id IN (SELECT id FROM challenge_assignments WHERE learner_id = $1)", [userId]);
  await client.query("DELETE FROM challenge_assignments WHERE learner_id = $1", [userId]);
  await client.query("DELETE FROM curriculum_assignments WHERE learner_id = $1", [userId]);
  await client.query("DELETE FROM topic_proposals WHERE created_by = $1", [userId]);
  await client.query("UPDATE topic_proposals SET reviewed_by = NULL, admin_feedback = NULL WHERE reviewed_by = $1", [userId]);

  // Keep other learners' grades and rubric scores; erase the reviewer's free text
  // and attribution. No replacement user is credited with another person's review.
  await client.query(`UPDATE challenge_reviews SET reviewed_by = NULL,
    feedback = 'Rückmeldung wegen Kontolöschung entfernt.' WHERE reviewed_by = $1`, [userId]);
  // Responsibility transfer is metadata only: it grants no roles or memberships.
  await client.query("UPDATE teams SET created_by_user_id = $2 WHERE created_by_user_id = $1", [userId, successorId]);
  await client.query("UPDATE challenges SET created_by = $2 WHERE created_by = $1", [userId, successorId]);
  await client.query("UPDATE challenge_assignments SET assigned_by = $2 WHERE assigned_by = $1", [userId, successorId]);
  await client.query("UPDATE curriculum_assignments SET assigned_by = $2, note = NULL WHERE assigned_by = $1", [userId, successorId]);
  // Revoke recovery credentials issued by this administrator as well as their own.
  await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1 OR created_by_admin_id = $1", [userId]);
  // Existing users CASCADE rules erase progress, XP, attempts (including children),
  // rewards, preferences, memberships and own notifications/push subscriptions.
  // Moderation events retain immutable metadata; their FK removes the identifiers.
}
