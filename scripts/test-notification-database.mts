import assert from "node:assert/strict";
import { learningModules } from "../src/app/data/learning-modules.ts";
import { quizzes } from "../src/app/data/quizzes.ts";
import { generateNotifications, notifyTrainersAboutSubmissionBestEffort, notifyLearnerAboutReviewBestEffort } from "../src/app/lib/server/notification-generation-service.ts";
import {
  countUnreadNotificationsForUser,
  dismissNotificationForUser,
  insertNotificationCandidates,
  listNotificationsForUser,
  markNotificationReadForUser,
  markVisibleNotificationsReadForUser,
} from "../src/app/lib/server/notification-repository.ts";
import { getDatabasePool } from "../src/app/lib/server/db.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const prefix = `notification-db-${suffix}`;
const userIds: string[] = [];
const challengeIds: string[] = [];
const now = new Date("2026-08-25T12:00:00.000Z");

try {
  assert.equal(
    (await pool.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations WHERE filename = '0015_actionable_learner_notifications.sql'",
    )).rows[0]?.filename,
    "0015_actionable_learner_notifications.sql",
  );
  const adminA = await insertUser(`${prefix}-admin-a`, "Notification Admin A", "admin");
  const adminB = await insertUser(`${prefix}-admin-b`, "Notification Admin B", "admin");
  const instructor = await insertUser(`${prefix}-instructor`, "Notification Instructor", "instructor");
  const disabledAdmin = await insertUser(`${prefix}-admin-disabled`, "Notification Disabled Admin", "admin", true);
  const learnerA = await insertUser(`${prefix}-learner-a`, "Notification Learner A", "learner");
  const learnerB = await insertUser(`${prefix}-learner-b`, "Notification Learner B", "learner");

  await createCurriculumFixture(learnerA, adminA, "dns", new Date("2026-08-27T12:00:00.000Z"));
  await createCurriculumFixture(learnerA, adminA, "dhcp", new Date("2026-08-26T00:00:00.000Z"));
  const overdueCurriculum = await createCurriculumFixture(learnerA, adminA, "subnetting", new Date("2026-08-24T12:00:00.000Z"));
  const completedCurriculum = await createCurriculumFixture(learnerB, adminA, "ipv4-grundlagen", new Date("2026-08-24T12:00:00.000Z"));
  await completeModule(learnerB, "ipv4-grundlagen", new Date("2026-08-24T10:00:00.000Z"));

  await createChallengeFixture(adminA, learnerA, "Challenge in drei Tagen", new Date("2026-08-28T12:00:00.000Z"));
  await createChallengeFixture(adminA, learnerA, "Challenge in einem Tag", new Date("2026-08-26T12:00:00.000Z"));
  const overdueChallenge = await createChallengeFixture(adminA, learnerA, "Challenge überfällig", new Date("2026-08-24T12:00:00.000Z"));
  const pending = await createChallengeFixture(adminA, learnerA, "Challenge wartet auf Review", new Date("2026-08-24T12:00:00.000Z"));
  const pendingSubmission = await submit(pending.assignmentId, "2026-08-24T14:00:00.000Z");
  await notifyTrainersAboutSubmissionBestEffort(pendingSubmission);
  await notifyTrainersAboutSubmissionBestEffort(pendingSubmission);

  const revision = await createChallengeFixture(adminA, learnerB, "Challenge mit Überarbeitung", new Date("2026-08-24T12:00:00.000Z"));
  const revisionSubmission = await submit(revision.assignmentId, "2026-08-24T15:00:00.000Z");
  const revisionReview = await review(revisionSubmission, adminA, "revision-requested", "2026-08-24T16:00:00.000Z");
  await notifyLearnerAboutReviewBestEffort(revisionReview);

  const approved = await createChallengeFixture(adminA, learnerB, "Freigegebene Challenge", new Date("2026-08-24T12:00:00.000Z"));
  const approvedSubmission = await submit(approved.assignmentId, "2026-08-24T17:00:00.000Z");
  const approvalReview = await review(approvedSubmission, adminB, "approved", "2026-08-24T18:00:00.000Z");
  await notifyLearnerAboutReviewBestEffort(approvalReview);

  const legacy = await createChallengeFixture(adminA, learnerB, "Früherer Abschluss", new Date("2026-08-24T12:00:00.000Z"));
  await pool.query("UPDATE challenge_assignments SET started_at = assigned_at, completed_at = assigned_at WHERE id = $1", [legacy.assignmentId]);

  assert.equal(await notificationCount(adminA, `challenge-review-pending:${pendingSubmission}`), 1);
  assert.equal(await notificationCount(adminB, `challenge-review-pending:${pendingSubmission}`), 1);
  assert.equal(await notificationCount(instructor, `challenge-review-pending:${pendingSubmission}`), 1);
  assert.equal(await notificationCount(disabledAdmin, `challenge-review-pending:${pendingSubmission}`), 0);
  assert.equal(await notificationCount(learnerB, `challenge-revision:${revisionReview}`), 1);
  assert.equal(await notificationCount(learnerB, `challenge-approved:${approvalReview}`), 1);

  const first = await generateNotifications(now);
  const fixtureCountAfterFirst = await fixtureNotificationCount();
  const second = await generateNotifications(now);
  assert.equal(await fixtureNotificationCount(), fixtureCountAfterFirst);
  assert.equal(second.inserted, 0);
  assert.equal(second.push.eligibleNotifications, 0);
  assert.ok(first.inserted > 0);
  assert.ok(first.push.eligibleNotifications > 0);

  assert.equal(await notificationCount(learnerA, "curriculum-due", true), 2);
  assert.equal(await notificationCount(learnerA, `curriculum-overdue:${overdueCurriculum}:overdue`), 1);
  assert.equal(await notificationCount(learnerB, `curriculum-overdue:${completedCurriculum}:overdue`), 0);
  assert.equal(await notificationCount(learnerA, "challenge-due", true), 2);
  assert.equal(await notificationCount(learnerA, `challenge-overdue:${overdueChallenge.assignmentId}:overdue`), 1);
  assert.equal(await notificationCount(learnerA, `challenge-overdue:${pending.assignmentId}:overdue`), 0);
  assert.equal(await notificationCount(learnerB, `challenge-overdue:${revision.assignmentId}:overdue`), 0);
  assert.equal(await notificationCount(adminA, `trainer-challenge-overdue:${revision.assignmentId}`), 1);
  assert.equal(await notificationCount(learnerB, `challenge-overdue:${approved.assignmentId}:overdue`), 0);
  assert.equal(await notificationCount(learnerB, `challenge-overdue:${legacy.assignmentId}:overdue`), 0);
  assert.equal(await notificationCount(adminA, `trainer-curriculum-overdue:${overdueCurriculum}`), 1);
  assert.equal(await notificationCount(adminB, `trainer-challenge-overdue:${overdueChallenge.assignmentId}`), 1);
  assert.equal(await notificationCount(instructor, `trainer-challenge-overdue:${overdueChallenge.assignmentId}`), 1);
  assert.equal(await notificationCount(disabledAdmin, "activity-digest:2026-08-24"), 0);
  assert.equal(await notificationCount(adminA, "activity-digest:2026-08-24"), 1);
  assert.equal(await notificationCount(adminB, "activity-digest:2026-08-24"), 1);
  assert.equal(await notificationCount(instructor, "activity-digest:2026-08-24"), 1);
  const digest = (await pool.query<{ message: string }>("SELECT message FROM notifications WHERE user_id = $1 AND dedupe_key = 'activity-digest:2026-08-24'", [adminA])).rows[0];
  assert.match(digest.message, /abgeschlossene Lektionen/);
  assert.match(digest.message, /Quiz-Abgaben/);
  assert.match(digest.message, /abgeschlossene Module/);
  assert.match(digest.message, /Challenge-Abgaben/);
  assert.match(digest.message, /Challenge-Freigaben/);
  assert.match(digest.message, /Überarbeitungsanforderungen/);

  const adminList = await listNotificationsForUser(adminA);
  assert.ok(adminList.length > 0);
  const owned = adminList[0];
  assert.equal(await markNotificationReadForUser(owned.id, learnerA), false);
  assert.equal(await markNotificationReadForUser(owned.id, adminA), true);
  const afterRead = await listNotificationsForUser(adminA);
  assert.ok(afterRead.find((item) => item.id === owned.id)?.readAt);
  const firstReadIndex = afterRead.findIndex((item) => item.readAt !== null);
  assert.ok(firstReadIndex > 0);
  assert.equal(afterRead.slice(0, firstReadIndex).every((item) => item.readAt === null), true);
  assert.ok(await markVisibleNotificationsReadForUser(adminA) > 0);
  assert.equal(await countUnreadNotificationsForUser(adminA), 0);
  assert.equal(await dismissNotificationForUser(owned.id, learnerA), false);
  assert.equal(await dismissNotificationForUser(owned.id, adminA), true);
  assert.equal((await listNotificationsForUser(adminA)).some((item) => item.id === owned.id), false);

  const safeInsert = await insertNotificationCandidates([{ userId: learnerA, type: "challenge-due", title: "Sicher", message: "Interner Link", href: "/challenges", dedupeKey: "manual-safe" }]);
  assert.equal(safeInsert.attempted, 1);
  assert.equal(safeInsert.inserted, 1);
  assert.equal(safeInsert.notifications.length, 1);
  assert.equal(safeInsert.notifications[0].userId, learnerA);
  assert.equal(safeInsert.notifications[0].href, "/challenges");

  const concurrentCandidate = {
    userId: learnerA,
    type: "challenge-due" as const,
    title: "Nebenläufig sicher",
    message: "Nur ein Insert darf gewinnen.",
    href: "/challenges",
    dedupeKey: "manual-concurrent-safe",
  };
  const concurrent = await Promise.all([
    insertNotificationCandidates([concurrentCandidate]),
    insertNotificationCandidates([concurrentCandidate]),
  ]);
  assert.equal(concurrent.reduce((sum, result) => sum + result.inserted, 0), 1);
  assert.equal(concurrent.reduce((sum, result) => sum + result.notifications.length, 0), 1);
  await assert.rejects(() => insertNotificationCandidates([{ userId: learnerA, type: "challenge-due", title: "Unsicher", message: "Externer Link", href: "https://example.test", dedupeKey: "manual-unsafe" }]));
  await assert.rejects(
    () => pool.query("INSERT INTO notifications (user_id, type, title, message, href, dedupe_key) VALUES ($1, 'unknown', 'Titel', 'Text', '/intern', 'invalid-type')", [learnerA]),
    (error: unknown) => postgresCode(error) === "23514",
  );
  await assert.rejects(
    () => pool.query("INSERT INTO notifications (user_id, type, title, message, href, dedupe_key) VALUES ($1, 'challenge-due', 'Titel', 'Text', '//example.test', 'invalid-href')", [learnerA]),
    (error: unknown) => postgresCode(error) === "23514",
  );
  await assert.rejects(
    () => pool.query("INSERT INTO notifications (user_id, type, title, message, href, dedupe_key) VALUES ($1, 'challenge-due', 'Titel', 'Text', $2, 'invalid-backslash-href')", [learnerA, "/\\example.test"]),
    (error: unknown) => postgresCode(error) === "23514",
  );

  console.log("Notification generation/database integration: PASS", {
    firstInserted: first.inserted,
    idempotentSecondInserted: second.inserted,
    fixtureNotifications: fixtureCountAfterFirst,
  });
} finally {
  if (userIds.length > 0) {
    await pool.query("DELETE FROM notifications WHERE user_id = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM challenge_reviews WHERE submission_id IN (SELECT submission.id FROM challenge_submissions submission JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id WHERE assignment.challenge_id = ANY($1::uuid[]))", [challengeIds]);
    await pool.query("DELETE FROM challenge_submissions WHERE assignment_id IN (SELECT id FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[]))", [challengeIds]);
    await pool.query("DELETE FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[])", [challengeIds]);
    await pool.query("DELETE FROM challenges WHERE id = ANY($1::uuid[])", [challengeIds]);
    await pool.query("DELETE FROM curriculum_assignments WHERE learner_id = ANY($1::uuid[]) OR assigned_by = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM lesson_progress WHERE user_id = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM quiz_progress WHERE user_id = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  }
  assert.equal(Number((await pool.query("SELECT count(*) FROM users WHERE login_identifier LIKE $1", [`${prefix}%`])).rows[0].count), 0);
  await pool.end();
}

async function insertUser(login: string, displayName: string, role: "admin" | "instructor" | "learner", disabled = false) {
  const row = (await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role, disabled_at)
     VALUES ($1, $2, 'notification-test-hash', $3, CASE WHEN $4 THEN now() ELSE NULL END)
     RETURNING id`,
    [login, displayName, role, disabled],
  )).rows[0];
  userIds.push(row.id);
  return row.id;
}

async function createCurriculumFixture(learnerId: string, adminId: string, moduleSlug: string, targetAt: Date) {
  const row = (await pool.query<{ id: string }>(
    `INSERT INTO curriculum_assignments (learner_id, module_slug, assigned_by, target_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [learnerId, moduleSlug, adminId, targetAt],
  )).rows[0];
  return row.id;
}

async function completeModule(learnerId: string, moduleSlug: string, completedAt: Date) {
  const learningModule = learningModules.find((item) => item.slug === moduleSlug);
  assert.ok(learningModule);
  for (const lesson of (learningModule.lessons ?? []).filter((item) => item.status === "available")) {
    await pool.query(
      `INSERT INTO lesson_progress (user_id, module_slug, lesson_slug, status, first_opened_at, updated_at, completed_at)
       VALUES ($1, $2, $3, 'completed', $4, $4, $4)`,
      [learnerId, moduleSlug, lesson.slug, completedAt],
    );
  }
  const quiz = quizzes.find((item) => item.moduleSlug === moduleSlug);
  assert.ok(quiz);
  await pool.query(
    `INSERT INTO quiz_progress (user_id, module_slug, attempts, latest_correct, latest_total, latest_percentage, best_correct, best_total, best_percentage, last_submitted_at)
     VALUES ($1, $2, 1, 1, 1, 100, 1, 1, 100, $3)`,
    [learnerId, moduleSlug, completedAt],
  );
}

async function createChallengeFixture(adminId: string, learnerId: string, title: string, dueAt: Date) {
  const challenge = (await pool.query<{ id: string }>(
    `INSERT INTO challenges (title, short_description, instructions, status, created_by)
     VALUES ($1, 'Notification fixture', 'Controlled notification fixture', 'published', $2) RETURNING id`,
    [title, adminId],
  )).rows[0];
  challengeIds.push(challenge.id);
  const assignment = (await pool.query<{ id: string }>(
    `INSERT INTO challenge_assignments (challenge_id, learner_id, assigned_by, due_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [challenge.id, learnerId, adminId, dueAt],
  )).rows[0];
  return { challengeId: challenge.id, assignmentId: assignment.id };
}

async function submit(assignmentId: string, submittedAt: string) {
  const row = (await pool.query<{ id: string }>(
    `INSERT INTO challenge_submissions (assignment_id, submission_number, content, submitted_at)
     VALUES ($1, 1, 'Controlled notification submission', $2) RETURNING id`,
    [assignmentId, submittedAt],
  )).rows[0];
  return row.id;
}

async function review(submissionId: string, adminId: string, decision: "approved" | "revision-requested", reviewedAt: string) {
  const row = (await pool.query<{ id: string }>(
    `INSERT INTO challenge_reviews (submission_id, reviewed_by, decision, feedback, reviewed_at)
     VALUES ($1, $2, $3, CASE WHEN $3 = 'approved' THEN '' ELSE 'Bitte überarbeiten.' END, $4) RETURNING id`,
    [submissionId, adminId, decision, reviewedAt],
  )).rows[0];
  return row.id;
}

async function notificationCount(userId: string, keyOrType: string, byType = false) {
  const column = byType ? "type" : "dedupe_key";
  return Number((await pool.query(`SELECT count(*) FROM notifications WHERE user_id = $1 AND ${column} = $2`, [userId, keyOrType])).rows[0].count);
}

async function fixtureNotificationCount() {
  return Number((await pool.query("SELECT count(*) FROM notifications WHERE user_id = ANY($1::uuid[])", [userIds])).rows[0].count);
}

function postgresCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
}
