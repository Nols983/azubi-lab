import "server-only";

import type { PoolClient } from "pg";
import { createEmptyLearnerProgressState, type LearnerProgressState, type LessonProgressEntry, type QuizProgressEntry } from "../learner-progress.ts";
import { getDatabasePool, withTransaction } from "./db.ts";
import type { CanonicalImport } from "./progress-import.ts";
import { XP_REWARDS } from "../xp-domain.ts";
import { awardCanonicalXpEventWithClient } from "./xp-repository.ts";

type LessonRow = {
  module_slug: string;
  lesson_slug: string;
  status: "in-progress" | "completed";
  first_opened_at: Date;
  updated_at: Date;
  completed_at: Date | null;
};

type QuizRow = {
  module_slug: string;
  attempts: number;
  latest_correct: number;
  latest_total: number;
  latest_percentage: number;
  best_correct: number;
  best_total: number;
  best_percentage: number;
  last_submitted_at: Date;
};

type LessonCompletionHistoryRow = {
  module_slug: string;
  lesson_slug: string;
  first_completed_at: Date;
};

type LearnerLessonRow = LessonRow & { user_id: string };
type LearnerQuizRow = QuizRow & { user_id: string };
type LearnerLessonCompletionHistoryRow = LessonCompletionHistoryRow & { user_id: string };

