import "server-only";

import type { ChallengeReviewDecision } from "../challenge-domain.ts";
import type { AccountRole } from "../auth-types.ts";
import type { ActivityDigestCounts } from "../notification-domain.ts";
import { getDatabasePool } from "./db.ts";

export type NotificationRecipient = {
  id: string;
  role: AccountRole;
};

export type SubmissionNotificationEvent = {
  submissionId: string;
  assignmentId: string;
  challengeTitle: string;
  learnerId: string;
  learnerDisplayName: string;
  submittedAt: Date;
  reviewed: boolean;
};

export type ReviewNotificationEvent = {
  reviewId: string;
  assignmentId: string;
  challengeTitle: string;
  learnerId: string;
  decision: ChallengeReviewDecision;
  reviewedAt: Date;
};

type RecipientRow = { id: string; role: AccountRole };
type SubmissionEventRow = {
  submission_id: string;
  assignment_id: string;
  challenge_title: string;
  learner_id: string;
  learner_display_name: string;
  submitted_at: Date;
  reviewed: boolean;
};
type ReviewEventRow = {
  review_id: string;
  assignment_id: string;
  challenge_title: string;
  learner_id: string;
  decision: ChallengeReviewDecision;
  reviewed_at: Date;
};

export async function listActiveNotificationRecipients() {
  const result = await getDatabasePool().query<RecipientRow>(
    `SELECT id, role
     FROM users
     WHERE disabled_at IS NULL
     ORDER BY id`,
  );
  return result.rows;
}

export async function listSubmissionNotificationEvents() {
  const result = await getDatabasePool().query<SubmissionEventRow>(submissionEventSelect);
  return result.rows.map(mapSubmissionEvent);
}

export async function findSubmissionNotificationEvent(submissionId: string) {
  const result = await getDatabasePool().query<SubmissionEventRow>(
    `${submissionEventSelect} WHERE submission.id = $1 LIMIT 1`,
    [submissionId],
  );
  return result.rows[0] ? mapSubmissionEvent(result.rows[0]) : undefined;
}

export async function listReviewNotificationEvents() {
  const result = await getDatabasePool().query<ReviewEventRow>(reviewEventSelect);
  return result.rows.map(mapReviewEvent);
}

export async function findReviewNotificationEvent(reviewId: string) {
  const result = await getDatabasePool().query<ReviewEventRow>(
    `${reviewEventSelect} WHERE review.id = $1 LIMIT 1`,
    [reviewId],
  );
  return result.rows[0] ? mapReviewEvent(result.rows[0]) : undefined;
}

export async function readActivityDigestCounts(start: Date, end: Date): Promise<Omit<ActivityDigestCounts, "completedModules">> {
  const result = await getDatabasePool().query<{
    completed_lessons: string;
    quiz_submissions: string;
    challenge_submissions: string;
    approved_challenges: string;
    requested_revisions: string;
  }>(
    `SELECT
       (SELECT count(*) FROM lesson_progress progress
        JOIN users learner ON learner.id = progress.user_id
        WHERE learner.role = 'learner' AND learner.disabled_at IS NULL
          AND progress.completed_at >= $1 AND progress.completed_at < $2) AS completed_lessons,
       (SELECT count(*) FROM quiz_progress progress
        JOIN users learner ON learner.id = progress.user_id
        WHERE learner.role = 'learner' AND learner.disabled_at IS NULL
          AND progress.last_submitted_at >= $1 AND progress.last_submitted_at < $2) AS quiz_submissions,
       (SELECT count(*) FROM challenge_submissions submission
        JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id
        JOIN users learner ON learner.id = assignment.learner_id
        WHERE learner.disabled_at IS NULL
          AND submission.submitted_at >= $1 AND submission.submitted_at < $2) AS challenge_submissions,
       (SELECT count(*) FROM challenge_reviews review
        JOIN challenge_submissions submission ON submission.id = review.submission_id
        JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id
        JOIN users learner ON learner.id = assignment.learner_id
        WHERE learner.disabled_at IS NULL AND review.decision = 'approved'
          AND review.reviewed_at >= $1 AND review.reviewed_at < $2) AS approved_challenges,
       (SELECT count(*) FROM challenge_reviews review
        JOIN challenge_submissions submission ON submission.id = review.submission_id
        JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id
        JOIN users learner ON learner.id = assignment.learner_id
        WHERE learner.disabled_at IS NULL AND review.decision = 'revision-requested'
          AND review.reviewed_at >= $1 AND review.reviewed_at < $2) AS requested_revisions`,
    [start, end],
  );
  const row = result.rows[0];
  return {
    completedLessons: Number(row.completed_lessons),
    quizSubmissions: Number(row.quiz_submissions),
    challengeSubmissions: Number(row.challenge_submissions),
    approvedChallenges: Number(row.approved_challenges),
    requestedRevisions: Number(row.requested_revisions),
  };
}

const submissionEventSelect = `SELECT submission.id AS submission_id,
    assignment.id AS assignment_id, challenge.title AS challenge_title,
    learner.id AS learner_id, learner.display_name AS learner_display_name,
    submission.submitted_at, review.id IS NOT NULL AS reviewed
  FROM challenge_submissions submission
  JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id
  JOIN challenges challenge ON challenge.id = assignment.challenge_id
  JOIN users learner ON learner.id = assignment.learner_id
  LEFT JOIN challenge_reviews review ON review.submission_id = submission.id`;

const reviewEventSelect = `SELECT review.id AS review_id,
    assignment.id AS assignment_id, challenge.title AS challenge_title,
    learner.id AS learner_id, review.decision, review.reviewed_at
  FROM challenge_reviews review
  JOIN challenge_submissions submission ON submission.id = review.submission_id
  JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id
  JOIN challenges challenge ON challenge.id = assignment.challenge_id
  JOIN users learner ON learner.id = assignment.learner_id`;

function mapSubmissionEvent(row: SubmissionEventRow): SubmissionNotificationEvent {
  return {
    submissionId: row.submission_id,
    assignmentId: row.assignment_id,
    challengeTitle: row.challenge_title,
    learnerId: row.learner_id,
    learnerDisplayName: row.learner_display_name,
    submittedAt: row.submitted_at,
    reviewed: row.reviewed,
  };
}

function mapReviewEvent(row: ReviewEventRow): ReviewNotificationEvent {
  return {
    reviewId: row.review_id,
    assignmentId: row.assignment_id,
    challengeTitle: row.challenge_title,
    learnerId: row.learner_id,
    decision: row.decision,
    reviewedAt: row.reviewed_at,
  };
}
