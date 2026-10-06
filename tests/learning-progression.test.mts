import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { getLearningModule } from "../src/app/data/learning-modules.ts";
import { canBypassLearningProgression } from "../src/app/lib/authorization.ts";
import { createEmptyLearnerProgressState, recordQuizAttempt, setLessonCompleted } from "../src/app/lib/learner-progress.ts";
import { deriveModuleLearningProgression, getLessonProgression, getModuleLearningProgression, LearningProgressionError } from "../src/app/lib/learning-progression.ts";
import { decodeLearnerProgress } from "../src/app/lib/progress-persistence.ts";
import { canonicalizeLocalProgress } from "../src/app/lib/server/progress-import.ts";

const timestamp = "2026-09-01T10:00:00.000Z";

test("canonical lessons unlock linearly from explicit completion evidence", () => {
  const learningModule = getLearningModule("ipv4-grundlagen");
  assert.ok(learningModule?.lessons);
  let state = createEmptyLearnerProgressState();
  let view = deriveModuleLearningProgression(state, learningModule);
  assert.deepEqual(view.lessons.map((item) => item.unlocked), [true, false, false, false, false]);
  assert.equal(view.quiz.unlocked, false);
  assert.equal(view.quiz.remainingLessonCount, 5);

  state = setLessonCompleted(state, learningModule.slug, learningModule.lessons[0].slug, true, true, timestamp);
  view = deriveModuleLearningProgression(state, learningModule);
  assert.deepEqual(view.lessons.map((item) => item.unlocked), [true, true, false, false, false]);
  assert.equal(view.lessons[1].status, "available");
  state = setLessonCompleted(state, learningModule.slug, learningModule.lessons[1].slug, true, true, timestamp);
  view = deriveModuleLearningProgression(state, learningModule);
  assert.deepEqual(view.lessons.map((item) => item.lesson.order), [1, 2, 3, 4, 5]);
  assert.equal(view.lessons[2].unlocked, true);
});

test("resetting current completion never removes an earned unlock", () => {
  const learningModule = getLearningModule("ipv4-grundlagen");
  assert.ok(learningModule?.lessons);
  const first = learningModule.lessons[0];
  let state = setLessonCompleted(createEmptyLearnerProgressState(), learningModule.slug, first.slug, true, true, timestamp);
  const firstEvidence = state.progression.lessonCompletions[`${learningModule.slug}/${first.slug}`];
  state = setLessonCompleted(state, learningModule.slug, first.slug, false, true, "2026-09-01T11:00:00.000Z");
  const view = deriveModuleLearningProgression(state, learningModule);
  assert.equal(state.lessons[`${learningModule.slug}/${first.slug}`].status, "in-progress");
  assert.equal(state.progression.lessonCompletions[`${learningModule.slug}/${first.slug}`], firstEvidence);
  assert.equal(view.lessons[1].unlocked, true);
});

test("quiz unlock requires every regular lesson and stays open after later resets", () => {
  const learningModule = getLearningModule("dns");
  assert.ok(learningModule?.lessons);
  let state = createEmptyLearnerProgressState();
  for (const lesson of learningModule.lessons) {
    state = setLessonCompleted(state, learningModule.slug, lesson.slug, true, true, timestamp);
  }
  assert.equal(deriveModuleLearningProgression(state, learningModule).quiz.unlocked, true);
  state = setLessonCompleted(state, learningModule.slug, learningModule.lessons[2].slug, false, true, "2026-09-01T12:00:00.000Z");
  assert.equal(deriveModuleLearningProgression(state, learningModule).quiz.unlocked, true);
});

test("legacy module quiz evidence retains all access without fabricating lesson evidence", () => {
  const learningModule = getLearningModule("subnetting");
  assert.ok(learningModule);
  const state = recordQuizAttempt(createEmptyLearnerProgressState(), learningModule.slug, 4, 10, timestamp);
  const view = deriveModuleLearningProgression(state, learningModule);
  assert.equal(view.quiz.submittedPreviously, true);
  assert.equal(view.quiz.unlocked, true);
  assert.equal(view.lessons.every((lesson) => lesson.unlocked), true);
  assert.equal(Object.keys(state.progression.lessonCompletions).length, 0);
});

