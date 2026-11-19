import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createManagedAccount } from "../src/app/lib/server/admin-repository.ts";
import { createTeam, addTeamMember, updateTeamMemberRole, setTeamActive, removeTeamMember } from "../src/app/lib/server/team-repository.ts";
import { assertLearnerAccess, assertLearnerResourceAccess, canAccessLearner, LearnerScopeError, listAccessibleLearnerIds } from "../src/app/lib/server/learner-access-repository.ts";
import { createTopicProposal, listTopicProposals, listProposalTeams, reviewTopicProposal, TopicProposalTargetError } from "../src/app/lib/server/topic-proposal-repository.ts";
import { createChallengeDefinition, listChallengeDefinitions } from "../src/app/lib/server/challenge-repository.ts";
import { assignChallengeToLearners } from "../src/app/lib/server/challenge-assignment-repository.ts";
import { createOwnedChallengeSubmission } from "../src/app/lib/server/challenge-submission-repository.ts";
import { createChallengeReview, findSubmissionReviewDetail, listPendingChallengeReviews } from "../src/app/lib/server/challenge-review-repository.ts";
import { createAdminComment } from "../src/app/lib/server/challenge-comment-repository.ts";
import { findAuthorizedAttachment } from "../src/app/lib/server/challenge-attachment-repository.ts";
import { assignCurriculumModules } from "../src/app/lib/server/curriculum-assignment-repository.ts";
import { countUnreadNotificationsForUser, insertNotificationCandidates, listNotificationsForUser, filterVisiblePersistedNotifications } from "../src/app/lib/server/notification-repository.ts";
import { getDatabasePool, withTransaction } from "../src/app/lib/server/db.ts";
import type { AccountRole } from "../src/app/lib/auth-types.ts";

if (!process.env.DATABASE_URL) throw new Error("Disposable DATABASE_URL required.");
const pool = getDatabasePool();
const suffix = randomUUID();
const users: string[] = [];
const teams: string[] = [];
const challenges: string[] = [];

