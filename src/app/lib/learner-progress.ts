import type { LearningModule } from "../data/learning-modules.ts";
import { deriveModuleLearningProgression } from "./learning-progression.ts";

export const LEARNER_PROGRESS_VERSION = 1 as const;

export type LearnerStatus = "not-started" | "in-progress" | "completed";

export type LessonProgressEntry = {
  status: Exclude<LearnerStatus, "not-started">;
  firstOpenedAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type QuizProgressEntry = {
  attempts: number;
  latestCorrectCount: number;
  latestTotal: number;
  latestPercentage: number;
  bestCorrectCount: number;
  bestTotal: number;
  bestPercentage: number;
  lastSubmittedAt: string;
};

export type LearnerProgressState = {
  version: typeof LEARNER_PROGRESS_VERSION;
  lessons: Readonly<Record<string, LessonProgressEntry>>;
  quizzes: Readonly<Record<string, QuizProgressEntry>>;
  progression: ProgressionEvidence;
};

export type ProgressionEvidence = {
  lessonCompletions: Readonly<Record<string, string>>;
  moduleQuizSubmissions: Readonly<Record<string, string>>;
};

export type ModuleActivitySummary = {
  completedActivities: number;
  totalActivities: number;
  completedLessons: number;
  totalLessons: number;
  quizAttempted: boolean;
  percentage: number;
  status: LearnerStatus;
};

export type OverallProgressSummary = {
  completedActivities: number;
  totalActivities: number;
  percentage: number;
  completedModules: number;
  inProgressModules: number;
  notStartedModules: number;
};

export type ContinueLearningTarget = {
  kind: "lesson" | "quiz";
  moduleSlug: string;
  moduleTitle: string;
  category: string;
  targetTitle: string;
  href: string;
  modulePercentage: number;
};

export const EMPTY_LEARNER_PROGRESS_STATE: LearnerProgressState = Object.freeze({
  version: LEARNER_PROGRESS_VERSION,
  lessons: Object.freeze({}),
  quizzes: Object.freeze({}),
  progression: Object.freeze({
    lessonCompletions: Object.freeze({}),
    moduleQuizSubmissions: Object.freeze({}),
  }),
});

export function createEmptyLearnerProgressState(): LearnerProgressState {
  return {
    version: LEARNER_PROGRESS_VERSION,
    lessons: {},
    quizzes: {},
    progression: { lessonCompletions: {}, moduleQuizSubmissions: {} },
  };
}

export function getLessonKey(moduleSlug: string, lessonSlug: string) {
  return `${moduleSlug}/${lessonSlug}`;
}

export function getLessonStatus(state: LearnerProgressState, moduleSlug: string, lessonSlug: string): LearnerStatus {
  return state.lessons[getLessonKey(moduleSlug, lessonSlug)]?.status ?? "not-started";
}

export function markLessonOpened(
  state: LearnerProgressState,
  moduleSlug: string,
  lessonSlug: string,
  available: boolean,
  timestamp: string,
): LearnerProgressState {
  if (!available) return state;
  const key = getLessonKey(moduleSlug, lessonSlug);
  const current = state.lessons[key];
  return {
    ...state,
    lessons: {
      ...state.lessons,
      [key]: current
        ? { ...current, updatedAt: timestamp }
        : { status: "in-progress", firstOpenedAt: timestamp, updatedAt: timestamp },
    },
  };
}

export function setLessonCompleted(
  state: LearnerProgressState,
  moduleSlug: string,
  lessonSlug: string,
  completed: boolean,
  available: boolean,
  timestamp: string,
): LearnerProgressState {
  if (!available) return state;
  const key = getLessonKey(moduleSlug, lessonSlug);
  const current = state.lessons[key];
  if (!completed && !current) return state;
  if (completed && current?.status === "completed") return state;
  if (!completed && current?.status === "in-progress") return state;
  const firstOpenedAt = current?.firstOpenedAt ?? timestamp;
  return {
    ...state,
    lessons: {
      ...state.lessons,
      [key]: completed
        ? { status: "completed", firstOpenedAt, updatedAt: timestamp, completedAt: timestamp }
        : { status: "in-progress", firstOpenedAt, updatedAt: timestamp },
    },
    progression: completed
      ? {
          ...state.progression,
          lessonCompletions: {
            ...state.progression.lessonCompletions,
            [key]: state.progression.lessonCompletions[key] ?? timestamp,
          },
        }
      : state.progression,
  };
}

export function recordQuizAttempt(
  state: LearnerProgressState,
  moduleSlug: string,
  correctCount: number,
  total: number,
  timestamp: string,
): LearnerProgressState {
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const current = state.quizzes[moduleSlug];
  const isNewBest = !current || percentage > current.bestPercentage
    || (percentage === current.bestPercentage && correctCount > current.bestCorrectCount);
  return {
    ...state,
    quizzes: {
      ...state.quizzes,
      [moduleSlug]: {
        attempts: (current?.attempts ?? 0) + 1,
        latestCorrectCount: correctCount,
        latestTotal: total,
        latestPercentage: percentage,
        bestCorrectCount: isNewBest ? correctCount : current.bestCorrectCount,
        bestTotal: isNewBest ? total : current.bestTotal,
        bestPercentage: isNewBest ? percentage : current.bestPercentage,
        lastSubmittedAt: timestamp,
      },
    },
    progression: {
      ...state.progression,
      moduleQuizSubmissions: {
        ...state.progression.moduleQuizSubmissions,
        [moduleSlug]: state.progression.moduleQuizSubmissions[moduleSlug] ?? timestamp,
      },
    },
  };
}

export function getQuizProgress(state: LearnerProgressState, moduleSlug: string) {
  return state.quizzes[moduleSlug];
}

export function getModuleProgress(
  state: LearnerProgressState,
  learningModule: LearningModule,
  hasQuiz: boolean,
): ModuleActivitySummary {
  const lessons = getAvailableLessons(learningModule);
  const completedLessons = lessons.filter((lesson) => getLessonStatus(state, learningModule.slug, lesson.slug) === "completed").length;
  const hasLessonActivity = lessons.some((lesson) => getLessonStatus(state, learningModule.slug, lesson.slug) !== "not-started");
  const quizAttempted = hasQuiz && Boolean(state.quizzes[learningModule.slug]?.attempts);
  const totalActivities = lessons.length + (hasQuiz ? 1 : 0);
  const completedActivities = completedLessons + (quizAttempted ? 1 : 0);
  const percentage = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;
  const hasActivity = hasLessonActivity || quizAttempted;
  const status: LearnerStatus = totalActivities > 0 && completedActivities === totalActivities
    ? "completed"
    : hasActivity ? "in-progress" : "not-started";
  return { completedActivities, totalActivities, completedLessons, totalLessons: lessons.length, quizAttempted, percentage, status };
}

export function getOverallProgress(
  state: LearnerProgressState,
  modules: readonly LearningModule[],
  quizModuleSlugs: ReadonlySet<string>,
): OverallProgressSummary {
  const moduleSummaries = modules.map((learningModule) => getModuleProgress(state, learningModule, quizModuleSlugs.has(learningModule.slug)));
  const completedActivities = moduleSummaries.reduce((total, summary) => total + summary.completedActivities, 0);
  const totalActivities = moduleSummaries.reduce((total, summary) => total + summary.totalActivities, 0);
  return {
    completedActivities,
    totalActivities,
    percentage: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0,
    completedModules: moduleSummaries.filter((summary) => summary.status === "completed").length,
    inProgressModules: moduleSummaries.filter((summary) => summary.status === "in-progress").length,
    notStartedModules: moduleSummaries.filter((summary) => summary.status === "not-started").length,
  };
}

export function getCategoryProgress(
  state: LearnerProgressState,
  modules: readonly LearningModule[],
  category: string,
  quizModuleSlugs: ReadonlySet<string>,
) {
  const categoryModules = modules.filter((learningModule) => learningModule.category === category);
  const summary = getOverallProgress(state, categoryModules, quizModuleSlugs);
  return summary.percentage;
}

export function getContinueLearningTarget(
  state: LearnerProgressState,
  modules: readonly LearningModule[],
  quizModuleSlugs: ReadonlySet<string>,
): ContinueLearningTarget | undefined {
  const inProgressLessons = modules.flatMap((learningModule) => getAvailableLessons(learningModule)
    .filter((lesson) => getLessonStatus(state, learningModule.slug, lesson.slug) === "in-progress")
    .map((lesson) => ({ learningModule, lesson, updatedAt: state.lessons[getLessonKey(learningModule.slug, lesson.slug)]?.updatedAt ?? "" })));
  const mostRecentLesson = inProgressLessons.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (mostRecentLesson) return lessonTarget(state, mostRecentLesson.learningModule, mostRecentLesson.lesson, quizModuleSlugs);

  const activeModules = modules.map((learningModule) => ({ learningModule, updatedAt: getModuleUpdatedAt(state, learningModule, quizModuleSlugs) }))
    .filter((item) => item.updatedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  for (const { learningModule } of activeModules) {
    const target = firstIncompleteTarget(state, learningModule, quizModuleSlugs);
    if (target) return target;
  }
  for (const learningModule of modules) {
    const target = firstIncompleteTarget(state, learningModule, quizModuleSlugs);
    if (target) return target;
  }
  return undefined;
}

function firstIncompleteTarget(state: LearnerProgressState, learningModule: LearningModule, quizModuleSlugs: ReadonlySet<string>) {
  const progression = deriveModuleLearningProgression(state, learningModule);
  const nextLesson = progression.lessons.find((item) => item.lesson.status === "available"
    && item.unlocked
    && (item.currentStatus !== "completed" || (!item.completedPreviously && !progression.quiz.submittedPreviously)));
  if (nextLesson) return lessonTarget(state, learningModule, nextLesson.lesson, quizModuleSlugs);
  if (quizModuleSlugs.has(learningModule.slug) && progression.quiz.unlocked && !state.quizzes[learningModule.slug]?.attempts) {
    return {
      kind: "quiz" as const,
      moduleSlug: learningModule.slug,
      moduleTitle: learningModule.title,
      category: learningModule.category,
      targetTitle: "Abschlussquiz",
      href: `/lernen/${learningModule.slug}/quiz`,
      modulePercentage: getModuleProgress(state, learningModule, true).percentage,
    };
  }
  return undefined;
}

function lessonTarget(state: LearnerProgressState, learningModule: LearningModule, lesson: NonNullable<LearningModule["lessons"]>[number], quizModuleSlugs: ReadonlySet<string>): ContinueLearningTarget {
  return {
    kind: "lesson",
    moduleSlug: learningModule.slug,
    moduleTitle: learningModule.title,
    category: learningModule.category,
    targetTitle: lesson.title,
    href: `/lernen/${learningModule.slug}/${lesson.slug}`,
    modulePercentage: getModuleProgress(state, learningModule, quizModuleSlugs.has(learningModule.slug)).percentage,
  };
}

function getModuleUpdatedAt(state: LearnerProgressState, learningModule: LearningModule, quizModuleSlugs: ReadonlySet<string>) {
  const timestamps = getAvailableLessons(learningModule)
    .map((lesson) => state.lessons[getLessonKey(learningModule.slug, lesson.slug)]?.updatedAt)
    .filter((timestamp): timestamp is string => Boolean(timestamp));
  if (quizModuleSlugs.has(learningModule.slug) && state.quizzes[learningModule.slug]?.lastSubmittedAt) timestamps.push(state.quizzes[learningModule.slug].lastSubmittedAt);
  return timestamps.sort().at(-1) ?? "";
}

function getAvailableLessons(learningModule: LearningModule) {
  return [...(learningModule.lessons ?? [])].filter((lesson) => lesson.status === "available").sort((a, b) => a.order - b.order);
}
