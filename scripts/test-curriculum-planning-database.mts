import assert from "node:assert/strict";
import { learningModules } from "../src/app/data/learning-modules.ts";
import { getQuizForModule, quizzes } from "../src/app/data/quizzes.ts";
import { getOverallProgress } from "../src/app/lib/learner-progress.ts";
import {
  createLearnerAccount,
  findLearnerAccountById,
  setAccountDisabled,
} from "../src/app/lib/server/admin-repository.ts";
import {
  listAllAssignmentsForAdmin,
} from "../src/app/lib/server/challenge-assignment-repository.ts";
import {
  archiveCurriculumAssignment,
  assignCurriculumModules,
  CurriculumAssignmentLearnerInvalidError,
  CurriculumAssignmentModuleInvalidError,
  DuplicateCurriculumAssignmentError,
  listCurriculumAssignmentsForLearner,
  listCurriculumAssignmentsForLearners,
  updateCurriculumAssignment,
} from "../src/app/lib/server/curriculum-assignment-repository.ts";
import { getDatabasePool } from "../src/app/lib/server/db.ts";
import { generateTemporaryPassword, hashPassword } from "../src/app/lib/server/password.ts";
import { readLearnerProgressForUsers } from "../src/app/lib/server/progress-repository.ts";
import { buildTrainerReportingSnapshot } from "../src/app/lib/trainer-reporting.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = Date.now();
const adminLogin = `planning-db-admin-${suffix}`;
const learnerALogin = `planning-db-a-${suffix}`;
const learnerBLogin = `planning-db-b-${suffix}`;
const fixtureUserIds: string[] = [];
const challengeIds: string[] = [];

