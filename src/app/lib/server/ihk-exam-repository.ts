import "server-only";

import type { PoolClient } from "pg";
import { isUuid } from "../account-security.ts";
import {
  assessmentGroupIds,
  getAssessmentGroupForModule,
  getQuizCategoryForModule,
} from "../../data/quiz-bank/categories.ts";
import {
  getIhkExamDeadline,
  getIhkExamScorePercentage,
  ihkExamDifficultyQuota,
  ihkExamHistoryLimit,
  ihkExamQuestionCount,
  ihkExamQuestionTypeQuota,
  isIhkExamPassed,
  type IhkExamCompletionReason,
  type IhkExamHistoryItem,
} from "../ihk-exam.ts";
import {
  assertPreparedIhkExamQuestions,
  gradeIhkExamQuestions,
  parseIhkExamSnapshots,
  validateIhkExamAnswer,
  type IhkExamAttemptRecord,
  type IhkExamAttemptStatus,
  type IhkExamQuestionRecord,
  type PreparedIhkExamQuestion,
} from "./ihk-exam-domain.ts";
import { parsePersistedPracticeCategoryId } from "./practice-quiz-attempt-domain.ts";
import { withTransaction } from "./db.ts";

type AttemptRow = {
  id: string;
  user_id: string;
  status: string;
  seed: string;
  question_count: number;
  correct_count: number | null;
  passed: boolean | null;
  completion_reason: string | null;
  started_at: Date | string;
  deadline_at: Date | string;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type QuestionRow = {
  attempt_id: string;
  position: number;
  question_id: string;
  question_revision: number;
  category_id: unknown;
  render_snapshot: unknown;
  grading_snapshot: unknown;
  selected_option_ids: string[];
  answered_at: Date | string | null;
  is_correct: boolean | null;
};

type HistoryRow = Pick<
  AttemptRow,
  "id" | "question_count" | "correct_count" | "passed" | "completion_reason" | "completed_at"
>;

export class IhkExamNotFoundError extends Error {
  constructor() {
    super("The owned IHK exam attempt does not exist.");
    this.name = "IhkExamNotFoundError";
  }
}

export class IhkExamNotWritableError extends Error {
  constructor() {
    super("The IHK exam attempt can no longer be changed.");
    this.name = "IhkExamNotWritableError";
  }
}

export class IhkExamExpiredError extends IhkExamNotWritableError {
  readonly attemptId: string;

  constructor(attemptId: string) {
    super();
    this.name = "IhkExamExpiredError";
    this.attemptId = attemptId;
  }
}

export class IhkExamOwnerUnavailableError extends Error {
  constructor() {
    super("The IHK exam owner is not an active account.");
    this.name = "IhkExamOwnerUnavailableError";
  }
}

export class IhkExamDataError extends Error {
  constructor() {
    super("Stored IHK exam data violates the application contract.");
    this.name = "IhkExamDataError";
  }
}

export function startOrResumeIhkExamRecord(input: {
  userId: string;
  seed: string;
  questions: readonly PreparedIhkExamQuestion[];
}) {
  assertCreationInput(input);
  return withTransaction(async (client) => {
    await requireActiveOwner(client, input.userId, "UPDATE");
    const activeRow = await findActiveAttemptRow(client, input.userId);
    if (activeRow) {
      const activeQuestions = await loadQuestionRows(client, activeRow.id);
      const clock = await readAttemptClock(client, activeRow.id);
      if (!clock.expired) {
        return { record: assembleAttempt(activeRow, activeQuestions), serverNow: clock.serverNow, created: false };
      }
      await finalizeAttemptWithClient(client, activeRow, activeQuestions, "timeout", clock.serverNow);
    }

    const attempt = (await client.query<AttemptRow>(
      `WITH instant AS (SELECT clock_timestamp() AS started_at)
       INSERT INTO ihk_exam_attempts
         (user_id, seed, question_count, started_at, deadline_at, created_at, updated_at)
       SELECT $1, $2, $3, instant.started_at,
              instant.started_at + interval '45 minutes', instant.started_at, instant.started_at
       FROM instant
       RETURNING ${attemptColumns}`,
      [input.userId, input.seed, ihkExamQuestionCount],
    )).rows[0];
    if (!attempt) throw new IhkExamDataError();
    for (const question of input.questions) {
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
    return {
      record: assembleAttempt(attempt, await loadQuestionRows(client, attempt.id)),
      serverNow: toDate(attempt.started_at),
      created: true,
    };
  });
}

export function readIhkExamOverviewRecord(userId: string) {
  return withTransaction(async (client) => {
    await requireActiveOwner(client, userId, "SHARE");
    const activeRow = await findActiveAttemptRow(client, userId);
    let activeAttempt: AttemptRow | null = activeRow ?? null;
    if (activeRow) {
      const clock = await readAttemptClock(client, activeRow.id);
      if (clock.expired) {
        const questions = await loadQuestionRows(client, activeRow.id);
        await finalizeAttemptWithClient(client, activeRow, questions, "timeout", clock.serverNow);
        activeAttempt = null;
      }
    }
    const history = await client.query<HistoryRow>(
      `SELECT id, question_count, correct_count, passed, completion_reason, completed_at
       FROM ihk_exam_attempts
       WHERE user_id = $1 AND status = 'completed'
       ORDER BY completed_at DESC, id DESC
       LIMIT $2`,
      [userId, ihkExamHistoryLimit],
    );
    return {
      activeAttempt: activeAttempt && {
        id: activeAttempt.id,
        startedAt: toDate(activeAttempt.started_at).toISOString(),
        deadlineAt: toDate(activeAttempt.deadline_at).toISOString(),
      },
      history: history.rows.map(mapHistoryRow),
    };
  });
}

export function findOwnedIhkExamRecord(attemptId: string, userId: string) {
  return withTransaction(async (client) => {
    await requireActiveOwner(client, userId, "SHARE");
    const attempt = await findOwnedAttemptRow(client, attemptId, userId);
    if (!attempt) return undefined;
    const questions = await loadQuestionRows(client, attempt.id);
    const clock = await readAttemptClock(client, attempt.id);
    const record = attempt.status === "in_progress" && clock.expired
      ? await finalizeAttemptWithClient(client, attempt, questions, "timeout", clock.serverNow)
      : assembleAttempt(attempt, questions);
    return { record, serverNow: clock.serverNow };
  });
}

export async function saveOwnedIhkExamAnswer(input: {
  attemptId: string;
  userId: string;
  answer: unknown;
}) {
  const result = await withTransaction(async (client) => {
    await requireActiveOwner(client, input.userId, "SHARE");
    const attempt = await findOwnedAttemptRow(client, input.attemptId, input.userId);
    if (!attempt) throw new IhkExamNotFoundError();
    const questions = await loadQuestionRows(client, attempt.id);
    const clock = await readAttemptClock(client, attempt.id);
    const serverNow = clock.serverNow;
    if (attempt.status === "completed") {
      throw new IhkExamNotWritableError();
    }
    if (clock.expired) {
      return {
        record: await finalizeAttemptWithClient(client, attempt, questions, "timeout", serverNow),
        serverNow,
        expired: true as const,
      };
    }
    const position = isRecord(input.answer) ? input.answer.position : undefined;
    const question = questions.find((candidate) => candidate.position === position);
    if (!question) throw new IhkExamNotFoundError();
    const validated = validateIhkExamAnswer(mapQuestionRow(question, attempt.id, question.position), input.answer);
    const updated = await client.query(
      `UPDATE ihk_exam_attempt_questions
       SET selected_option_ids = $3::text[],
           answered_at = CASE
             WHEN cardinality($3::text[]) = 0 THEN NULL::timestamptz
             ELSE $4::timestamptz
           END,
           is_correct = NULL
       WHERE attempt_id = $1 AND position = $2
       RETURNING attempt_id`,
      [attempt.id, validated.position, validated.selectedOptionIds, serverNow],
    );
    if (updated.rowCount !== 1) throw new IhkExamDataError();
    await client.query(
      "UPDATE ihk_exam_attempts SET updated_at = $2 WHERE id = $1 AND status = 'in_progress'",
      [attempt.id, serverNow],
    );
    return {
      record: assembleAttempt(attempt, await loadQuestionRows(client, attempt.id)),
      serverNow,
      expired: false as const,
    };
  });
  if (result.expired) throw new IhkExamExpiredError(input.attemptId);
  return { record: result.record, serverNow: result.serverNow };
}

export function completeOwnedIhkExam(input: { attemptId: string; userId: string }) {
  return withTransaction(async (client) => {
    await requireActiveOwner(client, input.userId, "SHARE");
    const attempt = await findOwnedAttemptRow(client, input.attemptId, input.userId);
    if (!attempt) throw new IhkExamNotFoundError();
    const questions = await loadQuestionRows(client, attempt.id);
    const clock = await readAttemptClock(client, attempt.id);
    const serverNow = clock.serverNow;
    if (attempt.status === "completed") return { record: assembleAttempt(attempt, questions), serverNow };
    const reason: IhkExamCompletionReason = clock.expired
      ? "timeout"
      : "submitted";
    return {
      record: await finalizeAttemptWithClient(client, attempt, questions, reason, serverNow),
      serverNow,
    };
  });
}

async function finalizeAttemptWithClient(
  client: PoolClient,
  attempt: AttemptRow,
  questionRows: readonly QuestionRow[],
  reason: IhkExamCompletionReason,
  serverNow: Date,
) {
  const record = assembleAttempt(attempt, questionRows);
  if (record.status === "completed") return record;
  const graded = gradeIhkExamQuestions(record.questions);
  for (const answer of graded) {
    const updated = await client.query(
      `UPDATE ihk_exam_attempt_questions
       SET is_correct = $3
       WHERE attempt_id = $1 AND position = $2 AND is_correct IS NULL
       RETURNING attempt_id`,
      [attempt.id, answer.position, answer.isCorrect],
    );
    if (updated.rowCount !== 1) throw new IhkExamDataError();
  }
  const correctCount = graded.filter((answer) => answer.isCorrect).length;
  const completed = (await client.query<AttemptRow>(
    `UPDATE ihk_exam_attempts
     SET status = 'completed', correct_count = $2, passed = $3,
         completion_reason = $4,
         completed_at = CASE
           WHEN $4::text = 'timeout' THEN deadline_at
           ELSE $5::timestamptz
         END,
         updated_at = CASE
           WHEN $4::text = 'timeout' THEN deadline_at
           ELSE $5::timestamptz
         END
     WHERE id = $1 AND status = 'in_progress'
     RETURNING ${attemptColumns}`,
    [attempt.id, correctCount, isIhkExamPassed(correctCount), reason, serverNow],
  )).rows[0];
  if (!completed) throw new IhkExamDataError();
  return assembleAttempt(completed, await loadQuestionRows(client, attempt.id));
}

async function requireActiveOwner(client: PoolClient, userId: string, lock: "SHARE" | "UPDATE") {
  if (!isUuid(userId)) throw new IhkExamOwnerUnavailableError();
  const owner = await client.query(
    `SELECT id FROM users WHERE id = $1 AND disabled_at IS NULL FOR ${lock}`,
    [userId],
  );
  if (!owner.rowCount) throw new IhkExamOwnerUnavailableError();
}

async function findActiveAttemptRow(client: PoolClient, userId: string) {
  return (await client.query<AttemptRow>(
    `SELECT ${attemptColumns}
     FROM ihk_exam_attempts
     WHERE user_id = $1 AND status = 'in_progress'
     FOR UPDATE`,
    [userId],
  )).rows[0];
}

async function findOwnedAttemptRow(client: PoolClient, attemptId: string, userId: string) {
  if (!isUuid(attemptId)) return undefined;
  return (await client.query<AttemptRow>(
    `SELECT ${attemptColumns}
     FROM ihk_exam_attempts
     WHERE id = $1 AND user_id = $2
     FOR UPDATE`,
    [attemptId, userId],
  )).rows[0];
}

async function readAttemptClock(client: PoolClient, attemptId: string) {
  const result = await client.query<{
    expired: boolean;
    server_now: Date | string;
  }>(
    `WITH instant AS MATERIALIZED (SELECT clock_timestamp() AS server_now)
     SELECT instant.server_now,
            instant.server_now >= attempt.deadline_at AS expired
     FROM ihk_exam_attempts attempt
     CROSS JOIN instant
     WHERE attempt.id = $1`,
    [attemptId],
  );
  const row = result.rows[0];
  if (!row || typeof row.expired !== "boolean") throw new IhkExamDataError();
  return { serverNow: toDate(row.server_now), expired: row.expired };
}

async function loadQuestionRows(client: PoolClient, attemptId: string) {
  return (await client.query<QuestionRow>(
    `SELECT attempt_id, position, question_id, question_revision, category_id,
            render_snapshot, grading_snapshot, selected_option_ids, answered_at, is_correct
     FROM ihk_exam_attempt_questions
     WHERE attempt_id = $1
     ORDER BY position ASC`,
    [attemptId],
  )).rows;
}

function assembleAttempt(attempt: AttemptRow, rows: readonly QuestionRow[]): IhkExamAttemptRecord {
  if (!isUuid(attempt.id) || !isUuid(attempt.user_id)
    || (attempt.status !== "in_progress" && attempt.status !== "completed")
    || !/^[0-9a-f]{32}$/.test(attempt.seed)
    || attempt.question_count !== ihkExamQuestionCount
    || rows.length !== ihkExamQuestionCount) throw new IhkExamDataError();
  const startedAt = toDate(attempt.started_at);
  const deadlineAt = toDate(attempt.deadline_at);
  const createdAt = toDate(attempt.created_at);
  const updatedAt = toDate(attempt.updated_at);
  if (deadlineAt.getTime() !== getIhkExamDeadline(startedAt).getTime()) throw new IhkExamDataError();
  const questions = rows.map((row, index) => mapQuestionRow(row, attempt.id, index + 1));
  assertQuestionQuotas(questions);
  const status = attempt.status as IhkExamAttemptStatus;
  const completionReason = attempt.completion_reason === "submitted" || attempt.completion_reason === "timeout"
    ? attempt.completion_reason
    : null;
  const completedAt = attempt.completed_at === null ? null : toDate(attempt.completed_at);
  if (status === "in_progress") {
    if (attempt.correct_count !== null || attempt.passed !== null || completionReason !== null || completedAt !== null
      || questions.some((question) => question.isCorrect !== null)) throw new IhkExamDataError();
  } else {
    if (!Number.isInteger(attempt.correct_count) || attempt.correct_count === null
      || attempt.passed === null || !completionReason || !completedAt
      || questions.some((question) => question.isCorrect === null)) throw new IhkExamDataError();
    const graded = gradeIhkExamQuestions(questions);
    if (graded.some((answer, index) => answer.isCorrect !== questions[index].isCorrect)
      || graded.filter((answer) => answer.isCorrect).length !== attempt.correct_count
      || attempt.passed !== isIhkExamPassed(attempt.correct_count)) throw new IhkExamDataError();
    if ((completionReason === "timeout" && completedAt.getTime() !== deadlineAt.getTime())
      || (completionReason === "submitted" && completedAt.getTime() >= deadlineAt.getTime())) {
      throw new IhkExamDataError();
    }
  }
  return {
    id: attempt.id,
    userId: attempt.user_id,
    status,
    seed: attempt.seed,
    questionCount: attempt.question_count,
    correctCount: attempt.correct_count,
    passed: attempt.passed,
    completionReason,
    startedAt,
    deadlineAt,
    completedAt,
    createdAt,
    updatedAt,
    questions,
  };
}

function mapQuestionRow(row: QuestionRow, attemptId: string, expectedPosition: number): IhkExamQuestionRecord {
  let categoryId;
  let snapshots;
  try {
    categoryId = parsePersistedPracticeCategoryId(row.category_id);
    snapshots = parseIhkExamSnapshots(row.render_snapshot, row.grading_snapshot);
  } catch {
    throw new IhkExamDataError();
  }
  if (row.attempt_id !== attemptId || row.position !== expectedPosition
    || row.question_id !== snapshots.renderSnapshot.questionId
    || row.question_revision !== snapshots.renderSnapshot.revision
    || categoryId !== getQuizCategoryForModule(snapshots.renderSnapshot.moduleSlug)
    || !Array.isArray(row.selected_option_ids)
    || row.selected_option_ids.some((optionId) => typeof optionId !== "string" || !optionId)
    || new Set(row.selected_option_ids).size !== row.selected_option_ids.length
    || (snapshots.renderSnapshot.type === "single-choice" && row.selected_option_ids.length > 1)) {
    throw new IhkExamDataError();
  }
  const optionIds = new Set(snapshots.renderSnapshot.options.map((option) => option.id));
  if (row.selected_option_ids.some((optionId) => !optionIds.has(optionId))
    || (row.selected_option_ids.length === 0) !== (row.answered_at === null)) throw new IhkExamDataError();
  return {
    position: row.position,
    questionId: row.question_id,
    questionRevision: row.question_revision,
    categoryId,
    renderSnapshot: snapshots.renderSnapshot,
    gradingSnapshot: snapshots.gradingSnapshot,
    selectedOptionIds: [...row.selected_option_ids],
    answeredAt: row.answered_at === null ? null : toDate(row.answered_at),
    isCorrect: row.is_correct,
  };
}

function assertCreationInput(input: {
  userId: string;
  seed: string;
  questions: readonly PreparedIhkExamQuestion[];
}) {
  if (!isUuid(input.userId) || !/^[0-9a-f]{32}$/.test(input.seed)) throw new IhkExamDataError();
  try {
    assertPreparedIhkExamQuestions(input.questions);
    assertQuestionQuotas(input.questions.map((question) => ({
      ...question,
      selectedOptionIds: [],
      answeredAt: null,
      isCorrect: null,
    })));
  } catch {
    throw new IhkExamDataError();
  }
}

function assertQuestionQuotas(questions: readonly IhkExamQuestionRecord[]) {
  const groupCounts = Map.groupBy(
    questions,
    (question) => getAssessmentGroupForModule(question.renderSnapshot.moduleSlug),
  );
  if (groupCounts.size !== assessmentGroupIds.length
    || assessmentGroupIds.some((groupId) => groupCounts.get(groupId)?.length !== 6)) {
    throw new IhkExamDataError();
  }
  for (const [difficulty, quota] of Object.entries(ihkExamDifficultyQuota)) {
    if (questions.filter((question) => question.renderSnapshot.difficulty === difficulty).length !== quota) {
      throw new IhkExamDataError();
    }
  }
  for (const [type, quota] of Object.entries(ihkExamQuestionTypeQuota)) {
    if (questions.filter((question) => question.renderSnapshot.type === type).length !== quota) {
      throw new IhkExamDataError();
    }
  }
}

function mapHistoryRow(row: HistoryRow): IhkExamHistoryItem {
  if (!isUuid(row.id) || row.question_count !== ihkExamQuestionCount
    || !Number.isInteger(row.correct_count) || row.correct_count === null
    || row.passed === null
    || (row.completion_reason !== "submitted" && row.completion_reason !== "timeout")
    || row.completed_at === null
    || row.passed !== isIhkExamPassed(row.correct_count)) throw new IhkExamDataError();
  return {
    id: row.id,
    correctCount: row.correct_count,
    questionCount: row.question_count,
    scorePercentage: getIhkExamScorePercentage(row.correct_count, row.question_count),
    passed: row.passed,
    completionReason: row.completion_reason,
    completedAt: toDate(row.completed_at).toISOString(),
  };
}

function toDate(value: Date | string | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? Number.NaN);
  if (Number.isNaN(date.getTime())) throw new IhkExamDataError();
  return date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const attemptColumns = `id, user_id, status, seed, question_count, correct_count, passed,
  completion_reason, started_at, deadline_at, completed_at, created_at, updated_at`;
