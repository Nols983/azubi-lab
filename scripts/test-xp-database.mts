import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { XP_REWARDS } from "../src/app/lib/xp-domain.ts";
import { getDatabasePool, withTransaction } from "../src/app/lib/server/db.ts";
import {
  awardCanonicalXpEventWithClient,
  awardPracticeQuizXpWithClient,
  readTotalXpForUser,
} from "../src/app/lib/server/xp-repository.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const userIds: string[] = [];

try {
  const appliedMigration = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations WHERE filename = '0011_immutable_xp_ledger.sql'",
  );
  assert.equal(appliedMigration.rows[0]?.filename, "0011_immutable_xp_ledger.sql");

  const learnerId = await insertUser(`xp-${suffix}-learner`, "XP Learner", "learner");
  const instructorId = await insertUser(`xp-${suffix}-instructor`, "XP Instructor", "instructor");
  const adminId = await insertUser(`xp-${suffix}-admin`, "XP Admin", "admin");
  const awardedAt = new Date("2026-07-01T10:00:00.000Z");

  for (const [sourceType, sourceKey, xpAmount] of [
    ["lesson", "ipv4-grundlagen:ip-adressen", XP_REWARDS.lesson],
    ["module_quiz", "ipv4-grundlagen", XP_REWARDS.moduleQuiz],
    ["challenge", randomUUID(), XP_REWARDS.challenge],
  ] as const) {
    assert.equal(await withTransaction((client) => awardCanonicalXpEventWithClient(client, {
      userId: learnerId, sourceType, sourceKey, xpAmount, awardedAt,
    })), xpAmount);
    assert.equal(await withTransaction((client) => awardCanonicalXpEventWithClient(client, {
      userId: learnerId, sourceType, sourceKey, xpAmount, awardedAt,
    })), null);
  }

  for (const userId of [instructorId, adminId]) {
    assert.equal(await withTransaction((client) => awardCanonicalXpEventWithClient(client, {
      userId,
      sourceType: "lesson",
      sourceKey: "ipv4-grundlagen:ip-adressen",
      xpAmount: XP_REWARDS.lesson,
      awardedAt,
    })), null);
  }

  const berlinDateWithDifferentUtcDate = new Date("2026-07-01T22:30:00.000Z");
  const concurrent = await Promise.all(Array.from({ length: 4 }, (_, index) =>
    withTransaction((client) => awardPracticeQuizXpWithClient(client, {
      userId: learnerId,
      attemptId: randomUUID(),
      xpAmount: [20, 40, 60, 80][index],
      completedAt: berlinDateWithDifferentUtcDate,
    })),
  ));
  assert.equal(concurrent.filter((result) => result.status === "awarded").length, 3);
  assert.equal(concurrent.filter((result) => result.status === "daily-limit").length, 1);

  const slots = (await pool.query<{ reward_date: string; daily_slot: number }>(
    `SELECT reward_date::text, daily_slot FROM xp_events
     WHERE user_id = $1 AND source_type = 'practice_quiz'
     ORDER BY reward_date, daily_slot`,
    [learnerId],
  )).rows;
  assert.deepEqual(slots, [
    { reward_date: "2026-07-02", daily_slot: 1 },
    { reward_date: "2026-07-02", daily_slot: 2 },
    { reward_date: "2026-07-02", daily_slot: 3 },
  ]);

  const nextDay = await withTransaction((client) => awardPracticeQuizXpWithClient(client, {
    userId: learnerId,
    attemptId: randomUUID(),
    xpAmount: 100,
    completedAt: new Date("2026-07-02T22:30:00.000Z"),
  }));
  assert.deepEqual(nextDay, { status: "awarded", xpAmount: 100 });

  const beforeDstJump = await withTransaction((client) => awardPracticeQuizXpWithClient(client, {
    userId: learnerId,
    attemptId: randomUUID(),
    xpAmount: 20,
    completedAt: new Date("2026-03-29T00:30:00.000Z"),
  }));
  const afterDstJump = await withTransaction((client) => awardPracticeQuizXpWithClient(client, {
    userId: learnerId,
    attemptId: randomUUID(),
    xpAmount: 40,
    completedAt: new Date("2026-03-29T01:30:00.000Z"),
  }));
  assert.deepEqual([beforeDstJump, afterDstJump], [
    { status: "awarded", xpAmount: 20 },
    { status: "awarded", xpAmount: 40 },
  ]);
  const dstSlots = (await pool.query<{ reward_date: string; daily_slot: number }>(
    `SELECT reward_date::text, daily_slot FROM xp_events
     WHERE user_id = $1 AND source_type = 'practice_quiz' AND reward_date = DATE '2026-03-29'
     ORDER BY daily_slot`,
    [learnerId],
  )).rows;
  assert.deepEqual(dstSlots, [
    { reward_date: "2026-03-29", daily_slot: 1 },
    { reward_date: "2026-03-29", daily_slot: 2 },
  ]);

  const xpEvent = (await pool.query<{ id: string }>(
    "SELECT id FROM xp_events WHERE user_id = $1 ORDER BY awarded_at, id LIMIT 1",
    [learnerId],
  )).rows[0];
  assert.ok(xpEvent);
  await assert.rejects(
    () => pool.query("UPDATE xp_events SET xp_amount = xp_amount + 1 WHERE id = $1", [xpEvent.id]),
    (error: unknown) => postgresCode(error) === "P0001",
  );

  const expectedPracticeXp = concurrent.reduce(
    (sum, result) => sum + (result.status === "awarded" ? result.xpAmount : 0),
    0,
  ) + 100 + 20 + 40;
  assert.equal(
    Number(await readTotalXpForUser(learnerId)),
    XP_REWARDS.lesson + XP_REWARDS.moduleQuiz + XP_REWARDS.challenge + expectedPracticeXp,
  );
  assert.equal(Number(await readTotalXpForUser(instructorId)), 0);
  assert.equal(Number(await readTotalXpForUser(adminId)), 0);

  console.log("XP database integration: PASS");
} finally {
  if (userIds.length > 0) await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  await pool.end();
}

async function insertUser(login: string, displayName: string, role: "learner" | "instructor" | "admin") {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role)
     VALUES ($1, $2, 'xp-integration-test-hash', $3)
     RETURNING id`,
    [login, displayName, role],
  );
  userIds.push(result.rows[0].id);
  return result.rows[0].id;
}

function postgresCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}
