import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { getDatabasePool } from "../src/app/lib/server/db.ts";
import { generateTemporaryPassword, hashPassword } from "../src/app/lib/server/password.ts";

const require = createRequire(import.meta.url);
const { encodeReply } = require("next/dist/compiled/react-server-dom-webpack/client.node") as {
  encodeReply(value: unknown): Promise<FormData | URLSearchParams | string>;
};

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const prefix = `notification-action-${suffix}`;
const userIds: string[] = [];

try {
  const admin = await insertLoginUser(`${prefix}-admin`, "Notification Action Admin", "admin");
  const learnerA = await insertLoginUser(`${prefix}-learner-a`, "Notification Action Learner A", "learner");
  const learnerB = await insertLoginUser(`${prefix}-learner-b`, "Notification Action Learner B", "learner");
  const forced = await insertLoginUser(`${prefix}-forced`, "Notification Forced User", "learner", true);
  const stale = await insertLoginUser(`${prefix}-stale`, "Notification Stale User", "learner");
  const disabled = await insertLoginUser(`${prefix}-disabled`, "Notification Disabled User", "learner");

  const learnerNotificationA = await insertNotification(learnerA.id, "Lernplan bald fällig", "curriculum-due:action-a:1d", "/lernplan");
  const learnerNotificationB = await insertNotification(learnerA.id, "Challenge bald fällig", "challenge-due:action-b:3d", "/challenges");
  const foreignNotification = await insertNotification(learnerB.id, "Nur für Lernkonto B", "challenge-due:foreign:1d", "/challenges");
  const adminNotification = await insertNotification(admin.id, "Trainer-internes Review", "challenge-review-pending:admin", "/admin/challenges");

  const adminCookie = await login(admin.login, admin.password);
  const learnerACookie = await login(learnerA.login, learnerA.password);
  const learnerBCookie = await login(learnerB.login, learnerB.password);
  const forcedCookie = await login(forced.login, forced.password);
  const staleCookie = await login(stale.login, stale.password);
  const disabledCookie = await login(disabled.login, disabled.password);

  const compile = await fetch(`${baseUrl}/benachrichtigungen`, { headers: { cookie: learnerACookie } });
  assert.equal(compile.status, 200);
  const initialBody = await compile.text();
  assert.match(initialBody, /Lernplan bald fällig/);
  assert.match(initialBody, /Challenge bald fällig/);
  assert.doesNotMatch(initialBody, /Nur für Lernkonto B/);
  assert.equal(await isUnread(learnerNotificationA), true, "opening the center must not auto-read");

  const manifest = JSON.parse(await readFile(new URL("../.next/dev/server/server-reference-manifest.json", import.meta.url), "utf8")) as {
    node: Record<string, { exportedName?: string }>;
  };
  const actionId = (name: string) => {
    const entry = Object.entries(manifest.node).find(([, value]) => value.exportedName === name);
    assert.ok(entry, `Missing server action ${name}`);
    return entry[0];
  };
  const markReadId = actionId("markNotificationReadAction");
  const markAllId = actionId("markAllVisibleNotificationsReadAction");
  const dismissId = actionId("dismissNotificationAction");

  assert.match(await invokeAction("", markReadId, [learnerNotificationA, idleState(), new FormData()]), /aktuelles angemeldetes Konto/);
  assert.match(await invokeAction(learnerBCookie, markReadId, [learnerNotificationA, idleState(), new FormData()]), /nicht gefunden/);
  assert.equal(await isUnread(learnerNotificationA), true);
  assert.match(await invokeAction(learnerACookie, markReadId, [learnerNotificationA, idleState(), new FormData()]), /als gelesen markiert/);
  assert.equal(await isUnread(learnerNotificationA), false);
  assert.equal(await isUnread(foreignNotification), true);

  assert.match(await invokeAction(learnerACookie, markAllId, [idleState(), new FormData()]), /sichtbaren Benachrichtigungen/);
  assert.equal(await isUnread(learnerNotificationB), false);
  assert.equal(await isUnread(foreignNotification), true);

  assert.match(await invokeAction(learnerACookie, dismissId, [learnerNotificationB, idleState(), new FormData()]), /ausgeblendet/);
  assert.equal(await isDismissed(learnerNotificationB), true);
  assert.match(await invokeAction(learnerBCookie, dismissId, [learnerNotificationA, idleState(), new FormData()]), /nicht gefunden/);
  assert.equal(await isDismissed(learnerNotificationA), false);

  assert.match(await invokeAction(adminCookie, markReadId, [adminNotification, idleState(), new FormData()]), /als gelesen markiert/);
  const adminPage = await fetch(`${baseUrl}/benachrichtigungen?userId=${learnerA.id}`, { headers: { cookie: adminCookie } });
  const adminBody = await adminPage.text();
  assert.match(adminBody, /Trainer-internes Review/);
  assert.doesNotMatch(adminBody, /Lernplan bald fällig/);

  const malformed = new FormData();
  malformed.set("userId", learnerB.id);
  assert.match(await invokeAction(learnerACookie, markReadId, [learnerNotificationA, idleState(), malformed]), /unerwartete Felder/);
  assert.match(await invokeAction(learnerACookie, markReadId, ["00000000-0000-4000-8000-000000000000", idleState(), new FormData()]), /nicht gefunden/);
  assert.match(await invokeAction(forcedCookie, markReadId, [learnerNotificationA, idleState(), new FormData()]), /aktuelles angemeldetes Konto/);

  await pool.query("UPDATE users SET auth_version = auth_version + 1 WHERE id = $1", [stale.id]);
  assert.match(await invokeAction(staleCookie, markAllId, [idleState(), new FormData()]), /aktuelles angemeldetes Konto/);
  await pool.query("UPDATE users SET disabled_at = now(), auth_version = auth_version + 1 WHERE id = $1", [disabled.id]);
  assert.match(await invokeAction(disabledCookie, markAllId, [idleState(), new FormData()]), /aktuelles angemeldetes Konto/);

  const anonymousPage = await fetch(`${baseUrl}/benachrichtigungen`, { redirect: "manual" });
  assert.equal(anonymousPage.status >= 300 && anonymousPage.status < 400, true);
  const unknownPage = await fetch(`${baseUrl}/benachrichtigungen/${learnerNotificationA}`, { headers: { cookie: learnerACookie }, redirect: "manual" });
  assert.equal(unknownPage.status, 404);

  console.log("Notification server-action authorization integration: PASS");
} finally {
  if (userIds.length > 0) {
    await pool.query("DELETE FROM notifications WHERE user_id = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  }
  assert.equal(Number((await pool.query("SELECT count(*) FROM users WHERE login_identifier LIKE $1", [`${prefix}%`])).rows[0].count), 0);
  await pool.end();
}

async function insertLoginUser(login: string, displayName: string, role: "admin" | "instructor" | "learner", mustChangePassword = false) {
  const password = generateTemporaryPassword(24);
  const passwordHash = await hashPassword(password);
  const row = (await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role, must_change_password)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [login, displayName, passwordHash, role, mustChangePassword],
  )).rows[0];
  userIds.push(row.id);
  return { id: row.id, login, password };
}

