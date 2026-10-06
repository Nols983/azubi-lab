import assert from "node:assert/strict";
import test from "node:test";
import {
  ACHIEVEMENT_TITLES,
  areUnlockedBadges,
  BATCH_28_2_MODULE_IDS,
  BATCH_28_2_PHASE_MODULE_IDS,
  BADGE_FAMILIES,
  BADGE_CATALOG,
  BADGE_CATEGORIES,
  BADGE_TIERS,
  BADGE_VISUAL_CLASSES,
  calculateLabXpReward,
  canSelectProfileBadges,
  canSelectProfileTitle,
  deriveLearnerRewardState,
  deriveNextMilestones,
  deriveProfileBadgeState,
  filterBadgesByCategory,
  getBadgeCollectionGroups,
  getNextTierBadges,
  getRepresentedBadgeCategories,
  deriveProfileTitleState,
  isUnlockedTitle,
  LEVEL_TITLES,
  MAX_PINNED_BADGES,
  sortBadgesForSocialShowcase,
  TITLE_CATALOG,
  type RewardEvidence,
} from "../src/app/lib/progression-rewards.ts";
import { learningModules } from "../src/app/data/learning-modules.ts";
import { learningPathPhases } from "../src/app/data/learning-path.ts";
import { TIME_ACHIEVEMENT_BADGE_IDS } from "../src/app/lib/time-achievements.ts";

const emptyEvidence: RewardEvidence = {
  completedModuleIds: [],
  perfectQuizModuleIds: [],
  completedNormalLabIds: [],
  zeroHintNormalLabIds: [],
  normalLabCount: 16,
};

test("Lab XP uses unique hint deductions without negative rewards", () => {
  assert.deepEqual(calculateLabXpReward(0), { baseXp: 75, uniqueHintsUsed: 0, hintDeduction: 0, earnedXp: 75 });
  assert.deepEqual(calculateLabXpReward(1), { baseXp: 75, uniqueHintsUsed: 1, hintDeduction: 25, earnedXp: 50 });
  assert.deepEqual(calculateLabXpReward(2), { baseXp: 75, uniqueHintsUsed: 2, hintDeduction: 50, earnedXp: 25 });
  assert.deepEqual(calculateLabXpReward(3), { baseXp: 75, uniqueHintsUsed: 3, hintDeduction: 75, earnedXp: 0 });
  assert.equal(calculateLabXpReward(20).earnedXp, 0);
  assert.throws(() => calculateLabXpReward(-1), RangeError);
});

test("level titles unlock canonically and default to the highest unlocked milestone", () => {
  const levelEight = deriveLearnerRewardState({ totalXp: 1750, evidence: emptyEvidence });
  assert.equal(levelEight.level.level, 8);
  assert.equal(levelEight.activeTitle?.id, "level-troubleshooter");
  assert.equal(levelEight.titles.filter((title) => title.unlocked && title.type === "level").length, 4);
  assert.equal(LEVEL_TITLES.length, 10);
});

test("achievement titles and badges derive from canonical factual evidence", () => {
  const completedLabs = Array.from({ length: 16 }, (_, index) => index < 2
    ? ["client-multifault-001", "vlan-firewall-multifault-001"][index]
    : `normal-lab-${index}`);
  const evidence: RewardEvidence = {
    completedModuleIds: BATCH_28_2_MODULE_IDS,
    perfectQuizModuleIds: BATCH_28_2_MODULE_IDS.slice(0, 15),
    completedNormalLabIds: completedLabs,
    zeroHintNormalLabIds: completedLabs.slice(0, 15),
    normalLabCount: 16,
    unlockedTimeAchievementIds: Object.values(TIME_ACHIEVEMENT_BADGE_IDS),
    canonicalLessonCompletionIds: Array.from({ length: 100 }, (_, index) => `module-${index % 5}/lesson-${index}`),
    canonicalModuleCompletionIds: BATCH_28_2_MODULE_IDS,
    canonicalQuizCompletionIds: BATCH_28_2_MODULE_IDS,
    canonicalLearningDateCount: 30,
  };
  const state = deriveLearnerRewardState({ totalXp: 0, evidence });
  assert.equal(ACHIEVEMENT_TITLES.every((definition) => isUnlockedTitle(state, definition.id)), true);
  assert.equal(BADGE_CATALOG.every((definition) => state.badges.find((badge) => badge.id === definition.id)?.unlocked), true);
});

