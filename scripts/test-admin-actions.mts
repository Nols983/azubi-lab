import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { getDatabasePool } from "../src/app/lib/server/db.ts";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "../src/app/lib/server/password.ts";

const require = createRequire(import.meta.url);
const { encodeReply } = require("next/dist/compiled/react-server-dom-webpack/client.node") as {
  encodeReply(value: unknown): Promise<FormData | URLSearchParams | string>;
};

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const adminLogin = process.env.TEST_ADMIN_LOGIN;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;
if (!process.env.DATABASE_URL || !adminLogin || !adminPassword) {
  throw new Error("DATABASE_URL and TEST_ADMIN_LOGIN/TEST_ADMIN_PASSWORD are required.");
}

const compilationResponses = await Promise.all([
  "/admin/konten",
  "/admin/lernende/neu",
  "/admin/lernende/00000000-0000-4000-8000-000000000001",
  "/konto/passwort-aendern",
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

const createActionId = actionId("createLearnerAction");
const resetActionId = actionId("generatePasswordResetLinkAction");
const consumeResetActionId = actionId("resetPasswordAction");
const roleActionId = actionId("changeAccountRoleAction");
const statusActionId = actionId("setAccountDisabledAction");
const changePasswordActionId = actionId("changeForcedPasswordAction");
const pool = getDatabasePool();
const fixtureLogin = `action-test-${Date.now()}`;
const forbiddenFixtureLogin = `${fixtureLogin}-forbidden`;
const roleFixtureLogin = `${fixtureLogin}-role`;
const observerFixtureLogin = `${fixtureLogin}-observer`;

try {
  const adminCookie = await login(adminLogin, adminPassword);
  const target = (await pool.query<{ id: string; auth_version: number; disabled_at: Date | null }>(
    "SELECT id, auth_version, disabled_at FROM users WHERE role = 'learner' ORDER BY created_at LIMIT 1",
  )).rows[0];
  const admin = (await pool.query<{ id: string; auth_version: number; disabled_at: Date | null }>(
    "SELECT id, auth_version, disabled_at FROM users WHERE role = 'admin' AND login_identifier = $1",
    [adminLogin],
  )).rows[0];
  assert.ok(target && admin);

  const roleFixturePassword = generateTemporaryPassword(24);
  const roleFixture = (await pool.query<{ id: string; auth_version: number }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role)
     VALUES ($1, 'Action Role Candidate', $2, 'learner')
     RETURNING id, auth_version`,
    [roleFixtureLogin, await hashPassword(roleFixturePassword)],
  )).rows[0];
  const staleRoleCookie = await login(roleFixtureLogin, roleFixturePassword);
  const roleData = new FormData();
  roleData.set("role", "instructor");
  const roleResponse = await invokeAction(adminCookie, "/admin/konten", roleActionId, [roleFixture.id, { status: "idle", message: "" }, roleData]);
  assert.match(roleResponse, /Rolle wurde geändert/);
  const changedRole = (await pool.query<{ role: string; auth_version: number }>("SELECT role, auth_version FROM users WHERE id = $1", [roleFixture.id])).rows[0];
  assert.deepEqual(changedRole, { role: "instructor", auth_version: roleFixture.auth_version + 1 });
  const staleRolePage = await fetch(`${baseUrl}/admin`, { headers: { cookie: staleRoleCookie }, redirect: "manual" });
  assert.equal(staleRolePage.status >= 300 && staleRolePage.status < 400, true);
  const instructorCookie = await login(roleFixtureLogin, roleFixturePassword);
  const instructorDashboard = await fetch(`${baseUrl}/admin`, { headers: { cookie: instructorCookie } });
  assert.match(await instructorDashboard.text(), /Trainer-Dashboard[\s\S]*Skill-Matrix/);
  const instructorAccounts = await fetch(`${baseUrl}/admin/konten`, { headers: { cookie: instructorCookie } });
  assert.match(await instructorAccounts.text(), /Keine Administrationsberechtigung/);
  const instructorReset = await invokeAction(instructorCookie, `/admin/lernende/${target.id}`, resetActionId, [target.id, { status: "idle", message: "" }, new FormData()]);
  assert.match(instructorReset, /aktuelles Administrationskonto/);
  const forbiddenRoleData = new FormData();
  forbiddenRoleData.set("role", "admin");
  const instructorRoleChange = await invokeAction(instructorCookie, "/admin/konten", roleActionId, [target.id, { status: "idle", message: "" }, forbiddenRoleData]);
  assert.match(instructorRoleChange, /aktuelles Administrationskonto/);

  const instructorForbiddenStatusData = new FormData();
  instructorForbiddenStatusData.set("confirmed", "yes");
  const instructorStatusChange = await invokeAction(
    instructorCookie,
    "/admin/konten",
    statusActionId,
    [target.id, true, { status: "idle", message: "" }, instructorForbiddenStatusData],
  );
  assert.match(instructorStatusChange, /aktuelles Administrationskonto/);
  assert.doesNotMatch(instructorStatusChange, /bereits gesperrt|bereits aktiv/i);
  const instructorMissingTarget = await invokeAction(
    instructorCookie,
    "/admin/konten",
    statusActionId,
    ["00000000-0000-4000-8000-000000000001", true, { status: "idle", message: "" }, instructorForbiddenStatusData],
  );
  assert.match(instructorMissingTarget, /aktuelles Administrationskonto/);
  assert.doesNotMatch(instructorMissingTarget, /bereits gesperrt|bereits aktiv/i);

  const accountPage = await fetch(`${baseUrl}/admin/konten`, { headers: { cookie: adminCookie } });
  const accountPageText = await accountPage.text();
  assert.match(accountPageText, /Action Role Candidate/);
  assert.match(accountPageText, /Werkstattleiter/);
  assert.match(accountPageText, /Kontozugriff/);
  assert.match(accountPageText, /Konto sperren/);
  assert.match(accountPageText, /Das eigene Konto kann nicht gesperrt werden/);
  const trainerPage = await fetch(`${baseUrl}/admin`, { headers: { cookie: adminCookie } });
  const trainerPageText = await trainerPage.text();
  assert.match(trainerPageText, /Lernende/);
  assert.match(trainerPageText, /Skill-Matrix/);
  assert.doesNotMatch(trainerPageText, /Action Role Candidate/);

  const instructorBeforeStatus = await readSecurity(roleFixture.id);
  const missingConfirmation = await invokeAction(
    adminCookie,
    "/admin/konten",
    statusActionId,
    [roleFixture.id, true, { status: "idle", message: "" }, new FormData()],
  );
  assert.match(missingConfirmation, /Bestätige die Kontosperrung/);
  assert.equal((await readSecurity(roleFixture.id)).auth_version, instructorBeforeStatus.auth_version);

  const extraStatusData = new FormData();
  extraStatusData.set("confirmed", "yes");
  extraStatusData.set("role", "learner");
  const unexpectedStatusField = await invokeAction(
    adminCookie,
    "/admin/konten",
    statusActionId,
    [roleFixture.id, true, { status: "idle", message: "" }, extraStatusData],
  );
  assert.match(unexpectedStatusField, /nicht gefunden oder darf nicht geändert werden/);
  assert.equal((await readSecurity(roleFixture.id)).auth_version, instructorBeforeStatus.auth_version);

  const malformedDisabledValue = await invokeAction(
    adminCookie,
    "/admin/konten",
    statusActionId,
    [roleFixture.id, "true", { status: "idle", message: "" }, instructorForbiddenStatusData],
  );
  assert.match(malformedDisabledValue, /nicht gefunden oder darf nicht geändert werden/);

  const suspendInstructorData = new FormData();
  suspendInstructorData.set("confirmed", "yes");
  const suspendInstructor = await invokeAction(
    adminCookie,
    "/admin/konten",
    statusActionId,
    [roleFixture.id, true, { status: "idle", message: "" }, suspendInstructorData],
  );
  assert.match(suspendInstructor, /Das Konto wurde gesperrt/);
  let instructorSecurity = await readSecurity(roleFixture.id);
  assert.equal(instructorSecurity.auth_version, instructorBeforeStatus.auth_version + 1);
  assert.ok(instructorSecurity.disabled_at);
  assert.equal(instructorSecurity.role, "instructor");
  const alreadySuspendedInstructor = await invokeAction(
    adminCookie,
    "/admin/konten",
    statusActionId,
    [roleFixture.id, true, { status: "idle", message: "" }, suspendInstructorData],
  );
  assert.match(alreadySuspendedInstructor, /Das Konto war bereits gesperrt/);
  assert.equal((await readSecurity(roleFixture.id)).auth_version, instructorSecurity.auth_version);
  const staleInstructorPage = await fetch(`${baseUrl}/admin`, { headers: { cookie: instructorCookie }, redirect: "manual" });
  assert.equal(staleInstructorPage.status >= 300 && staleInstructorPage.status < 400, true);
  assert.equal(await tryLogin(roleFixtureLogin, roleFixturePassword), undefined);

  const suspendedInstructorReset = await invokeAction(
    adminCookie,
    "/admin/konten",
    resetActionId,
    [roleFixture.id, { status: "idle", message: "" }, new FormData()],
  );
  assert.match(suspendedInstructorReset, /nicht gefunden oder darf nicht geändert werden/);
  const suspendedAccountPage = await fetch(`${baseUrl}/admin/konten`, { headers: { cookie: adminCookie } });
  const suspendedAccountPageText = await suspendedAccountPage.text();
  assert.match(suspendedAccountPageText, /Gesperrt/);
  assert.match(suspendedAccountPageText, /Konto reaktivieren/);

  const reactivateInstructor = await invokeAction(
    adminCookie,
    "/admin/konten",
    statusActionId,
    [roleFixture.id, false, { status: "idle", message: "" }, new FormData()],
  );
  assert.match(reactivateInstructor, /Das Konto wurde wieder aktiviert/);
  instructorSecurity = await readSecurity(roleFixture.id);
  assert.equal(instructorSecurity.auth_version, instructorBeforeStatus.auth_version + 2);
  assert.equal(instructorSecurity.disabled_at, null);
  assert.equal(instructorSecurity.role, "instructor");
  const alreadyActiveInstructor = await invokeAction(
    adminCookie,
    "/admin/konten",
    statusActionId,
    [roleFixture.id, false, { status: "idle", message: "" }, new FormData()],
  );
  assert.match(alreadyActiveInstructor, /Das Konto war bereits aktiv/);
  assert.equal((await readSecurity(roleFixture.id)).auth_version, instructorSecurity.auth_version);
  const stillStaleInstructorPage = await fetch(`${baseUrl}/admin`, { headers: { cookie: instructorCookie }, redirect: "manual" });
  assert.equal(stillStaleInstructorPage.status >= 300 && stillStaleInstructorPage.status < 400, true);
  const reactivatedInstructorCookie = await login(roleFixtureLogin, roleFixturePassword);
  const reactivatedInstructorDashboard = await fetch(`${baseUrl}/admin`, { headers: { cookie: reactivatedInstructorCookie } });
  assert.match(await reactivatedInstructorDashboard.text(), /Trainer-Dashboard/);

  const observerRoleData = new FormData();
  observerRoleData.set("role", "observer");
  const observerRoleResponse = await invokeAction(adminCookie, "/admin/konten", roleActionId, [roleFixture.id, { status: "idle", message: "" }, observerRoleData]);
  assert.match(observerRoleResponse, /Rolle wurde geändert/);
  const observerRoleSecurity = await readSecurity(roleFixture.id);
  assert.equal(observerRoleSecurity.role, "observer");
  assert.equal(observerRoleSecurity.auth_version, instructorSecurity.auth_version + 1);
  const staleReactivatedInstructorPage = await fetch(`${baseUrl}/admin`, { headers: { cookie: reactivatedInstructorCookie }, redirect: "manual" });
  assert.equal(staleReactivatedInstructorPage.status >= 300 && staleReactivatedInstructorPage.status < 400, true);
  const observerCookie = await login(roleFixtureLogin, roleFixturePassword);
  assert.match(await (await fetch(`${baseUrl}/`, { headers: { cookie: observerCookie } })).text(), /Betrachtermodus/);
  assert.match(await (await fetch(`${baseUrl}/admin`, { headers: { cookie: observerCookie } })).text(), /Keine Administrationsberechtigung/);
  assert.match(await (await fetch(`${baseUrl}/admin/lernende/${target.id}`, { headers: { cookie: observerCookie } })).text(), /Keine Administrationsberechtigung/);
  const observerSelfRoleData = new FormData();
  observerSelfRoleData.set("role", "learner");
  const observerSelfRoleResponse = await invokeAction(observerCookie, "/admin/konten", roleActionId, [roleFixture.id, { status: "idle", message: "" }, observerSelfRoleData]);
  assert.match(observerSelfRoleResponse, /aktuelles Administrationskonto/);
  assert.deepEqual(await readSecurity(roleFixture.id), observerRoleSecurity);

  const allowedCreateData = new FormData();
  allowedCreateData.set("displayName", "Action Test Learner");
  allowedCreateData.set("login", fixtureLogin.toUpperCase());
  allowedCreateData.set("role", "learner");
  const allowedCreate = await invokeAction(
    adminCookie,
    "/admin/lernende/neu",
    createActionId,
    [{ status: "idle", message: "" }, allowedCreateData],
  );
  const initialPassword = readTemporaryPassword(allowedCreate);
  const created = (await pool.query<{
    id: string;
    login_identifier: string;
    role: string;
    must_change_password: boolean;
    password_hash: string;
    auth_version: number;
    disabled_at: Date | null;
  }>(
    `SELECT id, login_identifier, role, must_change_password, password_hash, auth_version, disabled_at
     FROM users WHERE login_identifier = $1`,
    [fixtureLogin],
  )).rows[0];
  assert.ok(created);
  assert.equal(created.login_identifier, fixtureLogin);
  assert.equal(created.role, "learner");
  assert.equal(created.must_change_password, true);
  assert.equal(created.auth_version, 1);
  assert.equal(created.disabled_at, null);
  assert.equal(await verifyPassword(initialPassword, created.password_hash), true);
  const learnerCookie = await login(fixtureLogin, initialPassword);

  const observerCreateData = new FormData();
  observerCreateData.set("displayName", "Action Test Observer");
  observerCreateData.set("login", observerFixtureLogin);
  observerCreateData.set("role", "observer");
  const observerCreate = await invokeAction(
    adminCookie,
    "/admin/lernende/neu",
    createActionId,
    [{ status: "idle", message: "" }, observerCreateData],
  );
  assert.match(observerCreate, /Betrachterkonto wurde angelegt/);
  const createdObserver = (await pool.query<{ role: string; must_change_password: boolean }>(
    "SELECT role, must_change_password FROM users WHERE login_identifier = $1",
    [observerFixtureLogin],
  )).rows[0];
  assert.deepEqual(createdObserver, { role: "observer", must_change_password: true });

  const forbiddenCreateData = new FormData();
  forbiddenCreateData.set("displayName", "Forbidden Learner");
  forbiddenCreateData.set("login", forbiddenFixtureLogin);
  forbiddenCreateData.set("role", "observer");
  const forbiddenCreate = await invokeAction(
    learnerCookie,
    "/admin/lernende/neu",
    createActionId,
    [{ status: "idle", message: "" }, forbiddenCreateData],
  );
  assert.match(forbiddenCreate, /aktuelles Administrationskonto/);
  assert.equal(Number((await pool.query("SELECT count(*) FROM users WHERE login_identifier = $1", [forbiddenFixtureLogin])).rows[0].count), 0);

  const disableData = new FormData();
  disableData.set("confirmed", "yes");
  const targetBefore = { ...target };
  const forbiddenDisable = await invokeAction(
    learnerCookie,
    `/admin/lernende/${target.id}`,
    statusActionId,
    [target.id, true, { status: "idle", message: "" }, disableData],
  );
  assert.match(forbiddenDisable, /aktuelles Administrationskonto/);
  const targetAfter = (await pool.query("SELECT auth_version, disabled_at FROM users WHERE id = $1", [target.id])).rows[0];
  assert.equal(targetAfter.auth_version, targetBefore.auth_version);
  assert.equal(targetAfter.disabled_at, targetBefore.disabled_at);

  const forbiddenReset = await invokeAction(
    learnerCookie,
    `/admin/lernende/${target.id}`,
    resetActionId,
    [target.id, { status: "idle", message: "" }, new FormData()],
  );
  assert.match(forbiddenReset, /aktuelles Administrationskonto/);

  const permanentPassword = generateTemporaryPassword(24);
  const changePasswordData = new FormData();
  changePasswordData.set("password", permanentPassword);
  changePasswordData.set("confirmation", permanentPassword);
  changePasswordData.set("callbackUrl", "/konto");
  await invokeAction(
    learnerCookie,
    "/konto/passwort-aendern",
    changePasswordActionId,
    [{ status: "idle", message: "" }, changePasswordData],
  );
  let security = await readSecurity(created.id);
  assert.equal(security.auth_version, 2);
  assert.equal(security.must_change_password, false);
  assert.equal(security.disabled_at, null);
  assert.ok(security.password_changed_at);
  assert.equal(await verifyPassword(permanentPassword, security.password_hash), true);
  assert.equal(await tryLogin(fixtureLogin, initialPassword), undefined);
  const changedPasswordCookie = await login(fixtureLogin, permanentPassword);

  const resetResponse = await invokeAction(
    adminCookie,
    `/admin/lernende/${created.id}`,
    resetActionId,
    [created.id, { status: "idle", message: "" }, new FormData()],
  );
  const resetToken = readResetToken(resetResponse);
  security = await readSecurity(created.id);
  assert.equal(security.auth_version, 2);
  assert.equal(security.must_change_password, false);
  assert.equal(await verifyPassword(permanentPassword, security.password_hash), true);

  const recoveredPassword = generateTemporaryPassword(24);
  const resetForm = new FormData();
  resetForm.set("token", resetToken);
  resetForm.set("password", recoveredPassword);
  resetForm.set("confirmation", recoveredPassword);
  await invokeAction(
    "",
    "/passwort-zuruecksetzen",
    consumeResetActionId,
    [{ status: "idle", message: "" }, resetForm],
  );
  security = await readSecurity(created.id);
  assert.equal(security.auth_version, 3);
  assert.equal(security.must_change_password, false);
  assert.equal(await verifyPassword(recoveredPassword, security.password_hash), true);
  assert.equal(await tryLogin(fixtureLogin, permanentPassword), undefined);
  const reusedReset = await invokeAction(
    "",
    "/passwort-zuruecksetzen",
    consumeResetActionId,
    [{ status: "idle", message: "" }, resetForm],
  );
  assert.match(reusedReset, /ungültig|abgelaufen|verwendet/);
  const resetPasswordCookie = await login(fixtureLogin, recoveredPassword);
  const stalePage = await fetch(`${baseUrl}/konto`, { headers: { cookie: changedPasswordCookie }, redirect: "manual" });
  assert.equal(stalePage.status >= 300 && stalePage.status < 400, true);
  const staleSessionResponse = await invokeAction(
    changedPasswordCookie,
    `/admin/lernende/${created.id}`,
    resetActionId,
    [created.id, { status: "idle", message: "" }, new FormData()],
  );
  assert.match(staleSessionResponse, /aktuelles Administrationskonto/);
  assert.equal((await readSecurity(created.id)).auth_version, 3);

  const confirmedDisableData = new FormData();
  confirmedDisableData.set("confirmed", "yes");
  const disableResponse = await invokeAction(
    adminCookie,
    `/admin/lernende/${created.id}`,
    statusActionId,
    [created.id, true, { status: "idle", message: "" }, confirmedDisableData],
  );
  assert.match(disableResponse, /Das Konto wurde gesperrt/);
  security = await readSecurity(created.id);
  assert.equal(security.auth_version, 4);
  assert.ok(security.disabled_at);
  assert.equal(await tryLogin(fixtureLogin, recoveredPassword), undefined);
  const disabledSessionResponse = await invokeAction(
    resetPasswordCookie,
    `/admin/lernende/${created.id}`,
    resetActionId,
    [created.id, { status: "idle", message: "" }, new FormData()],
  );
  assert.match(disabledSessionResponse, /aktuelles Administrationskonto/);

  const enableResponse = await invokeAction(
    adminCookie,
    `/admin/lernende/${created.id}`,
    statusActionId,
    [created.id, false, { status: "idle", message: "" }, new FormData()],
  );
  assert.match(enableResponse, /wieder aktiviert/);
  security = await readSecurity(created.id);
  assert.equal(security.auth_version, 5);
  assert.equal(security.disabled_at, null);
  await login(fixtureLogin, recoveredPassword);

  const selfDisable = await invokeAction(
    adminCookie,
    `/admin/lernende/${admin.id}`,
    statusActionId,
    [admin.id, true, { status: "idle", message: "" }, disableData],
  );
  assert.match(selfDisable, /nicht gefunden/);
  const adminAfter = (await pool.query("SELECT auth_version, disabled_at FROM users WHERE id = $1", [admin.id])).rows[0];
  assert.equal(adminAfter.auth_version, admin.auth_version);
  assert.equal(adminAfter.disabled_at, null);

  const missingStatus = await invokeAction(
    adminCookie,
    "/admin/konten",
    statusActionId,
    ["00000000-0000-4000-8000-000000000001", true, { status: "idle", message: "" }, disableData],
  );
  assert.match(missingStatus, /nicht gefunden oder darf nicht geändert werden/);

  const missingReset = await invokeAction(
    adminCookie,
    "/admin/lernende/00000000-0000-4000-8000-000000000001",
    resetActionId,
    ["00000000-0000-4000-8000-000000000001", { status: "idle", message: "" }, new FormData()],
  );
  assert.match(missingReset, /nicht gefunden/);

  console.log("Admin server-action authorization integration: PASS");
} finally {
  await pool.query("DELETE FROM users WHERE login_identifier = ANY($1::text[])", [[fixtureLogin, forbiddenFixtureLogin, roleFixtureLogin, observerFixtureLogin]]);
  await pool.end();
}

async function login(loginIdentifier: string, password: string) {
  const cookie = await tryLogin(loginIdentifier, password);
  assert.ok(cookie, `Expected successful login for ${loginIdentifier}`);
  return cookie;
}

async function tryLogin(loginIdentifier: string, password: string) {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  assert.equal(csrfResponse.ok, true);
  const csrf = await csrfResponse.json() as { csrfToken: string };
  let cookie = responseCookies(csrfResponse).join("; ");
  const body = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    login: loginIdentifier,
    password,
    callbackUrl: `${baseUrl}/`,
  });
  const response = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie, origin: baseUrl },
    body,
    redirect: "manual",
  });
  assert.equal(response.status >= 300 && response.status < 400, true);
  cookie = mergeCookies(cookie, responseCookies(response));
  return /authjs\.session-token=/.test(cookie) ? cookie : undefined;
}

async function invokeAction(cookie: string, pathname: string, id: string, args: unknown[]) {
  const body = await encodeReply(args);
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      Accept: "text/x-component",
      "Next-Action": id,
      cookie,
      origin: baseUrl,
    },
    body,
  });
  assert.equal(response.ok, true);
  return response.text();
}

function readTemporaryPassword(responseBody: string) {
  const match = responseBody.match(/"temporaryPassword":"([A-Za-z0-9!@#$%+\-=]+)"/);
  assert.ok(match, "Expected a one-time temporary password in the server-action response.");
  return match[1];
}

function readResetToken(responseBody: string) {
  const match = responseBody.match(/"resetUrl":"([^"\\]*(?:\\.[^"\\]*)*)"/);
  assert.ok(match, "Expected a one-time reset URL in the server-action response.");
  const resetUrl = JSON.parse(`"${match[1]}"`) as string;
  const token = new URLSearchParams(new URL(resetUrl).hash.slice(1)).get("token");
  assert.ok(token, "Expected an opaque token in the reset URL.");
  return token;
}

async function readSecurity(userId: string) {
  const result = await pool.query<{
    auth_version: number;
    must_change_password: boolean;
    disabled_at: Date | null;
    password_changed_at: Date | null;
    password_hash: string;
    role: string;
  }>(
    `SELECT auth_version, must_change_password, disabled_at, password_changed_at, password_hash, role
     FROM users WHERE id = $1`,
    [userId],
  );
  assert.ok(result.rows[0]);
  return result.rows[0];
}

function responseCookies(response: Response) {
  return response.headers.getSetCookie().map((value) => value.split(";", 1)[0]);
}

function mergeCookies(current: string, additions: string[]) {
  const values = new Map(current.split("; ").filter(Boolean).map((cookie) => cookie.split("=", 1)[0]).map((name) => [name, current.split("; ").find((cookie) => cookie.startsWith(`${name}=`)) ?? ""]));
  for (const cookie of additions) values.set(cookie.split("=", 1)[0], cookie);
  return [...values.values()].filter(Boolean).join("; ");
}
