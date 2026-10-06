import "server-only";

import {
  EVIDENCE_MAX_AGGREGATE_BYTES,
  EVIDENCE_MAX_FILES,
  type EvidenceMimeType,
} from "../challenge-evidence.ts";
import type { ChallengeReviewDecision } from "../challenge-domain.ts";
import { getDatabasePool, withTransaction } from "./db.ts";
import type { StoredEvidenceFile } from "./evidence-storage.ts";

export type ChallengeReviewCriterionResult = {
  id: string;
  position: number;
  criterionTitle: string;
  criterionDescription: string;
  maxPoints: number;
  awardedPoints: number;
};

export type ChallengeSubmissionReview = {
  id: string;
  decision: ChallengeReviewDecision;
  feedback: string;
  reviewedAt: Date;
  reviewedBy: { id: string; displayName: string };
  criterionResults: ChallengeReviewCriterionResult[];
};

export type ChallengeSubmissionAttachment = {
  id: string;
  originalFilename: string;
  mimeType: EvidenceMimeType;
  byteSize: number;
  sha256: string;
  createdAt: Date;
};

export type ChallengeSubmission = {
  id: string;
  assignmentId: string;
  submissionNumber: number;
  content: string;
  submittedAt: Date;
  attachments: ChallengeSubmissionAttachment[];
  review: ChallengeSubmissionReview | null;
};

type AttachmentRow = {
  id: string;
  submission_id: string;
  original_filename: string;
  mime_type: EvidenceMimeType;
  byte_size: number;
  sha256: string;
  created_at: Date;
};

type CriterionResultRow = {
  id: string;
  review_id: string;
  position: number;
  criterion_title_snapshot: string;
  criterion_description_snapshot: string;
  max_points_snapshot: number;
  awarded_points: number;
};

type SubmissionRow = {
  id: string;
  assignment_id: string;
  submission_number: number;
  content: string;
  submitted_at: Date;
  review_id: string | null;
  review_decision: ChallengeReviewDecision | null;
  review_feedback: string | null;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  reviewer_display_name: string | null;
};

export class SubmissionAssignmentNotFoundError extends Error {
  constructor() {
    super("The owned challenge assignment does not exist.");
    this.name = "SubmissionAssignmentNotFoundError";
  }
}

export class SubmissionPendingReviewError extends Error {
  constructor() {
    super("The latest submission is still pending review.");
    this.name = "SubmissionPendingReviewError";
  }
}

export class SubmissionAlreadyApprovedError extends Error {
  constructor() {
    super("The assignment has already been approved.");
    this.name = "SubmissionAlreadyApprovedError";
  }
}

export class LegacyAssignmentCompletedError extends Error {
  constructor() {
    super("The assignment was completed before the review workflow was introduced.");
    this.name = "LegacyAssignmentCompletedError";
  }
}

export class SubmissionAttachmentLimitError extends Error {
  constructor() {
    super("The attachment count or aggregate size is invalid.");
    this.name = "SubmissionAttachmentLimitError";
  }
}

export async function assertOwnedChallengeSubmissionAllowed(assignmentId: string, learnerId: string) {
  const result = await getDatabasePool().query<{
    completed_at: Date | null;
    submission_number: number | null;
    decision: ChallengeReviewDecision | null;
  }>(
    `SELECT a.completed_at, latest.submission_number, latest.decision
     FROM challenge_assignments a
     LEFT JOIN LATERAL (
       SELECT s.submission_number, r.decision
       FROM challenge_submissions s
       LEFT JOIN challenge_reviews r ON r.submission_id = s.id
       WHERE s.assignment_id = a.id
       ORDER BY s.submission_number DESC
       LIMIT 1
     ) latest ON true
     WHERE a.id = $1 AND a.learner_id = $2`,
    [assignmentId, learnerId],
  );
  const row = result.rows[0];
  if (!row) throw new SubmissionAssignmentNotFoundError();
  if (row.completed_at) throw new LegacyAssignmentCompletedError();
  if (row.submission_number && row.decision === null) throw new SubmissionPendingReviewError();
  if (row.decision === "approved") throw new SubmissionAlreadyApprovedError();
}