test("stored title and badge choices fail closed and preserve valid pin order", () => {
  const evidence: RewardEvidence = {
    ...emptyEvidence,
    completedNormalLabIds: ["lab-a", "lab-b", "lab-c", "lab-d", "lab-e"],
  };
  const fallback = deriveLearnerRewardState({
    totalXp: 300,
    evidence,
    selectedTitleId: "unknown-or-locked",
    pinnedBadgeIds: ["badge-lab-erfahren", "badge-locked", "badge-lab-einsteiger", "badge-lab-erfahren"],
  });
  assert.equal(fallback.activeTitle?.id, "level-packet-scout");
  assert.deepEqual(fallback.pinnedBadges.map((badge) => badge.id), ["badge-lab-erfahren", "badge-lab-einsteiger"]);
  assert.equal(isUnlockedTitle(fallback, "unknown"), false);
  assert.equal(isUnlockedTitle(fallback, "level-packet-scout"), true);
  assert.equal(areUnlockedBadges(fallback, ["badge-lab-erfahren", "badge-lab-einsteiger"]), true);
  assert.equal(areUnlockedBadges(fallback, ["badge-locked"]), false);
  assert.equal(areUnlockedBadges(fallback, []), true);
  assert.equal(areUnlockedBadges(fallback, ["badge-lab-einsteiger", "badge-lab-einsteiger"]), false);
  assert.equal(areUnlockedBadges(fallback, Array.from({ length: MAX_PINNED_BADGES + 1 }, (_, index) => `badge-${index}`)), false);
});

test("deriving cosmetic rewards never changes XP", () => {
  const totalXp = 1875;
  const state = deriveLearnerRewardState({ totalXp, evidence: emptyEvidence });
  assert.equal(state.level.totalXp, totalXp);
});

test("time-of-day achievements are pinnable lifetime badges with truthful non-numeric locked states", () => {
  const ids = Object.values(TIME_ACHIEVEMENT_BADGE_IDS);
  const locked = deriveLearnerRewardState({ totalXp: 0, evidence: emptyEvidence });
  assert.equal(ids.every((id) => locked.badges.find((badge) => badge.id === id)?.unlocked === false), true);
  assert.equal(ids.every((id) => locked.badges.find((badge) => badge.id === id)?.progress === undefined), true);
  assert.equal(ids.every((id) => locked.nextMilestones.some((milestone) => milestone.rewardId === id) === false), true);

  const unlocked = deriveLearnerRewardState({
    totalXp: 0,
    evidence: { ...emptyEvidence, unlockedTimeAchievementIds: ids },
    pinnedBadgeIds: [TIME_ACHIEVEMENT_BADGE_IDS.MORNING, TIME_ACHIEVEMENT_BADGE_IDS.NIGHT],
    unlockDates: Object.fromEntries(ids.map((id) => [id, "2026-10-01T10:00:00.000Z"])),
  });
  assert.deepEqual(unlocked.pinnedBadges.map((badge) => badge.id), ["badge-fruehstarter", "badge-nachteule"]);
  assert.equal(unlocked.level.totalXp, 0);
  assert.equal(ids.every((id) => unlocked.badges.find((badge) => badge.id === id)?.category === "lernrhythmus"), true);
  assert.equal(ids.every((id) => unlocked.badges.find((badge) => badge.id === id)?.unlockedAt === "2026-10-01T10:00:00.000Z"), true);
  assert.deepEqual(
    ids.map((id) => unlocked.badges.find((badge) => badge.id === id)?.description),
    [
      "Drei unterschiedliche Lektionen am selben Morgen.",
      "Drei unterschiedliche Lektionen am selben Tag.",
      "Drei unterschiedliche Lektionen am selben Abend.",
      "Drei unterschiedliche Lektionen in derselben Nacht.",
    ],
  );
});
test("staff title access is canonical, cosmetic and independent from learner progression", () => {
  for (const role of ["instructor", "admin"] as const) {
    const levelTitleState = deriveProfileTitleState({
      role,
      selectedTitleId: "level-infrastruktur-meister",
    });
    assert.equal(levelTitleState?.access, "staff");
    assert.equal(levelTitleState?.titles.length, TITLE_CATALOG.length);
    assert.equal(levelTitleState?.titles.every((title) => title.selectable), true);
    assert.equal(levelTitleState?.activeTitle?.id, "level-infrastruktur-meister");
    assert.equal(canSelectProfileTitle(role, "level-infrastruktur-meister"), true);
    assert.equal(canSelectProfileTitle(role, "achievement-packet-whisperer"), true);
    assert.equal(Object.hasOwn(levelTitleState ?? {}, "level"), false);
    assert.equal(Object.hasOwn(levelTitleState ?? {}, "badges"), false);
    assert.equal(Object.hasOwn(levelTitleState ?? {}, "achievements"), false);
  }
});

