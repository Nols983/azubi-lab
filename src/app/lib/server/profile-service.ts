import "server-only";

import {
  buildLearnerProfileSummary,
  buildPrivateProfileAccount,
  getProfileQuickLinks,
  type LearnerProfileSummary,
  type PrivateProfileAccount,
  type ProfileQuickLink,
  type ProfileAvatarView,
  type ShellProfileView,
} from "../profile.ts";
import { ACCOUNT_ROLE_LABELS } from "../auth-types.ts";
import { canSelectAnyProfileBadge, canSelectAnyProfileTitle } from "../authorization.ts";
import {
  deriveProfileBadgeState,
  deriveProfileTitleState,
  type ProfileBadgeState,
  type ProfileTitleState,
} from "../progression-rewards.ts";
import { getCurrentDatabaseUser, requireAuthenticatedUser } from "./current-user.ts";
import { getOwnProfileImageInfo } from "./profile-image.ts";
import { readProfilePreferences } from "./profile-preference-repository.ts";
import { readLearnerProgress } from "./progress-repository.ts";
import { getLearnerRewardState } from "./reward-service.ts";

export type CurrentProfileView = {
  account: PrivateProfileAccount;
  avatar: ProfileAvatarView;
  quickLinks: readonly ProfileQuickLink[];
  learnerSummary?: LearnerProfileSummary;
  rewards?: Awaited<ReturnType<typeof getLearnerRewardState>>;
  badgeState?: ProfileBadgeState;
  titleState?: ProfileTitleState;
};

export async function getCurrentProfileView(): Promise<CurrentProfileView> {
  const user = await requireAuthenticatedUser();
  const account = buildPrivateProfileAccount({
    displayName: user.displayName,
    login: user.login,
    role: user.role,
    createdAt: user.createdAt,
  });
  const quickLinks = getProfileQuickLinks(user.role);

  if (user.role !== "learner") {
    if (!canSelectAnyProfileTitle(user.role) && !canSelectAnyProfileBadge(user.role)) {
      return { account, quickLinks, avatar: await getOwnProfileImageInfo(user.id) ?? {} };
    }
    const [avatar, preferences] = await Promise.all([
      getOwnProfileImageInfo(user.id),
      readProfilePreferences(user.id),
    ]);
    return {
      account,
      quickLinks,
      avatar: avatar ?? {},
      badgeState: deriveProfileBadgeState({
        role: user.role,
        pinnedBadgeIds: preferences.pinnedBadgeIds,
      }),
      titleState: deriveProfileTitleState({
        role: user.role,
        selectedTitleId: preferences.activeTitleId,
      }),
    };
  }

  const [progress, rewards, avatar] = await Promise.all([
    readLearnerProgress(user.id),
    getLearnerRewardState(user.id),
    getOwnProfileImageInfo(user.id),
  ]);
  return {
    account,
    avatar: avatar ?? {},
    quickLinks,
    learnerSummary: buildLearnerProfileSummary(progress, rewards.level),
    rewards,
    badgeState: deriveProfileBadgeState({ role: user.role, learnerRewards: rewards }),
    titleState: deriveProfileTitleState({ role: user.role, learnerRewards: rewards }),
  };
}

export async function getCurrentShellProfileView(): Promise<ShellProfileView | undefined> {
  if (!process.env.AUTH_SECRET) return undefined;
  const user = await getCurrentDatabaseUser();
  if (!user || user.mustChangePassword) return undefined;
  const avatarPromise = getOwnProfileImageInfo(user.id);
  if (user.role !== "learner") {
    const roleLabel = ACCOUNT_ROLE_LABELS[user.role];
    if (!canSelectAnyProfileTitle(user.role)) {
      return { avatar: await avatarPromise ?? {}, roleLabel };
    }
    const [avatar, preferences] = await Promise.all([
      avatarPromise,
      readProfilePreferences(user.id),
    ]);
    const titleState = deriveProfileTitleState({
      role: user.role,
      selectedTitleId: preferences.activeTitleId,
    });
    return {
      avatar: avatar ?? {},
      roleLabel,
      activeTitle: titleState?.activeTitle?.displayName,
    };
  }
  const [avatar, rewards] = await Promise.all([avatarPromise, getLearnerRewardState(user.id)]);
  return {
    avatar: avatar ?? {},
    roleLabel: ACCOUNT_ROLE_LABELS.learner,
    activeTitle: rewards.activeTitle?.displayName,
    xp: rewards.level,
    nextMilestones: rewards.nextMilestones,
  };
}

export class ProfileDataError extends Error {
  constructor() {
    super("The authenticated learner profile could not resolve canonical XP data.");
    this.name = "ProfileDataError";
  }
}
