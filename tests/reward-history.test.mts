import assert from "node:assert/strict";
import test from "node:test";
import {
  countCanonicalLearningDates,
  deriveRewardUnlockDates,
  formatRewardUnlockDate,
  type RewardHistory,
} from "../src/app/lib/reward-history.ts";
import { BATCH_28_2_MODULE_IDS } from "../src/app/lib/progression-rewards.ts";
import { deriveTimeAchievementUnlockDates } from "../src/app/lib/time-achievements.ts";
import { getAchievementTimeParts, getLogicalTimeWindow } from "../src/app/lib/time-of-day.ts";

function history(overrides: Partial<RewardHistory> = {}): RewardHistory {
  return {
    xpEvents: [],
    labCompletions: [],
    moduleCompletions: [],
    quizCompletions: [],
    lessonCompletions: [],
    normalLabCount: 16,
    ...overrides,
  };
}

test("level title dates use the first cumulative XP threshold crossing with stable equal-time ordering", () => {
  const events = [
    { id: "00000000-0000-0000-0000-000000000001", xpAmount: 200, awardedAt: "2026-09-20T10:00:00.000Z" },
    { id: "00000000-0000-0000-0000-000000000003", xpAmount: 25, awardedAt: "2026-09-21T10:00:00.000Z" },
    { id: "00000000-0000-0000-0000-000000000002", xpAmount: 25, awardedAt: "2026-09-21T10:00:00.000Z" },
  ];
  const dates = deriveRewardUnlockDates(history({ xpEvents: [...events].reverse() }));
  assert.equal(dates["level-packet-scout"], "2026-09-21T10:00:00.000Z");
  assert.deepEqual(
    deriveRewardUnlockDates(history({ xpEvents: events })),
    deriveRewardUnlockDates(history({ xpEvents: [...events].reverse() })),
  );
  assert.equal(dates["level-systemstarter"], undefined);
});

test("Europe/Berlin classification uses the exact half-open achievement boundaries", () => {
  const cases = [
    ["2026-01-15T04:59:59+01:00", "NIGHT"],
    ["2026-01-15T05:00:00+01:00", "MORNING"],
    ["2026-01-15T09:59:59+01:00", "MORNING"],
    ["2026-01-15T10:00:00+01:00", "DAY"],
    ["2026-01-15T17:59:59+01:00", "DAY"],
    ["2026-01-15T18:00:00+01:00", "EVENING"],
    ["2026-01-15T22:59:59+01:00", "EVENING"],
    ["2026-01-15T23:00:00+01:00", "NIGHT"],
  ] as const;
  for (const [timestamp, expected] of cases) {
    const parts = getAchievementTimeParts(timestamp);
    assert.ok(parts);
    assert.equal(getLogicalTimeWindow(parts).period, expected, timestamp);
  }
});

test("one logical night crosses midnight, ends at 05:00 and does not merge consecutive nights", () => {
  const sharedNight = deriveTimeAchievementUnlockDates([
    lesson("a", "2026-09-30T23:40:00+02:00"),
    lesson("b", "2026-10-01T00:20:00+02:00"),
    lesson("c", "2026-10-01T04:50:00+02:00"),
    lesson("morning", "2026-10-01T05:00:00+02:00"),
  ]);
  assert.equal(sharedNight["badge-nachteule"], "2026-10-01T02:50:00.000Z");

  const endsAtFive = deriveTimeAchievementUnlockDates([
    lesson("a", "2026-09-30T23:10:00+02:00"),
    lesson("b", "2026-10-01T00:30:00+02:00"),
    lesson("c", "2026-10-01T05:00:00+02:00"),
  ]);
  assert.equal(endsAtFive["badge-nachteule"], undefined);

  const separateNights = deriveTimeAchievementUnlockDates([
    lesson("a", "2026-09-30T23:40:00+02:00"),
    lesson("b", "2026-10-01T01:20:00+02:00"),
    lesson("c", "2026-10-01T23:40:00+02:00"),
  ]);
  assert.equal(separateNights["badge-nachteule"], undefined);
});