export async function readLearnerProgress(userId: string) {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const state = await readLearnerProgressWithClient(client, userId);
    await client.query("COMMIT");
    return state;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function readLearnerProgressForUsers(userIds: readonly string[]) {
  const states = new Map(userIds.map((userId) => [userId, createEmptyLearnerProgressState()]));
  if (userIds.length === 0) return states;
  const [lessonResult, quizResult, lessonHistoryResult] = await Promise.all([
    getDatabasePool().query<LearnerLessonRow>(
      `SELECT user_id, module_slug, lesson_slug, status, first_opened_at, updated_at, completed_at
       FROM lesson_progress WHERE user_id = ANY($1::uuid[])`,
      [userIds],
    ),
    getDatabasePool().query<LearnerQuizRow>(
      `SELECT user_id, module_slug, attempts, latest_correct, latest_total, latest_percentage,
              best_correct, best_total, best_percentage, last_submitted_at
       FROM quiz_progress WHERE user_id = ANY($1::uuid[])`,
      [userIds],
    ),
    getDatabasePool().query<LearnerLessonCompletionHistoryRow>(
      `SELECT user_id, module_slug, lesson_slug, first_completed_at
       FROM lesson_completion_history
       WHERE user_id = ANY($1::uuid[])`,
      [userIds],
    ),
  ]);

  const lessonsByUser = new Map<string, LessonRow[]>();
  for (const row of lessonResult.rows) {
    const rows = lessonsByUser.get(row.user_id) ?? [];
    rows.push(row);
    lessonsByUser.set(row.user_id, rows);
  }
  const quizzesByUser = new Map<string, QuizRow[]>();
  for (const row of quizResult.rows) {
    const rows = quizzesByUser.get(row.user_id) ?? [];
    rows.push(row);
    quizzesByUser.set(row.user_id, rows);
  }
  const lessonHistoryByUser = new Map<string, LessonCompletionHistoryRow[]>();
  for (const row of lessonHistoryResult.rows) {
    const rows = lessonHistoryByUser.get(row.user_id) ?? [];
    rows.push(row);
    lessonHistoryByUser.set(row.user_id, rows);
  }
  for (const userId of userIds) {
    states.set(userId, mapProgressState(
      lessonsByUser.get(userId) ?? [],
      quizzesByUser.get(userId) ?? [],
      lessonHistoryByUser.get(userId) ?? [],
    ));
  }
  return states;
}

export function openLessonProgress(userId: string, moduleSlug: string, lessonSlug: string) {
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO lesson_progress
         (user_id, module_slug, lesson_slug, status, first_opened_at, updated_at, completed_at)
       VALUES ($1, $2, $3, 'in-progress', now(), now(), NULL)
       ON CONFLICT (user_id, module_slug, lesson_slug)
       DO UPDATE SET updated_at = now()`,
      [userId, moduleSlug, lessonSlug],
    );
    return readLearnerProgressWithClient(client, userId);
  });
}

export function setLessonProgressCompleted(userId: string, moduleSlug: string, lessonSlug: string, completed: boolean) {
  return withTransaction(async (client) => {
    const previous = await client.query<{ status: "in-progress" | "completed" }>(
      `SELECT status FROM lesson_progress
       WHERE user_id = $1 AND module_slug = $2 AND lesson_slug = $3
       FOR UPDATE`,
      [userId, moduleSlug, lessonSlug],
    );
    const updated = await client.query<{ completed_at: Date | null }>(
      `INSERT INTO lesson_progress
         (user_id, module_slug, lesson_slug, status, first_opened_at, updated_at, completed_at)
       VALUES ($1, $2, $3, $4, now(), now(), CASE WHEN $4 = 'completed' THEN now() ELSE NULL END)
       ON CONFLICT (user_id, module_slug, lesson_slug)
       DO UPDATE SET
         status = EXCLUDED.status,
         updated_at = now(),
         completed_at = CASE
           WHEN EXCLUDED.status = 'completed' AND lesson_progress.status = 'completed' THEN lesson_progress.completed_at
           WHEN EXCLUDED.status = 'completed' THEN now()
           ELSE NULL
         END
       RETURNING completed_at`,
      [userId, moduleSlug, lessonSlug, completed ? "completed" : "in-progress"],
    );
    if (completed) {
      const completedAt = updated.rows[0]?.completed_at;
      if (!completedAt) throw new Error("Completed lesson did not receive a completion timestamp.");
      await recordLessonCompletionHistory(client, userId, moduleSlug, lessonSlug, completedAt);
      if (previous.rows[0]?.status !== "completed") {
        await awardCanonicalXpEventWithClient(client, {
          userId,
          sourceType: "lesson",
          sourceKey: `${moduleSlug}:${lessonSlug}`,
          xpAmount: XP_REWARDS.lesson,
          awardedAt: completedAt,
        });
      }
    }
    return readLearnerProgressWithClient(client, userId);
  });
}

export function recordQuizProgress(userId: string, moduleSlug: string, correctCount: number, total: number) {
  const percentage = Math.round((correctCount / total) * 100);
  return withTransaction(async (client) => {
    const previous = await client.query(
      `SELECT module_slug FROM quiz_progress
       WHERE user_id = $1 AND module_slug = $2
       FOR UPDATE`,
      [userId, moduleSlug],
    );
    const updated = await client.query<{ last_submitted_at: Date }>(
      `INSERT INTO quiz_progress
         (user_id, module_slug, attempts, latest_correct, latest_total, latest_percentage,
          best_correct, best_total, best_percentage, last_submitted_at)
       VALUES ($1, $2, 1, $3, $4, $5, $3, $4, $5, now())
       ON CONFLICT (user_id, module_slug)
       DO UPDATE SET
         attempts = quiz_progress.attempts + 1,
         latest_correct = EXCLUDED.latest_correct,
         latest_total = EXCLUDED.latest_total,
         latest_percentage = EXCLUDED.latest_percentage,
         best_correct = CASE
           WHEN EXCLUDED.best_percentage > quiz_progress.best_percentage
             OR (EXCLUDED.best_percentage = quiz_progress.best_percentage AND EXCLUDED.best_correct > quiz_progress.best_correct)
           THEN EXCLUDED.best_correct ELSE quiz_progress.best_correct END,
         best_total = CASE
           WHEN EXCLUDED.best_percentage > quiz_progress.best_percentage
             OR (EXCLUDED.best_percentage = quiz_progress.best_percentage AND EXCLUDED.best_correct > quiz_progress.best_correct)
           THEN EXCLUDED.best_total ELSE quiz_progress.best_total END,
         best_percentage = GREATEST(quiz_progress.best_percentage, EXCLUDED.best_percentage),
         last_submitted_at = now()
       RETURNING last_submitted_at`,
      [userId, moduleSlug, correctCount, total, percentage],
    );
    const submittedAt = updated.rows[0]?.last_submitted_at;
    if (!submittedAt) throw new Error("Submitted quiz did not receive a submission timestamp.");
    if (!previous.rowCount) {
      await awardCanonicalXpEventWithClient(client, {
        userId,
        sourceType: "module_quiz",
        sourceKey: moduleSlug,
        xpAmount: XP_REWARDS.moduleQuiz,
        awardedAt: submittedAt,
      });
    }
    return readLearnerProgressWithClient(client, userId);
  });
}

export function importLearnerProgress(userId: string, snapshotHash: string, progress: CanonicalImport) {
  return withTransaction(async (client) => {
    const receipt = await client.query(
      `INSERT INTO local_progress_imports (user_id, snapshot_hash)
       VALUES ($1, $2)
       ON CONFLICT (user_id, snapshot_hash) DO NOTHING
       RETURNING snapshot_hash`,
      [userId, snapshotHash],
    );
    if (!receipt.rowCount) return readLearnerProgressWithClient(client, userId);

    for (const lesson of progress.lessons) {
      const persisted = await client.query<{ completed_at: Date | null }>(
        `INSERT INTO lesson_progress
           (user_id, module_slug, lesson_slug, status, first_opened_at, updated_at, completed_at)
         VALUES (
           $1, $2, $3, $4,
           COALESCE($5::timestamptz, now()),
           GREATEST(COALESCE($5::timestamptz, now()), COALESCE($6::timestamptz, now())),
           CASE WHEN $4 = 'completed' THEN COALESCE($7::timestamptz, now()) ELSE NULL END
         )
         ON CONFLICT (user_id, module_slug, lesson_slug)
         DO UPDATE SET
           status = CASE
             WHEN lesson_progress.status = 'completed' OR EXCLUDED.status = 'completed' THEN 'completed'
             ELSE 'in-progress' END,
           first_opened_at = LEAST(lesson_progress.first_opened_at, EXCLUDED.first_opened_at),
           updated_at = GREATEST(lesson_progress.updated_at, EXCLUDED.updated_at),
           completed_at = CASE
             WHEN lesson_progress.status = 'completed' AND EXCLUDED.status = 'completed'
               THEN GREATEST(lesson_progress.completed_at, EXCLUDED.completed_at)
             WHEN lesson_progress.status = 'completed' THEN lesson_progress.completed_at
             WHEN EXCLUDED.status = 'completed' THEN EXCLUDED.completed_at
             ELSE NULL END
         RETURNING completed_at`,
        [userId, lesson.moduleSlug, lesson.lessonSlug, lesson.status, lesson.firstOpenedAt, lesson.updatedAt, lesson.completedAt],
      );
      const completedAt = persisted.rows[0]?.completed_at;
      if (completedAt) {
        await recordLessonCompletionHistory(client, userId, lesson.moduleSlug, lesson.lessonSlug, completedAt);
      }
    }

    for (const quiz of progress.quizzes) {
      await mergeImportedQuiz(client, userId, quiz);
    }
    return readLearnerProgressWithClient(client, userId);
  });
}

async function mergeImportedQuiz(client: PoolClient, userId: string, quiz: CanonicalImport["quizzes"][number]) {
  const persisted = await client.query<{ last_submitted_at: Date }>(
    `INSERT INTO quiz_progress
       (user_id, module_slug, attempts, latest_correct, latest_total, latest_percentage,
        best_correct, best_total, best_percentage, last_submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, now()))
     ON CONFLICT (user_id, module_slug)
     DO UPDATE SET
       attempts = quiz_progress.attempts + EXCLUDED.attempts,
       latest_correct = CASE WHEN EXCLUDED.last_submitted_at >= quiz_progress.last_submitted_at THEN EXCLUDED.latest_correct ELSE quiz_progress.latest_correct END,
       latest_total = CASE WHEN EXCLUDED.last_submitted_at >= quiz_progress.last_submitted_at THEN EXCLUDED.latest_total ELSE quiz_progress.latest_total END,
       latest_percentage = CASE WHEN EXCLUDED.last_submitted_at >= quiz_progress.last_submitted_at THEN EXCLUDED.latest_percentage ELSE quiz_progress.latest_percentage END,
       best_correct = CASE
         WHEN EXCLUDED.best_percentage > quiz_progress.best_percentage
           OR (EXCLUDED.best_percentage = quiz_progress.best_percentage AND EXCLUDED.best_correct > quiz_progress.best_correct)
         THEN EXCLUDED.best_correct ELSE quiz_progress.best_correct END,
       best_total = CASE
         WHEN EXCLUDED.best_percentage > quiz_progress.best_percentage
           OR (EXCLUDED.best_percentage = quiz_progress.best_percentage AND EXCLUDED.best_correct > quiz_progress.best_correct)
         THEN EXCLUDED.best_total ELSE quiz_progress.best_total END,
       best_percentage = GREATEST(quiz_progress.best_percentage, EXCLUDED.best_percentage),
       last_submitted_at = GREATEST(quiz_progress.last_submitted_at, EXCLUDED.last_submitted_at)
     RETURNING last_submitted_at`,
    [
      userId,
      quiz.moduleSlug,
      quiz.attempts,
      quiz.latestCorrectCount,
      quiz.latestTotal,
      quiz.latestPercentage,
      quiz.bestCorrectCount,
      quiz.bestTotal,
      quiz.bestPercentage,
      quiz.lastSubmittedAt,
    ],
  );
  if (!persisted.rows[0]?.last_submitted_at) throw new Error("Imported quiz did not receive a submission timestamp.");
}

function recordLessonCompletionHistory(
  client: PoolClient,
  userId: string,
  moduleSlug: string,
  lessonSlug: string,
  completedAt: Date,
) {
  return client.query(
    `INSERT INTO lesson_completion_history
       (user_id, module_slug, lesson_slug, first_completed_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, module_slug, lesson_slug) DO NOTHING`,
    [userId, moduleSlug, lessonSlug, completedAt],
  );
}

async function readLearnerProgressWithClient(client: PoolClient, userId: string): Promise<LearnerProgressState> {
  const lessonResult = await client.query<LessonRow>(
    `SELECT module_slug, lesson_slug, status, first_opened_at, updated_at, completed_at
     FROM lesson_progress WHERE user_id = $1`,
    [userId],
  );
  const quizResult = await client.query<QuizRow>(
    `SELECT module_slug, attempts, latest_correct, latest_total, latest_percentage,
            best_correct, best_total, best_percentage, last_submitted_at
     FROM quiz_progress WHERE user_id = $1`,
    [userId],
  );
  const lessonHistoryResult = await client.query<LessonCompletionHistoryRow>(
    `SELECT module_slug, lesson_slug, first_completed_at
     FROM lesson_completion_history
     WHERE user_id = $1`,
    [userId],
  );

  return mapProgressState(
    lessonResult.rows,
    quizResult.rows,
    lessonHistoryResult.rows,
  );
}

function mapProgressState(
  lessonRows: readonly LessonRow[],
  quizRows: readonly QuizRow[],
  lessonHistoryRows: readonly LessonCompletionHistoryRow[],
): LearnerProgressState {
  const state = createEmptyLearnerProgressState();
  const lessons: Record<string, LessonProgressEntry> = {};
  for (const row of lessonRows) {
    lessons[`${row.module_slug}/${row.lesson_slug}`] = row.status === "completed"
      ? {
          status: "completed",
          firstOpenedAt: toIso(row.first_opened_at),
          updatedAt: toIso(row.updated_at),
          completedAt: toIso(row.completed_at ?? row.updated_at),
        }
      : { status: "in-progress", firstOpenedAt: toIso(row.first_opened_at), updatedAt: toIso(row.updated_at) };
  }
  const quizzes: Record<string, QuizProgressEntry> = {};
  for (const row of quizRows) {
    quizzes[row.module_slug] = {
      attempts: row.attempts,
      latestCorrectCount: row.latest_correct,
      latestTotal: row.latest_total,
      latestPercentage: row.latest_percentage,
      bestCorrectCount: row.best_correct,
      bestTotal: row.best_total,
      bestPercentage: row.best_percentage,
      lastSubmittedAt: toIso(row.last_submitted_at),
    };
  }
  const lessonCompletions = Object.fromEntries(lessonHistoryRows.map((row) => [
    `${row.module_slug}/${row.lesson_slug}`,
    toIso(row.first_completed_at),
  ]));
  const moduleQuizSubmissions = Object.fromEntries(quizRows.map((row) => [
    row.module_slug,
    toIso(row.last_submitted_at),
  ]));
  return {
    ...state,
    lessons,
    quizzes,
    progression: { lessonCompletions, moduleQuizSubmissions },
  };
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