test("staff badge access reuses canonical pins without fabricating learner unlocks", () => {
  for (const role of ["instructor", "admin"] as const) {
    const state = deriveProfileBadgeState({
      role,
      pinnedBadgeIds: ["badge-systemmeister", "badge-erste-schritte"],
    });
    assert.equal(state?.access, "staff");
    assert.equal(state?.badges.length, BADGE_CATALOG.length);
    assert.equal(state?.badges.every((badge) => badge.selectable && badge.access === "staff"), true);
    assert.equal(state?.badges.every((badge) => !badge.unlocked && badge.unlockedAt === undefined && badge.progress === undefined), true);
    assert.deepEqual(state?.pinnedBadges.map((badge) => badge.id), ["badge-systemmeister", "badge-erste-schritte"]);
    assert.equal(canSelectProfileBadges(role, ["badge-systemmeister"]), true);
    assert.equal(canSelectProfileBadges(role, []), true);
  }
  assert.equal(deriveProfileBadgeState({ role: "observer", pinnedBadgeIds: ["badge-erste-schritte"] }), undefined);
  assert.equal(canSelectProfileBadges("observer", []), false);
});

test("learners can pin only earned badges and retain the canonical maximum", () => {
  const learner = deriveLearnerRewardState({
    totalXp: 0,
    evidence: { ...emptyEvidence, completedModuleIds: ["dns"] },
  });
  const badgeState = deriveProfileBadgeState({ role: "learner", learnerRewards: learner });
  assert.equal(badgeState?.access, "learner");
  assert.equal(canSelectProfileBadges("learner", ["badge-erste-schritte"], learner), true);
  assert.equal(canSelectProfileBadges("learner", ["badge-systemmeister"], learner), false);
  assert.equal(canSelectProfileBadges("learner", Array.from({ length: MAX_PINNED_BADGES + 1 }, () => "badge-erste-schritte"), learner), false);
});

test("learner and observer title selection remains fail-closed", () => {
  const learner = deriveLearnerRewardState({ totalXp: 0, evidence: emptyEvidence });
  assert.equal(canSelectProfileTitle("learner", "level-systemstarter", learner), true);
  assert.equal(canSelectProfileTitle("learner", "level-infrastruktur-meister", learner), false);
  assert.equal(canSelectProfileTitle("observer", "level-systemstarter"), false);
  assert.equal(deriveProfileTitleState({ role: "observer" }), undefined);
  for (const role of ["learner", "observer", "instructor", "admin"] as const) {
    assert.equal(canSelectProfileTitle(role, "unknown-title", learner), false);
  }
});

