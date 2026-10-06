import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { learningModules } from "../src/app/data/learning-modules.ts";
import { buildLearningPathGroups, learningPathPhases } from "../src/app/data/learning-path.ts";
import { questionBank } from "../src/app/data/quiz-bank/question-bank.ts";
import { quizzes } from "../src/app/data/quizzes.ts";
import {
  calculatePaybackMonths,
  calculateProcurementPrice,
  calculateProfitabilityPercent,
  calculateTco,
  calculateWeightedUtility,
} from "../src/app/lib/economic-calculations.ts";
import { createEmptyLearnerProgressState, getModuleProgress } from "../src/app/lib/learner-progress.ts";
import { prepareModuleQuizAttempt } from "../src/app/lib/module-quiz-attempt.ts";
import { calculateProjectNetwork } from "../src/app/lib/project-network.ts";
import { calculateRaidUsableCapacity } from "../src/app/lib/raid-capacity.ts";

const newModules = {
  "osi-tcp-ip-modell": [
    "warum-schichtenmodelle", "die-sieben-osi-schichten", "osi-schichten-1-bis-3",
    "osi-schichten-4-bis-7", "tcp-ip-modell", "osi-und-tcp-ip-vergleichen",
    "kapselung-und-datenfluss", "fehlersuche-mit-schichtenmodell",
  ],
  "netzwerk-koppelelemente": [
    "warum-netzwerke-gekoppelt-werden", "repeater-und-hub", "bridge-und-switch",
    "wie-ein-switch-lernt", "router", "gateway", "access-point-modem-medienkonverter",
    "collision-und-broadcast-domains", "welches-geraet-fuer-welchen-zweck",
  ],
  netzwerktopologien: [
    "was-ist-eine-netzwerktopologie", "punkt-zu-punkt-und-bus", "ring", "stern", "baum",
    "vermaschte-netze", "hybridtopologien", "physische-und-logische-topologie",
    "topologien-praktisch-auswaehlen",
  ],
  "backup-datensicherung": [
    "backup-grundlagen-und-schutzziele", "voll-inkrementell-differentiell",
    "restore-ketten-praktisch-planen", "datei-image-und-snapshot", "backup-strategien-321",
    "aufbewahrung-rotation-und-gfs", "rpo-und-rto", "backup-sicherheit-und-restore-tests",
    "backup-praxis",
  ],
  "arbeitsplatz-hardware": ["cpu-und-von-neumann", "ram-mainboard-und-netzteil", "gpu-speicher-und-schnittstellen", "peripherie-und-clienttypen", "arbeitsplatz-auswaehlen", "leistung-energie-und-kapazitaet"],
  "storage-und-raid": ["raid-grundlagen", "raid-0-und-raid-1", "raid-5-und-raid-6", "raid-10-rebuild-und-hot-spare", "raid-kapazitaeten-berechnen", "raid-oder-backup-praxis"],
  "it-sicherheit": ["begriffe-und-schutzziele", "schadsoftware-erkennen", "angriffe-und-social-engineering", "schutzmassnahmen-und-hardening", "kryptografie-und-hashing", "zertifikate-tls-und-sichere-administration"],
  datenschutz: ["personenbezogene-daten-und-rechtsrahmen", "datenschutzgrundsaetze", "betroffenenrechte", "anonymisierung-und-pseudonymisierung", "datenschutz-und-datensicherheit", "datenschutzfaelle-praxis"],
  "programmierung-und-pseudocode": ["algorithmen-und-pseudocode", "variablen-datentypen-und-operatoren", "bedingungen-und-verzweigungen", "schleifen-und-schreibtischtest", "funktionen-und-listen", "oop-grundlagen-und-fehlersuche"],
  "uml-und-datenmodellierung": ["uml-und-modelle-einordnen", "use-case-diagramme", "klassendiagramme", "aktivitaetsdiagramme", "er-modell-und-kardinalitaeten", "relationale-tabellen-und-schluessel"],
  projektmanagement: ["projektmerkmale-und-smart-ziele", "magisches-dreieck-und-stakeholder", "phasen-arbeitspakete-und-anforderungen", "gantt-und-projektcontrolling", "netzplan-und-kritischer-pfad", "wasserfall-scrum-und-kanban"],
  "wirtschaftlichkeit-und-beschaffung": ["kosten-erloes-und-wirtschaftlichkeit", "rabatt-skonto-netto-und-brutto", "tco-und-amortisation", "beschaffung-und-angebotsvergleich", "nutzwertanalyse", "kauf-miete-leasing-und-make-or-buy"],
  "software-und-lizenzierung": ["softwarearten-und-geschaeftsanwendungen", "software-auswaehlen", "open-source-und-proprietaer", "lizenzmodelle-und-nutzungsrechte", "lizenzszenarien-pruefen", "ki-gestuetzte-software"],
  "virtualisierung-und-cloud": ["virtualisierung-host-gast-hypervisor", "vm-ressourcen-und-betriebsgrenzen", "vm-und-container-unterscheiden", "container-grundlagen", "cloud-service-und-bereitstellungsmodelle", "cloud-entscheidung-und-verantwortung"],
  "kundenauftrag-kommunikation-und-vertraege": ["kundenbedarf-und-anforderungen", "anforderungen-priorisieren", "kundenkommunikation-und-fachinformationen", "angebot-und-vertragsgrundlagen", "dienstvertrag-werkvertrag-und-maengel", "sla-support-und-kundeneinweisung"],
  "qualitaetssicherung-und-uebergabe": ["qualitaet-qa-qm-und-pdca", "testfaelle-und-soll-ist", "testarten-und-abnahmetest", "fehlerdokumentation-und-serviceprozess", "abnahme-uebergabe-und-einweisung", "technische-dokumentation-und-lessons-learned"],
  "datenmengen-zahlensysteme-uebertragungsrechnungen": ["bit-byte-und-einheiten", "si-iec-und-speicherkapazitaet", "datenmenge-datenrate-und-uebertragungszeit", "binaer-dezimal-und-hexadezimal", "bild-audio-und-kompression", "ascii-unicode-utf-8-und-praxisfall"],
  "clientinstallation-boot-datentraeger": ["bios-uefi-und-post", "bootvorgang-und-secure-boot", "gpt-mbr-und-partitionen", "dateisysteme-und-formatierung", "betriebssystem-installieren", "treiber-und-post-installation"],
} as const;

