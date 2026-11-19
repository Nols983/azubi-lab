import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, readFile, access, rm, symlink, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDatabasePool } from "../src/app/lib/server/db.ts";
import { parseAccountDirectoryFilters } from "../src/app/lib/account-directory.ts";
import { readAccountDirectory, findDirectoryAccount } from "../src/app/lib/server/account-directory-repository.ts";
import { deleteManagedAccount, inspectAccountDeletion, protectedAccountReferenceReasons, AccountDeletionBlockedError, AccountDeletionConfirmationError, AccountDeletionTargetError } from "../src/app/lib/server/account-deletion-repository.ts";
import { cleanupDeletedAccountImages } from "../src/app/lib/server/account-file-cleanup.ts";
import { withProfileImageAccountLock } from "../src/app/lib/server/profile-image-mutation.ts";
import { LocalFilesystemProfileImageStorage } from "../src/app/lib/server/profile-image.ts";
import { createTeam, addTeamMember } from "../src/app/lib/server/team-repository.ts";
import { createTopicProposal, reviewTopicProposal } from "../src/app/lib/server/topic-proposal-repository.ts";
import { createChallengeDefinition } from "../src/app/lib/server/challenge-repository.ts";
import { assignChallengeToLearners } from "../src/app/lib/server/challenge-assignment-repository.ts";
import { createOwnedChallengeSubmission } from "../src/app/lib/server/challenge-submission-repository.ts";
import { createAdminComment } from "../src/app/lib/server/challenge-comment-repository.ts";
import { createChallengeReview } from "../src/app/lib/server/challenge-review-repository.ts";
import { insertNotificationCandidates } from "../src/app/lib/server/notification-repository.ts";
import { listLearnerAssignments } from "../src/app/lib/server/challenge-assignment-repository.ts";
import { listOwnedAssignmentSubmissions } from "../src/app/lib/server/challenge-submission-repository.ts";
import { setAccountDisabled, changeAccountRole } from "../src/app/lib/server/admin-repository.ts";
import type { AccountRole } from "../src/app/lib/auth-types.ts";

const database = new URL(process.env.DATABASE_URL ?? "http://invalid");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.pathname, "/azubi_verify");
const pool = getDatabasePool();
const root = await mkdtemp(join(tmpdir(), "azubi-directory-db-"));
process.env.PROFILE_IMAGE_STORAGE_DIR = root;
const storage = new LocalFilesystemProfileImageStorage();
const suffix = randomUUID();
const users: string[] = [];
const teams: string[] = [];
const challenges: string[] = [];
process.env.EVIDENCE_STORAGE_DIR = join(root, "evidence");
const { mkdir } = await import("node:fs/promises");
await mkdir(process.env.EVIDENCE_STORAGE_DIR);
let admin = "";

