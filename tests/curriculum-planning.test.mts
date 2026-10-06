import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { learningModules } from "../src/app/data/learning-modules.ts";
import { getQuizForModule } from "../src/app/data/quizzes.ts";
import {
  buildCurriculumAssignmentViews,
  deriveCurriculumPlanningState,
  parseCurriculumTargetAt,
  validateCurriculumAssignmentInput,
} from "../src/app/lib/curriculum-planning.ts";
import {
  createEmptyLearnerProgressState,
  getModuleProgress,
  recordQuizAttempt,
  setLessonCompleted,
} from "../src/app/lib/learner-progress.ts";

test("curriculum assignment validation accepts only canonical modules and bounded plain text", () => {
  const valid = validateCurriculumAssignmentInput({
    moduleSlugs: ["dns", "ipv4-grundlagen", "dns"],
    targetAtIso: "2026-09-01T12:00:00.000Z",
    targetAtLocal: "2026-09-01T14:00",
    note: "  DNS-Diagnose priorisieren.  ",
  });
  assert.equal(valid.valid, true);
  if (valid.valid) {
    assert.deepEqual(valid.value.moduleSlugs, ["dns", "ipv4-grundlagen"]);
    assert.equal(valid.value.note, "DNS-Diagnose priorisieren.");
    assert.equal(valid.value.targetAt?.toISOString(), "2026-09-01T12:00:00.000Z");
  }
  assert.equal(validateCurriculumAssignmentInput({ moduleSlugs: ["dns-fehleranalyse"], targetAtIso: "", targetAtLocal: "", note: "" }).valid, false);
  assert.equal(validateCurriculumAssignmentInput({ moduleSlugs: ["../../../dns"], targetAtIso: "", targetAtLocal: "", note: "" }).valid, false);
  assert.equal(validateCurriculumAssignmentInput({ moduleSlugs: ["dns"], targetAtIso: "not-a-date", targetAtLocal: "2026-09-01T14:00", note: "" }).valid, false);
  assert.equal(validateCurriculumAssignmentInput({ moduleSlugs: ["dns"], targetAtIso: "", targetAtLocal: "", note: "x".repeat(1001) }).valid, false);
  assert.equal(parseCurriculumTargetAt("2101-01-01T00:00:00.000Z"), undefined);
});

test("Batch 27 modules are available to canonical curriculum planning", () => {
  const moduleSlugs = ["software-und-lizenzierung", "virtualisierung-und-cloud", "kundenauftrag-kommunikation-und-vertraege", "qualitaetssicherung-und-uebergabe"];
  const result = validateCurriculumAssignmentInput({ moduleSlugs, targetAtIso: "", targetAtLocal: "", note: "Batch 27" });
  assert.equal(result.valid, true);
  if (result.valid) assert.deepEqual(result.value.moduleSlugs, moduleSlugs);
});

test("overdue is derived over real status and completion always wins", () => {
  const incomplete = { completedActivities: 1, totalActivities: 7, completedLessons: 1, totalLessons: 6, quizAttempted: false, percentage: 14, status: "in-progress" as const };
  const completed = { ...incomplete, completedActivities: 7, completedLessons: 6, quizAttempted: true, percentage: 100, status: "completed" as const };
  const now = new Date("2026-08-24T12:00:00.000Z");
  assert.deepEqual(deriveCurriculumPlanningState(incomplete, new Date("2026-08-23T12:00:00.000Z"), now), { status: "in-progress", isOverdue: true });
  assert.deepEqual(deriveCurriculumPlanningState(completed, new Date("2026-08-23T12:00:00.000Z"), now), { status: "completed", isOverdue: false });
});

test("assignment views use canonical progress and deterministic actionable ordering", () => {
  const now = new Date("2026-08-24T12:00:00.000Z");
  const state = setLessonCompleted(createEmptyLearnerProgressState(), "dns", "was-ist-dns", true, true, "2026-08-24T10:00:00.000Z");
  const base = { learnerId: "learner", assignedBy: { id: "admin", displayName: "Trainer" }, assignedAt: new Date("2026-08-20T10:00:00.000Z"), note: null, archivedAt: null, updatedAt: new Date("2026-08-20T10:00:00.000Z") };
  const views = buildCurriculumAssignmentViews([
    { ...base, id: "without-target", moduleSlug: "ipv4-grundlagen", targetAt: null },
    { ...base, id: "future", moduleSlug: "subnetting", targetAt: new Date("2026-08-30T10:00:00.000Z") },
    { ...base, id: "overdue", moduleSlug: "dns", targetAt: new Date("2026-08-23T10:00:00.000Z") },
    { ...base, id: "unknown", moduleSlug: "unknown", targetAt: null },
  ], state, now);
  assert.deepEqual(views.map((view) => view.id), ["overdue", "future", "without-target"]);
  assert.equal(views[0].status, "in-progress");
  assert.equal(views[0].isOverdue, true);
});

test("a fully completed real module derives completed planning status without a snapshot", () => {
  const learningModule = learningModules.find((module) => module.slug === "ipv4-grundlagen");
  const quiz = getQuizForModule("ipv4-grundlagen");
  assert.ok(learningModule?.lessons && quiz);
  let state = createEmptyLearnerProgressState();
  for (const lesson of learningModule.lessons) state = setLessonCompleted(state, learningModule.slug, lesson.slug, true, true, "2026-08-24T10:00:00.000Z");
  state = recordQuizAttempt(state, learningModule.slug, quiz.questions.length, quiz.questions.length, "2026-08-24T11:00:00.000Z");
  assert.equal(getModuleProgress(state, learningModule, true).status, "completed");
  const [view] = buildCurriculumAssignmentViews([{ id: "completed", learnerId: "learner", moduleSlug: learningModule.slug, assignedBy: { id: "admin", displayName: "Trainer" }, assignedAt: new Date("2026-08-20T10:00:00.000Z"), targetAt: new Date("2026-08-21T10:00:00.000Z"), note: null, archivedAt: null, updatedAt: new Date("2026-08-20T10:00:00.000Z") }], state, new Date("2026-08-24T12:00:00.000Z"));
  assert.equal(view.status, "completed");
  assert.equal(view.isOverdue, false);
});

test("curriculum assignment migration preserves one reusable row and useful active indexes", async () => {
  const migration = await readFile(new URL("../db/migrations/0006_curriculum_assignments.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE curriculum_assignments/);
  assert.match(migration, /UNIQUE \(learner_id, module_slug\)/);
  assert.match(migration, /target_at timestamptz/);
  assert.match(migration, /archived_at timestamptz/);
  assert.match(migration, /char_length\(note\) BETWEEN 1 AND 1000/);
  assert.match(migration, /WHERE archived_at IS NULL/g);
  assert.doesNotMatch(migration, /completed_at/);
});
