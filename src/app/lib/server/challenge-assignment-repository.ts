import "server-only";

import {
  deriveAssignmentStatus,
  isAssignmentOverdue,
  wasSubmittedAfterDue,
  type AssignmentStatus,
  type ChallengeDifficulty,
  type ChallengeReviewDecision,
  type ChallengeStatus,
} from "../challenge-domain.ts";
import { getDatabasePool, withTransaction } from "./db.ts";
import type { PoolClient } from "pg";

export type LearnerOption = {
  id: string;
  displayName: string;
  login: string;
};

export type AssignmentReviewSummary = {
  id: string;
  decision: ChallengeReviewDecision;
  feedback: string;
  reviewedAt: Date;
  reviewedBy: { id: string; displayName: string };
};

export type AssignmentSubmissionSummary = {
  id: string;
  submissionNumber: number;
  submittedAt: Date;
  submittedAfterDue: boolean;
  review: AssignmentReviewSummary | null;
};

export type ChallengeAssignment = {
  id: string;
  challenge: {
    id: string;
    title: string;
    shortDescription: string;
    instructions: string;
    difficulty: ChallengeDifficulty | null;
    estimatedMinutes: number | null;
    definitionStatus: ChallengeStatus;
  };
  learner: { id: string; displayName: string; login: string; disabled: boolean };
  assignedBy: { id: string; displayName: string };
  assignedAt: Date;
  dueAt: Date | null;
  startedAt: Date | null;
  legacyCompletedAt: Date | null;
  approvedAt: Date | null;
  status: AssignmentStatus;
  isOverdue: boolean;
  latestSubmission: AssignmentSubmissionSummary | null;
};

type AssignmentRow = {
  id: string;
  challenge_id: string;
  challenge_title: string;
  challenge_short_description: string;
  challenge_instructions: string;
  challenge_difficulty: ChallengeDifficulty | null;
  challenge_estimated_minutes: number | null;
  challenge_status: ChallengeStatus;
  learner_id: string;
  learner_display_name: string;
  learner_login: string;
  learner_disabled: boolean;
  assigned_by: string;
  assigner_display_name: string;
  assigned_at: Date;
  due_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  latest_submission_id: string | null;
  latest_submission_number: number | null;
  latest_submitted_at: Date | null;
  latest_review_id: string | null;
  latest_review_decision: ChallengeReviewDecision | null;
  latest_review_feedback: string | null;
  latest_reviewed_at: Date | null;
  latest_reviewer_id: string | null;
  latest_reviewer_display_name: string | null;
};

export type CreatedChallengeAssignment = {
  id: string;
  learnerId: string;
  challengeTitle: string;
  assignedAt: Date;
};

export class ChallengeNotAssignableError extends Error {
  constructor() {
    super("The challenge is not published and cannot receive assignments.");
    this.name = "ChallengeNotAssignableError";
  }
}

export class AssignmentLearnerInvalidError extends Error {
  constructor() {
    super("At least one learner is missing, disabled or not a learner account.");
    this.name = "AssignmentLearnerInvalidError";
  }
}

export class DuplicateChallengeAssignmentError extends Error {
  constructor() {
    super("The challenge is already assigned to at least one selected learner.");
    this.name = "DuplicateChallengeAssignmentError";
  }
}

export class ChallengeAssignmentNotFoundError extends Error {
  constructor() {
    super("The learner assignment does not exist.");
    this.name = "ChallengeAssignmentNotFoundError";
  }
}

export async function listActiveLearnerOptions() {
  const result = await getDatabasePool().query<{ id: string; display_name: string; login_identifier: string }>(
    `SELECT id, display_name, login_identifier
     FROM users
     WHERE role = 'learner' AND disabled_at IS NULL
     ORDER BY display_name ASC, login_identifier ASC`,
  );
  return result.rows.map((row): LearnerOption => ({
    id: row.id,
    displayName: row.display_name,
    login: row.login_identifier,
  }));
}

export function assignChallengeToLearners(input: {
  challengeId: string;
  learnerIds: readonly string[];
  assignedBy: string;
  dueAt: Date | null;
}) {
  return withTransaction(async (client) => (
    await assignChallengeToLearnersWithClient(client, input)
  ).map((assignment) => assignment.id));
}

