import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("migration is additive, constraint-backed and supports multiple memberships", async () => {
  const migration = await source("db/migrations/0021_teams_and_memberships.sql");
  assert.match(migration, /CREATE TABLE teams/);
  assert.match(migration, /CREATE TABLE team_members/);
  assert.match(migration, /PRIMARY KEY \(team_id, user_id\)/);
  assert.match(migration, /team_role IN \('member', 'manager'\)/);
  assert.match(migration, /CREATE UNIQUE INDEX teams_name_lower_key/);
  assert.match(migration, /CREATE UNIQUE INDEX teams_slug_key/);
  assert.match(migration, /active boolean NOT NULL DEFAULT true/);
  assert.doesNotMatch(migration, /INSERT INTO|DROP TABLE|TRUNCATE|ALTER TABLE users/);
});

test("team edits preserve the stable route slug", async () => {
  const repository = await source("src/app/lib/server/team-repository.ts");
  const update = repository.slice(repository.indexOf("export async function updateTeam"), repository.indexOf("export async function setTeamActive"));
  assert.doesNotMatch(update, /SET name = \$2, slug/);
  assert.match(update, /RETURNING id, name, slug/);
});

test("team and social reads are authenticated and enforce server-side IDOR boundaries", async () => {
  const [service, repository, teamPage, profilePage, avatarRoute] = await Promise.all([
    source("src/app/lib/server/team-service.ts"),
    source("src/app/lib/server/team-repository.ts"),
    source("src/app/teams/[slug]/page.tsx"),
    source("src/app/community/[userId]/page.tsx"),
    source("src/app/api/community/avatar/[userId]/route.ts"),
  ]);
  assert.match(service, /getTeamDetailView[\s\S]*requireAuthenticatedUser\(\)/);
  assert.match(service, /canViewTeam\([\s\S]*viewerIsMember: Boolean\(team\.viewerTeamRole\)/);
  assert.match(service, /authorizeSocialProfile[\s\S]*sharesActiveTeam\(viewer\.id, target\.id\)/);
  assert.match(repository, /WHERE team\.active = true[\s\S]*JOIN team_members viewer[\s\S]*JOIN team_members target/);
  assert.match(teamPage, /TeamVisibilityError[\s\S]*notFound\(\)/);
  assert.match(profilePage, /SocialProfileVisibilityError[\s\S]*notFound\(\)/);
  assert.match(avatarRoute, /readSocialAvatar\(userId\)/);
  assert.doesNotMatch(avatarRoute, /readFile|PROFILE_IMAGE_STORAGE_DIR|pathFor/);
});

test("all team mutations require manageTeams and validate server inputs", async () => {
  const [actions, authorization] = await Promise.all([
    source("src/app/actions/team-actions.ts"),
    source("src/app/lib/authorization.ts"),
  ]);
  assert.equal((actions.match(/requireCapability\("manageTeams"\)/g) ?? []).length, 6);
  assert.match(actions, /isUuid\(teamId\)/);
  assert.match(actions, /isUuid\(userId\)/);
  assert.match(actions, /parseTeamRole/);
  assert.match(actions, /hasOnlyFormFields/);
  assert.match(authorization, /admin: new Set\(ACCOUNT_CAPABILITIES/);
  assert.doesNotMatch(authorization.slice(authorization.indexOf("instructor:"), authorization.indexOf("admin:")), /manageTeams/);
});

test("membership role controls remount with the persisted role after a server action", async () => {
  const controls = await source("src/app/components/admin/team-management-forms.tsx");
  assert.match(controls, /<TeamRoleSelect key=\{teamRole\} defaultValue=\{teamRole\}/);
});

test("social projection exposes showcase data only and filters locked badges", async () => {
  const [service, profilePage, memberCard] = await Promise.all([
    source("src/app/lib/server/team-service.ts"),
    source("src/app/community/[userId]/page.tsx"),
    source("src/app/components/teams/team-member-card.tsx"),
  ]);
  const learnerProjection = service.slice(
    service.indexOf('kind: "learner" as const'),
    service.indexOf("export async function readSocialAvatar"),
  );
  assert.match(learnerProjection, /displayName: target\.displayName/);
  assert.match(learnerProjection, /activeTitle: rewards\.activeTitle/);
  assert.match(learnerProjection, /level: rewards\.level\.level/);
  assert.match(learnerProjection, /totalXp: rewards\.level\.totalXp/);
  assert.match(learnerProjection, /pinnedBadges: rewards\.pinnedBadges/);
  assert.match(service, /sortBadgesForSocialShowcase\(rewards\.badges\.filter\(\(badge\) => badge\.unlocked\)\)/);
  assert.match(learnerProjection, /unlockedBadges,/);
  assert.doesNotMatch(learnerProjection, /login|email|attempt|lesson|progressPercentage|trainer|session|notification/i);
  assert.doesNotMatch(profilePage, /login_identifier|password_hash|quizHistory|failedAttempts|trainerNotes/);
  assert.match(profilePage, /Gesperrte Abzeichen und deren Fortschritt bleiben privat/);
  assert.match(profilePage, /Erfolge &amp; Abzeichen/);
  assert.match(profilePage, /showUnlockDate/);
  assert.doesNotMatch(profilePage, /badge\.progress|unlockCondition/);
  assert.match(profilePage, /profile\.kind === "learner"/);
  assert.doesNotMatch(memberCard, /login|email/);
});

test("staff social profiles expose only canonical cosmetic pins with truthful wording", async () => {
  const [service, repository, profilePage, memberCard] = await Promise.all([
    source("src/app/lib/server/team-service.ts"),
    source("src/app/lib/server/team-repository.ts"),
    source("src/app/community/[userId]/page.tsx"),
    source("src/app/components/teams/team-member-card.tsx"),
  ]);
  assert.match(repository, /preference\.pinned_badge_ids/);
  assert.match(service, /deriveProfileBadgeState\(\{[\s\S]*role: target\.role,[\s\S]*pinnedBadgeIds: target\.pinnedBadgeIds/);
  assert.match(service, /pinnedBadges: badgeState\?\.pinnedBadges \?\? \[\]/);
  assert.match(service, /role: member\.accountRole,[\s\S]*pinnedBadgeIds: member\.pinnedBadgeIds/);
  assert.match(profilePage, /Kosmetische Showcase-Auswahl durch Staff-Berechtigung/);
  const staffProjection = service.slice(service.indexOf('kind: "staff" as const'), service.indexOf("const rewards = await getLearnerRewardState"));
  assert.doesNotMatch(staffProjection, /unlockedBadges|unlockedAt|totalXp|level:/);
  assert.match(memberCard, /member\.pinnedBadges\.map/);
});

test("canonical progression is bulk-loaded and checked against leaderboard XP", async () => {
  const [teamService, rewardService, repository] = await Promise.all([
    source("src/app/lib/server/team-service.ts"),
    source("src/app/lib/server/reward-service.ts"),
    source("src/app/lib/server/team-repository.ts"),
  ]);
  assert.match(teamService, /getLearnerRewardStates\(learnerIds\)/);
  assert.match(teamService, /rewards\.level\.totalXp !== member\.totalXp/);
  assert.match(teamService, /\.sort\(compareLeaderboardMembers\)/);
  assert.match(rewardService, /readXpEventsForUsers\(uniqueUserIds\)/);
  assert.match(rewardService, /readLearnerProgressForUsers\(uniqueUserIds\)/);
  assert.match(repository, /WITH xp AS[\s\S]*sum\(event\.xp_amount\)/);
  assert.doesNotMatch(repository, /users\.total_xp|users\.level/);
});

test("badge variants serve team, social and private profile without weakening private controls", async () => {
  const [badgeCard, privatePage, controls, socialPage, teamCard] = await Promise.all([
    source("src/app/components/profile/badge-card.tsx"),
    source("src/app/profil/page.tsx"),
    source("src/app/components/profile/profile-customization.tsx"),
    source("src/app/community/[userId]/page.tsx"),
    source("src/app/components/teams/team-member-card.tsx"),
  ]);
  assert.match(badgeCard, /"compact" \| "preview" \| "collection"/);
  assert.match(badgeCard, /aria-label={`Abzeichen:/);
  assert.match(badgeCard, /aria-hidden="true"/);
  assert.match(privatePage, /BadgeCard badge=\{badge\} variant="compact"/);
  assert.match(controls, /BadgeCard badge=\{badge\} variant="collection" showLocked/);
  assert.match(badgeCard, /badge\.progress/);
  assert.match(controls, /updatePinnedBadgesAction/);
  assert.match(controls, /StaffBadgeControls/);
  assert.match(controls, /Staff-Vorschau/);
  const badgeControls = controls.slice(controls.indexOf("export function StaffBadgeControls"), controls.indexOf("export function RewardControls"));
  assert.doesNotMatch(badgeControls, /Kosmetisch verfügbar durch Staff-Rolle|Kanonische Lernbedingung/);
  assert.match(socialPage, /variant="preview"/);
  assert.match(socialPage, /variant="collection"/);
  assert.match(teamCard, /variant="compact"/);
  const combined = [privatePage, controls, socialPage, teamCard].join("\n");
  assert.doesNotMatch(combined, /featuredBadge|featured_badge|highlightBadge/);
});

test("team surfaces include responsive card layouts, empty states and textual ranks", async () => {
  const [entry, detail, profile, admin] = await Promise.all([
    source("src/app/teams/page.tsx"),
    source("src/app/teams/[slug]/page.tsx"),
    source("src/app/community/[userId]/page.tsx"),
    source("src/app/admin/teams/page.tsx"),
  ]);
  assert.match(entry, /Du bist aktuell keinem Team zugeordnet/);
  assert.match(detail, /aria-label={`Rang \$\{member\.rank\}`}/);
  assert.match(detail, /Keine weiteren Teammitglieder/);
  assert.doesNotMatch(detail, /<table|overflow-x-auto/);
  assert.match(profile, /Noch keine Abzeichen angeheftet/);
  assert.match(admin, /Noch keine Teams angelegt/);
  for (const page of [entry, detail, profile, admin]) assert.doesNotMatch(page, /min-w-\[[4-9][0-9]{2}px\]/);
});

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}
