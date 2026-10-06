import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assignChallengeToLearners,
  ChallengeNotAssignableError,
  DuplicateChallengeAssignmentError,
  findLearnerAssignmentById,
  listAssignmentsForChallenge,
  startLearnerAssignment,
  summarizeAssignmentStatuses,
} from "../src/app/lib/server/challenge-assignment-repository.ts";
import {
  createChallengeReview,
  findSubmissionReviewDetail,
  listPendingChallengeReviews,
  RubricScoreValidationError,
  SubmissionAlreadyReviewedError,
} from "../src/app/lib/server/challenge-review-repository.ts";
import {
  createOwnedChallengeSubmission,
  LegacyAssignmentCompletedError,
  listOwnedAssignmentSubmissions,
  SubmissionAlreadyApprovedError,
  SubmissionAssignmentNotFoundError,
  SubmissionPendingReviewError,
} from "../src/app/lib/server/challenge-submission-repository.ts";
import {
  createChallengeDefinition,
  findChallengeDefinitionById,
  listRubricCriteriaForChallenge,
  updateChallengeDefinition,
} from "../src/app/lib/server/challenge-repository.ts";
import {
  CommentAssignmentNotFoundError,
  createAdminComment,
  createOwnedLearnerComment,
  listOwnedAssignmentComments,
} from "../src/app/lib/server/challenge-comment-repository.ts";
import { findAuthorizedAttachment } from "../src/app/lib/server/challenge-attachment-repository.ts";
import { validateEvidenceFiles } from "../src/app/lib/server/evidence-file-validation.ts";
import { cleanupStoredEvidence, storeEvidenceFiles, type StoredEvidenceFile } from "../src/app/lib/server/evidence-storage.ts";
import { getDatabasePool } from "../src/app/lib/server/db.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const loginPrefix = `challenge-db-${suffix}`;
const userIds: string[] = [];
const challengeIds: string[] = [];
const evidenceRoot = await mkdtemp(join(tmpdir(), "azubi-lab-evidence-db-"));
process.env.EVIDENCE_STORAGE_DIR = evidenceRoot;
const storedEvidence: StoredEvidenceFile[] = [];

