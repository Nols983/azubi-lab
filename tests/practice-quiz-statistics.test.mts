import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { AssessmentGroupId } from "../src/app/data/quiz-bank/categories.ts";
import {
  buildPersonalPracticeQuizStatistics,
  calculatePracticeQuizCategoryTrend,
  type PracticeQuizCategoryResultSource,
  type PracticeQuizStatisticsSource,
} from "../src/app/lib/practice-quiz-statistics.ts";

test("empty personal statistics avoid a misleading zero-percent score", () => {
  const result = buildPersonalPracticeQuizStatistics(source());
  assert.equal(result.completedQuizCount, 0);
  assert.equal(result.answeredQuestionCount, 0);
  assert.equal(result.overallAccuracyPercentage, null);
  assert.equal(result.recentHistory.length, 0);
  assert.equal(result.categories.every((category) => category.accuracyPercentage === null), true);
});

test("one completed mixed-category quiz aggregates counts and persisted categories", () => {
  const results = [
    ...categoryResults("netzwerke", 8, 6, 1),
    ...categoryResults("systeme-storage-betrieb", 7, 5, 20),
  ];
  const statistics = buildPersonalPracticeQuizStatistics(source({
    completedQuizCount: 1,
    answeredQuestionCount: 15,
    correctQuestionCount: 11,
    recentHistory: [{ attemptId: attemptId(1), correctCount: 11, questionCount: 15, completedAt: instant(1) }],
    categoryAggregates: [
      { categoryId: "netzwerke", answeredQuestionCount: 8, correctQuestionCount: 6 },
      { categoryId: "systeme-storage-betrieb", answeredQuestionCount: 7, correctQuestionCount: 5 },
    ],
    categoryResults: results,
  }));
  assert.equal(statistics.overallAccuracyPercentage, 73);
  assert.deepEqual(
    statistics.categories.filter((category) => category.answeredQuestionCount > 0)
      .map((category) => [category.categoryId, category.answeredQuestionCount, category.correctQuestionCount]),
    [["netzwerke", 8, 6], ["systeme-storage-betrieb", 7, 5]],
  );
});

test("recent completed quiz history is limited to ten and presented older to newer", () => {
  const history = Array.from({ length: 12 }, (_, index) => ({
    attemptId: attemptId(index + 1),
    correctCount: index,
    questionCount: 15,
    completedAt: instant(index + 1),
  })).reverse();
  const statistics = buildPersonalPracticeQuizStatistics(source({
    completedQuizCount: 12,
    recentHistory: history.slice(0, 10),
  }));
  assert.deepEqual(
    statistics.recentHistory.map((item) => item.attemptId),
    Array.from({ length: 10 }, (_, index) => attemptId(index + 3)),
  );
});

test("trend window sizes follow the exact adjacent-window algorithm", () => {
  assert.equal(calculatePracticeQuizCategoryTrend(19, Array(19).fill(true)), null);
  for (const [total, expected] of [[20, 10], [24, 12], [40, 20], [60, 30], [100, 30]] as const) {
    const available = Math.min(total, 60);
    assert.equal(calculatePracticeQuizCategoryTrend(total, Array(available).fill(true))?.windowSize, expected);
  }
});

test("trend reports positive, negative, and neutral percentage-point changes", () => {
  const positive = calculatePracticeQuizCategoryTrend(20, [...Array(10).fill(false), ...Array(8).fill(true), false, false]);
  const negative = calculatePracticeQuizCategoryTrend(20, [...Array(8).fill(true), false, false, ...Array(10).fill(false)]);
  const neutral = calculatePracticeQuizCategoryTrend(20, [...Array(5).fill(true), ...Array(5).fill(false), ...Array(5).fill(true), ...Array(5).fill(false)]);
  assert.equal(positive?.changePercentagePoints, 80);
  assert.equal(negative?.changePercentagePoints, -80);
  assert.equal(neutral?.changePercentagePoints, 0);
});

test("category result chronology is deterministic for shuffled source rows", () => {
  const ordered = categoryResults("netzwerke", 20, 10, 1);
  const shuffled = [...ordered].sort((left, right) => right.position - left.position);
  const result = buildPersonalPracticeQuizStatistics(source({
    answeredQuestionCount: 20,
    correctQuestionCount: 10,
    categoryAggregates: [{ categoryId: "netzwerke", answeredQuestionCount: 20, correctQuestionCount: 10 }],
    categoryResults: shuffled,
  }));
  const network = result.categories.find((category) => category.categoryId === "netzwerke");
  assert.equal(network?.trend?.previousCorrectCount, 10);
  assert.equal(network?.trend?.recentCorrectCount, 0);
});

test("statistics repository is owned, completed-only, parameterized, deterministic, and bounded", async () => {
  const [repository, service] = await Promise.all([
    readFile("src/app/lib/server/practice-quiz-statistics-repository.ts", "utf8"),
    readFile("src/app/lib/server/practice-quiz-statistics-service.ts", "utf8"),
  ]);
  assert.match(repository, /user_id = \$1/g);
  assert.equal((repository.match(/status = 'completed'/g) ?? []).length, 4);
  assert.match(repository, /LIMIT 10/);
  assert.match(repository, /PARTITION BY question\.render_snapshot ->> 'moduleSlug'/);
  assert.match(repository, /recent_rank <= 60/);
  assert.match(repository, /ORDER BY module_slug ASC, completed_at ASC, position ASC, attempt_id ASC/);
  assert.doesNotMatch(repository, /question-bank|questionBank/);
  assert.match(service, /getCurrentDatabaseUser\(\)/);
  assert.match(service, /getAssessmentGroupForModule\(parseModuleSlug\(row\.module_slug\)\)/);
  assert.doesNotMatch(service, /getCurrentPracticeQuizStatisticsPageData\([^)]*userId/);
});

function source(overrides: Partial<PracticeQuizStatisticsSource> = {}): PracticeQuizStatisticsSource {
  return {
    completedQuizCount: 0,
    answeredQuestionCount: 0,
    correctQuestionCount: 0,
    recentHistory: [],
    categoryAggregates: [],
    categoryResults: [],
    ...overrides,
  };
}

function categoryResults(
  categoryId: AssessmentGroupId,
  total: number,
  correct: number,
  timestampOffset: number,
): PracticeQuizCategoryResultSource[] {
  return Array.from({ length: Math.min(total, 60) }, (_, index) => ({
    categoryId,
    isCorrect: index < correct,
    completedAt: instant(timestampOffset),
    attemptId: attemptId(timestampOffset),
    position: index + 1,
  }));
}

function attemptId(value: number) {
  return `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
}

function instant(value: number) {
  return new Date(Date.UTC(2026, 7, 1, 8, value)).toISOString();
}
