import "server-only";

import type { PoolClient } from "pg";
import { isUuid } from "../account-security.ts";
import { PRACTICE_QUIZ_DAILY_XP_LIMIT } from "../xp-domain.ts";
import { getDatabasePool } from "./db.ts";

export type XpSourceType = "lesson" | "module_quiz" | "challenge" | "practice_quiz" | "lab";

export type PracticeQuizXpStatus =
  | { status: "awarded"; xpAmount: number }
  | { status: "daily-limit" }
  | { status: "ineligible" };

type AwardedRow = { xp_amount: number };

export async function awardCanonicalXpEventWithClient(
  client: PoolClient,
  input: {
    userId: string;
    sourceType: Exclude<XpSourceType, "practice_quiz">;
    sourceKey: string;
    xpAmount: number;
    awardedAt: Date;
  },
) {
  assertAwardInput(input);
  const result = await client.query<AwardedRow>(
    `INSERT INTO xp_events
       (user_id, source_type, source_key, xp_amount, awarded_at)
     SELECT learner.id, $2, $3, $4, $5
     FROM users learner
     WHERE learner.id = $1
       AND learner.role = 'learner'
       AND learner.disabled_at IS NULL
     ON CONFLICT (user_id, source_type, source_key) DO NOTHING
     RETURNING xp_amount`,
    [input.userId, input.sourceType, input.sourceKey, input.xpAmount, input.awardedAt],
  );
  return result.rows[0]?.xp_amount ?? null;
}

export async function awardPracticeQuizXpWithClient(
  client: PoolClient,
  input: {
    userId: string;
    attemptId: string;
    xpAmount: number;
    completedAt: Date;
  },
): Promise<PracticeQuizXpStatus> {
  assertAwardInput({
    userId: input.userId,
    sourceType: "practice_quiz",
    sourceKey: input.attemptId,
    xpAmount: input.xpAmount,
    awardedAt: input.completedAt,
  });

  const eligible = await client.query(
    `SELECT id FROM users
     WHERE id = $1 AND role = 'learner' AND disabled_at IS NULL`,
    [input.userId],
  );
  if (!eligible.rowCount) return { status: "ineligible" };

  const rewardDateResult = await client.query<{ reward_date: string }>(
    `SELECT ($1::timestamptz AT TIME ZONE 'Europe/Berlin')::date AS reward_date`,
    [input.completedAt],
  );
  const rewardDate = rewardDateResult.rows[0]?.reward_date;
  if (!rewardDate) throw new XpRepositoryDataError();

  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
    [`xp-practice:${input.userId}:${rewardDate}`],
  );

  const existing = await readPracticeEventWithClient(client, input.userId, input.attemptId);
  if (existing) return { status: "awarded", xpAmount: existing.xp_amount };

  const inserted = await client.query<AwardedRow>(
    `WITH available_slot AS (
       SELECT slots.slot
       FROM generate_series(1, $6::integer) AS slots(slot)
       WHERE NOT EXISTS (
         SELECT 1 FROM xp_events event
         WHERE event.user_id = $1
           AND event.source_type = 'practice_quiz'
           AND event.reward_date = $5::date
           AND event.daily_slot = slots.slot
       )
       ORDER BY slots.slot ASC
       LIMIT 1
     )
     INSERT INTO xp_events
       (user_id, source_type, source_key, xp_amount, awarded_at, reward_date, daily_slot)
     SELECT $1, 'practice_quiz', $2, $3, $4, $5::date, available_slot.slot
     FROM available_slot
     ON CONFLICT DO NOTHING
     RETURNING xp_amount`,
    [
      input.userId,
      input.attemptId,
      input.xpAmount,
      input.completedAt,
      rewardDate,
      PRACTICE_QUIZ_DAILY_XP_LIMIT,
    ],
  );
  const event = inserted.rows[0];
  return event
    ? { status: "awarded", xpAmount: event.xp_amount }
    : { status: "daily-limit" };
}

export type XpEventRecord = {
  id: string;
  sourceType: XpSourceType;
  sourceKey: string;
  xpAmount: number;
  awardedAt: string;
};

export type RecentXpEventRecord = XpEventRecord & {
  challengeTitle?: string;
  practiceCategoryIds: readonly string[];
  uniqueHintsUsed?: number;
};

export async function readXpEventsForUser(userId: string): Promise<readonly XpEventRecord[]> {
  if (!isUuid(userId)) throw new XpRepositoryDataError();
  const result = await getDatabasePool().query<{
    id: string;
    source_type: XpSourceType;
    source_key: string;
    xp_amount: number;
    awarded_at: Date;
  }>(
    `SELECT id::text, source_type, source_key, xp_amount, awarded_at
     FROM xp_events
     WHERE user_id = $1
     ORDER BY awarded_at ASC, id ASC`,
    [userId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    xpAmount: row.xp_amount,
    awardedAt: row.awarded_at.toISOString(),
  }));
}