async function insertNotification(userId: string, title: string, dedupeKey: string, href: string) {
  return (await pool.query<{ id: string }>(
    `INSERT INTO notifications (user_id, type, title, message, href, dedupe_key)
     VALUES ($1, 'challenge-due', $2, 'Kontrollierter Benachrichtigungstext.', $3, $4) RETURNING id`,
    [userId, title, href, dedupeKey],
  )).rows[0].id;
}

async function isUnread(notificationId: string) {
  return (await pool.query<{ unread: boolean }>("SELECT read_at IS NULL AS unread FROM notifications WHERE id = $1", [notificationId])).rows[0].unread;
}

async function isDismissed(notificationId: string) {
  return (await pool.query<{ dismissed: boolean }>("SELECT dismissed_at IS NOT NULL AS dismissed FROM notifications WHERE id = $1", [notificationId])).rows[0].dismissed;
}

function idleState() { return { status: "idle", message: "" }; }

async function login(loginIdentifier: string, password: string) {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  assert.equal(csrfResponse.ok, true);
  const csrf = await csrfResponse.json() as { csrfToken: string };
  let cookie = responseCookies(csrfResponse).join("; ");
  const response = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie, origin: baseUrl },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, login: loginIdentifier, password, callbackUrl: `${baseUrl}/benachrichtigungen` }),
    redirect: "manual",
  });
  assert.equal(response.status >= 300 && response.status < 400, true);
  cookie = mergeCookies(cookie, responseCookies(response));
  assert.match(cookie, /authjs\.session-token=/);
  return cookie;
}

async function invokeAction(cookie: string, id: string, args: unknown[]) {
  const body = await encodeReply(args);
  const response = await fetch(`${baseUrl}/benachrichtigungen`, {
    method: "POST",
    headers: { Accept: "text/x-component", "Next-Action": id, cookie, origin: baseUrl },
    body,
  });
  assert.equal(response.ok, true);
  return response.text();
}

function responseCookies(response: Response) { return response.headers.getSetCookie().map((value) => value.split(";", 1)[0]); }
function mergeCookies(current: string, additions: string[]) {
  const values = new Map(current.split("; ").filter(Boolean).map((cookie) => [cookie.split("=", 1)[0], cookie]));
  for (const cookie of additions) values.set(cookie.split("=", 1)[0], cookie);
  return [...values.values()].filter(Boolean).join("; ");
}
