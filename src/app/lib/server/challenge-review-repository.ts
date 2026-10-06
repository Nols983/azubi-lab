import "server-only";

import type { ChallengeDifficulty, ChallengeReviewDecision, RubricScoreInput } from "../challenge-domain.ts";
import { wasSubmittedAfterDue } from "../challenge-domain.ts";
import { getDatabasePool, withTransaction } from "./db.ts";
import { listRubricCriteriaForChallenge } from "./challenge-repository.ts";
import { listAssignmentSubmissions } from "./challenge-submission-repository.ts";
import { XP_REWARDS } from "../xp-domain.ts";
import { awardCanonicalXpEventWithClient } from "./xp-repository.ts";
import type { PoolClient } from "pg";

export type PendingChallengeReview = {
  submissionId: string;
  assignmentId: string;
  submissionNumber: number;
  submittedAt: Date;
  submittedAfterDue: boolean;
  challenge: { id: string; title: string; difficulty: ChallengeDifficulty | null };
  learner: { id: string; displayName: string; login: string; disabled: boolean };
  dueAt: Date | null;
};

type ReviewDetailRow = {
  submission_id: string;
  assignment_id: string;
  submission_number: number;
  content: string;
  submitted_at: Date;
  challenge_id: string;
  challenge_title: string;
  challenge_short_description: string;
  challenge_instructions: string;
  challenge_difficulty: ChallengeDifficulty | null;
  challenge_status: "draft" | "published" | "archived";
  learner_id: string;
  learner_display_name: string;
  learner_login: string;
  learner_disabled: boolean;
  assigned_at: Date;
  due_at: Date | null;
  started_at: Date | null;
  legacy_completed_at: Date | null;
  review_id: string | null;
  review_decision: ChallengeReviewDecision | null;
  review_feedback: string | null;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  reviewer_display_name: string | null;
};

export class ReviewSubmissionNotFoundError extends Error {
  constructor() {
    super("The submission does not exist.");
    this.name = "ReviewSubmissionNotFoundError";
  }
}

export class SubmissionAlreadyReviewedError extends Error {
  constructor() {
    super("The submission already has an immutable review.");
    this.name = "SubmissionAlreadyReviewedError";
  }
}

export class RubricScoreValidationError extends Error {
  constructor() {
    super("The rubric scores do not match the current challenge rubric.");
    this.name = "RubricScoreValidationError";
  }
}

export function createChallengeReview(input: {
  submissionId: string;
  reviewedBy: string;
  decision: ChallengeReviewDecision;
  feedback: string;
  scores?: readonly RubricScoreInput[];
}) {
  return withTransaction(async (client) => {
    const result = await createChallengeReviewWithClient(client, input);
    return { id: result.id, reviewedAt: result.reviewedAt };
  });
}

