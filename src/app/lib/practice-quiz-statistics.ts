import {
  assessmentGroupIds,
  isAssessmentGroupId,
  type AssessmentGroupId,
} from "../data/quiz-bank/categories.ts";

export type PracticeQuizHistorySource = {
  attemptId: string;
  correctCount: number;
  questionCount: number;
  completedAt: string;
};

export type PracticeQuizCategoryAggregateSource = {
  categoryId: AssessmentGroupId;
  answeredQuestionCount: number;
  correctQuestionCount: number;
};

export type PracticeQuizCategoryResultSource = {
  categoryId: AssessmentGroupId;
  isCorrect: boolean;
  completedAt: string;
  attemptId: string;
  position: number;
};

export type PracticeQuizStatisticsSource = {
  completedQuizCount: number;
  answeredQuestionCount: number;
  correctQuestionCount: number;
  recentHistory: readonly PracticeQuizHistorySource[];
  categoryAggregates: readonly PracticeQuizCategoryAggregateSource[];
  categoryResults: readonly PracticeQuizCategoryResultSource[];
};

export type PracticeQuizCategoryTrend = {
  windowSize: number;
  previousCorrectCount: number;
  recentCorrectCount: number;
  previousAccuracyPercentage: number;
  recentAccuracyPercentage: number;
  changePercentagePoints: number;
};

export type PersonalPracticeQuizStatistics = {
  completedQuizCount: number;
  answeredQuestionCount: number;
  correctQuestionCount: number;
  overallAccuracyPercentage: number | null;
  recentHistory: readonly (PracticeQuizHistorySource & {
    accuracyPercentage: number;
  })[];
  categories: readonly {
    categoryId: AssessmentGroupId;
    answeredQuestionCount: number;
    correctQuestionCount: number;
    accuracyPercentage: number | null;
    trend: PracticeQuizCategoryTrend | null;
  }[];
};

export class PracticeQuizStatisticsValidationError extends Error {
  constructor() {
    super("Practice quiz statistics data is invalid.");
    this.name = "PracticeQuizStatisticsValidationError";
  }
}

