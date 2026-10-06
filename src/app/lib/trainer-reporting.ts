import { learningModules } from "../data/learning-modules.ts";
import { getAdminProgressView } from "./admin-progress.ts";
import { buildCurriculumAssignmentViews, type CurriculumAssignmentView } from "./curriculum-planning.ts";
import { createEmptyLearnerProgressState, type LearnerProgressState, type LearnerStatus } from "./learner-progress.ts";
import { deriveLevelProgress, type LevelProgress } from "./xp-domain.ts";
import type { LearnerAccountRecord } from "./server/admin-repository.ts";
import type { ChallengeAssignment } from "./server/challenge-assignment-repository.ts";
import type { CurriculumAssignmentRecord } from "./server/curriculum-assignment-repository.ts";
import type { TrainerLabAggregateRecord } from "./server/trainer-lab-reporting-repository.ts";

export type TrainerLabDefinition = {
  id: string;
  title: string;
  category: string;
};

export type TrainerLabView = TrainerLabAggregateRecord & {
  title: string;
  category: string;
  hasCompleted: boolean;
  hasActive: boolean;
  supportSuggested: boolean;
  signals: readonly string[];
};

export type TrainerLearnerFacts = {
  learnerId: string;
  totalXp: number;
  completedPracticeQuizCount: number;
  answeredPracticeQuestionCount: number;
  correctPracticeQuestionCount: number;
  latestPracticeQuizAt: Date | null;
};

export type TrainerPracticeSummary = {
  completedQuizCount: number;
  answeredQuestionCount: number;
  correctQuestionCount: number;
  accuracyPercentage: number | null;
  latestCompletedAt: Date | null;
};

export type TrainerActivityItem = {
  id: string;
  kind: "learning" | "practice" | "challenge" | "lab";
  label: string;
  detail?: string;
  timestamp: Date;
};

export type TrainerLearnerSummary = {
  progressPercentage: number;
  modules: { completed: number; total: number };
  moduleQuizzesAttempted: number;
  practice: TrainerPracticeSummary;
  challenges: { completed: number; open: number };
  normalLabs: { completed: number; total: number };
  progression: LevelProgress;
  latestActivity: TrainerActivityItem | null;
  planning: { active: number; overdue: number };
};

export type TrainerOverviewFilters = {
  query: string;
  moduleSlug: string;
  status: "all" | LearnerStatus;
  focus: "all" | "lab-active" | "lab-support" | "challenge-open" | "challenge-review" | "curriculum-active" | "curriculum-overdue";
};

export type TrainerAttentionItem = {
  id: string;
  priority: number;
  kind: "challenge-revision" | "challenge-overdue" | "challenge-review" | "curriculum-overdue" | "lab-support";
  label: string;
  detail: string;
  timestamp: Date;
  href: string;
};

