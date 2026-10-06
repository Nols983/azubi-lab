import "server-only";

import { isUuid } from "../account-security";
import { getAdminProgressView } from "../admin-progress";
import { buildCurriculumAssignmentViews } from "../curriculum-planning";
import { buildTrainerLabViews, buildTrainerRecentActivity } from "../trainer-reporting";
import { getLearningModule, learningModules } from "../../data/learning-modules";
import { findLearnerAccountById } from "./admin-repository";
import { getAdminLearnerChallengeView } from "./challenge-service";
import { listCurriculumAssignmentsForLearner } from "./curriculum-assignment-repository";
import { requireCapability } from "./current-user";
import { listCurrentLabDefinitions } from "./lab-definitions";
import { readOwnedPracticeQuizStatistics } from "./practice-quiz-statistics-repository";
import { buildPracticeQuizStatisticsFromRows } from "./practice-quiz-statistics-service";
import { getLearnerRewardState } from "./reward-service";
import { readLearnerProgress } from "./progress-repository";
import { readTrainerLabAggregatesForLearners } from "./trainer-lab-reporting-repository";
import { getTrainerReportingSnapshot } from "./trainer-reporting-service";

export async function getAdminDashboardData() {
  return getTrainerReportingSnapshot();
}

export async function getAdminLearnerDetail(userId: unknown) {
  await requireCapability("viewLearnerProgress");
  if (!isUuid(userId)) return undefined;
  const learner = await findLearnerAccountById(userId);
  if (!learner) return undefined;
  const [state, challenges, planningRecords, labAggregates, practiceRows, progression] = await Promise.all([
    readLearnerProgress(learner.id),
    getAdminLearnerChallengeView(learner.id),
    listCurriculumAssignmentsForLearner(learner.id, true),
    readTrainerLabAggregatesForLearners([learner.id]),
    readOwnedPracticeQuizStatistics(learner.id),
    getLearnerRewardState(learner.id),
  ]);
  const labDefinitions = listCurrentLabDefinitions()
    .filter(({ public: definition }) => definition.kind === "troubleshooting")
    .map(({ public: definition }) => ({
      id: definition.id,
      title: definition.title,
      category: definition.category,
    }));
  const planning = buildCurriculumAssignmentViews(planningRecords, state);
  const activePlanning = planning.filter((assignment) => !assignment.archivedAt);
  const activeModuleSlugs = new Set(activePlanning.map((assignment) => assignment.module.slug));
  const progress = getAdminProgressView(state);
  const labItems = buildTrainerLabViews(labAggregates, labDefinitions);
  const practice = buildPracticeQuizStatisticsFromRows(practiceRows);
  const latestPracticeQuizAt = practice.recentHistory.at(-1)?.completedAt;
  const activity = buildTrainerRecentActivity({
    progress,
    challenges: challenges.assignments,
    labs: labItems,
    practice: {
      completedQuizCount: practice.completedQuizCount,
      answeredQuestionCount: practice.answeredQuestionCount,
      correctQuestionCount: practice.correctQuestionCount,
      accuracyPercentage: practice.overallAccuracyPercentage,
      latestCompletedAt: latestPracticeQuizAt ? new Date(latestPracticeQuizAt) : null,
    },
    practiceHistory: practice.recentHistory,
  });
  return {
    learner,
    progress,
    challenges,
    practice,
    progression,
    activity,
    labs: {
      items: labItems,
      canonicalTotal: labDefinitions.length,
    },
    planning: {
      active: activePlanning,
      archived: planning.filter((assignment) => Boolean(assignment.archivedAt))
        .sort((left, right) => (right.archivedAt?.getTime() ?? 0) - (left.archivedAt?.getTime() ?? 0)),
      availableModules: learningModules
        .filter((learningModule) => !activeModuleSlugs.has(learningModule.slug))
        .map((learningModule) => ({
          module: learningModule,
          progress: progress.modules.find((item) => item.slug === learningModule.slug)?.summary,
        })),
    },
  };
}

export async function getAdminCurriculumReport() {
  return getTrainerReportingSnapshot();
}

export async function getAdminCurriculumModuleReport(moduleSlug: unknown) {
  await requireCapability("viewLearnerProgress");
  if (typeof moduleSlug !== "string") return undefined;
  const learningModule = getLearningModule(moduleSlug);
  if (!learningModule) return undefined;
  const report = await getTrainerReportingSnapshot();
  return report.curriculumModules.find((item) => item.module.slug === learningModule.slug);
}
