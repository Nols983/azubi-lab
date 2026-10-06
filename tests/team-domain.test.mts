import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canManageTeams } from "../src/app/lib/authorization.ts";
import { getBadgeClassPresentation, getBadgeVisualTheme } from "../src/app/lib/badge-presentation.ts";
import { deriveLearnerRewardState, type RewardEvidence } from "../src/app/lib/progression-rewards.ts";
import {
  canViewSocialProfile,
  canViewTeam,
  compareLeaderboardMembers,
  isRankedTeamMember,
  parseTeamRole,
  slugifyTeamName,
  validateTeamInput,
} from "../src/app/lib/team-domain.ts";
import { TIME_ACHIEVEMENT_BADGE_IDS } from "../src/app/lib/time-achievements.ts";
import { deriveLevelProgress } from "../src/app/lib/xp-domain.ts";

const emptyEvidence: RewardEvidence = {
  completedModuleIds: [],
  perfectQuizModuleIds: [],
  completedNormalLabIds: [],
  zeroHintNormalLabIds: [],
  normalLabCount: 16,
};

test("team input creates deterministic German-safe slugs and validates bounds", () => {
  assert.equal(slugifyTeamName("  Prüfungsvorbereitung & Geräte  "), "pruefungsvorbereitung-geraete");
  assert.deepEqual(validateTeamInput(" Team A ", " Gemeinsam   lernen "), {
    valid: true,
    value: { name: "Team A", slug: "team-a", description: "Gemeinsam lernen" },
  });
  assert.equal(validateTeamInput("!", "").valid, false);
  assert.equal(validateTeamInput("Team", "x".repeat(501)).valid, false);
  assert.equal(parseTeamRole("member"), "member");
  assert.equal(parseTeamRole("manager"), "manager");
  assert.equal(parseTeamRole("admin"), undefined);
});

test("team and social visibility fail closed outside active membership", () => {
  assert.equal(canViewTeam({ viewerCanManageTeams: false, viewerIsMember: true, teamActive: true }), true);
  assert.equal(canViewTeam({ viewerCanManageTeams: false, viewerIsMember: true, teamActive: false }), false);
  assert.equal(canViewTeam({ viewerCanManageTeams: false, viewerIsMember: false, teamActive: true }), false);
  assert.equal(canViewTeam({ viewerCanManageTeams: true, viewerIsMember: false, teamActive: false }), true);

  assert.equal(canViewSocialProfile({ viewerId: "a", targetUserId: "a", viewerCanManageTeams: false, sharesActiveTeam: false }), true);
  assert.equal(canViewSocialProfile({ viewerId: "a", targetUserId: "b", viewerCanManageTeams: false, sharesActiveTeam: true }), true);
  assert.equal(canViewSocialProfile({ viewerId: "a", targetUserId: "b", viewerCanManageTeams: false, sharesActiveTeam: false }), false);
  assert.equal(canViewSocialProfile({ viewerId: "admin", targetUserId: "b", viewerCanManageTeams: true, sharesActiveTeam: false }), true);
});

test("leaderboard order is canonical XP descending with stable privacy-safe ties", () => {
  const members = [
    { id: "c", displayName: "Zoë", totalXp: 500 },
    { id: "b", displayName: "Änne", totalXp: 500 },
    { id: "a", displayName: "Änne", totalXp: 500 },
    { id: "d", displayName: "Mehr XP", totalXp: 700 },
  ].sort(compareLeaderboardMembers);
  assert.deepEqual(members.map((member) => member.id), ["d", "a", "b", "c"]);
  assert.equal(new Set(members.map((member) => member.id)).size, members.length);
});

test("only active learner memberships participate in ranking and level stays canonical", () => {
  assert.equal(isRankedTeamMember("learner", true, false), true);
  assert.equal(isRankedTeamMember("learner", false, false), false);
  assert.equal(isRankedTeamMember("learner", true, true), false);
  for (const role of ["observer", "instructor", "admin"] as const) {
    assert.equal(isRankedTeamMember(role, true, false), false);
  }
  const totalXp = 1_875;
  const rewards = deriveLearnerRewardState({ totalXp, evidence: emptyEvidence });
  assert.deepEqual(rewards.level, deriveLevelProgress(totalXp));
});

test("team manager metadata never grants application team administration", () => {
  for (const role of ["learner", "observer", "instructor"] as const) {
    assert.equal(canManageTeams(role), false);
  }
  assert.equal(canManageTeams("admin"), true);
  assert.equal(parseTeamRole("manager"), "manager");
});

test("badge themes are semantic, deterministic and keep time-of-day badges distinct", () => {
  const state = deriveLearnerRewardState({
    totalXp: 0,
    evidence: { ...emptyEvidence, unlockedTimeAchievementIds: Object.values(TIME_ACHIEVEMENT_BADGE_IDS) },
  });
  const rhythmKeys = Object.values(TIME_ACHIEVEMENT_BADGE_IDS).map((id) => {
    const badge = state.badges.find((item) => item.id === id);
    assert.ok(badge);
    return getBadgeVisualTheme(badge).key;
  });
  assert.equal(new Set(rhythmKeys).size, 4);
  assert.deepEqual(rhythmKeys, ["rhythm-morning", "rhythm-day", "rhythm-evening", "rhythm-night"]);
  assert.equal(getBadgeVisualTheme({ id: "future", category: "future" as never }).key, "fallback");
});

test("badge classes have textual, distinctive, dark-mode and motion-free treatments", () => {
  const presentations = [
    getBadgeClassPresentation({ visualClass: "tiered", tier: "bronze" }),
    getBadgeClassPresentation({ visualClass: "tiered", tier: "silver" }),
    getBadgeClassPresentation({ visualClass: "tiered", tier: "gold" }),
    getBadgeClassPresentation({ visualClass: "unique" }),
    getBadgeClassPresentation({ visualClass: "prestige" }),
  ];
  assert.deepEqual(presentations.map((item) => item.label), ["Bronze", "Silber", "Gold", "Einzigartig", "Prestige"]);
  assert.equal(new Set(presentations.map((item) => item.cardClass)).size, presentations.length);
  assert.equal(presentations.every((item) => Object.values(item).join(" ").includes("dark:")), true);
  assert.doesNotMatch(presentations.map((item) => Object.values(item).join(" ")).join(" "), /animate-|motion-|transition-/);
});

test("compact badge previews stay bounded inside tablet team cards", () => {
  const badgeCardSource = readFileSync(new URL("../src/app/components/profile/badge-card.tsx", import.meta.url), "utf8");
  assert.match(badgeCardSource, /inline-flex min-h-10 min-w-0 max-w-full items-center/);
});