export function buildTrainerReportingSnapshot(input: {
  learners: readonly LearnerAccountRecord[];
  states: ReadonlyMap<string, LearnerProgressState>;
  planningRecords: readonly CurriculumAssignmentRecord[];
  challengeAssignments: readonly ChallengeAssignment[];
  labAggregates?: readonly TrainerLabAggregateRecord[];
  labDefinitions?: readonly TrainerLabDefinition[];
  learnerFacts?: readonly TrainerLearnerFacts[];
  now: Date;
}) {
  const { learners, states, planningRecords, challengeAssignments, now } = input;
  const labAggregates = input.labAggregates ?? [];
  const labDefinitions = input.labDefinitions ?? [];
  const planningRecordsByLearner = groupBy(planningRecords, (assignment) => assignment.learnerId);
  const challengesByLearner = groupBy(challengeAssignments, (assignment) => assignment.learner.id);
  const labsByLearner = groupBy(buildTrainerLabViews(labAggregates, labDefinitions), (lab) => lab.learnerId);
  const factsByLearner = new Map((input.learnerFacts ?? []).map((facts) => [facts.learnerId, facts]));
  const learnerReports = learners.map((learner) => {
    const state = states.get(learner.id) ?? createEmptyLearnerProgressState();
    const progress = getAdminProgressView(state);
    const planning = buildCurriculumAssignmentViews(planningRecordsByLearner.get(learner.id) ?? [], state, now);
    const challenges = challengesByLearner.get(learner.id) ?? [];
    const labs = labsByLearner.get(learner.id) ?? [];
    const facts = factsByLearner.get(learner.id) ?? emptyLearnerFacts(learner.id);
    const practice = buildTrainerPracticeSummary(facts);
    const progression = deriveLevelProgress(facts.totalXp);
    const challengeCounts = summarizeChallengeAssignments(challenges);
    const labCounts = summarizeLabs(labs, labDefinitions.length, now);
    const activity = buildTrainerRecentActivity({ progress, challenges, labs, practice });
    return {
      learner,
      state,
      progress,
      planning,
      challenges,
      labs,
      challengeCounts,
      labCounts,
      practice,
      progression,
      activity,
      summary: {
        progressPercentage: progress.overall.percentage,
        modules: { completed: progress.overall.completedModules, total: progress.modules.length },
        moduleQuizzesAttempted: progress.modules.filter((module) => Boolean(module.quiz)).length,
        practice,
        challenges: {
          completed: challengeCounts.approved,
          open: challenges.length - challengeCounts.approved,
        },
        normalLabs: { completed: labCounts.completed, total: labCounts.canonicalTotal },
        progression,
        latestActivity: activity[0] ?? null,
        planning: {
          active: planning.length,
          overdue: planning.filter((assignment) => assignment.isOverdue).length,
        },
      } satisfies TrainerLearnerSummary,
    };
  }).sort(compareLearnerReports);
  const activeLearnerReports = learnerReports.filter(({ learner }) => !learner.disabledAt);
  const planning = learnerReports.flatMap((report) => report.planning);
  const challengeCounts = summarizeChallengeAssignments(challengeAssignments);
  const labs = learnerReports.flatMap((report) => report.labs);
  const curriculumModules = learningModules.map((learningModule) => {
    const learnerRows = activeLearnerReports.map((report) => {
      const moduleProgress = report.progress.modules.find((item) => item.slug === learningModule.slug);
      if (!moduleProgress) throw new Error(`Missing canonical module report for ${learningModule.slug}.`);
      const assignment = report.planning.find((item) => item.module.slug === learningModule.slug);
      return { learner: report.learner, module: moduleProgress, assignment };
    });
    return {
      module: learningModule,
      learnerRows,
      counts: {
        notStarted: learnerRows.filter((row) => row.module.summary.status === "not-started").length,
        inProgress: learnerRows.filter((row) => row.module.summary.status === "in-progress").length,
        completed: learnerRows.filter((row) => row.module.summary.status === "completed").length,
        assigned: learnerRows.filter((row) => Boolean(row.assignment)).length,
        overdue: learnerRows.filter((row) => row.assignment?.isOverdue).length,
      },
      averageProgress: learnerRows.length > 0
        ? Math.round(learnerRows.reduce((total, row) => total + row.module.summary.percentage, 0) / learnerRows.length)
        : 0,
    };
  });

  return {
    learnerReports,
    activeLearnerReports,
    curriculumModules,
    challengeAssignments,
    attention: buildAttentionList(challengeAssignments, planning, learnerReports).slice(0, 8),
    counts: {
      learners: {
        total: activeLearnerReports.length,
        withoutActivity: activeLearnerReports.filter(({ progress }) => !progress.hasProgress).length,
        active: activeLearnerReports.filter(({ progress }) => progress.overall.inProgressModules > 0).length,
        withCompletedModules: activeLearnerReports.filter(({ progress }) => progress.overall.completedModules > 0).length,
        disabled: learnerReports.length - activeLearnerReports.length,
      },
      planning: {
        active: planning.length,
        overdue: planning.filter((assignment) => assignment.isOverdue).length,
        completed: planning.filter((assignment) => assignment.status === "completed").length,
      },
      challenges: {
        open: challengeAssignments.filter((assignment) => assignment.status !== "approved" && assignment.status !== "legacy-completed").length,
        inProgress: challengeCounts.inProgress,
        pendingReview: challengeCounts.submitted,
        revisionRequested: challengeCounts.revisionRequested,
        approved: challengeCounts.approved,
        overdue: challengeCounts.overdue,
      },
      labs: summarizeLabs(labs, labDefinitions.length, now),
    },
    queryStrategy: {
      roundTrips: 8,
      description: "Eine Kontenabfrage, drei gebündelte Fortschrittsabfragen sowie je eine Planungs-, Challenge-, Lab- und XP-/Übungsquiz-Aggregatabfrage.",
    },
  };
}


