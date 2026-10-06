import type { AccountRole } from "./auth-types.ts";

export const ACCOUNT_CAPABILITIES = [
  "manageChallenges",
  "reviewSubmissions",
  "viewLearnerProgress",
  "manageAssignments",
  "manageUsers",
  "manageRoles",
  "manageTeams",
  "resetPasswords",
  "selectAnyProfileTitle",
  "selectAnyProfileBadge",
  "viewUserAvatars",
  "moderateUserAvatars",
  "previewLearningContent",
  "previewLabs",
  "previewQuizzes",
  "previewIhkExam",
  "viewChallengeCatalogue",
  "viewPersonalProgress",
  "recordLearningProgress",
  "recordQuizAttempts",
  "readOnlyPlatformPreview",
] as const;

export type AccountCapability = (typeof ACCOUNT_CAPABILITIES)[number];

const roleCapabilities: Record<AccountRole, ReadonlySet<AccountCapability>> = {
  learner: new Set([
    "viewPersonalProgress",
    "recordLearningProgress",
    "recordQuizAttempts",
  ]),
  observer: new Set([
    "previewLearningContent",
    "previewLabs",
    "previewQuizzes",
    "previewIhkExam",
    "viewChallengeCatalogue",
    "readOnlyPlatformPreview",
  ]),
  instructor: new Set([
    "manageChallenges",
    "reviewSubmissions",
    "viewLearnerProgress",
    "manageAssignments",
    "previewLearningContent",
    "previewLabs",
    "previewQuizzes",
    "previewIhkExam",
    "viewChallengeCatalogue",
    "viewPersonalProgress",
    "recordLearningProgress",
    "recordQuizAttempts",
    "selectAnyProfileTitle",
    "selectAnyProfileBadge",
  ]),
  admin: new Set(ACCOUNT_CAPABILITIES.filter((capability) => capability !== "readOnlyPlatformPreview")),
};

export function hasCapability(role: AccountRole, capability: AccountCapability) {
  return roleCapabilities[role].has(capability);
}

export const canManageChallenges = (role: AccountRole) => hasCapability(role, "manageChallenges");
export const canReviewSubmissions = (role: AccountRole) => hasCapability(role, "reviewSubmissions");
export const canViewLearnerProgress = (role: AccountRole) => hasCapability(role, "viewLearnerProgress");
export const canManageAssignments = (role: AccountRole) => hasCapability(role, "manageAssignments");
export const canManageUsers = (role: AccountRole) => hasCapability(role, "manageUsers");
export const canManageRoles = (role: AccountRole) => hasCapability(role, "manageRoles");
export const canManageTeams = (role: AccountRole) => hasCapability(role, "manageTeams");
export const canResetPasswords = (role: AccountRole) => hasCapability(role, "resetPasswords");
export const canSelectAnyProfileTitle = (role: AccountRole) => hasCapability(role, "selectAnyProfileTitle");
export const canSelectAnyProfileBadge = (role: AccountRole) => hasCapability(role, "selectAnyProfileBadge");
export const canViewUserAvatars = (role: AccountRole) => hasCapability(role, "viewUserAvatars");
export const canModerateUserAvatars = (role: AccountRole) => hasCapability(role, "moderateUserAvatars");
export const canBypassLearningProgression = (role: AccountRole) => hasCapability(role, "previewLearningContent");
export const canPreviewLabs = (role: AccountRole) => hasCapability(role, "previewLabs");
export const canPreviewQuizzes = (role: AccountRole) => hasCapability(role, "previewQuizzes");
export const canPreviewIhkExam = (role: AccountRole) => hasCapability(role, "previewIhkExam");
export const canViewChallengeCatalogue = (role: AccountRole) => hasCapability(role, "viewChallengeCatalogue");
export const canViewPersonalProgress = (role: AccountRole) => hasCapability(role, "viewPersonalProgress");
export const canRecordLearningProgress = (role: AccountRole) => hasCapability(role, "recordLearningProgress");
export const canRecordQuizAttempts = (role: AccountRole) => hasCapability(role, "recordQuizAttempts");
export const isReadOnlyPlatformPreview = (role: AccountRole) => hasCapability(role, "readOnlyPlatformPreview");

export function canChangeAccountRole(
  actor: { id: string; role: AccountRole },
  target: { id: string },
) {
  return canManageRoles(actor.role) && actor.id !== target.id;
}

export function canManageAccountStatus(
  actor: { id: string; role: AccountRole },
  target: { id: string; role?: AccountRole },
) {
  return canManageUsers(actor.role) && actor.id !== target.id;
}

export function canRemoveOtherUserAvatar(
  actor: { id: string; role: AccountRole },
  target: { id: string },
) {
  return canModerateUserAvatars(actor.role) && actor.id !== target.id;
}
