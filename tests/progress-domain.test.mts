import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { learningModules } from "../src/app/data/learning-modules.ts";
import { getQuizForModule } from "../src/app/data/quizzes.ts";
import { createEmptyLearnerProgressState, recordQuizAttempt, setLessonCompleted } from "../src/app/lib/learner-progress.ts";
import { decodeLearnerProgress } from "../src/app/lib/progress-persistence.ts";
import { canonicalizeLocalProgress, getImportSnapshotHash } from "../src/app/lib/server/progress-import.ts";
import { hashPassword, verifyPassword } from "../src/app/lib/server/password.ts";

test("quiz attempts preserve latest and highest score", () => {
  let state = createEmptyLearnerProgressState();
  state = recordQuizAttempt(state, "ipv4-grundlagen", 4, 10, "2026-01-01T10:00:00.000Z");
  state = recordQuizAttempt(state, "ipv4-grundlagen", 2, 10, "2026-01-01T11:00:00.000Z");
  state = recordQuizAttempt(state, "ipv4-grundlagen", 9, 10, "2026-01-01T12:00:00.000Z");
  assert.deepEqual(state.quizzes["ipv4-grundlagen"], {
    attempts: 3,
    latestCorrectCount: 9,
    latestTotal: 10,
    latestPercentage: 90,
    bestCorrectCount: 9,
    bestTotal: 10,
    bestPercentage: 90,
    lastSubmittedAt: "2026-01-01T12:00:00.000Z",
  });
});

test("strict decoder migrates the previous quiz aggregate and rejects malformed data", () => {
  const previousFormat = JSON.stringify({
    version: 1,
    lessons: {},
    quizzes: {
      "ipv4-grundlagen": {
        attempts: 1,
        latestCorrectCount: 8,
        latestTotal: 10,
        latestPercentage: 80,
        bestCorrectCount: 8,
        bestPercentage: 80,
        lastSubmittedAt: "2026-01-01T12:00:00.000Z",
      },
    },
  });
  const decoded = decodeLearnerProgress(previousFormat);
  assert.equal(decoded.valid, true);
  assert.equal(decoded.state.quizzes["ipv4-grundlagen"].bestTotal, 10);
  assert.equal(decodeLearnerProgress('{"version":1,"lessons":[]').valid, false);
});

test("canonical import drops stale IDs and invalid quiz totals deterministically", () => {
  const learningModule = learningModules.find((item) => item.slug === "ipv4-grundlagen");
  const lesson = learningModule?.lessons?.find((item) => item.status === "available");
  const quiz = getQuizForModule("ipv4-grundlagen");
  assert.ok(learningModule && lesson && quiz);
  let state = createEmptyLearnerProgressState();
  state = setLessonCompleted(state, learningModule.slug, lesson.slug, true, true, "2026-01-01T10:00:00.000Z");
  state = {
    ...state,
    lessons: {
      ...state.lessons,
      "unknown/phantom": { status: "in-progress", firstOpenedAt: "2026-01-01T10:00:00.000Z", updatedAt: "2026-01-01T10:00:00.000Z" },
    },
    quizzes: {
      "ipv4-grundlagen": {
        attempts: 1,
        latestCorrectCount: 1,
        latestTotal: quiz.questions.length + 1,
        latestPercentage: Math.round(100 / (quiz.questions.length + 1)),
        bestCorrectCount: 1,
        bestTotal: quiz.questions.length + 1,
        bestPercentage: Math.round(100 / (quiz.questions.length + 1)),
        lastSubmittedAt: "2026-01-01T10:00:00.000Z",
      },
    },
  };
  const imported = canonicalizeLocalProgress(state, new Date("2026-02-01T00:00:00.000Z"));
  assert.equal(imported.lessons.length, 1);
  assert.equal(imported.quizzes.length, 0);
  assert.equal(getImportSnapshotHash(imported), getImportSnapshotHash(imported));
});

test("scrypt hashes use random salts and verify without containing the password", async () => {
  const password = "a-safe-development-password";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
});

test("migration contains ownership, uniqueness and score constraints", async () => {
  const migration = await readFile(new URL("../db/migrations/0001_auth_and_progress.sql", import.meta.url), "utf8");
  assert.match(migration, /PRIMARY KEY \(user_id, module_slug, lesson_slug\)/);
  assert.match(migration, /PRIMARY KEY \(user_id, module_slug\)/);
  assert.match(migration, /REFERENCES users\(id\) ON DELETE CASCADE/g);
  assert.match(migration, /latest_percentage BETWEEN 0 AND 100/);
  assert.match(migration, /local_progress_imports/);
});
