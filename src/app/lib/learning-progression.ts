import { getLearningModule, getOrderedLessons, type LearningModule, type Lesson } from "../data/learning-modules.ts";
import type { LearnerProgressState, LearnerStatus } from "./learner-progress.ts";

export type LessonProgressionStatus = "completed" | "available" | "locked" | "planned";

export type LessonProgressionView = {
  lesson: Lesson;
  currentStatus: LearnerStatus;
  status: LessonProgressionStatus;
  unlocked: boolean;
  completedPreviously: boolean;
  prerequisite?: Pick<Lesson, "slug" | "title" | "order">;
  lockReason?: string;
};

export type QuizProgressionView = {
  unlocked: boolean;
  submittedPreviously: boolean;
  remainingLessonCount: number;
  lockReason?: string;
};

export type ModuleProgressionView = {
  moduleSlug: string;
  lessons: readonly LessonProgressionView[];
  quiz: QuizProgressionView;
};

export class LearningProgressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningProgressionError";
  }
}

export function getModuleLearningProgression(
  state: LearnerProgressState,
  moduleSlug: string,
  options: { bypass?: boolean } = {},
): ModuleProgressionView {
  const learningModule = getLearningModule(moduleSlug);
  if (!learningModule) throw new LearningProgressionError("Unknown learning module.");
  return deriveModuleLearningProgression(state, learningModule, options);
}

export function deriveModuleLearningProgression(
  state: LearnerProgressState,
  learningModule: LearningModule,
  options: { bypass?: boolean } = {},
): ModuleProgressionView {
  const ordered = getOrderedLessons(learningModule);
  validateCanonicalLessonOrder(ordered, learningModule);
  const regularLessons = ordered.filter((lesson) => lesson.status === "available");
  const moduleSubmittedPreviously = Boolean(state.progression.moduleQuizSubmissions[learningModule.slug]);
  const bypass = options.bypass === true;

  const lessons = ordered.map<LessonProgressionView>((lesson) => {
    const key = `${learningModule.slug}/${lesson.slug}`;
    const currentStatus = state.lessons[key]?.status ?? "not-started";
    if (lesson.status !== "available") {
      return { lesson, currentStatus, status: "planned", unlocked: false, completedPreviously: false };
    }
    const regularIndex = regularLessons.findIndex((candidate) => candidate.slug === lesson.slug);
    const prerequisite = regularIndex > 0 ? regularLessons[regularIndex - 1] : undefined;
    const completedPreviously = Boolean(state.progression.lessonCompletions[key]);
    const prerequisiteCompleted = prerequisite
      ? Boolean(state.progression.lessonCompletions[`${learningModule.slug}/${prerequisite.slug}`])
      : true;
    const unlocked = bypass || moduleSubmittedPreviously || completedPreviously || prerequisiteCompleted;
    const status: LessonProgressionStatus = !unlocked
      ? "locked"
      : currentStatus === "completed" ? "completed" : "available";
    return {
      lesson,
      currentStatus,
      status,
      unlocked,
      completedPreviously,
      prerequisite: prerequisite && !unlocked
        ? { slug: prerequisite.slug, title: prerequisite.title, order: prerequisite.order }
        : undefined,
      lockReason: prerequisite && !unlocked
        ? `Schließe zuerst Lektion ${prerequisite.order} „${prerequisite.title}“ ab.`
        : undefined,
    };
  });

  const remainingLessonCount = bypass || moduleSubmittedPreviously
    ? 0
    : regularLessons.filter((lesson) => !state.progression.lessonCompletions[`${learningModule.slug}/${lesson.slug}`]).length;
  const quizUnlocked = bypass || moduleSubmittedPreviously || remainingLessonCount === 0;
  return {
    moduleSlug: learningModule.slug,
    lessons,
    quiz: {
      unlocked: quizUnlocked,
      submittedPreviously: moduleSubmittedPreviously,
      remainingLessonCount,
      lockReason: quizUnlocked
        ? undefined
        : remainingLessonCount === 1
          ? "Schließe noch eine Lektion ab, um das Abschlussquiz freizuschalten."
          : `Schließe noch ${remainingLessonCount} Lektionen ab, um das Abschlussquiz freizuschalten.`,
    },
  };
}

export function getLessonProgression(view: ModuleProgressionView, lessonSlug: string) {
  const lesson = view.lessons.find((candidate) => candidate.lesson.slug === lessonSlug);
  if (!lesson) throw new LearningProgressionError("Unknown lesson in learning progression.");
  return lesson;
}

function validateCanonicalLessonOrder(lessons: readonly Lesson[], learningModule: LearningModule) {
  const slugs = new Set<string>();
  const orders = new Set<number>();
  for (const lesson of lessons) {
    if (slugs.has(lesson.slug) || orders.has(lesson.order)) {
      throw new LearningProgressionError(`Module ${learningModule.slug} has an ambiguous canonical lesson order.`);
    }
    slugs.add(lesson.slug);
    orders.add(lesson.order);
  }
}
