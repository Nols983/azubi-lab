import assert from "node:assert/strict";
import {
  prepareIhkExamQuestions,
  type PreparedIhkExamQuestion,
} from "../src/app/lib/server/ihk-exam-domain.ts";
import {
  completeOwnedIhkExam,
  findOwnedIhkExamRecord,
  IhkExamExpiredError,
  IhkExamNotFoundError,
  IhkExamNotWritableError,
  readIhkExamOverviewRecord,
  saveOwnedIhkExamAnswer,
  startOrResumeIhkExamRecord,
} from "../src/app/lib/server/ihk-exam-repository.ts";
import { selectIhkExamQuestions } from "../src/app/lib/server/ihk-exam-selection.ts";
import { getDatabasePool } from "../src/app/lib/server/db.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const userIds: string[] = [];

try {
  const appliedMigration = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations WHERE filename = '0013_ihk_exam_simulation.sql'",
  );
  assert.equal(appliedMigration.rows[0]?.filename, "0013_ihk_exam_simulation.sql");

  const learnerId = await insertUser(`ihk-${suffix}-learner`, "IHK Learner", "learner");
  const otherLearnerId = await insertUser(`ihk-${suffix}-other`, "IHK Other", "learner");
  const timeoutLearnerId = await insertUser(`ihk-${suffix}-timeout`, "IHK Timeout", "learner");
  const raceLearnerId = await insertUser(`ihk-${suffix}-race`, "IHK Race", "learner");
  const instructorId = await insertUser(`ihk-${suffix}-instructor`, "IHK Instructor", "instructor");
  const adminId = await insertUser(`ihk-${suffix}-admin`, "IHK Admin", "admin");
  const xpBefore = await readXpCount();
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
  const progressionBefore = await readProgressionState(learnerId);

  const firstSeed = "0123456789abcdef0123456789abcdef";
  const secondSeed = "fedcba9876543210fedcba9876543210";
  const concurrentStarts = await Promise.all([
    startOrResumeIhkExamRecord({
      userId: learnerId,
      seed: firstSeed,
      questions: prepareQuestions(firstSeed),
    }),
    startOrResumeIhkExamRecord({
      userId: learnerId,
      seed: secondSeed,
      questions: prepareQuestions(secondSeed),
    }),
  ]);
  assert.equal(concurrentStarts.filter((result) => result.created).length, 1);
  assert.equal(new Set(concurrentStarts.map((result) => result.record.id)).size, 1);
  const active = concurrentStarts[0].record;
  assert.equal(active.status, "in_progress");
  assert.equal(active.questions.length, 30);
  assert.equal(active.deadlineAt.getTime() - active.startedAt.getTime(), 45 * 60_000);
  assert.equal(await activeAttemptCount(learnerId), 1);
  const activeOverview = await readIhkExamOverviewRecord(learnerId);
  assert.equal(activeOverview.activeAttempt?.id, active.id);
  assert.equal(activeOverview.history.length, 0);

  const reloaded = await findOwnedIhkExamRecord(active.id, learnerId);
  assert.ok(reloaded);
  assert.equal(reloaded.record.startedAt.getTime(), active.startedAt.getTime());
  assert.equal(reloaded.record.deadlineAt.getTime(), active.deadlineAt.getTime());
  assert.equal(await findOwnedIhkExamRecord(active.id, otherLearnerId), undefined);
  await assert.rejects(
    () => saveOwnedIhkExamAnswer({
      attemptId: active.id,
      userId: otherLearnerId,
      answer: answer(active.questions[0], active.questions[0].gradingSnapshot.correctOptionIds),
    }),
    IhkExamNotFoundError,
  );

  const firstQuestion = active.questions[0];
  const wrongOption = firstQuestion.renderSnapshot.options.find(
    (option) => !firstQuestion.gradingSnapshot.correctOptionIds.includes(option.id),
  );
  if (wrongOption) {
    const firstSave = await saveOwnedIhkExamAnswer({
      attemptId: active.id,
      userId: learnerId,
      answer: answer(firstQuestion, [wrongOption.id]),
    });
    assert.deepEqual(firstSave.record.questions[0].selectedOptionIds, [wrongOption.id]);
  }
  const editedSave = await saveOwnedIhkExamAnswer({
    attemptId: active.id,
    userId: learnerId,
    answer: answer(firstQuestion, firstQuestion.gradingSnapshot.correctOptionIds),
  });
  const persistedOptionIds = editedSave.record.questions[0].selectedOptionIds;
  const displayedOptionIds = firstQuestion.renderSnapshot.options.map((option) => option.id);
  const expectedDisplayedOrder = displayedOptionIds.filter((optionId) =>
    firstQuestion.gradingSnapshot.correctOptionIds.includes(optionId),
  );
  assert.deepEqual(new Set(persistedOptionIds), new Set(firstQuestion.gradingSnapshot.correctOptionIds));
  assert.equal(new Set(persistedOptionIds).size, persistedOptionIds.length);
  assert.equal(persistedOptionIds.every((optionId) => displayedOptionIds.includes(optionId)), true);
  assert.deepEqual(persistedOptionIds, expectedDisplayedOrder);

  for (const question of active.questions.slice(1, 15)) {
    await saveOwnedIhkExamAnswer({
      attemptId: active.id,
      userId: learnerId,
      answer: answer(question, question.gradingSnapshot.correctOptionIds),
    });
  }
  const simultaneousSubmits = await Promise.all([
    completeOwnedIhkExam({ attemptId: active.id, userId: learnerId }),
    completeOwnedIhkExam({ attemptId: active.id, userId: learnerId }),
  ]);
  const completed = simultaneousSubmits[0];
  assert.equal(
    simultaneousSubmits[1].record.completedAt?.getTime(),
    completed.record.completedAt?.getTime(),
  );
  assert.equal(completed.record.status, "completed");
  assert.equal(completed.record.correctCount, 15);
  assert.equal(completed.record.passed, true);
  assert.equal(completed.record.completionReason, "submitted");
  assert.ok(completed.record.completedAt);
  assert.ok(completed.record.completedAt.getTime() < completed.record.deadlineAt.getTime());
  assert.equal(completed.record.questions.filter((question) => question.isCorrect).length, 15);
  assert.equal(completed.record.questions.filter((question) => question.answeredAt === null).length, 15);

  const duplicateCompletion = await completeOwnedIhkExam({ attemptId: active.id, userId: learnerId });
  assert.equal(duplicateCompletion.record.correctCount, completed.record.correctCount);
  assert.equal(duplicateCompletion.record.completedAt?.getTime(), completed.record.completedAt.getTime());
  await assert.rejects(
    () => saveOwnedIhkExamAnswer({
      attemptId: active.id,
      userId: learnerId,
      answer: answer(firstQuestion, []),
    }),
    IhkExamNotWritableError,
  );

  for (const statement of [
    "UPDATE ihk_exam_attempts SET correct_count = 14 WHERE id = $1",
    "UPDATE ihk_exam_attempts SET completed_at = completed_at + interval '1 second' WHERE id = $1",
    "UPDATE ihk_exam_attempt_questions SET selected_option_ids = ARRAY['forged'] WHERE attempt_id = $1 AND position = 1",
    "UPDATE ihk_exam_attempt_questions SET render_snapshot = '{}'::jsonb WHERE attempt_id = $1 AND position = 1",
  ]) {
    await assert.rejects(
      () => pool.query(statement, [active.id]),
      (error: unknown) => postgresCode(error) === "P0001",
    );
  }

  const overview = await readIhkExamOverviewRecord(learnerId);
  assert.equal(overview.activeAttempt, null);
  assert.equal(overview.history[0]?.id, active.id);
  assert.equal(overview.history[0]?.correctCount, 15);

  for (const [userId, seed] of [
    [instructorId, "11111111111111111111111111111111"],
    [adminId, "22222222222222222222222222222222"],
  ] as const) {
    const roleAttempt = await startOrResumeIhkExamRecord({
      userId,
      seed,
      questions: prepareQuestions(seed),
    });
    assert.equal(roleAttempt.record.userId, userId);
    assert.equal(roleAttempt.record.status, "in_progress");
  }

  const timeoutSeed = "33333333333333333333333333333333";
  const timeoutId = await insertExpiredAttempt(
    timeoutLearnerId,
    timeoutSeed,
    prepareQuestions(timeoutSeed),
  );
  const timeoutQuestions = prepareQuestions(timeoutSeed);
  for (const question of timeoutQuestions.slice(0, 3)) {
    await persistFixtureAnswer(timeoutId, question);
  }
  const timedOut = await findOwnedIhkExamRecord(timeoutId, timeoutLearnerId);
  assert.ok(timedOut);
  assert.equal(timedOut.record.status, "completed");
  assert.equal(timedOut.record.completionReason, "timeout");
  assert.equal(timedOut.record.correctCount, 3);
  assert.equal(timedOut.record.passed, false);
  assert.equal(timedOut.record.questions.filter((question) => question.isCorrect).length, 3);
  assert.equal(timedOut.record.questions.filter((question) => question.answeredAt === null).length, 27);
  assert.equal(timedOut.record.completedAt?.getTime(), timedOut.record.deadlineAt.getTime());
  assert.deepEqual(await readPersistedTimeoutPrecision(timeoutId), {
    completedAtEqualsDeadline: true,
    deadlineSubmillisecondMicroseconds: 980,
  });
  await assert.rejects(
    () => saveOwnedIhkExamAnswer({
      attemptId: timeoutId,
      userId: timeoutLearnerId,
      answer: answer(prepareQuestions(timeoutSeed)[0], []),
    }),
    IhkExamNotWritableError,
  );

  const expiredSaveSeed = "55555555555555555555555555555555";
  const expiredSaveId = await insertExpiredAttempt(
    otherLearnerId,
    expiredSaveSeed,
    prepareQuestions(expiredSaveSeed),
  );
  const expiredSaveQuestion = prepareQuestions(expiredSaveSeed)[0];
  await assert.rejects(
    () => saveOwnedIhkExamAnswer({
      attemptId: expiredSaveId,
      userId: otherLearnerId,
      answer: answer(expiredSaveQuestion, expiredSaveQuestion.gradingSnapshot.correctOptionIds),
    }),
    IhkExamExpiredError,
  );
  const expiredAfterSave = await findOwnedIhkExamRecord(expiredSaveId, otherLearnerId);
  assert.ok(expiredAfterSave);
  assert.equal(expiredAfterSave.record.status, "completed");
  assert.equal(expiredAfterSave.record.questions[0].selectedOptionIds.length, 0);

  const raceSeed = "44444444444444444444444444444444";
  const raceId = await insertExpiredAttempt(raceLearnerId, raceSeed, prepareQuestions(raceSeed));
  const raceQuestion = prepareQuestions(raceSeed)[0];
  const race = await Promise.allSettled([
    saveOwnedIhkExamAnswer({
      attemptId: raceId,
      userId: raceLearnerId,
      answer: answer(raceQuestion, raceQuestion.gradingSnapshot.correctOptionIds),
    }),
    completeOwnedIhkExam({ attemptId: raceId, userId: raceLearnerId }),
  ]);
  assert.equal(race.some((result) => result.status === "fulfilled"), true);
  assert.equal(race.every((result) => result.status === "fulfilled"
    || result.reason instanceof IhkExamNotWritableError), true);
  const raceResult = await findOwnedIhkExamRecord(raceId, raceLearnerId);
  assert.ok(raceResult);
  assert.equal(raceResult.record.status, "completed");
  assert.equal(raceResult.record.completionReason, "timeout");
  assert.equal(raceResult.record.completedAt?.getTime(), raceResult.record.deadlineAt.getTime());

  assert.equal(await readXpCount(), xpBefore);
  assert.deepEqual(await readProgressionState(learnerId), progressionBefore);
  console.log("IHK exam database integration: PASS");
} finally {
  if (userIds.length > 0) await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  await pool.end();
}

