import "server-only";

import { getDatabasePool } from "./db.ts";

type TrainerLabAggregateRow = {
  user_id: string;
  lab_id: string;
  run_count: string;
  hint_count: string;
  completed_attempt_count: string;
  active_attempt_count: string;
  latest_activity_at: Date | string;
  latest_completed_at: Date | string | null;
};

export type TrainerLabAggregateRecord = {
  learnerId: string;
  labId: string;
  runCount: number;
  hintCount: number;
  completedAttemptCount: number;
  activeAttemptCount: number;
  latestActivityAt: Date;
  latestCompletedAt: Date | null;
};

export async function readTrainerLabAggregatesForLearners(learnerIds: readonly string[]) {
  const uniqueLearnerIds = [...new Set(learnerIds)];
  if (uniqueLearnerIds.length === 0) return [];

  const result = await getDatabasePool().query<TrainerLabAggregateRow>(
    `WITH attempt_facts AS (
       SELECT
         attempt.id,
         attempt.user_id,
         attempt.lab_id,
         attempt.status,
         attempt.run_number,
         greatest(
           attempt.started_at,
           COALESCE(max(event.created_at), attempt.started_at),
           COALESCE(attempt.completed_at, attempt.started_at)
         ) AS latest_activity_at,
         attempt.completed_at,
         count(event.attempt_id) FILTER (WHERE event.kind = 'hint') AS hint_count
       FROM interactive_lab_attempts attempt
       LEFT JOIN interactive_lab_events event ON event.attempt_id = attempt.id
       WHERE attempt.user_id = ANY($1::uuid[])
         AND attempt.mode = 'learner'
       GROUP BY
         attempt.id,
         attempt.user_id,
         attempt.lab_id,
         attempt.status,
         attempt.run_number,
         attempt.started_at,
         attempt.completed_at
     )
     SELECT
       user_id,
       lab_id,
       sum(run_number)::text AS run_count,
       sum(hint_count)::text AS hint_count,
       count(*) FILTER (WHERE status = 'completed')::text AS completed_attempt_count,
       count(*) FILTER (WHERE status = 'in_progress')::text AS active_attempt_count,
       max(latest_activity_at) AS latest_activity_at,
       max(completed_at) AS latest_completed_at
     FROM attempt_facts
     GROUP BY user_id, lab_id
     ORDER BY user_id ASC, lab_id ASC`,
    [uniqueLearnerIds],
  );

  return result.rows.map(mapTrainerLabAggregate);
}

function mapTrainerLabAggregate(row: TrainerLabAggregateRow): TrainerLabAggregateRecord {
  return {
    learnerId: row.user_id,
    labId: row.lab_id,
    runCount: parseCount(row.run_count),
    hintCount: parseCount(row.hint_count),
    completedAttemptCount: parseCount(row.completed_attempt_count),
    activeAttemptCount: parseCount(row.active_attempt_count),
    latestActivityAt: toDate(row.latest_activity_at),
    latestCompletedAt: row.latest_completed_at ? toDate(row.latest_completed_at) : null,
  };
}

function parseCount(value: string) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid trainer lab aggregate count.");
  return count;
}

function toDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid trainer lab aggregate timestamp.");
  return date;
}