try {
  admin = await user("admin", "Directory Admin");
  const spareAdmin = await user("admin", "Spare Admin");
  const instructor = await user("instructor", "Instructor");
  const observer = await user("observer", "Observer");
  const teamA = await createTeam({ name: `Directory A ${suffix}`, slug: `directory-a-${suffix}`, createdByUserId: admin });
  const teamB = await createTeam({ name: `Directory B ${suffix}`, slug: `directory-b-${suffix}`, createdByUserId: admin });
  teams.push(teamA.id, teamB.id);
  const listIds: string[] = [];
  for (let index = 0; index < 31; index++) {
    const id = await user(index % 2 === 0 ? "learner" : "observer", `Verzeichnis ${String(index).padStart(2, "0")}`, `directory-${suffix}-list-${index}`);
    listIds.push(id);
    await pool.query("UPDATE users SET created_at = $2, must_change_password = $3, disabled_at = CASE WHEN $4::boolean THEN now() ELSE NULL END WHERE id = $1", [id, new Date(Date.UTC(2026, 0, 1, 0, 0, index)), index % 3 === 1, index % 3 === 2]);
    // Add while active; status has no effect on directory visibility.
    if (index % 2 === 0 || index % 3 === 0) await pool.query("INSERT INTO team_members (team_id, user_id, team_role) VALUES ($1, $2, 'member')", [index % 2 === 0 ? teamA.id : teamB.id, id]);
    if (index % 6 === 0) await pool.query("INSERT INTO team_members (team_id, user_id, team_role) VALUES ($1, $2, 'manager')", [teamB.id, id]);
  }
  const base = { q: `directory-${suffix}-list`, pageSize: "10" };
  const first = await readAccountDirectory(parseAccountDirectoryFilters(base));
  assert.equal(first.count, 31);
  assert.equal(first.pages, 4);
  assert.equal(first.accounts.length, 10);
  const second = await readAccountDirectory(parseAccountDirectoryFilters({ ...base, page: "2" }));
  assert.equal(second.accounts.some((account) => first.accounts.some((previous) => previous.id === account.id)), false);
  const last = await readAccountDirectory(parseAccountDirectoryFilters({ ...base, page: "999999" }));
  assert.equal(last.filters.page, 4);
  assert.equal(last.accounts.length, 1);
  const teamView = await readAccountDirectory(parseAccountDirectoryFilters({ ...base, team: teamA.id, pageSize: "50" }));
  assert.equal(teamView.count, 16);
  assert.equal(new Set(teamView.accounts.map((account) => account.id)).size, 16);
  assert.equal(teamView.accounts.find((account) => account.id === listIds[0])?.teams.length, 2);
  const noTeam = await readAccountDirectory(parseAccountDirectoryFilters({ ...base, team: "none", pageSize: "50" }));
  assert.equal(noTeam.accounts.every((account) => account.teams.length === 0), true);
  assert.equal(noTeam.count, 10);
  assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ ...base, team: randomUUID() }))).count, 0);
  assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ ...base, team: "forged" }))).count, 0);
  for (const [status, expected] of [["active", 11], ["password-change", 10], ["disabled", 10]] as const) assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ ...base, status }))).count, expected);
  assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ ...base, role: "learner" }))).count, 16);
  assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ q: `DIRECTORY-${suffix.toUpperCase()}-LIST` }))).count, 31);
  assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ q: "Verzeichnis 00" }))).accounts[0].id, listIds[0]);
  assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ ...base, sort: "newest" }))).accounts[0].id, listIds[30]);
  assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ ...base, sort: "oldest" }))).accounts[0].id, listIds[0]);
  assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ ...base, profilbild: "vorhanden" }), [listIds[0], listIds[1]])).count, 2);
  assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ ...base, profilbild: "vorhanden" }), [])).count, 0);
  const special = await user("observer", "Sonder%_Zeichen");
  assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ q: "%_" }))).accounts[0].id, special);
  assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ q: "' OR true --" }))).count, 0);
  await pool.query("UPDATE teams SET active = false WHERE id = $1", [teamA.id]);
  assert.equal((await readAccountDirectory(parseAccountDirectoryFilters({ ...base, team: teamA.id }))).count, 16);

  const candidate = await user("learner", "Delete candidate");
  const candidateLogin = await loginOf(candidate);
  await addTeamMember(teamB.id, candidate, "member");
  await pool.query("INSERT INTO profile_preferences (user_id) VALUES ($1)", [candidate]);
  await pool.query("INSERT INTO notifications (user_id, type, title, message, dedupe_key) VALUES ($1, 'challenge-due', 'Test', 'Test', $2)", [candidate, suffix]);
  await storage.replace(candidate, new Uint8Array([1, 2, 3]));
  assert.equal((await inspectAccountDeletion(admin, candidate)).allowed, true);
  const input = { actorId: admin, actorAuthVersion: 1, targetUserId: candidate, confirmed: "yes", confirmationLogin: candidateLogin };
  for (const patch of [{ confirmed: null }, { confirmationLogin: "WRONG" }, { targetUserId: "../forged" }, { targetUserId: randomUUID() }, { actorAuthVersion: 999 }]) await assert.rejects(() => deleteManagedAccount({ ...input, ...patch }));
  for (const actorId of [instructor, observer]) await assert.rejects(() => deleteManagedAccount({ ...input, actorId }), AccountDeletionTargetError);
  await assert.rejects(() => deleteManagedAccount({ ...input, confirmed: "no" }), AccountDeletionConfirmationError);
  assert.ok(await findDirectoryAccount(candidate));
  assert.ok(await storage.metadata(candidate));
  assert.equal((await pool.query("SELECT 1 FROM account_file_cleanup_jobs WHERE user_id = $1", [candidate])).rowCount, 0);
  await deleteManagedAccount(input);
  assert.equal(await findDirectoryAccount(candidate), undefined);
  assert.equal((await pool.query("SELECT 1 FROM team_members WHERE user_id = $1", [candidate])).rowCount, 0);
  assert.equal((await pool.query("SELECT 1 FROM profile_preferences WHERE user_id = $1", [candidate])).rowCount, 0);
  assert.ok(await storage.metadata(candidate), "File must survive until DB commit; cleanup is a separate phase.");
  assert.equal((await pool.query("SELECT 1 FROM account_file_cleanup_jobs WHERE user_id = $1", [candidate])).rowCount, 1);
  assert.equal((await cleanupDeletedAccountImages(candidate)).pending, false);
  assert.equal(await storage.metadata(candidate), undefined);
  let staleWriteRan = false;
  await assert.rejects(() => withProfileImageAccountLock({ id: candidate, authVersion: 1 }, async () => { staleWriteRan = true; }));
  assert.equal(staleWriteRan, false);

  const learning = await user("learner", "Extensive personal history");
  const untouched = await user("learner", "Other learner");
  const personalAttempts = await seedHistory(learning);
  await seedHistory(untouched);
  const otherBefore = (await pool.query("SELECT * FROM xp_events WHERE user_id = $1 ORDER BY id", [untouched])).rows;
  await storage.replace(learning, new Uint8Array([4]));
  await pool.query("INSERT INTO curriculum_assignments (learner_id, module_slug, assigned_by, note) VALUES ($1, 'dns', $2, 'Personal plan')", [learning, admin]);
  assert.equal((await inspectAccountDeletion(admin, learning)).allowed, true);
  await remove(learning);
  await assertNoUserReferences(learning);
  for (const [table, attemptId] of [["practice_quiz_attempt_questions", personalAttempts.practice], ["ihk_exam_attempt_questions", personalAttempts.exam], ["interactive_lab_events", personalAttempts.lab]]) {
    assert.equal((await pool.query(`SELECT 1 FROM ${table} WHERE attempt_id=$1`, [attemptId])).rowCount, 0);
  }
  await cleanupDeletedAccountImages(learning);
  assert.equal(await storage.metadata(learning), undefined);
  assert.deepEqual((await pool.query("SELECT * FROM xp_events WHERE user_id = $1 ORDER BY id", [untouched])).rows, otherBefore);
  assert.ok((await inspectAccountDeletion(admin, admin)).reasons.includes("self"));
  await assert.rejects(() => remove(admin), AccountDeletionBlockedError);
  await pool.query("UPDATE users SET disabled_at = now() WHERE id = $1", [spareAdmin]);
  assert.ok((await inspectAccountDeletion(admin, admin)).reasons.includes("last-admin"));
  await pool.query("UPDATE users SET disabled_at = NULL WHERE id = $1", [spareAdmin]);

  await addTeamMember(teamB.id, instructor, "manager");
  const proposal = await createTopicProposal(instructor, { title: "Persönlicher Vorschlag", description: "Ein Ausbildungsthema mit persönlichem Bezug.", learningObjective: "Die Inhalte sollen fachlich geprüft werden.", category: "Netzwerk", teamId: teamB.id });
  await reviewTopicProposal(admin, proposal, "in-review", "Rückmeldung erhalten");
  const challengeLearner = await user("learner", "Challenge history");
  await addTeamMember(teamB.id, challengeLearner, "member");
  await addTeamMember(teamB.id, untouched, "member");
  const ownedTeam = await createTeam({ name: `Preserved ${suffix}`, slug: `preserved-${suffix}`, createdByUserId: instructor });
  teams.push(ownedTeam.id);
  await addTeamMember(ownedTeam.id, untouched, "member");
  const challenge = await createChallengeDefinition({ title: "Gemeinsame Challenge", shortDescription: "Gemeinsames Lernmaterial", instructions: "Nachweise und Rückmeldungen.", status: "published", difficulty: null, estimatedMinutes: null, rubricCriteria: [{ title: "Fachlichkeit", description: "Ergebnis", maxPoints: 10 }] }, instructor);
  challenges.push(challenge);
  const [assignment, otherAssignment] = await assignChallengeToLearners({ challengeId: challenge, learnerIds: [challengeLearner, untouched], assignedBy: admin, dueAt: null });
  const evidenceKey = randomUUID();
  await writeFile(join(process.env.EVIDENCE_STORAGE_DIR!, evidenceKey), "personal evidence");
  const submission = await createOwnedChallengeSubmission({ assignmentId: assignment, learnerId: challengeLearner, content: "Privater Nachweis", attachments: [{ storageKey: evidenceKey, originalFilename: "evidence.txt", mimeType: "text/plain", byteSize: 1, sha256: "0".repeat(64) }] });
  const otherSubmission = await createOwnedChallengeSubmission({ assignmentId: otherAssignment, learnerId: untouched, content: "Other learner submission" });
  await createAdminComment({ assignmentId: assignment, adminId: instructor, body: "Persönlicher Kommentar" });
  const criterion = (await pool.query("SELECT id FROM challenge_rubric_criteria WHERE challenge_id = $1", [challenge])).rows[0].id;
  for (const item of [submission, otherSubmission]) await createChallengeReview({ submissionId: item.id, reviewedBy: instructor, decision: "approved", feedback: "Personal reviewer text", scores: [{ criterionId: criterion, awardedPoints: 8 }] });
  await pool.query("INSERT INTO notifications (user_id, type, title, message, href, dedupe_key) VALUES ($1, 'challenge-review-pending', 'Review', 'Personal learner name', $2, $3)", [admin, `/admin/challenges/abgaben/${submission.id}`, `erasure:${suffix}`]);
  await remove(challengeLearner);
  await assertNoUserReferences(challengeLearner);
  assert.equal((await pool.query("SELECT 1 FROM challenge_submissions WHERE id = $1", [submission.id])).rowCount, 0);
  assert.equal((await pool.query("SELECT 1 FROM challenge_submission_attachments WHERE storage_key = $1", [evidenceKey])).rowCount, 0);
  assert.equal((await pool.query("SELECT 1 FROM notifications WHERE dedupe_key = $1", [`erasure:${suffix}`])).rowCount, 0);
  await access(join(process.env.EVIDENCE_STORAGE_DIR!, evidenceKey)); // Only after commit.
  await cleanupDeletedAccountImages(challengeLearner);
  await assert.rejects(() => access(join(process.env.EVIDENCE_STORAGE_DIR!, evidenceKey)));
  await pool.query("INSERT INTO curriculum_assignments (learner_id, module_slug, assigned_by, note) VALUES ($1, 'dns', $2, 'Personal author note')", [untouched, instructor]);
  await pool.query("UPDATE challenge_assignments SET assigned_by = $1 WHERE id = $2", [instructor, otherAssignment]);
  await pool.query("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_by_admin_id) VALUES ($1, $2, now() + interval '30 minutes', $3)", [untouched, 'a'.repeat(64), instructor]);
  await remove(instructor);
  await assertNoUserReferences(instructor);
  assert.equal((await pool.query("SELECT created_by FROM challenges WHERE id = $1", [challenge])).rows[0].created_by, admin);
  assert.equal((await pool.query("SELECT created_by_user_id FROM teams WHERE id = $1", [ownedTeam.id])).rows[0].created_by_user_id, admin);
  assert.equal((await pool.query("SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2", [ownedTeam.id, untouched])).rowCount, 1);
  assert.equal((await pool.query("SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2", [ownedTeam.id, admin])).rowCount, 0);
  assert.equal((await pool.query("SELECT 1 FROM topic_proposals WHERE id = $1", [proposal])).rowCount, 0);
  assert.equal((await pool.query("SELECT 1 FROM password_reset_tokens WHERE user_id = $1", [untouched])).rowCount, 0);
  assert.equal((await listLearnerAssignments(untouched)).find((item) => item.id === otherAssignment)?.status, "approved");
  await assert.rejects(() => createChallengeReview({ submissionId: otherSubmission.id, reviewedBy: admin, decision: "approved", feedback: "Must remain immutable" }));
  const preservedReview = (await listOwnedAssignmentSubmissions(otherAssignment, untouched))[0].review!;
  assert.equal(preservedReview.decision, "approved");
  assert.equal(preservedReview.reviewedBy.id, null);
  assert.equal(preservedReview.reviewedBy.displayName, "Gelöschtes Konto");
  assert.equal(preservedReview.criterionResults[0].awardedPoints, 8);
  assert.equal(preservedReview.feedback, "Rückmeldung wegen Kontolöschung entfernt.");
  const otherPlan = (await pool.query("SELECT assigned_by, note FROM curriculum_assignments WHERE learner_id = $1", [untouched])).rows[0];
  assert.equal(otherPlan.assigned_by, admin); assert.equal(otherPlan.note, null);
  assert.equal((await pool.query("SELECT assigned_by FROM challenge_assignments WHERE id = $1", [otherAssignment])).rows[0].assigned_by, admin);

  // Unknown future foreign keys fail closed, including new CASCADE references.
  const future = await user("observer", "Future reference");
  await pool.query("CREATE TABLE account_deletion_future_probe (user_id uuid REFERENCES users(id) ON DELETE CASCADE)");
  try {
    await pool.query("INSERT INTO account_deletion_future_probe VALUES ($1)", [future]);
    await assert.rejects(() => remove(future), (error: unknown) => error instanceof AccountDeletionBlockedError && error.reasons.includes("other"));
    assert.equal((await pool.query("SELECT 1 FROM account_deletion_future_probe")).rowCount, 1);
  } finally { await pool.query("DROP TABLE account_deletion_future_probe"); }

  const failingCleanup = await user("observer", "Cleanup retry");
  const outside = join(root, "untouched.txt");
  await writeFile(outside, "keep");
  await symlink(outside, join(root, `${failingCleanup}.webp`));
  await remove(failingCleanup);
  assert.equal((await cleanupDeletedAccountImages(failingCleanup)).pending, true);
  assert.equal(await readFile(outside, "utf8"), "keep");
  await unlink(join(root, `${failingCleanup}.webp`));
  assert.equal((await cleanupDeletedAccountImages(failingCleanup)).pending, false);

  const evidenceRetry = await user("observer", "Evidence cleanup retry");
  const retryKey = randomUUID();
  await remove(evidenceRetry);
  await pool.query("UPDATE account_file_cleanup_jobs SET evidence_storage_keys=ARRAY[$2::uuid] WHERE user_id=$1", [evidenceRetry, retryKey]);
  await mkdir(join(process.env.EVIDENCE_STORAGE_DIR!, retryKey)); // EISDIR must retain the durable job.
  assert.equal((await cleanupDeletedAccountImages(evidenceRetry)).pending, true);
  await rm(join(process.env.EVIDENCE_STORAGE_DIR!, retryKey), { recursive: true });
  await writeFile(join(process.env.EVIDENCE_STORAGE_DIR!, retryKey), "retryable evidence");
  assert.equal((await cleanupDeletedAccountImages(evidenceRetry)).pending, false);
  await assert.rejects(() => access(join(process.env.EVIDENCE_STORAGE_DIR!, retryKey)));

  // A submission committed while deletion waits for its parent lock is included.
  const racingLearner = await user("learner", "Concurrent evidence");
  const [racingAssignment] = await assignChallengeToLearners({ challengeId: challenge, learnerIds: [racingLearner], assignedBy: admin, dueAt: null });
  const racingLogin = await loginOf(racingLearner);
  const writer = await pool.connect();
  let deletion: ReturnType<typeof remove>;
  const racingKey = randomUUID();
  await writeFile(join(process.env.EVIDENCE_STORAGE_DIR!, racingKey), "concurrent evidence");
  try {
    await writer.query("BEGIN");
    await writer.query("SELECT id FROM challenge_assignments WHERE id=$1 FOR UPDATE", [racingAssignment]);
    deletion = remove(racingLearner, racingLogin);
    await writer.query("SELECT pg_sleep(0.05)");
    const racingSubmission = (await writer.query("INSERT INTO challenge_submissions (assignment_id, submission_number, content) VALUES ($1,1,'Concurrent submission') RETURNING id", [racingAssignment])).rows[0].id;
    await writer.query("INSERT INTO challenge_submission_attachments (submission_id,storage_key,original_filename,mime_type,byte_size,sha256) VALUES ($1,$2,'race.txt','text/plain',1,$3)", [racingSubmission, racingKey, '0'.repeat(64)]);
    await writer.query("COMMIT");
  } finally { await writer.query("ROLLBACK"); writer.release(); }
  await deletion!;
  assert.ok((await pool.query("SELECT evidence_storage_keys FROM account_file_cleanup_jobs WHERE user_id=$1", [racingLearner])).rows[0].evidence_storage_keys.includes(racingKey));
  await cleanupDeletedAccountImages(racingLearner);
  await assert.rejects(() => access(join(process.env.EVIDENCE_STORAGE_DIR!, racingKey)));

  const notificationSubject = await user("learner", "Concurrent notification subject");
  const subjectLock = await pool.connect();
  let insertion: ReturnType<typeof insertNotificationCandidates>;
  try {
    await subjectLock.query("BEGIN");
    await subjectLock.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [notificationSubject]);
    insertion = insertNotificationCandidates([{ userId: admin, type: "trainer-challenge-overdue", title: "Old event", message: "Personal subject name", href: `/admin/lernende/${notificationSubject}`, dedupeKey: `stale:${suffix}` }]);
    await subjectLock.query("SELECT pg_sleep(0.05)");
    await subjectLock.query("DELETE FROM users WHERE id=$1", [notificationSubject]);
    await subjectLock.query("COMMIT");
  } finally { await subjectLock.query("ROLLBACK"); subjectLock.release(); }
  assert.equal((await insertion!).inserted, 0, "A stale generator snapshot must not reinsert personal notifications");

  const concurrent = await user("observer", "Concurrent deletion");
  const concurrentLogin = await loginOf(concurrent);
  const attempts = await Promise.allSettled([remove(concurrent, concurrentLogin), remove(concurrent, concurrentLogin)]);
  assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(attempts.filter((result) => result.status === "rejected" && result.reason instanceof AccountDeletionTargetError).length, 1);
  const concurrentStatus = await user("observer", "Concurrent status");
  const statusLogin = await loginOf(concurrentStatus);
  const statusResults = await Promise.allSettled([remove(concurrentStatus, statusLogin), setAccountDisabled({ actorId: admin, targetUserId: concurrentStatus, disabled: true })]);
  assert.equal(statusResults[0].status, "fulfilled");
  assert.equal(await findDirectoryAccount(concurrentStatus), undefined);
  const concurrentRole = await user("observer", "Concurrent role");
  const roleLogin = await loginOf(concurrentRole);
  const roleResults = await Promise.allSettled([remove(concurrentRole, roleLogin), changeAccountRole({ actorId: admin, targetUserId: concurrentRole, role: "instructor" })]);
  assert.equal(roleResults[0].status, "fulfilled");
  assert.equal(await findDirectoryAccount(concurrentRole), undefined);

  const uploadAccount = await user("observer", "Concurrent upload");
  await withProfileImageAccountLock({ id: uploadAccount, authVersion: 1 }, async () => {
    const contender = await pool.connect();
    try {
      await contender.query("BEGIN");
      await contender.query("SET LOCAL lock_timeout = '100ms'");
      await assert.rejects(() => contender.query("DELETE FROM users WHERE id = $1", [uploadAccount]), (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "55P03");
      await storage.replace(uploadAccount, new Uint8Array([5]));
    } finally { await contender.query("ROLLBACK"); contender.release(); }
  });
  await remove(uploadAccount);
  await cleanupDeletedAccountImages(uploadAccount);
  await assert.rejects(() => access(join(root, `${uploadAccount}.webp`)));

  const rollback = await user("observer", "Rollback deletion");
  await pool.query(`CREATE FUNCTION test_account_delete_rollback() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.id = '${rollback}'::uuid THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN OLD; END; $$`);
  await pool.query("CREATE TRIGGER test_account_delete_rollback BEFORE DELETE ON users FOR EACH ROW EXECUTE FUNCTION test_account_delete_rollback()");
  try {
    await assert.rejects(() => remove(rollback));
    assert.ok(await findDirectoryAccount(rollback));
    assert.equal((await pool.query("SELECT 1 FROM account_file_cleanup_jobs WHERE user_id = $1", [rollback])).rowCount, 0);
  } finally { await pool.query("DROP TRIGGER test_account_delete_rollback ON users"); await pool.query("DROP FUNCTION test_account_delete_rollback()"); }

  const auditActor = await user("admin", "Audit actor");
  const auditTarget = await user("observer", "Audit target");
  const event = (await pool.query("INSERT INTO avatar_moderation_events (moderator_user_id, target_user_id, action_type) VALUES ($1, $2, 'profile_avatar_removed') RETURNING id, created_at", [auditActor, auditTarget])).rows[0];
  await assert.rejects(() => pool.query("UPDATE avatar_moderation_events SET target_user_id = NULL WHERE id = $1", [event.id]));
  await assert.rejects(() => pool.query("DELETE FROM avatar_moderation_events WHERE id = $1", [event.id]));
  await remove(auditTarget);
  let audit = (await pool.query("SELECT * FROM avatar_moderation_events WHERE id = $1", [event.id])).rows[0];
  assert.equal(audit.target_user_id, null); assert.equal(audit.moderator_user_id, auditActor);
  await remove(auditActor);
  audit = (await pool.query("SELECT * FROM avatar_moderation_events WHERE id = $1", [event.id])).rows[0];
  assert.equal(audit.moderator_user_id, null); assert.equal(audit.target_user_id, null);
  assert.deepEqual(audit.created_at, event.created_at);
  assert.equal(audit.action_type, "profile_avatar_removed");
  await assert.rejects(() => pool.query("UPDATE avatar_moderation_events SET action_type = action_type WHERE id = $1", [event.id]));
  console.log("Account directory, literal search, deduplicated teams, pagination, safe deletion, concurrent operations and post-commit file cleanup: PASS");
} finally {
  await pool.query("DELETE FROM topic_proposals WHERE team_id = ANY($1::uuid[])", [teams]);
  await pool.query("DELETE FROM challenge_review_criterion_results WHERE review_id IN (SELECT review.id FROM challenge_reviews review JOIN challenge_submissions submission ON submission.id=review.submission_id JOIN challenge_assignments assignment ON assignment.id=submission.assignment_id WHERE assignment.challenge_id=ANY($1::uuid[]))", [challenges]);
  await pool.query("DELETE FROM challenge_reviews WHERE submission_id IN (SELECT s.id FROM challenge_submissions s JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[]))", [challenges]);
  await pool.query("DELETE FROM challenge_assignment_comments WHERE assignment_id IN (SELECT id FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[]))", [challenges]);
  await pool.query("DELETE FROM challenge_submission_attachments WHERE submission_id IN (SELECT s.id FROM challenge_submissions s JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[]))", [challenges]);
  await pool.query("DELETE FROM challenge_submissions WHERE assignment_id IN (SELECT id FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[]))", [challenges]);
  await pool.query("DELETE FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[])", [challenges]);
  await pool.query("DELETE FROM challenge_rubric_criteria WHERE challenge_id=ANY($1::uuid[])", [challenges]);
  await pool.query("DELETE FROM challenges WHERE id = ANY($1::uuid[])", [challenges]);
  await pool.query("DELETE FROM teams WHERE id = ANY($1::uuid[])", [teams]);
  await pool.query("DELETE FROM curriculum_assignments WHERE learner_id=ANY($1::uuid[])", [users]);
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [users]);
  await pool.query("DELETE FROM account_file_cleanup_jobs WHERE user_id = ANY($1::uuid[])", [users]);
  await pool.end();
  await rm(root, { recursive: true, force: true });
}
async function user(role: AccountRole, name: string, login = `directory-${randomUUID()}`) {
  const id = (await pool.query<{ id: string }>("INSERT INTO users (login_identifier, display_name, password_hash, role) VALUES ($1, $2, 'isolated-test-only', $3) RETURNING id", [login, name, role])).rows[0].id;
  users.push(id); return id;
}
async function loginOf(id: string) { return (await pool.query<{ login_identifier: string }>("SELECT login_identifier FROM users WHERE id = $1", [id])).rows[0].login_identifier; }
async function remove(id: string, login?: string) { return deleteManagedAccount({ actorId: admin, actorAuthVersion: 1, targetUserId: id, confirmed: "yes", confirmationLogin: login ?? await loginOf(id) }); }

