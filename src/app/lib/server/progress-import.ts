import "server-only";

import { createHash } from "node:crypto";
import { getLearningModule, getLesson } from "../../data/learning-modules.ts";
import { getQuizForModule } from "../../data/quizzes.ts";
import type { LearnerProgressState } from "../learner-progress.ts";

const EARLIEST_IMPORT_TIMESTAMP = Date.parse("2020-01-01T00:00:00.000Z");

export type ImportLesson = {
  moduleSlug: string;
  lessonSlug: string;
  status: "in-progress" | "completed";
  firstOpenedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
};

export type ImportQuiz = {
  moduleSlug: string;
  attempts: number;
  latestCorrectCount: number;
  latestTotal: number;
  latestPercentage: number;
  bestCorrectCount: number;
  bestTotal: number;
  bestPercentage: number;
  lastSubmittedAt: string | null;
};

export type CanonicalImport = {
  lessons: ImportLesson[];
  quizzes: ImportQuiz[];
};

export function canonicalizeLocalProgress(state: LearnerProgressState, serverNow = new Date()): CanonicalImport {
  const lessons: ImportLesson[] = [];
  for (const [key, entry] of Object.entries(state.lessons)) {
    const separator = key.indexOf("/");
    if (separator <= 0) continue;
    const moduleSlug = key.slice(0, separator);
    const lessonSlug = key.slice(separator + 1);
    const lesson = getLesson(moduleSlug, lessonSlug);
    if (!lesson || lesson.status !== "available") continue;
    const timestamps = [entry.firstOpenedAt, entry.updatedAt, entry.completedAt]
      .map((value) => safeImportTimestamp(value, serverNow))
      .filter((value): value is string => Boolean(value))
      .sort();
    lessons.push({
      moduleSlug,
      lessonSlug,
      status: entry.status,
      firstOpenedAt: timestamps[0] ?? null,
      updatedAt: timestamps.at(-1) ?? null,
      completedAt: entry.status === "completed" ? safeImportTimestamp(entry.completedAt, serverNow) : null,
    });
  }

  const quizzes: ImportQuiz[] = [];
  for (const [moduleSlug, entry] of Object.entries(state.quizzes)) {
    const learningModule = getLearningModule(moduleSlug);
    const quiz = getQuizForModule(moduleSlug);
    if (!learningModule || !quiz) continue;
    const canonicalTotal = quiz.questions.length;
    if (entry.latestTotal !== canonicalTotal || entry.bestTotal !== canonicalTotal) continue;
    if (entry.latestCorrectCount > canonicalTotal || entry.bestCorrectCount > canonicalTotal) continue;
    const latestPercentage = Math.round((entry.latestCorrectCount / canonicalTotal) * 100);
    const bestPercentage = Math.round((entry.bestCorrectCount / canonicalTotal) * 100);
    if (entry.latestPercentage !== latestPercentage || entry.bestPercentage !== bestPercentage) continue;
    quizzes.push({
      moduleSlug,
      attempts: entry.attempts,
      latestCorrectCount: entry.latestCorrectCount,
      latestTotal: canonicalTotal,
      latestPercentage,
      bestCorrectCount: entry.bestCorrectCount,
      bestTotal: canonicalTotal,
      bestPercentage,
      lastSubmittedAt: safeImportTimestamp(entry.lastSubmittedAt, serverNow),
    });
  }

  lessons.sort((a, b) => `${a.moduleSlug}/${a.lessonSlug}`.localeCompare(`${b.moduleSlug}/${b.lessonSlug}`));
  quizzes.sort((a, b) => a.moduleSlug.localeCompare(b.moduleSlug));
  return { lessons, quizzes };
}

export function getImportSnapshotHash(progress: CanonicalImport) {
  return createHash("sha256").update(JSON.stringify(progress)).digest("hex");
}

export function hasImportableProgress(progress: CanonicalImport) {
  return progress.lessons.length > 0 || progress.quizzes.length > 0;
}

function safeImportTimestamp(value: string | undefined, serverNow: Date) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time < EARLIEST_IMPORT_TIMESTAMP || time > serverNow.getTime()) return null;
  return new Date(time).toISOString();
}
