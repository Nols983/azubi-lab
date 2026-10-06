import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  backupExerciseDefinitions,
  clientInstallationExerciseDefinitions,
  dataCalculationExerciseDefinitions,
  learningExercises,
  networkDeviceExerciseDefinitions,
  networkTopologyExerciseDefinitions,
  osiTcpIpExerciseDefinitions,
} from "../src/app/data/learning-exercises/index.ts";
import { learningModules } from "../src/app/data/learning-modules.ts";
import {
  createEmptyLearningExerciseAnswer,
  gradeLearningExercise,
  validateLearningExercises,
  type LearningExercise,
  type LearningExerciseAnswer,
} from "../src/app/lib/learning-exercise.ts";

const expectedCounts = new Map([
  ["osi-tcp-ip-modell", 6],
  ["netzwerk-koppelelemente", 6],
  ["netzwerktopologien", 5],
  ["backup-datensicherung", 8],
  ["datenmengen-zahlensysteme-uebertragungsrechnungen", 9],
  ["clientinstallation-boot-datentraeger", 8],
]);

test("all 42 exercise definitions are valid, unique, and attached to canonical lessons", () => {
  assert.equal(learningExercises.length, 42);
  assert.equal(new Set(learningExercises.map((exercise) => exercise.id)).size, learningExercises.length);
  assert.deepEqual(validateLearningExercises(learningExercises), []);

  for (const [moduleSlug, count] of expectedCounts) {
    assert.equal(learningExercises.filter((exercise) => exercise.moduleSlug === moduleSlug).length, count);
  }

  for (const exercise of learningExercises) {
    const learningModule = learningModules.find((candidate) => candidate.slug === exercise.moduleSlug);
    assert.ok(learningModule, `${exercise.id} references an unknown module`);
    assert.ok(learningModule.lessons?.some((lesson) => lesson.slug === exercise.lessonSlug), `${exercise.id} references an unknown lesson`);
    assert.equal(gradeLearningExercise(exercise, correctAnswer(exercise)).status, "correct", `${exercise.id} has no valid exact solution`);
    assert.equal(gradeLearningExercise(exercise, createEmptyLearningExerciseAnswer(exercise)).status, "incomplete", `${exercise.id} cannot be reset to an unanswered state`);
  }
});

test("validator rejects duplicate IDs, missing targets, and impossible sequences", () => {
  const duplicate = [osiTcpIpExerciseDefinitions.troubleshootingFocus, { ...osiTcpIpExerciseDefinitions.troubleshootingFocus }];
  assert.ok(validateLearningExercises(duplicate).some((error) => error.includes("duplicated")));

  const missingTarget = {
    ...osiTcpIpExerciseDefinitions.tcpIpMapping,
    items: [{ ...osiTcpIpExerciseDefinitions.tcpIpMapping.items[0], correctTargetId: "unknown" }, ...osiTcpIpExerciseDefinitions.tcpIpMapping.items.slice(1)],
  };
  assert.ok(validateLearningExercises([missingTarget]).some((error) => error.includes("unknown target")));

  const impossibleSequence = {
    ...osiTcpIpExerciseDefinitions.encapsulationOrder,
    correctItemIds: ["http", "http", "packet", "frame", "bits"],
  };
  assert.ok(validateLearningExercises([impossibleSequence]).some((error) => error.includes("exactly once")));
});

test("grading distinguishes incomplete, partial, exact, retry, and reset states", () => {
  const assignment = osiTcpIpExerciseDefinitions.tcpIpMapping;
  const partialAssignment = gradeLearningExercise(assignment, {
    type: "assignment",
    assignments: { "osi-7-5": "application", "osi-4": "internet", "osi-3": "internet", "osi-2-1": "access" },
  });
  assert.equal(partialAssignment.status, "incorrect");
  assert.equal(partialAssignment.correctCount, 3);
  assert.deepEqual(partialAssignment.incorrectKeys, ["osi-4"]);
  assert.equal(gradeLearningExercise(assignment, correctAnswer(assignment)).status, "correct");
  assert.equal(gradeLearningExercise(assignment, createEmptyLearningExerciseAnswer(assignment)).status, "incomplete");

  const sequence = osiTcpIpExerciseDefinitions.encapsulationOrder;
  const wrongSequence = gradeLearningExercise(sequence, { type: "sequence", itemIds: ["http", "packet", "segment", "frame", "bits"] });
  assert.equal(wrongSequence.status, "incorrect");
  assert.equal(wrongSequence.correctCount, 3);
  assert.equal(gradeLearningExercise(sequence, correctAnswer(sequence)).status, "correct");

  const single = networkTopologyExerciseDefinitions.requirementChoice;
  assert.equal(gradeLearningExercise(single, { type: "single-choice", selectedOptionIds: ["full"] }).status, "incorrect");
  assert.equal(gradeLearningExercise(single, correctAnswer(single)).status, "correct");

  const multiple = backupExerciseDefinitions.differentialRestore;
  assert.equal(gradeLearningExercise(multiple, { type: "multiple-selection", selectedOptionIds: ["thu", "mon"] }).status, "correct");
  assert.equal(gradeLearningExercise(multiple, { type: "multiple-selection", selectedOptionIds: ["mon", "wed", "thu"] }).status, "incorrect");
});

