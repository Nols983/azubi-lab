import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canBypassLearningProgression,
  canManageAssignments,
  canManageChallenges,
  canManageRoles,
  canManageUsers,
  canPreviewIhkExam,
  canPreviewLabs,
  canPreviewQuizzes,
  canRecordLearningProgress,
  canRecordQuizAttempts,
  canResetPasswords,
  canReviewSubmissions,
  canSelectAnyProfileBadge,
  canSelectAnyProfileTitle,
  canViewChallengeCatalogue,
  canViewLearnerProgress,
  canViewPersonalProgress,
  isReadOnlyPlatformPreview,
} from "../src/app/lib/authorization.ts";
import { parseAccountCreationRole, parseAccountRole } from "../src/app/lib/account-security.ts";
import { getIhkExamPreview, getPracticeQuizPreview } from "../src/app/lib/server/quiz-preview-service.ts";

test("observer is canonical and only learner or observer can be provisioned directly", () => {
  assert.equal(parseAccountRole("observer"), "observer");
  assert.equal(parseAccountCreationRole("learner"), "learner");
  assert.equal(parseAccountCreationRole("observer"), "observer");
  assert.equal(parseAccountCreationRole("instructor"), undefined);
  assert.equal(parseAccountCreationRole("admin"), undefined);
  assert.equal(parseAccountCreationRole("owner"), undefined);
});

test("observer capability matrix permits previews and denies personal or privileged operations", () => {
  assert.equal(isReadOnlyPlatformPreview("observer"), true);
  assert.equal(canBypassLearningProgression("observer"), true);
  assert.equal(canPreviewLabs("observer"), true);
  assert.equal(canPreviewQuizzes("observer"), true);
  assert.equal(canPreviewIhkExam("observer"), true);
  assert.equal(canViewChallengeCatalogue("observer"), true);

  assert.equal(canViewPersonalProgress("observer"), false);
  assert.equal(canRecordLearningProgress("observer"), false);
  assert.equal(canRecordQuizAttempts("observer"), false);
  assert.equal(canViewLearnerProgress("observer"), false);
  assert.equal(canManageAssignments("observer"), false);
  assert.equal(canManageChallenges("observer"), false);
  assert.equal(canReviewSubmissions("observer"), false);
  assert.equal(canManageUsers("observer"), false);
  assert.equal(canManageRoles("observer"), false);
  assert.equal(canResetPasswords("observer"), false);
  assert.equal(canSelectAnyProfileTitle("observer"), false);
  assert.equal(canSelectAnyProfileBadge("observer"), false);
  assert.equal(canSelectAnyProfileBadge("instructor"), true);
  assert.equal(canSelectAnyProfileBadge("admin"), true);
});

test("observer quiz previews are complete in-memory question sets", () => {
  const practice = getPracticeQuizPreview();
  const ihk = getIhkExamPreview();
  assert.equal(practice.questions.length, 15);
  assert.equal(ihk.questions.length, 30);
  for (const quiz of [practice, ihk]) {
    assert.equal(new Set(quiz.questions.map((question) => question.id)).size, quiz.questions.length);
    assert.ok(quiz.questions.some((question) => question.type === "single-choice"));
    assert.ok(quiz.questions.some((question) => question.type === "multiple-selection"));
  }
});

test("observer persistence boundaries and safe catalogue are enforced server-side", async () => {
  const [progressActions, practiceService, ihkService, labRepository, challengeService, challengeRepository] = await Promise.all([
    source("src/app/actions/progress-actions.ts"),
    source("src/app/lib/server/practice-quiz-attempt-service.ts"),
    source("src/app/lib/server/ihk-exam-service.ts"),
    source("src/app/lib/server/lab-repository.ts"),
    source("src/app/lib/server/challenge-service.ts"),
    source("src/app/lib/server/challenge-repository.ts"),
  ]);
  assert.match(progressActions, /requireCapability\("recordLearningProgress"\)/);
  assert.match(practiceService, /requireCapability\("recordQuizAttempts"\)/);
  assert.match(ihkService, /requireCapability\("recordQuizAttempts"\)/);
  assert.match(labRepository, /\$2 = 'preview' AND role IN \('observer', 'instructor', 'admin'\)/);
  assert.match(challengeService, /canViewChallengeCatalogue\(user\.role\)/);
  assert.match(challengeRepository, /WHERE c\.status = 'published'/);
  const previewQuery = challengeRepository.slice(
    challengeRepository.indexOf("export async function listPublishedChallengePreviews"),
    challengeRepository.indexOf("export async function findChallengeDefinitionById"),
  );
  assert.doesNotMatch(previewQuery, /challenge_assignments|creator_display_name|JOIN users/);
});

test("dashboard preserves capability content and uses a row-based layout without a side rail", async () => {
  const [dashboard, progressSummary] = await Promise.all([
    source("src/app/page.tsx"),
    source("src/app/components/dashboard/progress-summary.tsx"),
  ]);
  const observerGuard = dashboard.indexOf("isReadOnlyPlatformPreview(currentUser.role)");
  const learnerDataReads = dashboard.indexOf("await Promise.all");

  assert.ok(observerGuard >= 0 && observerGuard < learnerDataReads);
  assert.match(dashboard, /<ContinueLearningCard \/>/);
  assert.match(dashboard, /<DailyChallengeCard data=\{challenge\} \/>/);
  assert.match(dashboard, /<LearningAreas areas=\{dashboardLearningAreas\} \/>/);
  assert.match(dashboard, /<LearningPlanSummary data=\{learningPlan\} \/>/);
  assert.match(dashboard, /<ProgressSummary \/>/);
  assert.match(dashboard, /grid min-w-0 gap-5 xl:grid-cols-2/);
  assert.ok(dashboard.indexOf("<LearningPlanSummary") < dashboard.indexOf("<ProgressSummary"));
  assert.ok(dashboard.indexOf("<ProgressSummary") < dashboard.indexOf("<LearningAreas"));
  assert.doesNotMatch(dashboard, /2xl:grid-cols-\[/);
  assert.doesNotMatch(dashboard, /2xl:grid-cols-1/);
  assert.doesNotMatch(dashboard, /\border-(?:first|last|none|[1-9])/);
  assert.doesNotMatch(progressSummary, /xl:mt-\[4\.25rem\]/);
});

test("observer migration extends rather than removes the database role allowlist", async () => {
  const migration = await source("db/migrations/0018_observer_role.sql");
  assert.match(migration, /DROP CONSTRAINT users_role_check/);
  assert.match(migration, /CHECK \(role IN \('learner', 'observer', 'instructor', 'admin'\)\)/);
});

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}
