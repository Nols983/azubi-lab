import assert from "node:assert/strict";
import test from "node:test";
import { learningModules } from "../src/app/data/learning-modules.ts";
import { learningPathPhases } from "../src/app/data/learning-path.ts";
import { clientInstallationExerciseDefinitions } from "../src/app/data/learning-exercises/client-installation.ts";
import { questionBank } from "../src/app/data/quiz-bank/question-bank.ts";
import { getQuizForModule, quizzes } from "../src/app/data/quizzes.ts";
import { createEmptyLearnerProgressState, getOverallProgress, recordQuizAttempt, setLessonCompleted, type LearnerProgressState } from "../src/app/lib/learner-progress.ts";
import { listCurrentLabDefinitions } from "../src/app/lib/server/lab-definitions.ts";
import { canonicalizeLocalProgress } from "../src/app/lib/server/progress-import.ts";

const moduleSlug = "clientinstallation-boot-datentraeger";
const expectedLessons = [
  ["bios-uefi-und-post", "BIOS, UEFI & POST"],
  ["bootvorgang-und-secure-boot", "Bootvorgang & Secure Boot"],
  ["gpt-mbr-und-partitionen", "GPT, MBR & Partitionen"],
  ["dateisysteme-und-formatierung", "Dateisysteme & Formatierung"],
  ["betriebssystem-installieren", "Betriebssystem installieren"],
  ["treiber-und-post-installation", "Treiber & Post-Installation"],
] as const;

const windowsLessonIds = [
  "windows-verstehen", "cmd-powershell-terminal", "dateisystem-laufwerke-pfade",
  "benutzer-gruppen-ntfs", "prozesse-dienste-software-updates", "windows-system-untersuchen",
];
const linuxLessonIds = [
  "linux-kernel-distributionen-shell", "terminal-und-befehle", "dateisystem-pfade-verzeichnisstruktur",
  "dateien-und-verzeichnisse", "benutzer-gruppen-berechtigungen", "prozesse-dienste-paketverwaltung",
  "linux-system-untersuchen",
];

