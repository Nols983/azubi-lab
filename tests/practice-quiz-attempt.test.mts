import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import {
  assessmentModulesByGroup,
  getQuizCategoryForModule,
  quizCategoryIds,
} from "../src/app/data/quiz-bank/categories.ts";
import { questionBank } from "../src/app/data/quiz-bank/question-bank.ts";
import {
  PracticeSelectionError,
  practiceQuestionCount,
  selectPracticeQuestions,
} from "../src/app/data/quiz-bank/practice-selection.ts";
import type { QuestionBankQuestion } from "../src/app/data/quiz-bank/types.ts";
import {
  createPracticeRandomSource,
  generatePracticeAttemptSeed,
  parsePersistedPracticeCategoryId,
  preparePracticeAttemptQuestions,
  projectPracticeAttempt,
  shufflePracticeQuestionOptions,
  type PracticeAttemptQuestionRecord,
  type PracticeAttemptRecord,
  PracticeAttemptValidationError,
  validateAndGradePracticeAnswers,
} from "../src/app/lib/server/practice-quiz-attempt-domain.ts";
import {
  parsePracticeAttemptCreationRequest,
  PracticeAttemptRequestError,
} from "../src/app/lib/server/practice-quiz-attempt-request.ts";

const attemptId = "00000000-0000-4000-8000-000000000101";
const userId = "00000000-0000-4000-8000-000000000102";
const categories = ["netzwerke", "systeme-storage-betrieb"] as const;

test("attempt randomization is deterministic per seed and independently varies questions and options", () => {
  const seed = "0123456789abcdef0123456789abcdef";
  const selected = selectForSeed(seed);
  const prepared = preparePracticeAttemptQuestions(selected, seed);
  assert.equal(prepared.length, practiceQuestionCount);
  assert.deepEqual(preparePracticeAttemptQuestions(selected, seed), prepared);
  assert.notDeepEqual(
    prepared.map((question) => question.questionId),
    selected.map((question) => question.id),
  );

  const differentSeed = "fedcba9876543210fedcba9876543210";
  const different = preparePracticeAttemptQuestions(selectForSeed(differentSeed), differentSeed);
  assert.notDeepEqual(
    different.map((question) => question.questionId),
    prepared.map((question) => question.questionId),
  );

  const permutations = new Set<string>();
  let changedOptionOrders = 0;
  for (const question of prepared) {
    const canonical = questionBank.find((candidate) => candidate.id === question.questionId);
    assert.ok(canonical);
    const canonicalLabels = new Map<string, string>(canonical.options.map((option) => [option.id, option.label]));
    assert.deepEqual(
      new Set(question.renderSnapshot.options.map((option) => option.id)),
      new Set(canonical.options.map((option) => option.id)),
    );
    assert.ok(question.renderSnapshot.options.every(
      (option) => canonicalLabels.get(option.id) === option.label,
    ));
    if (question.renderSnapshot.options.map((option) => option.id).join("|")
      !== canonical.options.map((option) => option.id).join("|")) changedOptionOrders += 1;
    const canonicalIndex = new Map<string, number>(canonical.options.map((option, index) => [option.id, index]));
    permutations.add(question.renderSnapshot.options.map((option) => canonicalIndex.get(option.id)).join(""));
  }
  assert.ok(changedOptionOrders > 0);
  assert.ok(permutations.size > 1);

  const sameQuestionPermutations = new Set(
    Array.from({ length: 16 }, (_, index) => shufflePracticeQuestionOptions(
      questionBank[0],
      index.toString(16).padStart(32, "0"),
      1,
    ).map((option) => option.id).join("|")),
  );
  assert.ok(sameQuestionPermutations.size > 1);
});

test("prepared questions freeze categories from the canonical module taxonomy", () => {
  const practiceQuestions = questionBank.filter((question) => question.practiceEligible);
  const prepared = preparePracticeAttemptQuestions(
    practiceQuestions,
    "0123456789abcdef0123456789abcdef",
  );
  assert.equal(prepared.length, practiceQuestions.length);
  assert.deepEqual(
    new Set(prepared.map((question) => question.renderSnapshot.moduleSlug)),
    new Set(Object.values(assessmentModulesByGroup).flat()),
  );
  for (const question of prepared) {
    assert.equal(
      question.categoryId,
      getQuizCategoryForModule(question.renderSnapshot.moduleSlug),
    );
  }
});

