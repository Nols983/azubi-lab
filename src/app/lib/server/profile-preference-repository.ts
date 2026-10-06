import "server-only";

import { isUuid } from "../account-security.ts";
import { MAX_PINNED_BADGES } from "../progression-rewards.ts";
import { getDatabasePool } from "./db.ts";

const rewardIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export type ProfilePreferences = {
  activeTitleId?: string;
  pinnedBadgeIds: readonly string[];
};

export async function readProfilePreferences(userId: string): Promise<ProfilePreferences> {
  assertUserId(userId);
  const result = await getDatabasePool().query<{
    active_title_id: string | null;
    pinned_badge_ids: string[];
  }>(
    `SELECT active_title_id, pinned_badge_ids
     FROM profile_preferences
     WHERE user_id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) return { pinnedBadgeIds: [] };
  const activeTitleId = row.active_title_id ?? undefined;
  if ((activeTitleId && !isRewardId(activeTitleId))
    || !Array.isArray(row.pinned_badge_ids)
    || row.pinned_badge_ids.length > MAX_PINNED_BADGES
    || row.pinned_badge_ids.some((id) => !isRewardId(id))) throw new ProfilePreferenceDataError();
  return { activeTitleId, pinnedBadgeIds: row.pinned_badge_ids };
}

export async function readProfilePreferencesForUsers(userIds: readonly string[]) {
  const uniqueUserIds = [...new Set(userIds)];
  uniqueUserIds.forEach(assertUserId);
  const preferences = new Map<string, ProfilePreferences>(
    uniqueUserIds.map((userId) => [userId, { pinnedBadgeIds: [] }]),
  );
  if (uniqueUserIds.length === 0) return preferences;
  const result = await getDatabasePool().query<{
    user_id: string;
    active_title_id: string | null;
    pinned_badge_ids: string[];
  }>(
    `SELECT user_id, active_title_id, pinned_badge_ids
     FROM profile_preferences
     WHERE user_id = ANY($1::uuid[])`,
    [uniqueUserIds],
  );
  for (const row of result.rows) {
    const activeTitleId = row.active_title_id ?? undefined;
    if ((activeTitleId && !isRewardId(activeTitleId))
      || !Array.isArray(row.pinned_badge_ids)
      || row.pinned_badge_ids.length > MAX_PINNED_BADGES
      || row.pinned_badge_ids.some((id) => !isRewardId(id))) throw new ProfilePreferenceDataError();
    preferences.set(row.user_id, { activeTitleId, pinnedBadgeIds: row.pinned_badge_ids });
  }
  return preferences;
}

export async function saveActiveTitlePreference(userId: string, activeTitleId?: string) {
  assertUserId(userId);
  if (activeTitleId !== undefined && !isRewardId(activeTitleId)) throw new ProfilePreferenceDataError();
  await getDatabasePool().query(
    `INSERT INTO profile_preferences (user_id, active_title_id, updated_at)
     VALUES ($1, $2, clock_timestamp())
     ON CONFLICT (user_id) DO UPDATE
       SET active_title_id = EXCLUDED.active_title_id,
           updated_at = EXCLUDED.updated_at`,
    [userId, activeTitleId ?? null],
  );
}

export async function savePinnedBadgePreferences(userId: string, pinnedBadgeIds: readonly string[]) {
  assertUserId(userId);
  if (pinnedBadgeIds.length > MAX_PINNED_BADGES
    || new Set(pinnedBadgeIds).size !== pinnedBadgeIds.length
    || pinnedBadgeIds.some((id) => !isRewardId(id))) throw new ProfilePreferenceDataError();
  await getDatabasePool().query(
    `INSERT INTO profile_preferences (user_id, pinned_badge_ids, updated_at)
     VALUES ($1, $2::text[], clock_timestamp())
     ON CONFLICT (user_id) DO UPDATE
       SET pinned_badge_ids = EXCLUDED.pinned_badge_ids,
           updated_at = EXCLUDED.updated_at`,
    [userId, pinnedBadgeIds],
  );
}

function assertUserId(userId: string) {
  if (!isUuid(userId)) throw new ProfilePreferenceDataError();
}

function isRewardId(value: string) {
  return value.length >= 3 && value.length <= 80 && rewardIdPattern.test(value);
}

export class ProfilePreferenceDataError extends Error {
  constructor() {
    super("Profile preference data violates the application contract.");
    this.name = "ProfilePreferenceDataError";
  }
}