test("Batch 31 registers one canonical module in the intended early learning-path position", () => {
  assert.equal(learningModules.length, 27);
  assert.equal(learningModules.filter((module) => module.slug === moduleSlug).length, 1);
  const learningModule = learningModules.find((module) => module.slug === moduleSlug);
  assert.ok(learningModule);
  assert.equal(learningModule.title, "Clientinstallation, Boot & Datenträger");
  assert.deepEqual(learningModule.lessons?.map(({ slug, title }) => [slug, title]), expectedLessons);
  assert.deepEqual(learningModule.lessons?.map((lesson) => lesson.order), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(learningPathPhases[0].moduleSlugs, [
    "arbeitsplatz-hardware",
    "datenmengen-zahlensysteme-uebertragungsrechnungen",
    moduleSlug,
    "windows-grundlagen",
    "linux-grundlagen",
  ]);
});

test("Batch 31 quiz and exercise definitions cover every new lesson through canonical infrastructure", () => {
  const quiz = getQuizForModule(moduleSlug);
  assert.ok(quiz);
  assert.equal(quizzes.length, 27);
  assert.equal(quiz.questions.length, 15);
  assert.deepEqual(new Set(quiz.questions.map((question) => question.lesson)), new Set(expectedLessons.map(([, title]) => title)));
  const bankQuestions = questionBank.filter((question) => question.moduleSlug === moduleSlug);
  assert.equal(bankQuestions.length, 15);
  assert.ok(bankQuestions.every((question) => question.practiceEligible && question.completionEligible && question.shuffleOptions));
  assert.equal(new Set(bankQuestions.map((question) => question.id)).size, 15);

  const exercises = Object.values(clientInstallationExerciseDefinitions);
  assert.equal(exercises.length, 8);
  assert.deepEqual(new Set(exercises.map((exercise) => exercise.lessonSlug)), new Set(expectedLessons.map(([slug]) => slug)));
  assert.deepEqual(clientInstallationExerciseDefinitions.bootSequence.correctItemIds, ["power", "firmware-post", "boot-target", "bootloader", "kernel", "login"]);
  assert.deepEqual(clientInstallationExerciseDefinitions.installationSequence.correctItemIds, ["prepare", "boot", "layout", "install", "initial", "drivers", "validate"]);
});

test("existing Windows and Linux lesson IDs and completion quiz lengths remain stable", () => {
  const windows = learningModules.find((module) => module.slug === "windows-grundlagen");
  const linux = learningModules.find((module) => module.slug === "linux-grundlagen");
  assert.deepEqual(windows?.lessons?.map((lesson) => lesson.slug), windowsLessonIds);
  assert.deepEqual(linux?.lessons?.map((lesson) => lesson.slug), linuxLessonIds);
  assert.equal(getQuizForModule("windows-grundlagen")?.questions.length, 16);
  assert.equal(getQuizForModule("linux-grundlagen")?.questions.length, 17);
});

test("historic anonymous Windows and Linux quiz attempts retain their exact accepted totals", () => {
  let state = createEmptyLearnerProgressState();
  state = recordQuizAttempt(state, "windows-grundlagen", 12, 16, "2026-09-01T10:00:00.000Z");
  state = recordQuizAttempt(state, "linux-grundlagen", 13, 17, "2026-09-01T10:05:00.000Z");
  const imported = canonicalizeLocalProgress(state, new Date("2026-10-05T10:00:00.000Z"));
  assert.deepEqual(imported.quizzes.map(({ moduleSlug: slug, latestTotal }) => [slug, latestTotal]), [
    ["linux-grundlagen", 17],
    ["windows-grundlagen", 16],
  ]);
});

test("all existing Lab prerequisite module IDs remain unchanged and exclude the new module", () => {
  const actual = Object.fromEntries(listCurrentLabDefinitions().map(({ public: definition }) => [
    definition.id,
    definition.unlockRequirements.requiredModuleIds ?? [],
  ]));
  assert.deepEqual(actual, {
    "tutorial-lab-001": [],
    "subnet-client-001": [],
    "gateway-client-001": [],
    "prefix-client-001": ["subnetting"],
    "dns-client-001": [],
    "dns-record-001": ["dns"],
    "dhcp-client-001": ["dhcp"],
    "dhcp-options-001": ["dhcp", "dns"],
    "web-service-001": ["webserver-grundlagen"],
    "application-backend-001": ["webserver-grundlagen", "linux-grundlagen"],
    "web-port-001": ["webserver-grundlagen"],
    "linux-routing-001": ["linux-grundlagen", "subnetting"],
    "linux-permissions-001": ["linux-grundlagen"],
    "vlan-access-001": ["subnetting", "netzwerkfehler-systematisch-analysieren"],
    "firewall-http-001": ["webserver-grundlagen", "netzwerkfehler-systematisch-analysieren"],
    "client-multifault-001": ["dns", "netzwerkfehler-systematisch-analysieren"],
    "vlan-firewall-multifault-001": ["subnetting", "webserver-grundlagen", "netzwerkfehler-systematisch-analysieren"],
  });
  assert.ok((Object.values(actual).flat() as readonly string[]).every((id) => id !== moduleSlug));
});

test("live curriculum progress derives 1/27, 26/27, and 27/27 without parallel logic", () => {
  const quizModules = new Set(quizzes.map((quiz) => quiz.moduleSlug));
  let state = completeModules(createEmptyLearnerProgressState(), learningModules.slice(0, 1));
  assert.deepEqual(pickModuleCounts(getOverallProgress(state, learningModules, quizModules)), { completedModules: 1, inProgressModules: 0, notStartedModules: 26 });

  state = completeModules(createEmptyLearnerProgressState(), learningModules.filter((module) => module.slug !== moduleSlug));
  assert.deepEqual(pickModuleCounts(getOverallProgress(state, learningModules, quizModules)), { completedModules: 26, inProgressModules: 0, notStartedModules: 1 });

  state = completeModules(state, learningModules.filter((module) => module.slug === moduleSlug));
  assert.deepEqual(pickModuleCounts(getOverallProgress(state, learningModules, quizModules)), { completedModules: 27, inProgressModules: 0, notStartedModules: 0 });
});

function completeModules(initial: LearnerProgressState, modules: readonly (typeof learningModules)[number][]) {
  let state = initial;
  for (const learningModule of modules) {
    for (const lesson of learningModule.lessons ?? []) {
      state = setLessonCompleted(state, learningModule.slug, lesson.slug, true, true, "2026-10-05T09:00:00.000Z");
    }
    const quiz = getQuizForModule(learningModule.slug);
    assert.ok(quiz);
    state = recordQuizAttempt(state, learningModule.slug, quiz.questions.length, quiz.questions.length, "2026-10-05T09:05:00.000Z");
  }
  return state;
}

function pickModuleCounts(summary: ReturnType<typeof getOverallProgress>) {
  return {
    completedModules: summary.completedModules,
    inProgressModules: summary.inProgressModules,
    notStartedModules: summary.notStartedModules,
  };
}