export async function assignChallengeToLearnersWithClient(
  client: PoolClient,
  input: {
    challengeId: string;
    learnerIds: readonly string[];
    assignedBy: string;
    dueAt: Date | null;
  },
) {
  const challengeResult = await client.query<{ status: ChallengeStatus; title: string }>(
    "SELECT status, title FROM challenges WHERE id = $1 FOR SHARE",
    [input.challengeId],
  );
  if (challengeResult.rows[0]?.status !== "published") throw new ChallengeNotAssignableError();

  const learnerResult = await client.query<{ id: string }>(
    `SELECT id
     FROM users
     WHERE id = ANY($1::uuid[]) AND role = 'learner' AND disabled_at IS NULL
     FOR SHARE`,
    [input.learnerIds],
  );
  if (learnerResult.rowCount !== input.learnerIds.length) throw new AssignmentLearnerInvalidError();

  try {
    const result = await client.query<{ id: string; learner_id: string; assigned_at: Date }>(
      `INSERT INTO challenge_assignments (challenge_id, learner_id, assigned_by, due_at)
       SELECT $1, learner_id, $3, $4
       FROM unnest($2::uuid[]) AS selected(learner_id)
       RETURNING id, learner_id, assigned_at`,
      [input.challengeId, input.learnerIds, input.assignedBy, input.dueAt],
    );
    return result.rows.map((row): CreatedChallengeAssignment => ({
      id: row.id,
      learnerId: row.learner_id,
      challengeTitle: challengeResult.rows[0].title,
      assignedAt: row.assigned_at,
    }));
  } catch (error) {
    if (postgresErrorCode(error) === "23505") throw new DuplicateChallengeAssignmentError();
    throw error;
  }
}

export async function listAssignmentsForChallenge(challengeId: string, now = new Date()) {
  const result = await getDatabasePool().query<AssignmentRow>(`${assignmentSelect} WHERE a.challenge_id = $1 ORDER BY a.assigned_at DESC`, [challengeId]);
  return result.rows.map((row) => mapAssignment(row, now));
}

export async function listAssignmentsForAdminLearner(learnerId: string, now = new Date()) {
  const result = await getDatabasePool().query<AssignmentRow>(`${assignmentSelect} WHERE a.learner_id = $1 ORDER BY a.assigned_at DESC`, [learnerId]);
  return result.rows.map((row) => mapAssignment(row, now));
}

export async function listAllAssignmentsForAdmin(now = new Date()) {
  const result = await getDatabasePool().query<AssignmentRow>(`${assignmentSelect} ORDER BY a.assigned_at DESC`);
  return result.rows.map((row) => mapAssignment(row, now));
}

export async function listLearnerAssignments(learnerId: string, now = new Date()) {
  return listAssignmentsForAdminLearner(learnerId, now);
}

export async function findLearnerAssignmentById(assignmentId: string, learnerId: string, now = new Date()) {
  const result = await getDatabasePool().query<AssignmentRow>(
    `${assignmentSelect} WHERE a.id = $1 AND a.learner_id = $2 LIMIT 1`,
    [assignmentId, learnerId],
  );
  return result.rows[0] ? mapAssignment(result.rows[0], now) : undefined;
}

export async function readLearnerChallengeSummary(learnerId: string, now = new Date()) {
  const assignments = await listLearnerAssignments(learnerId, now);
  const unfinished = assignments.filter((assignment) => assignment.status !== "approved" && assignment.status !== "legacy-completed");
  unfinished.sort((left, right) => {
    const priorityDifference = dashboardPriority(left, now) - dashboardPriority(right, now);
    if (priorityDifference) return priorityDifference;
    const leftDue = left.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const rightDue = right.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
    return leftDue - rightDue || left.assignedAt.getTime() - right.assignedAt.getTime();
  });
  return { count: unfinished.length, next: unfinished[0] };
}

export function startLearnerAssignment(assignmentId: string, learnerId: string) {
  return mutateOwnedAssignment(
    `UPDATE challenge_assignments
     SET started_at = COALESCE(started_at, now())
     WHERE id = $1 AND learner_id = $2 AND completed_at IS NULL
     RETURNING id`,
    assignmentId,
    learnerId,
  );
}

export function summarizeAssignmentStatuses(assignments: readonly ChallengeAssignment[]) {
  return {
    notStarted: assignments.filter((assignment) => assignment.status === "not-started").length,
    inProgress: assignments.filter((assignment) => assignment.status === "in-progress").length,
    submitted: assignments.filter((assignment) => assignment.status === "submitted").length,
    revisionRequested: assignments.filter((assignment) => assignment.status === "revision-requested").length,
    approved: assignments.filter((assignment) => assignment.status === "approved" || assignment.status === "legacy-completed").length,
    legacyCompleted: assignments.filter((assignment) => assignment.status === "legacy-completed").length,
    overdue: assignments.filter((assignment) => assignment.isOverdue).length,
  };
}

