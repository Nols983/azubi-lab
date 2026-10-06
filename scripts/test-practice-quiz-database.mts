import assert from "node:assert/strict";
import { getQuizCategoryForModule } from "../src/app/data/quiz-bank/categories.ts";
import {
  practiceQuestionCount,
  selectPracticeQuestions,
} from "../src/app/data/quiz-bank/practice-selection.ts";
import {
  createPracticeRandomSource,
  preparePracticeAttemptQuestions,
} from "../src/app/lib/server/practice-quiz-attempt-domain.ts";
import {
  completeOwnedPracticeAttempt,
  createPracticeAttemptRecord,
  findOwnedPracticeAttempt,
  PracticeAttemptNotFoundError,
} from "../src/app/lib/server/practice-quiz-attempt-repository.ts";
import { readOwnedPracticeQuizStatistics } from "../src/app/lib/server/practice-quiz-statistics-repository.ts";
import { getDatabasePool } from "../src/app/lib/server/db.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const userIds: string[] = [];
const attemptIds: string[] = [];

try {
  const learnerId = await insertUser(`practice-${suffix}-learner`, "Practice Learner", "learner");
  const otherLearnerId = await insertUser(`practice-${suffix}-other`, "Other Learner", "learner");
  const instructorId = await insertUser(`practice-${suffix}-instructor`, "Practice Instructor", "instructor");
  const adminId = await insertUser(`practice-${suffix}-admin`, "Practice Admin", "admin");
  await pool.query(
    `INSERT INTO lesson_progress
       (user_id, module_slug, lesson_slug, status, first_opened_at, updated_at, completed_at)
     VALUES ($1, 'ipv4-grundlagen', 'was-ist-eine-ip-adresse', 'completed', now(), now(), now())`,
    [learnerId],
  );
  await pool.query(
    `INSERT INTO quiz_progress
       (user_id, module_slug, attempts, latest_correct, latest_total, latest_percentage,
        best_correct, best_total, best_percentage, last_submitted_at)
     VALUES ($1, 'ipv4-grundlagen', 1, 1, 1, 100, 1, 1, 100, now())`,
    [learnerId],
  );
  const accountBefore = await readUnaffectedState(learnerId);

  const seed = "0123456789abcdef0123456789abcdef";
  const questions = prepareQuestions(seed);
  const created = await createPracticeAttemptRecord({
    userId: learnerId,
    selectedCategoryIds: ["netzwerke", "systeme-storage-betrieb"],
    seed,
    questions,
  });
  attemptIds.push(created.id);
  assert.equal(created.status, "in_progress");
  assert.equal(created.questionCount, 15);
  assert.equal(created.questions.length, 15);
  assert.deepEqual(created.questions.map((question) => question.position), Array.from({ length: 15 }, (_, index) => index + 1));
  assert.equal(new Set(created.questions.map((question) => question.questionId)).size, 15);
  assert.equal(created.questions.every(
    (question) => question.categoryId
      === getQuizCategoryForModule(question.renderSnapshot.moduleSlug),
  ), true);
  assert.equal(created.questions.every((question) => question.submittedOptionIds === null), true);
  assert.equal(created.startedAt instanceof Date, true);

  const inProgressStatistics = await readOwnedPracticeQuizStatistics(learnerId);
  assert.equal(Number(inProgressStatistics.summary.completed_quiz_count), 0);
  assert.equal(Number(inProgressStatistics.summary.answered_question_count), 0);
  assert.equal(inProgressStatistics.categoryAggregates.length, 0);

  const persistedCount = Number((await pool.query(
    "SELECT count(*) FROM practice_quiz_attempt_questions WHERE attempt_id = $1",
    [created.id],
  )).rows[0].count);
  assert.equal(persistedCount, practiceQuestionCount);
  const persistedSnapshots = (await pool.query<{
    category_id: string;
    position: number;
    render_snapshot: unknown;
    grading_snapshot: unknown;
  }>(
    `SELECT position, category_id, render_snapshot, grading_snapshot
     FROM practice_quiz_attempt_questions WHERE attempt_id = $1 ORDER BY position`,
    [created.id],
  )).rows;
  assert.deepEqual(persistedSnapshots.map((row) => row.render_snapshot), questions.map((question) => question.renderSnapshot));
  assert.deepEqual(persistedSnapshots.map((row) => row.grading_snapshot), questions.map((question) => question.gradingSnapshot));
  assert.deepEqual(persistedSnapshots.map((row) => row.category_id), questions.map((question) => question.categoryId));
  assert.deepEqual(
    persistedSnapshots.map((row) => row.category_id),
    questions.map((question) => getQuizCategoryForModule(question.renderSnapshot.moduleSlug)),
  );

  const reloaded = await findOwnedPracticeAttempt(created.id, learnerId);
  assert.ok(reloaded);
  assert.deepEqual(
    reloaded.questions.map((question) => [question.questionId, question.renderSnapshot.options.map((option) => option.id)]),
    created.questions.map((question) => [question.questionId, question.renderSnapshot.options.map((option) => option.id)]),
  );
  assert.equal(await findOwnedPracticeAttempt(created.id, otherLearnerId), undefined);
  await assert.rejects(
    () => completeOwnedPracticeAttempt({ attemptId: created.id, userId: otherLearnerId, answers: [] }),
    PracticeAttemptNotFoundError,
  );

  await assert.rejects(
    () => pool.query(
      "UPDATE practice_quiz_attempt_questions SET render_snapshot = '{}'::jsonb WHERE attempt_id = $1 AND position = 1",
      [created.id],
    ),
    (error: unknown) => postgresCode(error) === "P0001",
  );
  await assert.rejects(
    () => pool.query(
      `UPDATE practice_quiz_attempt_questions
       SET category_id = CASE
         WHEN category_id = 'netzwerke' THEN 'betriebssysteme'
         ELSE 'netzwerke'
       END
       WHERE attempt_id = $1 AND position = 1`,
      [created.id],
    ),
    (error: unknown) => postgresCode(error) === "P0001",
  );

  const answers = created.questions.map((question) => ({
    questionId: question.questionId,
    selectedOptionIds: [...question.gradingSnapshot.correctOptionIds],
  }));
  const completed = await completeOwnedPracticeAttempt({ attemptId: created.id, userId: learnerId, answers });
  assert.equal(completed.status, "completed");
  assert.equal(completed.correctCount, 15);
  assert.equal(completed.completedAt instanceof Date, true);
  assert.equal(completed.questions.every((question) => question.isCorrect), true);
  assert.deepEqual(completed.questions.map((question) => question.submittedOptionIds), answers.map((answer) => answer.selectedOptionIds));
  assert.equal(completed.questions.every((question) => question.answeredAt instanceof Date), true);

  const completedStatistics = await readOwnedPracticeQuizStatistics(learnerId);
  assert.equal(Number(completedStatistics.summary.completed_quiz_count), 1);
  assert.equal(Number(completedStatistics.summary.answered_question_count), 15);
  assert.equal(Number(completedStatistics.summary.correct_question_count), 15);
  assert.deepEqual(completedStatistics.recentHistory.map((item) => item.attempt_id), [created.id]);
  assert.equal(completedStatistics.categoryResults.length, 15);
  const expectedModuleCounts = new Map<string, number>();
  for (const question of created.questions) {
    expectedModuleCounts.set(
      question.renderSnapshot.moduleSlug,
      (expectedModuleCounts.get(question.renderSnapshot.moduleSlug) ?? 0) + 1,
    );
  }
  assert.deepEqual(
    completedStatistics.categoryAggregates.map((row) => [
      row.module_slug,
      Number(row.answered_question_count),
      Number(row.correct_question_count),
    ] as const).sort(([left], [right]) => left.localeCompare(right)),
    [...expectedModuleCounts].sort(([left], [right]) => left.localeCompare(right))
      .map(([moduleSlug, count]) => [moduleSlug, count, count]),
  );
  const otherUserStatistics = await readOwnedPracticeQuizStatistics(otherLearnerId);
  assert.equal(Number(otherUserStatistics.summary.completed_quiz_count), 0);
  assert.equal(Number(otherUserStatistics.summary.answered_question_count), 0);

  const duplicate = await completeOwnedPracticeAttempt({ attemptId: created.id, userId: learnerId, answers: null });
  assert.equal(duplicate.correctCount, completed.correctCount);
  assert.equal(duplicate.completedAt?.getTime(), completed.completedAt?.getTime());
  assert.deepEqual(
    duplicate.questions.map((question) => [question.submittedOptionIds, question.isCorrect, question.answeredAt?.getTime()]),
    completed.questions.map((question) => [question.submittedOptionIds, question.isCorrect, question.answeredAt?.getTime()]),
  );

  const secondSeed = "44444444444444444444444444444444";
  const secondAttempt = await createPracticeAttemptRecord({
    userId: learnerId,
    selectedCategoryIds: ["netzwerke", "systeme-storage-betrieb"],
    seed: secondSeed,
    questions: prepareQuestions(secondSeed),
  });
  attemptIds.push(secondAttempt.id);
  const secondCompleted = await completeOwnedPracticeAttempt({
    attemptId: secondAttempt.id,
    userId: learnerId,
    answers: secondAttempt.questions.map((question) => ({
      questionId: question.questionId,
      selectedOptionIds: [...question.gradingSnapshot.correctOptionIds],
    })),
  });
  assert.ok(secondCompleted.completedAt);

  const otherSeed = "55555555555555555555555555555555";
  const otherAttempt = await createPracticeAttemptRecord({
    userId: otherLearnerId,
    selectedCategoryIds: ["it-grundlagen-arbeitsplatz"],
    seed: otherSeed,
    questions: prepareQuestions(otherSeed, ["it-grundlagen-arbeitsplatz"]),
  });
  attemptIds.push(otherAttempt.id);
  await completeOwnedPracticeAttempt({
    attemptId: otherAttempt.id,
    userId: otherLearnerId,
    answers: otherAttempt.questions.map((question) => ({
      questionId: question.questionId,
      selectedOptionIds: [...question.gradingSnapshot.correctOptionIds],
    })),
  });

  const orderedStatistics = await readOwnedPracticeQuizStatistics(learnerId);
  assert.equal(Number(orderedStatistics.summary.completed_quiz_count), 2);
  assert.equal(Number(orderedStatistics.summary.answered_question_count), 30);
  const expectedNewestFirst = [completed, secondCompleted]
    .sort((left, right) => (right.completedAt?.getTime() ?? 0) - (left.completedAt?.getTime() ?? 0)
      || right.id.localeCompare(left.id))
    .map((attempt) => attempt.id);
  assert.deepEqual(
    orderedStatistics.recentHistory.map((attempt) => attempt.attempt_id),
    expectedNewestFirst,
  );
  const isolatedOtherStatistics = await readOwnedPracticeQuizStatistics(otherLearnerId);
  assert.equal(Number(isolatedOtherStatistics.summary.completed_quiz_count), 1);
  assert.equal(Number(isolatedOtherStatistics.summary.answered_question_count), 15);

  for (const statement of [
    "UPDATE practice_quiz_attempts SET status = 'in_progress' WHERE id = $1",
    "UPDATE practice_quiz_attempts SET correct_count = 14 WHERE id = $1",
    "UPDATE practice_quiz_attempts SET completed_at = completed_at + interval '1 second' WHERE id = $1",
  ]) {
    await assert.rejects(
      () => pool.query(statement, [created.id]),
      (error: unknown) => postgresCode(error) === "P0001",
    );
  }

  for (const statement of [
    "UPDATE practice_quiz_attempt_questions SET submitted_option_ids = ARRAY['forged'] WHERE attempt_id = $1 AND position = 1",
    "UPDATE practice_quiz_attempt_questions SET is_correct = NOT is_correct WHERE attempt_id = $1 AND position = 1",
    "UPDATE practice_quiz_attempt_questions SET answered_at = answered_at + interval '1 second' WHERE attempt_id = $1 AND position = 1",
  ]) {
    await assert.rejects(
      () => pool.query(statement, [created.id]),
      (error: unknown) => postgresCode(error) === "P0001",
    );
  }

  for (const [ownerId, roleSeed] of [[instructorId, "1"], [adminId, "2"]] as const) {
    const roleAttempt = await createPracticeAttemptRecord({
      userId: ownerId,
      selectedCategoryIds: ["it-grundlagen-arbeitsplatz"],
      seed: roleSeed.repeat(32),
      questions: prepareQuestions(roleSeed.repeat(32), ["it-grundlagen-arbeitsplatz"]),
    });
    attemptIds.push(roleAttempt.id);
    assert.equal(roleAttempt.userId, ownerId);
    assert.equal(roleAttempt.status, "in_progress");
  }

  const parentCountBeforeFailure = Number((await pool.query(
    "SELECT count(*) FROM practice_quiz_attempts WHERE user_id = $1",
    [otherLearnerId],
  )).rows[0].count);
  const failingQuestions = prepareQuestions("33333333333333333333333333333333").map((question, index) => index === 7
    ? {
        ...question,
        questionId: "ipv4-grundlagen:invalid_question",
        categoryId: "netzwerke" as const,
        renderSnapshot: {
          ...question.renderSnapshot,
          questionId: "ipv4-grundlagen:invalid_question",
          moduleSlug: "ipv4-grundlagen" as const,
        },
      }
    : question);
  await assert.rejects(
    () => createPracticeAttemptRecord({
      userId: otherLearnerId,
      selectedCategoryIds: ["netzwerke", "systeme-storage-betrieb"],
      seed: "33333333333333333333333333333333",
      questions: failingQuestions,
    }),
    (error: unknown) => postgresCode(error) === "23514",
  );
  const parentCountAfterFailure = Number((await pool.query(
    "SELECT count(*) FROM practice_quiz_attempts WHERE user_id = $1",
    [otherLearnerId],
  )).rows[0].count);
  assert.equal(parentCountAfterFailure, parentCountBeforeFailure);
  assert.deepEqual(await readUnaffectedState(learnerId), accountBefore);

  console.log("Practice quiz database integration: PASS");
} finally {
  if (attemptIds.length > 0) {
    await pool.query("DELETE FROM practice_quiz_attempts WHERE id = ANY($1::uuid[])", [attemptIds]);
  }
  if (userIds.length > 0) {
    await pool.query("DELETE FROM lesson_progress WHERE user_id = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM quiz_progress WHERE user_id = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  }
  await pool.end();
}

function prepareQuestions(seed: string, categories: readonly string[] = ["netzwerke", "systeme-storage-betrieb"]) {
  const selected = selectPracticeQuestions(
    categories,
    createPracticeRandomSource(seed, "question-selection"),
  );
  return preparePracticeAttemptQuestions(selected, seed);
}

async function insertUser(login: string, displayName: string, role: "learner" | "instructor" | "admin") {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role)
     VALUES ($1, $2, 'practice-integration-test-hash', $3)
     RETURNING id`,
    [login, displayName, role],
  );
  userIds.push(result.rows[0].id);
  return result.rows[0].id;
}

async function readUnaffectedState(ownerId: string) {
  const result = await pool.query<{
    auth_version: number;
    lesson_count: string;
    password_hash: string;
    quiz_progress_count: string;
    role: string;
  }>(
    `SELECT user_account.auth_version, user_account.password_hash, user_account.role,
       (SELECT count(*) FROM lesson_progress WHERE user_id = user_account.id) AS lesson_count,
       (SELECT count(*) FROM quiz_progress WHERE user_id = user_account.id) AS quiz_progress_count
     FROM users user_account WHERE user_account.id = $1`,
    [ownerId],
  );
  return result.rows[0];
}

function postgresCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
}
