import "server-only";

import { learnerAccessPredicate } from "./learner-access-repository.ts";

// Notifications persisted before a revocation must obey the current scope too.
// SQL expressions are supplied only by repository code.
export function notificationVisibilityPredicate(userId: string, type: string, href: string, lockRelated = false) {
  return `(
    (${type} NOT IN ('trainer-curriculum-overdue', 'trainer-challenge-overdue', 'challenge-review-pending', 'activity-digest'))
    OR (${type} = 'activity-digest' AND EXISTS (
      SELECT 1 FROM users digest_actor WHERE digest_actor.id = ${userId}
      AND digest_actor.role = 'admin' AND digest_actor.disabled_at IS NULL AND digest_actor.must_change_password = false))
    OR (${type} IN ('trainer-curriculum-overdue', 'trainer-challenge-overdue') AND EXISTS (
      SELECT 1 FROM users notification_learner
      WHERE ${href} = '/admin/lernende/' || notification_learner.id::text
        AND ${learnerAccessPredicate(userId, "notification_learner.id")}
        ${lockRelated ? "FOR KEY SHARE OF notification_learner" : ""}))
    OR (${type} = 'challenge-review-pending' AND EXISTS (
      SELECT 1 FROM challenge_submissions notification_submission
      JOIN challenge_assignments notification_assignment ON notification_assignment.id = notification_submission.assignment_id
      WHERE ${href} = '/admin/challenges/abgaben/' || notification_submission.id::text
        AND ${learnerAccessPredicate(userId, "notification_assignment.learner_id")}
        ${lockRelated ? "FOR KEY SHARE OF notification_assignment" : ""}))
  )`;
}
