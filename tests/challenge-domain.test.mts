import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  deriveAssignmentStatus,
  isAssignmentOverdue,
  validateAssignmentInput,
  validateChallengeInput,
  validateCommentInput,
  validateReviewInput,
  validateRubricScoreInput,
  validateSubmissionInput,
  wasSubmittedAfterDue,
} from "../src/app/lib/challenge-domain.ts";
import { assignmentStatusLabels, getAssignmentStatusLabel } from "../src/app/lib/challenge-presenters.ts";

const validChallenge = {
  title: "DNS-Störung untersuchen",
  shortDescription: "Eine nachvollziehbare Praxisaufgabe.",
  instructions: "Beobachte zuerst die Konfiguration.\nDokumentiere anschließend die Evidenz.",
  difficulty: "medium",
  estimatedMinutes: "45",
  status: "draft",
  rubricCriteria: [],
};

test("challenge validation accepts normalized content and canonical values", () => {
  const result = validateChallengeInput({ ...validChallenge, title: "  DNS-Störung   untersuchen  " });
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.value.title, "DNS-Störung untersuchen");
    assert.equal(result.value.estimatedMinutes, 45);
    assert.equal(result.value.difficulty, "medium");
  }
});

test("challenge rubric validation normalizes ordered criteria and enforces point bounds", () => {
  const valid = validateChallengeInput({
    ...validChallenge,
    rubricCriteria: [
      { title: "  Analyse  ", description: "  Belege die Ursache. ", maxPoints: "10" },
      { title: "Dokumentation", description: "", maxPoints: 5 },
    ],
  });
  assert.equal(valid.valid, true);
  if (valid.valid) {
    assert.deepEqual(valid.value.rubricCriteria, [
      { title: "Analyse", description: "Belege die Ursache.", maxPoints: 10 },
      { title: "Dokumentation", description: "", maxPoints: 5 },
    ]);
  }
  assert.equal(validateChallengeInput({ ...validChallenge, rubricCriteria: [{ title: "Ungültig", description: "", maxPoints: 21 }] }).valid, false);
  assert.equal(validateChallengeInput({ ...validChallenge, rubricCriteria: Array.from({ length: 10 }, (_, index) => ({ title: `Kriterium ${index}`, description: "", maxPoints: 11 })) }).valid, false);
  assert.equal(validateChallengeInput({ ...validChallenge, rubricCriteria: Array.from({ length: 11 }, (_, index) => ({ title: `Kriterium ${index}`, description: "", maxPoints: 1 })) }).valid, false);
});

test("challenge validation rejects unknown lifecycle values and bounded fields", () => {
  const invalid = validateChallengeInput({
    ...validChallenge,
    title: "x",
    instructions: "",
    difficulty: "expert",
    estimatedMinutes: "1441",
    status: "deleted",
  });
  assert.equal(invalid.valid, false);
  if (!invalid.valid) assert.deepEqual(Object.keys(invalid.errors).sort(), ["difficulty", "estimatedMinutes", "instructions", "status", "title"]);
});

test("assignment validation deduplicates learners and requires an absolute due instant", () => {
  const learnerId = "00000000-0000-4000-8000-000000000001";
  const valid = validateAssignmentInput({ learnerIds: [learnerId, learnerId], dueAtLocal: "2026-08-22T10:00", dueAtIso: "2026-08-22T08:00:00.000Z" });
  assert.equal(valid.valid, true);
  if (valid.valid) {
    assert.deepEqual(valid.value.learnerIds, [learnerId]);
    assert.equal(valid.value.dueAt?.toISOString(), "2026-08-22T08:00:00.000Z");
  }
  assert.equal(validateAssignmentInput({ learnerIds: ["not-a-user"], dueAtLocal: "", dueAtIso: "" }).valid, false);
  assert.equal(validateAssignmentInput({ learnerIds: [learnerId], dueAtLocal: "2026-08-22T10:00", dueAtIso: "2026-08-22T10:00:00" }).valid, false);
});

