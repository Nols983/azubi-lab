import "server-only";

import { isUuid } from "../account-security.ts";
import { getAccountInitials } from "../account-presentation.ts";
import { ACCOUNT_ROLE_LABELS } from "../auth-types.ts";
import { hasCapability } from "../authorization.ts";
import {
  deriveProfileBadgeState,
  deriveProfileTitleState,
  sortBadgesForSocialShowcase,
  type LearnerRewardState,
  type RewardCollectionItem,
} from "../progression-rewards.ts";
import {
  canViewSocialProfile,
  canViewTeam,
  compareLeaderboardMembers,
  isRankedTeamMember,
} from "../team-domain.ts";
import { requireAuthenticatedUser, requireCapability } from "./current-user.ts";
import { LocalFilesystemProfileImageStorage, type StoredProfileImageInfo } from "./profile-image.ts";
import { getLearnerRewardState, getLearnerRewardStates } from "./reward-service.ts";
import {
  findSocialAccount,
  findTeamAccessBySlug,
  listActiveTeamsForUser,
  listAdminTeamMemberships,
  listAssignableTeamAccounts,
  listTeamMembers,
  listTeamsForAdmin,
  listVisibleSocialTeams,
  sharesActiveTeam,
  type TeamMemberRecord,
} from "./team-repository.ts";

export type SocialBadge = RewardCollectionItem;

export async function getTeamsEntryView() {
  const user = await requireAuthenticatedUser();
  const managesTeams = hasCapability(user.role, "manageTeams");
  const teams = managesTeams
    ? await listTeamsForAdmin()
    : await listActiveTeamsForUser(user.id);
  return {
    currentUserId: user.id,
    managesTeams,
    teams: managesTeams ? teams : teams.filter((team) => team.active),
  };
}

export async function getTeamDetailView(slug: unknown) {
  const user = await requireAuthenticatedUser();
  if (typeof slug !== "string" || slug.length < 2 || slug.length > 96) throw new TeamVisibilityError();
  const team = await findTeamAccessBySlug(slug, user.id);
  const managesTeams = hasCapability(user.role, "manageTeams");
  if (!team || !canViewTeam({
    viewerCanManageTeams: managesTeams,
    viewerIsMember: Boolean(team.viewerTeamRole),
    teamActive: team.active,
  })) throw new TeamVisibilityError();

  const records = (await listTeamMembers(team.id)).filter((member) => !member.disabled);
  const learnerIds = records.filter((member) => member.accountRole === "learner").map((member) => member.id);
  const [rewardStates, avatars] = await Promise.all([
    getLearnerRewardStates(learnerIds),
    getSocialAvatarSources(records.map((member) => member.id)),
  ]);
  const members = records.map((member) => buildTeamMemberView(member, rewardStates.get(member.id), avatars.get(member.id)));
  const learnerLeaderboard = team.active
    ? members
      .filter((member) => member.level !== undefined)
      .sort(compareLeaderboardMembers)
      .map((member, index) => ({ ...member, rank: index + 1 }))
    : [];
  return {
    currentUserId: user.id,
    managesTeams,
    team,
    members,
    learnerLeaderboard,
    staffMembers: members.filter((member) => member.level === undefined),
  };
}

export async function getAdminTeamManagementView() {
  await requireCapability("manageTeams");
  const [teams, memberships, accounts] = await Promise.all([
    listTeamsForAdmin(),
    listAdminTeamMemberships(),
    listAssignableTeamAccounts(),
  ]);
  return {
    accounts,
    teams: teams.map((team) => ({
      ...team,
      members: memberships.filter((membership) => membership.teamId === team.id),
    })),
  };
}

export async function getSocialProfileView(targetUserId: unknown) {
  const viewer = await requireAuthenticatedUser();
  const target = await authorizeSocialProfile(viewer, targetUserId);
  const viewerCanManageTeams = hasCapability(viewer.role, "manageTeams");
  const [visibleTeams, avatar] = await Promise.all([
    listVisibleSocialTeams({ viewerUserId: viewer.id, targetUserId: target.id, viewerCanManageTeams }),
    getSocialAvatarSource(target.id),
  ]);

  if (target.role !== "learner") {
    const titleState = deriveProfileTitleState({
      role: target.role,
      selectedTitleId: target.activeTitleId,
    });
    const badgeState = deriveProfileBadgeState({
      role: target.role,
      pinnedBadgeIds: target.pinnedBadgeIds,
    });
    return {
      kind: "staff" as const,
      id: target.id,
      displayName: target.displayName,
      initials: getAccountInitials(target.displayName),
      avatarSrc: avatar,
      roleLabel: ACCOUNT_ROLE_LABELS[target.role],
      activeTitle: titleState?.activeTitle,
      badgeAccess: badgeState?.access,
      pinnedBadges: badgeState?.pinnedBadges ?? [],
      visibleTeams,
    };
  }

  const rewards = await getLearnerRewardState(target.id);
  const unlockedBadges = sortBadgesForSocialShowcase(rewards.badges.filter((badge) => badge.unlocked));
  return {
    kind: "learner" as const,
    id: target.id,
    displayName: target.displayName,
    initials: getAccountInitials(target.displayName),
    avatarSrc: avatar,
    roleLabel: ACCOUNT_ROLE_LABELS.learner,
    activeTitle: rewards.activeTitle,
    level: rewards.level.level,
    totalXp: rewards.level.totalXp,
    pinnedBadges: rewards.pinnedBadges,
    unlockedBadges,
    unlockedBadgeCount: unlockedBadges.length,
    visibleTeams,
  };
}

