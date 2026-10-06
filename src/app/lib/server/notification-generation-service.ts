import "server-only";

import { learningModules } from "../../data/learning-modules.ts";
import { quizzes } from "../../data/quizzes.ts";
import { buildCurriculumAssignmentViews } from "../curriculum-planning.ts";
import { canReviewSubmissions, canViewLearnerProgress } from "../authorization.ts";
import {
  buildActivityDigestMessage,
  challengeReviewNotificationCandidate,
  classifyDueWindow,
  getCompletedUtcDigestWindow,
  type DueWindow,
  type NotificationCandidate,
} from "../notification-domain.ts";
import { getModuleProgress, type LearnerProgressState } from "../learner-progress.ts";
import { listAllAssignmentsForAdmin } from "./challenge-assignment-repository.ts";
import { listActiveCurriculumAssignments } from "./curriculum-assignment-repository.ts";
import {
  findReviewNotificationEvent,
  findSubmissionNotificationEvent,
  listActiveNotificationRecipients,
  listReviewNotificationEvents,
  listSubmissionNotificationEvents,
  readActivityDigestCounts,
  type SubmissionNotificationEvent,
} from "./notification-generation-repository.ts";
import { insertNotificationCandidates } from "./notification-repository.ts";
import { dispatchPersistedNotificationPushBestEffort } from "./notification-push-service.ts";
import { readLearnerProgressForUsers } from "./progress-repository.ts";

const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export async function generateNotifications(now = new Date()) {
  const recipients = await listActiveNotificationRecipients();
  const learners = recipients.filter((recipient) => recipient.role === "learner");
  const trainers = recipients.filter((recipient) => canViewLearnerProgress(recipient.role));
  const learnerIds = new Set(learners.map((learner) => learner.id));
  const [planningRecords, states, challengeAssignments, submissions, reviews] = await Promise.all([
    listActiveCurriculumAssignments(),
    readLearnerProgressForUsers(learners.map((learner) => learner.id)),
    listAllAssignmentsForAdmin(now),
    listSubmissionNotificationEvents(),
    listReviewNotificationEvents(),
  ]);
  const candidates: NotificationCandidate[] = [];

  for (const record of planningRecords) {
    if (!learnerIds.has(record.learnerId)) continue;
    const state = states.get(record.learnerId);
    if (!state) continue;
    const view = buildCurriculumAssignmentViews([record], state, now)[0];
    if (!view || view.status === "completed") continue;
    const window = classifyDueWindow(view.targetAt, now);
    if (!window) continue;
    candidates.push(curriculumLearnerCandidate(view.id, view.learnerId, view.module.title, window));
    if (window === "overdue") {
      for (const trainer of trainers) {
        candidates.push({
          userId: trainer.id,
          type: "trainer-curriculum-overdue",
          title: "Lernplan-Ziel überfällig",
          message: `${view.module.title} hat ein überschrittenes Lernplan-Ziel.`,
          href: `/admin/lernende/${view.learnerId}`,
          dedupeKey: `trainer-curriculum-overdue:${view.id}`,
        });
      }
    }
  }

  for (const assignment of challengeAssignments) {
    if (!learnerIds.has(assignment.learner.id)) continue;
    const window = classifyDueWindow(assignment.dueAt, now);
    if (assignment.isOverdue && window === "overdue") {
      for (const trainer of trainers) {
        candidates.push({
          userId: trainer.id,
          type: "trainer-challenge-overdue",
          title: "Challenge überfällig",
          message: `${assignment.learner.displayName}: ${assignment.challenge.title} ist überfällig.`,
          href: `/admin/lernende/${assignment.learner.id}`,
          dedupeKey: `trainer-challenge-overdue:${assignment.id}`,
        });
      }
    }
    if (assignment.status !== "not-started" && assignment.status !== "in-progress") continue;
    if (!window) continue;
    candidates.push(challengeLearnerCandidate(assignment.id, assignment.learner.id, assignment.challenge.title, window));
  }

  for (const submission of submissions) {
    if (submission.reviewed || !learnerIds.has(submission.learnerId)) continue;
    candidates.push(...pendingReviewCandidates(submission, trainers.map((trainer) => trainer.id)));
  }
  for (const review of reviews) {
    if (learnerIds.has(review.learnerId)) candidates.push(challengeReviewNotificationCandidate(review));
  }

  const window = getCompletedUtcDigestWindow(now);
  const baseDigestCounts = await readActivityDigestCounts(window.start, window.end);
  const digestCounts = {
    ...baseDigestCounts,
    completedModules: countCompletedModulesInWindow(states, window.start, window.end),
  };
  const digestMessage = buildActivityDigestMessage(digestCounts);
  if (digestMessage) {
    for (const trainer of trainers) {
      candidates.push({
        userId: trainer.id,
        type: "activity-digest",
        title: "Lernaktivität im Tagesüberblick",
        message: digestMessage,
        href: "/admin",
        dedupeKey: `activity-digest:${window.key}`,
      });
    }
  }

  const inserted = await insertNotificationCandidates(candidates);
  const push = await dispatchPersistedNotificationPushBestEffort(inserted.notifications);
  return {
    attempted: inserted.attempted,
    inserted: inserted.inserted,
    skipped: inserted.attempted - inserted.inserted,
    push,
    recipients: { learners: learners.length, trainers: trainers.length },
    digestWindow: { start: window.start.toISOString(), end: window.end.toISOString(), emitted: Boolean(digestMessage) },
  };
}