try {
  const admin = await user("admin");
  const instructor = await user("instructor");
  const otherInstructor = await user("instructor");
  const observer = await user("observer");
  const learnerA = await user("learner");
  const learnerB = await user("learner");
  const foreign = await user("learner");
  const teamA = await team(admin, "a");
  const teamB = await team(admin, "b");
  const teamC = await team(admin, "c");
  await addTeamMember(teamA, instructor, "member");
  await addTeamMember(teamA, learnerA, "member");
  assert.deepEqual(await listAccessibleLearnerIds(instructor), []);
  assert.equal(await canAccessLearner(instructor, learnerA), false);
  await updateTeamMemberRole(teamA, instructor, "manager");
  await addTeamMember(teamB, instructor, "manager");
  await addTeamMember(teamB, learnerA, "member");
  await addTeamMember(teamB, learnerB, "member");
  await addTeamMember(teamA, observer, "manager");
  await addTeamMember(teamA, foreign, "manager");
  await addTeamMember(teamC, otherInstructor, "manager");
  await addTeamMember(teamC, foreign, "member");
  assert.deepEqual((await listAccessibleLearnerIds(instructor)).sort(), [learnerA, learnerB, foreign].sort());
  await removeTeamMember(teamA, foreign);
  assert.deepEqual((await listAccessibleLearnerIds(instructor)).sort(), [learnerA, learnerB].sort());
  assert.equal(await canAccessLearner(instructor, foreign), false);
  assert.deepEqual(await listAccessibleLearnerIds(observer), []);
  assert.deepEqual(await listAccessibleLearnerIds(foreign), []);
  assert.deepEqual(await listAccessibleLearnerIds("forged"), []);
  assert.equal(await canAccessLearner(instructor, randomUUID()), false);
  assert.equal(await canAccessLearner(admin, foreign), true);
  await withTransaction((client) => assertLearnerAccess(instructor, [learnerA, learnerB], client));
  await assert.rejects(() => withTransaction((client) => assertLearnerAccess(instructor, [learnerA, foreign], client)), LearnerScopeError);
  await withTransaction(async (client) => {
    await assertLearnerAccess(instructor, [learnerA], client);
    const revoker = await pool.connect();
    try {
      await revoker.query("BEGIN");
      await revoker.query("SET LOCAL lock_timeout = '100ms'");
      await assert.rejects(
        () => revoker.query("UPDATE team_members SET team_role = 'member' WHERE team_id = $1 AND user_id = $2", [teamA, instructor]),
        (error: unknown) => error instanceof Error && "code" in error && error.code === "55P03",
      );
    } finally {
      await revoker.query("ROLLBACK");
      revoker.release();
    }
  });

  const provisioned = await createManagedAccount({ displayName: "Provisioned", login: `team-access-${suffix}-provisioned`, passwordHash: "test-only", role: "instructor", memberships: [{ teamId: teamA, teamRole: "manager" }, { teamId: teamB, teamRole: "member" }] });
  users.push(provisioned.id);
  assert.equal(provisioned.role, "instructor");
  assert.equal((await pool.query("SELECT 1 FROM team_members WHERE user_id = $1", [provisioned.id])).rowCount, 2);
  for (const role of ["admin", "learner", "observer"] as const) {
    const created = await createManagedAccount({ displayName: "Provisioned role", login: `team-access-${suffix}-${role}`, passwordHash: "test-only", role });
    users.push(created.id);
    assert.equal(created.role, role);
  }
  for (const memberships of [[{ teamId: teamA, teamRole: "member" as const }, { teamId: randomUUID(), teamRole: "manager" as const }], [{ teamId: teamA, teamRole: "member" as const }, { teamId: teamA, teamRole: "manager" as const }]]) {
    await assert.rejects(() => createManagedAccount({ displayName: "Rollback", login: `team-access-${suffix}-rollback`, passwordHash: "test-only", role: "learner", memberships }));
    assert.equal((await pool.query("SELECT 1 FROM users WHERE login_identifier = $1", [`team-access-${suffix}-rollback`])).rowCount, 0);
  }

  const challenge = await createChallengeDefinition({ title: "Scoped challenge", shortDescription: "Scope test", instructions: "Scope test instructions", status: "published", difficulty: null, estimatedMinutes: null, rubricCriteria: [] }, admin);
  challenges.push(challenge);
  await assert.rejects(() => assignChallengeToLearners({ challengeId: challenge, learnerIds: [learnerA, foreign], dueAt: null, assignedBy: instructor }), LearnerScopeError);
  assert.equal((await pool.query("SELECT 1 FROM challenge_assignments WHERE challenge_id = $1", [challenge])).rowCount, 0);
  const [ownAssignment] = await assignChallengeToLearners({ challengeId: challenge, learnerIds: [learnerA], dueAt: null, assignedBy: instructor });
  const [foreignAssignment] = await assignChallengeToLearners({ challengeId: challenge, learnerIds: [foreign], dueAt: null, assignedBy: admin });
  const ownSubmission = await createOwnedChallengeSubmission({ assignmentId: ownAssignment, learnerId: learnerA, content: "Own evidence", attachments: [{ storageKey: randomUUID(), originalFilename: "test.txt", mimeType: "text/plain", byteSize: 4, sha256: "0".repeat(64) }] });
  const foreignSubmission = await createOwnedChallengeSubmission({ assignmentId: foreignAssignment, learnerId: foreign, content: "Foreign evidence", attachments: [{ storageKey: randomUUID(), originalFilename: "test.txt", mimeType: "text/plain", byteSize: 4, sha256: "0".repeat(64) }] });
  const ownAttachment = (await pool.query<{ id: string }>("SELECT id FROM challenge_submission_attachments WHERE submission_id = $1", [ownSubmission.id])).rows[0].id;
  const foreignAttachment = (await pool.query<{ id: string }>("SELECT id FROM challenge_submission_attachments WHERE submission_id = $1", [foreignSubmission.id])).rows[0].id;
  assert.ok(await findAuthorizedAttachment({ attachmentId: ownAttachment, userId: instructor }));
  assert.ok(await findSubmissionReviewDetail(ownSubmission.id, instructor));
  assert.equal(await findSubmissionReviewDetail(foreignSubmission.id, instructor), undefined);
  assert.ok(await findSubmissionReviewDetail(foreignSubmission.id, admin));
  assert.equal((await listPendingChallengeReviews([learnerA])).filter((review) => review.learner.id === foreign).length, 0);
  assert.deepEqual(await listPendingChallengeReviews([]), []);
  assert.equal(await findAuthorizedAttachment({ attachmentId: foreignAttachment, userId: instructor }), undefined);
  assert.ok(await findAuthorizedAttachment({ attachmentId: foreignAttachment, userId: admin }));
  assert.ok(await findAuthorizedAttachment({ attachmentId: foreignAttachment, userId: foreign }));
  assert.equal((await listChallengeDefinitions(undefined, instructor)).find((item) => item.id === challenge)?.activeAssignments, 1);
  assert.equal((await listChallengeDefinitions(undefined, admin)).find((item) => item.id === challenge)?.activeAssignments, 2);
  await assert.rejects(() => createAdminComment({ assignmentId: foreignAssignment, adminId: instructor, body: "Forbidden" }), LearnerScopeError);
  await createAdminComment({ assignmentId: ownAssignment, adminId: instructor, body: "Allowed" });
  await assert.rejects(() => createChallengeReview({ submissionId: foreignSubmission.id, reviewedBy: instructor, decision: "approved", feedback: "Forbidden" }), LearnerScopeError);
  await createChallengeReview({ submissionId: ownSubmission.id, reviewedBy: instructor, decision: "revision-requested", feedback: "Allowed" });
  await assert.rejects(() => assignCurriculumModules({ learnerId: foreign, moduleSlugs: ["dns"], assignedBy: instructor, targetAt: null, note: null }), LearnerScopeError);
  const [curriculum] = await assignCurriculumModules({ learnerId: learnerA, moduleSlugs: ["dns"], assignedBy: instructor, targetAt: null, note: null });
  const [foreignCurriculum] = await assignCurriculumModules({ learnerId: foreign, moduleSlugs: ["dns"], assignedBy: admin, targetAt: null, note: null });
  await withTransaction((client) => assertLearnerResourceAccess(instructor, "curriculum", curriculum, client));
  await assert.rejects(() => withTransaction((client) => assertLearnerResourceAccess(instructor, "curriculum", foreignCurriculum, client)), LearnerScopeError);

  const proposalInput = { title: "DNS im Team", description: "DNS-Auflösung systematisch untersuchen.", learningObjective: "Die Azubis können DNS-Fehler eingrenzen.", category: "Netzwerk", teamId: teamA };
  const proposal = await createTopicProposal(instructor, proposalInput);
  assert.equal((await listTopicProposals(instructor))[0].status, "submitted");
  assert.deepEqual(await listTopicProposals(otherInstructor), []);
  assert.ok((await listTopicProposals(admin)).some((item) => item.id === proposal));
  assert.equal((await listProposalTeams(instructor)).length, 2);
  for (const actor of [otherInstructor, observer, learnerA]) {
    await assert.rejects(() => createTopicProposal(actor, proposalInput), TopicProposalTargetError);
    await assert.rejects(() => reviewTopicProposal(actor, proposal, "accepted", "Forged"), TopicProposalTargetError);
  }
  await assert.rejects(() => reviewTopicProposal(instructor, proposal, "accepted", "Forged"), TopicProposalTargetError);
  for (const status of ["in-review", "accepted", "rejected", "submitted"] as const) {
    await reviewTopicProposal(admin, proposal, status, "Rückmeldung");
    assert.equal((await listTopicProposals(instructor))[0].status, status);
    assert.equal((await listTopicProposals(instructor))[0].admin_feedback, "Rückmeldung");
  }

  const inserted = await insertNotificationCandidates([{ userId: instructor, type: "challenge-review-pending", title: "Review", message: "Own learner", href: `/admin/challenges/abgaben/${ownSubmission.id}`, dedupeKey: `scope-${suffix}` }, { userId: instructor, type: "challenge-review-pending", title: "Review", message: "Foreign learner", href: `/admin/challenges/abgaben/${foreignSubmission.id}`, dedupeKey: `foreign-${suffix}` }]);
  assert.equal(inserted.inserted, 1);
  assert.equal(await countUnreadNotificationsForUser(instructor), 1);
  await updateTeamMemberRole(teamA, instructor, "member");
  await setTeamActive(teamB, false);
  assert.deepEqual(await listAccessibleLearnerIds(instructor), []);
  assert.equal(await canAccessLearner(admin, learnerA), true);
  await assert.rejects(() => createAdminComment({ assignmentId: ownAssignment, adminId: instructor, body: "Revoked" }), LearnerScopeError);
  assert.equal(await findAuthorizedAttachment({ attachmentId: ownAttachment, userId: instructor }), undefined);
  assert.equal(await countUnreadNotificationsForUser(instructor), 0);
  assert.deepEqual(await listNotificationsForUser(instructor), []);
  assert.deepEqual(await filterVisiblePersistedNotifications(inserted.notifications), []);
  assert.deepEqual(await listProposalTeams(instructor), []);
  await assert.rejects(() => createTopicProposal(instructor, proposalInput), TopicProposalTargetError);
  assert.equal((await listTopicProposals(instructor))[0].id, proposal); // own proposals remain readable after revocation
  await assert.rejects(() => createManagedAccount({ displayName: "Archived", login: `team-access-${suffix}-archived`, passwordHash: "test-only", role: "learner", memberships: [{ teamId: teamB, teamRole: "member" }] }));
  assert.equal((await pool.query("SELECT 1 FROM users WHERE login_identifier = $1", [`team-access-${suffix}-archived`])).rowCount, 0);
  await setTeamActive(teamB, true);
  assert.deepEqual((await listAccessibleLearnerIds(instructor)).sort(), [learnerA, learnerB].sort());
  await removeTeamMember(teamB, instructor);
  assert.deepEqual(await listAccessibleLearnerIds(instructor), []);
  await updateTeamMemberRole(teamA, instructor, "manager");
  await pool.query("UPDATE users SET role = 'observer' WHERE id = $1", [instructor]);
  assert.deepEqual(await listAccessibleLearnerIds(instructor), []);
  await pool.query("UPDATE users SET role = 'instructor', disabled_at = now() WHERE id = $1", [instructor]);
  assert.deepEqual(await listAccessibleLearnerIds(instructor), []);
  assert.deepEqual(await listProposalTeams(instructor), []);
  console.log("Team authorization, transactional provisioning, evidence, notifications and topic proposals: PASS");
} finally {
  await pool.query("DELETE FROM topic_proposals WHERE team_id = ANY($1::uuid[])", [teams]);
  await pool.query("DELETE FROM challenge_review_criterion_results WHERE review_id IN (SELECT r.id FROM challenge_reviews r JOIN challenge_submissions s ON s.id = r.submission_id JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[]))", [challenges]);
  await pool.query("DELETE FROM challenge_reviews WHERE submission_id IN (SELECT s.id FROM challenge_submissions s JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[]))", [challenges]);
  await pool.query("DELETE FROM challenge_submission_attachments WHERE submission_id IN (SELECT s.id FROM challenge_submissions s JOIN challenge_assignments a ON a.id = s.assignment_id WHERE a.challenge_id = ANY($1::uuid[]))", [challenges]);
  await pool.query("DELETE FROM challenge_submissions WHERE assignment_id IN (SELECT id FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[]))", [challenges]);
  await pool.query("DELETE FROM challenge_assignment_comments WHERE assignment_id IN (SELECT id FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[]))", [challenges]);
  await pool.query("DELETE FROM challenge_assignments WHERE challenge_id = ANY($1::uuid[])", [challenges]);
  await pool.query("DELETE FROM challenges WHERE id = ANY($1::uuid[])", [challenges]);
  await pool.query("DELETE FROM curriculum_assignments WHERE learner_id = ANY($1::uuid[])", [users]);
  await pool.query("DELETE FROM teams WHERE id = ANY($1::uuid[])", [teams]);
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [users]);
  await pool.end();
}

async function user(role: AccountRole) {
  const id = (await pool.query<{ id: string }>("INSERT INTO users (login_identifier, display_name, password_hash, role) VALUES ($1, $2, 'test-only', $3) RETURNING id", [`access-${randomUUID()}`, `Scope ${role}`, role])).rows[0].id;
  users.push(id);
  return id;
}
async function team(admin: string, name: string) {
  const result = await createTeam({ name: `Scope ${name} ${suffix}`, slug: `scope-${name}-${suffix}`, createdByUserId: admin });
  teams.push(result.id);
  return result.id;
}