export async function createChallengeReviewWithClient(
  client: PoolClient,
  input: {
    submissionId: string;
    reviewedBy: string;
    decision: ChallengeReviewDecision;
    feedback: string;
    scores?: readonly RubricScoreInput[];
  },
) {
  const submission = await client.query<{
    id: string;
    challenge_id: string;
    challenge_title: string;
    assignment_id: string;
    learner_id: string;
    learner_active: boolean;
  }>(
    `SELECT s.id, a.challenge_id, challenge.title AS challenge_title,
            a.id AS assignment_id, a.learner_id,
            learner.role = 'learner' AND learner.disabled_at IS NULL AS learner_active
     FROM challenge_submissions s
     JOIN challenge_assignments a ON a.id = s.assignment_id
     JOIN challenges challenge ON challenge.id = a.challenge_id
     JOIN users learner ON learner.id = a.learner_id
     WHERE s.id = $1
     FOR UPDATE OF s`,
    [input.submissionId],
  );
  if (!submission.rows[0]) throw new ReviewSubmissionNotFoundError();
  const existing = await client.query("SELECT id FROM challenge_reviews WHERE submission_id = $1", [input.submissionId]);
  if (existing.rowCount) throw new SubmissionAlreadyReviewedError();
  const criteria = await client.query<{
    id: string;
    position: number;
    title: string;
    description: string;
    max_points: number;
  }>(
    `SELECT id, position, title, description, max_points
     FROM challenge_rubric_criteria
     WHERE challenge_id = $1
     ORDER BY position ASC
     FOR SHARE`,
    [submission.rows[0].challenge_id],
  );
  const scores = input.scores ?? [];
  const scoresByCriterion = new Map(scores.map((score) => [score.criterionId, score.awardedPoints]));
  if (scoresByCriterion.size !== scores.length
    || scores.length !== criteria.rows.length
    || criteria.rows.some((criterion) => {
      const awarded = scoresByCriterion.get(criterion.id);
      return awarded === undefined || !Number.isSafeInteger(awarded) || awarded < 0 || awarded > criterion.max_points;
    })) {
    throw new RubricScoreValidationError();
  }
  try {
    const inserted = await client.query<{ id: string; reviewed_at: Date }>(
      `INSERT INTO challenge_reviews (submission_id, reviewed_by, decision, feedback)
       VALUES ($1, $2, $3, $4)
       RETURNING id, reviewed_at`,
      [input.submissionId, input.reviewedBy, input.decision, input.feedback],
    );
    for (const criterion of criteria.rows) {
      await client.query(
        `INSERT INTO challenge_review_criterion_results
           (review_id, criterion_id, position, criterion_title_snapshot,
            criterion_description_snapshot, max_points_snapshot, awarded_points)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          inserted.rows[0].id,
          criterion.id,
          criterion.position,
          criterion.title,
          criterion.description,
          criterion.max_points,
          scoresByCriterion.get(criterion.id),
        ],
      );
    }
    if (input.decision === "approved") {
      await awardCanonicalXpEventWithClient(client, {
        userId: submission.rows[0].learner_id,
        sourceType: "challenge",
        sourceKey: submission.rows[0].assignment_id,
        xpAmount: XP_REWARDS.challenge,
        awardedAt: inserted.rows[0].reviewed_at,
      });
    }
    return {
      id: inserted.rows[0].id,
      reviewedAt: inserted.rows[0].reviewed_at,
      assignmentId: submission.rows[0].assignment_id,
      learnerId: submission.rows[0].learner_id,
      learnerActive: submission.rows[0].learner_active,
      challengeTitle: submission.rows[0].challenge_title,
    };
  } catch (error) {
    if (postgresErrorCode(error) === "23505") throw new SubmissionAlreadyReviewedError();
    throw error;
  }
}

export async function listPendingChallengeReviews() {
  const result = await getDatabasePool().query<ReviewDetailRow>(
    `${reviewDetailSelect}
     WHERE r.id IS NULL
     ORDER BY s.submitted_at ASC, s.id ASC`,
  );
  return result.rows.map((row): PendingChallengeReview => ({
    submissionId: row.submission_id,
    assignmentId: row.assignment_id,
    submissionNumber: row.submission_number,
    submittedAt: row.submitted_at,
    submittedAfterDue: wasSubmittedAfterDue({ submittedAt: row.submitted_at, dueAt: row.due_at }),
    challenge: { id: row.challenge_id, title: row.challenge_title, difficulty: row.challenge_difficulty },
    learner: {
      id: row.learner_id,
      displayName: row.learner_display_name,
      login: row.learner_login,
      disabled: row.learner_disabled,
    },
    dueAt: row.due_at,
  }));
}

export async function countPendingChallengeReviews() {
  const result = await getDatabasePool().query<{ count: string }>(
    `SELECT count(*)
     FROM challenge_submissions s
     LEFT JOIN challenge_reviews r ON r.submission_id = s.id
     WHERE r.id IS NULL`,
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function findSubmissionReviewDetail(submissionId: string) {
  const result = await getDatabasePool().query<ReviewDetailRow>(`${reviewDetailSelect} WHERE s.id = $1 LIMIT 1`, [submissionId]);
  const row = result.rows[0];
  if (!row) return undefined;
  const [history, rubricCriteria] = await Promise.all([
    listAssignmentSubmissions(row.assignment_id),
    listRubricCriteriaForChallenge(row.challenge_id),
  ]);
  const hydratedSubmission = history.find((item) => item.id === row.submission_id);
  return {
    submission: {
      id: row.submission_id,
      submissionNumber: row.submission_number,
      content: row.content,
      submittedAt: row.submitted_at,
      submittedAfterDue: wasSubmittedAfterDue({ submittedAt: row.submitted_at, dueAt: row.due_at }),
      attachments: hydratedSubmission?.attachments ?? [],
      review: hydratedSubmission?.review ?? null,
    },
    assignment: {
      id: row.assignment_id,
      assignedAt: row.assigned_at,
      dueAt: row.due_at,
      startedAt: row.started_at,
      legacyCompletedAt: row.legacy_completed_at,
    },
    challenge: {
      id: row.challenge_id,
      title: row.challenge_title,
      shortDescription: row.challenge_short_description,
      instructions: row.challenge_instructions,
      difficulty: row.challenge_difficulty,
      definitionStatus: row.challenge_status,
      rubricCriteria,
    },
    learner: {
      id: row.learner_id,
      displayName: row.learner_display_name,
      login: row.learner_login,
      disabled: row.learner_disabled,
    },
    history,
  };
}

const reviewDetailSelect = `SELECT s.id AS submission_id, s.assignment_id, s.submission_number,
    s.content, s.submitted_at, a.assigned_at, a.due_at, a.started_at,
    a.completed_at AS legacy_completed_at, c.id AS challenge_id, c.title AS challenge_title,
    c.short_description AS challenge_short_description, c.instructions AS challenge_instructions,
    c.difficulty AS challenge_difficulty, c.status AS challenge_status,
    learner.id AS learner_id, learner.display_name AS learner_display_name,
    learner.login_identifier AS learner_login, learner.disabled_at IS NOT NULL AS learner_disabled,
    r.id AS review_id, r.decision AS review_decision, r.feedback AS review_feedback,
    r.reviewed_at, r.reviewed_by, reviewer.display_name AS reviewer_display_name
  FROM challenge_submissions s
  JOIN challenge_assignments a ON a.id = s.assignment_id
  JOIN challenges c ON c.id = a.challenge_id
  JOIN users learner ON learner.id = a.learner_id
  LEFT JOIN challenge_reviews r ON r.submission_id = s.id
  LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by`;

function postgresErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}