try {
  const adminId = await insertUser(`${loginPrefix}-admin`, "Challenge DB Admin", "admin");
  const secondAdminId = await insertUser(`${loginPrefix}-admin-2`, "Second DB Admin", "admin");
  const learnerA = await insertUser(`${loginPrefix}-a`, "Challenge Learner A", "learner");
  const learnerB = await insertUser(`${loginPrefix}-b`, "Challenge Learner B", "learner");
  const learnerC = await insertUser(`${loginPrefix}-c`, "Challenge Learner C", "learner");
  const learnerD = await insertUser(`${loginPrefix}-d`, "Challenge Learner D", "learner");
  const disabledLearner = await insertUser(`${loginPrefix}-disabled`, "Disabled Challenge Learner", "learner", true);

  const challengeId = await createChallengeDefinition({
    title: "Review-Workflow Datenbank-Challenge",
    shortDescription: "Prüft Versionen, Reviews, Legacy und Fälligkeit.",
    instructions: "Evidenz sammeln und nachvollziehbar dokumentieren.",
    difficulty: "medium",
    estimatedMinutes: 40,
    status: "draft",
    rubricCriteria: [],
  }, adminId);
  challengeIds.push(challengeId);
  await assert.rejects(
    () => assignChallengeToLearners({ challengeId, learnerIds: [learnerA], assignedBy: adminId, dueAt: null }),
    ChallengeNotAssignableError,
  );
  await updateChallengeDefinition(challengeId, {
    title: "Review-Workflow Datenbank-Challenge",
    shortDescription: "Prüft Versionen, Reviews, Legacy und Fälligkeit.",
    instructions: "Evidenz sammeln und nachvollziehbar dokumentieren.",
    difficulty: "hard",
    estimatedMinutes: 55,
    status: "published",
    rubricCriteria: [],
  });
  assert.equal((await findChallengeDefinitionById(challengeId))?.status, "published");

  const futureDue = new Date(Date.now() + 86_400_000);
  const pastDue = new Date(Date.now() - 86_400_000);
  const [assignmentA, assignmentB] = await assignChallengeToLearners({ challengeId, learnerIds: [learnerA, learnerB], assignedBy: adminId, dueAt: futureDue });
  const [assignmentC] = await assignChallengeToLearners({ challengeId, learnerIds: [learnerC], assignedBy: adminId, dueAt: null });
  const [assignmentD] = await assignChallengeToLearners({ challengeId, learnerIds: [learnerD], assignedBy: adminId, dueAt: pastDue });
  await assert.rejects(() => assignChallengeToLearners({ challengeId, learnerIds: [learnerA], assignedBy: adminId, dueAt: null }), DuplicateChallengeAssignmentError);
  await assert.rejects(() => assignChallengeToLearners({ challengeId, learnerIds: [disabledLearner], assignedBy: adminId, dueAt: null }));

  await startLearnerAssignment(assignmentA, learnerA);
  const firstStart = (await findLearnerAssignmentById(assignmentA, learnerA))?.startedAt;
  assert.ok(firstStart);
  await startLearnerAssignment(assignmentA, learnerA);
  assert.equal((await findLearnerAssignmentById(assignmentA, learnerA))?.startedAt?.getTime(), firstStart.getTime());
  await assert.rejects(() => createOwnedChallengeSubmission({ assignmentId: assignmentA, learnerId: learnerB, content: "Fremde Abgabe" }), SubmissionAssignmentNotFoundError);

  const simultaneousSubmissions = await Promise.allSettled([
    createOwnedChallengeSubmission({ assignmentId: assignmentA, learnerId: learnerA, content: "Version eins – DNS-Evidenz." }),
    createOwnedChallengeSubmission({ assignmentId: assignmentA, learnerId: learnerA, content: "Unzulässige parallele Version." }),
  ]);
  assert.equal(simultaneousSubmissions.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(simultaneousSubmissions.filter((result) => result.status === "rejected" && result.reason instanceof SubmissionPendingReviewError).length, 1);
  const versionOne = (await listOwnedAssignmentSubmissions(assignmentA, learnerA))[0];
  assert.equal(versionOne.submissionNumber, 1);
  assert.equal((await findLearnerAssignmentById(assignmentA, learnerA))?.status, "submitted");

  await createChallengeReview({
    submissionId: versionOne.id,
    reviewedBy: adminId,
    decision: "revision-requested",
    feedback: "Bitte die SRV-Abfrage und deren Ergebnis ergänzen.",
  });
  await assert.rejects(() => createChallengeReview({ submissionId: versionOne.id, reviewedBy: secondAdminId, decision: "approved", feedback: "" }), SubmissionAlreadyReviewedError);
  const afterRevision = await findLearnerAssignmentById(assignmentA, learnerA);
  assert.equal(afterRevision?.status, "revision-requested");
  assert.equal(afterRevision?.latestSubmission?.review?.feedback, "Bitte die SRV-Abfrage und deren Ergebnis ergänzen.");

  const versionTwo = await createOwnedChallengeSubmission({ assignmentId: assignmentA, learnerId: learnerA, content: "Version zwei – SRV-Abfrage ergänzt." });
  assert.equal(versionTwo.submissionNumber, 2);
  assert.deepEqual((await listOwnedAssignmentSubmissions(assignmentA, learnerA)).map((submission) => submission.submissionNumber), [2, 1]);
  await createChallengeReview({ submissionId: versionTwo.id, reviewedBy: secondAdminId, decision: "approved", feedback: "Sauber belegt." });
  const approved = await findLearnerAssignmentById(assignmentA, learnerA);
  assert.equal(approved?.status, "approved");
  assert.equal(approved?.approvedAt instanceof Date, true);
  await assert.rejects(() => createOwnedChallengeSubmission({ assignmentId: assignmentA, learnerId: learnerA, content: "Version drei" }), SubmissionAlreadyApprovedError);

  const evidenceFiles = await validateEvidenceFiles([
    new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])], "dns-beleg.png", { type: "image/png" }),
    new File([new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00])], "topologie.jpg", { type: "image/jpeg" }),
    new File(["%PDF-1.7\nsynthetic"], "analyse.pdf", { type: "application/pdf" }),
    new File(["Resolver: 192.0.2.53\n"], "notizen.txt", { type: "text/plain" }),
    new File(["test,ergebnis\nSRV,ok\n"], "messwerte.csv", { type: "text/csv" }),
  ]);
  const reviewRaceSubmission = await createSubmissionWithEvidence({
    assignmentId: assignmentB,
    learnerId: learnerB,
    content: "Review-Race mit fünf Nachweisen",
    files: evidenceFiles,
  });
  const persistedEvidence = (await listOwnedAssignmentSubmissions(assignmentB, learnerB))[0].attachments;
  assert.equal(persistedEvidence.length, 5);
  assert.deepEqual(new Set(persistedEvidence.map((item) => item.mimeType)), new Set(["image/png", "image/jpeg", "application/pdf", "text/plain", "text/csv"]));
  assert.equal(persistedEvidence.every((item) => /^[0-9a-f]{64}$/.test(item.sha256)), true);
  const pngAttachment = persistedEvidence.find((item) => item.mimeType === "image/png");
  assert.ok(pngAttachment);
  assert.equal((await findAuthorizedAttachment({ attachmentId: pngAttachment.id, userId: learnerB, canReviewAll: false }))?.originalFilename, "dns-beleg.png");
  assert.equal(await findAuthorizedAttachment({ attachmentId: pngAttachment.id, userId: learnerA, canReviewAll: false }), undefined);
  assert.equal((await findAuthorizedAttachment({ attachmentId: pngAttachment.id, userId: adminId, canReviewAll: true }))?.byteSize, 9);

  const beforeFailedSubmissionFiles = (await readdir(evidenceRoot)).length;
  await assert.rejects(
    () => createSubmissionWithEvidence({
      assignmentId: assignmentB,
      learnerId: learnerA,
      content: "Fremde Abgabe mit Rollback",
      files: [evidenceFiles[3]],
    }),
    SubmissionAssignmentNotFoundError,
  );
  assert.equal((await readdir(evidenceRoot)).length, beforeFailedSubmissionFiles);
  const simultaneousReviews = await Promise.allSettled([
    createChallengeReview({ submissionId: reviewRaceSubmission.id, reviewedBy: adminId, decision: "approved", feedback: "" }),
    createChallengeReview({ submissionId: reviewRaceSubmission.id, reviewedBy: secondAdminId, decision: "revision-requested", feedback: "Mehr Evidenz." }),
  ]);
  assert.equal(simultaneousReviews.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(simultaneousReviews.filter((result) => result.status === "rejected" && result.reason instanceof SubmissionAlreadyReviewedError).length, 1);

  await createOwnedLearnerComment({ assignmentId: assignmentA, learnerId: learnerA, body: "Ich habe die SRV-Abfrage ergänzt." });
  await createAdminComment({ assignmentId: assignmentA, adminId, body: "Bitte auch den verwendeten Resolver dokumentieren." });
  const comments = await listOwnedAssignmentComments(assignmentA, learnerA);
  assert.deepEqual(comments.map((comment) => comment.author.role), ["learner", "admin"]);
  assert.deepEqual(comments.map((comment) => comment.body), [
    "Ich habe die SRV-Abfrage ergänzt.",
    "Bitte auch den verwendeten Resolver dokumentieren.",
  ]);
  await assert.rejects(
    () => createOwnedLearnerComment({ assignmentId: assignmentA, learnerId: learnerB, body: "Fremder Kommentar" }),
    CommentAssignmentNotFoundError,
  );
  await assert.rejects(
    () => pool.query("INSERT INTO challenge_assignment_comments (assignment_id, author_id, body) VALUES ($1, $2, '   ')", [assignmentA, learnerA]),
    (error: unknown) => postgresCode(error) === "23514",
  );
  await assert.rejects(
    () => pool.query("INSERT INTO challenge_assignment_comments (assignment_id, author_id, body) VALUES ($1, $2, $3)", [assignmentA, learnerA, "x".repeat(5_001)]),
    (error: unknown) => postgresCode(error) === "23514",
  );

  const rubricChallengeId = await createChallengeDefinition({
    title: "Rubrik-Snapshot Datenbank-Challenge",
    shortDescription: "Prüft geordnete Kriterien und unveränderliche Review-Snapshots.",
    instructions: "Bewerte Analyse, Evidenz und Dokumentation getrennt.",
    difficulty: "medium",
    estimatedMinutes: 30,
    status: "published",
    rubricCriteria: [
      { title: "Analyse", description: "Ursache nachvollziehbar herleiten.", maxPoints: 10 },
      { title: "Evidenz", description: "Aussagekräftige Nachweise beilegen.", maxPoints: 8 },
      { title: "Dokumentation", description: "Nächste Schritte klar festhalten.", maxPoints: 6 },
    ],
  }, adminId);
  challengeIds.push(rubricChallengeId);
  const initialCriteria = await listRubricCriteriaForChallenge(rubricChallengeId);
  assert.deepEqual(initialCriteria.map((criterion) => [criterion.position, criterion.title, criterion.maxPoints]), [
    [1, "Analyse", 10],
    [2, "Evidenz", 8],
    [3, "Dokumentation", 6],
  ]);
  const [rubricAssignment] = await assignChallengeToLearners({
    challengeId: rubricChallengeId,
    learnerIds: [learnerC],
    assignedBy: adminId,
    dueAt: null,
  });
  const rubricV1 = await createOwnedChallengeSubmission({ assignmentId: rubricAssignment, learnerId: learnerC, content: "Rubrik-Version eins" });
  await assert.rejects(
    () => createChallengeReview({ submissionId: rubricV1.id, reviewedBy: adminId, decision: "revision-requested", feedback: "Bitte ergänzen.", scores: [] }),
    RubricScoreValidationError,
  );
  await assert.rejects(
    () => createChallengeReview({
      submissionId: rubricV1.id,
      reviewedBy: adminId,
      decision: "revision-requested",
      feedback: "Bitte ergänzen.",
      scores: initialCriteria.map((criterion, index) => ({ criterionId: criterion.id, awardedPoints: index === 0 ? 11 : 1 })),
    }),
    RubricScoreValidationError,
  );
  await createChallengeReview({
    submissionId: rubricV1.id,
    reviewedBy: adminId,
    decision: "revision-requested",
    feedback: "Evidenz und Dokumentation ergänzen.",
    scores: [
      { criterionId: initialCriteria[0].id, awardedPoints: 7 },
      { criterionId: initialCriteria[1].id, awardedPoints: 3 },
      { criterionId: initialCriteria[2].id, awardedPoints: 2 },
    ],
  });
  assert.deepEqual(
    (await listOwnedAssignmentSubmissions(rubricAssignment, learnerC))[0].review?.criterionResults.map((result) => [result.criterionTitle, result.maxPoints, result.awardedPoints]),
    [["Analyse", 10, 7], ["Evidenz", 8, 3], ["Dokumentation", 6, 2]],
  );

  await updateChallengeDefinition(rubricChallengeId, {
    title: "Rubrik-Snapshot Datenbank-Challenge",
    shortDescription: "Prüft geordnete Kriterien und unveränderliche Review-Snapshots.",
    instructions: "Bewerte die aktualisierte Rubrik.",
    difficulty: "medium",
    estimatedMinutes: 30,
    status: "published",
    rubricCriteria: [
      { title: "Dokumentation (neu)", description: "Aktualisierte Beschreibung.", maxPoints: 12 },
      { title: "Sicherheit", description: "Sichere Vorgehensweise begründen.", maxPoints: 5 },
    ],
  });
  const currentCriteria = await listRubricCriteriaForChallenge(rubricChallengeId);
  assert.deepEqual(currentCriteria.map((criterion) => [criterion.position, criterion.title, criterion.maxPoints]), [
    [1, "Dokumentation (neu)", 12],
    [2, "Sicherheit", 5],
  ]);
  const historicalV1 = (await listOwnedAssignmentSubmissions(rubricAssignment, learnerC)).find((submission) => submission.id === rubricV1.id);
  assert.deepEqual(
    historicalV1?.review?.criterionResults.map((result) => [result.criterionTitle, result.maxPoints, result.awardedPoints]),
    [["Analyse", 10, 7], ["Evidenz", 8, 3], ["Dokumentation", 6, 2]],
  );
  const rubricV2 = await createOwnedChallengeSubmission({ assignmentId: rubricAssignment, learnerId: learnerC, content: "Rubrik-Version zwei" });
  await createChallengeReview({
    submissionId: rubricV2.id,
    reviewedBy: secondAdminId,
    decision: "approved",
    feedback: "Aktuelle Rubrik vollständig erfüllt.",
    scores: currentCriteria.map((criterion) => ({ criterionId: criterion.id, awardedPoints: criterion.maxPoints })),
  });
  const rubricHistory = await listOwnedAssignmentSubmissions(rubricAssignment, learnerC);
  assert.deepEqual(rubricHistory.map((submission) => submission.submissionNumber), [2, 1]);
  assert.deepEqual(rubricHistory[0].review?.criterionResults.map((result) => result.criterionTitle), ["Dokumentation (neu)", "Sicherheit"]);
  assert.deepEqual(rubricHistory[1].review?.criterionResults.map((result) => result.criterionTitle), ["Analyse", "Evidenz", "Dokumentation"]);
  await assert.rejects(
    () => pool.query(
      `INSERT INTO challenge_rubric_criteria (challenge_id, position, title, description, max_points)
       VALUES ($1, 3, 'Zu viele Punkte', '', 21)`,
      [rubricChallengeId],
    ),
    (error: unknown) => postgresCode(error) === "23514",
  );

  await pool.query(
    "UPDATE challenge_assignments SET started_at = assigned_at, completed_at = assigned_at WHERE id = $1",
    [assignmentC],
  );
  const legacy = await findLearnerAssignmentById(assignmentC, learnerC);
  assert.equal(legacy?.status, "legacy-completed");
  assert.equal(legacy?.approvedAt?.getTime(), legacy?.legacyCompletedAt?.getTime());
  await assert.rejects(() => createOwnedChallengeSubmission({ assignmentId: assignmentC, learnerId: learnerC, content: "Neue Abgabe" }), LegacyAssignmentCompletedError);

  const lateSubmission = await createOwnedChallengeSubmission({ assignmentId: assignmentD, learnerId: learnerD, content: "Verspätet, aber zulässig." });
  const lateAssignment = await findLearnerAssignmentById(assignmentD, learnerD);
  assert.equal(lateAssignment?.status, "submitted");
  assert.equal(lateAssignment?.isOverdue, false);
  assert.equal(lateAssignment?.latestSubmission?.submittedAfterDue, true);
  assert.equal((await findSubmissionReviewDetail(lateSubmission.id))?.submission.submittedAfterDue, true);

  await updateChallengeDefinition(challengeId, {
    title: "Archivierte Review-Workflow Challenge",
    shortDescription: "Bestehende Abgaben bleiben möglich.",
    instructions: "Archivierte Inhalte bleiben für bestehende Aufgaben nutzbar.",
    difficulty: "hard",
    estimatedMinutes: 55,
    status: "archived",
    rubricCriteria: [],
  });
  assert.equal((await listAssignmentsForChallenge(challengeId)).length, 4);
  await assert.rejects(() => assignChallengeToLearners({ challengeId, learnerIds: [disabledLearner], assignedBy: adminId, dueAt: null }), ChallengeNotAssignableError);
  await createChallengeReview({ submissionId: lateSubmission.id, reviewedBy: adminId, decision: "revision-requested", feedback: "Bitte ergänzen." });
  const archivedResubmission = await createOwnedChallengeSubmission({ assignmentId: assignmentD, learnerId: learnerD, content: "Archivierte Zuweisung, zweite Version." });
  assert.equal(archivedResubmission.submissionNumber, 2);

  const pending = await listPendingChallengeReviews();
  assert.equal(pending.some((item) => item.submissionId === archivedResubmission.id), true);
  const counts = summarizeAssignmentStatuses(await listAssignmentsForChallenge(challengeId));
  assert.equal(counts.approved >= 2, true);
  assert.equal(counts.submitted >= 1, true);

  await assert.rejects(
    () => pool.query("INSERT INTO challenge_reviews (submission_id, reviewed_by, decision, feedback) VALUES ($1, $2, 'revision-requested', '')", [archivedResubmission.id, adminId]),
    (error: unknown) => postgresCode(error) === "23514",
  );
  await assert.rejects(
    () => pool.query("INSERT INTO challenge_submissions (assignment_id, submission_number, content) VALUES ($1, 2, 'duplicate')", [assignmentD]),
    (error: unknown) => postgresCode(error) === "23505",
  );
  await assert.rejects(() => pool.query("DELETE FROM challenge_assignments WHERE id = $1", [assignmentA]), (error: unknown) => postgresCode(error) === "23503");
  await assert.rejects(() => pool.query("DELETE FROM users WHERE id = $1", [adminId]), (error: unknown) => postgresCode(error) === "23503");

  console.log("Challenge submission/review database integration: PASS");
} finally {
  if (challengeIds.length > 0) {
    const cleanupCounts = (await pool.query<{
      submissions: string;
      attachments: string;
      comments: string;
      reviews: string;
      results: string;
    }>(
      `SELECT
         (SELECT count(*) FROM challenge_submissions s JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[])) AS submissions,
         (SELECT count(*) FROM challenge_submission_attachments attachment JOIN challenge_submissions s ON s.id = attachment.submission_id JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[])) AS attachments,
         (SELECT count(*) FROM challenge_assignment_comments comment JOIN challenge_assignments a ON a.id = comment.assignment_id WHERE a.challenge_id = ANY($1::uuid[])) AS comments,
         (SELECT count(*) FROM challenge_reviews review JOIN challenge_submissions s ON s.id = review.submission_id JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[])) AS reviews,
         (SELECT count(*) FROM challenge_review_criterion_results result JOIN challenge_reviews review ON review.id = result.review_id JOIN challenge_submissions s ON s.id = review.submission_id JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[])) AS results`,
      [challengeIds],
    )).rows[0];
    await pool.query("DELETE FROM challenge_review_criterion_results WHERE review_id IN (SELECT r.id FROM challenge_reviews r JOIN challenge_submissions s ON s.id = r.submission_id JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[]))", [challengeIds]);
    await pool.query("DELETE FROM challenge_reviews WHERE submission_id IN (SELECT s.id FROM challenge_submissions s JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[]))", [challengeIds]);
    await pool.query("DELETE FROM challenge_submission_attachments WHERE submission_id IN (SELECT s.id FROM challenge_submissions s JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[]))", [challengeIds]);
    await pool.query("DELETE FROM challenge_submissions WHERE assignment_id IN (SELECT id FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[]))", [challengeIds]);
    await pool.query("DELETE FROM challenge_assignment_comments WHERE assignment_id IN (SELECT id FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[]))", [challengeIds]);
    await pool.query("DELETE FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[])", [challengeIds]);
    await pool.query("DELETE FROM challenge_rubric_criteria WHERE challenge_id = ANY($1::uuid[])", [challengeIds]);
    await pool.query("DELETE FROM challenges WHERE id = ANY($1::uuid[])", [challengeIds]);
    console.log("Challenge DB cleanup counts:", cleanupCounts);
  }
  if (userIds.length > 0) await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  await cleanupStoredEvidence(storedEvidence);
  assert.deepEqual(await readdir(evidenceRoot), []);
  await rm(evidenceRoot, { recursive: true, force: true });
  await pool.end();
}

async function createSubmissionWithEvidence(input: {
  assignmentId: string;
  learnerId: string;
  content: string;
  files: Awaited<ReturnType<typeof validateEvidenceFiles>>;
}) {
  const stored = await storeEvidenceFiles(input.files);
  storedEvidence.push(...stored);
  try {
    return await createOwnedChallengeSubmission({ ...input, attachments: stored });
  } catch (error) {
    await cleanupStoredEvidence(stored);
    throw error;
  }
}

async function insertUser(login: string, displayName: string, role: "admin" | "instructor" | "learner", disabled = false) {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role, disabled_at)
     VALUES ($1, $2, 'integration-test-hash', $3, CASE WHEN $4 THEN now() ELSE NULL END)
     RETURNING id`,
    [login, displayName, role, disabled],
  );
  userIds.push(result.rows[0].id);
  return result.rows[0].id;
}

function postgresCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
}