export async function readXpEventsForUsers(userIds: readonly string[]) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.some((userId) => !isUuid(userId))) throw new XpRepositoryDataError();
  const events = new Map<string, XpEventRecord[]>(uniqueUserIds.map((userId) => [userId, []]));
  if (uniqueUserIds.length === 0) return events;
  const result = await getDatabasePool().query<{
    user_id: string;
    id: string;
    source_type: XpSourceType;
    source_key: string;
    xp_amount: number;
    awarded_at: Date;
  }>(
    `SELECT user_id, id::text, source_type, source_key, xp_amount, awarded_at
     FROM xp_events
     WHERE user_id = ANY($1::uuid[])
     ORDER BY user_id ASC, awarded_at ASC, id ASC`,
    [uniqueUserIds],
  );
  for (const row of result.rows) {
    const userEvents = events.get(row.user_id);
    if (!userEvents) throw new XpRepositoryDataError();
    userEvents.push({
      id: row.id,
      sourceType: row.source_type,
      sourceKey: row.source_key,
      xpAmount: row.xp_amount,
      awardedAt: row.awarded_at.toISOString(),
    });
  }
  return events;
}

export async function readRecentXpEventsForUser(
  userId: string,
  limit = 8,
): Promise<readonly RecentXpEventRecord[]> {
  if (!isUuid(userId) || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw new XpRepositoryDataError();
  }
  const result = await getDatabasePool().query<{
    id: string;
    source_type: XpSourceType;
    source_key: string;
    xp_amount: number;
    awarded_at: Date;
    challenge_title: string | null;
    practice_category_ids: string[] | null;
    unique_hints_used: number | null;
  }>(
    `SELECT event.id::text, event.source_type, event.source_key, event.xp_amount, event.awarded_at,
            challenge.title AS challenge_title,
            practice.selected_category_ids AS practice_category_ids,
            lab.unique_hints_used
     FROM xp_events event
     LEFT JOIN challenge_assignments assignment
       ON event.source_type = 'challenge'
      AND assignment.id::text = event.source_key
      AND assignment.learner_id = event.user_id
     LEFT JOIN challenges challenge ON challenge.id = assignment.challenge_id
     LEFT JOIN practice_quiz_attempts practice
       ON event.source_type = 'practice_quiz'
      AND practice.id::text = event.source_key
      AND practice.user_id = event.user_id
     LEFT JOIN learner_lab_completion_history lab
       ON event.source_type = 'lab'
      AND lab.user_id = event.user_id
      AND lab.lab_id = event.source_key
     WHERE event.user_id = $1
     ORDER BY event.awarded_at DESC, event.id DESC
     LIMIT $2`,
    [userId, limit],
  );
  return result.rows.map((row) => ({
    id: row.id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    xpAmount: row.xp_amount,
    awardedAt: row.awarded_at.toISOString(),
    challengeTitle: row.challenge_title ?? undefined,
    practiceCategoryIds: row.practice_category_ids ?? [],
    uniqueHintsUsed: row.unique_hints_used ?? undefined,
  }));
}
export async function readTotalXpForUser(userId: string) {
  if (!isUuid(userId)) throw new XpRepositoryDataError();
  const result = await getDatabasePool().query<{ total_xp: string }>(
    `SELECT COALESCE(sum(xp_amount), 0)::text AS total_xp
     FROM xp_events
     WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0]?.total_xp ?? "0";
}

export async function readPracticeQuizXpStatus(
  userId: string,
  attemptId: string,
): Promise<PracticeQuizXpStatus> {
  if (!isUuid(userId) || !isUuid(attemptId)) throw new XpRepositoryDataError();
  const result = await getDatabasePool().query<{
    role: string;
    disabled_at: Date | null;
    xp_amount: number | null;
  }>(
    `SELECT learner.role, learner.disabled_at, event.xp_amount
     FROM users learner
     LEFT JOIN xp_events event
       ON event.user_id = learner.id
      AND event.source_type = 'practice_quiz'
      AND event.source_key = $2
     WHERE learner.id = $1`,
    [userId, attemptId],
  );
  const row = result.rows[0];
  if (!row || row.role !== "learner" || row.disabled_at !== null) return { status: "ineligible" };
  return row.xp_amount === null
    ? { status: "daily-limit" }
    : { status: "awarded", xpAmount: row.xp_amount };
}

async function readPracticeEventWithClient(
  client: PoolClient,
  userId: string,
  attemptId: string,
) {
  return (await client.query<AwardedRow>(
    `SELECT xp_amount FROM xp_events
     WHERE user_id = $1 AND source_type = 'practice_quiz' AND source_key = $2`,
    [userId, attemptId],
  )).rows[0];
}

function assertAwardInput(input: {
  userId: string;
  sourceType: XpSourceType;
  sourceKey: string;
  xpAmount: number;
  awardedAt: Date;
}) {
  if (!isUuid(input.userId) || !input.sourceKey || input.sourceKey.length > 360
    || !Number.isSafeInteger(input.xpAmount) || input.xpAmount < 1 || input.xpAmount > 1000
    || Number.isNaN(input.awardedAt.getTime())) throw new XpRepositoryDataError();
}

export class XpRepositoryDataError extends Error {
  constructor() {
    super("XP repository data violates the application contract.");
    this.name = "XpRepositoryDataError";
  }
}
