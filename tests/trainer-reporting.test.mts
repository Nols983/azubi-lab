import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { learningModules } from "../src/app/data/learning-modules.ts";
import { getQuizForModule } from "../src/app/data/quizzes.ts";
import { learnerDetailSectionHref, parseLearnerDetailSection } from "../src/app/lib/admin-navigation.ts";
import { canViewLearnerProgress } from "../src/app/lib/authorization.ts";
import {
  createEmptyLearnerProgressState,
  recordQuizAttempt,
  setLessonCompleted,
  type LearnerProgressState,
} from "../src/app/lib/learner-progress.ts";
import type { LearnerAccountRecord } from "../src/app/lib/server/admin-repository.ts";
import type { ChallengeAssignment } from "../src/app/lib/server/challenge-assignment-repository.ts";
import type { CurriculumAssignmentRecord } from "../src/app/lib/server/curriculum-assignment-repository.ts";
import type { TrainerLabAggregateRecord } from "../src/app/lib/server/trainer-lab-reporting-repository.ts";
import {
  buildTrainerReportingSnapshot,
  filterTrainerLearnerReports,
  parseTrainerOverviewFilters,
  type TrainerLearnerFacts,
} from "../src/app/lib/trainer-reporting.ts";

const now = new Date("2026-09-21T12:00:00.000Z");
const labDefinitions = [
  { id: "dns-client-001", title: "DNS-Client", category: "DNS" },
  { id: "gateway-client-001", title: "Gateway-Client", category: "IPv4 und Routing" },
];

test("trainer reporting capability allows instructor/admin and denies learner/observer", () => {
  assert.equal(canViewLearnerProgress("learner"), false);
  assert.equal(canViewLearnerProgress("observer"), false);
  assert.equal(canViewLearnerProgress("instructor"), true);
  assert.equal(canViewLearnerProgress("admin"), true);
});

test("empty trainer reporting remains canonical and produces neutral empty states", () => {
  const report = snapshot({ learners: [], states: new Map() });
  assert.equal(report.learnerReports.length, 0);
  assert.equal(report.curriculumModules.length, learningModules.length);
  assert.deepEqual(report.counts.learners, { total: 0, withoutActivity: 0, active: 0, withCompletedModules: 0, disabled: 0 });
  assert.deepEqual(report.counts.labs, { canonicalTotal: 2, attempted: 0, completed: 0, active: 0, supportSuggested: 0, completedRecently: 0 });
});

test("empty learner summary keeps canonical totals and never fabricates activity", () => {
  const empty = learner("00000000-0000-4000-8000-000000000099", "Leeres Lernkonto");
  const report = snapshot({ learners: [empty], states: new Map() }).learnerReports[0];
  assert.deepEqual(report.summary.modules, { completed: 0, total: learningModules.length });
  assert.deepEqual(report.summary.normalLabs, { completed: 0, total: labDefinitions.length });
  assert.equal(report.summary.moduleQuizzesAttempted, 0);
  assert.equal(report.summary.practice.completedQuizCount, 0);
  assert.equal(report.summary.practice.accuracyPercentage, null);
  assert.equal(report.summary.progression.totalXp, 0);
  assert.equal(report.summary.progression.level, 1);
  assert.equal(report.summary.latestActivity, null);
  assert.deepEqual(report.activity, []);
});

test("learner summaries sort neutrally by name, login and id rather than progression", () => {
  const zeta = learner("00000000-0000-4000-8000-000000000090", "Zeta");
  const alphaB = { ...learner("00000000-0000-4000-8000-000000000092", "Alpha"), login: "alpha-b" };
  const alphaASecond = { ...learner("00000000-0000-4000-8000-000000000093", "Alpha"), login: "alpha-a" };
  const alphaAFirst = { ...learner("00000000-0000-4000-8000-000000000091", "Alpha"), login: "alpha-a" };
  const learnerFacts = [
    facts(zeta.id, { totalXp: 50_000 }),
    facts(alphaB.id, { totalXp: 20_000 }),
    facts(alphaASecond.id, { totalXp: 10_000 }),
    facts(alphaAFirst.id, { totalXp: 0 }),
  ];
  const report = snapshot({ learners: [zeta, alphaB, alphaASecond, alphaAFirst], states: new Map(), learnerFacts });
  assert.deepEqual(report.learnerReports.map((item) => item.learner.id), [alphaAFirst.id, alphaASecond.id, alphaB.id, zeta.id]);
});