test("reward catalog preserves existing IDs and has valid family metadata", () => {
  const existingIds = [
    "badge-erste-schritte", "badge-quiz-profi", "badge-lab-einsteiger", "badge-lab-erfahren",
    "badge-lab-profi", "badge-ohne-hilfe", "badge-eigenstaendig", "badge-netzwerk-fundament",
    "badge-backup-waechter", "badge-multi-fault", "badge-lab-meister", "badge-fruehstarter",
    "badge-tagesform", "badge-feierabend-fokus", "badge-nachteule",
  ];
  const ids = BADGE_CATALOG.map((badge) => badge.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(existingIds.every((id) => ids.includes(id)), true);
  assert.equal(ids.length, 30);
  assert.equal(ids.includes("badge-makellos"), false);
  assert.equal(ids.includes("badge-azubi-lab-legende"), false);
  assert.equal(BADGE_CATALOG.every((badge) => BADGE_VISUAL_CLASSES.includes(badge.visualClass)), true);
  assert.equal(BADGE_CATALOG.every((badge) => BADGE_CATEGORIES.includes(badge.category)), true);
  assert.equal(BADGE_CATALOG.every((badge) => badge.description.length > 0 && badge.unlockCondition.length > 0), true);
  assert.equal(BADGE_CATALOG.find((badge) => badge.id === "badge-lab-meister")?.visualClass, "prestige");

  const tiered = BADGE_CATALOG.filter((badge) => badge.visualClass === "tiered");
  assert.equal(tiered.every((badge) => badge.familyId && badge.tier && BADGE_TIERS.includes(badge.tier)), true);
  assert.equal(BADGE_CATALOG.filter((badge) => badge.visualClass !== "tiered").every((badge) => !badge.familyId && !badge.tier), true);
  for (const familyId of Object.keys(BADGE_FAMILIES)) {
    const tiers = tiered.filter((badge) => badge.familyId === familyId).map((badge) => badge.tier);
    assert.deepEqual(tiers, BADGE_TIERS, familyId);
    assert.equal(new Set(tiers).size, tiers.length, familyId);
  }
  assert.deepEqual(
    getBadgeCollectionGroups(deriveLearnerRewardState({ totalXp: 0, evidence: emptyEvidence }).badges)
      .filter((group) => group.familyId)
      .map((group) => group.familyId),
    Object.keys(BADGE_FAMILIES),
  );
});

test("fixed Batch-28.2 snapshots match the audited curriculum and phases", () => {
  assert.equal(BATCH_28_2_MODULE_IDS.length, 25);
  assert.equal(learningModules.length, 27);
  const postSnapshotModules = new Set(["datenmengen-zahlensysteme-uebertragungsrechnungen", "clientinstallation-boot-datentraeger"]);
  assert.deepEqual(new Set(BATCH_28_2_MODULE_IDS), new Set(learningModules.filter((module) => !postSnapshotModules.has(module.slug)).map((module) => module.slug)));
  assert.deepEqual(BATCH_28_2_PHASE_MODULE_IDS, learningPathPhases.map((phase) => phase.moduleSlugs.filter((slug) => !postSnapshotModules.has(slug))));
  assert.equal(new Set(BATCH_28_2_PHASE_MODULE_IDS.flat()).size, 25);
});

test("new threshold achievements resist duplicate evidence and fixed goals ignore future modules", () => {
  const duplicateOnly = deriveLearnerRewardState({
    totalXp: 0,
    evidence: {
      ...emptyEvidence,
      canonicalLessonCompletionIds: Array.from({ length: 100 }, () => "one-module/one-lesson"),
      canonicalModuleCompletionIds: Array.from({ length: 13 }, () => "ipv4-grundlagen"),
      canonicalQuizCompletionIds: Array.from({ length: 25 }, () => "ipv4-grundlagen"),
      canonicalLearningDateCount: 29,
    },
  });
  for (const id of ["badge-querbeet", "badge-fuenferpack", "badge-quizmarathon", "badge-halbzeit", "badge-langstrecke", "badge-ausdauer", "badge-systemmeister", "badge-perfektionist"]) {
    assert.equal(duplicateOnly.badges.find((badge) => badge.id === id)?.unlocked, false, id);
  }

  const fixed = deriveLearnerRewardState({
    totalXp: 0,
    evidence: {
      ...emptyEvidence,
      canonicalModuleCompletionIds: [...BATCH_28_2_MODULE_IDS, "future-module"],
      canonicalQuizCompletionIds: [...BATCH_28_2_MODULE_IDS, "future-module"],
    },
  });
  assert.equal(fixed.badges.find((badge) => badge.id === "badge-systemmeister")?.unlocked, true);
  assert.equal(fixed.badges.find((badge) => badge.id === "badge-perfektionist")?.unlocked, true);
});

test("social badge order is prestige, Gold, Silver, Bronze, unique and then deterministic", () => {
  const base = deriveLearnerRewardState({ totalXp: 0, evidence: emptyEvidence }).badges[0];
  const sample = [
    { ...base, id: "unique-z", visualClass: "unique" as const, familyId: undefined, tier: undefined },
    { ...base, id: "bronze-a", visualClass: "tiered" as const, familyId: "modules" as const, tier: "bronze" as const },
    { ...base, id: "gold-a", visualClass: "tiered" as const, familyId: "modules" as const, tier: "gold" as const },
    { ...base, id: "prestige-a", visualClass: "prestige" as const, familyId: undefined, tier: undefined },
    { ...base, id: "silver-a", visualClass: "tiered" as const, familyId: "modules" as const, tier: "silver" as const },
  ];
  assert.deepEqual(sortBadgesForSocialShowcase(sample).map((badge) => badge.id), ["prestige-a", "gold-a", "silver-a", "bronze-a", "unique-z"]);
});

test("Lab-Ritter keeps the stable achievement-lab-retter ID and existing selections", () => {
  const definition = TITLE_CATALOG.find((title) => title.id === "achievement-lab-retter");
  assert.equal(definition?.displayName, "Lab-Ritter");
  const completedNormalLabIds = Array.from({ length: 10 }, (_, index) => `lab-${index}`);
  const state = deriveLearnerRewardState({
    totalXp: 0,
    evidence: { ...emptyEvidence, completedNormalLabIds },
    selectedTitleId: "achievement-lab-retter",
  });
  assert.equal(state.activeTitle?.id, "achievement-lab-retter");
  assert.equal(state.activeTitle?.displayName, "Lab-Ritter");
});

function milestoneEvidence(input: {
  labs?: number;
  noHintLabs?: number;
  modules?: readonly string[];
} = {}): RewardEvidence {
  const completedNormalLabIds = Array.from({ length: input.labs ?? 0 }, (_, index) => `lab-${index + 1}`);
  return {
    ...emptyEvidence,
    completedModuleIds: input.modules ?? [],
    completedNormalLabIds,
    zeroHintNormalLabIds: completedNormalLabIds.slice(0, input.noHintLabs ?? 0),
  };
}

test("next milestones stay canonical, bounded, deterministic and exclude unlocked rewards", () => {
  const zero = deriveLearnerRewardState({ totalXp: 0, evidence: milestoneEvidence() });
  assert.equal(zero.nextMilestones.length, 3);
  assert.equal(zero.nextMilestones.every((item) => item.current >= 0 && item.current <= item.target), true);
  assert.deepEqual(deriveNextMilestones(zero), zero.nextMilestones);
  assert.deepEqual(deriveNextMilestones(zero, 99), zero.nextMilestones);
  assert.deepEqual(
    deriveLearnerRewardState({ totalXp: 0, evidence: milestoneEvidence() }).nextMilestones,
    zero.nextMilestones,
  );

  const oneLab = deriveLearnerRewardState({ totalXp: 0, evidence: milestoneEvidence({ labs: 1 }) });
  assert.equal(oneLab.badges.find((badge) => badge.id === "badge-lab-einsteiger")?.unlocked, true);
  assert.equal(oneLab.nextMilestones.some((item) => item.rewardId === "badge-lab-einsteiger"), false);

  const fourNoHint = deriveLearnerRewardState({ totalXp: 0, evidence: milestoneEvidence({ labs: 4, noHintLabs: 4 }) });
  assert.deepEqual(
    fourNoHint.nextMilestones.find((item) => item.rewardId === "badge-ohne-hilfe"),
    {
      rewardId: "badge-ohne-hilfe",
      displayName: "Ohne Hilfe",
      description: "5 unterschiedliche normale Labs beim Erstabschluss ohne Hinweis lösen.",
      current: 4,
      target: 5,
      ratio: 0.8,
      type: "badge",
      category: "Labs",
      destination: "/profil#badge-collection-heading",
    },
  );

  const fiveNoHint = deriveLearnerRewardState({ totalXp: 0, evidence: milestoneEvidence({ labs: 5, noHintLabs: 5 }) });
  assert.equal(fiveNoHint.nextMilestones.some((item) => item.rewardId === "badge-ohne-hilfe"), false);

  const nineLabs = deriveLearnerRewardState({ totalXp: 0, evidence: milestoneEvidence({ labs: 9 }) });
  const labRitter = nineLabs.nextMilestones.find((item) => item.rewardId === "achievement-lab-retter");
  assert.equal(labRitter?.current, 9);
  assert.equal(labRitter?.target, 10);
  assert.equal(getNextTierBadges(nineLabs.badges).find((badge) => badge.familyId === "labs")?.id, "badge-lab-profi");

  const tenLabs = deriveLearnerRewardState({ totalXp: 0, evidence: milestoneEvidence({ labs: 10 }) });
  assert.equal(tenLabs.nextMilestones.some((item) => item.rewardId === "achievement-lab-retter"), false);
  assert.equal(getNextTierBadges(tenLabs.badges).some((badge) => badge.familyId === "labs"), false);

  const network = deriveLearnerRewardState({
    totalXp: 0,
    evidence: milestoneEvidence({ modules: ["ipv4-grundlagen", "subnetting", "dhcp"] }),
  });
  assert.deepEqual(
    network.nextMilestones.find((item) => item.rewardId === "badge-netzwerk-fundament")?.current,
    3,
  );
  assert.equal(network.nextMilestones.find((item) => item.rewardId === "badge-netzwerk-fundament")?.target, 4);
});

test("tier families unlock at exact distinct thresholds", () => {
  const ids = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`);
  const cases = [
    [0, [false, false, false]], [1, [true, false, false]], [9, [true, false, false]],
    [10, [true, true, false]], [19, [true, true, false]], [20, [true, true, true]],
  ] as const;
  for (const [count, expected] of cases) {
    const state = deriveLearnerRewardState({ totalXp: 0, evidence: { ...emptyEvidence, completedModuleIds: ids("module", count) } });
    assert.deepEqual(
      ["badge-erste-schritte", "badge-wissenssammler", "badge-lernprofi"].map((id) => state.badges.find((badge) => badge.id === id)?.unlocked),
      expected,
      `modules ${count}`,
    );
  }

  for (const [count, expected] of [[0, [false, false, false]], [1, [true, false, false]], [4, [true, false, false]], [5, [true, true, false]], [14, [true, true, false]], [15, [true, true, true]]] as const) {
    const state = deriveLearnerRewardState({ totalXp: 0, evidence: { ...emptyEvidence, perfectQuizModuleIds: ids("quiz", count) } });
    assert.deepEqual(
      ["badge-quiz-profi", "badge-quiz-experte", "badge-quiz-meister"].map((id) => state.badges.find((badge) => badge.id === id)?.unlocked),
      expected,
      `perfect quizzes ${count}`,
    );
  }

  for (const [count, expected] of [[4, [false, false, false]], [5, [true, false, false]], [9, [true, false, false]], [10, [true, true, false]], [14, [true, true, false]], [15, [true, true, true]]] as const) {
    const noHint = ids("lab", count);
    const state = deriveLearnerRewardState({ totalXp: 0, evidence: { ...emptyEvidence, completedNormalLabIds: noHint, zeroHintNormalLabIds: noHint } });
    assert.deepEqual(
      ["badge-ohne-hilfe", "badge-eigenstaendig", "badge-selbststaendig"].map((id) => state.badges.find((badge) => badge.id === id)?.unlocked),
      expected,
      `no-hint labs ${count}`,
    );
  }
});

test("tier progress resists replay farming and pins never auto-upgrade", () => {
  const duplicates = Array.from({ length: 25 }, () => "same");
  const replayed = deriveLearnerRewardState({
    totalXp: 0,
    evidence: {
      ...emptyEvidence,
      completedModuleIds: duplicates,
      perfectQuizModuleIds: duplicates,
      completedNormalLabIds: duplicates,
      zeroHintNormalLabIds: duplicates,
    },
  });
  for (const id of ["badge-wissenssammler", "badge-quiz-experte", "badge-lab-erfahren", "badge-ohne-hilfe"]) {
    assert.equal(replayed.badges.find((badge) => badge.id === id)?.unlocked, false, id);
  }

  const labs = Array.from({ length: 10 }, (_, index) => `lab-${index + 1}`);
  const upgraded = deriveLearnerRewardState({
    totalXp: 0,
    evidence: { ...emptyEvidence, completedNormalLabIds: labs },
    pinnedBadgeIds: ["badge-lab-einsteiger"],
  });
  assert.equal(upgraded.badges.find((badge) => badge.id === "badge-lab-profi")?.unlocked, true);
  assert.deepEqual(upgraded.pinnedBadges.map((badge) => badge.id), ["badge-lab-einsteiger"]);
});

test("family-aware milestone projection exposes only the next locked tier", () => {
  const familyIds = (state: ReturnType<typeof deriveLearnerRewardState>) => Object.fromEntries(
    getNextTierBadges(state.badges).map((badge) => [badge.familyId, badge.id]),
  );
  assert.equal(familyIds(deriveLearnerRewardState({ totalXp: 0, evidence: emptyEvidence })).labs, "badge-lab-einsteiger");
  assert.equal(familyIds(deriveLearnerRewardState({ totalXp: 0, evidence: milestoneEvidence({ labs: 1 }) })).labs, "badge-lab-erfahren");
  assert.equal(familyIds(deriveLearnerRewardState({ totalXp: 0, evidence: milestoneEvidence({ labs: 5 }) })).labs, "badge-lab-profi");
  assert.equal(familyIds(deriveLearnerRewardState({ totalXp: 0, evidence: milestoneEvidence({ labs: 10 }) })).labs, undefined);

  const almost = deriveLearnerRewardState({
    totalXp: 0,
    evidence: {
      ...emptyEvidence,
      completedModuleIds: Array.from({ length: 9 }, (_, index) => `module-${index}`),
      perfectQuizModuleIds: Array.from({ length: 4 }, (_, index) => `quiz-${index}`),
      completedNormalLabIds: Array.from({ length: 4 }, (_, index) => `lab-${index}`),
      zeroHintNormalLabIds: Array.from({ length: 4 }, (_, index) => `lab-${index}`),
    },
  });
  assert.deepEqual(familyIds(almost), {
    modules: "badge-wissenssammler",
    "perfect-quizzes": "badge-quiz-experte",
    labs: "badge-lab-erfahren",
    "independent-labs": "badge-ohne-hilfe",
  });
  const projectedFamilies = almost.nextMilestones.flatMap((milestone) => {
    const familyId = almost.badges.find((badge) => badge.id === milestone.rewardId)?.familyId;
    return familyId ? [familyId] : [];
  });
  assert.equal(new Set(projectedFamilies).size, projectedFamilies.length);
  assert.equal(almost.nextMilestones.length <= 3, true);
});

test("learner-facing badge copy contains no implementation terminology", () => {
  const copy = BADGE_CATALOG.flatMap((badge) => [badge.displayName, badge.description, badge.unlockCondition]).join("\n");
  for (const banned of ["Kanonische Lernbedingung", "Batch-28.2-Modulkatalog", "Batch-28.2-Stand", "Kosmetisch verfügbar durch Staff-Rolle", "kanonisch"]) {
    assert.doesNotMatch(copy, new RegExp(banned, "i"), banned);
  }
  assert.equal(BADGE_CATALOG.find((badge) => badge.id === "badge-systemmeister")?.unlockCondition, "Alle 25 Module abschließen.");
  assert.equal(BADGE_CATALOG.find((badge) => badge.id === "badge-perfektionist")?.unlockCondition, "Alle 25 Abschlussquizze abschließen.");
  assert.equal(BADGE_CATALOG.find((badge) => badge.id === "badge-allrounder")?.unlockCondition, "In jeder der 5 Lernphasen mindestens ein Modul abschließen.");
});

test("badge categories are canonical, represented, and filtering does not mutate pins or unlocks", () => {
  assert.equal(BADGE_CATALOG.every((badge) => BADGE_CATEGORIES.includes(badge.category)), true);
  assert.deepEqual(getRepresentedBadgeCategories(), BADGE_CATEGORIES);
  const state = deriveLearnerRewardState({
    totalXp: 0,
    evidence: milestoneEvidence({ labs: 5, noHintLabs: 5 }),
    pinnedBadgeIds: ["badge-lab-erfahren", "badge-ohne-hilfe"],
  });
  const unlockSnapshot = state.badges.map((badge) => [badge.id, badge.unlocked]);
  const pinSnapshot = state.pinnedBadges.map((badge) => badge.id);
  const labBadges = filterBadgesByCategory(state.badges, "labs");
  assert.equal(labBadges.length > 0, true);
  assert.equal(labBadges.every((badge) => badge.category === "labs"), true);
  assert.deepEqual(filterBadgesByCategory(state.badges, "all"), state.badges);
  assert.deepEqual(state.badges.map((badge) => [badge.id, badge.unlocked]), unlockSnapshot);
  assert.deepEqual(state.pinnedBadges.map((badge) => badge.id), pinSnapshot);
});
