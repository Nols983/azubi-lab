import "server-only";

import type { ValidatedWebPushSubscription } from "../web-push-domain.ts";
import { getDatabasePool } from "./db.ts";

export type WebPushSubscriptionRecord = ValidatedWebPushSubscription & {
  id: string;
  userId: string;
};

type WebPushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export class WebPushSubscriptionOwnershipError extends Error {
  constructor() {
    super("The Web Push endpoint belongs to another account.");
    this.name = "WebPushSubscriptionOwnershipError";
  }
}

export async function upsertWebPushSubscriptionForUser(
  userId: string,
  subscription: ValidatedWebPushSubscription,
) {
  const result = await getDatabasePool().query<{ id: string }>(
    `INSERT INTO web_push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE
     SET p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         updated_at = clock_timestamp()
     WHERE web_push_subscriptions.user_id = EXCLUDED.user_id
     RETURNING id`,
    [userId, subscription.endpoint, subscription.p256dh, subscription.auth],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new WebPushSubscriptionOwnershipError();
  return id;
}

export async function hasWebPushSubscriptionForUser(userId: string, endpoint: string) {
  const result = await getDatabasePool().query(
    `SELECT 1
     FROM web_push_subscriptions
     WHERE user_id = $1 AND endpoint = $2
     LIMIT 1`,
    [userId, endpoint],
  );
  return Boolean(result.rowCount);
}

export async function deleteWebPushSubscriptionForUser(userId: string, endpoint: string) {
  const result = await getDatabasePool().query(
    `DELETE FROM web_push_subscriptions
     WHERE user_id = $1 AND endpoint = $2`,
    [userId, endpoint],
  );
  return Boolean(result.rowCount);
}

export async function deleteWebPushSubscriptionByIdForUser(userId: string, subscriptionId: string) {
  const result = await getDatabasePool().query(
    `DELETE FROM web_push_subscriptions
     WHERE user_id = $1 AND id = $2`,
    [userId, subscriptionId],
  );
  return Boolean(result.rowCount);
}

export async function listWebPushSubscriptionsForUser(userId: string) {
  const result = await getDatabasePool().query<WebPushSubscriptionRow>(
    `SELECT id, user_id, endpoint, p256dh, auth
     FROM web_push_subscriptions
     WHERE user_id = $1
     ORDER BY created_at ASC, id ASC`,
    [userId],
  );
  return result.rows.map(mapWebPushSubscription);
}

function mapWebPushSubscription(row: WebPushSubscriptionRow): WebPushSubscriptionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
  };
}