test("authored solutions preserve the required technical outcomes", () => {
  assert.deepEqual(backupExerciseDefinitions.incrementalRestore.correctOptionIds, ["mon", "tue", "wed", "thu"]);
  assert.deepEqual(backupExerciseDefinitions.differentialRestore.correctOptionIds, ["mon", "thu"]);
  assert.deepEqual(Object.fromEntries(backupExerciseDefinitions.ruleAssessment.items.map((item) => [item.id, item.correctTargetId])), {
    three: "met",
    two: "met",
    "one-offsite": "met",
    "one-protected": "met",
    zero: "not-met",
  });
  assert.match(backupExerciseDefinitions.rpoRto.instruction, /zwei Stunden Daten verlieren/);
  assert.match(backupExerciseDefinitions.rpoRto.instruction, /innerhalb von vier Stunden/);
  assert.deepEqual(Object.fromEntries(backupExerciseDefinitions.rpoRto.items.map((item) => [item.id, item.correctTargetId])), {
    "data-loss": "rpo",
    recovery: "rto",
    job: "evidence",
    "copy-speed": "evidence",
  });
  assert.deepEqual(Object.fromEntries(backupExerciseDefinitions.gfs.items.map((item) => [item.id, item.correctTargetId])), {
    daily: "son",
    weekly: "father",
    monthly: "grandfather",
  });
  assert.deepEqual(Object.fromEntries(osiTcpIpExerciseDefinitions.tcpIpMapping.items.map((item) => [item.id, item.correctTargetId])), {
    "osi-7-5": "application",
    "osi-4": "transport",
    "osi-3": "internet",
    "osi-2-1": "access",
  });
  assert.equal(networkDeviceExerciseDefinitions.broadcastBoundary.correctOptionId, "boundary");
  assert.deepEqual(Object.fromEntries(networkDeviceExerciseDefinitions.purposeSelection.items.map((item) => [item.id, item.correctTargetId])), {
    regenerate: "repeater",
    "ethernet-lan": "switch",
    "ip-networks": "router",
    wifi: "access-point",
    "fiber-copper": "media-converter",
  });
  assert.deepEqual(Object.fromEntries(networkDeviceExerciseDefinitions.switchForwarding.items.map((item) => [item.id, item.correctTargetId])), {
    known: "known-port",
    unknown: "flood",
    broadcast: "flood",
  });
  assert.deepEqual(Object.fromEntries(networkTopologyExerciseDefinitions.starFailures.items.map((item) => [item.id, item.correctTargetId])), {
    cable: "one-host",
    switch: "all-hosts",
    unused: "no-network-effect",
  });
  assert.deepEqual(Object.fromEntries(networkTopologyExerciseDefinitions.failureEffects.items.map((item) => [item.id, item.correctTargetId])), {
    access: "access-branch",
    distribution: "tree-branches",
    wan: "alternate-path",
  });
  assert.equal(networkTopologyExerciseDefinitions.requirementChoice.correctOptionId, "partial");
});

test("exercise renderer uses native accessible controls and has no progression or persistence coupling", () => {
  const component = readFileSync(new URL("../src/app/components/learning/practice-exercise.tsx", import.meta.url), "utf8");
  assert.match(component, /<fieldset>/);
  assert.match(component, /<legend/);
  assert.match(component, /<select/);
  assert.match(component, /type="radio"/);
  assert.match(component, /type="checkbox"/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /focus-visible:outline-2/);
  assert.match(component, />\s*Zurücksetzen\s*</);
  assert.match(component, /setGrade\(undefined\)/);

  for (const forbidden of ["useLearnerProgress", "awardXp", "saveQuizAttempt", "localStorage", "fetch(", "LabAttempt", "Challenge"]) {
    assert.equal(component.includes(forbidden), false, `exercise renderer must not use ${forbidden}`);
  }
});

test("every exercise definition is embedded through the existing lesson-section architecture", () => {
  const integrations = [
    ["osi-tcp-ip-lessons.tsx", osiTcpIpExerciseDefinitions],
    ["network-device-lessons.tsx", networkDeviceExerciseDefinitions],
    ["network-topology-lessons.tsx", networkTopologyExerciseDefinitions],
    ["backup-lessons.tsx", backupExerciseDefinitions],
    ["data-calculation-lessons.tsx", dataCalculationExerciseDefinitions],
    ["client-installation-lessons.tsx", clientInstallationExerciseDefinitions],
  ] as const;

  for (const [file, definitions] of integrations) {
    const source = readFileSync(new URL(`../src/app/components/learning/${file}`, import.meta.url), "utf8");
    assert.match(source, /activity: <PracticeExercise/);
    for (const key of Object.keys(definitions)) assert.ok(source.includes(`ExerciseDefinitions.${key}`), `${file} does not embed ${key}`);
  }

  const shared = readFileSync(new URL("../src/app/components/learning/fundamentals-lesson-elements.tsx", import.meta.url), "utf8");
  assert.match(shared, /activity\?: ReactNode/);
  assert.match(shared, /section\.activity/);
});

function correctAnswer(exercise: LearningExercise): LearningExerciseAnswer {
  if (exercise.type === "assignment") {
    return { type: exercise.type, assignments: Object.fromEntries(exercise.items.map((item) => [item.id, item.correctTargetId])) };
  }
  if (exercise.type === "sequence") return { type: exercise.type, itemIds: [...exercise.correctItemIds] };
  if (exercise.type === "single-choice") return { type: exercise.type, selectedOptionIds: [exercise.correctOptionId] };
  return { type: exercise.type, selectedOptionIds: [...exercise.correctOptionIds] };
}