export function buildPersonalPracticeQuizStatistics(
  source: PracticeQuizStatisticsSource,
): PersonalPracticeQuizStatistics {
  assertCount(source.completedQuizCount);
  assertCount(source.answeredQuestionCount);
  assertCount(source.correctQuestionCount);
  if (source.correctQuestionCount > source.answeredQuestionCount) fail();

  const recentHistory = source.recentHistory.map((item) => {
    if (!item.attemptId || !Number.isInteger(item.questionCount) || item.questionCount < 1
      || !Number.isInteger(item.correctCount) || item.correctCount < 0
      || item.correctCount > item.questionCount) fail();
    return {
      ...item,
      completedAt: normalizeInstant(item.completedAt),
      accuracyPercentage: percentage(item.correctCount, item.questionCount),
    };
  });
  if (new Set(recentHistory.map((item) => item.attemptId)).size !== recentHistory.length) fail();
  const normalizedHistory = [...recentHistory]
    .sort(compareChronology)
    .slice(-10);
  if (normalizedHistory.length !== Math.min(source.completedQuizCount, 10)) fail();

  const aggregateByCategory = new Map<AssessmentGroupId, PracticeQuizCategoryAggregateSource>();
  for (const aggregate of source.categoryAggregates) {
    if (!isAssessmentGroupId(aggregate.categoryId) || aggregateByCategory.has(aggregate.categoryId)) fail();
    assertCount(aggregate.answeredQuestionCount);
    assertCount(aggregate.correctQuestionCount);
    if (aggregate.correctQuestionCount > aggregate.answeredQuestionCount) fail();
    aggregateByCategory.set(aggregate.categoryId, { ...aggregate });
  }

  const categoryTotals = [...aggregateByCategory.values()].reduce(
    (total, aggregate) => ({
      answered: total.answered + aggregate.answeredQuestionCount,
      correct: total.correct + aggregate.correctQuestionCount,
    }),
    { answered: 0, correct: 0 },
  );
  if (categoryTotals.answered !== source.answeredQuestionCount
    || categoryTotals.correct !== source.correctQuestionCount) fail();

  const normalizedResults = source.categoryResults.map((result) => {
    if (!isAssessmentGroupId(result.categoryId) || typeof result.isCorrect !== "boolean"
      || !result.attemptId || !Number.isInteger(result.position) || result.position < 1) fail();
    return { ...result, completedAt: normalizeInstant(result.completedAt) };
  });
  const resultKeys = normalizedResults.map((result) => `${result.attemptId}:${result.position}`);
  if (new Set(resultKeys).size !== resultKeys.length) fail();

  const categories = assessmentGroupIds.map((categoryId) => {
    const aggregate = aggregateByCategory.get(categoryId) ?? {
      categoryId,
      answeredQuestionCount: 0,
      correctQuestionCount: 0,
    };
    const results = normalizedResults
      .filter((result) => result.categoryId === categoryId)
      .sort(compareChronology)
      .slice(-60);
    if (results.length !== Math.min(aggregate.answeredQuestionCount, 60)) fail();
    return {
      categoryId,
      answeredQuestionCount: aggregate.answeredQuestionCount,
      correctQuestionCount: aggregate.correctQuestionCount,
      accuracyPercentage: aggregate.answeredQuestionCount === 0
        ? null
        : percentage(aggregate.correctQuestionCount, aggregate.answeredQuestionCount),
      trend: calculatePracticeQuizCategoryTrend(
        aggregate.answeredQuestionCount,
        results.map((result) => result.isCorrect),
      ),
    };
  });

  return {
    completedQuizCount: source.completedQuizCount,
    answeredQuestionCount: source.answeredQuestionCount,
    correctQuestionCount: source.correctQuestionCount,
    overallAccuracyPercentage: source.answeredQuestionCount === 0
      ? null
      : percentage(source.correctQuestionCount, source.answeredQuestionCount),
    recentHistory: normalizedHistory,
    categories,
  };
}

export function calculatePracticeQuizCategoryTrend(
  totalAnsweredQuestionCount: number,
  chronologicalResults: readonly boolean[],
): PracticeQuizCategoryTrend | null {
  assertCount(totalAnsweredQuestionCount);
  if (totalAnsweredQuestionCount < 20) return null;

  const windowSize = Math.min(30, Math.floor(totalAnsweredQuestionCount / 2));
  if (chronologicalResults.length < windowSize * 2) fail();
  const relevantResults = chronologicalResults.slice(-(windowSize * 2));
  const previous = relevantResults.slice(0, windowSize);
  const recent = relevantResults.slice(windowSize);
  const previousCorrectCount = previous.filter(Boolean).length;
  const recentCorrectCount = recent.filter(Boolean).length;

  return {
    windowSize,
    previousCorrectCount,
    recentCorrectCount,
    previousAccuracyPercentage: percentage(previousCorrectCount, windowSize),
    recentAccuracyPercentage: percentage(recentCorrectCount, windowSize),
    changePercentagePoints: Math.round(
      ((recentCorrectCount - previousCorrectCount) * 100) / windowSize,
    ),
  };
}

function compareChronology(
  left: { completedAt: string; attemptId: string; position?: number },
  right: { completedAt: string; attemptId: string; position?: number },
) {
  return left.completedAt.localeCompare(right.completedAt)
    || (left.position ?? 0) - (right.position ?? 0)
    || left.attemptId.localeCompare(right.attemptId);
}

function percentage(correct: number, total: number) {
  return Math.round((correct / total) * 100);
}

function normalizeInstant(value: string) {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) fail();
  return instant.toISOString();
}

function assertCount(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) fail();
}

function fail(): never {
  throw new PracticeQuizStatisticsValidationError();
}
