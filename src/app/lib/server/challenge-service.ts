import "server-only";

import { createHash } from "node:crypto";
import { isUuid } from "../account-security.ts";
import { canManageChallenges, canReviewSubmissions, canViewChallengeCatalogue } from "../authorization.ts";
import type { ChallengeInput, ChallengeStatus } from "../challenge-domain.ts";
import {
  challengeAssignmentNotificationCandidate,
  challengeReviewNotificationCandidate,
} from "../notification-domain.ts";
import { findAuthorizedAttachment } from "./challenge-attachment-repository.ts";
import {
  assignChallengeToLearnersWithClient,
  findLearnerAssignmentById,
  listActiveLearnerOptions,
  listAssignmentsForAdminLearner,
  listAssignmentsForChallenge,
  listLearnerAssignments,
  readLearnerChallengeSummary,
  startLearnerAssignment,
  summarizeAssignmentStatuses,
} from "./challenge-assignment-repository.ts";
import {
  createAdminComment,
  createOwnedLearnerComment,
  listAssignmentComments,
  listOwnedAssignmentComments,
} from "./challenge-comment-repository.ts";
import {
  createChallengeReviewWithClient,
  countPendingChallengeReviews,
  findSubmissionReviewDetail,
  listPendingChallengeReviews,
} from "./challenge-review-repository.ts";
import {
  assertOwnedChallengeSubmissionAllowed,
  createOwnedChallengeSubmission,
  listOwnedAssignmentSubmissions,
} from "./challenge-submission-repository.ts";
import {
  createChallengeDefinition,
  findChallengeDefinitionById,
  listChallengeDefinitions,
  listPublishedChallengePreviews,
  listRubricCriteriaForChallenge,
  updateChallengeDefinition,
} from "./challenge-repository.ts";
import { validateEvidenceFiles } from "./evidence-file-validation.ts";
import {
  cleanupStoredEvidence,
  LocalFilesystemEvidenceStorage,
  storeEvidenceFiles,
} from "./evidence-storage.ts";
import { getCurrentDatabaseUser, requireAuthenticatedUser, requireCapability, requireLearnerUser } from "./current-user.ts";
import { withTransaction } from "./db.ts";
import {
  notifyTrainersAboutSubmissionBestEffort,
} from "./notification-generation-service.ts";
import { insertNotificationCandidatesWithClient } from "./notification-repository.ts";
import { dispatchPersistedNotificationPushBestEffort } from "./notification-push-service.ts";

export async function getAdminChallengeList(status?: ChallengeStatus) {
  await requireCapability("manageChallenges");
  return listChallengeDefinitions(status);
}

export async function getAdminChallengeManagement(status?: ChallengeStatus) {
  await requireCapability("manageChallenges");
  const [challenges, pendingReviews] = await Promise.all([
    listChallengeDefinitions(status),
    listPendingChallengeReviews(),
  ]);
  return { challenges, pendingReviews };
}

export async function getAdminChallengeDetail(challengeId: unknown) {
  await requireCapability("manageChallenges");
  if (!isUuid(challengeId)) return undefined;
  const challenge = await findChallengeDefinitionById(challengeId);
  if (!challenge) return undefined;
  const [assignments, activeLearners] = await Promise.all([
    listAssignmentsForChallenge(challenge.id),
    listActiveLearnerOptions(),
  ]);
  const assignedLearnerIds = new Set(assignments.map((assignment) => assignment.learner.id));
  return {
    challenge,
    assignments,
    counts: summarizeAssignmentStatuses(assignments),
    availableLearners: activeLearners.filter((learner) => !assignedLearnerIds.has(learner.id)),
  };
}

export async function createChallengeAsAdmin(input: ChallengeInput) {
  const manager = await requireCapability("manageChallenges");
  return createChallengeDefinition(input, manager.id);
}

export async function updateChallengeAsAdmin(challengeId: string, input: ChallengeInput) {
  await requireCapability("manageChallenges");
  await updateChallengeDefinition(challengeId, input);
}

export async function assignChallengeAsAdmin(input: { challengeId: string; learnerIds: readonly string[]; dueAt: Date | null }) {
  const manager = await requireCapability("manageAssignments");
  const result = await withTransaction(async (client) => {
    const assignments = await assignChallengeToLearnersWithClient(client, { ...input, assignedBy: manager.id });
    const inserted = await insertNotificationCandidatesWithClient(
      client,
      assignments.map((assignment) => challengeAssignmentNotificationCandidate({
        assignmentId: assignment.id,
        learnerId: assignment.learnerId,
        challengeTitle: assignment.challengeTitle,
        assignedAt: assignment.assignedAt,
      })),
    );
    return { assignmentIds: assignments.map((assignment) => assignment.id), notifications: inserted.notifications };
  });
  await dispatchPersistedNotificationPushBestEffort(result.notifications);
  return result.assignmentIds;
}

export async function getLearnerChallengeOverview() {
  const learner = await requireLearnerUser();
  const assignments = await listLearnerAssignments(learner.id);
  return { learner, assignments, counts: summarizeAssignmentStatuses(assignments) };
}

export async function getChallengeOverviewPageData() {
  if (!process.env.AUTH_SECRET) return { audience: "anonymous" as const };
  const user = await getCurrentDatabaseUser();
  if (!user) return { audience: "anonymous" as const };
  if (user.mustChangePassword) return { audience: "password-change" as const };
  if (canManageChallenges(user.role)) return { audience: "admin" as const };
  if (canViewChallengeCatalogue(user.role)) {
    return { audience: "preview" as const, challenges: await listPublishedChallengePreviews() };
  }
  if (user.role === "learner") {
    const assignments = await listLearnerAssignments(user.id);
    return { audience: "learner" as const, assignments, counts: summarizeAssignmentStatuses(assignments) };
  }
  return { audience: "unavailable" as const };
}