const expectedAnswerPositions = {
  "osi-tcp-ip-modell": "2, 1+3, 4, 2, 3, 3, 2+4, 1, 1+3+4, 3, 4, 2",
  "netzwerk-koppelelemente": "3, 1+4, 2, 4, 2+3, 1, 3, 2, 1+3, 4, 2, 2+4",
  netzwerktopologien: "4, 1+3+4, 2, 3, 4, 2+3, 3, 2, 1+3, 4, 3, 2+3",
  "backup-datensicherung": "2, 4, 1+3, 3, 1, 4, 2+4, 2, 1+3+4, 4, 1, 2+3, 3, 2+3, 2",
  "programmierung-und-pseudocode": "1+2, 2, 3, 2+3, 4, 1+2, 2, 3, 1, 4, 1+2+3, 1+2+3",
  "uml-und-datenmodellierung": "1+2, 3, 1+2+3, 1, 1+2+3, 3, 1, 1+2, 2, 1, 1+2, 1",
  projektmanagement: "1+2+3, 2, 1+2+3, 1, 1+2+3, 1, 1, 1+2+3, 3, 1+2+3, 1+2+3, 1",
  "wirtschaftlichkeit-und-beschaffung": "2, 1+2, 4, 1+2, 3, 2, 1+2+3, 4, 2, 1+2+3, 1+2+3, 3",
  "software-und-lizenzierung": "2, 1+2+3, 2, 2+3+4, 3, 4, 3, 1+2+3, 3, 2, 4, 1+2+3",
  "virtualisierung-und-cloud": "4, 3, 1+2+3, 2, 2, 1+2+3, 2, 1+2+3, 3, 1+2+3, 3, 1+2+3",
  "kundenauftrag-kommunikation-und-vertraege": "3, 1+2+3, 2, 3, 3, 1+2+3, 2, 1+2+3, 3, 3, 4, 1+2+3",
  "qualitaetssicherung-und-uebergabe": "4, 3, 1+2+3, 2, 3, 3, 1+2+3, 3, 2, 1+2+3, 2, 1+2+3",
  "datenmengen-zahlensysteme-uebertragungsrechnungen": "1, 1+2+3, 3, 2, 1, 1, 2, 1+2, 1, 1+2+3, 1+2+3, 1",
  "clientinstallation-boot-datentraeger": "1, 1+2+4, 2, 1+2+4, 3, 1+2+4, 2, 4, 2, 1+2+3, 3, 1+2+3, 4, 2, 1+2+3+4",
} as const;

