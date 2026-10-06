import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import {
  assessmentGroupIds,
  getAssessmentGroupForModule,
} from "../src/app/data/quiz-bank/categories.ts";
import { questionBank } from "../src/app/data/quiz-bank/question-bank.ts";
import type { QuestionBankQuestion } from "../src/app/data/quiz-bank/types.ts";
import {
  getIhkExamDeadline,
  getIhkExamScorePercentage,
  ihkExamCurriculumGroupQuestionCount,
  ihkExamDifficultyQuota,
  ihkExamDurationMinutes,
  ihkExamHistoryLimit,
  ihkExamPassDenominator,
  ihkExamPassNumerator,
  ihkExamQuestionCount,
  ihkExamQuestionTypeQuota,
  isIhkExamExpired,
  isIhkExamPassed,
} from "../src/app/lib/ihk-exam.ts";
import {
  gradeIhkExamQuestions,
  IhkExamValidationError,
  prepareIhkExamQuestions,
  projectIhkExamAttempt,
  validateIhkExamAnswer,
  type IhkExamAttemptRecord,
  type IhkExamQuestionRecord,
} from "../src/app/lib/server/ihk-exam-domain.ts";
import {
  getIhkExamGroupQuotas,
  IhkExamSelectionError,
  selectIhkExamQuestions,
} from "../src/app/lib/server/ihk-exam-selection.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const startedAt = new Date("2026-09-02T08:00:00.000Z");

test("IHK v1 configuration is exact and pass/fail never uses rounded percentages", () => {
  assert.equal(ihkExamQuestionCount, 30);
  assert.equal(ihkExamDurationMinutes, 45);
  assert.deepEqual(ihkExamDifficultyQuota, { easy: 8, medium: 16, hard: 6 });
  assert.deepEqual(ihkExamQuestionTypeQuota, { "single-choice": 16, "multiple-selection": 14 });
  assert.equal(ihkExamCurriculumGroupQuestionCount, 6);
  assert.equal(ihkExamPassNumerator, 1);
  assert.equal(ihkExamPassDenominator, 2);
  assert.equal(ihkExamHistoryLimit, 10);
  for (const [correct, passed] of [[0, false], [14, false], [15, true], [16, true], [30, true]] as const) {
    assert.equal(isIhkExamPassed(correct), passed);
  }
  assert.equal(getIhkExamScorePercentage(14), 47);
  assert.equal(getIhkExamScorePercentage(15), 50);
});

test("deadline is exactly 45 minutes and the server instant owns expiry", () => {
  const deadline = getIhkExamDeadline(startedAt);
  assert.equal(deadline.toISOString(), "2026-09-02T08:45:00.000Z");
  assert.equal(isIhkExamExpired(deadline, new Date("2026-09-02T08:44:59.999Z")), false);
  assert.equal(isIhkExamExpired(deadline, new Date("2026-09-02T08:45:00.000Z")), true);
  assert.equal(isIhkExamExpired(deadline, new Date("2026-09-02T09:00:00.000Z")), true);
  assert.equal(getIhkExamDeadline(startedAt).getTime(), deadline.getTime(), "reload must not reset the persisted start instant");
  assert.equal(
    getIhkExamDeadline(new Date("2026-09-02T10:00:00.000+02:00")).toISOString(),
    deadline.toISOString(),
    "timezone formatting must not influence the absolute deadline",
  );
});

test("selection fails closed when the configured pool cannot satisfy the quotas", () => {
  assert.throws(
    () => selectIhkExamQuestions("0123456789abcdef0123456789abcdef", []),
    IhkExamSelectionError,
  );
  assert.throws(() => selectIhkExamQuestions("client-controlled-seed"), IhkExamSelectionError);
});