test("modules are independent and knowledge checks are not progression inputs", () => {
  const ipv4 = getLearningModule("ipv4-grundlagen");
  const dns = getLearningModule("dns");
  assert.ok(ipv4?.lessons && dns?.lessons);
  const state = setLessonCompleted(createEmptyLearnerProgressState(), ipv4.slug, ipv4.lessons[0].slug, true, true, timestamp);
  assert.equal(deriveModuleLearningProgression(state, ipv4).lessons[1].unlocked, true);
  assert.deepEqual(deriveModuleLearningProgression(state, dns).lessons.map((lesson) => lesson.unlocked), [true, false, false, false, false, false]);
  assert.deepEqual(Object.keys(state), ["version", "lessons", "quizzes", "progression"]);
});

test("current rows alone are not immutable authenticated unlock evidence", () => {
  const learningModule = getLearningModule("ipv4-grundlagen");
  assert.ok(learningModule?.lessons);
  const first = learningModule.lessons[0];
  const forgedCurrentState = {
    ...createEmptyLearnerProgressState(),
    lessons: {
      [`${learningModule.slug}/${first.slug}`]: {
        status: "completed" as const,
        firstOpenedAt: timestamp,
        updatedAt: timestamp,
        completedAt: timestamp,
      },
    },
  };
  const view = deriveModuleLearningProgression(forgedCurrentState, learningModule);
  assert.equal(view.lessons[0].unlocked, true);
  assert.equal(view.lessons[1].unlocked, false);
  assert.equal(canonicalizeLocalProgress(forgedCurrentState).lessons[0].status, "completed");
  assert.equal(Object.hasOwn(canonicalizeLocalProgress(forgedCurrentState), "progression"), false);
});

test("imported completion history keeps the successor unlocked after a current-state reset", () => {
  const learningModule = getLearningModule("ipv4-grundlagen");
  assert.ok(learningModule?.lessons);
  const first = learningModule.lessons[0];
  const key = `${learningModule.slug}/${first.slug}`;
  const imported = {
    ...createEmptyLearnerProgressState(),
    lessons: {
      [key]: {
        status: "completed" as const,
        firstOpenedAt: timestamp,
        updatedAt: timestamp,
        completedAt: timestamp,
      },
    },
    progression: {
      lessonCompletions: { [key]: timestamp },
      moduleQuizSubmissions: {},
    },
  };
  assert.equal(deriveModuleLearningProgression(imported, learningModule).lessons[1].unlocked, true);

  const reset = setLessonCompleted(imported, learningModule.slug, first.slug, false, true, "2026-09-01T11:00:00.000Z");
  assert.equal(reset.lessons[key].status, "in-progress");
  assert.equal(reset.progression.lessonCompletions[key], timestamp);
  assert.equal(deriveModuleLearningProgression(reset, learningModule).lessons[1].unlocked, true);
});

test("staff completion history remains valid after a learner role transition", () => {
  const learningModule = getLearningModule("dns");
  assert.ok(learningModule?.lessons);
  const first = learningModule.lessons[0];
  const completedAsStaff = setLessonCompleted(
    createEmptyLearnerProgressState(),
    learningModule.slug,
    first.slug,
    true,
    true,
    timestamp,
  );
  assert.equal(deriveModuleLearningProgression(completedAsStaff, learningModule, { bypass: true }).lessons.every((lesson) => lesson.unlocked), true);
  assert.equal(deriveModuleLearningProgression(completedAsStaff, learningModule).lessons[1].unlocked, true);

  const quizSubmittedAsStaff = recordQuizAttempt(createEmptyLearnerProgressState(), learningModule.slug, 2, 6, timestamp);
  assert.equal(deriveModuleLearningProgression(quizSubmittedAsStaff, learningModule).quiz.unlocked, true);
  assert.equal(deriveModuleLearningProgression(quizSubmittedAsStaff, learningModule).lessons.every((lesson) => lesson.unlocked), true);
});

