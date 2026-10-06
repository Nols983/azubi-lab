import "server-only";

import { isUuid } from "../account-security.ts";
import { canRemoveOtherUserAvatar } from "../authorization.ts";
import { getProfileInitials, type ProfileAvatarView } from "../profile.ts";
import {
  listAccountSummaries,
  type AccountSummaryRecord,
} from "./admin-repository.ts";
import { requireCapability } from "./current-user.ts";
import { withTransaction } from "./db.ts";
import {
  LocalFilesystemProfileImageStorage,
  type StoredProfileImageInfo,
} from "./profile-image.ts";
import { findDatabaseUserById } from "./user-repository.ts";

export const PROFILE_AVATAR_REMOVED_ACTION = "profile_avatar_removed";

export type AdminAccountAvatarView = AccountSummaryRecord & {
  initials: string;
  avatar: ProfileAvatarView;
};

export async function listAdminAccountAvatarViews(): Promise<readonly AdminAccountAvatarView[]> {
  await requireCapability("viewUserAvatars");
  const accounts = await listAccountSummaries();
  let storage: LocalFilesystemProfileImageStorage;
  try {
    storage = new LocalFilesystemProfileImageStorage();
  } catch {
    return accounts.map(withoutAvatar);
  }
  return Promise.all(accounts.map(async (account) => {
    const info = await storage.metadata(account.id);
    return {
      ...withoutAvatar(account),
      avatar: info ? { src: adminAvatarSrc(account.id, info) } : {},
    };
  }));
}

export async function readAccountAvatarAsAdmin(targetUserId: unknown) {
  await requireCapability("viewUserAvatars");
  const target = await resolveTarget(targetUserId);
  return new LocalFilesystemProfileImageStorage().read(target.id);
}

export async function removeAccountAvatarAsAdmin(targetUserId: unknown) {
  const moderator = await requireCapability("moderateUserAvatars");
  if (!isUuid(targetUserId)
    || !canRemoveOtherUserAvatar(moderator, { id: targetUserId })) {
    throw new AdminAvatarTargetError();
  }
  const storage = new LocalFilesystemProfileImageStorage();
  return withTransaction(async (client) => {
    const targetResult = await client.query<{ id: string; display_name: string }>(
      `SELECT id, display_name
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [targetUserId],
    );
    const target = targetResult.rows[0];
    if (!target) throw new AdminAvatarTargetError();
    const removed = await storage.delete(target.id);
    if (removed) {
      await client.query(
        `INSERT INTO avatar_moderation_events
           (moderator_user_id, target_user_id, action_type)
         VALUES ($1, $2, $3)`,
        [moderator.id, target.id, PROFILE_AVATAR_REMOVED_ACTION],
      );
    }
    return { removed, targetDisplayName: target.display_name };
  });
}

async function resolveTarget(targetUserId: unknown) {
  if (!isUuid(targetUserId)) throw new AdminAvatarTargetError();
  const target = await findDatabaseUserById(targetUserId);
  if (!target) throw new AdminAvatarTargetError();
  return target;
}

function withoutAvatar(account: AccountSummaryRecord): AdminAccountAvatarView {
  return {
    ...account,
    initials: getProfileInitials(account.displayName),
    avatar: {},
  };
}

function adminAvatarSrc(userId: string, info: StoredProfileImageInfo) {
  return `/api/admin/konten/${encodeURIComponent(userId)}/avatar?v=${encodeURIComponent(info.version)}`;
}

export class AdminAvatarTargetError extends Error {
  constructor() {
    super("The avatar moderation target is invalid or unavailable.");
    this.name = "AdminAvatarTargetError";
  }
}