export function buildTrainerPracticeSummary(facts: TrainerLearnerFacts): TrainerPracticeSummary {
  return {
    completedQuizCount: facts.completedPracticeQuizCount,
    answeredQuestionCount: facts.answeredPracticeQuestionCount,
    correctQuestionCount: facts.correctPracticeQuestionCount,
    accuracyPercentage: facts.answeredPracticeQuestionCount > 0
      ? Math.round((facts.correctPracticeQuestionCount / facts.answeredPracticeQuestionCount) * 100)
      : null,
    latestCompletedAt: facts.latestPracticeQuizAt,
  };
}

export function buildTrainerRecentActivity(input: {
  progress: ReturnType<typeof getAdminProgressView>;
  challenges: readonly ChallengeAssignment[];
  labs: readonly TrainerLabView[];
  practice: TrainerPracticeSummary;
  practiceHistory?: readonly {
    attemptId: string;
    correctCount: number;
    questionCount: number;
    completedAt: string;
  }[];
}) {
  const learning = input.progress.recentActivity.map((activity): TrainerActivityItem => ({
    id: activity.id,
    kind: "learning",
    label: activity.description,
    detail: activity.moduleTitle,
    timestamp: new Date(activity.timestamp),
  }));
  const practiceHistory = input.practiceHistory?.map((attempt): TrainerActivityItem => ({
    id: `practice:${attempt.attemptId}`,
    kind: "practice",
    label: "Übungsquiz abgeschlossen",
    detail: `${attempt.correctCount} von ${attempt.questionCount} Fragen richtig`,
    timestamp: new Date(attempt.completedAt),
  })) ?? (input.practice.latestCompletedAt ? [{ id: "practice:latest", kind: "practice" as const, label: "Übungsquiz abgeschlossen", timestamp: input.practice.latestCompletedAt }] : []);
  const challenges = input.challenges.flatMap((assignment): TrainerActivityItem[] => {
    const activity = assignment.latestSubmission
      ? { timestamp: assignment.latestSubmission.submittedAt, label: `Challenge abgegeben: ${assignment.challenge.title}` }
      : assignment.legacyCompletedAt
        ? { timestamp: assignment.legacyCompletedAt, label: `Challenge abgeschlossen: ${assignment.challenge.title}` }
        : assignment.startedAt
          ? { timestamp: assignment.startedAt, label: `Challenge begonnen: ${assignment.challenge.title}` }
          : undefined;
    return activity ? [{ id: `challenge:${assignment.id}`, kind: "challenge", ...activity }] : [];
  });
  const labs = input.labs.map((lab): TrainerActivityItem => ({
    id: `lab:${lab.labId}`, kind: "lab", label: lab.latestCompletedAt?.getTime() === lab.latestActivityAt.getTime() ? `Lab abgeschlossen: ${lab.title}` : `Lab bearbeitet: ${lab.title}`,
    detail: `${lab.runCount} ${lab.runCount === 1 ? "Versuch" : "Versuche"} · ${lab.hintCount} ${lab.hintCount === 1 ? "Hinweis" : "Hinweise"}`, timestamp: lab.latestActivityAt,
  }));
  return [...learning, ...practiceHistory, ...challenges, ...labs]
    .filter((activity) => !Number.isNaN(activity.timestamp.getTime()))
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime() || left.id.localeCompare(right.id))
    .slice(0, 12);
}
export function buildTrainerLabViews(
  aggregates: readonly TrainerLabAggregateRecord[],
  definitions: readonly TrainerLabDefinition[],
) {
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  return aggregates.map((aggregate): TrainerLabView => {
    const definition = definitionsById.get(aggregate.labId);
    const hasCompleted = aggregate.completedAttemptCount > 0;
    const hasActive = aggregate.activeAttemptCount > 0;
    const supportSuggested = !hasCompleted && hasActive && (aggregate.runCount > 1 || aggregate.hintCount > 1);
    const signals = [
      ...(!hasCompleted && hasActive ? ["Noch nicht abgeschlossen"] : []),
      ...(aggregate.runCount > 1 ? ["Mehrere Versuche"] : []),
      ...(aggregate.hintCount > 0 ? ["Hinweise verwendet"] : []),
      ...(supportSuggested ? ["Unterstützung könnte hilfreich sein"] : []),
    ];
    return {
      ...aggregate,
      title: definition?.title ?? "Nicht mehr veröffentlichtes Lab",
      category: definition?.category ?? "Archiviert",
      hasCompleted,
      hasActive,
      supportSuggested,
      signals,
    };
  }).sort((left, right) => right.latestActivityAt.getTime() - left.latestActivityAt.getTime() || left.title.localeCompare(right.title, "de"));
}