export function createOwnedChallengeSubmission(input: {
  assignmentId: string;
  learnerId: string;
  content: string;
  attachments?: readonly StoredEvidenceFile[];
}) {
  const attachments = input.attachments ?? [];
  if (attachments.length > EVIDENCE_MAX_FILES
    || attachments.reduce((sum, attachment) => sum + attachment.byteSize, 0) > EVIDENCE_MAX_AGGREGATE_BYTES) {
    throw new SubmissionAttachmentLimitError();
  }
  return withTransaction(async (client) => {
    const assignment = await client.query<{ completed_at: Date | null }>(
      `SELECT completed_at
       FROM challenge_assignments
       WHERE id = $1 AND learner_id = $2
       FOR UPDATE`,
      [input.assignmentId, input.learnerId],
    );
    if (!assignment.rows[0]) throw new SubmissionAssignmentNotFoundError();
    if (assignment.rows[0].completed_at) throw new LegacyAssignmentCompletedError();

    const latest = await client.query<{ submission_number: number; decision: ChallengeReviewDecision | null }>(
      `SELECT s.submission_number, r.decision
       FROM challenge_submissions s
       LEFT JOIN challenge_reviews r ON r.submission_id = s.id
       WHERE s.assignment_id = $1
       ORDER BY s.submission_number DESC
       LIMIT 1`,
      [input.assignmentId],
    );
    const latestSubmission = latest.rows[0];
    if (latestSubmission && latestSubmission.decision === null) throw new SubmissionPendingReviewError();
    if (latestSubmission?.decision === "approved") throw new SubmissionAlreadyApprovedError();

    const submissionNumber = (latestSubmission?.submission_number ?? 0) + 1;
    await client.query(
      `UPDATE challenge_assignments
       SET started_at = COALESCE(started_at, now())
       WHERE id = $1`,
      [input.assignmentId],
    );
    const inserted = await client.query<{ id: string; submitted_at: Date }>(
      `INSERT INTO challenge_submissions (assignment_id, submission_number, content)
       VALUES ($1, $2, $3)
       RETURNING id, submitted_at`,
      [input.assignmentId, submissionNumber, input.content],
    );
    for (const attachment of attachments) {
      await client.query(
        `INSERT INTO challenge_submission_attachments
           (submission_id, storage_key, original_filename, mime_type, byte_size, sha256)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          inserted.rows[0].id,
          attachment.storageKey,
          attachment.originalFilename,
          attachment.mimeType,
          attachment.byteSize,
          attachment.sha256,
        ],
      );
    }
    return { id: inserted.rows[0].id, submissionNumber, submittedAt: inserted.rows[0].submitted_at };
  });
}

export async function listOwnedAssignmentSubmissions(assignmentId: string, learnerId: string) {
  const result = await getDatabasePool().query<SubmissionRow>(
    `${submissionSelect}
     JOIN challenge_assignments a ON a.id = s.assignment_id
     WHERE s.assignment_id = $1 AND a.learner_id = $2
     ORDER BY s.submission_number DESC`,
    [assignmentId, learnerId],
  );
  return hydrateSubmissions(result.rows.map(mapSubmission));
}

export async function listAssignmentSubmissions(assignmentId: string) {
  const result = await getDatabasePool().query<SubmissionRow>(
    `${submissionSelect}
     WHERE s.assignment_id = $1
     ORDER BY s.submission_number DESC`,
    [assignmentId],
  );
  return hydrateSubmissions(result.rows.map(mapSubmission));
}

function mapSubmission(row: SubmissionRow): ChallengeSubmission {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    submissionNumber: row.submission_number,
    content: row.content,
    submittedAt: row.submitted_at,
    attachments: [],
    review: row.review_id && row.review_decision && row.reviewed_at && row.reviewed_by && row.reviewer_display_name
      ? {
          id: row.review_id,
          decision: row.review_decision,
          feedback: row.review_feedback ?? "",
          reviewedAt: row.reviewed_at,
          reviewedBy: { id: row.reviewed_by, displayName: row.reviewer_display_name },
          criterionResults: [],
        }
      : null,
  };
}

async function hydrateSubmissions(submissions: ChallengeSubmission[]) {
  if (submissions.length === 0) return submissions;
  const pool = getDatabasePool();
  const submissionIds = submissions.map((submission) => submission.id);
  const reviewIds = submissions.flatMap((submission) => submission.review ? [submission.review.id] : []);
  const [attachments, criterionResults] = await Promise.all([
    pool.query<AttachmentRow>(
      `SELECT id, submission_id, original_filename, mime_type, byte_size, sha256, created_at
       FROM challenge_submission_attachments
       WHERE submission_id = ANY($1::uuid[])
       ORDER BY created_at ASC, id ASC`,
      [submissionIds],
    ),
    reviewIds.length === 0
      ? Promise.resolve({ rows: [] as CriterionResultRow[] })
      : pool.query<CriterionResultRow>(
          `SELECT id, review_id, position, criterion_title_snapshot, criterion_description_snapshot,
                  max_points_snapshot, awarded_points
           FROM challenge_review_criterion_results
           WHERE review_id = ANY($1::uuid[])
           ORDER BY position ASC`,
          [reviewIds],
        ),
  ]);
  const attachmentsBySubmission = Map.groupBy(attachments.rows, (attachment) => attachment.submission_id);
  const resultsByReview = Map.groupBy(criterionResults.rows, (result) => result.review_id);
  return submissions.map((submission) => ({
    ...submission,
    attachments: (attachmentsBySubmission.get(submission.id) ?? []).map((attachment) => ({
      id: attachment.id,
      originalFilename: attachment.original_filename,
      mimeType: attachment.mime_type,
      byteSize: attachment.byte_size,
      sha256: attachment.sha256,
      createdAt: attachment.created_at,
    })),
    review: submission.review
      ? {
          ...submission.review,
          criterionResults: (resultsByReview.get(submission.review.id) ?? []).map((result) => ({
            id: result.id,
            position: result.position,
            criterionTitle: result.criterion_title_snapshot,
            criterionDescription: result.criterion_description_snapshot,
            maxPoints: result.max_points_snapshot,
            awardedPoints: result.awarded_points,
          })),
        }
      : null,
  }));
}

const submissionSelect = `SELECT s.id, s.assignment_id, s.submission_number, s.content, s.submitted_at,
    r.id AS review_id, r.decision AS review_decision, r.feedback AS review_feedback,
    r.reviewed_at, r.reviewed_by, reviewer.display_name AS reviewer_display_name
  FROM challenge_submissions s
  LEFT JOIN challenge_reviews r ON r.submission_id = s.id
  LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by`;
