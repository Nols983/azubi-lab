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
const loginPrefix = `planning-action-${suffix}`;
const userIds: string[] = [];

try {
  const admin = await insertLoginUser(`${loginPrefix}-admin`, "Planning Action Admin", "admin");
  const instructor = await insertLoginUser(`${loginPrefix}-instructor`, "Planning Action Instructor", "instructor");
  const learnerA = await insertLoginUser(`${loginPrefix}-a`, "Planning Action Learner A", "learner");
  const learnerB = await insertLoginUser(`${loginPrefix}-b`, "Planning Action Learner B", "learner");
  const forcedAdmin = await insertLoginUser(`${loginPrefix}-forced`, "Planning Forced Admin", "admin", true);
  const staleAdmin = await insertLoginUser(`${loginPrefix}-stale`, "Planning Stale Admin", "admin");
  const disabledAdmin = await insertLoginUser(`${loginPrefix}-disabled`, "Planning Disabled Admin", "admin");
  const adminCookie = await login(admin.login, admin.password);
  const instructorCookie = await login(instructor.login, instructor.password);
  const learnerACookie = await login(learnerA.login, learnerA.password);
  const forcedAdminCookie = await login(forcedAdmin.login, forcedAdmin.password);
  const staleAdminCookie = await login(staleAdmin.login, staleAdmin.password);
  const disabledAdminCookie = await login(disabledAdmin.login, disabledAdmin.password);

  const compilationResponses = await Promise.all([
    "/admin",
    `/admin/lernende/${learnerA.id}`,
    "/admin/lerninhalte",
    "/admin/lerninhalte/dns",
    "/lernplan",
  ].map((path) => fetch(`${baseUrl}${path}`, { redirect: "manual" })));
  assert.equal(compilationResponses.every((response) => response.status < 500), true);

  const manifest = JSON.parse(await readFile(new URL("../.next/dev/server/server-reference-manifest.json", import.meta.url), "utf8")) as {
    node: Record<string, { exportedName?: string }>;
  };
  const actionId = (name: string) => {
    const entry = Object.entries(manifest.node).find(([, value]) => value.exportedName === name);
    assert.ok(entry, `Missing server action ${name}`);
    return entry[0];
  };
  const assignId = actionId("assignCurriculumModulesAction");
  const updateId = actionId("updateCurriculumAssignmentAction");
  const archiveId = actionId("archiveCurriculumAssignmentAction");

  assert.match(await invokeAction("", `/admin/lernende/${learnerA.id}`, assignId, [learnerA.id, idleState(), assignmentForm(["dns"], futureTarget(), "Anonym")]), /aktuelles Administrationskonto/);
  assert.match(await invokeAction(learnerACookie, `/admin/lernende/${learnerA.id}`, assignId, [learnerA.id, idleState(), assignmentForm(["dns"], futureTarget(), "Lernender")]), /aktuelles Administrationskonto/);
  assert.match(await invokeAction(forcedAdminCookie, `/admin/lernende/${learnerA.id}`, assignId, [learnerA.id, idleState(), assignmentForm(["dns"], futureTarget(), "Erzwungen")]), /aktuelles Administrationskonto/);

  await pool.query("UPDATE users SET auth_version = auth_version + 1 WHERE id = $1", [staleAdmin.id]);
  assert.match(await invokeAction(staleAdminCookie, `/admin/lernende/${learnerA.id}`, assignId, [learnerA.id, idleState(), assignmentForm(["dns"], futureTarget(), "Veraltet")]), /aktuelles Administrationskonto/);
  await pool.query("UPDATE users SET disabled_at = now(), auth_version = auth_version + 1 WHERE id = $1", [disabledAdmin.id]);
  assert.match(await invokeAction(disabledAdminCookie, `/admin/lernende/${learnerA.id}`, assignId, [learnerA.id, idleState(), assignmentForm(["dns"], futureTarget(), "Gesperrt")]), /aktuelles Administrationskonto/);

  assert.match(await invokeAction(adminCookie, `/admin/lernende/${learnerA.id}`, assignId, [learnerA.id, idleState(), assignmentForm(["dns-fehleranalyse"], futureTarget(), "Manipuliert")]), /kanonischen Lehrplan|gültiges kanonisches Lernmodul/);
  assert.match(await invokeAction(adminCookie, `/admin/lernende/${admin.id}`, assignId, [admin.id, idleState(), assignmentForm(["dns"], futureTarget(), "Rollenmanipulation")]), /kein Lernkonto/);
  assert.match(await invokeAction(adminCookie, `/admin/lernende/${learnerA.id}`, assignId, [learnerA.id, idleState(), assignmentForm(["dns"], "malformed", "Ungültiges Datum")]), /Zieltermin/);
  assert.match(await invokeAction(adminCookie, `/admin/lernende/${learnerA.id}`, assignId, [learnerA.id, idleState(), assignmentForm(["dns"], futureTarget(), "x".repeat(1001))]), /Hinweis|markierten/);
  const unexpected = assignmentForm(["dns"], futureTarget(), "Unerwartet");
  unexpected.set("assignedBy", learnerA.id);
  unexpected.set("learnerRole", "admin");
  assert.match(await invokeAction(adminCookie, `/admin/lernende/${learnerA.id}`, assignId, [learnerA.id, idleState(), unexpected]), /unerwartete Felder/);

  const past = new Date(Date.now() - 86_400_000);
  const assignResponse = await invokeAction(instructorCookie, `/admin/lernende/${learnerA.id}`, assignId, [learnerA.id, idleState(), assignmentForm(["dns", "subnetting"], past, "Zwei geplante Module")]);
  assert.match(assignResponse, /2 Module wurden/);
  let assignments = (await pool.query<{ id: string; module_slug: string; target_at: Date | null; note: string | null; assigned_by: string; archived_at: Date | null }>(
    "SELECT id, module_slug, target_at, note, assigned_by, archived_at FROM curriculum_assignments WHERE learner_id = $1 ORDER BY module_slug",
    [learnerA.id],
  )).rows;
  assert.equal(assignments.length, 2);
  assert.equal(assignments.every((assignment) => assignment.assigned_by === instructor.id), true);
  assert.equal(assignments.every((assignment) => assignment.note === "Zwei geplante Module"), true);
  const assignmentNotifications = (await pool.query<{ type: string; href: string; message: string }>(
    `SELECT type, href, message
     FROM notifications
     WHERE user_id = $1 AND type = 'curriculum-assigned'
     ORDER BY created_at, id`,
    [learnerA.id],
  )).rows;
  assert.equal(assignmentNotifications.length, 2, "each committed curriculum assignment receives one in-app notification");
  assert.equal(assignmentNotifications.every((notification) => notification.href === "/lernplan"), true);
  assert.equal(assignmentNotifications.some((notification) => notification.message.includes("DNS")), true);
  assert.equal(assignmentNotifications.some((notification) => notification.message.includes("Subnetting")), true);
  assert.match(await invokeAction(adminCookie, `/admin/lernende/${learnerA.id}`, assignId, [learnerA.id, idleState(), assignmentForm(["dns"], futureTarget(), "Doppelt")]), /bereits aktiv zugewiesen/);

  await pool.query(
    `INSERT INTO lesson_progress
       (user_id, module_slug, lesson_slug, status, first_opened_at, updated_at, completed_at)
     VALUES ($1, 'dns', 'was-ist-dns', 'completed', now(), now(), now())`,
    [learnerA.id],
  );
  const progressBefore = await progressCounts(learnerA.id);
  const dnsAssignment = assignments.find((assignment) => assignment.module_slug === "dns");
  assert.ok(dnsAssignment);
  const updatedTarget = futureTarget();
  assert.match(await invokeAction(instructorCookie, `/admin/lernende/${learnerA.id}`, updateId, [dnsAssignment.id, idleState(), updateForm(updatedTarget, "Aktualisierter Hinweis")]), /aktualisiert/);
  assignments = (await pool.query("SELECT id, module_slug, target_at, note, assigned_by, archived_at FROM curriculum_assignments WHERE learner_id = $1 ORDER BY module_slug", [learnerA.id])).rows;
  const updatedDns = assignments.find((assignment) => assignment.module_slug === "dns");
  assert.ok(updatedDns);
  assert.ok(updatedDns.target_at);
  assert.equal(updatedDns.note, "Aktualisierter Hinweis");
  assert.equal(new Date(updatedDns.target_at).toISOString(), updatedTarget.toISOString());

  assert.match(await invokeAction(learnerACookie, `/admin/lernende/${learnerA.id}`, updateId, [dnsAssignment.id, idleState(), updateForm(updatedTarget, "Fremd")]), /aktuelles Administrationskonto/);
  assert.match(await invokeAction(learnerACookie, `/admin/lernende/${learnerA.id}`, archiveId, [dnsAssignment.id, idleState(), new FormData()]), /aktuelles Administrationskonto/);
  assert.match(await invokeAction(instructorCookie, `/admin/lernende/${learnerA.id}`, archiveId, [dnsAssignment.id, idleState(), new FormData()]), /Lernfortschritt bleibt erhalten/);
  assert.ok((await pool.query<{ archived_at: Date | null }>("SELECT archived_at FROM curriculum_assignments WHERE id = $1", [dnsAssignment.id])).rows[0].archived_at);
  assert.deepEqual(await progressCounts(learnerA.id), progressBefore);

  await pool.query("UPDATE users SET disabled_at = now() WHERE id = $1", [learnerB.id]);
  assert.match(await invokeAction(adminCookie, `/admin/lernende/${learnerB.id}`, assignId, [learnerB.id, idleState(), assignmentForm(["dhcp"], futureTarget(), "Gesperrtes Ziel")]), /gesperrt/);
  assert.equal(Number((await pool.query("SELECT count(*) FROM curriculum_assignments WHERE learner_id = $1", [learnerB.id])).rows[0].count), 0);

  const learnerPlanResponse = await fetch(`${baseUrl}/lernplan?userId=${learnerB.id}`, { headers: { cookie: learnerACookie } });
  const learnerPlanBody = await learnerPlanResponse.text();
  assert.equal(learnerPlanResponse.status, 200);
  assert.match(learnerPlanBody, /Subnetting/);
  assert.doesNotMatch(learnerPlanBody, /Planning Action Learner B/);
  const learnerReportResponse = await fetch(`${baseUrl}/admin/lerninhalte`, { headers: { cookie: learnerACookie } });
  const learnerReportBody = await learnerReportResponse.text();
  assert.match(learnerReportBody, /Keine Administrationsberechtigung/);
  assert.doesNotMatch(learnerReportBody, /Planning Action Learner B/);
  const learnerDetailResponse = await fetch(`${baseUrl}/admin/lernende/${learnerB.id}`, { headers: { cookie: learnerACookie } });
  assert.match(await learnerDetailResponse.text(), /Keine Administrationsberechtigung/);
  const unknownModule = await fetch(`${baseUrl}/admin/lerninhalte/unbekannt`, { headers: { cookie: adminCookie }, redirect: "manual" });
  assert.equal(unknownModule.status, 404);
  const learnerModuleReport = await fetch(`${baseUrl}/admin/lerninhalte/dns`, { headers: { cookie: learnerACookie } });
  assert.match(await learnerModuleReport.text(), /Keine Administrationsberechtigung/);
  const anonymousPlan = await fetch(`${baseUrl}/lernplan`, { redirect: "manual" });
  assert.equal(anonymousPlan.status >= 300 && anonymousPlan.status < 400, true);

  console.log("Curriculum planning server-action authorization integration: PASS");
} finally {
  if (userIds.length > 0) {
    await pool.query("DELETE FROM curriculum_assignments WHERE learner_id = ANY($1::uuid[]) OR assigned_by = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM local_progress_imports WHERE user_id = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM lesson_progress WHERE user_id = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM quiz_progress WHERE user_id = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  }
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
  assert.ok(row);
  userIds.push(row.id);
  return { id: row.id, login, password };
}

function assignmentForm(moduleSlugs: readonly string[], targetAt: Date | string, note: string) {
  const form = new FormData();
  for (const moduleSlug of moduleSlugs) form.append("moduleSlugs", moduleSlug);
  form.set("targetAtLocal", typeof targetAt === "string" ? targetAt : "2026-09-01T14:00");
  form.set("targetAtIso", typeof targetAt === "string" ? targetAt : targetAt.toISOString());
  form.set("note", note);
  return form;
}

function updateForm(targetAt: Date, note: string) {
  const form = new FormData();
  form.set("targetAtLocal", "2026-09-01T14:00");
  form.set("targetAtIso", targetAt.toISOString());
  form.set("note", note);
  return form;
}

function idleState() { return { status: "idle", message: "" }; }
function futureTarget() { return new Date(Date.now() + 7 * 86_400_000); }

async function progressCounts(userId: string) {
  const result = await pool.query<{ lessons: string; quizzes: string }>(
    `SELECT (SELECT count(*) FROM lesson_progress WHERE user_id = $1) AS lessons,
            (SELECT count(*) FROM quiz_progress WHERE user_id = $1) AS quizzes`,
    [userId],
  );
  return { lessons: Number(result.rows[0].lessons), quizzes: Number(result.rows[0].quizzes) };
}

async function login(loginIdentifier: string, password: string) {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  assert.equal(csrfResponse.ok, true);
  const csrf = await csrfResponse.json() as { csrfToken: string };
  let cookie = responseCookies(csrfResponse).join("; ");
  const response = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie, origin: baseUrl },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, login: loginIdentifier, password, callbackUrl: `${baseUrl}/` }),
    redirect: "manual",
  });
  assert.equal(response.status >= 300 && response.status < 400, true);
  cookie = mergeCookies(cookie, responseCookies(response));
  assert.match(cookie, /authjs\.session-token=/);
  return cookie;
}

async function invokeAction(cookie: string, pathname: string, id: string, args: unknown[]) {
  const body = await encodeReply(args);
  const response = await fetch(`${baseUrl}${pathname}`, {
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