test("persisted practice categories are runtime validated", () => {
  for (const categoryId of quizCategoryIds) {
    assert.equal(parsePersistedPracticeCategoryId(categoryId), categoryId);
  }
  for (const value of [null, 1, "unbekannt", "Netzwerke"]) {
    expectValidationError(
      () => parsePersistedPracticeCategoryId(value),
      "CORRUPT_SNAPSHOT",
    );
  }
});

test("shuffleOptions false preserves canonical option order", () => {
  const canonical = questionBank[0];
  const fixed = { ...canonical, shuffleOptions: false } as QuestionBankQuestion;
  assert.deepEqual(
    shufflePracticeQuestionOptions(fixed, "0123456789abcdef0123456789abcdef", 1),
    canonical.options,
  );
});

test("in-progress projection is explicit, stable, and contains no answer-key material", () => {
  const record = createInProgressRecord("0123456789abcdef0123456789abcdef");
  const first = projectPracticeAttempt(record);
  const reload = projectPracticeAttempt(structuredClone(record));
  assert.deepEqual(reload, first);
  assert.equal(first.status, "in_progress");
  assert.deepEqual(Object.keys(first).sort(), [
    "id", "questionCount", "questions", "selectedCategoryIds", "startedAt", "status",
  ]);
  assert.equal(first.questions.length, 15);
  assert.equal(Object.hasOwn(first.questions[0], "categoryId"), false);
  const serialized = JSON.stringify(first);
  for (const forbidden of [
    "correctOptionId",
    "correctOptionIds",
    "explanation",
    "gradingSnapshot",
    "isCorrect",
    "correctness",
    "seed",
  ]) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("grading uses stable option IDs and immutable grading snapshots, not display positions or the live bank", () => {
  const record = createInProgressRecord("0123456789abcdef0123456789abcdef");
  const answers = correctAnswers(record.questions);
  const first = record.questions[0];
  const canonical = (questionBank as readonly QuestionBankQuestion[]).find((question) => question.id === first.questionId);
  assert.ok(canonical);
  const alternative = canonical.options.find(
    (option) => !first.gradingSnapshot.correctOptionIds.includes(option.id),
  );
  assert.ok(alternative);
  const changedLiveQuestion = canonical.type === "single-choice"
    ? { ...canonical, correctOptionId: alternative.id }
    : { ...canonical, correctOptionIds: [alternative.id, first.renderSnapshot.options[0].id] };
  assert.notDeepEqual(
    changedLiveQuestion.type === "single-choice"
      ? [changedLiveQuestion.correctOptionId]
      : changedLiveQuestion.correctOptionIds,
    first.gradingSnapshot.correctOptionIds,
  );

  const graded = validateAndGradePracticeAnswers(record.questions, answers);
  assert.equal(graded.length, 15);
  assert.equal(graded.every((answer) => answer.isCorrect), true);
  for (const answer of graded) {
    const question = record.questions.find((candidate) => candidate.questionId === answer.questionId);
    assert.ok(question);
    assert.equal(
      answer.isCorrect,
      sameSet(answer.selectedOptionIds, question.gradingSnapshot.correctOptionIds),
    );
  }
});

test("completion validation rejects malformed coverage, IDs, duplicates and invalid cardinality", () => {
  const record = createInProgressRecord("0123456789abcdef0123456789abcdef");
  const valid = correctAnswers(record.questions);
  expectValidationError(() => validateAndGradePracticeAnswers(record.questions, null), "INVALID_COMPLETION_INPUT");
  expectValidationError(() => validateAndGradePracticeAnswers(record.questions, [{}]), "INVALID_ANSWER");
  expectValidationError(
    () => validateAndGradePracticeAnswers(record.questions, valid.slice(0, -1)),
    "INVALID_QUESTION_COVERAGE",
  );
  expectValidationError(
    () => validateAndGradePracticeAnswers(record.questions, [
      ...valid.slice(0, -1),
      { questionId: "unknown:question", selectedOptionIds: ["a"] },
    ]),
    "UNKNOWN_QUESTION",
  );
  expectValidationError(
    () => validateAndGradePracticeAnswers(record.questions, [
      ...valid,
      { questionId: "unknown:extra-question", selectedOptionIds: ["a"] },
    ]),
    "UNKNOWN_QUESTION",
  );
  expectValidationError(
    () => validateAndGradePracticeAnswers(record.questions, [valid[0], ...valid]),
    "DUPLICATE_QUESTION",
  );

  const single = record.questions.find((question) => question.renderSnapshot.type === "single-choice");
  const multiple = record.questions.find((question) => question.renderSnapshot.type === "multiple-selection");
  assert.ok(single);
  assert.ok(multiple);
  const singleIndex = valid.findIndex((answer) => answer.questionId === single.questionId);
  const multipleIndex = valid.findIndex((answer) => answer.questionId === multiple.questionId);
  expectValidationError(
    () => validateAndGradePracticeAnswers(record.questions, replace(valid, singleIndex, {
      questionId: single.questionId,
      selectedOptionIds: [],
    })),
    "INVALID_CARDINALITY",
  );
  expectValidationError(
    () => validateAndGradePracticeAnswers(record.questions, replace(valid, singleIndex, {
      questionId: single.questionId,
      selectedOptionIds: single.renderSnapshot.options.slice(0, 2).map((option) => option.id),
    })),
    "INVALID_CARDINALITY",
  );
  expectValidationError(
    () => validateAndGradePracticeAnswers(record.questions, replace(valid, multipleIndex, {
      questionId: multiple.questionId,
      selectedOptionIds: [],
    })),
    "INVALID_CARDINALITY",
  );
  expectValidationError(
    () => validateAndGradePracticeAnswers(record.questions, replace(valid, singleIndex, {
      questionId: single.questionId,
      selectedOptionIds: ["unknown-option"],
    })),
    "UNKNOWN_OPTION",
  );
  expectValidationError(
    () => validateAndGradePracticeAnswers(record.questions, replace(valid, singleIndex, {
      questionId: single.questionId,
      selectedOptionIds: [single.renderSnapshot.options[0].id, single.renderSnapshot.options[0].id],
    })),
    "DUPLICATE_OPTION",
  );

  const validMultipleSubset = replace(valid, multipleIndex, {
    questionId: multiple.questionId,
    selectedOptionIds: [multiple.renderSnapshot.options[0].id],
  });
  assert.equal(validateAndGradePracticeAnswers(record.questions, validMultipleSubset).length, 15);
});

test("creation request validation normalizes malformed categories at the service boundary", () => {
  assert.deepEqual(
    parsePracticeAttemptCreationRequest({ categoryIds: ["netzwerke", "systeme-storage-betrieb"] }),
    { categoryIds: ["netzwerke", "systeme-storage-betrieb"] },
  );
  assert.deepEqual(
    parsePracticeAttemptCreationRequest({ categoryIds: ["server-dienste"] }),
    { categoryIds: ["systeme-storage-betrieb", "sicherheit-datenschutz"] },
  );

  for (const input of [
    null,
    {},
    { categoryIds: [] },
    { categoryIds: ["unbekannt"] },
    { categoryIds: ["netzwerke", "netzwerke"] },
    { categoryIds: ["netzwerke"], seed: "client-controlled" },
    { categoryIds: ["netzwerke"], categoryId: "netzwerke" },
  ]) {
    assert.throws(
      () => parsePracticeAttemptCreationRequest(input),
      (error) => error instanceof PracticeAttemptRequestError
        && !(error instanceof PracticeSelectionError),
    );
  }
});

test("completed projection exposes persisted result fields only after completion", () => {
  const record = createInProgressRecord("0123456789abcdef0123456789abcdef");
  const answers = correctAnswers(record.questions);
  const graded = validateAndGradePracticeAnswers(record.questions, answers);
  const completedAt = new Date("2026-08-28T12:30:00.000Z");
  const completed: PracticeAttemptRecord = {
    ...record,
    status: "completed",
    correctCount: graded.filter((answer) => answer.isCorrect).length,
    completedAt,
    updatedAt: completedAt,
    questions: record.questions.map((question, index) => ({
      ...question,
      submittedOptionIds: graded[index].selectedOptionIds,
      isCorrect: graded[index].isCorrect,
      answeredAt: completedAt,
    })),
  };
  const result = projectPracticeAttempt(completed);
  assert.equal(result.status, "completed");
  assert.equal(result.correctCount, 15);
  assert.equal(result.questionCount, 15);
  assert.equal(result.scorePercentage, 100);
  assert.equal(result.completedAt, completedAt.toISOString());
  assert.equal(result.questions.every((question) => question.isCorrect), true);
  assert.equal(Object.hasOwn(result.questions[0], "categoryId"), false);
  assert.equal(result.questions.every((question) => question.correctOptionIds.length > 0), true);
  assert.equal(result.questions.every((question) => question.explanation.length > 0), true);
});

test("migration and server-only persistence enforce lifecycle, ownership and immutable snapshots", async () => {
  const migration0009 = await readProjectFile("db/migrations/0009_practice_quiz_attempts.sql");
  const migration0010 = await readProjectFile("db/migrations/0010_practice_quiz_question_categories.sql");
  const repository = await readProjectFile("src/app/lib/server/practice-quiz-attempt-repository.ts");
  const service = await readProjectFile("src/app/lib/server/practice-quiz-attempt-service.ts");
  const request = await readProjectFile("src/app/lib/server/practice-quiz-attempt-request.ts");
  const quizPage = await readProjectFile("src/app/quiz/page.tsx");
  const migrationNames = (await readdir(new URL("../db/migrations/", import.meta.url)))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  assert.equal(migrationNames.at(-1), "0021_teams_and_memberships.sql");
  assert.match(migration0009, /CREATE TABLE practice_quiz_attempts/);
  assert.match(migration0009, /CREATE TABLE practice_quiz_attempt_questions/);
  assert.match(migration0009, /REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(migration0009, /UNIQUE \(attempt_id, question_id\)/);
  assert.match(migration0009, /PRIMARY KEY \(attempt_id, position\)/);
  assert.match(migration0009, /question_count = 15/);
  assert.match(migration0009, /status IN \('in_progress', 'completed'\)/);
  assert.equal((migration0009.match(/timestamptz/g) ?? []).length >= 5, true);
  assert.match(migration0009, /practice_quiz_question_snapshot_immutable/);
  assert.match(migration0009, /OLD\.status = 'completed'/);
  assert.match(migration0009, /NEW\.status IS DISTINCT FROM OLD\.status/);
  assert.match(migration0009, /NEW\.correct_count IS DISTINCT FROM OLD\.correct_count/);
  assert.match(migration0009, /NEW\.completed_at IS DISTINCT FROM OLD\.completed_at/);
  assert.match(migration0009, /practice_quiz_attempt_completion_immutable/);
  assert.match(migration0009, /OLD\.submitted_option_ids IS NOT NULL/);
  assert.match(migration0009, /NEW\.submitted_option_ids IS DISTINCT FROM OLD\.submitted_option_ids/);
  assert.match(migration0009, /NEW\.is_correct IS DISTINCT FROM OLD\.is_correct/);
  assert.match(migration0009, /NEW\.answered_at IS DISTINCT FROM OLD\.answered_at/);
  assert.match(migration0009, /practice_quiz_question_answer_immutable/);
  assert.doesNotMatch(migration0009, /ALTER TABLE (users|lesson_progress|quiz_progress)/);

  assert.match(migration0010, /ADD COLUMN category_id text/);
  const migration0010Modules = {
    netzwerke: ["ipv4-grundlagen", "subnetting", "dhcp", "dns"],
    betriebssysteme: ["linux-grundlagen", "windows-grundlagen"],
    "server-dienste": ["webserver-grundlagen", "active-directory-grundlagen"],
    troubleshooting: ["netzwerkfehler-systematisch-analysieren"],
  } as const;
  for (const categoryId of quizCategoryIds) {
    for (const moduleSlug of migration0010Modules[categoryId]) {
      assert.equal(
        migration0010.includes(`WHEN '${moduleSlug}' THEN '${categoryId}'`),
        true,
      );
    }
    assert.equal(migration0010.includes(`'${categoryId}'`), true);
  }
  assert.equal((migration0010.match(/\bWHEN '/g) ?? []).length, 9);
  assert.doesNotMatch(migration0010, /ELSE\s+'[^']+'/);
  assert.match(migration0010, /WHERE category_id IS NULL/);
  assert.match(migration0010, /RAISE EXCEPTION 'practice quiz question category backfill found an unknown module'/);
  assert.match(migration0010, /ALTER COLUMN category_id SET NOT NULL/);
  assert.match(migration0010, /practice_quiz_attempt_questions_category_check/);
  assert.match(migration0010, /NEW\.category_id IS DISTINCT FROM OLD\.category_id/);
  assert.match(migration0010, /practice_quiz_question_category_immutable/);
  assert.doesNotMatch(migration0010, /CREATE INDEX|SET render_snapshot/);
  const addColumnPosition = migration0010.indexOf("ADD COLUMN category_id text");
  const backfillPosition = migration0010.indexOf("UPDATE practice_quiz_attempt_questions");
  const verificationPosition = migration0010.indexOf("DO $$");
  const notNullPosition = migration0010.indexOf("ALTER COLUMN category_id SET NOT NULL");
  assert.ok(addColumnPosition < backfillPosition);
  assert.ok(backfillPosition < verificationPosition);
  assert.ok(verificationPosition < notNullPosition);

  assert.match(repository, /withTransaction/);
  assert.match(repository, /attempt\.user_id = \$2/);
  assert.match(repository, /FOR UPDATE OF attempt/);
  assert.match(repository, /status === "completed"\) return existing/);
  assert.match(repository, /JSON\.stringify\(question\.gradingSnapshot\)/);
  assert.match(repository, /parsePracticeRenderSnapshot/);
  assert.match(repository, /parsePracticeGradingSnapshot/);
  assert.match(repository, /parsePersistedPracticeCategoryId\(row\.category_id\)/);
  assert.match(repository, /getQuizCategoryForModule\(render\.moduleSlug\)/);
  assert.match(repository, /!categories\.includes\(question\.categoryId\)/);
  assert.match(repository, /getAssessmentGroupForModule\(question\.renderSnapshot\.moduleSlug\)/);
  assert.match(repository, /category_id,\s*render_snapshot/);
  assert.match(repository, /\[input\.attemptId, input\.userId\]/);
  assert.doesNotMatch(repository, /questionBank/);
  assert.match(service, /requireCapability\("recordQuizAttempts"\)/);
  assert.match(service, /parsePracticeAttemptCreationRequest\(input\)/);
  assert.match(service, /completedAttempt\.selectedCategoryIds/);
  assert.match(service, /completedAttempt\.status !== "completed"/);
  assert.doesNotMatch(service, /input\.userId|input\.seed|input\.correctCount|input\.score/);
  assert.doesNotMatch(service, /input\.categoryId/);
  assert.match(request, /error instanceof PracticeSelectionError/);
  assert.match(request, /throw new PracticeAttemptRequestError\(\)/);
  assert.match(quizPage, /PracticeCategorySelector/);
  assert.match(quizPage, /getCurrentDatabaseUser\(\)/);
  assert.match(quizPage, /assessmentGroupIds\.map/);
});

test("server-generated seeds have the persisted 128-bit hexadecimal format", () => {
  const seeds = new Set(Array.from({ length: 32 }, () => generatePracticeAttemptSeed()));
  assert.equal(seeds.size, 32);
  assert.equal([...seeds].every((seed) => /^[0-9a-f]{32}$/.test(seed)), true);
});

function selectForSeed(seed: string) {
  return selectPracticeQuestions(
    categories,
    createPracticeRandomSource(seed, "question-selection"),
  );
}

function createInProgressRecord(seed: string): PracticeAttemptRecord {
  const questions: PracticeAttemptQuestionRecord[] = preparePracticeAttemptQuestions(
    selectForSeed(seed),
    seed,
  ).map((question) => ({
    ...question,
    submittedOptionIds: null,
    isCorrect: null,
    answeredAt: null,
  }));
  const startedAt = new Date("2026-08-28T12:00:00.000Z");
  return {
    id: attemptId,
    userId,
    status: "in_progress",
    selectedCategoryIds: categories,
    seed,
    questionCount: practiceQuestionCount,
    correctCount: null,
    startedAt,
    completedAt: null,
    createdAt: startedAt,
    updatedAt: startedAt,
    questions,
  };
}

function correctAnswers(questions: readonly PracticeAttemptQuestionRecord[]) {
  return questions.map((question) => ({
    questionId: question.questionId,
    selectedOptionIds: [...question.gradingSnapshot.correctOptionIds],
  }));
}

function replace<T>(values: readonly T[], index: number, value: T) {
  const copy = [...values];
  copy[index] = value;
  return copy;
}

function expectValidationError(run: () => unknown, code: PracticeAttemptValidationError["code"]) {
  assert.throws(
    run,
    (error) => error instanceof PracticeAttemptValidationError && error.code === code,
  );
}

function sameSet(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function readProjectFile(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}
