import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { getDatabasePool } from "../src/app/lib/server/db.ts";
import {
  deleteWebPushSubscriptionForUser,
  hasWebPushSubscriptionForUser,
  listWebPushSubscriptionsForUser,
  upsertWebPushSubscriptionForUser,
  WebPushSubscriptionOwnershipError,
} from "../src/app/lib/server/web-push-repository.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const prefix = `web-push-db-${suffix}`;
const userIds: string[] = [];
const p256dh = base64UrlKey(65, 4);
const auth = base64UrlKey(16, 1);

try {
  const migration = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations WHERE filename = '0014_web_push_subscriptions.sql'",
  );
  assert.equal(migration.rows[0]?.filename, "0014_web_push_subscriptions.sql");

  const userA = await insertUser(`${prefix}-a`, "Web Push A");
  const userB = await insertUser(`${prefix}-b`, "Web Push B");
  const endpointA = `https://fcm.googleapis.com/fcm/send/${suffix}-a`;
  const endpointB = `https://updates.push.services.mozilla.com/wpush/v2/${suffix}-b`;

  await upsertWebPushSubscriptionForUser(userA, { endpoint: endpointA, p256dh, auth });
  await upsertWebPushSubscriptionForUser(userA, { endpoint: endpointA, p256dh, auth });
  assert.equal(await subscriptionCount(endpointA), 1, "same endpoint must remain unique");
  assert.equal(await hasWebPushSubscriptionForUser(userA, endpointA), true);
  assert.equal(await hasWebPushSubscriptionForUser(userB, endpointA), false);

  await assert.rejects(
    () => upsertWebPushSubscriptionForUser(userB, { endpoint: endpointA, p256dh, auth }),
    WebPushSubscriptionOwnershipError,
  );
  assert.equal((await listWebPushSubscriptionsForUser(userA)).length, 1);
  assert.equal((await listWebPushSubscriptionsForUser(userB)).length, 0);
  assert.equal(await deleteWebPushSubscriptionForUser(userB, endpointA), false);
  assert.equal(await subscriptionCount(endpointA), 1);

  await upsertWebPushSubscriptionForUser(userA, { endpoint: endpointB, p256dh, auth });
  assert.equal((await listWebPushSubscriptionsForUser(userA)).length, 2, "multiple devices per user must be supported");
  assert.equal(await deleteWebPushSubscriptionForUser(userA, endpointA), true);
  assert.equal(await hasWebPushSubscriptionForUser(userA, endpointA), false);

  await pool.query("DELETE FROM users WHERE id = $1", [userA]);
  userIds.splice(userIds.indexOf(userA), 1);
  assert.equal(await subscriptionCount(endpointB), 0, "user deletion must cascade to subscriptions");

  await assert.rejects(
    () => pool.query(
      `INSERT INTO web_push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, 'http://push.example.test/unsafe', $2, $3)`,
      [userB, p256dh, auth],
    ),
    (error: unknown) => postgresCode(error) === "23514",
  );

  console.log("Web Push subscription database integration: PASS");
} finally {
  if (userIds.length > 0) await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  assert.equal(Number((await pool.query("SELECT count(*) FROM users WHERE login_identifier LIKE $1", [`${prefix}%`])).rows[0].count), 0);
  await pool.end();
}

async function insertUser(login: string, displayName: string) {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role)
     VALUES ($1, $2, 'web-push-test-hash', 'learner')
     RETURNING id`,
    [login, displayName],
  );
  const id = result.rows[0].id;
  userIds.push(id);
  return id;
}

async function subscriptionCount(endpoint: string) {
  return Number((await pool.query<{ count: string }>(
    "SELECT count(*) FROM web_push_subscriptions WHERE endpoint = $1",
    [endpoint],
  )).rows[0].count);
}

function base64UrlKey(bytes: number, firstByte: number) {
  const value = Buffer.alloc(bytes);
  value[0] = firstByte;
  return value.toString("base64url");
}

function postgresCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
}
