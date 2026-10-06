import "server-only";

import { withTransaction } from "./db.ts";

export type PracticeQuizStatisticsRows = {
  summary: {
    completed_quiz_count: string;
    answered_question_count: string;
    correct_question_count: string;
  };
  recentHistory: readonly {
    attempt_id: string;
    correct_count: number;
    question_count: number;
    completed_at: Date | string;
  }[];
  categoryAggregates: readonly {
    module_slug: string;
    answered_question_count: string;
    correct_question_count: string;
  }[];
  categoryResults: readonly {
    module_slug: string;
    is_correct: boolean;
    completed_at: Date | string;
    attempt_id: string;
    position: number;
  }[];
};

export function readOwnedPracticeQuizStatistics(
  userId: string,
): Promise<PracticeQuizStatisticsRows> {
  return withTransaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");

    const summary = (await client.query<PracticeQuizStatisticsRows["summary"]>(
      `WITH completed_attempts AS (
         SELECT id
         FROM practice_quiz_attempts
         WHERE user_id = $1 AND status = 'completed'
       )
       SELECT
         (SELECT count(*) FROM completed_attempts) AS completed_quiz_count,
         count(question.attempt_id) FILTER (
           WHERE question.submitted_option_ids IS NOT NULL
             AND question.is_correct IS NOT NULL
             AND question.answered_at IS NOT NULL
         ) AS answered_question_count,
         count(question.attempt_id) FILTER (
           WHERE question.submitted_option_ids IS NOT NULL
             AND question.is_correct = true
             AND question.answered_at IS NOT NULL
         ) AS correct_question_count
       FROM completed_attempts attempt
       LEFT JOIN practice_quiz_attempt_questions question
         ON question.attempt_id = attempt.id`,
      [userId],
    )).rows[0];

    const recentHistory = (await client.query<PracticeQuizStatisticsRows["recentHistory"][number]>(
      `SELECT id AS attempt_id, correct_count, question_count, completed_at
       FROM practice_quiz_attempts
       WHERE user_id = $1 AND status = 'completed'
       ORDER BY completed_at DESC, id DESC
       LIMIT 10`,
      [userId],
    )).rows;

    const categoryAggregates = (await client.query<PracticeQuizStatisticsRows["categoryAggregates"][number]>(
      `SELECT question.render_snapshot ->> 'moduleSlug' AS module_slug,
         count(*) AS answered_question_count,
         count(*) FILTER (WHERE question.is_correct = true) AS correct_question_count
       FROM practice_quiz_attempts attempt
       JOIN practice_quiz_attempt_questions question ON question.attempt_id = attempt.id
       WHERE attempt.user_id = $1
         AND attempt.status = 'completed'
         AND question.submitted_option_ids IS NOT NULL
         AND question.is_correct IS NOT NULL
         AND question.answered_at IS NOT NULL
       GROUP BY question.render_snapshot ->> 'moduleSlug'
       ORDER BY module_slug ASC`,
      [userId],
    )).rows;

    const categoryResults = (await client.query<PracticeQuizStatisticsRows["categoryResults"][number]>(
      `WITH ranked_results AS (
         SELECT question.render_snapshot ->> 'moduleSlug' AS module_slug,
           question.is_correct, attempt.completed_at,
           attempt.id AS attempt_id, question.position,
           row_number() OVER (
             PARTITION BY question.render_snapshot ->> 'moduleSlug'
             ORDER BY attempt.completed_at DESC, question.position DESC, attempt.id DESC
           ) AS recent_rank
         FROM practice_quiz_attempts attempt
         JOIN practice_quiz_attempt_questions question ON question.attempt_id = attempt.id
         WHERE attempt.user_id = $1
           AND attempt.status = 'completed'
           AND question.submitted_option_ids IS NOT NULL
           AND question.is_correct IS NOT NULL
           AND question.answered_at IS NOT NULL
       )
       SELECT module_slug, is_correct, completed_at, attempt_id, position
       FROM ranked_results
       WHERE recent_rank <= 60
       ORDER BY module_slug ASC, completed_at ASC, position ASC, attempt_id ASC`,
      [userId],
    )).rows;

    if (!summary) throw new PracticeQuizStatisticsRepositoryError();
    return { summary, recentHistory, categoryAggregates, categoryResults };
  });
}

export class PracticeQuizStatisticsRepositoryError extends Error {
  constructor() {
    super("Practice quiz statistics could not be loaded.");
    this.name = "PracticeQuizStatisticsRepositoryError";
  }
}
