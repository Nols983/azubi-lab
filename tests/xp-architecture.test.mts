import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("0011 is an immutable learner-only XP ledger extended by 0019 for Labs", async () => {
  const [migration, labMigration, migrationNames] = await Promise.all([
    source("db/migrations/0011_immutable_xp_ledger.sql"),
    source("db/migrations/0019_progression_rewards_and_profile.sql"),
    readdir(new URL("../db/migrations/", import.meta.url)),
  ]);
  assert.equal(migrationNames.filter((name) => name.endsWith(".sql")).sort().at(-1), "0021_teams_and_memberships.sql");
  assert.match(migration, /source_type IN \('lesson', 'module_quiz', 'challenge', 'practice_quiz'\)/);
  assert.match(labMigration, /source_type IN \('lesson', 'module_quiz', 'challenge', 'practice_quiz', 'lab'\)/);
  assert.match(labMigration, /ON CONFLICT \(user_id, source_type, source_key\) DO NOTHING/);
  assert.doesNotMatch(migration, /daily_challenge/);
  assert.match(migration, /UNIQUE \(user_id, source_type, source_key\)/);
  assert.match(migration, /xp_amount BETWEEN 1 AND 1000/);
  assert.match(migration, /daily_slot BETWEEN 1 AND 3/);
  assert.match(migration, /CREATE UNIQUE INDEX xp_events_practice_daily_slot_key/);
  assert.match(migration, /BEFORE UPDATE ON xp_events/);
  for (const field of ["id", "user_id", "source_type", "source_key", "xp_amount", "awarded_at", "reward_date", "daily_slot"]) {
    assert.match(migration, new RegExp(`NEW\\.${field} IS DISTINCT FROM OLD\\.${field}`));
  }
  assert.equal((migration.match(/learner\.role = 'learner'/g) ?? []).length, 4);
  assert.equal((migration.match(/learner\.disabled_at IS NULL/g) ?? []).length, 4);
  assert.match(migration, /AT TIME ZONE 'Europe\/Berlin'/);
  assert.match(migration, /PARTITION BY attempt\.user_id/);
  assert.match(migration, /ORDER BY attempt\.completed_at ASC, attempt\.id ASC/);
  assert.match(migration, /WHERE ranked\.daily_slot <= 3/);
  for (const reward of [20, 40, 60, 80, 100]) assert.match(migration, new RegExp(`THEN ${reward}|ELSE ${reward}`));
  assert.doesNotMatch(migration, /users\.total_xp|users\.level/);
});

test("all live reward paths are atomic, server-derived and role-gated", async () => {
  const [progress, challenge, practice, lab, repository] = await Promise.all([
    source("src/app/lib/server/progress-repository.ts"),
    source("src/app/lib/server/challenge-review-repository.ts"),
    source("src/app/lib/server/practice-quiz-attempt-repository.ts"),
    source("src/app/lib/server/lab-repository.ts"),
    source("src/app/lib/server/xp-repository.ts"),
  ]);
  assert.match(progress, /withTransaction[\s\S]*awardCanonicalXpEventWithClient/);
  assert.match(progress, /sourceType: "lesson"/);
  assert.match(progress, /previous\.rows\[0\]\?\.status !== "completed"/);
  assert.match(progress, /sourceType: "module_quiz"/);
  assert.match(progress, /if \(!previous\.rowCount\)/);
  const importBody = progress.slice(progress.indexOf("export function importLearnerProgress"));
  assert.doesNotMatch(importBody, /awardCanonicalXpEventWithClient/);
  assert.match(challenge, /input\.decision === "approved"[\s\S]*sourceType: "challenge"/);
  assert.match(practice, /getPracticeQuizXpReward\(correctCount, completed\.question_count\)/);
  assert.match(practice, /awardPracticeQuizXpWithClient\(client/);
  assert.match(lab, /recordFirstLabCompletionAndReward/);
  assert.match(lab, /sourceType: "lab"/);
  assert.match(repository, /learner\.role = 'learner'/);
  assert.match(repository, /learner\.disabled_at IS NULL/);
  assert.match(repository, /pg_advisory_xact_lock/);
  assert.match(repository, /generate_series\(1, \$6::integer\)/);
  assert.match(repository, /ON CONFLICT \(user_id, source_type, source_key\) DO NOTHING/);
  assert.doesNotMatch(repository, /UPDATE xp_events|DELETE FROM xp_events/);
});

test("social achievements consume immutable XP and first-completion evidence without awarding XP", async () => {
  const [rewardService, rewardHistory] = await Promise.all([
    source("src/app/lib/server/reward-service.ts"),
    source("src/app/lib/reward-history.ts"),
  ]);
  assert.match(rewardService, /event\.sourceType !== "module_quiz"/);
  assert.match(rewardService, /event\.sourceType === "lesson"/);
  assert.match(rewardService, /learnerLessonEvents\.get\(toLessonXpSourceKey\(lessonId\)\) === completedAt/);
  assert.match(rewardService, /canonicalLessonCompletionIds: lessonCompletions/);
  assert.match(rewardService, /canonicalQuizCompletionIds: quizCompletions/);
  assert.doesNotMatch(rewardHistory, /Date\.now|new Date\(\)/);
  assert.doesNotMatch(rewardService, /awardCanonicalXpEvent|INSERT INTO xp_events/);
});

test("learner XP UI is persisted-state based and unrelated roles stay excluded", async () => {
  const [service, profileService, dashboard, progressPage, quizPage, result, actions] = await Promise.all([
    source("src/app/lib/server/xp-service.ts"),
    source("src/app/lib/server/profile-service.ts"),
    source("src/app/page.tsx"),
    source("src/app/fortschritt/page.tsx"),
    source("src/app/quiz/page.tsx"),
    source("src/app/components/quiz/practice-quiz-attempt.tsx"),
    source("src/app/actions/practice-quiz-actions.ts"),
  ]);
  assert.match(service, /user\.role !== "learner"/);
  assert.match(service, /readTotalXpForUser/);
  assert.match(profileService, /user\.role !== "learner"/);
  assert.match(dashboard, /shellProfile\?\.xp/);
  assert.match(progressPage, /xp\.audience === "learner"/);
  assert.match(quizPage, /currentUser\.role === "learner"/);
  assert.match(quizPage, /ersten 3 abgeschlossenen Übungsquizze pro Tag geben XP/);
  assert.match(result, /attempt\.xpReward\.status === "awarded"/);
  assert.match(result, /attempt\.xpReward\.status === "daily-limit"/);
  assert.match(actions, /revalidatePath\("\/"\)/);
  assert.match(actions, /revalidatePath\("\/fortschritt"\)/);
});