test("summary derives canonical XP, Level, practice facts and the latest trustworthy learner event", () => {
  const first = learner("00000000-0000-4000-8000-000000000080", "Aktive Person");
  const state = setLessonCompleted(createEmptyLearnerProgressState(), "ipv4-grundlagen", "was-ist-eine-ip-adresse", true, true, "2026-09-21T09:00:00.000Z");
  const report = snapshot({
    learners: [first],
    states: new Map([[first.id, state]]),
    learnerFacts: [facts(first.id, {
      totalXp: 1420,
      completedPracticeQuizCount: 3,
      answeredPracticeQuestionCount: 45,
      correctPracticeQuestionCount: 33,
      latestPracticeQuizAt: new Date("2026-09-21T10:00:00.000Z"),
    })],
    labAggregates: [aggregate(first.id, "dns-client-001", { latestActivityAt: new Date("2026-09-21T11:00:00.000Z") })],
  }).learnerReports[0];
  assert.equal(report.summary.progression.totalXp, 1420);
  assert.equal(report.summary.progression.level, 7);
  assert.equal(report.summary.practice.accuracyPercentage, 73);
  assert.equal(report.summary.latestActivity?.kind, "lab");
  assert.equal(report.summary.latestActivity?.timestamp.toISOString(), "2026-09-21T11:00:00.000Z");
  assert.match(report.summary.latestActivity?.label ?? "", /DNS-Client/);
});

test("substantially completed learner uses the complete canonical module catalogue", () => {
  const completed = learner("00000000-0000-4000-8000-000000000081", "Curriculum erledigt");
  const report = snapshot({ learners: [completed], states: new Map([[completed.id, completedCurriculumState()]]) }).learnerReports[0];
  assert.deepEqual(report.summary.modules, { completed: learningModules.length, total: learningModules.length });
  assert.equal(report.progress.overall.percentage, 100);
});

test("skill matrix states come from canonical module progress for none, partial and completed", () => {
  const learners = [learner("00000000-0000-4000-8000-000000000001", "Ohne Fortschritt"), learner("00000000-0000-4000-8000-000000000002", "In Arbeit"), learner("00000000-0000-4000-8000-000000000003", "Modul erledigt")];
  const states = new Map<string, LearnerProgressState>([
    [learners[0].id, createEmptyLearnerProgressState()],
    [learners[1].id, setLessonCompleted(createEmptyLearnerProgressState(), "ipv4-grundlagen", "was-ist-eine-ip-adresse", true, true, now.toISOString())],
    [learners[2].id, completedIpv4State()],
  ]);
  const report = snapshot({ learners, states });
  const ipv4States = report.learnerReports.map((learnerReport) => learnerReport.progress.modules.find((module) => module.slug === "ipv4-grundlagen")?.summary.status);
  assert.deepEqual(report.learnerReports.map((item) => item.learner.displayName), ["In Arbeit", "Modul erledigt", "Ohne Fortschritt"]);
  assert.deepEqual(ipv4States, ["in-progress", "completed", "not-started"]);
  assert.deepEqual(report.curriculumModules.map((module) => module.module.slug), learningModules.map((module) => module.slug));
  assert.equal("skillScore" in report.learnerReports[1].progress.modules[0], false);

  const completedOnly = filterTrainerLearnerReports(report.learnerReports, parseTrainerOverviewFilters({ moduleSlug: "ipv4-grundlagen", status: "completed" }));
  assert.deepEqual(completedOnly.map((item) => item.learner.id), [learners[2].id]);
  const searched = filterTrainerLearnerReports(report.learnerReports, parseTrainerOverviewFilters({ query: "in-arbeit" }));
  assert.deepEqual(searched.map((item) => item.learner.id), [learners[1].id]);
});