test("anonymous persistence migrates legacy completions into monotonic browser evidence", () => {
  const legacy = JSON.stringify({
    version: 1,
    lessons: {
      "ipv4-grundlagen/was-ist-eine-ip-adresse": {
        status: "completed",
        firstOpenedAt: timestamp,
        updatedAt: timestamp,
        completedAt: timestamp,
      },
    },
    quizzes: {},
  });
  const decoded = decodeLearnerProgress(legacy);
  assert.equal(decoded.valid, true);
  assert.equal(decoded.state.progression.lessonCompletions["ipv4-grundlagen/was-ist-eine-ip-adresse"], timestamp);
  const roundTrip = decodeLearnerProgress(JSON.stringify(decoded.state));
  assert.deepEqual(roundTrip, decoded);
});

test("observer, instructor and admin preview bypasses are explicit without changing learner progression", () => {
  const state = createEmptyLearnerProgressState();
  for (const role of ["observer", "instructor", "admin"] as const) {
    assert.equal(canBypassLearningProgression(role), true);
    const staff = getModuleLearningProgression(state, "active-directory-grundlagen", { bypass: canBypassLearningProgression(role) });
    assert.equal(staff.lessons.every((lesson) => lesson.unlocked), true);
    assert.equal(staff.quiz.unlocked, true);
  }
  assert.equal(canBypassLearningProgression("learner"), false);
  const staff = getModuleLearningProgression(state, "active-directory-grundlagen", { bypass: true });
  assert.throws(() => getModuleLearningProgression(state, "unknown"), LearningProgressionError);
  assert.throws(() => getLessonProgression(staff, "unknown"), LearningProgressionError);
});

test("dedicated immutable progression history covers XP and non-XP completion paths", async () => {
  const [migration, migrationNames, repository, adminRepository, actions, service, lessonPage, quizPage] = await Promise.all([
    readFile(new URL("../db/migrations/0012_immutable_learning_progression_history.sql", import.meta.url), "utf8"),
    readdir(new URL("../db/migrations/", import.meta.url)),
    readFile(new URL("../src/app/lib/server/progress-repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/lib/server/admin-repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/actions/progress-actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/lib/server/learning-progression-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/lernen/[slug]/[lessonSlug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/lernen/[slug]/quiz/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.equal(migrationNames.filter((name) => name.endsWith(".sql")).sort().at(-1), "0021_teams_and_memberships.sql");
  assert.match(migration, /CREATE TABLE lesson_completion_history/);
  assert.match(migration, /PRIMARY KEY \(user_id, module_slug, lesson_slug\)/);
  assert.match(migration, /BEFORE UPDATE ON lesson_completion_history/);
  assert.match(migration, /FROM xp_events event[\s\S]*event\.source_type = 'lesson'/);
  assert.match(migration, /FROM lesson_progress progress[\s\S]*progress\.status = 'completed'/);
  assert.doesNotMatch(migration, /module_quiz_history/);
  assert.doesNotMatch(migration, /learner\.role = 'learner'|INSERT INTO xp_events/);
  assert.match(repository, /FROM lesson_completion_history/);
  assert.match(repository, /moduleQuizSubmissions = Object\.fromEntries\(quizRows\.map/);
  assert.doesNotMatch(repository, /module_quiz_history/);
  assert.doesNotMatch(repository, /FROM xp_events/);
  assert.match(repository, /recordLessonCompletionHistory[\s\S]*awardCanonicalXpEventWithClient/);
  const importBody = repository.slice(repository.indexOf("export function importLearnerProgress"), repository.indexOf("async function readLearnerProgressWithClient"));
  assert.match(importBody, /recordLessonCompletionHistory/);
  assert.doesNotMatch(importBody, /awardCanonicalXpEventWithClient/);
  const roleChangeBody = adminRepository.slice(adminRepository.indexOf("export function changeAccountRole"), adminRepository.indexOf("export function setAccountDisabled"));
  assert.doesNotMatch(roleChangeBody, /(DELETE FROM|UPDATE) (lesson_progress|quiz_progress|lesson_completion_history)/);
  assert.match(actions, /assertLessonUnlockedForUser/);
  assert.match(actions, /assertQuizUnlockedForUser/);
  assert.match(service, /canBypassLearningProgression\(user\.role\)/);
  assert.match(lessonPage, /getCurrentLearningProgression/);
  assert.match(quizPage, /getCurrentLearningProgression/);
});
