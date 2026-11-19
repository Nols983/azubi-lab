import "server-only";

import { isUuid } from "../account-security.ts";
import { parseAccountDirectoryFilters, type AccountDirectorySearch } from "../account-directory.ts";
import { findDirectoryAccount, readAccountDirectory } from "./account-directory-repository.ts";
import { listAdminAccountAvatarViews, getAdminAccountAvatarView } from "./admin-avatar-service.ts";
import { requireCapability } from "./current-user.ts";
import { listTeamsForAdmin } from "./team-repository.ts";
import { inspectAccountDeletion, countPendingAccountFileCleanups } from "./account-deletion-repository.ts";

export async function getAccountDirectoryView(search: AccountDirectorySearch) {
  await requireCapability("manageUsers");
  const filters = parseAccountDirectoryFilters(search);
  const avatarIds = filters.withAvatar
    ? (await listAdminAccountAvatarViews()).filter((account) => account.avatar.src).map((account) => account.id)
    : undefined;
  const [directory, teams, pendingCleanups] = await Promise.all([readAccountDirectory(filters, avatarIds), listTeamsForAdmin(), countPendingAccountFileCleanups()]);
  return { ...directory, teams, pendingCleanups };
}

export async function getManagedAccountDetail(userId: unknown) {
  const actor = await requireCapability("manageUsers");
  if (!isUuid(userId)) return undefined;
  const account = await findDirectoryAccount(userId);
  if (!account) return undefined;
  const [avatar, teams, deletion] = await Promise.all([getAdminAccountAvatarView(account), listTeamsForAdmin(), inspectAccountDeletion(actor.id, account.id)]);
  return { account, avatar, deletion, availableTeams: teams.filter((team) => team.active && !account.teams.some((membership) => membership.id === team.id)) };
}
