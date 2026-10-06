"use server";

import { revalidatePath } from "next/cache";
import { getLearningModule, getLesson } from "../data/learning-modules";
import { getQuizForModule } from "../data/quizzes";
import { decodeLearnerProgress } from "../lib/progress-persistence";
import { validateQuizAnswers } from "../lib/quiz-answer-validation";
import { gradeQuiz } from "../lib/quiz-grading";
import type { LearnerProgressState } from "../lib/learner-progress";
import { CapabilityAuthorizationError, requireCapability } from "../lib/server/current-user";
import { assertLessonUnlockedForUser, assertQuizUnlockedForUser, LearningProgressionAccessError } from "../lib/server/learning-progression-service";
import { canonicalizeLocalProgress, getImportSnapshotHash, hasImportableProgress } from "../lib/server/progress-import";
import { importLearnerProgress, openLessonProgress, recordQuizProgress, setLessonProgressCompleted } from "../lib/server/progress-repository";
import type { DatabaseUser } from "../lib/server/user-repository";

export type ProgressActionResult =
  | { ok: true; state: LearnerProgressState }
  | { ok: false; message: string };

export async function openLessonAction(moduleSlug: unknown, lessonSlug: unknown): Promise<ProgressActionResult> {
  const lesson = validAvailableLesson(moduleSlug, lessonSlug);
  if (!lesson) return invalidRequest();
  return runMutation(async (user) => {
    await assertLessonUnlockedForUser(user, lesson.moduleSlug, lesson.lessonSlug);
    return openLessonProgress(user.id, lesson.moduleSlug, lesson.lessonSlug);
  });
}

export async function setLessonCompletionAction(moduleSlug: unknown, lessonSlug: unknown, completed: unknown): Promise<ProgressActionResult> {
  const lesson = validAvailableLesson(moduleSlug, lessonSlug);
  if (!lesson || typeof completed !== "boolean") return invalidRequest();
  const result = await runMutation(async (user) => {
    await assertLessonUnlockedForUser(user, lesson.moduleSlug, lesson.lessonSlug);
    return setLessonProgressCompleted(user.id, lesson.moduleSlug, lesson.lessonSlug, completed);
  });
  if (result.ok) revalidateProgressionSurfaces(lesson.moduleSlug, lesson.lessonSlug, completed);
  return result;
}

export async function submitQuizAction(moduleSlug: unknown, submittedAnswers: unknown): Promise<ProgressActionResult> {
  if (typeof moduleSlug !== "string") return invalidRequest();
  const quiz = getQuizForModule(moduleSlug);
  if (!quiz) return invalidRequest();
  const answers = validateQuizAnswers(quiz, submittedAnswers);
  if (!answers) return invalidRequest();
  const grade = gradeQuiz(quiz, answers);
  const result = await runMutation(async (user) => {
    await assertQuizUnlockedForUser(user, moduleSlug);
    return recordQuizProgress(user.id, moduleSlug, grade.correctCount, grade.totalCount);
  });
  if (result.ok) {
    revalidatePath(`/lernen/${moduleSlug}`);
    revalidatePath(`/lernen/${moduleSlug}/quiz`);
    revalidateXpSurfaces();
  }
  return result;
}

export async function importLocalProgressAction(rawPayload: unknown): Promise<ProgressActionResult> {
  if (typeof rawPayload !== "string" || rawPayload.length === 0 || rawPayload.length > 250_000) return invalidImport();
  const decoded = decodeLearnerProgress(rawPayload);
  if (!decoded.valid) return invalidImport();
  const canonicalProgress = canonicalizeLocalProgress(decoded.state);
  if (!hasImportableProgress(canonicalProgress)) return invalidImport();
  const snapshotHash = getImportSnapshotHash(canonicalProgress);
  return runMutation(async (user) => importLearnerProgress(user.id, snapshotHash, canonicalProgress));
}

async function runMutation(mutation: (user: DatabaseUser) => Promise<LearnerProgressState>): Promise<ProgressActionResult> {
  try {
    const learner = await requireCapability("recordLearningProgress");
    return { ok: true, state: await mutation(learner) };
  } catch (error) {
    if (error instanceof CapabilityAuthorizationError) {
      return { ok: false, message: "Im Betrachtermodus werden keine Lernstandsänderungen gespeichert." };
    }
    if (error instanceof LearningProgressionAccessError) {
      return { ok: false, message: error.target === "quiz" ? "Das Abschlussquiz ist noch gesperrt." : "Diese Lektion ist noch gesperrt." };
    }
    console.error("[azubi-lab] progress mutation failed", error instanceof Error ? error.name : "UnknownError");
    return { ok: false, message: "Der Konto-Lernstand konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }
}

function revalidateProgressionSurfaces(moduleSlug: string, lessonSlug: string, completed: boolean) {
  revalidatePath(`/lernen/${moduleSlug}`);
  revalidatePath(`/lernen/${moduleSlug}/${lessonSlug}`);
  if (!completed) return;
  const learningModule = getLearningModule(moduleSlug);
  const lessons = learningModule
    ? [...(learningModule.lessons ?? [])].filter((lesson) => lesson.status === "available").sort((a, b) => a.order - b.order)
    : [];
  const index = lessons.findIndex((lesson) => lesson.slug === lessonSlug);
  const next = lessons[index + 1];
  if (next) revalidatePath(`/lernen/${moduleSlug}/${next.slug}`);
  else revalidatePath(`/lernen/${moduleSlug}/quiz`);
  revalidateXpSurfaces();
}

function validAvailableLesson(moduleSlug: unknown, lessonSlug: unknown) {
  if (typeof moduleSlug !== "string" || typeof lessonSlug !== "string") return undefined;
  const learningModule = getLearningModule(moduleSlug);
  const lesson = getLesson(moduleSlug, lessonSlug);
  return learningModule && lesson?.status === "available" ? { moduleSlug: learningModule.slug, lessonSlug: lesson.slug } : undefined;
}

function invalidRequest(): ProgressActionResult {
  return { ok: false, message: "Diese Fortschrittsänderung ist nicht gültig." };
}

function invalidImport(): ProgressActionResult {
  return { ok: false, message: "Der lokale Lernstand ist ungültig oder enthält keine importierbaren Aktivitäten." };
}

function revalidateXpSurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/fortschritt");
}