test("assignment workflow states keep overdue as a separate presentation indicator", () => {
  const now = new Date("2026-08-21T12:00:00.000Z");
  assert.equal(deriveAssignmentStatus({ startedAt: null, legacyCompletedAt: null, hasSubmission: false, latestReviewDecision: null }), "not-started");
  assert.equal(deriveAssignmentStatus({ startedAt: "2026-08-21T10:00:00Z", legacyCompletedAt: null, hasSubmission: false, latestReviewDecision: null }), "in-progress");
  assert.equal(deriveAssignmentStatus({ startedAt: new Date(), legacyCompletedAt: null, hasSubmission: true, latestReviewDecision: null }), "submitted");
  assert.equal(deriveAssignmentStatus({ startedAt: new Date(), legacyCompletedAt: null, hasSubmission: true, latestReviewDecision: "revision-requested" }), "revision-requested");
  assert.equal(deriveAssignmentStatus({ startedAt: new Date(), legacyCompletedAt: null, hasSubmission: true, latestReviewDecision: "approved" }), "approved");
  assert.equal(deriveAssignmentStatus({ startedAt: new Date(), legacyCompletedAt: "2026-08-20T11:00:00Z", hasSubmission: false, latestReviewDecision: null }), "legacy-completed");
  assert.equal(isAssignmentOverdue({ dueAt: "2026-08-20T10:00:00Z", status: "in-progress" }, now), true);
  assert.equal(isAssignmentOverdue({ dueAt: "2026-08-20T10:00:00Z", status: "submitted" }, now), false);
  assert.equal(isAssignmentOverdue({ dueAt: "2026-08-20T10:00:00Z", status: "approved" }, now), false);
  assert.equal(wasSubmittedAfterDue({ submittedAt: "2026-08-21T11:00:00Z", dueAt: "2026-08-20T10:00:00Z" }), true);
});

test("submission and review validation enforce plain-text bounds and revision feedback", () => {
  const submission = validateSubmissionInput({ content: "  Evidenz und Begründung.  " });
  assert.equal(submission.valid, true);
  if (submission.valid) assert.equal(submission.value.content, "Evidenz und Begründung.");
  assert.equal(validateSubmissionInput({ content: "   " }).valid, false);

  const approved = validateReviewInput({ decision: "approved", feedback: "" });
  assert.equal(approved.valid, true);
  assert.equal(validateReviewInput({ decision: "revision-requested", feedback: "" }).valid, false);
  const revision = validateReviewInput({ decision: "revision-requested", feedback: "  Bitte DNS-Evidenz ergänzen. " });
  assert.equal(revision.valid, true);
  if (revision.valid) assert.equal(revision.value.feedback, "Bitte DNS-Evidenz ergänzen.");
});

test("comments and rubric scores reject empty, oversized, duplicate, and malformed input", () => {
  const comment = validateCommentInput({ body: "  Bitte den DNS-Test ergänzen.  " });
  assert.equal(comment.valid, true);
  if (comment.valid) assert.equal(comment.value.body, "Bitte den DNS-Test ergänzen.");
  assert.equal(validateCommentInput({ body: "   " }).valid, false);
  assert.equal(validateCommentInput({ body: "x".repeat(5_001) }).valid, false);

  const criterionId = "00000000-0000-4000-8000-000000000001";
  const scores = validateRubricScoreInput([{ criterionId, awardedPoints: "7" }]);
  assert.deepEqual(scores, { valid: true, value: [{ criterionId, awardedPoints: 7 }] });
  assert.equal(validateRubricScoreInput([{ criterionId, awardedPoints: "1.5" }]).valid, false);
  assert.equal(validateRubricScoreInput([{ criterionId, awardedPoints: "-1" }]).valid, false);
  assert.equal(validateRubricScoreInput([{ criterionId, awardedPoints: "1" }, { criterionId, awardedPoints: "2" }]).valid, false);
});