async function mutateOwnedAssignment(sql: string, assignmentId: string, learnerId: string) {
  const result = await getDatabasePool().query(sql, [assignmentId, learnerId]);
  if (!result.rowCount) throw new ChallengeAssignmentNotFoundError();
}

function mapAssignment(row: AssignmentRow, now: Date): ChallengeAssignment {
  const latestSubmission = row.latest_submission_id && row.latest_submission_number && row.latest_submitted_at
    ? {
        id: row.latest_submission_id,
        submissionNumber: row.latest_submission_number,
        submittedAt: row.latest_submitted_at,
        submittedAfterDue: wasSubmittedAfterDue({ submittedAt: row.latest_submitted_at, dueAt: row.due_at }),
        review: row.latest_review_id && row.latest_review_decision && row.latest_reviewed_at && row.latest_reviewer_id && row.latest_reviewer_display_name
          ? {
              id: row.latest_review_id,
              decision: row.latest_review_decision,
              feedback: row.latest_review_feedback ?? "",
              reviewedAt: row.latest_reviewed_at,
              reviewedBy: { id: row.latest_reviewer_id, displayName: row.latest_reviewer_display_name },
            }
          : null,
      }
    : null;
  const status = deriveAssignmentStatus({
    startedAt: row.started_at,
    legacyCompletedAt: row.completed_at,
    hasSubmission: Boolean(latestSubmission),
    latestReviewDecision: latestSubmission?.review?.decision ?? null,
  });
  return {
    id: row.id,
    challenge: {
      id: row.challenge_id,
      title: row.challenge_title,
      shortDescription: row.challenge_short_description,
      instructions: row.challenge_instructions,
      difficulty: row.challenge_difficulty,
      estimatedMinutes: row.challenge_estimated_minutes,
      definitionStatus: row.challenge_status,
    },
    learner: {
      id: row.learner_id,
      displayName: row.learner_display_name,
      login: row.learner_login,
      disabled: row.learner_disabled,
    },
    assignedBy: { id: row.assigned_by, displayName: row.assigner_display_name },
    assignedAt: row.assigned_at,
    dueAt: row.due_at,
    startedAt: row.started_at,
    legacyCompletedAt: row.completed_at,
    approvedAt: status === "legacy-completed" ? row.completed_at : status === "approved" ? latestSubmission?.review?.reviewedAt ?? null : null,
    status,
    isOverdue: isAssignmentOverdue({ dueAt: row.due_at, status }, now),
    latestSubmission,
  };
}

const assignmentSelect = `SELECT a.id, a.challenge_id, c.title AS challenge_title,
    c.short_description AS challenge_short_description, c.instructions AS challenge_instructions,
    c.difficulty AS challenge_difficulty, c.estimated_minutes AS challenge_estimated_minutes,
    c.status AS challenge_status, a.learner_id, learner.display_name AS learner_display_name,
    learner.login_identifier AS learner_login, learner.disabled_at IS NOT NULL AS learner_disabled,
    a.assigned_by, assigner.display_name AS assigner_display_name, a.assigned_at, a.due_at,
    a.started_at, a.completed_at, latest_submission.id AS latest_submission_id,
    latest_submission.submission_number AS latest_submission_number,
    latest_submission.submitted_at AS latest_submitted_at, latest_review.id AS latest_review_id,
    latest_review.decision AS latest_review_decision, latest_review.feedback AS latest_review_feedback,
    latest_review.reviewed_at AS latest_reviewed_at, reviewer.id AS latest_reviewer_id,
    reviewer.display_name AS latest_reviewer_display_name
  FROM challenge_assignments a
  JOIN challenges c ON c.id = a.challenge_id
  JOIN users learner ON learner.id = a.learner_id
  JOIN users assigner ON assigner.id = a.assigned_by
  LEFT JOIN LATERAL (
    SELECT s.id, s.submission_number, s.submitted_at
    FROM challenge_submissions s
    WHERE s.assignment_id = a.id
    ORDER BY s.submission_number DESC
    LIMIT 1
  ) latest_submission ON true
  LEFT JOIN challenge_reviews latest_review ON latest_review.submission_id = latest_submission.id
  LEFT JOIN users reviewer ON reviewer.id = latest_review.reviewed_by`;

function dashboardPriority(assignment: ChallengeAssignment, now: Date) {
  if (assignment.status === "revision-requested") return 0;
  const dueSoon = assignment.dueAt
    && assignment.status !== "submitted"
    && assignment.dueAt.getTime() <= now.getTime() + 3 * 86_400_000;
  if (dueSoon) return 1;
  if (assignment.status === "in-progress") return 2;
  if (assignment.status === "submitted") return 3;
  return 4;
}

function postgresErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}