test("256 deterministic seeds satisfy every exact quota without mutating the bank", () => {
  const bankHash = hash(questionBank);
  const selections = new Set<string>();
  const reachableModules = new Set<string>();
  for (let index = 0; index < 256; index += 1) {
    const seed = index.toString(16).padStart(32, "0");
    const first = selectIhkExamQuestions(seed);
    const second = selectIhkExamQuestions(seed);
    assert.deepEqual(second.map((question) => question.id), first.map((question) => question.id));
    assert.equal(first.length, 30);
    assert.equal(new Set(first.map((question) => question.id)).size, 30);
    assert.equal(first.every((question) => question.practiceEligible), true);
    assert.deepEqual(countBy(first, (question) => question.difficulty), ihkExamDifficultyQuota);
    assert.deepEqual(countBy(first, (question) => question.type), ihkExamQuestionTypeQuota);
    const categoryCounts = countBy(first, (question) => getAssessmentGroupForModule(question.moduleSlug));
    assert.deepEqual(Object.values(categoryCounts).sort(), [6, 6, 6, 6, 6]);
    assert.deepEqual(categoryCounts, getIhkExamGroupQuotas(seed));
    first.forEach((question) => reachableModules.add(question.moduleSlug));
    selections.add(first.map((question) => question.id).sort().join("|"));
  }
  assert.deepEqual(new Set(Object.keys(getIhkExamGroupQuotas("0".repeat(32)))), new Set(assessmentGroupIds));
  assert.ok(selections.size > 200);
  assert.equal(reachableModules.size, 27);
  assert.equal(hash(questionBank), bankHash);
});

test("presentation and option order are deterministic, namespaced and snapshot based", () => {
  const seed = "0123456789abcdef0123456789abcdef";
  const selected = selectIhkExamQuestions(seed);
  const first = prepareIhkExamQuestions(selected, seed);
  const second = prepareIhkExamQuestions(selected, seed);
  assert.deepEqual(second, first);
  assert.equal(first.length, 30);
  assert.deepEqual(first.map((question) => question.position), Array.from({ length: 30 }, (_, index) => index + 1));
  assert.equal(new Set(first.map((question) => question.questionId)).size, 30);
  for (const question of first) {
    const canonical = questionBank.find((candidate) => candidate.id === question.questionId);
    assert.ok(canonical);
    assert.deepEqual(new Set(question.renderSnapshot.options.map((option) => option.id)), new Set(canonical.options.map((option) => option.id)));
    assert.notEqual(question.renderSnapshot, canonical);
  }
});

test("answer editing validates identity, option IDs, uniqueness and cardinality", () => {
  const record = createInProgressRecord();
  const single = record.questions.find((question) => question.renderSnapshot.type === "single-choice");
  const multiple = record.questions.find((question) => question.renderSnapshot.type === "multiple-selection");
  assert.ok(single);
  assert.ok(multiple);
  const singleOption = single.renderSnapshot.options[0].id;
  assert.deepEqual(validateIhkExamAnswer(single, answer(single, [] as string[])).selectedOptionIds, []);
  assert.deepEqual(validateIhkExamAnswer(single, answer(single, [singleOption])).selectedOptionIds, [singleOption]);
  assert.deepEqual(validateIhkExamAnswer(multiple, answer(multiple, [])).selectedOptionIds, []);
  assert.deepEqual(validateIhkExamAnswer(multiple, answer(multiple, multiple.renderSnapshot.options.slice(0, 2).map((option) => option.id))).selectedOptionIds.length, 2);
  const reversedSelection = multiple.renderSnapshot.options.slice(0, 3).map((option) => option.id).reverse();
  assert.deepEqual(
    validateIhkExamAnswer(multiple, answer(multiple, reversedSelection)).selectedOptionIds,
    multiple.renderSnapshot.options.map((option) => option.id).filter((optionId) => reversedSelection.includes(optionId)),
  );
  expectValidation(() => validateIhkExamAnswer(single, answer(single, [singleOption, singleOption])), "DUPLICATE_OPTION");
  expectValidation(() => validateIhkExamAnswer(single, answer(single, [singleOption, single.renderSnapshot.options[1].id])), "INVALID_CARDINALITY");
  expectValidation(() => validateIhkExamAnswer(single, answer(single, ["forged-option"])), "UNKNOWN_OPTION");
  expectValidation(() => validateIhkExamAnswer(single, { ...answer(single, [singleOption]), questionId: "forged:question" }), "INVALID_ANSWER");
  expectValidation(() => validateIhkExamAnswer(single, { ...answer(single, [singleOption]), position: 30 }), "INVALID_ANSWER");
});

