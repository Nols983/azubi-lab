import "server-only";

import type { TrainerLearnerFacts } from "../trainer-reporting.ts";
import { getDatabasePool } from "./db.ts";

type TrainerLearnerFactsRow = {
  learner_id: string;
  total_xp: string;
  completed_practice_quiz_count: string;
  answered_practice_question_count: string;
  correct_practice_question_count: string;
  latest_practice_quiz_at: Date | string | null;
};

export async function readTrainerLearnerFactsForLearners(
  learnerIds: readonly string[],
): Promise<readonly TrainerLearnerFacts[]> {
  const uniqueLearnerIds = [...new Set(learnerIds)];
  if (uniqueLearnerIds.length === 0) return [];

  const result = await getDatabasePool().query<TrainerLearnerFactsRow>(
    `WITH selected_learners AS (
       SELECT learner_id
       FROM unnest($1::uuid[]) AS selected(learner_id)
     ),
     xp_totals AS (
       SELECT user_id, COALESCE(sum(xp_amount), 0)::text AS total_xp
       FROM xp_events
       WHERE user_id = ANY($1::uuid[])
       GROUP BY user_id
     ),
     practice_totals AS (
       SELECT
         attempt.user_id,
         count(DISTINCT attempt.id)::text AS completed_practice_quiz_count,
         (count(question.attempt_id) FILTER (
           WHERE question.submitted_option_ids IS NOT NULL
             AND question.is_correct IS NOT NULL
             AND question.answered_at IS NOT NULL
         ))::text AS answered_practice_question_count,
         (count(question.attempt_id) FILTER (
           WHERE question.submitted_option_ids IS NOT NULL
             AND question.is_correct = true
             AND question.answered_at IS NOT NULL
         ))::text AS correct_practice_question_count,
         max(attempt.completed_at) AS latest_practice_quiz_at
       FROM practice_quiz_attempts attempt
       LEFT JOIN practice_quiz_attempt_questions question
         ON question.attempt_id = attempt.id
       WHERE attempt.user_id = ANY($1::uuid[])
         AND attempt.status = 'completed'
       GROUP BY attempt.user_id
     )
     SELECT
       selected.learner_id,
       COALESCE(xp.total_xp, '0') AS total_xp,
       COALESCE(practice.completed_practice_quiz_count, '0') AS completed_practice_quiz_count,
       COALESCE(practice.answered_practice_question_count, '0') AS answered_practice_question_count,
       COALESCE(practice.correct_practice_question_count, '0') AS correct_practice_question_count,
       practice.latest_practice_quiz_at
     FROM selected_learners selected
     LEFT JOIN xp_totals xp ON xp.user_id = selected.learner_id
     LEFT JOIN practice_totals practice ON practice.user_id = selected.learner_id
     ORDER BY selected.learner_id ASC`,
    [uniqueLearnerIds],
  );

  return result.rows.map((row) => {
    const totalXp = parseCount(row.total_xp);
    const completedPracticeQuizCount = parseCount(row.completed_practice_quiz_count);
    const answeredPracticeQuestionCount = parseCount(row.answered_practice_question_count);
    const correctPracticeQuestionCount = parseCount(row.correct_practice_question_count);
    if (correctPracticeQuestionCount > answeredPracticeQuestionCount) {
      throw new TrainerLearnerSummaryRepositoryError();
    }
    return {
      learnerId: row.learner_id,
      totalXp,
      completedPracticeQuizCount,
      answeredPracticeQuestionCount,
      correctPracticeQuestionCount,
      latestPracticeQuizAt: row.latest_practice_quiz_at
        ? parseInstant(row.latest_practice_quiz_at)
        : null,
    };
  });
}

function parseCount(value: string) {
  if (!/^(0|[1-9]\d*)$/.test(value)) throw new TrainerLearnerSummaryRepositoryError();
  const count = Number(value);
  if (!Number.isSafeInteger(count)) throw new TrainerLearnerSummaryRepositoryError();
  return count;
}

function parseInstant(value: Date | string) {
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) throw new TrainerLearnerSummaryRepositoryError();
  return instant;
}

export class TrainerLearnerSummaryRepositoryError extends Error {
  constructor() {
    super("Trainer learner summary data violates the application contract.");
    this.name = "TrainerLearnerSummaryRepositoryError";
  }
}
