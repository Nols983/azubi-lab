import { learningModules } from "../data/learning-modules.ts";
import { quizzes } from "../data/quizzes.ts";
import { getModuleProgress, getOverallProgress, getQuizProgress, type LearnerProgressState } from "./learner-progress.ts";

const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export function getAdminProgressView(state: LearnerProgressState) {
  const overall = getOverallProgress(state, learningModules, quizModuleSlugs);
  const modules = learningModules.map((learningModule) => {
    const summary = getModuleProgress(state, learningModule, quizModuleSlugs.has(learningModule.slug));
    const completedLessons = (learningModule.lessons ?? [])
      .filter((lesson) => state.lessons[`${learningModule.slug}/${lesson.slug}`]?.status === "completed")
      .map((lesson) => lesson.title);
    return {
      slug: learningModule.slug,
      title: learningModule.title,
      category: learningModule.category,
      summary,
      completedLessons,
      quiz: getQuizProgress(state, learningModule.slug),
    };
  });
  const timestamps = [
    ...Object.values(state.lessons).map((lesson) => lesson.updatedAt),
    ...Object.values(state.quizzes).map((quiz) => quiz.lastSubmittedAt),
  ].filter(Boolean).sort();
  return {
    overall,
    modules,
    hasProgress: timestamps.length > 0,
    lastActivity: timestamps.at(-1),
    recentActivity: getRecentLearningActivity(state),
  };
}

function getRecentLearningActivity(state: LearnerProgressState) {
  const lessonActivity = learningModules.flatMap((learningModule) => (learningModule.lessons ?? []).flatMap((lesson) => {
    const progress = state.lessons[`${learningModule.slug}/${lesson.slug}`];
    if (!progress) return [];
    return [{
      id: `lesson:${learningModule.slug}/${lesson.slug}`,
      timestamp: progress.updatedAt,
      moduleTitle: learningModule.title,
      description: progress.status === "completed" ? `Lektion abgeschlossen: ${lesson.title}` : `Lektion geöffnet: ${lesson.title}`,
    }];
  }));
  const quizActivity = learningModules.flatMap((learningModule) => {
    const quiz = state.quizzes[learningModule.slug];
    if (!quiz) return [];
    return [{
      id: `quiz:${learningModule.slug}`,
      timestamp: quiz.lastSubmittedAt,
      moduleTitle: learningModule.title,
      description: `Abschlussquiz eingereicht: ${quiz.latestCorrectCount} von ${quiz.latestTotal} richtig`,
    }];
  });
  return [...lessonActivity, ...quizActivity]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp) || left.id.localeCompare(right.id))
    .slice(0, 5);
}
