import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { getDatabasePool } from "../src/app/lib/server/db.ts";
import { LocalFilesystemEvidenceStorage } from "../src/app/lib/server/evidence-storage.ts";
import { generateTemporaryPassword, hashPassword } from "../src/app/lib/server/password.ts";

const require = createRequire(import.meta.url);
const { encodeReply } = require("next/dist/compiled/react-server-dom-webpack/client.node") as {
  encodeReply(value: unknown): Promise<FormData | URLSearchParams | string>;
};

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const loginPrefix = `challenge-action-${suffix}`;
const challengeTitle = `Action Review Challenge ${suffix}`;
const userIds: string[] = [];
let challengeId: string | undefined;
let rubricCriteria: { id: string; max_points: number }[] = [];

try {
  const admin = await insertLoginUser(`${loginPrefix}-admin`, "Challenge Action Admin", "admin");
  const secondAdmin = await insertLoginUser(`${loginPrefix}-admin-2`, "Second Action Admin", "admin");
  const instructor = await insertLoginUser(`${loginPrefix}-instructor`, "Challenge Action Instructor", "instructor");
  const learnerA = await insertLoginUser(`${loginPrefix}-a`, "Challenge Action Learner A", "learner");
  const learnerB = await insertLoginUser(`${loginPrefix}-b`, "Challenge Action Learner B", "learner");
  const learnerC = await insertLoginUser(`${loginPrefix}-c`, "Challenge Action Learner C", "learner");
  const learnerD = await insertLoginUser(`${loginPrefix}-d`, "Challenge Action Learner D", "learner");
  const legacyLearner = await insertLoginUser(`${loginPrefix}-legacy`, "Legacy Action Learner", "learner");
  const forcedLearner = await insertLoginUser(`${loginPrefix}-forced`, "Forced Change Learner", "learner", true);
  const forcedAdmin = await insertLoginUser(`${loginPrefix}-forced-admin`, "Forced Change Admin", "admin", true);
  const staleAdmin = await insertLoginUser(`${loginPrefix}-stale-admin`, "Stale Action Admin", "admin");
  const disabledAdmin = await insertLoginUser(`${loginPrefix}-disabled-admin`, "Disabled Action Admin", "admin");

  const adminCookie = await login(admin.login, admin.password);
  const secondAdminCookie = await login(secondAdmin.login, secondAdmin.password);
  const instructorCookie = await login(instructor.login, instructor.password);
  const learnerACookie = await login(learnerA.login, learnerA.password);
  const learnerBCookie = await login(learnerB.login, learnerB.password);
  const learnerCCookie = await login(learnerC.login, learnerC.password);
  const learnerDCookie = await login(learnerD.login, learnerD.password);
  const legacyCookie = await login(legacyLearner.login, legacyLearner.password);
  const forcedLearnerCookie = await login(forcedLearner.login, forcedLearner.password);
  const forcedAdminCookie = await login(forcedAdmin.login, forcedAdmin.password);
  const staleAdminCookie = await login(staleAdmin.login, staleAdmin.password);
  const disabledAdminCookie = await login(disabledAdmin.login, disabledAdmin.password);

  const compilationResponses = await Promise.all([
    "/admin/challenges",
    "/admin/challenges/neu",
    "/admin/challenges/00000000-0000-4000-8000-000000000001",
    "/admin/challenges/abgaben/00000000-0000-4000-8000-000000000001",
    "/challenges",
    "/challenges/00000000-0000-4000-8000-000000000001",
  ].map((path) => fetch(`${baseUrl}${path}`, { redirect: "manual" })));
  assert.equal(compilationResponses.every((response) => response.status < 500), true);

  const manifest = JSON.parse(await readFile(new URL("../.next/dev/server/server-reference-manifest.json", import.meta.url), "utf8")) as {
    node: Record<string, { exportedName?: string }>;
  };
  const actionId = (name: string) => {
    const entry = Object.entries(manifest.node).find(([, value]) => value.exportedName === name);
    assert.ok(entry, `Missing server action ${name}`);
    return entry[0];
  };
  const exportedActionNames = Object.values(manifest.node).map((entry) => entry.exportedName);
  assert.equal(exportedActionNames.includes("completeChallengeAssignmentAction"), false);
  assert.equal(exportedActionNames.includes("reopenChallengeAssignmentAction"), false);
  const createId = actionId("createChallengeAction");
  const updateId = actionId("updateChallengeAction");
  const assignId = actionId("assignChallengeAction");
  const startId = actionId("startChallengeAssignmentAction");
  const submitId = actionId("submitChallengeAssignmentAction");
  const reviewId = actionId("reviewChallengeSubmissionAction");
  const learnerCommentId = actionId("addLearnerChallengeCommentAction");
  const adminCommentId = actionId("addAdminChallengeCommentAction");

  const forbiddenCreate = await invokeAction(learnerACookie, "/admin/challenges/neu", createId, [{ status: "idle", message: "" }, challengeForm("draft")]);
  assert.match(forbiddenCreate, /aktuelles Administrationskonto/);
  const createResponse = await invokeAction(instructorCookie, "/admin/challenges/neu", createId, [{ status: "idle", message: "" }, challengeForm("draft")]);
  assert.match(createResponse, /Challenge wurde angelegt/);
  const created = (await pool.query<{ id: string; created_by: string; status: string }>("SELECT id, created_by, status FROM challenges WHERE title = $1", [challengeTitle])).rows[0];
  assert.ok(created);
  challengeId = created.id;
  assert.equal(created.created_by, instructor.id);

  await invokeAction(adminCookie, `/admin/challenges/${challengeId}`, updateId, [challengeId, { status: "idle", message: "" }, challengeForm("published")]);
  rubricCriteria = (await pool.query<{ id: string; max_points: number }>(
    "SELECT id, max_points FROM challenge_rubric_criteria WHERE challenge_id = $1 ORDER BY position",
    [challengeId],
  )).rows;
  assert.equal(rubricCriteria.length, 3);
  assert.match(
    await invokeAction(learnerACookie, `/admin/challenges/${challengeId}`, updateId, [challengeId, { status: "idle", message: "" }, challengeForm("published")]),
    /aktuelles Administrationskonto/,
  );
  const futureDue = new Date(Date.now() + 86_400_000);
  const assignResponse = await invokeAction(instructorCookie, `/admin/challenges/${challengeId}`, assignId, [challengeId, { status: "idle", message: "" }, assignmentForm([learnerA.id, learnerB.id, learnerC.id, legacyLearner.id], futureDue)]);
  assert.match(assignResponse, /4 Lernkonten zugewiesen/);
  const lateAssign = await invokeAction(adminCookie, `/admin/challenges/${challengeId}`, assignId, [challengeId, { status: "idle", message: "" }, assignmentForm([learnerD.id], new Date(Date.now() - 86_400_000))]);
  assert.match(lateAssign, /einem Lernkonto/);
  const assignments = (await pool.query<{ id: string; learner_id: string }>("SELECT id, learner_id FROM challenge_assignments WHERE challenge_id = $1", [challengeId])).rows;
  const assignmentFor = (learnerId: string) => {
    const assignment = assignments.find((item) => item.learner_id === learnerId);
    assert.ok(assignment);
    return assignment.id;
  };
  const assignmentA = assignmentFor(learnerA.id);
  const assignmentB = assignmentFor(learnerB.id);
  const assignmentC = assignmentFor(learnerC.id);
  const assignmentD = assignmentFor(learnerD.id);
  const legacyAssignment = assignmentFor(legacyLearner.id);
  const assignmentNotifications = (await pool.query<{ user_id: string; href: string }>(
    `SELECT user_id, href
     FROM notifications
     WHERE type = 'challenge-assigned' AND user_id = ANY($1::uuid[])`,
    [[learnerA.id, learnerB.id, learnerC.id, learnerD.id, legacyLearner.id]],
  )).rows;
  assert.equal(assignmentNotifications.length, 5, "each committed challenge assignment receives one in-app notification");
  assert.equal(assignmentNotifications.every((notification) => (
    notification.href === `/challenges/${assignmentFor(notification.user_id)}`
  )), true);

  const startResponse = await invokeAction(learnerACookie, `/challenges/${assignmentA}`, startId, [assignmentA]);
  assert.match(startResponse, /"ok":true/);
  const firstStartedAt = (await readAssignment(assignmentA)).started_at;
  assert.ok(firstStartedAt);
  await invokeAction(learnerACookie, `/challenges/${assignmentA}`, startId, [assignmentA]);
  assert.equal((await readAssignment(assignmentA)).started_at?.getTime(), firstStartedAt.getTime());
  assert.match(await invokeAction(learnerBCookie, `/challenges/${assignmentA}`, startId, [assignmentA]), /nicht gefunden/);
  assert.match(await invokeAction(adminCookie, `/challenges/${assignmentA}`, startId, [assignmentA]), /aktuelles Lernkonto/);

  const invalidSubmission = await invokeAction(learnerACookie, `/challenges/${assignmentA}`, submitId, [assignmentA, { status: "idle", message: "" }, submissionForm("   ")]);
  assert.match(invalidSubmission, /Prüfe deine Abgabe/);
  const forgedSubmission = submissionForm("Formal gültig");
  forgedSubmission.set("learnerId", learnerB.id);
  forgedSubmission.set("submissionNumber", "99");
  assert.match(await invokeAction(learnerACookie, `/challenges/${assignmentA}`, submitId, [assignmentA, { status: "idle", message: "" }, forgedSubmission]), /unerwartete Felder/);
  const forgedStorage = submissionForm("Formal gültig");
  forgedStorage.set("storageKey", "00000000-0000-4000-8000-000000000001");
  forgedStorage.set("attachmentMimeType", "image/png");
  assert.match(await invokeAction(learnerACookie, `/challenges/${assignmentA}`, submitId, [assignmentA, { status: "idle", message: "" }, forgedStorage]), /unerwartete Felder/);
  const ownershipSubmission = await invokeAction(learnerBCookie, `/challenges/${assignmentA}`, submitId, [assignmentA, { status: "idle", message: "" }, submissionForm("Fremde Abgabe")]);
  assert.match(ownershipSubmission, /nicht gefunden/);
  assert.match(await invokeAction(adminCookie, `/challenges/${assignmentA}`, submitId, [assignmentA, { status: "idle", message: "" }, submissionForm("Admin")]), /aktuelles Lernkonto/);
  assert.match(await invokeAction(forcedLearnerCookie, `/challenges/${assignmentA}`, submitId, [assignmentA, { status: "idle", message: "" }, submissionForm("Erzwungen")]), /aktuelles Lernkonto/);
  assert.match(await invokeAction("", `/challenges/${assignmentA}`, submitId, [assignmentA, { status: "idle", message: "" }, submissionForm("Anonym", new File(["test"], "anonym.txt", { type: "text/plain" }))]), /aktuelles Lernkonto/);

  const firstEvidence = new File([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  ], "dns-nachweis.png", { type: "image/png" });
  const firstSubmit = await invokeAction(learnerACookie, `/challenges/${assignmentA}`, submitId, [assignmentA, { status: "idle", message: "" }, submissionForm("Version eins mit Evidenz.", firstEvidence)]);
  assert.match(firstSubmit, /wartet auf Review/);
  const versionOne = await latestSubmission(assignmentA);
  assert.equal(versionOne.submission_number, 1);
  const firstAttachment = (await pool.query<{ id: string; original_filename: string; byte_size: number; sha256: string; storage_key: string }>(
    "SELECT id, original_filename, byte_size, sha256, storage_key FROM challenge_submission_attachments WHERE submission_id = $1",
    [versionOne.id],
  )).rows[0];
  assert.ok(firstAttachment);
  assert.equal(firstAttachment.original_filename, "dns-nachweis.png");
  assert.equal(firstAttachment.byte_size, 9);
  assert.match(firstAttachment.sha256, /^[0-9a-f]{64}$/);

  const authorizedEvidence = await fetch(`${baseUrl}/api/challenge-evidence/${firstAttachment.id}`, { headers: { cookie: learnerACookie } });
  assert.equal(authorizedEvidence.status, 200);
  assert.equal(authorizedEvidence.headers.get("content-type"), "image/png");
  assert.match(authorizedEvidence.headers.get("content-disposition") ?? "", /^attachment;/);
  assert.match(authorizedEvidence.headers.get("content-disposition") ?? "", /dns-nachweis\.png/);
  assert.equal(authorizedEvidence.headers.get("x-content-type-options"), "nosniff");
  assert.equal(authorizedEvidence.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(new Uint8Array(await authorizedEvidence.arrayBuffer()), new Uint8Array(await firstEvidence.arrayBuffer()));
  for (const [label, cookie] of [["foreign", learnerBCookie], ["anonymous", ""]] as const) {
    const response = await fetch(`${baseUrl}/api/challenge-evidence/${firstAttachment.id}`, { headers: { cookie } });
    assert.equal(response.status, 404, label);
    assert.doesNotMatch(await response.text(), /dns-nachweis|\.png/i);
  }
  const adminEvidence = await fetch(`${baseUrl}/api/challenge-evidence/${firstAttachment.id}`, { headers: { cookie: adminCookie } });
  assert.equal(adminEvidence.status, 200);
  assert.equal((await adminEvidence.arrayBuffer()).byteLength, 9);
  const instructorEvidence = await fetch(`${baseUrl}/api/challenge-evidence/${firstAttachment.id}`, { headers: { cookie: instructorCookie } });
  assert.equal(instructorEvidence.status, 200);
  assert.equal((await instructorEvidence.arrayBuffer()).byteLength, 9);
  const unknownEvidence = await fetch(`${baseUrl}/api/challenge-evidence/00000000-0000-4000-8000-000000000099`, { headers: { cookie: adminCookie } });
  assert.equal(unknownEvidence.status, 404);
  await new LocalFilesystemEvidenceStorage().delete(firstAttachment.storage_key);
  const unavailableEvidence = await fetch(`${baseUrl}/api/challenge-evidence/${firstAttachment.id}`, { headers: { cookie: learnerACookie } });
  assert.equal(unavailableEvidence.status, 410);
  assert.doesNotMatch(await unavailableEvidence.text(), /dns-nachweis|EVIDENCE_STORAGE_DIR|\/home\//i);

  assert.match(
    await invokeAction(learnerACookie, `/challenges/${assignmentA}`, learnerCommentId, [assignmentA, { status: "idle", message: "" }, commentForm("Ich habe den DNS-Nachweis ergänzt.")]),
    /Kommentar wurde hinzugefügt/,
  );
  assert.match(
    await invokeAction(instructorCookie, `/admin/challenges/abgaben/${versionOne.id}`, adminCommentId, [assignmentA, { status: "idle", message: "" }, commentForm("Bitte zusätzlich den Resolver nennen.")]),
    /Trainer-Kommentar wurde hinzugefügt/,
  );
  const persistedComments = (await pool.query<{ body: string }>(
    "SELECT body FROM challenge_assignment_comments WHERE assignment_id = $1 ORDER BY created_at, id",
    [assignmentA],
  )).rows;
  assert.deepEqual(persistedComments.map((comment) => comment.body), ["Ich habe den DNS-Nachweis ergänzt.", "Bitte zusätzlich den Resolver nennen."]);
  assert.match(
    await invokeAction(learnerBCookie, `/challenges/${assignmentA}`, learnerCommentId, [assignmentA, { status: "idle", message: "" }, commentForm("Fremd")]),
    /nicht gefunden/,
  );
  assert.match(
    await invokeAction("", `/challenges/${assignmentA}`, learnerCommentId, [assignmentA, { status: "idle", message: "" }, commentForm("Anonym")]),
    /aktuelles Lernkonto/,
  );
  assert.match(
    await invokeAction(forcedLearnerCookie, `/challenges/${assignmentA}`, learnerCommentId, [assignmentA, { status: "idle", message: "" }, commentForm("Erzwungen")]),
    /aktuelles Lernkonto/,
  );
  const spoofedComment = commentForm("Gefälschter Autor");
  spoofedComment.set("authorId", admin.id);
  assert.match(
    await invokeAction(learnerACookie, `/challenges/${assignmentA}`, learnerCommentId, [assignmentA, { status: "idle", message: "" }, spoofedComment]),
    /unerwartete Felder/,
  );
  const duplicateSubmit = await invokeAction(learnerACookie, `/challenges/${assignmentA}`, submitId, [assignmentA, { status: "idle", message: "" }, submissionForm("Doppelte Abgabe")]);
  assert.match(duplicateSubmit, /wartet bereits auf Review/);

  const invalidReview = await invokeAction(adminCookie, `/admin/challenges/abgaben/${versionOne.id}`, reviewId, [versionOne.id, { status: "idle", message: "" }, reviewForm("revision-requested", "")]);
  assert.match(invalidReview, /Prüfe die Review-Angaben/);
  const forgedReview = reviewForm("approved", "");
  forgedReview.set("reviewedBy", secondAdmin.id);
  assert.match(await invokeAction(adminCookie, `/admin/challenges/abgaben/${versionOne.id}`, reviewId, [versionOne.id, { status: "idle", message: "" }, forgedReview]), /unerwartete Felder/);
  assert.match(await invokeAction(learnerACookie, `/admin/challenges/abgaben/${versionOne.id}`, reviewId, [versionOne.id, { status: "idle", message: "" }, reviewForm("approved", "")]), /aktuelles Administrationskonto/);
  assert.match(await invokeAction(forcedAdminCookie, `/admin/challenges/abgaben/${versionOne.id}`, reviewId, [versionOne.id, { status: "idle", message: "" }, reviewForm("approved", "")]), /aktuelles Administrationskonto/);
  assert.match(await invokeAction("", `/admin/challenges/abgaben/${versionOne.id}`, reviewId, [versionOne.id, { status: "idle", message: "" }, reviewForm("approved", "")]), /aktuelles Administrationskonto/);
  assert.match(
    await invokeAction(adminCookie, `/admin/challenges/abgaben/${versionOne.id}`, reviewId, [versionOne.id, { status: "idle", message: "" }, reviewForm("approved", "", [])]),
    /Prüfe die Rubrikbewertung/,
  );
  assert.match(
    await invokeAction(adminCookie, `/admin/challenges/abgaben/${versionOne.id}`, reviewId, [versionOne.id, { status: "idle", message: "" }, reviewForm("approved", "", [
      { id: rubricCriteria[0].id, points: rubricCriteria[0].max_points + 1 },
      ...rubricCriteria.slice(1).map((criterion) => ({ id: criterion.id, points: criterion.max_points })),
    ])]),
    /Prüfe die Rubrikbewertung/,
  );
  assert.match(
    await invokeAction(adminCookie, `/admin/challenges/abgaben/${versionOne.id}`, reviewId, [versionOne.id, { status: "idle", message: "" }, reviewForm("approved", "", [
      ...rubricCriteria.map((criterion) => ({ id: criterion.id, points: criterion.max_points })),
      { id: "00000000-0000-4000-8000-000000000099", points: 1 },
    ])]),
    /Prüfe die Rubrikbewertung/,
  );
  const revisionReview = await invokeAction(instructorCookie, `/admin/challenges/abgaben/${versionOne.id}`, reviewId, [versionOne.id, { status: "idle", message: "" }, reviewForm("revision-requested", "Bitte konkrete DNS-Evidenz ergänzen.")]);
  assert.match(revisionReview, /Überarbeitung wurde/);
  assert.equal(await notificationCount(learnerA.id, "challenge-revision", `/challenges/${assignmentA}`), 1);
  const duplicateReview = await invokeAction(secondAdminCookie, `/admin/challenges/abgaben/${versionOne.id}`, reviewId, [versionOne.id, { status: "idle", message: "" }, reviewForm("approved", "")]);
  assert.match(duplicateReview, /bereits unveränderlich geprüft/);
  assert.equal(await notificationCount(learnerA.id, "challenge-revision", `/challenges/${assignmentA}`), 1);

  const archiveResponse = await invokeAction(adminCookie, `/admin/challenges/${challengeId}`, updateId, [challengeId, { status: "idle", message: "" }, challengeForm("archived")]);
  assert.match(archiveResponse, /Challenge wurde aktualisiert/);
  rubricCriteria = (await pool.query<{ id: string; max_points: number }>(
    "SELECT id, max_points FROM challenge_rubric_criteria WHERE challenge_id = $1 ORDER BY position",
    [challengeId],
  )).rows;
  const secondEvidence = new File(["Resolver geprüft: 192.0.2.53\n"], "resolver-v2.txt", { type: "text/plain" });
  const archivedResubmit = await invokeAction(learnerACookie, `/challenges/${assignmentA}`, submitId, [assignmentA, { status: "idle", message: "" }, submissionForm("Version zwei nach Archivierung.", secondEvidence)]);
  assert.match(archivedResubmit, /wartet auf Review/);
  const versionTwo = await latestSubmission(assignmentA);
  assert.equal(versionTwo.submission_number, 2);
  const approval = await invokeAction(secondAdminCookie, `/admin/challenges/abgaben/${versionTwo.id}`, reviewId, [versionTwo.id, { status: "idle", message: "" }, reviewForm("approved", "Freigegeben.")]);
  assert.match(approval, /wurde freigegeben/);
  assert.equal(await notificationCount(learnerA.id, "challenge-approved", `/challenges/${assignmentA}`), 1);
  assert.match(await invokeAction(learnerACookie, `/challenges/${assignmentA}`, submitId, [assignmentA, { status: "idle", message: "" }, submissionForm("Version drei")]), /bereits freigegeben/);

  const lateSubmissionResponse = await invokeAction(learnerDCookie, `/challenges/${assignmentD}`, submitId, [assignmentD, { status: "idle", message: "" }, submissionForm("Verspätete Abgabe bleibt erlaubt.")]);
  assert.match(lateSubmissionResponse, /wartet auf Review/);
  const lateVersion = await latestSubmission(assignmentD);
  assert.equal(lateVersion.submitted_at.getTime() > (await readAssignment(assignmentD)).due_at!.getTime(), true);

  await pool.query("UPDATE users SET auth_version = auth_version + 1 WHERE id = $1", [staleAdmin.id]);
  assert.match(await invokeAction(staleAdminCookie, `/admin/challenges/abgaben/${lateVersion.id}`, reviewId, [lateVersion.id, { status: "idle", message: "" }, reviewForm("approved", "")]), /aktuelles Administrationskonto/);
  assert.match(await invokeAction(staleAdminCookie, `/admin/challenges/abgaben/${lateVersion.id}`, adminCommentId, [assignmentD, { status: "idle", message: "" }, commentForm("Veraltete Sitzung")]), /aktuelles Administrationskonto/);
  await pool.query("UPDATE users SET disabled_at = now(), auth_version = auth_version + 1 WHERE id = $1", [disabledAdmin.id]);
  assert.match(await invokeAction(disabledAdminCookie, `/admin/challenges/abgaben/${lateVersion.id}`, reviewId, [lateVersion.id, { status: "idle", message: "" }, reviewForm("approved", "")]), /aktuelles Administrationskonto/);
  assert.match(await invokeAction(disabledAdminCookie, `/admin/challenges/abgaben/${lateVersion.id}`, adminCommentId, [assignmentD, { status: "idle", message: "" }, commentForm("Gesperrt")]), /aktuelles Administrationskonto/);

  await pool.query("UPDATE challenge_assignments SET started_at = assigned_at, completed_at = assigned_at WHERE id = $1", [legacyAssignment]);
  const legacySubmit = await invokeAction(legacyCookie, `/challenges/${legacyAssignment}`, submitId, [legacyAssignment, { status: "idle", message: "" }, submissionForm("Legacy ändern")]);
  assert.match(legacySubmit, /frühere Zuweisung ist bereits als abgeschlossen/);

  await pool.query("UPDATE users SET disabled_at = now(), auth_version = auth_version + 1 WHERE id = $1", [learnerB.id]);
  assert.match(await invokeAction(learnerBCookie, `/challenges/${assignmentB}`, submitId, [assignmentB, { status: "idle", message: "" }, submissionForm("Gesperrt")]), /aktuelles Lernkonto/);
  assert.match(await invokeAction(learnerBCookie, `/challenges/${assignmentB}`, learnerCommentId, [assignmentB, { status: "idle", message: "" }, commentForm("Gesperrt")]), /aktuelles Lernkonto/);
  await pool.query("UPDATE users SET auth_version = auth_version + 1 WHERE id = $1", [learnerC.id]);
  assert.match(await invokeAction(learnerCCookie, `/challenges/${assignmentC}`, submitId, [assignmentC, { status: "idle", message: "" }, submissionForm("Veraltete Sitzung")]), /aktuelles Lernkonto/);
  assert.match(
    await invokeAction(learnerCCookie, `/challenges/${assignmentC}`, learnerCommentId, [assignmentC, { status: "idle", message: "" }, commentForm("Veraltete Sitzung")]),
    /aktuelles Lernkonto/,
  );

  assert.equal((await pool.query("SELECT count(*)::int AS count FROM challenge_review_criterion_results result JOIN challenge_reviews review ON review.id = result.review_id JOIN challenge_submissions submission ON submission.id = review.submission_id JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id WHERE assignment.challenge_id = $1", [challengeId])).rows[0].count >= 6, true);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM challenge_submission_attachments attachment JOIN challenge_submissions submission ON submission.id = attachment.submission_id JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id WHERE assignment.challenge_id = $1", [challengeId])).rows[0].count, 2);

  console.log("Challenge evidence/comment/rubric server-action authorization integration: PASS");
} finally {
  if (challengeId) {
    const storageKeys = (await pool.query<{ storage_key: string }>(
      "SELECT attachment.storage_key FROM challenge_submission_attachments attachment JOIN challenge_submissions submission ON submission.id = attachment.submission_id JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id WHERE assignment.challenge_id = $1",
      [challengeId],
    )).rows;
    if (process.env.EVIDENCE_STORAGE_DIR) {
      const storage = new LocalFilesystemEvidenceStorage();
      await Promise.all(storageKeys.map((attachment) => storage.delete(attachment.storage_key)));
    }
    await pool.query("DELETE FROM challenge_review_criterion_results WHERE review_id IN (SELECT r.id FROM challenge_reviews r JOIN challenge_submissions s ON s.id = r.submission_id JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = $1)", [challengeId]);
    await pool.query("DELETE FROM challenge_reviews WHERE submission_id IN (SELECT s.id FROM challenge_submissions s JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = $1)", [challengeId]);
    await pool.query("DELETE FROM challenge_submission_attachments WHERE submission_id IN (SELECT s.id FROM challenge_submissions s JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = $1)", [challengeId]);
    await pool.query("DELETE FROM challenge_submissions WHERE assignment_id IN (SELECT id FROM challenge_assignments WHERE challenge_id = $1)", [challengeId]);
    await pool.query("DELETE FROM challenge_assignment_comments WHERE assignment_id IN (SELECT id FROM challenge_assignments WHERE challenge_id = $1)", [challengeId]);
    await pool.query("DELETE FROM challenge_assignments WHERE challenge_id = $1", [challengeId]);
    await pool.query("DELETE FROM challenge_rubric_criteria WHERE challenge_id = $1", [challengeId]);
    await pool.query("DELETE FROM challenges WHERE id = $1", [challengeId]);
  }
  if (userIds.length > 0) await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  await pool.end();
}

function challengeForm(status: "draft" | "published" | "archived") {
  const form = new FormData();
  form.set("title", challengeTitle);
  form.set("shortDescription", "Serverseitig autorisierter Abgabe- und Review-Workflow.");
  form.set("instructions", "Untersuche die Ausgangslage.\nDokumentiere anschließend die Evidenz.");
  form.set("difficulty", "medium");
  form.set("estimatedMinutes", "35");
  form.set("status", status);
  for (const criterion of [
    { title: "Analyse", description: "Ursache nachvollziehbar herleiten.", maxPoints: "10" },
    { title: "Evidenz", description: "Nachweise passend auswählen.", maxPoints: "8" },
    { title: "Dokumentation", description: "Ergebnis verständlich festhalten.", maxPoints: "6" },
  ]) {
    form.append("rubricTitle", criterion.title);
    form.append("rubricDescription", criterion.description);
    form.append("rubricMaxPoints", criterion.maxPoints);
  }
  return form;
}

function assignmentForm(learnerIds: string[], dueAt: Date | null) {
  const form = new FormData();
  for (const learnerId of learnerIds) form.append("learnerIds", learnerId);
  form.set("dueAtLocal", dueAt ? "2026-08-24T12:00" : "");
  form.set("dueAtIso", dueAt?.toISOString() ?? "");
  return form;
}

async function notificationCount(userId: string, type: string, href: string) {
  return Number((await pool.query<{ count: string }>(
    "SELECT count(*) FROM notifications WHERE user_id = $1 AND type = $2 AND href = $3",
    [userId, type, href],
  )).rows[0].count);
}

function submissionForm(content: string, evidence?: File) {
  const form = new FormData();
  form.set("content", content);
  if (evidence) form.append("evidence", evidence);
  return form;
}

function reviewForm(
  decision: "approved" | "revision-requested",
  feedback: string,
  scores: readonly { id: string; points: number }[] = rubricCriteria.map((criterion) => ({ id: criterion.id, points: criterion.max_points })),
) {
  const form = new FormData();
  form.set("decision", decision);
  form.set("feedback", feedback);
  for (const score of scores) form.set(`rubricScore:${score.id}`, String(score.points));
  return form;
}

function commentForm(body: string) {
  const form = new FormData();
  form.set("body", body);
  return form;
}

async function insertLoginUser(login: string, displayName: string, role: "admin" | "instructor" | "learner", mustChangePassword = false) {
  const password = generateTemporaryPassword(24);
  const passwordHash = await hashPassword(password);
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role, must_change_password)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [login, displayName, passwordHash, role, mustChangePassword],
  );
  userIds.push(result.rows[0].id);
  return { id: result.rows[0].id, login, password };
}