function answerPositions(moduleSlug: string) {
  const quiz = quizzes.find((candidate) => candidate.moduleSlug === moduleSlug);
  assert.ok(quiz);
  return quiz.questions.map((question) => {
    const correctIds = question.type === "single-choice" ? [question.correctOptionId] : question.correctOptionIds;
    return correctIds.map((id) => question.options.findIndex((option) => option.id === id) + 1).join("+");
  }).join(", ");
}

test("canonical learning catalogue contains unique complete modules without duplicate lesson slugs", () => {
  assert.equal(learningModules.length, 27);
  assert.equal(new Set(learningModules.map((module) => module.slug)).size, learningModules.length);

  for (const [moduleSlug, expectedLessons] of Object.entries(newModules)) {
    const learningModule = learningModules.find((candidate) => candidate.slug === moduleSlug);
    assert.ok(learningModule);
    assert.equal(learningModule.lessonCount, expectedLessons.length);
    assert.deepEqual(learningModule.lessons?.map((lesson) => lesson.slug), expectedLessons);
    assert.deepEqual(learningModule.lessons?.map((lesson) => lesson.order), expectedLessons.map((_, index) => index + 1));
    assert.ok(learningModule.lessons?.every((lesson) => lesson.status === "available"));
    assert.equal(new Set(learningModule.lessons?.map((lesson) => lesson.slug)).size, expectedLessons.length);
    assert.ok((learningModule.learningObjectives?.length ?? 0) >= 8);
  }
});

test("all new canonical lessons have a server-rendered content family and accessible responsive tables", () => {
  const lessonRoute = readFileSync(new URL("../src/app/lernen/[slug]/[lessonSlug]/page.tsx", import.meta.url), "utf8");
  const componentFiles = [
    "osi-tcp-ip-lessons.tsx",
    "network-device-lessons.tsx",
    "network-topology-lessons.tsx",
    "backup-lessons.tsx",
    "hardware-lessons.tsx",
    "storage-raid-lessons.tsx",
    "security-lessons.tsx",
    "privacy-lessons.tsx",
    "programming-lessons.tsx",
    "modeling-lessons.tsx",
    "project-management-lessons.tsx",
    "economics-lessons.tsx",
    "software-licensing-lessons.tsx",
    "virtualization-cloud-lessons.tsx",
    "customer-contract-lessons.tsx",
    "quality-handover-lessons.tsx",
    "data-calculation-lessons.tsx",
    "client-installation-lessons.tsx",
  ];
  const components = componentFiles.map((file) => readFileSync(new URL(`../src/app/components/learning/${file}`, import.meta.url), "utf8"));

  for (const moduleSlug of Object.keys(newModules)) assert.ok(lessonRoute.includes(`\"${moduleSlug}\"`));
  for (const [moduleSlug, lessonSlugs] of Object.entries(newModules)) {
    const source = components[Object.keys(newModules).indexOf(moduleSlug)];
    for (const lessonSlug of lessonSlugs) assert.ok(source.includes(`\"${lessonSlug}\"`), `${moduleSlug}/${lessonSlug} has no content`);
  }

  const shared = readFileSync(new URL("../src/app/components/learning/fundamentals-lesson-elements.tsx", import.meta.url), "utf8");
  assert.match(shared, /overflow-x-auto/);
  assert.match(shared, /<caption/);
  assert.match(shared, /scope="col"/);
  assert.match(shared, /scope="row"/);
  assert.match(shared, /<details/);
});

test("new module quizzes are complete, valid, and use non-obvious authored answer positions", () => {
  for (const [moduleSlug, expectedSequence] of Object.entries(expectedAnswerPositions)) {
    const quiz = quizzes.find((candidate) => candidate.moduleSlug === moduleSlug);
    assert.ok(quiz);
    assert.ok(quiz.questions.length >= 12);
    assert.equal(answerPositions(moduleSlug), expectedSequence);

    const singlePositions = quiz.questions
      .filter((question) => question.type === "single-choice")
      .map((question) => question.options.findIndex((option) => option.id === question.correctOptionId) + 1);
    assert.ok(new Set(singlePositions).size >= 3);
    assert.ok(singlePositions.every((position) => position >= 1 && position <= 4));
  }
});