export async function readSocialAvatar(targetUserId: unknown) {
  const viewer = await requireAuthenticatedUser();
  const target = await authorizeSocialProfile(viewer, targetUserId);
  return new LocalFilesystemProfileImageStorage().read(target.id);
}

async function authorizeSocialProfile(
  viewer: Awaited<ReturnType<typeof requireAuthenticatedUser>>,
  targetUserId: unknown,
) {
  if (typeof targetUserId !== "string" || !isUuid(targetUserId)) throw new SocialProfileVisibilityError();
  const target = await findSocialAccount(targetUserId);
  if (!target || target.disabled) throw new SocialProfileVisibilityError();
  const viewerCanManageTeams = hasCapability(viewer.role, "manageTeams");
  const sharesTeam = viewer.id === target.id || viewerCanManageTeams
    ? false
    : await sharesActiveTeam(viewer.id, target.id);
  if (!canViewSocialProfile({
    viewerId: viewer.id,
    targetUserId: target.id,
    viewerCanManageTeams,
    sharesActiveTeam: sharesTeam,
  })) throw new SocialProfileVisibilityError();
  return target;
}

function buildTeamMemberView(
  member: TeamMemberRecord,
  rewards: LearnerRewardState | undefined,
  avatarSrc: string | undefined,
) {
  if (isRankedTeamMember(member.accountRole, true, member.disabled)) {
    if (!rewards || rewards.level.totalXp !== member.totalXp) throw new TeamSocialDataError();
    return {
      id: member.id,
      displayName: member.displayName,
      initials: getAccountInitials(member.displayName),
      accountRole: member.accountRole,
      roleLabel: ACCOUNT_ROLE_LABELS[member.accountRole],
      teamRole: member.teamRole,
      avatarSrc,
      activeTitle: rewards.activeTitle,
      pinnedBadges: rewards.pinnedBadges,
      totalXp: rewards.level.totalXp,
      level: rewards.level.level,
    };
  }
  const titleState = deriveProfileTitleState({
    role: member.accountRole,
    selectedTitleId: member.activeTitleId,
  });
  const badgeState = deriveProfileBadgeState({
    role: member.accountRole,
    pinnedBadgeIds: member.pinnedBadgeIds,
  });
  return {
    id: member.id,
    displayName: member.displayName,
    initials: getAccountInitials(member.displayName),
    accountRole: member.accountRole,
    roleLabel: ACCOUNT_ROLE_LABELS[member.accountRole],
    teamRole: member.teamRole,
    avatarSrc,
    activeTitle: titleState?.activeTitle,
    pinnedBadges: badgeState?.pinnedBadges ?? [] as readonly RewardCollectionItem[],
    totalXp: 0,
    level: undefined,
  };
}

async function getSocialAvatarSources(userIds: readonly string[]) {
  const result = new Map<string, string>();
  let storage: LocalFilesystemProfileImageStorage;
  try {
    storage = new LocalFilesystemProfileImageStorage();
  } catch {
    return result;
  }
  await Promise.all(userIds.map(async (userId) => {
    const info = await storage.metadata(userId);
    if (info) result.set(userId, socialAvatarSrc(userId, info));
  }));
  return result;
}

async function getSocialAvatarSource(userId: string) {
  return (await getSocialAvatarSources([userId])).get(userId);
}

function socialAvatarSrc(userId: string, info: StoredProfileImageInfo) {
  return `/api/community/avatar/${encodeURIComponent(userId)}?v=${encodeURIComponent(info.version)}`;
}

export class TeamVisibilityError extends Error {
  constructor() {
    super("The team is unavailable to the current user.");
    this.name = "TeamVisibilityError";
  }
}

export class SocialProfileVisibilityError extends Error {
  constructor() {
    super("The social profile is unavailable to the current user.");
    this.name = "SocialProfileVisibilityError";
  }
}

export class TeamSocialDataError extends Error {
  constructor() {
    super("Social progression data is inconsistent with canonical XP data.");
    this.name = "TeamSocialDataError";
  }
}