export function parseTrainerOverviewFilters(input: {
  query?: string;
  moduleSlug?: string;
  status?: string;
  focus?: string;
}): TrainerOverviewFilters {
  const status = input.status === "not-started" || input.status === "in-progress" || input.status === "completed" ? input.status : "all";
  const focus = isTrainerFocus(input.focus) ? input.focus : "all";
  return {
    query: input.query?.trim().slice(0, 120) ?? "",
    moduleSlug: learningModules.some((learningModule) => learningModule.slug === input.moduleSlug) ? input.moduleSlug! : "",
    status,
    focus,
  };
}

export function filterTrainerLearnerReports<T extends {
  learner: LearnerAccountRecord;
  progress: ReturnType<typeof getAdminProgressView>;
  labs: readonly TrainerLabView[];
  challenges: readonly ChallengeAssignment[];
  challengeCounts: ReturnType<typeof summarizeChallengeAssignments>;
  planning: readonly CurriculumAssignmentView[];
}>(reports: readonly T[], filters: TrainerOverviewFilters) {
  const query = filters.query.toLocaleLowerCase("de");
  return reports.filter((report) => {
    if (query && !`${report.learner.displayName} ${report.learner.login}`.toLocaleLowerCase("de").includes(query)) return false;
    const selectedModule = filters.moduleSlug ? report.progress.modules.find((item) => item.slug === filters.moduleSlug) : undefined;
    if (filters.status !== "all" && (selectedModule?.summary.status ?? overallStatus(report.progress)) !== filters.status) return false;
    if (filters.focus === "lab-active" && !report.labs.some((lab) => lab.hasActive)) return false;
    if (filters.focus === "lab-support" && !report.labs.some((lab) => lab.supportSuggested)) return false;
    if (filters.focus === "challenge-open" && !report.challenges.some((assignment) => assignment.status !== "approved" && assignment.status !== "legacy-completed")) return false;
    if (filters.focus === "challenge-review" && report.challengeCounts.submitted + report.challengeCounts.revisionRequested === 0) return false;
    if (filters.focus === "curriculum-active" && report.planning.length === 0) return false;
    if (filters.focus === "curriculum-overdue" && !report.planning.some((assignment) => assignment.isOverdue)) return false;
    return true;
  });
}