test("new modules participate in unchanged generic progress semantics", () => {
  const state = createEmptyLearnerProgressState();
  for (const [moduleSlug, lessons] of Object.entries(newModules)) {
    const learningModule = learningModules.find((candidate) => candidate.slug === moduleSlug);
    assert.ok(learningModule);
    const summary = getModuleProgress(state, learningModule, true);
    assert.deepEqual(summary, {
      completedActivities: 0,
      totalActivities: lessons.length + 1,
      completedLessons: 0,
      totalLessons: lessons.length,
      quizAttempted: false,
      percentage: 0,
      status: "not-started",
    });
  }
});

test("new lesson cross-links resolve to canonical modules", () => {
  const files = ["osi-tcp-ip-lessons.tsx", "network-device-lessons.tsx", "network-topology-lessons.tsx", "backup-lessons.tsx", "hardware-lessons.tsx", "storage-raid-lessons.tsx", "security-lessons.tsx", "privacy-lessons.tsx", "programming-lessons.tsx", "modeling-lessons.tsx", "project-management-lessons.tsx", "economics-lessons.tsx", "software-licensing-lessons.tsx", "virtualization-cloud-lessons.tsx", "customer-contract-lessons.tsx", "quality-handover-lessons.tsx", "data-calculation-lessons.tsx", "client-installation-lessons.tsx"];
  const canonicalModules = new Set(learningModules.map((module) => module.slug));
  for (const file of files) {
    const source = readFileSync(new URL(`../src/app/components/learning/${file}`, import.meta.url), "utf8");
    for (const match of source.matchAll(/href: "\/lernen\/([^"/]+)"/g)) {
      assert.ok(canonicalModules.has(match[1]), `${file} links to unknown module ${match[1]}`);
    }
  }
});

test("Batch 25 completion quizzes use canonical questions and the shared attempt pipeline", async () => {
  const moduleSlugs = ["arbeitsplatz-hardware", "storage-und-raid", "it-sicherheit", "datenschutz"];
  for (const moduleSlug of moduleSlugs) {
    const quiz = quizzes.find((candidate) => candidate.moduleSlug === moduleSlug);
    assert.ok(quiz);
    assert.equal(quiz.questions.length, 12);
    assert.ok(quiz.questions.every((question) => question.id.startsWith(`${moduleSlug}:`)));
    assert.ok(quiz.questions.some((question) => question.type === "multiple-selection"));
  }
  const attemptSource = readFileSync(new URL("../src/app/lib/module-quiz-attempt.ts", import.meta.url), "utf8");
  assert.match(attemptSource, /shuffle/);
});

test("RAID capacity helper enforces formulas, smallest-drive limits, and RAID 10 pairs", () => {
  assert.equal(calculateRaidUsableCapacity("0", [4, 4, 4, 4]), 16);
  assert.equal(calculateRaidUsableCapacity("1", [4, 4, 4, 4]), 4);
  assert.equal(calculateRaidUsableCapacity("5", [4, 4, 4, 4]), 12);
  assert.equal(calculateRaidUsableCapacity("6", [4, 4, 4, 4]), 8);
  assert.equal(calculateRaidUsableCapacity("10", [4, 4, 4, 4]), 8);
  assert.equal(calculateRaidUsableCapacity("5", [2, 4, 4, 8]), 6);
  assert.equal(calculateRaidUsableCapacity("6", [2, 4, 4, 8]), 4);
  assert.equal(calculateRaidUsableCapacity("10", [2, 4, 4, 8]), 4);
  assert.throws(() => calculateRaidUsableCapacity("5", [4, 4]));
  assert.throws(() => calculateRaidUsableCapacity("10", [4, 4, 4, 4, 4]));
});