export async function notifyTrainersAboutSubmissionBestEffort(submissionId: string) {
  try {
    const [event, recipients] = await Promise.all([
      findSubmissionNotificationEvent(submissionId),
      listActiveNotificationRecipients(),
    ]);
    if (!event || event.reviewed) return;
    const inserted = await insertNotificationCandidates(pendingReviewCandidates(
      event,
      recipients.filter((recipient) => canReviewSubmissions(recipient.role)).map((recipient) => recipient.id),
    ));
    await dispatchPersistedNotificationPushBestEffort(inserted.notifications);
  } catch (error) {
    console.error("[azubi-lab] submission notification deferred", error instanceof Error ? error.name : "UnknownError");
  }
}

export async function notifyLearnerAboutReviewBestEffort(reviewId: string) {
  try {
    const [event, recipients] = await Promise.all([
      findReviewNotificationEvent(reviewId),
      listActiveNotificationRecipients(),
    ]);
    if (!event || !recipients.some((recipient) => recipient.id === event.learnerId && recipient.role === "learner")) return;
    const inserted = await insertNotificationCandidates([challengeReviewNotificationCandidate(event)]);
    await dispatchPersistedNotificationPushBestEffort(inserted.notifications);
  } catch (error) {
    console.error("[azubi-lab] review notification deferred", error instanceof Error ? error.name : "UnknownError");
  }
}

function curriculumLearnerCandidate(
  assignmentId: string,
  learnerId: string,
  moduleTitle: string,
  window: DueWindow,
): NotificationCandidate {
  const overdue = window === "overdue";
  return {
    userId: learnerId,
    type: overdue ? "curriculum-overdue" : "curriculum-due",
    title: overdue ? "Lernplan-Ziel überfällig" : "Lernplan-Ziel rückt näher",
    message: overdue
      ? `${moduleTitle} hat den Zieltermin überschritten.`
      : `${moduleTitle} ist ${window === "1d" ? "innerhalb eines Tages" : "innerhalb von drei Tagen"} fällig.`,
    href: "/lernplan",
    dedupeKey: `curriculum-${overdue ? "overdue" : "due"}:${assignmentId}:${window}`,
  };
}

function challengeLearnerCandidate(
  assignmentId: string,
  learnerId: string,
  challengeTitle: string,
  window: DueWindow,
): NotificationCandidate {
  const overdue = window === "overdue";
  return {
    userId: learnerId,
    type: overdue ? "challenge-overdue" : "challenge-due",
    title: overdue ? "Challenge überfällig" : "Challenge wird bald fällig",
    message: overdue
      ? `${challengeTitle} hat die Fälligkeit überschritten.`
      : `${challengeTitle} ist ${window === "1d" ? "innerhalb eines Tages" : "innerhalb von drei Tagen"} fällig.`,
    href: `/challenges/${assignmentId}`,
    dedupeKey: `challenge-${overdue ? "overdue" : "due"}:${assignmentId}:${window}`,
  };
}

function pendingReviewCandidates(event: SubmissionNotificationEvent, adminIds: readonly string[]): NotificationCandidate[] {
  return adminIds.map((adminId) => ({
    userId: adminId,
    type: "challenge-review-pending",
    title: "Challenge-Review ausstehend",
    message: `${event.learnerDisplayName} hat ${event.challengeTitle} eingereicht.`,
    href: `/admin/challenges/abgaben/${event.submissionId}`,
    dedupeKey: `challenge-review-pending:${event.submissionId}`,
    createdAt: event.submittedAt,
  }));
}

function countCompletedModulesInWindow(
  states: ReadonlyMap<string, LearnerProgressState>,
  start: Date,
  end: Date,
) {
  let count = 0;
  for (const state of states.values()) {
    for (const learningModule of learningModules) {
      const hasQuiz = quizModuleSlugs.has(learningModule.slug);
      if (getModuleProgress(state, learningModule, hasQuiz).status !== "completed") continue;
      const lessonTimes = (learningModule.lessons ?? [])
        .filter((lesson) => lesson.status === "available")
        .map((lesson) => state.lessons[`${learningModule.slug}/${lesson.slug}`]?.completedAt)
        .filter((value): value is string => Boolean(value));
      const activityTimes = hasQuiz
        ? [...lessonTimes, state.quizzes[learningModule.slug]?.lastSubmittedAt].filter((value): value is string => Boolean(value))
        : lessonTimes;
      const completedAt = Math.max(...activityTimes.map((value) => new Date(value).getTime()));
      if (completedAt >= start.getTime() && completedAt < end.getTime()) count += 1;
    }
  }
  return count;
}