function summarizeChallengeAssignments(assignments: readonly ChallengeAssignment[]) {
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

function summarizeLabs(labs: readonly TrainerLabView[], canonicalTotal: number, now: Date) {
  const recentCutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  return {
    canonicalTotal,
    attempted: labs.length,
    completed: labs.filter((lab) => lab.hasCompleted).length,
    active: labs.filter((lab) => lab.hasActive).length,
    supportSuggested: labs.filter((lab) => lab.supportSuggested).length,
    completedRecently: labs.filter((lab) => lab.latestCompletedAt && lab.latestCompletedAt.getTime() >= recentCutoff).length,
  };
}

function emptyLearnerFacts(learnerId: string): TrainerLearnerFacts {
  return {
    learnerId,
    totalXp: 0,
    completedPracticeQuizCount: 0,
    answeredPracticeQuestionCount: 0,
    correctPracticeQuestionCount: 0,
    latestPracticeQuizAt: null,
  };
}

function compareLearnerReports(
  left: { learner: LearnerAccountRecord },
  right: { learner: LearnerAccountRecord },
) {
  return left.learner.displayName.localeCompare(right.learner.displayName, "de")
    || left.learner.login.localeCompare(right.learner.login, "de")
    || left.learner.id.localeCompare(right.learner.id);
}

function buildAttentionList(
  challengeAssignments: readonly ChallengeAssignment[],
  planning: readonly CurriculumAssignmentView[],
  learnerReports: readonly { learner: LearnerAccountRecord; labs: readonly TrainerLabView[] }[],
) {
  const challengeItems = challengeAssignments.flatMap((assignment): TrainerAttentionItem[] => {
    if (assignment.status === "revision-requested") return [challengeAttention(assignment, 0, "challenge-revision", "Überarbeitung angefordert", assignment.latestSubmission?.review?.reviewedAt ?? assignment.assignedAt)];
    if (assignment.isOverdue) return [challengeAttention(assignment, 1, "challenge-overdue", "Challenge überfällig", assignment.dueAt ?? assignment.assignedAt)];
    if (assignment.status === "submitted" && assignment.latestSubmission) return [challengeAttention(assignment, 2, "challenge-review", "Review ausstehend", assignment.latestSubmission.submittedAt)];
    return [];
  });
  const curriculumItems = planning.flatMap((assignment): TrainerAttentionItem[] => assignment.isOverdue && assignment.targetAt
    ? [{ id: `curriculum:${assignment.id}`, priority: 3, kind: "curriculum-overdue", label: "Lernplan-Ziel überschritten", detail: `${assignment.module.title} · ${assignment.progress.percentage} %`, timestamp: assignment.targetAt, href: `/admin/lernende/${assignment.learnerId}` }]
    : []);
  const labItems = learnerReports.flatMap((report) => report.labs.flatMap((lab): TrainerAttentionItem[] => lab.supportSuggested
    ? [{
      id: `lab:${report.learner.id}:${lab.labId}`,
      priority: 4,
      kind: "lab-support",
      label: "Lab-Unterstützung prüfen",
      detail: `${report.learner.displayName} · ${lab.title} · ${lab.runCount} Versuche · ${lab.hintCount} Hinweise`,
      timestamp: lab.latestActivityAt,
      href: `/admin/lernende/${report.learner.id}#lab-fortschritt`,
    }]
    : []));
  return [...challengeItems, ...curriculumItems, ...labItems]
    .sort((left, right) => left.priority - right.priority || left.timestamp.getTime() - right.timestamp.getTime() || left.id.localeCompare(right.id));
}

function overallStatus(progress: ReturnType<typeof getAdminProgressView>): LearnerStatus {
  if (!progress.hasProgress) return "not-started";
  return progress.overall.completedModules === progress.modules.length ? "completed" : "in-progress";
}

function isTrainerFocus(value: string | undefined): value is TrainerOverviewFilters["focus"] {
  return value === "all" || value === "lab-active" || value === "lab-support" || value === "challenge-open"
    || value === "challenge-review" || value === "curriculum-active" || value === "curriculum-overdue";
}

function challengeAttention(assignment: ChallengeAssignment, priority: number, kind: TrainerAttentionItem["kind"], label: string, timestamp: Date): TrainerAttentionItem {
  return { id: `challenge:${assignment.id}`, priority, kind, label, detail: `${assignment.learner.displayName} · ${assignment.challenge.title}`, timestamp, href: assignment.status === "submitted" && assignment.latestSubmission ? `/admin/challenges/abgaben/${assignment.latestSubmission.id}` : `/admin/lernende/${assignment.learner.id}` };
}

function groupBy<T>(values: readonly T[], key: (value: T) => string) {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const groupKey = key(value);
    const group = groups.get(groupKey) ?? [];
    group.push(value);
    groups.set(groupKey, group);
  }
  return groups;
}