test("Batch 25 preserves critical content distinctions and reciprocal Backup links", () => {
  const hardware = readFileSync(new URL("../src/app/components/learning/hardware-lessons.tsx", import.meta.url), "utf8");
  const raid = readFileSync(new URL("../src/app/components/learning/storage-raid-lessons.tsx", import.meta.url), "utf8");
  const security = readFileSync(new URL("../src/app/components/learning/security-lessons.tsx", import.meta.url), "utf8");
  const privacy = readFileSync(new URL("../src/app/components/learning/privacy-lessons.tsx", import.meta.url), "utf8");
  const backup = readFileSync(new URL("../src/app/components/learning/backup-lessons.tsx", import.meta.url), "utf8");
  assert.match(hardware, /M\.2 bedeutet daher nicht automatisch NVMe/);
  assert.match(raid, /RAID ist kein Backup/);
  assert.match(raid, /nicht beide Mitglieder desselben Spiegelpaares ausfallen/);
  assert.match(raid, /href: "\/lernen\/backup-datensicherung"/);
  assert.match(backup, /href: "\/lernen\/storage-und-raid"/);
  assert.match(security, /Hashing erzeugt einen Einweg-Prüfwert/);
  assert.match(security, /HTTPS beweist nicht/);
  assert.match(privacy, /Pseudonymisierte Daten bleiben personenbezogene Daten/);
  assert.match(privacy, /Datenschutz schützt Menschen/);
});

test("learning path groups every canonical module exactly once without access rules", () => {
  const legacyModuleSlugs = [
    "ipv4-grundlagen", "subnetting", "dhcp", "dns", "osi-tcp-ip-modell",
    "netzwerk-koppelelemente", "netzwerktopologien", "linux-grundlagen",
    "arbeitsplatz-hardware", "windows-grundlagen", "webserver-grundlagen",
    "active-directory-grundlagen", "backup-datensicherung", "storage-und-raid",
    "it-sicherheit", "datenschutz", "netzwerkfehler-systematisch-analysieren",
  ];
  assert.deepEqual(learningModules.filter((module) => !["datenmengen-zahlensysteme-uebertragungsrechnungen", "clientinstallation-boot-datentraeger"].includes(module.slug)).slice(0, legacyModuleSlugs.length).map((module) => module.slug), legacyModuleSlugs);
  assert.deepEqual(learningPathPhases.map((phase) => phase.order), [1, 2, 3, 4, 5]);
  assert.deepEqual(learningPathPhases.map((phase) => phase.title), [
    "IT-Grundlagen & Arbeitsplatz",
    "Netzwerke",
    "Systeme, Storage & Betrieb",
    "Sicherheit & Datenschutz",
    "Entwicklung, Planung & Wirtschaft",
  ]);
  const phaseSlugs = learningPathPhases.flatMap((phase) => phase.moduleSlugs);
  assert.equal(phaseSlugs.length, learningModules.length);
  assert.equal(new Set(phaseSlugs).size, learningModules.length);
  assert.deepEqual(new Set(phaseSlugs), new Set(learningModules.map((module) => module.slug)));
  assert.deepEqual(learningPathPhases[0].moduleSlugs, ["arbeitsplatz-hardware", "datenmengen-zahlensysteme-uebertragungsrechnungen", "clientinstallation-boot-datentraeger", "windows-grundlagen", "linux-grundlagen"]);
  assert.deepEqual(learningPathPhases[2].moduleSlugs, ["webserver-grundlagen", "active-directory-grundlagen", "virtualisierung-und-cloud", "storage-und-raid", "backup-datensicherung", "netzwerkfehler-systematisch-analysieren"]);
  assert.deepEqual(learningPathPhases[4].moduleSlugs.slice(-3), ["software-und-lizenzierung", "kundenauftrag-kommunikation-und-vertraege", "qualitaetssicherung-und-uebergabe"]);
  const groups = buildLearningPathGroups();
  assert.deepEqual(groups.flatMap((group) => group.modules.map((module) => module.slug)), phaseSlugs);
  for (const phase of learningPathPhases) {
    assert.equal(Object.hasOwn(phase, "locked"), false);
    assert.equal(Object.hasOwn(phase, "prerequisite"), false);
  }
  const moduleRoute = readFileSync(new URL("../src/app/lernen/[slug]/page.tsx", import.meta.url), "utf8");
  const lessonRoute = readFileSync(new URL("../src/app/lernen/[slug]/[lessonSlug]/page.tsx", import.meta.url), "utf8");
  const progression = readFileSync(new URL("../src/app/lib/learning-progression.ts", import.meta.url), "utf8");
  assert.doesNotMatch(moduleRoute, /learningPath|phase/i);
  assert.doesNotMatch(lessonRoute, /learningPath|phase/i);
  assert.doesNotMatch(progression, /learningPath|phase/i);
});

