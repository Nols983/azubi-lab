import { isSafeInternalNavigationTarget } from "./internal-navigation.ts";

export const NOTIFICATION_TYPES = [
  "curriculum-assigned",
  "curriculum-due",
  "curriculum-overdue",
  "challenge-assigned",
  "challenge-due",
  "challenge-overdue",
  "challenge-revision",
  "challenge-approved",
  "challenge-review-pending",
  "trainer-curriculum-overdue",
  "trainer-challenge-overdue",
  "activity-digest",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type DueWindow = "3d" | "1d" | "overdue";

export type NotificationCandidate = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  dedupeKey: string;
  createdAt?: Date;
};

export type CurriculumAssignmentNotificationEvent = {
  assignmentId: string;
  learnerId: string;
  moduleTitle: string;
  assignedAt: Date;
  eventVersion: string;
};

export type ChallengeAssignmentNotificationEvent = {
  assignmentId: string;
  learnerId: string;
  challengeTitle: string;
  assignedAt: Date;
};

export type ChallengeReviewNotificationEvent = {
  reviewId: string;
  assignmentId: string;
  learnerId: string;
  challengeTitle: string;
  decision: "approved" | "revision-requested";
  reviewedAt: Date;
};

export type ActivityDigestCounts = {
  completedLessons: number;
  quizSubmissions: number;
  completedModules: number;
  challengeSubmissions: number;
  approvedChallenges: number;
  requestedRevisions: number;
};

const DAY_MS = 86_400_000;

export function classifyDueWindow(dueAt: Date | string | null, now: Date): DueWindow | null {
  if (!dueAt) return null;
  const difference = new Date(dueAt).getTime() - now.getTime();
  if (!Number.isFinite(difference)) return null;
  if (difference < 0) return "overdue";
  if (difference <= DAY_MS) return "1d";
  if (difference <= 3 * DAY_MS) return "3d";
  return null;
}

export function getCompletedUtcDigestWindow(now: Date) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end.getTime() - DAY_MS);
  return { start, end, key: start.toISOString().slice(0, 10) };
}

export function buildActivityDigestMessage(counts: ActivityDigestCounts) {
  const entries = [
    [counts.completedLessons, "abgeschlossene Lektionen"],
    [counts.quizSubmissions, "Quiz-Abgaben"],
    [counts.completedModules, "abgeschlossene Module"],
    [counts.challengeSubmissions, "Challenge-Abgaben"],
    [counts.approvedChallenges, "Challenge-Freigaben"],
    [counts.requestedRevisions, "Überarbeitungsanforderungen"],
  ] as const;
  const visible = entries.filter(([value]) => value > 0);
  return visible.length === 0
    ? null
    : visible.map(([value, label]) => `${value} ${label}`).join(" · ");
}

export function isSafeInternalNotificationHref(href: string | null) {
  if (href === null) return true;
  return isSafeInternalNavigationTarget(href);
}

export function deduplicateNotificationCandidates(candidates: readonly NotificationCandidate[]) {
  const unique = new Map<string, NotificationCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.userId}:${candidate.dedupeKey}`;
    if (!unique.has(key)) unique.set(key, candidate);
  }
  return [...unique.values()];
}

export function curriculumAssignmentNotificationCandidate(
  event: CurriculumAssignmentNotificationEvent,
): NotificationCandidate {
  return {
    userId: event.learnerId,
    type: "curriculum-assigned",
    title: "Neuer Lernplan",
    message: `${event.moduleTitle} wurde deinem Lernplan hinzugefügt.`,
    href: "/lernplan",
    dedupeKey: `curriculum-assigned:${event.assignmentId}:${event.eventVersion}`,
    createdAt: event.assignedAt,
  };
}

export function challengeAssignmentNotificationCandidate(
  event: ChallengeAssignmentNotificationEvent,
): NotificationCandidate {
  return {
    userId: event.learnerId,
    type: "challenge-assigned",
    title: "Neue Challenge",
    message: `${event.challengeTitle} wurde dir als neue Challenge zugewiesen.`,
    href: `/challenges/${event.assignmentId}`,
    dedupeKey: `challenge-assigned:${event.assignmentId}`,
    createdAt: event.assignedAt,
  };
}

export function challengeReviewNotificationCandidate(
  event: ChallengeReviewNotificationEvent,
): NotificationCandidate {
  const approved = event.decision === "approved";
  return {
    userId: event.learnerId,
    type: approved ? "challenge-approved" : "challenge-revision",
    title: approved ? "Challenge freigegeben" : "Überarbeitung angefordert",
    message: approved
      ? `${event.challengeTitle} wurde freigegeben.`
      : `${event.challengeTitle} benötigt eine Überarbeitung. Öffne die Aufgabe für das Review-Feedback.`,
    href: `/challenges/${event.assignmentId}`,
    dedupeKey: `${approved ? "challenge-approved" : "challenge-revision"}:${event.reviewId}`,
    createdAt: event.reviewedAt,
  };
}
