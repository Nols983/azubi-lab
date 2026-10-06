import "server-only";

import type { PoolClient } from "pg";
import { isUuid } from "../account-security.ts";
import {
  assessmentGroupIds,
  getAssessmentGroupForModule,
  getQuizCategoryForModule,
  isQuizCategoryId,
  type AssessmentGroupId,
  type QuizCategoryId,
} from "../../data/quiz-bank/categories.ts";
import {
  practiceQuestionCount,
  validatePracticeCategoryIds,
} from "../../data/quiz-bank/practice-selection.ts";
import {
  parsePersistedPracticeCategoryId,
  parsePracticeGradingSnapshot,
  parsePracticeRenderSnapshot,
  type PracticeAttemptQuestionRecord,
  type PracticeAttemptRecord,
  type PracticeAttemptStatus,
  type PreparedPracticeQuestion,
  validateAndGradePracticeAnswers,
} from "./practice-quiz-attempt-domain.ts";
import { withTransaction } from "./db.ts";
import { getPracticeQuizXpReward } from "../xp-domain.ts";
import { awardPracticeQuizXpWithClient } from "./xp-repository.ts";

type AttemptRow = {
  id: string;
  user_id: string;
  status: string;
  selected_category_ids: string[];
  seed: string;
  question_count: number;
  correct_count: number | null;
  started_at: Date | string;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type AttemptQuestionRow = {
  attempt_id: string;
  position: number;
  question_id: string;
  question_revision: number;
  category_id: unknown;
  render_snapshot: unknown;
  grading_snapshot: unknown;
  submitted_option_ids: string[] | null;
  is_correct: boolean | null;
  answered_at: Date | string | null;
};

export class PracticeAttemptNotFoundError extends Error {
  constructor() {
    super("The owned practice attempt does not exist.");
    this.name = "PracticeAttemptNotFoundError";
  }
}

export class PracticeAttemptOwnerUnavailableError extends Error {
  constructor() {
    super("The practice attempt owner is not an active account.");
    this.name = "PracticeAttemptOwnerUnavailableError";
  }
}

export class PracticeAttemptDataError extends Error {
  constructor() {
    super("Stored practice attempt data violates the application contract.");
    this.name = "PracticeAttemptDataError";
  }
}

export function createPracticeAttemptRecord(input: {
  userId: string;
  selectedCategoryIds: readonly AssessmentGroupId[];
  seed: string;
  questions: readonly PreparedPracticeQuestion[];
}) {
  assertCreationInput(input);
  return withTransaction(async (client) => {
    await requireActiveOwner(client, input.userId);
    const attempt = (await client.query<AttemptRow>(
      `INSERT INTO practice_quiz_attempts
         (user_id, selected_category_ids, seed, question_count)
       VALUES ($1, $2::text[], $3, $4)
       RETURNING id, user_id, status, selected_category_ids, seed, question_count,
                 correct_count, started_at, completed_at, created_at, updated_at`,
      [
        input.userId,
        [...new Set(input.questions.map((question) => question.categoryId))],
        input.seed,
        practiceQuestionCount,
      ],
    )).rows[0];
    if (!attempt) throw new PracticeAttemptDataError();

    for (const question of input.questions) {
      await client.query(
        `INSERT INTO practice_quiz_attempt_questions
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
    return assembleAttempt(attempt, await loadQuestionRows(client, attempt.id));
  });
}

export function findOwnedPracticeAttempt(attemptId: string, userId: string) {
  return withTransaction(async (client) => {
    await requireActiveOwner(client, userId);
    const attempt = (await client.query<AttemptRow>(
      `${attemptSelect}
       WHERE attempt.id = $1 AND attempt.user_id = $2
       FOR SHARE OF attempt`,
      [attemptId, userId],
    )).rows[0];
    if (!attempt) return undefined;
    return assembleAttempt(attempt, await loadQuestionRows(client, attempt.id));
  });
}

export function completeOwnedPracticeAttempt(input: {
  attemptId: string;
  userId: string;
  answers: unknown;
}) {
  return withTransaction(async (client) => {
    await requireActiveOwner(client, input.userId);
    const attempt = (await client.query<AttemptRow>(
      `${attemptSelect}
       WHERE attempt.id = $1 AND attempt.user_id = $2
       FOR UPDATE OF attempt`,
      [input.attemptId, input.userId],
    )).rows[0];
    if (!attempt) throw new PracticeAttemptNotFoundError();

    const existing = assembleAttempt(attempt, await loadQuestionRows(client, attempt.id));
    if (existing.status === "completed") return existing;

    const graded = validateAndGradePracticeAnswers(existing.questions, input.answers);
    for (const answer of graded) {
      const updated = await client.query(
        `UPDATE practice_quiz_attempt_questions
         SET submitted_option_ids = $3::text[], is_correct = $4, answered_at = now()
         WHERE attempt_id = $1 AND position = $2
         RETURNING attempt_id`,
        [attempt.id, answer.position, answer.selectedOptionIds, answer.isCorrect],
      );
      if (updated.rowCount !== 1) throw new PracticeAttemptDataError();
    }

    const correctCount = graded.filter((answer) => answer.isCorrect).length;
    const completed = (await client.query<AttemptRow>(
      `UPDATE practice_quiz_attempts
       SET status = 'completed', correct_count = $2, completed_at = now(), updated_at = now()
       WHERE id = $1 AND status = 'in_progress'
       RETURNING id, user_id, status, selected_category_ids, seed, question_count,
                 correct_count, started_at, completed_at, created_at, updated_at`,
      [attempt.id, correctCount],
    )).rows[0];
    if (!completed) throw new PracticeAttemptDataError();
    if (!completed.completed_at) throw new PracticeAttemptDataError();
    const completedAt = toDate(completed.completed_at);
    await awardPracticeQuizXpWithClient(client, {
      userId: completed.user_id,
      attemptId: completed.id,
      xpAmount: getPracticeQuizXpReward(correctCount, completed.question_count),
      completedAt,
    });
    return assembleAttempt(completed, await loadQuestionRows(client, attempt.id));
  });
}

async function requireActiveOwner(client: PoolClient, userId: string) {
  const owner = await client.query(
    "SELECT id FROM users WHERE id = $1 AND disabled_at IS NULL FOR SHARE",
    [userId],
  );
  if (!owner.rowCount) throw new PracticeAttemptOwnerUnavailableError();
}

async function loadQuestionRows(client: PoolClient, attemptId: string) {
  const result = await client.query<AttemptQuestionRow>(
    `SELECT attempt_id, position, question_id, question_revision, category_id, render_snapshot,
            grading_snapshot, submitted_option_ids, is_correct, answered_at
     FROM practice_quiz_attempt_questions
     WHERE attempt_id = $1
     ORDER BY position ASC`,
    [attemptId],
  );
  return result.rows;
}

function assembleAttempt(attempt: AttemptRow, rows: readonly AttemptQuestionRow[]): PracticeAttemptRecord {
  const categories = parsePersistedCategoryIds(attempt.selected_category_ids);
  if (!isUuid(attempt.id) || !isUuid(attempt.user_id)
    || (attempt.status !== "in_progress" && attempt.status !== "completed")
    || !/^[0-9a-f]{32}$/.test(attempt.seed)
    || attempt.question_count !== practiceQuestionCount
    || rows.length !== attempt.question_count) throw new PracticeAttemptDataError();

  const questions = rows.map((row, index) => mapQuestionRow(row, attempt.id, index + 1));
  if (new Set(questions.map((question) => question.questionId)).size !== questions.length) {
    throw new PracticeAttemptDataError();
  }
  if (questions.some((question) => !categories.includes(question.categoryId))) {
    throw new PracticeAttemptDataError();
  }
  const selectedCategoryIds = assessmentGroupIds.filter((groupId) => questions.some(
    (question) => getAssessmentGroupForModule(question.renderSnapshot.moduleSlug) === groupId,
  ));

  const status = attempt.status as PracticeAttemptStatus;
  if (status === "in_progress") {
    if (attempt.correct_count !== null || attempt.completed_at !== null
      || questions.some((question) => question.submittedOptionIds !== null
        || question.isCorrect !== null || question.answeredAt !== null)) {
      throw new PracticeAttemptDataError();
    }
  } else {
    if (!Number.isInteger(attempt.correct_count) || attempt.correct_count === null
      || attempt.correct_count < 0 || attempt.correct_count > attempt.question_count
      || attempt.completed_at === null
      || questions.some((question) => question.submittedOptionIds === null
        || question.isCorrect === null || question.answeredAt === null)) {
      throw new PracticeAttemptDataError();
    }
    const persistedAnswers = questions.map((question) => ({
      questionId: question.questionId,
      selectedOptionIds: question.submittedOptionIds,
    }));
    const graded = validateAndGradePracticeAnswers(questions, persistedAnswers);
    if (graded.some((answer, index) => answer.isCorrect !== questions[index].isCorrect)
      || graded.filter((answer) => answer.isCorrect).length !== attempt.correct_count) {
      throw new PracticeAttemptDataError();
    }
  }

  return {
    id: attempt.id,
    userId: attempt.user_id,
    status,
    selectedCategoryIds,
    seed: attempt.seed,
    questionCount: attempt.question_count,
    correctCount: attempt.correct_count,
    startedAt: toDate(attempt.started_at),
    completedAt: attempt.completed_at === null ? null : toDate(attempt.completed_at),
    createdAt: toDate(attempt.created_at),
    updatedAt: toDate(attempt.updated_at),
    questions,
  };
}

function mapQuestionRow(
  row: AttemptQuestionRow,
  attemptId: string,
  expectedPosition: number,
): PracticeAttemptQuestionRecord {
  let renderSnapshot;
  let gradingSnapshot;
  let categoryId;
  try {
    categoryId = parsePersistedPracticeCategoryId(row.category_id);
    renderSnapshot = parsePracticeRenderSnapshot(row.render_snapshot);
    gradingSnapshot = parsePracticeGradingSnapshot(row.grading_snapshot, renderSnapshot);
  } catch {
    throw new PracticeAttemptDataError();
  }
  if (row.attempt_id !== attemptId || row.position !== expectedPosition
    || row.question_id !== renderSnapshot.questionId
    || row.question_revision !== renderSnapshot.revision) throw new PracticeAttemptDataError();
  if (row.submitted_option_ids !== null
    && (row.submitted_option_ids.length === 0
      || row.submitted_option_ids.some((optionId) => typeof optionId !== "string" || !optionId)
      || new Set(row.submitted_option_ids).size !== row.submitted_option_ids.length)) {
    throw new PracticeAttemptDataError();
  }
  return {
    position: row.position,
    questionId: row.question_id,
    questionRevision: row.question_revision,
    categoryId,
    renderSnapshot,
    gradingSnapshot,
    submittedOptionIds: row.submitted_option_ids === null ? null : [...row.submitted_option_ids],
    isCorrect: row.is_correct,
    answeredAt: row.answered_at === null ? null : toDate(row.answered_at),
  };
}

function assertCreationInput(input: {
  userId: string;
  selectedCategoryIds: readonly AssessmentGroupId[];
  seed: string;
  questions: readonly PreparedPracticeQuestion[];
}) {
  let categories: readonly AssessmentGroupId[];
  try {
    categories = validatePracticeCategoryIds(input.selectedCategoryIds);
  } catch {
    throw new PracticeAttemptDataError();
  }
  if (!isUuid(input.userId) || !/^[0-9a-f]{32}$/.test(input.seed)
    || categories.length !== input.selectedCategoryIds.length
    || input.questions.length !== practiceQuestionCount
    || new Set(input.questions.map((question) => question.questionId)).size !== practiceQuestionCount
    || input.questions.some((question, index) => question.position !== index + 1)) {
    throw new PracticeAttemptDataError();
  }
  for (const question of input.questions) {
    try {
      const render = parsePracticeRenderSnapshot(question.renderSnapshot);
      parsePracticeGradingSnapshot(question.gradingSnapshot, render);
      if (!isQuizCategoryId(question.categoryId)
        || question.categoryId !== getQuizCategoryForModule(render.moduleSlug)
        || !categories.includes(getAssessmentGroupForModule(render.moduleSlug))
        || question.questionId !== render.questionId
        || question.questionRevision !== render.revision) {
        throw new PracticeAttemptDataError();
      }
    } catch {
      throw new PracticeAttemptDataError();
    }
  }
  if (categories.some((groupId) => !input.questions.some(
    (question) => getAssessmentGroupForModule(question.renderSnapshot.moduleSlug) === groupId,
  ))) throw new PracticeAttemptDataError();
}

function parsePersistedCategoryIds(values: unknown) {
  if (!Array.isArray(values) || values.length < 1 || values.length > 4
    || values.some((value) => typeof value !== "string" || !isQuizCategoryId(value))
    || new Set(values).size !== values.length) throw new PracticeAttemptDataError();
  return values as QuizCategoryId[];
}

function toDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new PracticeAttemptDataError();
  return date;
}

const attemptSelect = `SELECT attempt.id, attempt.user_id, attempt.status,
    attempt.selected_category_ids, attempt.seed, attempt.question_count,
    attempt.correct_count, attempt.started_at, attempt.completed_at,
    attempt.created_at, attempt.updated_at
  FROM practice_quiz_attempts attempt`;