export async function getOwnedLearnerAssignment(assignmentId: unknown) {
  const learner = await requireLearnerUser();
  if (!isUuid(assignmentId)) return undefined;
  const assignment = await findLearnerAssignmentById(assignmentId, learner.id);
  if (!assignment) return undefined;
  const [submissions, rubricCriteria, comments] = await Promise.all([
    listOwnedAssignmentSubmissions(assignment.id, learner.id),
    listRubricCriteriaForChallenge(assignment.challenge.id),
    listOwnedAssignmentComments(assignment.id, learner.id),
  ]);
  return { assignment, submissions, rubricCriteria, comments };
}

export async function startOwnedLearnerAssignment(assignmentId: string) {
  const learner = await requireLearnerUser();
  return startLearnerAssignment(assignmentId, learner.id);
}

export async function submitOwnedLearnerAssignment(
  assignmentId: string,
  content: string,
  fileEntries: readonly FormDataEntryValue[] = [],
) {
  const learner = await requireLearnerUser();
  await assertOwnedChallengeSubmissionAllowed(assignmentId, learner.id);
  const files = await validateEvidenceFiles(fileEntries);
  const stored = await storeEvidenceFiles(files);
  try {
    const submission = await createOwnedChallengeSubmission({ assignmentId, learnerId: learner.id, content, attachments: stored });
    await notifyTrainersAboutSubmissionBestEffort(submission.id);
    return submission;
  } catch (error) {
    await cleanupStoredEvidence(stored);
    throw error;
  }
}

export async function getAdminSubmissionReview(submissionId: unknown) {
  await requireCapability("reviewSubmissions");
  if (!isUuid(submissionId)) return undefined;
  const detail = await findSubmissionReviewDetail(submissionId);
  if (!detail) return undefined;
  return { ...detail, comments: await listAssignmentComments(detail.assignment.id) };
}

export async function reviewSubmissionAsAdmin(input: {
  submissionId: string;
  decision: "approved" | "revision-requested";
  feedback: string;
  scores: readonly { criterionId: string; awardedPoints: number }[];
}) {
  const reviewer = await requireCapability("reviewSubmissions");
  const result = await withTransaction(async (client) => {
    const review = await createChallengeReviewWithClient(client, { ...input, reviewedBy: reviewer.id });
    const inserted = review.learnerActive
      ? await insertNotificationCandidatesWithClient(client, [challengeReviewNotificationCandidate({
          reviewId: review.id,
          assignmentId: review.assignmentId,
          learnerId: review.learnerId,
          challengeTitle: review.challengeTitle,
          decision: input.decision,
          reviewedAt: review.reviewedAt,
        })])
      : { notifications: [] };
    return { review, notifications: inserted.notifications };
  });
  await dispatchPersistedNotificationPushBestEffort(result.notifications);
  return { id: result.review.id, reviewedAt: result.review.reviewedAt };
}

export async function addOwnedLearnerComment(assignmentId: string, body: string) {
  const learner = await requireLearnerUser();
  return createOwnedLearnerComment({ assignmentId, learnerId: learner.id, body });
}

export async function addAdminComment(assignmentId: string, body: string) {
  const reviewer = await requireCapability("reviewSubmissions");
  return createAdminComment({ assignmentId, adminId: reviewer.id, body });
}

export async function getAuthorizedEvidenceDownload(attachmentId: unknown) {
  if (!isUuid(attachmentId)) return undefined;
  const user = await requireAuthenticatedUser();
  const attachment = await findAuthorizedAttachment({
    attachmentId,
    userId: user.id,
    canReviewAll: canReviewSubmissions(user.role),
  });
  if (!attachment) return undefined;
  try {
    const bytes = await new LocalFilesystemEvidenceStorage().read(attachment.storageKey);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== attachment.byteSize || sha256 !== attachment.sha256) {
      console.error("[azubi-lab] evidence integrity check failed", attachment.id);
      return { attachment: undefined, bytes: undefined, unavailable: true as const };
    }
    return { attachment, bytes, unavailable: false as const };
  } catch (error) {
    console.error("[azubi-lab] evidence read failed", attachment.id, error instanceof Error ? error.name : "UnknownError");
    return { attachment: undefined, bytes: undefined, unavailable: true as const };
  }
}

export async function getAdminLearnerChallengeView(learnerId: string) {
  await requireCapability("viewLearnerProgress");
  const assignments = await listAssignmentsForAdminLearner(learnerId);
  return { assignments, counts: summarizeAssignmentStatuses(assignments) };
}

export async function getDashboardChallengeView() {
  if (!process.env.AUTH_SECRET) return { audience: "anonymous" as const };
  const user = await getCurrentDatabaseUser();
  if (!user) return { audience: "anonymous" as const };
  if (user.mustChangePassword) return { audience: "password-change" as const };
  if (canManageChallenges(user.role)) return { audience: "admin" as const, pendingReviews: await countPendingChallengeReviews() };
  if (canViewChallengeCatalogue(user.role)) return { audience: "preview" as const };
  if (user.role === "learner") return { audience: "learner" as const, ...await readLearnerChallengeSummary(user.id) };
  return { audience: "unavailable" as const };
}