function prepareQuestions(seed: string) {
  return prepareIhkExamQuestions(selectIhkExamQuestions(seed), seed);
}

function answer(question: PreparedIhkExamQuestion, selectedOptionIds: readonly string[]) {
  return { position: question.position, questionId: question.questionId, selectedOptionIds };
}

async function insertUser(login: string, displayName: string, role: "learner" | "instructor" | "admin") {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role)
     VALUES ($1, $2, 'ihk-integration-test-hash', $3)
     RETURNING id`,
    [login, displayName, role],
  );
  userIds.push(result.rows[0].id);
  return result.rows[0].id;
}

async function activeAttemptCount(userId: string) {
  return Number((await pool.query(
    "SELECT count(*) FROM ihk_exam_attempts WHERE user_id = $1 AND status = 'in_progress'",
    [userId],
  )).rows[0].count);
}

async function readXpCount() {
  return Number((await pool.query(
    "SELECT count(*) FROM xp_events WHERE user_id = ANY($1::uuid[])",
    [userIds],
  )).rows[0].count);
}

async function readProgressionState(userId: string) {
  return (await pool.query<{
    lesson_count: string;
    quiz_count: string;
  }>(
    `SELECT
       (SELECT count(*) FROM lesson_progress WHERE user_id = $1) AS lesson_count,
       (SELECT count(*) FROM quiz_progress WHERE user_id = $1) AS quiz_count`,
    [userId],
  )).rows[0];
}

async function insertExpiredAttempt(
  userId: string,
  seed: string,
  questions: readonly PreparedIhkExamQuestion[],
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const attempt = (await client.query<{ id: string }>(
      `WITH instant AS (
         SELECT date_trunc('milliseconds', clock_timestamp() - interval '46 minutes')
           + interval '0.00098 seconds' AS started_at
       )
       INSERT INTO ihk_exam_attempts
         (user_id, seed, question_count, started_at, deadline_at, created_at, updated_at)
       SELECT $1, $2, 30, instant.started_at,
              instant.started_at + interval '45 minutes', instant.started_at, instant.started_at
       FROM instant
       RETURNING id`,
      [userId, seed],
    )).rows[0];
    assert.ok(attempt);
    for (const question of questions) {
      await client.query(
        `INSERT INTO ihk_exam_attempt_questions
           (attempt_id, position, question_id, question_revision, category_id,
            render_snapshot, grading_snapshot)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
        [
          attempt.id,
          question.position,
          question.questionId,
          question.questionRevision,
          question.categoryId,
          JSON.stringify(question.renderSnapshot),
          JSON.stringify(question.gradingSnapshot),
        ],
      );
    }
    await client.query("COMMIT");
    return attempt.id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function readPersistedTimeoutPrecision(attemptId: string) {
  return (await pool.query<{
    completed_at_equals_deadline: boolean;
    deadline_submillisecond_microseconds: number;
  }>(
    `SELECT completed_at = deadline_at AS completed_at_equals_deadline,
            mod(extract(microseconds FROM deadline_at)::integer, 1000)
              AS deadline_submillisecond_microseconds
     FROM ihk_exam_attempts
     WHERE id = $1`,
    [attemptId],
  )).rows.map((row) => ({
    completedAtEqualsDeadline: row.completed_at_equals_deadline,
    deadlineSubmillisecondMicroseconds: row.deadline_submillisecond_microseconds,
  }))[0];
}

async function persistFixtureAnswer(attemptId: string, question: PreparedIhkExamQuestion) {
  const result = await pool.query(
    `UPDATE ihk_exam_attempt_questions
     SET selected_option_ids = $3::text[],
         answered_at = (
           SELECT deadline_at - interval '2 minutes'
           FROM ihk_exam_attempts
           WHERE id = $1
         )
     WHERE attempt_id = $1 AND position = $2`,
    [attemptId, question.position, question.gradingSnapshot.correctOptionIds],
  );
  assert.equal(result.rowCount, 1);
}

function postgresCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}