test("lab support signals use persisted runs and hints without competitive scoring", () => {
  const first = learner("00000000-0000-4000-8000-000000000010", "Lab Learner");
  const labAggregates: TrainerLabAggregateRecord[] = [
    aggregate(first.id, "dns-client-001", { runCount: 3, hintCount: 2, activeAttemptCount: 1 }),
    aggregate(first.id, "gateway-client-001", { completedAttemptCount: 1, latestCompletedAt: new Date("2026-09-20T10:00:00.000Z") }),
  ];
  const report = snapshot({ learners: [first], states: new Map(), labAggregates });
  const learnerReport = report.learnerReports[0];
  assert.deepEqual(learnerReport.labCounts, { canonicalTotal: 2, attempted: 2, completed: 1, active: 1, supportSuggested: 1, completedRecently: 1 });
  assert.deepEqual(learnerReport.labs[0].signals, ["Noch nicht abgeschlossen", "Mehrere Versuche", "Hinweise verwendet", "Unterstützung könnte hilfreich sein"]);
  assert.equal("score" in learnerReport.labs[0], false);
  assert.equal(report.attention.some((item) => item.kind === "lab-support"), true);
  const supportOnly = filterTrainerLearnerReports(report.learnerReports, parseTrainerOverviewFilters({ focus: "lab-support" }));
  assert.deepEqual(supportOnly.map((item) => item.learner.id), [first.id]);
});

function completedCurriculumState() {
  let state = createEmptyLearnerProgressState();
  for (const learningModule of learningModules) {
    for (const lesson of learningModule.lessons ?? []) {
      if (lesson.status === "available") state = setLessonCompleted(state, learningModule.slug, lesson.slug, true, true, now.toISOString());
    }
    const quiz = getQuizForModule(learningModule.slug);
    if (quiz) state = recordQuizAttempt(state, learningModule.slug, quiz.questions.length, quiz.questions.length, now.toISOString());
  }
  return state;
}

function facts(learnerId: string, overrides: Partial<TrainerLearnerFacts> = {}): TrainerLearnerFacts {
  return { learnerId, totalXp: 0, completedPracticeQuizCount: 0, answeredPracticeQuestionCount: 0, correctPracticeQuestionCount: 0, latestPracticeQuizAt: null, ...overrides };
}

test("challenge and curriculum states remain separate support signals", () => {
  const first = learner("00000000-0000-4000-8000-000000000020", "Assigned Learner");
  const state = setLessonCompleted(createEmptyLearnerProgressState(), "dns", "was-ist-dns", true, true, now.toISOString());
  const report = buildTrainerReportingSnapshot({
    learners: [first],
    states: new Map([[first.id, state]]),
    planningRecords: [curriculum(first.id)],
    challengeAssignments: [challenge(first)],
    labDefinitions,
    now,
  });
  assert.equal(report.learnerReports[0].planning[0].status, "in-progress");
  assert.equal(report.learnerReports[0].challengeCounts.submitted, 1);
  assert.equal(report.counts.challenges.pendingReview, 1);
  assert.deepEqual(report.learnerReports[0].summary.challenges, { completed: 0, open: 1 });
  assert.deepEqual(report.learnerReports[0].summary.planning, { active: 1, overdue: 0 });
  assert.equal(report.learnerReports[0].activity.some((item) => item.kind === "challenge"), true);
  assert.equal(report.attention.some((item) => item.kind === "challenge-review"), true);
});

test("learner detail section selection is stable and deep-linkable", () => {
  assert.equal(parseLearnerDetailSection(undefined), "overview");
  assert.equal(parseLearnerDetailSection("learning"), "learning");
  assert.equal(parseLearnerDetailSection(["labs", "activity"]), "labs");
  assert.equal(parseLearnerDetailSection("unknown"), "overview");
  assert.equal(learnerDetailSectionHref("learner id", "overview"), "/admin/lernende/learner%20id");
  assert.equal(learnerDetailSectionHref("learner id", "activity"), "/admin/lernende/learner%20id?section=activity");
});

