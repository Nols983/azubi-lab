import assert from "node:assert/strict";
import {
  AccountStatusTargetError,
  changeAccountRole,
  createManagedAccount,
  createLearnerAccount,
  DuplicateLoginIdentifierError,
  setAccountDisabled,
} from "../src/app/lib/server/admin-repository.ts";
import { getDatabasePool } from "../src/app/lib/server/db.ts";
import { generateTemporaryPassword, hashPassword } from "../src/app/lib/server/password.ts";
import {
  consumePasswordResetToken,
  createPasswordResetTokenRecord,
  PasswordResetTokenError,
} from "../src/app/lib/server/password-reset-repository.ts";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "../src/app/lib/password-reset.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = Date.now();
const login = `db-test-${suffix}`;
const fixtureUserIds: string[] = [];

try {
  const initialPasswordHash = await hashPassword(generateTemporaryPassword());
  const actor = (await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role)
     VALUES ($1, 'DB Test Admin', $2, 'admin') RETURNING id`,
    [`${login}-admin`, initialPasswordHash],
  )).rows[0];
  assert.ok(actor);
  fixtureUserIds.push(actor.id);
  const otherAdmin = (await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role)
     VALUES ($1, 'DB Test Other Admin', $2, 'admin') RETURNING id`,
    [`${login}-other-admin`, initialPasswordHash],
  )).rows[0];
  assert.ok(otherAdmin);
  fixtureUserIds.push(otherAdmin.id);
  const instructor = (await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role)
     VALUES ($1, 'DB Test Instructor', $2, 'instructor') RETURNING id`,
    [`${login}-instructor`, initialPasswordHash],
  )).rows[0];
  assert.ok(instructor);
  fixtureUserIds.push(instructor.id);

  const learner = await createLearnerAccount({
    displayName: "DB Test Learner",
    login,
    passwordHash: initialPasswordHash,
  });
  fixtureUserIds.push(learner.id);
  assert.equal(learner.role, "learner");
  assert.equal(learner.mustChangePassword, true);
  assert.equal(learner.disabledAt, null);

  const observer = await createManagedAccount({
    displayName: "DB Test Observer",
    login: `${login}-observer`,
    passwordHash: initialPasswordHash,
    role: "observer",
  });
  fixtureUserIds.push(observer.id);
  assert.equal(observer.role, "observer");
  assert.equal(observer.mustChangePassword, true);
  assert.equal((await readAccountState(observer.id)).authVersion, 1);
  assert.equal(await changeAccountRole({ actorId: actor.id, targetUserId: observer.id, role: "learner" }), true);
  assert.equal((await readAccountState(observer.id)).authVersion, 2);
  assert.equal(await changeAccountRole({ actorId: actor.id, targetUserId: observer.id, role: "observer" }), true);
  const observerState = await readAccountState(observer.id);
  assert.equal(observerState.authVersion, 3);
  assert.equal(observerState.role, "observer");

  await assert.rejects(
    () => pool.query(
      `INSERT INTO users (login_identifier, display_name, password_hash, role)
       VALUES ($1, 'Invalid Role', $2, 'owner')`,
      [`${login}-invalid-role`, initialPasswordHash],
    ),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "23514",
  );

  await assert.rejects(
    () => createLearnerAccount({ displayName: "Duplicate", login: login.toUpperCase(), passwordHash: initialPasswordHash }),
    DuplicateLoginIdentifierError,
  );

  await pool.query(
    `INSERT INTO lesson_progress
       (user_id, module_slug, lesson_slug, status, first_opened_at, updated_at, completed_at)
     VALUES ($1, 'ipv4-grundlagen', 'was-ist-eine-ip-adresse', 'completed', now(), now(), now())`,
    [learner.id],
  );

  const plaintextToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(plaintextToken);
  const resetPasswordHash = await hashPassword(generateTemporaryPassword());
  await createPasswordResetTokenRecord({
    userId: learner.id,
    createdByAdminId: actor.id,
    tokenHash,
  });
  const storedToken = (await pool.query<{ token_hash: string }>(
    "SELECT token_hash FROM password_reset_tokens WHERE user_id = $1",
    [learner.id],
  )).rows[0];
  assert.equal(storedToken.token_hash, tokenHash);
  assert.notEqual(storedToken.token_hash, plaintextToken);
  await consumePasswordResetToken({ tokenHash, passwordHash: resetPasswordHash });
  await assert.rejects(
    () => consumePasswordResetToken({ tokenHash, passwordHash: resetPasswordHash }),
    PasswordResetTokenError,
  );

  let learnerState = await readAccountState(learner.id);
  assert.deepEqual(learnerState, {
    authVersion: 2,
    disabled: false,
    lessonCount: 1,
    mustChangePassword: false,
    passwordHash: resetPasswordHash,
    resetTokenCount: 1,
    role: "learner",
  });

  assert.deepEqual(
    await setAccountDisabled({ actorId: actor.id, targetUserId: learner.id, disabled: true }),
    { changed: true, targetRole: "learner" },
  );
  learnerState = await readAccountState(learner.id);
  assert.equal(learnerState.authVersion, 3);
  assert.equal(learnerState.disabled, true);
  assert.equal(learnerState.role, "learner");
  assert.equal(learnerState.passwordHash, resetPasswordHash);
  assert.equal(learnerState.lessonCount, 1);
  assert.equal(learnerState.resetTokenCount, 1);

  assert.deepEqual(
    await setAccountDisabled({ actorId: actor.id, targetUserId: learner.id, disabled: true }),
    { changed: false, targetRole: "learner" },
  );
  assert.equal((await readAccountState(learner.id)).authVersion, 3);

  assert.deepEqual(
    await setAccountDisabled({ actorId: actor.id, targetUserId: learner.id, disabled: false }),
    { changed: true, targetRole: "learner" },
  );
  assert.equal((await readAccountState(learner.id)).authVersion, 4);
  assert.deepEqual(
    await setAccountDisabled({ actorId: actor.id, targetUserId: learner.id, disabled: false }),
    { changed: false, targetRole: "learner" },
  );
  learnerState = await readAccountState(learner.id);
  assert.equal(learnerState.authVersion, 4);
  assert.equal(learnerState.disabled, false);
  assert.equal(learnerState.role, "learner");

  assert.deepEqual(
    await setAccountDisabled({ actorId: actor.id, targetUserId: instructor.id, disabled: true }),
    { changed: true, targetRole: "instructor" },
  );
  let instructorState = await readAccountState(instructor.id);
  assert.equal(instructorState.authVersion, 2);
  assert.equal(instructorState.disabled, true);
  assert.equal(instructorState.role, "instructor");
  assert.deepEqual(
    await setAccountDisabled({ actorId: actor.id, targetUserId: instructor.id, disabled: true }),
    { changed: false, targetRole: "instructor" },
  );
  assert.equal((await readAccountState(instructor.id)).authVersion, 2);
  assert.deepEqual(
    await setAccountDisabled({ actorId: actor.id, targetUserId: instructor.id, disabled: false }),
    { changed: true, targetRole: "instructor" },
  );
  instructorState = await readAccountState(instructor.id);
  assert.equal(instructorState.authVersion, 3);
  assert.equal(instructorState.disabled, false);
  assert.equal(instructorState.role, "instructor");

  assert.deepEqual(
    await setAccountDisabled({ actorId: actor.id, targetUserId: otherAdmin.id, disabled: true }),
    { changed: true, targetRole: "admin" },
  );
  let otherAdminState = await readAccountState(otherAdmin.id);
  assert.equal(otherAdminState.authVersion, 2);
  assert.equal(otherAdminState.disabled, true);
  assert.equal(otherAdminState.role, "admin");
  assert.equal(await countUsableFixtureAdmins(), 1);

  await assert.rejects(
    () => setAccountDisabled({ actorId: actor.id, targetUserId: actor.id, disabled: true }),
    AccountStatusTargetError,
  );
  const actorState = await readAccountState(actor.id);
  assert.equal(actorState.disabled, false);
  assert.equal(actorState.role, "admin");
  assert.equal(await countUsableFixtureAdmins(), 1);

  assert.deepEqual(
    await setAccountDisabled({ actorId: actor.id, targetUserId: otherAdmin.id, disabled: false }),
    { changed: true, targetRole: "admin" },
  );
  otherAdminState = await readAccountState(otherAdmin.id);
  assert.equal(otherAdminState.authVersion, 3);
  assert.equal(otherAdminState.disabled, false);
  assert.equal(otherAdminState.role, "admin");

  await assert.rejects(
    () => setAccountDisabled({
      actorId: actor.id,
      targetUserId: "00000000-0000-4000-8000-000000000001",
      disabled: true,
    }),
    AccountStatusTargetError,
  );

  console.log("Admin database integration: PASS");
} finally {
  if (fixtureUserIds.length > 0) {
    await pool.query(
      "DELETE FROM password_reset_tokens WHERE user_id = ANY($1::uuid[]) OR created_by_admin_id = ANY($1::uuid[])",
      [fixtureUserIds],
    );
    await pool.query("DELETE FROM lesson_progress WHERE user_id = ANY($1::uuid[])", [fixtureUserIds]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [fixtureUserIds]);
  }
  const remaining = Number((await pool.query(
    "SELECT count(*) FROM users WHERE login_identifier LIKE $1",
    [`${login}%`],
  )).rows[0].count);
  assert.equal(remaining, 0);
  await pool.end();
}

async function readAccountState(userId: string) {
  const result = await pool.query<{
    auth_version: number;
    disabled: boolean;
    lesson_count: string;
    must_change_password: boolean;
    password_hash: string;
    reset_token_count: string;
    role: string;
  }>(
    `SELECT u.auth_version,
            u.disabled_at IS NOT NULL AS disabled,
            u.must_change_password,
            u.password_hash,
            u.role,
            (SELECT count(*) FROM lesson_progress lp WHERE lp.user_id = u.id) AS lesson_count,
            (SELECT count(*) FROM password_reset_tokens token WHERE token.user_id = u.id) AS reset_token_count
     FROM users u WHERE u.id = $1`,
    [userId],
  );
  const row = result.rows[0];
  assert.ok(row);
  return {
    authVersion: row.auth_version,
    disabled: row.disabled,
    lessonCount: Number(row.lesson_count),
    mustChangePassword: row.must_change_password,
    passwordHash: row.password_hash,
    resetTokenCount: Number(row.reset_token_count),
    role: row.role,
  };
}

async function countUsableFixtureAdmins() {
  return Number((await pool.query(
    `SELECT count(*) FROM users
     WHERE id = ANY($1::uuid[]) AND role = 'admin' AND disabled_at IS NULL`,
    [fixtureUserIds],
  )).rows[0].count);
}