try {
  const passwordHash = await hashPassword(generateTemporaryPassword());
  const admin = (await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role)
     VALUES ($1, 'Planning DB Admin', $2, 'admin') RETURNING id`,
    [adminLogin, passwordHash],
  )).rows[0];
  assert.ok(admin);
  fixtureUserIds.push(admin.id);
  const learnerA = await createLearnerAccount({ displayName: "Planning DB Azubi A", login: learnerALogin, passwordHash });
  const learnerB = await createLearnerAccount({ displayName: "Planning DB Azubi B", login: learnerBLogin, passwordHash });
  fixtureUserIds.push(learnerA.id, learnerB.id);

  const pastTarget = new Date("2026-08-20T10:00:00.000Z");
  const futureTarget = new Date("2026-09-20T10:00:00.000Z");
  const dnsIds = await assignCurriculumModules({ learnerId: learnerA.id, moduleSlugs: ["dns"], assignedBy: admin.id, targetAt: pastTarget, note: "DNS priorisieren" });
  assert.equal(dnsIds.length, 1);
  await assert.rejects(
    () => assignCurriculumModules({ learnerId: learnerA.id, moduleSlugs: ["dns"], assignedBy: admin.id, targetAt: null, note: null }),
    DuplicateCurriculumAssignmentError,
  );
  const [subnetId] = await assignCurriculumModules({ learnerId: learnerA.id, moduleSlugs: ["subnetting"], assignedBy: admin.id, targetAt: futureTarget, note: null });
  const [ipv4Id] = await assignCurriculumModules({ learnerId: learnerA.id, moduleSlugs: ["ipv4-grundlagen"], assignedBy: admin.id, targetAt: pastTarget, note: "Bestehenden Abschluss sichtbar machen" });
  assert.ok(subnetId && ipv4Id);

  const changedTarget = new Date("2026-09-25T12:30:00.000Z");
  await updateCurriculumAssignment({ assignmentId: subnetId, targetAt: changedTarget, note: "Subnetting im Anschluss" });
  const assignments = await listCurriculumAssignmentsForLearner(learnerA.id);
  assert.equal(assignments.find((assignment) => assignment.id === subnetId)?.targetAt?.toISOString(), changedTarget.toISOString());
  assert.equal(assignments.find((assignment) => assignment.id === subnetId)?.note, "Subnetting im Anschluss");

  await archiveCurriculumAssignment(subnetId);
  assert.equal((await listCurriculumAssignmentsForLearner(learnerA.id)).some((assignment) => assignment.id === subnetId), false);
  assert.equal((await listCurriculumAssignmentsForLearner(learnerA.id, true)).find((assignment) => assignment.id === subnetId)?.archivedAt instanceof Date, true);
  const [reactivatedId] = await assignCurriculumModules({ learnerId: learnerA.id, moduleSlugs: ["subnetting"], assignedBy: admin.id, targetAt: futureTarget, note: "Reaktiviert" });
  assert.equal(reactivatedId, subnetId);

  await assert.rejects(
    () => assignCurriculumModules({ learnerId: admin.id, moduleSlugs: ["dhcp"], assignedBy: admin.id, targetAt: null, note: null }),
    CurriculumAssignmentLearnerInvalidError,
  );
  await assert.rejects(
    () => assignCurriculumModules({ learnerId: learnerA.id, moduleSlugs: ["dns-fehleranalyse"], assignedBy: admin.id, targetAt: null, note: null }),
    CurriculumAssignmentModuleInvalidError,
  );

  await setAccountDisabled({ actorId: admin.id, targetUserId: learnerA.id, disabled: true });
  assert.equal((await listCurriculumAssignmentsForLearner(learnerA.id)).length, 3);
  await assert.rejects(
    () => assignCurriculumModules({ learnerId: learnerA.id, moduleSlugs: ["dhcp"], assignedBy: admin.id, targetAt: null, note: null }),
    CurriculumAssignmentLearnerInvalidError,
  );
  await setAccountDisabled({ actorId: admin.id, targetUserId: learnerA.id, disabled: false });
  assert.equal((await listCurriculumAssignmentsForLearner(learnerA.id)).length, 3);

  await pool.query(
    `INSERT INTO lesson_progress
       (user_id, module_slug, lesson_slug, status, first_opened_at, updated_at, completed_at)
     VALUES ($1, 'dns', 'was-ist-dns', 'completed', $2, $2, $2)`,
    [learnerA.id, new Date("2026-08-22T10:00:00.000Z")],
  );
  const ipv4 = learningModules.find((learningModule) => learningModule.slug === "ipv4-grundlagen");
  const ipv4Quiz = getQuizForModule("ipv4-grundlagen");
  assert.ok(ipv4?.lessons && ipv4Quiz);
  for (const lesson of ipv4.lessons) {
    await pool.query(
      `INSERT INTO lesson_progress
         (user_id, module_slug, lesson_slug, status, first_opened_at, updated_at, completed_at)
       VALUES ($1, $2, $3, 'completed', $4, $4, $4)`,
      [learnerA.id, ipv4.slug, lesson.slug, new Date("2026-08-22T11:00:00.000Z")],
    );
  }
  await pool.query(
    `INSERT INTO quiz_progress
       (user_id, module_slug, attempts, latest_correct, latest_total, latest_percentage,
        best_correct, best_total, best_percentage, last_submitted_at)
     VALUES ($1, 'ipv4-grundlagen', 1, $2, $2, 100, $2, $2, 100, $3)`,
    [learnerA.id, ipv4Quiz.questions.length, new Date("2026-08-22T12:00:00.000Z")],
  );

  challengeIds.push(await createChallengeFixture(admin.id, learnerA.id, "Pending Review", "submitted"));
  challengeIds.push(await createChallengeFixture(admin.id, learnerA.id, "Revision Requested", "revision-requested"));
  challengeIds.push(await createChallengeFixture(admin.id, learnerB.id, "Overdue Open", "overdue"));

  const learners = [await findLearnerAccountById(learnerA.id), await findLearnerAccountById(learnerB.id)];
  assert.ok(learners[0] && learners[1]);
  const states = await readLearnerProgressForUsers([learnerA.id, learnerB.id]);
  const planningRecords = await listCurriculumAssignmentsForLearners([learnerA.id, learnerB.id]);
  const fixtureChallenges = (await listAllAssignmentsForAdmin(new Date("2026-08-24T12:00:00.000Z")))
    .filter((assignment) => challengeIds.includes(assignment.challenge.id));
  const report = buildTrainerReportingSnapshot({
    learners: [learners[0], learners[1]],
    states,
    planningRecords,
    challengeAssignments: fixtureChallenges,
    now: new Date("2026-08-24T12:00:00.000Z"),
  });
  assert.deepEqual(report.counts.learners, { total: 2, withoutActivity: 1, active: 1, withCompletedModules: 1, disabled: 0 });
  assert.deepEqual(report.counts.planning, { active: 3, overdue: 1, completed: 1 });
  assert.equal(report.counts.challenges.open, 3);
  assert.equal(report.counts.challenges.pendingReview, 1);
  assert.equal(report.counts.challenges.revisionRequested, 1);
  assert.equal(report.counts.challenges.overdue, 1);
  assert.deepEqual(report.attention.map((item) => item.kind), ["challenge-revision", "challenge-overdue", "challenge-review", "curriculum-overdue"]);
  const dnsReport = report.curriculumModules.find((module) => module.module.slug === "dns");
  const ipv4Report = report.curriculumModules.find((module) => module.module.slug === "ipv4-grundlagen");
  assert.ok(dnsReport && ipv4Report);
  assert.deepEqual(dnsReport.counts, { notStarted: 1, inProgress: 1, completed: 0, assigned: 1, overdue: 1 });
  assert.equal(dnsReport.averageProgress, 7);
  assert.equal(ipv4Report.averageProgress, 50);
  const expectedOverall = getOverallProgress(states.get(learnerA.id)!, learningModules, new Set(quizzes.map((quiz) => quiz.moduleSlug)));
  assert.equal(report.learnerReports[0].progress.overall.percentage, expectedOverall.percentage);

  console.log("Curriculum planning/reporting database integration: PASS");
} finally {
  if (challengeIds.length > 0) {
    await pool.query("DELETE FROM challenge_review_criterion_results WHERE review_id IN (SELECT r.id FROM challenge_reviews r JOIN challenge_submissions s ON s.id = r.submission_id JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[]))", [challengeIds]);
    await pool.query("DELETE FROM challenge_reviews WHERE submission_id IN (SELECT s.id FROM challenge_submissions s JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[]))", [challengeIds]);
    await pool.query("DELETE FROM challenge_submission_attachments WHERE submission_id IN (SELECT s.id FROM challenge_submissions s JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[]))", [challengeIds]);
    await pool.query("DELETE FROM challenge_submissions WHERE assignment_id IN (SELECT id FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[]))", [challengeIds]);
    await pool.query("DELETE FROM challenge_assignment_comments WHERE assignment_id IN (SELECT id FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[]))", [challengeIds]);
    await pool.query("DELETE FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[])", [challengeIds]);
    await pool.query("DELETE FROM challenge_rubric_criteria WHERE challenge_id = ANY($1::uuid[])", [challengeIds]);
    await pool.query("DELETE FROM challenges WHERE id = ANY($1::uuid[])", [challengeIds]);
  }
  if (fixtureUserIds.length > 0) {
    await pool.query("DELETE FROM curriculum_assignments WHERE learner_id = ANY($1::uuid[]) OR assigned_by = ANY($1::uuid[])", [fixtureUserIds]);
    await pool.query("DELETE FROM local_progress_imports WHERE user_id = ANY($1::uuid[])", [fixtureUserIds]);
    await pool.query("DELETE FROM lesson_progress WHERE user_id = ANY($1::uuid[])", [fixtureUserIds]);
    await pool.query("DELETE FROM quiz_progress WHERE user_id = ANY($1::uuid[])", [fixtureUserIds]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [fixtureUserIds]);
  }
  const remaining = Number((await pool.query("SELECT count(*) FROM users WHERE login_identifier = ANY($1::text[])", [[adminLogin, learnerALogin, learnerBLogin]])).rows[0].count);
  assert.equal(remaining, 0);
  console.log("Curriculum planning/reporting DB cleanup counts:", { users: fixtureUserIds.length, challenges: challengeIds.length });
  await pool.end();
}

async function createChallengeFixture(adminId: string, learnerId: string, title: string, state: "submitted" | "revision-requested" | "overdue") {
  const challenge = (await pool.query<{ id: string }>(
    `INSERT INTO challenges (title, short_description, instructions, status, created_by)
     VALUES ($1, 'Reporting fixture', 'Controlled reporting fixture', 'published', $2) RETURNING id`,
    [title, adminId],
  )).rows[0];
  assert.ok(challenge);
  const dueAt = state === "overdue" ? new Date("2026-08-20T10:00:00.000Z") : new Date("2026-09-20T10:00:00.000Z");
  const assignment = (await pool.query<{ id: string }>(
    `INSERT INTO challenge_assignments (challenge_id, learner_id, assigned_by, due_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [challenge.id, learnerId, adminId, dueAt],
  )).rows[0];
  assert.ok(assignment);
  if (state !== "overdue") {
    const submission = (await pool.query<{ id: string }>(
      `INSERT INTO challenge_submissions (assignment_id, submission_number, content, submitted_at)
       VALUES ($1, 1, 'Controlled submission', $2) RETURNING id`,
      [assignment.id, new Date("2026-08-23T10:00:00.000Z")],
    )).rows[0];
    assert.ok(submission);
    if (state === "revision-requested") {
      await pool.query(
        `INSERT INTO challenge_reviews (submission_id, reviewed_by, decision, feedback, reviewed_at)
         VALUES ($1, $2, 'revision-requested', 'Bitte überarbeiten.', $3)`,
        [submission.id, adminId, new Date("2026-08-23T12:00:00.000Z")],
      );
    }
  }
  return challenge.id;
}
