import "server-only";

import { isUuid } from "../account-security.ts";
import { getCurrentDatabaseUser, requireAuthenticatedUser } from "./current-user.ts";
import {
  countUnreadNotificationsForUser,
  dismissNotificationForUser,
  listNotificationsForUser,
  markNotificationReadForUser,
  markVisibleNotificationsReadForUser,
} from "./notification-repository.ts";

export async function getNotificationCenter() {
  const user = await requireAuthenticatedUser();
  const [notifications, unreadCount] = await Promise.all([
    listNotificationsForUser(user.id),
    countUnreadNotificationsForUser(user.id),
  ]);
  return { user, notifications, unreadCount };
}

export async function getNotificationIndicatorView() {
  if (!process.env.AUTH_SECRET) return { unreadCount: 0 };
  const user = await getCurrentDatabaseUser();
  if (!user || user.mustChangePassword) return { unreadCount: 0 };
  return { unreadCount: await countUnreadNotificationsForUser(user.id) };
}

export async function getNotificationDashboardSummary() {
  if (!process.env.AUTH_SECRET) return { audience: "anonymous" as const };
  const user = await getCurrentDatabaseUser();
  if (!user) return { audience: "anonymous" as const };
  if (user.mustChangePassword) return { audience: "password-change" as const };
  const [notifications, unreadCount] = await Promise.all([
    listNotificationsForUser(user.id, 3),
    countUnreadNotificationsForUser(user.id),
  ]);
  return { audience: user.role, notifications, unreadCount } as const;
}

export async function markOwnNotificationRead(notificationId: string) {
  const user = await requireAuthenticatedUser();
  return isUuid(notificationId) && markNotificationReadForUser(notificationId, user.id);
}

export async function markOwnVisibleNotificationsRead() {
  const user = await requireAuthenticatedUser();
  return markVisibleNotificationsReadForUser(user.id);
}

export async function dismissOwnNotification(notificationId: string) {
  const user = await requireAuthenticatedUser();
  return isUuid(notificationId) && dismissNotificationForUser(notificationId, user.id);
}