test("focused admin surfaces authorize before reporting and keep the dashboard compact", async () => {
  const service = await readFile(new URL("../src/app/lib/server/trainer-reporting-service.ts", import.meta.url), "utf8");
  const detailService = await readFile(new URL("../src/app/lib/server/admin-service.ts", import.meta.url), "utf8");
  const labRepository = await readFile(new URL("../src/app/lib/server/trainer-lab-reporting-repository.ts", import.meta.url), "utf8");
  const dashboardPage = await readFile(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
  const learnerPage = await readFile(new URL("../src/app/admin/lernende/page.tsx", import.meta.url), "utf8");
  const matrixPage = await readFile(new URL("../src/app/admin/skill-matrix/page.tsx", import.meta.url), "utf8");
  const summaryRepository = await readFile(new URL("../src/app/lib/server/trainer-learner-summary-repository.ts", import.meta.url), "utf8");
  const detailPage = await readFile(new URL("../src/app/admin/lernende/[userId]/page.tsx", import.meta.url), "utf8");
  assert.ok(service.indexOf('requireCapability("viewLearnerProgress")') < service.indexOf("listLearnerAccounts()"));
  assert.ok(detailService.indexOf('requireCapability("viewLearnerProgress")') < detailService.indexOf("isUuid(userId)"));
  assert.ok(dashboardPage.indexOf('getTrainerPageAccess("/admin")') < dashboardPage.indexOf("getAdminDashboardData()"));
  assert.ok(learnerPage.indexOf('getTrainerPageAccess("/admin/lernende")') < learnerPage.indexOf("getAdminDashboardData()"));
  assert.ok(matrixPage.indexOf('getTrainerPageAccess("/admin/skill-matrix")') < matrixPage.indexOf("getAdminDashboardData()"));
  assert.match(dashboardPage, /href="\/admin\/lernende"/);
  assert.match(dashboardPage, /href="\/admin\/skill-matrix"/);
  assert.match(dashboardPage, /href="\/admin\/lernende\?focus=curriculum-active"/);
  assert.doesNotMatch(dashboardPage, /TrainerSkillMatrix|<table/);
  assert.match(learnerPage, /filterTrainerLearnerReports\(dashboard\.learnerReports/);
  assert.match(learnerPage, /summary\.normalLabs/);
  assert.match(learnerPage, /summary\.latestActivity/);
  assert.match(matrixPage, /<TrainerSkillMatrix reports=\{reports\} modules=\{modules\}/);
  const detailLookup = detailService.indexOf("findLearnerAccountById(userId)");
  const detailFanOut = detailService.indexOf("Promise.all([");
  assert.ok(detailService.indexOf("isUuid(userId)") < detailLookup);
  assert.ok(detailLookup < detailFanOut);
  assert.ok(detailPage.indexOf("getTrainerPageAccess(callbackUrl)") < detailPage.indexOf("getAdminLearnerDetail(userId)"));
  assert.match(detailPage, /parseLearnerDetailSection\(rawSearchParams\.section\)/);
  assert.match(detailPage, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(detailPage, /section === "overview" && <OverviewSection/);
  assert.match(detailPage, /section === "learning" && <LearningSection/);
  assert.match(detailPage, /section === "practice" && <PracticeSection/);
  assert.match(detailPage, /section === "labs" && <LabsSection/);
  assert.match(detailPage, /section === "progression" && <ProgressionSection/);
  assert.match(detailPage, /section === "activity" && <ActivitySection/);
  assert.match(detailPage, /<summary[^>]*>Kontodaten<\/summary>/);
  assert.match(detailPage, /<summary[^>]*>\+ Module zuweisen<\/summary>/);
  assert.match(detailPage, /<summary[^>]*>Zuweisung bearbeiten<\/summary>/);
  assert.doesNotMatch(detailPage, /Read-only Reporting|Deskriptiv statt kompetitiv|Kanonische Berechnung|Persistierte Lernversuche|Planung getrennt vom Fortschritt/);
  assert.match(labRepository, /attempt\.mode = 'learner'/);
  assert.doesNotMatch(labRepository, /state_json|command_text|event\.summary/);
  assert.ok(service.indexOf("readTrainerLearnerFactsForLearners(learnerIds)") > service.indexOf('requireCapability("viewLearnerProgress")'));
  assert.match(labRepository, /WHERE attempt\.user_id = ANY\(\$1::uuid\[\]\)/);
  assert.doesNotMatch(dashboardPage, /mustChangePassword|Passwortwechsel erforderlich/);
  assert.match(labRepository, /event\.created_at/);
  assert.match(labRepository, /attempt\.started_at/);
  assert.match(labRepository, /attempt\.completed_at/);
  assert.doesNotMatch(labRepository, /attempt\.updated_at/);
  assert.match(service, /definition\.kind === "troubleshooting"/);
  assert.match(summaryRepository, /xp_events/);
  assert.match(summaryRepository, /attempt\.status = 'completed'/);
  assert.doesNotMatch(summaryRepository, /state_json|command_text|grading_snapshot|render_snapshot/);
  assert.doesNotMatch(detailPage, /mustChangePassword|LearnerAccountActions|Passwort zurücksetzen/);
});

function snapshot(input: {
  learners: readonly LearnerAccountRecord[];
  states: ReadonlyMap<string, LearnerProgressState>;
  labAggregates?: readonly TrainerLabAggregateRecord[];
  learnerFacts?: readonly TrainerLearnerFacts[];
}) {
  return buildTrainerReportingSnapshot({
    ...input,
    planningRecords: [],
    challengeAssignments: [],
    labDefinitions,
    now,
  });
}

function learner(id: string, displayName: string): LearnerAccountRecord {
  return { id, displayName, login: displayName.toLocaleLowerCase("de").replaceAll(" ", "-"), role: "learner", mustChangePassword: false, disabledAt: null, createdAt: now };
}

function completedIpv4State() {
  const learningModule = learningModules.find((item) => item.slug === "ipv4-grundlagen");
  const quiz = getQuizForModule("ipv4-grundlagen");
  assert.ok(learningModule?.lessons && quiz);
  let state = createEmptyLearnerProgressState();
  for (const lesson of learningModule.lessons) state = setLessonCompleted(state, learningModule.slug, lesson.slug, true, true, now.toISOString());
  return recordQuizAttempt(state, learningModule.slug, quiz.questions.length, quiz.questions.length, now.toISOString());
}

function aggregate(learnerId: string, labId: string, overrides: Partial<TrainerLabAggregateRecord>): TrainerLabAggregateRecord {
  return {
    learnerId,
    labId,
    runCount: 1,
    hintCount: 0,
    completedAttemptCount: 0,
    activeAttemptCount: 0,
    latestActivityAt: new Date("2026-09-20T09:00:00.000Z"),
    latestCompletedAt: null,
    ...overrides,
  };
}

function curriculum(learnerId: string): CurriculumAssignmentRecord {
  return { id: "assignment-1", learnerId, moduleSlug: "dns", assignedBy: { id: "trainer-1", displayName: "Trainer" }, assignedAt: new Date("2026-09-01T10:00:00.000Z"), targetAt: new Date("2026-09-25T10:00:00.000Z"), note: null, archivedAt: null, updatedAt: new Date("2026-09-01T10:00:00.000Z") };
}

function challenge(target: LearnerAccountRecord): ChallengeAssignment {
  return {
    id: "challenge-assignment-1",
    challenge: { id: "challenge-1", title: "DNS prüfen", shortDescription: "DNS diagnostizieren", instructions: "Diagnose dokumentieren", difficulty: "medium", estimatedMinutes: 30, definitionStatus: "published" },
    learner: { id: target.id, displayName: target.displayName, login: target.login, disabled: false },
    assignedBy: { id: "trainer-1", displayName: "Trainer" },
    assignedAt: new Date("2026-09-10T10:00:00.000Z"),
    dueAt: new Date("2026-09-30T10:00:00.000Z"),
    startedAt: new Date("2026-09-11T10:00:00.000Z"),
    legacyCompletedAt: null,
    approvedAt: null,
    status: "submitted",
    isOverdue: false,
    latestSubmission: { id: "submission-1", submissionNumber: 1, submittedAt: new Date("2026-09-20T10:00:00.000Z"), submittedAfterDue: false, review: null },
  };
}