async function seedHistory(userId: string) {
  await pool.query("INSERT INTO lesson_progress (user_id,module_slug,lesson_slug,status,first_opened_at,updated_at,completed_at) VALUES ($1,'dns','basics','completed',now(),now(),now())", [userId]);
  await pool.query("INSERT INTO quiz_progress (user_id,module_slug,attempts,latest_correct,latest_total,latest_percentage,best_correct,best_total,best_percentage,last_submitted_at) VALUES ($1,'dns',3,5,5,100,5,5,100,now())", [userId]);
  await pool.query("INSERT INTO local_progress_imports (user_id,snapshot_hash) VALUES ($1,$2)", [userId, 'b'.repeat(64)]);
  await pool.query("INSERT INTO xp_events (user_id,source_type,source_key,xp_amount,awarded_at) VALUES ($1,'lesson','dns:basics',25,now())", [userId]);
  await pool.query("INSERT INTO lesson_completion_history (user_id,module_slug,lesson_slug,first_completed_at) VALUES ($1,'dns','basics',now())", [userId]);
  await pool.query("INSERT INTO learner_lab_hint_history (user_id,lab_id,hint_index,first_revealed_at) VALUES ($1,'dns-client-001',1,now())", [userId]);
  await pool.query("INSERT INTO learner_lab_completion_history (user_id,lab_id,first_attempt_id,first_completed_at,unique_hints_used,xp_awarded) VALUES ($1,'dns-client-001',$2,now(),1,50)", [userId, randomUUID()]);
  const practice = (await pool.query("INSERT INTO practice_quiz_attempts (user_id,status,selected_category_ids,seed,correct_count,completed_at) VALUES ($1,'completed',ARRAY['netzwerke'],$2,15,now()) RETURNING id", [userId, 'c'.repeat(32)])).rows[0].id;
  await pool.query(`INSERT INTO practice_quiz_attempt_questions (attempt_id,position,question_id,question_revision,render_snapshot,grading_snapshot,category_id,submitted_option_ids,is_correct,answered_at)
    SELECT $1,n,'dns:question-'||n,1,'{}','{}','netzwerke',ARRAY['a'],true,now() FROM generate_series(1,15) n`, [practice]);
  const exam = (await pool.query(`INSERT INTO ihk_exam_attempts (user_id,status,seed,correct_count,passed,completion_reason,started_at,deadline_at,completed_at)
    VALUES ($1,'completed',$2,30,true,'submitted',now(),now()+interval '45 minutes',now()) RETURNING id`, [userId, 'd'.repeat(32)])).rows[0].id;
  await pool.query(`INSERT INTO ihk_exam_attempt_questions (attempt_id,position,question_id,question_revision,category_id,render_snapshot,grading_snapshot,selected_option_ids,answered_at,is_correct)
    SELECT $1,n,'dns:exam-'||n,1,'netzwerke','{}','{}',ARRAY['a'],now(),true FROM generate_series(1,30) n`, [exam]);
  const lab = (await pool.query(`INSERT INTO interactive_lab_attempts (user_id,lab_id,lab_version,mode,state_json,selected_device_id)
    VALUES ($1,'dns-client-001',1,'learner','{}','client') RETURNING id`, [userId])).rows[0].id;
  await pool.query("INSERT INTO interactive_lab_events (attempt_id,sequence,run_number,kind,summary) VALUES ($1,1,1,'command','Personal lab command')", [lab]);
  await pool.query("UPDATE interactive_lab_attempts SET status='completed', completed_at=clock_timestamp(), updated_at=clock_timestamp() WHERE id=$1", [lab]);
  return { practice, exam, lab };
}
async function assertNoUserReferences(userId: string) {
  const refs = await pool.query<{ table_name: string; column_name: string }>(`SELECT relation.relname AS table_name, attribute.attname AS column_name FROM pg_constraint fk
    JOIN pg_class relation ON relation.oid=fk.conrelid JOIN pg_attribute attribute ON attribute.attrelid=fk.conrelid AND attribute.attnum=ANY(fk.conkey)
    WHERE fk.contype='f' AND fk.confrelid='users'::regclass`);
  for (const ref of refs.rows) {
    assert.match(ref.table_name, /^[a-z_]+$/); assert.match(ref.column_name, /^[a-z_]+$/);
    assert.equal((await pool.query(`SELECT 1 FROM "${ref.table_name}" WHERE "${ref.column_name}"=$1`, [userId])).rowCount, 0, `${ref.table_name}.${ref.column_name} retained personal data`);
  }
  assert.equal(await findDirectoryAccount(userId), undefined);
}