test("grading gives one unit per exact answer set and treats unanswered as incorrect", () => {
  const record = createInProgressRecord();
  const questions = record.questions.map((question, index) => ({
    ...question,
    selectedOptionIds: index === 0 ? [] : [...question.gradingSnapshot.correctOptionIds],
    answeredAt: index === 0 ? null : startedAt,
  }));
  const graded = gradeIhkExamQuestions(questions);
  assert.equal(graded.filter((answer) => answer.isCorrect).length, 29);
  assert.equal(graded[0].isCorrect, false);
  const multipleIndex = questions.findIndex((question) => question.renderSnapshot.type === "multiple-selection");
  const reorderedExactSet = questions.map((question, index) => index === multipleIndex
    ? { ...question, selectedOptionIds: [...question.gradingSnapshot.correctOptionIds].reverse() }
    : question);
  assert.equal(gradeIhkExamQuestions(reorderedExactSet)[multipleIndex].isCorrect, true);
  const partial = questions.map((question, index) => index === multipleIndex
    ? { ...question, selectedOptionIds: question.gradingSnapshot.correctOptionIds.slice(0, 1) }
    : question);
  assert.equal(gradeIhkExamQuestions(partial)[multipleIndex].isCorrect, false);
});

test("in-progress projection persists answers but leaks no answer key, score, seed or explanation", () => {
  const view = projectIhkExamAttempt(createInProgressRecord(), startedAt);
  assert.equal(view.status, "in_progress");
  assert.deepEqual(Object.keys(view).sort(), ["deadlineAt", "id", "questionCount", "questions", "serverNow", "startedAt", "status"]);
  const serialized = JSON.stringify(view);
  for (const forbidden of ["correctOptionIds", "gradingSnapshot", "explanation", "isCorrect", "correctCount", "passed", "seed"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("completed projection exposes immutable review and exact result fields", () => {
  const active = createInProgressRecord();
  const graded = gradeIhkExamQuestions(active.questions.map((question) => ({
    ...question,
    selectedOptionIds: [...question.gradingSnapshot.correctOptionIds],
    answeredAt: startedAt,
  })));
  const completedAt = new Date("2026-09-02T08:30:00.000Z");
  const completed: IhkExamAttemptRecord = {
    ...active,
    status: "completed",
    correctCount: 30,
    passed: true,
    completionReason: "submitted",
    completedAt,
    updatedAt: completedAt,
    questions: active.questions.map((question, index) => ({
      ...question,
      selectedOptionIds: graded[index].selectedOptionIds,
      answeredAt: completedAt,
      isCorrect: graded[index].isCorrect,
    })),
  };
  const result = projectIhkExamAttempt(completed, completedAt);
  assert.equal(result.status, "completed");
  assert.equal(result.correctCount, 30);
  assert.equal(result.passed, true);
  assert.equal(result.timeUsedSeconds, 1_800);
  assert.equal(result.questions.every((question) => question.isCorrect && question.explanation.length > 0), true);
});

test("migration, repository and routes enforce dedicated zero-XP exam architecture", async () => {
  const [migration, migration0011, repository, service, actions, page, component, landing, quizHub, migrationNames] = await Promise.all([
    source("db/migrations/0013_ihk_exam_simulation.sql"),
    source("db/migrations/0011_immutable_xp_ledger.sql"),
    source("src/app/lib/server/ihk-exam-repository.ts"),
    source("src/app/lib/server/ihk-exam-service.ts"),
    source("src/app/actions/ihk-exam-actions.ts"),
    source("src/app/quiz/ihk/[attemptId]/page.tsx"),
    source("src/app/components/quiz/ihk-exam-attempt.tsx"),
    source("src/app/quiz/ihk/page.tsx"),
    source("src/app/quiz/page.tsx"),
    readdir(new URL("../db/migrations/", import.meta.url)),
  ]);
  assert.equal(migrationNames.filter((name) => name.endsWith(".sql")).sort().at(-1), "0021_teams_and_memberships.sql");
  assert.match(migration, /CREATE TABLE ihk_exam_attempts/);
  assert.match(migration, /CREATE TABLE ihk_exam_attempt_questions/);
  assert.match(migration, /WHERE status = 'in_progress'/);
  assert.match(migration, /interval '45 minutes'/);
  assert.match(migration, /completion_reason IN \('submitted', 'timeout'\)/);
  assert.match(migration, /completed IHK exam attempt is immutable/);
  assert.match(migration, /completed IHK exam answer is immutable/);
  assert.doesNotMatch(migration, /xp_events|xp_amount/);
  assert.doesNotMatch(migration0011, /ihk/i);
  assert.match(repository, /WHERE id = \$1 AND user_id = \$2/);
  assert.match(repository, /FOR UPDATE/);
  assert.match(repository, /clock_timestamp\(\)/);
  assert.match(repository, /getAssessmentGroupForModule\(question\.renderSnapshot\.moduleSlug\)/);
  assert.match(repository, /groupCounts\.get\(groupId\)\?\.length !== 6/);
  assert.match(repository, /instant\.server_now >= attempt\.deadline_at AS expired/);
  assert.doesNotMatch(repository, /isIhkExamExpired/);
  assert.match(repository, /completionReason: row\.completion_reason/);
  assert.match(
    repository,
    /WHEN \$4::text = 'timeout' THEN deadline_at\s+ELSE \$5::timestamptz/,
  );
  assert.match(
    repository,
    /answered_at = CASE\s+WHEN cardinality\(\$3::text\[\]\) = 0 THEN NULL::timestamptz\s+ELSE \$4::timestamptz\s+END/,
  );
  assert.doesNotMatch(repository, /Promise\.all[\s\S]*client\.query/);
  assert.match(service, /requireCapability\("recordQuizAttempts"\)/);
  assert.doesNotMatch(`${repository}\n${service}\n${actions}`, /xp-repository|award.*Xp|INSERT INTO xp_events/i);
  assert.match(page, /getIhkExamAttempt\(attemptId\)/);
  assert.match(component, /saveIhkExamAnswerAction/);
  assert.match(component, /finalizeExpiredIhkExamAction/);
  assert.doesNotMatch(component, /localStorage|correctOptionIds.*InProgressExam/);
  assert.match(landing, /ersetzt keine offizielle IHK-Prüfung/);
  assert.match(quizHub, /ersetzt keine offizielle IHK-Prüfung/);
  assert.match(component, /keine offizielle IHK-Gewichtung/);
});

function createInProgressRecord(): IhkExamAttemptRecord {
  const seed = "0123456789abcdef0123456789abcdef";
  const questions: IhkExamQuestionRecord[] = prepareIhkExamQuestions(
    selectIhkExamQuestions(seed),
    seed,
  ).map((question) => ({ ...question, selectedOptionIds: [], answeredAt: null, isCorrect: null }));
  return {
    id: attemptId,
    userId,
    status: "in_progress",
    seed,
    questionCount: 30,
    correctCount: null,
    passed: null,
    completionReason: null,
    startedAt,
    deadlineAt: getIhkExamDeadline(startedAt),
    completedAt: null,
    createdAt: startedAt,
    updatedAt: startedAt,
    questions,
  };
}

function answer(question: IhkExamQuestionRecord, selectedOptionIds: readonly string[]) {
  return { position: question.position, questionId: question.questionId, selectedOptionIds };
}

function expectValidation(action: () => unknown, code: string) {
  assert.throws(action, (error) => error instanceof IhkExamValidationError && error.code === code);
}

function countBy<T extends string>(values: readonly QuestionBankQuestion[], select: (question: QuestionBankQuestion) => T) {
  return Object.fromEntries([...new Set(values.map(select))].sort().map((key) => [key, values.filter((value) => select(value) === key).length]));
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}
