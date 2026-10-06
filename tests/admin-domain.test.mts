import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  isCurrentAuthVersion,
  normalizeLoginIdentifier,
  parseAccountRole,
  requiresPasswordChange,
  validateLearnerAccountInput,
} from "../src/app/lib/account-security.ts";
import { canManageAccountStatus } from "../src/app/lib/authorization.ts";
import { getAdminProgressView } from "../src/app/lib/admin-progress.ts";
import { createEmptyLearnerProgressState, recordQuizAttempt, setLessonCompleted } from "../src/app/lib/learner-progress.ts";
import { generateTemporaryPassword, PASSWORD_MIN_LENGTH } from "../src/app/lib/server/password.ts";

test("account roles accept only the four canonical values", () => {
  assert.equal(parseAccountRole("admin"), "admin");
  assert.equal(parseAccountRole("instructor"), "instructor");
  assert.equal(parseAccountRole("learner"), "learner");
  assert.equal(parseAccountRole("observer"), "observer");
  assert.equal(parseAccountRole("owner"), undefined);
  assert.equal(parseAccountRole({ role: "admin" }), undefined);
});

test("auth versions must be current positive integers", () => {
  assert.equal(isCurrentAuthVersion(2, 2), true);
  assert.equal(isCurrentAuthVersion(1, 2), false);
  assert.equal(isCurrentAuthVersion("2", 2), false);
  assert.equal(isCurrentAuthVersion(0, 0), false);
});

test("account-status policy permits only administrators managing another account", () => {
  const admin = { id: "admin-a", role: "admin" as const };
  assert.equal(canManageAccountStatus(admin, { id: "learner-a", role: "learner" }), true);
  assert.equal(canManageAccountStatus(admin, { id: "instructor-a", role: "instructor" }), true);
  assert.equal(canManageAccountStatus(admin, { id: "admin-b", role: "admin" }), true);
  assert.equal(canManageAccountStatus(admin, { id: "admin-a", role: "admin" }), false);
  assert.equal(canManageAccountStatus({ id: "instructor-a", role: "instructor" }, { id: "learner-a" }), false);
  assert.equal(canManageAccountStatus({ id: "instructor-a", role: "instructor" }, { id: "instructor-b" }), false);
  assert.equal(canManageAccountStatus({ id: "learner-a", role: "learner" }, { id: "learner-b" }), false);
  assert.equal(canManageAccountStatus({ id: "learner-a", role: "learner" }, { id: "admin-a" }), false);
});

test("learner creation normalizes and validates display name and login", () => {
  const valid = validateLearnerAccountInput("  Azubi   C  ", "  AZUBI-C ");
  assert.equal(valid.valid, true);
  if (valid.valid) assert.deepEqual(valid.value, { displayName: "Azubi C", login: "azubi-c" });
  assert.equal(normalizeLoginIdentifier("Azubi-A"), "azubi-a");
  assert.equal(validateLearnerAccountInput("A", "Role Admin!").valid, false);
});

test("temporary passwords are strong-length, readable and independently generated", () => {
  const passwords = new Set(Array.from({ length: 25 }, () => generateTemporaryPassword()));
  assert.equal(passwords.size, 25);
  for (const password of passwords) {
    assert.equal(password.length >= PASSWORD_MIN_LENGTH, true);
    assert.match(password, /^[A-HJ-NP-Za-km-z2-9!@#$%+\-=]+$/);
  }
});

test("forced password-change state is explicit", () => {
  assert.equal(requiresPasswordChange(true), true);
  assert.equal(requiresPasswordChange(false), false);
  assert.equal(requiresPasswordChange("true"), false);
});

test("admin progress uses the canonical learner selectors", () => {
  let state = createEmptyLearnerProgressState();
  state = setLessonCompleted(state, "ipv4-grundlagen", "was-ist-eine-ip-adresse", true, true, "2026-08-20T10:00:00.000Z");
  state = recordQuizAttempt(state, "ipv4-grundlagen", 10, 10, "2026-08-20T11:00:00.000Z");
  const adminView = getAdminProgressView(state);
  assert.equal(adminView.overall.completedActivities, 2);
  assert.equal(adminView.lastActivity, "2026-08-20T11:00:00.000Z");
  assert.equal(adminView.modules.find((module) => module.slug === "ipv4-grundlagen")?.quiz?.bestPercentage, 100);
});

test("role and reset migration extends the immutable administration schema", async () => {
  const firstMigration = await readFile(new URL("../db/migrations/0001_auth_and_progress.sql", import.meta.url), "utf8");
  const adminMigration = await readFile(new URL("../db/migrations/0002_admin_learner_management.sql", import.meta.url), "utf8");
  const accessMigration = await readFile(new URL("../db/migrations/0008_instructor_and_password_reset.sql", import.meta.url), "utf8");
  const observerMigration = await readFile(new URL("../db/migrations/0018_observer_role.sql", import.meta.url), "utf8");
  assert.doesNotMatch(firstMigration, /auth_version/);
  assert.match(adminMigration, /role IN \('admin', 'learner'\)/);
  assert.match(adminMigration, /must_change_password boolean NOT NULL DEFAULT false/);
  assert.match(adminMigration, /auth_version integer NOT NULL DEFAULT 1/);
  assert.match(accessMigration, /role IN \('learner', 'instructor', 'admin'\)/);
  assert.match(accessMigration, /CREATE TABLE password_reset_tokens/);
  assert.match(accessMigration, /token_hash text NOT NULL UNIQUE/);
  assert.match(accessMigration, /created_by_admin_id uuid NOT NULL/);
  assert.match(observerMigration, /role IN \('learner', 'observer', 'instructor', 'admin'\)/);
});
