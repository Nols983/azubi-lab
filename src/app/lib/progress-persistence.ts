import { createEmptyLearnerProgressState, getLessonKey, LEARNER_PROGRESS_VERSION, type LearnerProgressState, type LessonProgressEntry, type ProgressionEvidence, type QuizProgressEntry } from "./learner-progress.ts";

export const LEARNER_PROGRESS_STORAGE_KEY = "azubi-lab-progress:v1";

export interface ProgressPersistence {
  load(): LearnerProgressState;
  save(state: LearnerProgressState): void;
}

export class LocalStorageProgressPersistence implements ProgressPersistence {
  load() {
    if (typeof window === "undefined") return createEmptyLearnerProgressState();
    try {
      return parseLearnerProgress(window.localStorage.getItem(LEARNER_PROGRESS_STORAGE_KEY));
    } catch {
      return createEmptyLearnerProgressState();
    }
  }

  save(state: LearnerProgressState) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LEARNER_PROGRESS_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable or quota-restricted. The in-memory store remains usable.
    }
  }
}

export function parseLearnerProgress(raw: string | null): LearnerProgressState {
  return decodeLearnerProgress(raw).state;
}

export function decodeLearnerProgress(raw: string | null): { valid: boolean; state: LearnerProgressState } {
  if (!raw) return { valid: true, state: createEmptyLearnerProgressState() };
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || !hasOnlyKeys(value, ["version", "lessons", "quizzes", "progression"]) || value.version !== LEARNER_PROGRESS_VERSION || !isRecord(value.lessons) || !isRecord(value.quizzes)) {
      return invalidProgress();
    }
    const lessons: Record<string, LessonProgressEntry> = {};
    for (const [key, entry] of Object.entries(value.lessons)) {
      if (!isSafeStoredKey(key, true) || !isLessonProgressEntry(entry)) return invalidProgress();
      lessons[key] = entry.status === "completed"
        ? { status: entry.status, firstOpenedAt: entry.firstOpenedAt, updatedAt: entry.updatedAt, completedAt: entry.completedAt }
        : { status: entry.status, firstOpenedAt: entry.firstOpenedAt, updatedAt: entry.updatedAt };
    }
    const quizzes: Record<string, QuizProgressEntry> = {};
    for (const [key, entry] of Object.entries(value.quizzes)) {
      if (!isSafeStoredKey(key, false) || !isQuizProgressEntry(entry)) return invalidProgress();
      quizzes[key] = {
        attempts: entry.attempts,
        latestCorrectCount: entry.latestCorrectCount,
        latestTotal: entry.latestTotal,
        latestPercentage: entry.latestPercentage,
        bestCorrectCount: entry.bestCorrectCount,
        bestTotal: entry.bestTotal ?? entry.latestTotal,
        bestPercentage: entry.bestPercentage,
        lastSubmittedAt: entry.lastSubmittedAt,
      };
    }
    const progression = value.progression === undefined
      ? inferLegacyProgression(lessons, quizzes)
      : parseProgressionEvidence(value.progression);
    if (!progression) return invalidProgress();
    return { valid: true, state: { version: LEARNER_PROGRESS_VERSION, lessons, quizzes, progression } };
  } catch {
    return invalidProgress();
  }
}

function inferLegacyProgression(
  lessons: Readonly<Record<string, LessonProgressEntry>>,
  quizzes: Readonly<Record<string, QuizProgressEntry>>,
): ProgressionEvidence {
  return {
    lessonCompletions: Object.fromEntries(Object.entries(lessons)
      .filter(([, entry]) => entry.status === "completed" && entry.completedAt)
      .map(([key, entry]) => [key, entry.completedAt!])),
    moduleQuizSubmissions: Object.fromEntries(Object.entries(quizzes)
      .map(([moduleSlug, entry]) => [moduleSlug, entry.lastSubmittedAt])),
  };
}

function parseProgressionEvidence(value: unknown): ProgressionEvidence | undefined {
  if (!isRecord(value) || !hasOnlyKeys(value, ["lessonCompletions", "moduleQuizSubmissions"])
    || !isRecord(value.lessonCompletions) || !isRecord(value.moduleQuizSubmissions)) return undefined;
  const lessonCompletions: Record<string, string> = {};
  for (const [key, timestamp] of Object.entries(value.lessonCompletions)) {
    if (!isSafeStoredKey(key, true) || !isIsoTimestamp(timestamp)) return undefined;
    const separator = key.indexOf("/");
    if (separator <= 0 || getLessonKey(key.slice(0, separator), key.slice(separator + 1)) !== key) return undefined;
    lessonCompletions[key] = timestamp;
  }
  const moduleQuizSubmissions: Record<string, string> = {};
  for (const [key, timestamp] of Object.entries(value.moduleQuizSubmissions)) {
    if (!isSafeStoredKey(key, false) || !isIsoTimestamp(timestamp)) return undefined;
    moduleQuizSubmissions[key] = timestamp;
  }
  return { lessonCompletions, moduleQuizSubmissions };
}

function invalidProgress() {
  return { valid: false, state: createEmptyLearnerProgressState() };
}

function isLessonProgressEntry(value: unknown): value is LessonProgressEntry {
  if (!isRecord(value) || (value.status !== "in-progress" && value.status !== "completed")) return false;
  const allowedKeys = value.status === "completed"
    ? ["status", "firstOpenedAt", "updatedAt", "completedAt"]
    : ["status", "firstOpenedAt", "updatedAt"];
  if (!hasOnlyKeys(value, allowedKeys)) return false;
  if (!isIsoTimestamp(value.firstOpenedAt) || !isIsoTimestamp(value.updatedAt)) return false;
  if (value.status === "completed") return isIsoTimestamp(value.completedAt);
  return value.completedAt === undefined;
}

function isQuizProgressEntry(value: unknown): value is QuizProgressEntry {
  if (!isRecord(value) || !hasOnlyKeys(value, ["attempts", "latestCorrectCount", "latestTotal", "latestPercentage", "bestCorrectCount", "bestTotal", "bestPercentage", "lastSubmittedAt"])) return false;
  const bestTotal = value.bestTotal ?? value.latestTotal;
  return isNonNegativeInteger(value.attempts) && value.attempts > 0
    && isNonNegativeInteger(value.latestCorrectCount)
    && isNonNegativeInteger(value.latestTotal) && value.latestTotal > 0
    && value.latestCorrectCount <= value.latestTotal
    && isPercentage(value.latestPercentage) && value.latestPercentage === Math.round((value.latestCorrectCount / value.latestTotal) * 100)
    && isNonNegativeInteger(value.bestCorrectCount)
    && isNonNegativeInteger(bestTotal) && bestTotal > 0 && value.bestCorrectCount <= bestTotal
    && isPercentage(value.bestPercentage) && value.bestPercentage === Math.round((value.bestCorrectCount / bestTotal) * 100)
    && isIsoTimestamp(value.lastSubmittedAt);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPercentage(value: unknown): value is number {
  return isNonNegativeInteger(value) && value <= 100;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime()) && timestamp.toISOString() === value;
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]) {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isSafeStoredKey(key: string, lessonKey: boolean) {
  return key.length > 0 && key.length <= 300
    && key !== "__proto__" && key !== "constructor" && key !== "prototype"
    && (!lessonKey || key.includes("/"));
}