test("distinct first lesson completions qualify while replays and separate window instances do not accumulate", () => {
  const replayed = deriveTimeAchievementUnlockDates([
    lesson("module-a/lesson-a", "2026-10-01T14:00:00+02:00"),
    lesson("module-a/lesson-a", "2026-10-01T23:30:00+02:00"),
    lesson("module-a/lesson-b", "2026-10-01T23:40:00+02:00"),
    lesson("module-b/lesson-c", "2026-10-02T00:10:00+02:00"),
  ]);
  assert.equal(replayed["badge-nachteule"], undefined);

  const splitMornings = deriveTimeAchievementUnlockDates([
    lesson("a", "2026-10-01T08:00:00+02:00"),
    lesson("b", "2026-10-01T09:00:00+02:00"),
    lesson("c", "2026-10-02T08:00:00+02:00"),
    lesson("d", "2026-10-03T06:00:00+02:00"),
    lesson("e", "2026-10-03T07:00:00+02:00"),
    lesson("f", "2026-10-03T08:00:00+02:00"),
  ]);
  assert.equal(splitMornings["badge-fruehstarter"], "2026-10-03T06:00:00.000Z");

  const onlySeparateWindows = deriveTimeAchievementUnlockDates([
    lesson("a", "2026-10-01T08:00:00+02:00"),
    lesson("b", "2026-10-01T09:00:00+02:00"),
    lesson("c", "2026-10-02T08:00:00+02:00"),
  ]);
  assert.equal(onlySeparateWindows["badge-fruehstarter"], undefined);
});

test("all four lifetime badges derive independently at the third canonical lesson timestamp", () => {
  const dates = deriveTimeAchievementUnlockDates([
    lesson("m3", "2026-10-01T09:15:00+02:00"), lesson("m1", "2026-10-01T05:15:00+02:00"), lesson("m2", "2026-10-01T08:15:00+02:00"),
    lesson("d1", "2026-10-01T10:15:00+02:00"), lesson("d2", "2026-10-01T12:15:00+02:00"), lesson("d3", "2026-10-01T17:15:00+02:00"),
    lesson("e1", "2026-10-01T18:15:00+02:00"), lesson("e2", "2026-10-01T20:15:00+02:00"), lesson("e3", "2026-10-01T22:15:00+02:00"),
    lesson("n1", "2026-10-01T23:15:00+02:00"), lesson("n2", "2026-10-02T01:15:00+02:00"), lesson("n3", "2026-10-02T04:15:00+02:00"),
  ]);
  assert.deepEqual(dates, {
    "badge-fruehstarter": "2026-10-01T07:15:00.000Z",
    "badge-tagesform": "2026-10-01T15:15:00.000Z",
    "badge-feierabend-fokus": "2026-10-01T20:15:00.000Z",
    "badge-nachteule": "2026-10-02T02:15:00.000Z",
  });
  assert.equal(deriveRewardUnlockDates(history({ lessonCompletions: [
    lesson("a", "2026-10-01T10:00:00+02:00"),
    lesson("b", "2026-10-01T11:00:00+02:00"),
    lesson("c", "2026-10-01T12:00:00+02:00"),
  ] }))["badge-tagesform"], "2026-10-01T10:00:00.000Z");

  const equalTime = [lesson("z", "2026-10-01T12:00:00+02:00"), lesson("a", "2026-10-01T12:00:00+02:00"), lesson("m", "2026-10-01T12:00:00+02:00")];
  assert.deepEqual(deriveTimeAchievementUnlockDates(equalTime), deriveTimeAchievementUnlockDates([...equalTime].reverse()));
});

test("CET/CEST missing and repeated hours keep Berlin night grouping without duplicate lesson counts", () => {
  const spring = deriveTimeAchievementUnlockDates([
    lesson("a", "2026-03-28T23:30:00+01:00"),
    lesson("b", "2026-03-29T01:30:00+01:00"),
    lesson("c", "2026-03-29T03:30:00+02:00"),
  ]);
  assert.equal(spring["badge-nachteule"], "2026-03-29T01:30:00.000Z");

  const autumn = deriveTimeAchievementUnlockDates([
    lesson("a", "2026-10-24T23:30:00+02:00"),
    lesson("b", "2026-10-25T02:30:00+02:00"),
    lesson("b", "2026-10-25T02:30:00+01:00"),
    lesson("c", "2026-10-25T02:30:00+01:00"),
  ]);
  assert.equal(autumn["badge-nachteule"], "2026-10-25T01:30:00.000Z");
});

function lesson(lessonId: string, completedAt: string) {
  return { lessonId, completedAt };
}