test("project network helper calculates forward pass, backward pass, float, and critical path", () => {
  const result = calculateProjectNetwork([
    { id: "A", duration: 2, predecessorIds: [] },
    { id: "B", duration: 3, predecessorIds: ["A"] },
    { id: "C", duration: 2, predecessorIds: ["A"] },
    { id: "D", duration: 4, predecessorIds: ["B", "C"] },
    { id: "E", duration: 2, predecessorIds: ["D"] },
  ]);
  assert.equal(result.projectDuration, 11);
  assert.deepEqual(
    result.activities.map(({ id, earliestStart, earliestFinish, latestStart, latestFinish, totalFloat, critical }) => ({ id, earliestStart, earliestFinish, latestStart, latestFinish, totalFloat, critical })),
    [
      { id: "A", earliestStart: 0, earliestFinish: 2, latestStart: 0, latestFinish: 2, totalFloat: 0, critical: true },
      { id: "B", earliestStart: 2, earliestFinish: 5, latestStart: 2, latestFinish: 5, totalFloat: 0, critical: true },
      { id: "C", earliestStart: 2, earliestFinish: 4, latestStart: 3, latestFinish: 5, totalFloat: 1, critical: false },
      { id: "D", earliestStart: 5, earliestFinish: 9, latestStart: 5, latestFinish: 9, totalFloat: 0, critical: true },
      { id: "E", earliestStart: 9, earliestFinish: 11, latestStart: 9, latestFinish: 11, totalFloat: 0, critical: true },
    ],
  );
  assert.throws(() => calculateProjectNetwork([]));
  assert.throws(() => calculateProjectNetwork([{ id: "A", duration: 1, predecessorIds: ["X"] }]));
  assert.throws(() => calculateProjectNetwork([
    { id: "A", duration: 1, predecessorIds: ["B"] },
    { id: "B", duration: 1, predecessorIds: ["A"] },
  ]));
});

test("economic helpers apply explicit order, cent rounding, and validated formulas", () => {
  assert.deepEqual(calculateProcurementPrice({ listPriceNet: 1000, discountPercent: 10, cashDiscountPercent: 2, vatPercent: 19 }), {
    discountAmount: 100,
    discountedNet: 900,
    cashDiscountAmount: 18,
    payableNet: 882,
    vatAmount: 167.58,
    payableGross: 1049.58,
  });
  assert.equal(calculateTco({ acquisitionCost: 4000, oneTimeCosts: 600, annualOperatingCost: 900, years: 4 }), 8200);
  assert.equal(calculatePaybackMonths(12000, 9600), 15);
  assert.equal(calculateProfitabilityPercent(1500, 12000), 12.5);
  assert.equal(calculateWeightedUtility([{ weightPercent: 60, rating: 8 }, { weightPercent: 40, rating: 5 }]), 6.8);
  assert.throws(() => calculateProcurementPrice({ listPriceNet: 1000, discountPercent: 110, cashDiscountPercent: 2, vatPercent: 19 }));
  assert.throws(() => calculateTco({ acquisitionCost: 1, annualOperatingCost: 1, years: 0 }));
  assert.throws(() => calculatePaybackMonths(100, 0));
  assert.throws(() => calculateProfitabilityPercent(10, 0));
  assert.throws(() => calculateWeightedUtility([{ weightPercent: 60, rating: 8 }]));
});

test("Batch 26 completion quizzes use the shared randomized semantic-ID pipeline only", () => {
  const moduleSlugs = ["programmierung-und-pseudocode", "uml-und-datenmodellierung", "projektmanagement", "wirtschaftlichkeit-und-beschaffung"];
  for (const moduleSlug of moduleSlugs) {
    const quiz = quizzes.find((candidate) => candidate.moduleSlug === moduleSlug);
    assert.ok(quiz);
    assert.equal(quiz.questions.length, 12);
    assert.ok(quiz.questions.every((question) => question.id.startsWith(`${moduleSlug}:`)));
    assert.ok(quiz.questions.some((question) => question.type === "single-choice"));
    assert.ok(quiz.questions.some((question) => question.type === "multiple-selection"));
    const first = prepareModuleQuizAttempt(quiz, 11);
    const reload = prepareModuleQuizAttempt(quiz, 11);
    const second = prepareModuleQuizAttempt(quiz, 29);
    assert.deepEqual(first, reload);
    assert.notDeepEqual(first.questions.map((question) => question.id), second.questions.map((question) => question.id));
    assert.ok(first.questions.some((question) => {
      const canonical = quiz.questions.find((candidate) => candidate.id === question.id);
      return canonical && canonical.options.map((option) => option.id).join("|") !== question.options.map((option) => option.id).join("|");
    }));
  }
  const batchQuestions = questionBank.filter((question) => moduleSlugs.includes(question.moduleSlug));
  assert.equal(batchQuestions.length, 48);
  assert.ok(batchQuestions.every((question) => question.practiceEligible && question.completionEligible));
});