async function login(loginIdentifier: string, password: string) {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  assert.equal(csrfResponse.ok, true);
  const csrf = await csrfResponse.json() as { csrfToken: string };
  let cookie = responseCookies(csrfResponse).join("; ");
  const response = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie, origin: baseUrl },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, login: loginIdentifier, password, callbackUrl: `${baseUrl}/` }),
    redirect: "manual",
  });
  assert.equal(response.status >= 300 && response.status < 400, true);
  cookie = mergeCookies(cookie, responseCookies(response));
  assert.match(cookie, /authjs\.session-token=/);
  return cookie;
}

async function invokeAction(cookie: string, pathname: string, id: string, args: unknown[]) {
  const body = await encodeReply(args);
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { Accept: "text/x-component", "Next-Action": id, cookie, origin: baseUrl },
    body,
  });
  assert.equal(response.ok, true);
  return response.text();
}

async function readAssignment(assignmentId: string) {
  const result = await pool.query<{ started_at: Date | null; completed_at: Date | null; due_at: Date | null }>("SELECT started_at, completed_at, due_at FROM challenge_assignments WHERE id = $1", [assignmentId]);
  assert.ok(result.rows[0]);
  return result.rows[0];
}

async function latestSubmission(assignmentId: string) {
  const result = await pool.query<{ id: string; submission_number: number; submitted_at: Date }>("SELECT id, submission_number, submitted_at FROM challenge_submissions WHERE assignment_id = $1 ORDER BY submission_number DESC LIMIT 1", [assignmentId]);
  assert.ok(result.rows[0]);
  return result.rows[0];
}

function responseCookies(response: Response) { return response.headers.getSetCookie().map((value) => value.split(";", 1)[0]); }
function mergeCookies(current: string, additions: string[]) {
  const values = new Map(current.split("; ").filter(Boolean).map((cookie) => [cookie.split("=", 1)[0], cookie]));
  for (const cookie of additions) values.set(cookie.split("=", 1)[0], cookie);
  return [...values.values()].join("; ");
}