test("lab count, no-hint and multi-fault dates use immutable first completions", () => {
  const labs = Array.from({ length: 10 }, (_, index) => ({
    labId: `lab-${String(index + 1).padStart(2, "0")}`,
    uniqueHintsUsed: index < 5 ? 0 : 1,
    firstCompletedAt: `2026-09-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
  }));
  labs[7] = { ...labs[7], labId: "client-multifault-001" };
  labs[9] = { ...labs[9], labId: "vlan-firewall-multifault-001" };
  const dates = deriveRewardUnlockDates(history({ labCompletions: [...labs].reverse(), normalLabCount: 10 }));
  assert.equal(dates["badge-lab-einsteiger"], "2026-09-01T10:00:00.000Z");
  assert.equal(dates["badge-lab-erfahren"], "2026-09-05T10:00:00.000Z");
  assert.equal(dates["achievement-lab-retter"], "2026-09-10T10:00:00.000Z");
  assert.equal(dates["badge-ohne-hilfe"], "2026-09-05T10:00:00.000Z");
  assert.equal(dates["badge-eigenstaendig"], undefined);
  assert.equal(dates["badge-selbststaendig"], undefined);
  assert.equal(dates["achievement-fehlerjaeger"], "2026-09-10T10:00:00.000Z");
  assert.equal(dates["badge-multi-fault"], "2026-09-10T10:00:00.000Z");
  assert.equal(dates["badge-lab-meister"], "2026-09-10T10:00:00.000Z");
});

test("module composites use the final trustworthy canonical completion and omit unreliable dates", () => {
  const moduleCompletions = [
    { moduleId: "ipv4-grundlagen", completedAt: "2026-09-20T10:00:00.000Z" },
    { moduleId: "subnetting", completedAt: "2026-09-21T10:00:00.000Z" },
    { moduleId: "dhcp", completedAt: "2026-09-22T10:00:00.000Z" },
    { moduleId: "dns", completedAt: "2026-09-24T10:00:00.000Z" },
    { moduleId: "backup-datensicherung", completedAt: "2026-09-23T10:00:00.000Z" },
  ];
  const dates = deriveRewardUnlockDates(history({ moduleCompletions }));
  assert.equal(dates["badge-erste-schritte"], "2026-09-20T10:00:00.000Z");
  assert.equal(dates["achievement-dns-debugger"], "2026-09-24T10:00:00.000Z");
  assert.equal(dates["badge-netzwerk-fundament"], "2026-09-24T10:00:00.000Z");
  assert.equal(dates["achievement-backup-waechter"], "2026-09-23T10:00:00.000Z");
  assert.equal(dates["badge-backup-waechter"], "2026-09-23T10:00:00.000Z");
  assert.equal(dates["badge-quiz-profi"], undefined);
});

test("missing or incomplete history never creates a fake unlock date", () => {
  const dates = deriveRewardUnlockDates(history({
    xpEvents: [{ id: "a", xpAmount: 249, awardedAt: "2026-09-24T10:00:00.000Z" }],
    moduleCompletions: [
      { moduleId: "ipv4-grundlagen", completedAt: "2026-09-20T10:00:00.000Z" },
      { moduleId: "subnetting", completedAt: "invalid" },
    ],
  }));
  assert.equal(dates["level-packet-scout"], undefined);
  assert.equal(dates["badge-netzwerk-fundament"], undefined);
  assert.equal(dates["achievement-fehlerjaeger"], undefined);
  assert.equal(formatRewardUnlockDate("invalid"), undefined);
  assert.equal(formatRewardUnlockDate("2026-09-24T10:00:00.000Z"), "24.09.2026");
});

test("new lifetime thresholds count distinct canonical evidence and use the qualifying event", () => {
  const moduleCompletions = Array.from({ length: 13 }, (_, index) => ({
    moduleId: `module-${index + 1}`,
    completedAt: isoAt(index + 1),
  }));
  const quizCompletions = Array.from({ length: 10 }, (_, index) => ({
    moduleId: `module-${index + 1}`,
    completedAt: isoAt(index + 31),
  }));
  const lessonCompletions = Array.from({ length: 100 }, (_, index) => ({
    lessonId: `module-${(index % 5) + 1}/lesson-${index + 1}`,
    completedAt: isoAt(index + 61),
  }));
  const dates = deriveRewardUnlockDates(history({ moduleCompletions, quizCompletions, lessonCompletions }));
  assert.equal(dates["badge-fuenferpack"], isoAt(5));
  assert.equal(dates["badge-wissenssammler"], isoAt(10));
  assert.equal(dates["badge-halbzeit"], isoAt(13));
  assert.equal(dates["badge-quizmarathon"], isoAt(40));
  assert.equal(dates["badge-querbeet"], isoAt(65));
  assert.equal(dates["badge-langstrecke"], isoAt(160));

  const replayed = deriveRewardUnlockDates(history({
    moduleCompletions: Array.from({ length: 13 }, (_, index) => ({ moduleId: "one", completedAt: isoAt(index + 1) })),
    quizCompletions: Array.from({ length: 10 }, (_, index) => ({ moduleId: "one", completedAt: isoAt(index + 31) })),
    lessonCompletions: Array.from({ length: 100 }, (_, index) => ({ lessonId: "one/same", completedAt: isoAt(index + 61) })),
  }));
  for (const id of ["badge-fuenferpack", "badge-halbzeit", "badge-quizmarathon", "badge-querbeet", "badge-langstrecke"]) {
    assert.equal(replayed[id], undefined, id);
  }
});

test("Ausdauer counts Berlin calendar dates once and unlocks on the 30th distinct date", () => {
  const firstTwentyNine = Array.from({ length: 29 }, (_, index) => ({
    lessonId: `m/lesson-${index + 1}`,
    completedAt: new Date(Date.UTC(2026, 0, index + 1, 12)).toISOString(),
  }));
  const thirtieth = "2026-03-29T00:30:00.000Z";
  const lessons = [
    ...firstTwentyNine,
    { lessonId: "m/spring-before", completedAt: thirtieth },
    { lessonId: "m/spring-after", completedAt: "2026-03-29T01:30:00.000Z" },
  ];
  assert.equal(countCanonicalLearningDates(firstTwentyNine), 29);
  assert.equal(countCanonicalLearningDates(lessons), 30);
  assert.equal(deriveRewardUnlockDates(history({ lessonCompletions: lessons }))["badge-ausdauer"], thirtieth);
});

test("Ausdauer handles repeated DST fall hours as one Berlin date", () => {
  const completions = [
    { lessonId: "m/a", completedAt: "2026-10-25T00:30:00.000Z" },
    { lessonId: "m/b", completedAt: "2026-10-25T01:30:00.000Z" },
    { lessonId: "m/c", completedAt: "2026-10-26T01:30:00.000Z" },
  ];
  assert.equal(countCanonicalLearningDates(completions), 2);
});

test("Rund um die Uhr unlocks only with all four canonical badges at the latest prerequisite", () => {
  const threeWindows = [
    lesson("m1", "2026-10-01T05:00:00+02:00"), lesson("m2", "2026-10-01T06:00:00+02:00"), lesson("m3", "2026-10-01T07:00:00+02:00"),
    lesson("d1", "2026-10-01T10:00:00+02:00"), lesson("d2", "2026-10-01T11:00:00+02:00"), lesson("d3", "2026-10-01T12:00:00+02:00"),
    lesson("e1", "2026-10-01T18:00:00+02:00"), lesson("e2", "2026-10-01T19:00:00+02:00"), lesson("e3", "2026-10-01T20:00:00+02:00"),
  ];
  assert.equal(deriveRewardUnlockDates(history({ lessonCompletions: threeWindows }))["badge-rund-um-die-uhr"], undefined);
  const allWindows = [
    ...threeWindows,
    lesson("n1", "2026-10-01T23:00:00+02:00"), lesson("n2", "2026-10-02T00:00:00+02:00"), lesson("n3", "2026-10-02T04:00:00+02:00"),
  ];
  assert.equal(deriveRewardUnlockDates(history({ lessonCompletions: allWindows }))["badge-rund-um-die-uhr"], "2026-10-02T02:00:00.000Z");
});

test("fixed curriculum rewards ignore future modules and use the last fixed prerequisite", () => {
  const moduleCompletions = BATCH_28_2_MODULE_IDS.map((moduleId, index) => ({ moduleId, completedAt: isoAt(index + 1) }));
  const quizCompletions = BATCH_28_2_MODULE_IDS.map((moduleId, index) => ({ moduleId, completedAt: isoAt(index + 101) }));
  const dates = deriveRewardUnlockDates(history({
    moduleCompletions: [...moduleCompletions, { moduleId: "future-module", completedAt: isoAt(999) }],
    quizCompletions: [...quizCompletions, { moduleId: "future-module", completedAt: isoAt(999) }],
  }));
  assert.equal(dates["badge-systemmeister"], isoAt(25));
  assert.equal(dates["badge-wissenssammler"], isoAt(10));
  assert.equal(dates["badge-lernprofi"], isoAt(20));
  assert.equal(dates["badge-perfektionist"], isoAt(125));
  assert.equal(dates["badge-quiz-profi"], undefined);
  assert.equal(dates["badge-quiz-experte"], undefined);
  assert.equal(dates["badge-quiz-meister"], undefined);
});

test("the 15th immutable hint-free Lab completion provides the Gold family date", () => {
  const labs = Array.from({ length: 15 }, (_, index) => ({
    labId: `lab-${index + 1}`,
    uniqueHintsUsed: 0,
    firstCompletedAt: isoAt(index + 1),
  }));
  const dates = deriveRewardUnlockDates(history({ labCompletions: [...labs].reverse() }));
  assert.equal(dates["badge-ohne-hilfe"], isoAt(5));
  assert.equal(dates["badge-eigenstaendig"], isoAt(10));
  assert.equal(dates["badge-selbststaendig"], isoAt(15));
});

function isoAt(index: number) {
  return new Date(Date.UTC(2020, 0, 1, 0, 0, index)).toISOString();
}
