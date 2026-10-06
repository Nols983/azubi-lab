import assert from "node:assert/strict";
import { getDatabasePool } from "../src/app/lib/server/db.ts";
import {
  canSelectProfileTitle,
  deriveLearnerRewardState,
} from "../src/app/lib/progression-rewards.ts";
import {
  readProfilePreferences,
  saveActiveTitlePreference,
} from "../src/app/lib/server/profile-preference-repository.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = Date.now();
const fixtureIds: string[] = [];
const emptyEvidence = {
  completedModuleIds: [],
  perfectQuizModuleIds: [],
  completedNormalLabIds: [],
  zeroHintNormalLabIds: [],
  normalLabCount: 16,
};

try {
  const users = (await pool.query<{ id: string; role: "learner" | "observer" | "instructor" | "admin" }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role)
     VALUES
       ($1, 'Profile Test Learner', 'test-hash', 'learner'),
       ($2, 'Profile Test Observer', 'test-hash', 'observer'),
       ($3, 'Profile Test Instructor', 'test-hash', 'instructor'),
       ($4, 'Profile Test Admin', 'test-hash', 'admin')
     RETURNING id, role`,
    [
      `profile-test-learner-${suffix}`,
      `profile-test-observer-${suffix}`,
      `profile-test-instructor-${suffix}`,
      `profile-test-admin-${suffix}`,
    ],
  )).rows;
  fixtureIds.push(...users.map((user) => user.id));
  const user = (role: typeof users[number]["role"]) => {
    const match = users.find((candidate) => candidate.role === role);
    assert.ok(match);
    return match;
  };

  for (const role of ["instructor", "admin"] as const) {
    const account = user(role);
    assert.equal(canSelectProfileTitle(role, "level-infrastruktur-meister"), true);
    await saveActiveTitlePreference(account.id, "level-infrastruktur-meister");
    assert.equal((await readProfilePreferences(account.id)).activeTitleId, "level-infrastruktur-meister");
    assert.equal(canSelectProfileTitle(role, "achievement-packet-whisperer"), true);
    await saveActiveTitlePreference(account.id, "achievement-packet-whisperer");
    const preferences = await readProfilePreferences(account.id);
    assert.equal(preferences.activeTitleId, "achievement-packet-whisperer");
    assert.deepEqual(preferences.pinnedBadgeIds, []);
  }

  const learner = user("learner");
  const learnerState = deriveLearnerRewardState({ totalXp: 0, evidence: emptyEvidence });
  assert.equal(canSelectProfileTitle("learner", "level-infrastruktur-meister", learnerState), false);
  assert.equal(canSelectProfileTitle("learner", "level-systemstarter", learnerState), true);
  await saveActiveTitlePreference(learner.id, "level-systemstarter");
  assert.equal((await readProfilePreferences(learner.id)).activeTitleId, "level-systemstarter");

  assert.equal(canSelectProfileTitle("observer", "level-systemstarter"), false);
  for (const role of ["learner", "observer", "instructor", "admin"] as const) {
    assert.equal(canSelectProfileTitle(role, "unknown-title", learnerState), false);
  }

  const progressionCounts = await pool.query<{
    xp_count: string;
    lesson_count: string;
    quiz_count: string;
    lab_count: string;
  }>(
    `SELECT
       (SELECT count(*) FROM xp_events WHERE user_id = ANY($1::uuid[])) AS xp_count,
       (SELECT count(*) FROM lesson_progress WHERE user_id = ANY($1::uuid[])) AS lesson_count,
       (SELECT count(*) FROM quiz_progress WHERE user_id = ANY($1::uuid[])) AS quiz_count,
       (SELECT count(*) FROM learner_lab_completion_history WHERE user_id = ANY($1::uuid[])) AS lab_count`,
    [fixtureIds],
  );
  assert.deepEqual(progressionCounts.rows[0], {
    xp_count: "0",
    lesson_count: "0",
    quiz_count: "0",
    lab_count: "0",
  });

  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [fixtureIds]);
  fixtureIds.length = 0;

  const columns = (await pool.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'avatar_moderation_events'
     ORDER BY ordinal_position`,
  )).rows.map((row) => row.column_name);
  assert.deepEqual(columns, [
    "id",
    "moderator_user_id",
    "target_user_id",
    "action_type",
    "created_at",
  ]);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const auditUsers = (await client.query<{ id: string }>(
      `INSERT INTO users (login_identifier, display_name, password_hash, role)
       VALUES
         ($1, 'Audit Moderator', 'test-hash', 'admin'),
         ($2, 'Audit Target', 'test-hash', 'learner')
       RETURNING id`,
      [`audit-moderator-${suffix}`, `audit-target-${suffix}`],
    )).rows;
    const before = (await client.query<{ now: Date }>("SELECT clock_timestamp() AS now")).rows[0].now;
    const event = (await client.query<{
      moderator_user_id: string;
      target_user_id: string;
      action_type: string;
      created_at: Date;
    }>(
      `INSERT INTO avatar_moderation_events
         (moderator_user_id, target_user_id, action_type)
       VALUES ($1, $2, 'profile_avatar_removed')
       RETURNING moderator_user_id, target_user_id, action_type, created_at`,
      [auditUsers[0].id, auditUsers[1].id],
    )).rows[0];
    const after = (await client.query<{ now: Date }>("SELECT clock_timestamp() AS now")).rows[0].now;
    assert.equal(event.moderator_user_id, auditUsers[0].id);
    assert.equal(event.target_user_id, auditUsers[1].id);
    assert.equal(event.action_type, "profile_avatar_removed");
    assert.ok(event.created_at >= before && event.created_at <= after);

    await client.query("SAVEPOINT immutable_update");
    await assert.rejects(() => client.query(
      "UPDATE avatar_moderation_events SET action_type = action_type WHERE moderator_user_id = $1",
      [auditUsers[0].id],
    ));
    await client.query("ROLLBACK TO SAVEPOINT immutable_update");

    await client.query("SAVEPOINT immutable_delete");
    await assert.rejects(() => client.query(
      "DELETE FROM avatar_moderation_events WHERE moderator_user_id = $1",
      [auditUsers[0].id],
    ));
    await client.query("ROLLBACK TO SAVEPOINT immutable_delete");
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }

  console.log("Profile title and avatar moderation database integration: PASS");
} finally {
  if (fixtureIds.length > 0) {
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [fixtureIds]).catch(() => undefined);
  }
  await pool.end();
}
