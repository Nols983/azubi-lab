import "server-only";

import {
  deduplicateNotificationCandidates,
  isSafeInternalNotificationHref,
  type NotificationCandidate,
  type NotificationType,
} from "../notification-domain.ts";
import { getDatabasePool } from "./db.ts";
import type { PoolClient } from "pg";

export const NOTIFICATION_LIST_LIMIT = 50;

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  createdAt: Date;
  readAt: Date | null;
};

export type InsertedNotificationRecord = NotificationRecord & {
  userId: string;
};

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  created_at: Date;
  read_at: Date | null;
};

type InsertedNotificationRow = NotificationRow & {
  user_id: string;
};

export async function insertNotificationCandidates(candidates: readonly NotificationCandidate[]) {
  return insertNotificationCandidatesUsing(getDatabasePool(), candidates);
}

export async function insertNotificationCandidatesWithClient(
  client: PoolClient,
  candidates: readonly NotificationCandidate[],
) {
  return insertNotificationCandidatesUsing(client, candidates);
}

async function insertNotificationCandidatesUsing(
  queryable: Pick<PoolClient, "query">,
  candidates: readonly NotificationCandidate[],
) {
  const unique = deduplicateNotificationCandidates(candidates);
  if (unique.length === 0) return { attempted: 0, inserted: 0, notifications: [] as InsertedNotificationRecord[] };
  if (unique.some((candidate) => !isSafeInternalNotificationHref(candidate.href))) {
    throw new Error("Unsafe notification href rejected.");
  }
  const result = await queryable.query<InsertedNotificationRow>(
    `INSERT INTO notifications
       (user_id, type, title, message, href, dedupe_key, created_at)
     SELECT input.user_id, input.type, input.title, input.message, input.href,
            input.dedupe_key, COALESCE(input.created_at, now())
     FROM unnest(
       $1::uuid[], $2::text[], $3::text[], $4::text[],
       $5::text[], $6::text[], $7::timestamptz[]
     ) AS input(user_id, type, title, message, href, dedupe_key, created_at)
     ON CONFLICT (user_id, dedupe_key) DO NOTHING
     RETURNING id, user_id, type, title, message, href, created_at, read_at`,
    [
      unique.map((candidate) => candidate.userId),
      unique.map((candidate) => candidate.type),
      unique.map((candidate) => candidate.title),
      unique.map((candidate) => candidate.message),
      unique.map((candidate) => candidate.href),
      unique.map((candidate) => candidate.dedupeKey),
      unique.map((candidate) => candidate.createdAt ?? null),
    ],
  );
  return {
    attempted: unique.length,
    inserted: result.rows.length,
    notifications: result.rows.map(mapInsertedNotification),
  };
}

export async function listNotificationsForUser(userId: string, limit = NOTIFICATION_LIST_LIMIT) {
  const safeLimit = Math.max(1, Math.min(NOTIFICATION_LIST_LIMIT, Math.trunc(limit)));
  const result = await getDatabasePool().query<NotificationRow>(
    `SELECT id, type, title, message, href, created_at, read_at
     FROM notifications
     WHERE user_id = $1 AND dismissed_at IS NULL
     ORDER BY (read_at IS NOT NULL) ASC, created_at DESC, id DESC
     LIMIT $2`,
    [userId, safeLimit],
  );
  return result.rows.map(mapNotification);
}

export async function countUnreadNotificationsForUser(userId: string) {
  const result = await getDatabasePool().query<{ count: string }>(
    `SELECT count(*)
     FROM notifications
     WHERE user_id = $1 AND read_at IS NULL AND dismissed_at IS NULL`,
    [userId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function markNotificationReadForUser(notificationId: string, userId: string) {
  const result = await getDatabasePool().query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, now())
     WHERE id = $1 AND user_id = $2 AND dismissed_at IS NULL`,
    [notificationId, userId],
  );
  return Boolean(result.rowCount);
}

export async function markVisibleNotificationsReadForUser(userId: string) {
  const result = await getDatabasePool().query(
    `WITH visible AS (
       SELECT id
       FROM notifications
       WHERE user_id = $1 AND dismissed_at IS NULL
       ORDER BY (read_at IS NOT NULL) ASC, created_at DESC, id DESC
       LIMIT $2
     )
     UPDATE notifications notification
     SET read_at = COALESCE(notification.read_at, now())
     FROM visible
     WHERE notification.id = visible.id AND notification.user_id = $1`,
    [userId, NOTIFICATION_LIST_LIMIT],
  );
  return result.rowCount ?? 0;
}

export async function dismissNotificationForUser(notificationId: string, userId: string) {
  const result = await getDatabasePool().query(
    `UPDATE notifications
     SET dismissed_at = COALESCE(dismissed_at, now())
     WHERE id = $1 AND user_id = $2 AND dismissed_at IS NULL`,
    [notificationId, userId],
  );
  return Boolean(result.rowCount);
}

function mapNotification(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    href: row.href,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

function mapInsertedNotification(row: InsertedNotificationRow): InsertedNotificationRecord {
  return { ...mapNotification(row), userId: row.user_id };
}