test("learner presentation says Abgeschlossen while trainer approval semantics stay intact", async () => {
  assert.equal(getAssignmentStatusLabel("approved", "learner"), "Abgeschlossen");
  assert.equal(getAssignmentStatusLabel("legacy-completed", "learner"), "Abgeschlossen");
  assert.equal(getAssignmentStatusLabel("approved", "trainer"), "Freigegeben");
  assert.equal(assignmentStatusLabels.approved, "Freigegeben");

  const [overview, detail, badges, reviewForm] = await Promise.all([
    readFile(new URL("../src/app/challenges/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/challenges/[assignmentId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/components/challenges/challenge-badges.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/components/challenges/challenge-review-form.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(overview, /SummaryCard label="Abgeschlossen"/);
  assert.match(overview, /Abgeschlossen \(\$\{completed\.length\}\)/);
  assert.match(overview, /audience="learner"/);
  assert.match(detail, /audience="learner"/);
  assert.match(detail, /"Abgeschlossen"/);
  assert.doesNotMatch(overview, /Freigegeben und frühere Abschlüsse/);
  assert.doesNotMatch(detail, />Freigegeben</);
  assert.match(badges, /audience = "trainer"/);
  assert.match(reviewForm, /Freigeben/);
});

test("challenge migration preserves prior migrations and constrains ownership and history", async () => {
  const authMigration = await readFile(new URL("../db/migrations/0001_auth_and_progress.sql", import.meta.url), "utf8");
  const adminMigration = await readFile(new URL("../db/migrations/0002_admin_learner_management.sql", import.meta.url), "utf8");
  const challengeMigration = await readFile(new URL("../db/migrations/0003_challenges_and_assignments.sql", import.meta.url), "utf8");
  const submissionMigration = await readFile(new URL("../db/migrations/0004_challenge_submissions_and_reviews.sql", import.meta.url), "utf8");
  const evidenceMigration = await readFile(new URL("../db/migrations/0005_challenge_evidence_comments_and_rubrics.sql", import.meta.url), "utf8");
  assert.doesNotMatch(authMigration, /challenge_assignments/);
  assert.doesNotMatch(adminMigration, /challenge_assignments/);
  assert.match(challengeMigration, /status IN \('draft', 'published', 'archived'\)/);
  assert.match(challengeMigration, /UNIQUE \(challenge_id, learner_id\)/);
  assert.match(challengeMigration, /REFERENCES challenges\(id\) ON DELETE RESTRICT/);
  assert.match(challengeMigration, /REFERENCES users\(id\) ON DELETE RESTRICT/g);
  assert.match(challengeMigration, /completed_at IS NULL OR \(started_at IS NOT NULL AND completed_at >= started_at\)/);
  assert.match(submissionMigration, /UNIQUE \(assignment_id, submission_number\)/);
  assert.match(submissionMigration, /submission_number > 0/);
  assert.match(submissionMigration, /submission_id uuid NOT NULL UNIQUE/);
  assert.match(submissionMigration, /decision IN \('approved', 'revision-requested'\)/);
  assert.match(submissionMigration, /decision = 'approved' OR char_length\(btrim\(feedback\)\) > 0/);
  assert.match(submissionMigration, /ON DELETE RESTRICT/g);
  assert.match(evidenceMigration, /CREATE TABLE challenge_submission_attachments/);
  assert.match(evidenceMigration, /mime_type IN \('image\/png', 'image\/jpeg', 'application\/pdf', 'text\/plain', 'text\/csv'\)/);
  assert.match(evidenceMigration, /CREATE TABLE challenge_assignment_comments/);
  assert.doesNotMatch(evidenceMigration, /edited_at|deleted_at/);
  assert.match(evidenceMigration, /CREATE TABLE challenge_rubric_criteria/);
  assert.match(evidenceMigration, /UNIQUE \(challenge_id, position\)/);
  assert.match(evidenceMigration, /CREATE TABLE challenge_review_criterion_results/);
  assert.match(evidenceMigration, /awarded_points <= max_points_snapshot/);
  assert.match(evidenceMigration, /criterion_title_snapshot/);
});