test("Batch 27 completion quizzes use the shared randomized semantic-ID pipeline only", () => {
  const moduleSlugs = ["software-und-lizenzierung", "virtualisierung-und-cloud", "kundenauftrag-kommunikation-und-vertraege", "qualitaetssicherung-und-uebergabe"];
  for (const moduleSlug of moduleSlugs) {
    const quiz = quizzes.find((candidate) => candidate.moduleSlug === moduleSlug);
    assert.ok(quiz);
    assert.equal(quiz.questions.length, 12);
    assert.ok(quiz.questions.every((question) => question.id.startsWith(`${moduleSlug}:`)));
    assert.ok(quiz.questions.some((question) => question.type === "single-choice"));
    assert.ok(quiz.questions.some((question) => question.type === "multiple-selection"));
    const first = prepareModuleQuizAttempt(quiz, 17);
    const reload = prepareModuleQuizAttempt(quiz, 17);
    const second = prepareModuleQuizAttempt(quiz, 41);
    assert.deepEqual(first, reload);
    assert.notDeepEqual(first.questions.map((question) => question.id), second.questions.map((question) => question.id));
    assert.ok(first.questions.some((question) => {
      const canonical = quiz.questions.find((candidate) => candidate.id === question.id);
      return canonical && canonical.options.map((option) => option.id).join("|") !== question.options.map((option) => option.id).join("|");
    }));
  }
  const batchQuestions = (questionBank as readonly { moduleSlug: string; practiceEligible: boolean; completionEligible: boolean }[]).filter((question) => moduleSlugs.includes(question.moduleSlug));
  assert.equal(batchQuestions.length, 48);
  assert.ok(batchQuestions.every((question) => question.practiceEligible && question.completionEligible));
});

test("Batch 27 content preserves required architecture boundaries and service audit scope", () => {
  const software = readFileSync(new URL("../src/app/components/learning/software-licensing-lessons.tsx", import.meta.url), "utf8");
  const virtualization = readFileSync(new URL("../src/app/components/learning/virtualization-cloud-lessons.tsx", import.meta.url), "utf8");
  const customer = readFileSync(new URL("../src/app/components/learning/customer-contract-lessons.tsx", import.meta.url), "utf8");
  const quality = readFileSync(new URL("../src/app/components/learning/quality-handover-lessons.tsx", import.meta.url), "utf8");
  assert.match(software, /Open Source bedeutet nicht rechtefrei oder automatisch kostenlos/);
  assert.match(software, /Lizenz ist Nutzungsrecht, nicht Eigentum/);
  assert.match(virtualization, /Container sind keine kleinen virtuellen Maschinen/);
  assert.match(virtualization, /Snapshots schützen nicht unabhängig[\s\S]*ersetzen getestete Backups nicht/);
  assert.match(virtualization, /Cloud ist weder automatisch sicher noch hochverfügbar/);
  assert.match(customer, /Reaktionszeit ist die Zeit bis zur vereinbarten Reaktion, nicht automatisch bis zur Lösung/);
  assert.match(customer, /Garantie ist eine zusätzliche freiwillige Zusage/);
  assert.match(quality, /Qualitätssicherung \(QA\)/);
  assert.match(quality, /Qualitätsmanagement \(QM\)/);
  assert.match(quality, /Technischer Test und formale Abnahme sind getrennt/);
  assert.match(quality, /bestehende Troubleshooting-Modul[\s\S]*organisatorischen Serviceprozess/);
  assert.match(quality, /Passwörter, private Schlüssel und Tokens gehören nicht als Klartext/);
});
