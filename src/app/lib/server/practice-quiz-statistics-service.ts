import "server-only";

import { isUuid } from "../account-security.ts";
import {
  getAssessmentGroupForModule,
  isQuizModuleSlug,
  type AssessmentGroupId,
} from "../../data/quiz-bank/categories.ts";
import {
  buildPersonalPracticeQuizStatistics,
  PracticeQuizStatisticsValidationError,
  type PersonalPracticeQuizStatistics,
  type PracticeQuizStatisticsSource,
} from "../practice-quiz-statistics.ts";
import { getCurrentDatabaseUser } from "./current-user.ts";
import {
  readOwnedPracticeQuizStatistics,
  type PracticeQuizStatisticsRows,
} from "./practice-quiz-statistics-repository.ts";

export type PracticeQuizStatisticsPageData =
  | { audience: "anonymous" }
  | { audience: "password-change" }
  | { audience: "authenticated"; statistics: PersonalPracticeQuizStatistics };

export async function getCurrentPracticeQuizStatisticsPageData(): Promise<PracticeQuizStatisticsPageData> {
  const user = await getCurrentDatabaseUser();
  if (!user) return { audience: "anonymous" };
  if (user.mustChangePassword) return { audience: "password-change" };
  const rows = await readOwnedPracticeQuizStatistics(user.id);
  return {
    audience: "authenticated",
    statistics: buildPracticeQuizStatisticsFromRows(rows),
  };
}

export function buildPracticeQuizStatisticsFromRows(rows: PracticeQuizStatisticsRows) {
  const aggregateByGroup = new Map<AssessmentGroupId, {
    categoryId: AssessmentGroupId;
    answeredQuestionCount: number;
    correctQuestionCount: number;
  }>();
  for (const row of rows.categoryAggregates) {
    const groupId = getAssessmentGroupForModule(parseModuleSlug(row.module_slug));
    const aggregate = aggregateByGroup.get(groupId) ?? {
      categoryId: groupId,
      answeredQuestionCount: 0,
      correctQuestionCount: 0,
    };
    aggregate.answeredQuestionCount += parseCount(row.answered_question_count);
    aggregate.correctQuestionCount += parseCount(row.correct_question_count);
    aggregateByGroup.set(groupId, aggregate);
  }
  const source: PracticeQuizStatisticsSource = {
    completedQuizCount: parseCount(rows.summary.completed_quiz_count),
    answeredQuestionCount: parseCount(rows.summary.answered_question_count),
    correctQuestionCount: parseCount(rows.summary.correct_question_count),
    recentHistory: rows.recentHistory.map((row) => ({
      attemptId: parseAttemptId(row.attempt_id),
      correctCount: parseCount(row.correct_count),
      questionCount: parseCount(row.question_count),
      completedAt: parseInstant(row.completed_at),
    })),
    categoryAggregates: [...aggregateByGroup.values()],
    categoryResults: rows.categoryResults.map((row) => ({
      categoryId: getAssessmentGroupForModule(parseModuleSlug(row.module_slug)),
      isCorrect: parseBoolean(row.is_correct),
      completedAt: parseInstant(row.completed_at),
      attemptId: parseAttemptId(row.attempt_id),
      position: parsePositiveInteger(row.position),
    })),
  };
  return buildPersonalPracticeQuizStatistics(source);
}

function parseCount(value: unknown) {
  const count = typeof value === "number"
    ? value
    : typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)
      ? Number(value)
      : Number.NaN;
  if (!Number.isSafeInteger(count) || count < 0) throw invalidStatistics();
  return count;
}

function parsePositiveInteger(value: unknown) {
  const parsed = parseCount(value);
  if (parsed < 1) throw invalidStatistics();
  return parsed;
}

function parseAttemptId(value: unknown) {
  if (typeof value !== "string" || !isUuid(value)) throw invalidStatistics();
  return value;
}

function parseModuleSlug(value: unknown) {
  if (typeof value !== "string" || !isQuizModuleSlug(value)) throw invalidStatistics();
  return value;
}

function parseBoolean(value: unknown) {
  if (typeof value !== "boolean") throw invalidStatistics();
  return value;
}

function parseInstant(value: unknown) {
  if (!(typeof value === "string" || value instanceof Date)) throw invalidStatistics();
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) throw invalidStatistics();
  return instant.toISOString();
}

function invalidStatistics() {
  return new PracticeQuizStatisticsValidationError();
}
