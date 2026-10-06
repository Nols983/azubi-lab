import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ACCOUNT_CAPABILITIES,
  canChangeAccountRole,
  canManageAssignments,
  canManageChallenges,
  canManageRoles,
  canManageUsers,
  canResetPasswords,
  canReviewSubmissions,
  canViewLearnerProgress,
  hasCapability,
} from "../src/app/lib/authorization.ts";
import { parseAccountRole } from "../src/app/lib/account-security.ts";
import {
  buildPasswordResetUrl,
  generatePasswordResetToken,
  getPasswordResetExpiry,
  hashPasswordResetToken,
  isPasswordResetRecordUsable,
  isPasswordResetTokenFormat,
  parsePasswordResetOrigin,
  PASSWORD_RESET_EXPIRY_MINUTES,
} from "../src/app/lib/password-reset.ts";

test("learner has personal activity but no management, review, reporting, assignment, user or reset capability", () => {
  for (const capability of ["manageChallenges", "reviewSubmissions", "viewLearnerProgress", "manageAssignments", "manageUsers", "manageRoles", "resetPasswords"] as const) {
    assert.equal(hasCapability("learner", capability), false);
  }
  assert.equal(hasCapability("learner", "viewPersonalProgress"), true);
  assert.equal(hasCapability("learner", "recordLearningProgress"), true);
  assert.equal(hasCapability("learner", "recordQuizAttempts"), true);
  assert.equal(hasCapability("learner", "readOnlyPlatformPreview"), false);
  assert.equal(canManageChallenges("learner"), false);
  assert.equal(canReviewSubmissions("learner"), false);
  assert.equal(canManageUsers("learner"), false);
});

test("instructor gets only the trusted training workflow capabilities", () => {
  assert.equal(canManageChallenges("instructor"), true);
  assert.equal(canReviewSubmissions("instructor"), true);
  assert.equal(canViewLearnerProgress("instructor"), true);
  assert.equal(canManageAssignments("instructor"), true);
  assert.equal(canManageUsers("instructor"), false);
  assert.equal(canManageRoles("instructor"), false);
  assert.equal(canResetPasswords("instructor"), false);
});

test("admin retains every operational capability, can assign instructor, but is not a read-only preview", () => {
  for (const capability of ACCOUNT_CAPABILITIES) {
    assert.equal(hasCapability("admin", capability), capability !== "readOnlyPlatformPreview");
  }
  assert.equal(parseAccountRole("instructor"), "instructor");
  assert.equal(canChangeAccountRole({ id: "admin-a", role: "admin" }, { id: "user-b" }), true);
  assert.equal(canChangeAccountRole({ id: "admin-a", role: "admin" }, { id: "admin-a" }), false);
  assert.equal(canChangeAccountRole({ id: "instructor-a", role: "instructor" }, { id: "user-b" }), false);
});

test("reset tokens are opaque, random, format-checked and stored only through SHA-256 hashes", () => {
  const tokenA = generatePasswordResetToken();
  const tokenB = generatePasswordResetToken();
  assert.equal(isPasswordResetTokenFormat(tokenA), true);
  assert.equal(isPasswordResetTokenFormat(tokenB), true);
  assert.notEqual(tokenA, tokenB);
  const hash = hashPasswordResetToken(tokenA);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, tokenA);
  assert.equal(hash.includes(tokenA), false);
  for (const malformed of [undefined, "", "short", `${tokenA}=`, tokenA.replace(/.$/, "!")]) {
    assert.equal(isPasswordResetTokenFormat(malformed), false);
  }
});

test("reset expiry is deterministic and used or expired records cannot be accepted twice", () => {
  const now = new Date("2026-08-26T10:00:00.000Z");
  const expiresAt = getPasswordResetExpiry(now);
  assert.equal(expiresAt.getTime() - now.getTime(), PASSWORD_RESET_EXPIRY_MINUTES * 60_000);
  const record = { usedAt: null as Date | null, expiresAt };
  assert.equal(isPasswordResetRecordUsable(record, now), true);
  record.usedAt = new Date("2026-08-26T10:01:00.000Z");
  assert.equal(isPasswordResetRecordUsable(record, now), false);
  assert.equal(isPasswordResetRecordUsable({ usedAt: null, expiresAt: now }, now), false);
});

test("reset links use only a configured HTTPS origin with a local-development exception", () => {
  const token = generatePasswordResetToken();
  assert.equal(parsePasswordResetOrigin("https://azubi.example.test"), "https://azubi.example.test");
  assert.equal(parsePasswordResetOrigin("http://azubi.example.test"), undefined);
  assert.equal(parsePasswordResetOrigin("https://user:secret@azubi.example.test"), undefined);
  assert.equal(parsePasswordResetOrigin("https://azubi.example.test/path"), undefined);
  assert.equal(parsePasswordResetOrigin("http://localhost:3000", true), "http://localhost:3000");
  const link = new URL(buildPasswordResetUrl("https://azubi.example.test", token));
  assert.equal(link.origin, "https://azubi.example.test");
  assert.equal(link.pathname, "/passwort-zuruecksetzen");
  assert.equal(link.search, "");
  assert.equal(new URLSearchParams(link.hash.slice(1)).get("token"), token);
});

test("repository and actions enforce atomic reset, session invalidation and secret-safe logging", async () => {
  const repository = await readFile(new URL("../src/app/lib/server/password-reset-repository.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/app/lib/server/password-reset-service.ts", import.meta.url), "utf8");
  const action = await readFile(new URL("../src/app/actions/password-reset-actions.ts", import.meta.url), "utf8");
  assert.match(repository, /withTransaction/);
  assert.match(repository, /FOR UPDATE OF token, account/);
  assert.match(repository, /token\.used_at IS NULL/);
  assert.match(repository, /token\.expires_at > now\(\)/);
  assert.match(repository, /now\(\) \+ interval '30 minutes'/);
  assert.match(repository, /auth_version = auth_version \+ 1/);
  assert.match(repository, /SET used_at = now\(\)/);
  assert.match(service, /requireCapability\("resetPasswords"\)/);
  assert.ok(action.indexOf("isPasswordResetTokenFormat(token)") < action.indexOf("hashPassword(password)"));
  assert.doesNotMatch(repository, /console\./);
  assert.doesNotMatch(service, /console\./);
  assert.doesNotMatch(action, /console\.[a-z]+\([^\n]*(token|resetUrl)/i);
});

test("privileged training actions use database-authoritative capability guards", async () => {
  const currentUser = await readFile(new URL("../src/app/lib/server/current-user.ts", import.meta.url), "utf8");
  const challenges = await readFile(new URL("../src/app/actions/challenge-actions.ts", import.meta.url), "utf8");
  const curriculum = await readFile(new URL("../src/app/actions/curriculum-planning-actions.ts", import.meta.url), "utf8");
  const roleRepository = await readFile(new URL("../src/app/lib/server/admin-repository.ts", import.meta.url), "utf8");
  assert.match(currentUser, /getCurrentDatabaseUser/);
  assert.match(currentUser, /isCurrentAuthVersion/);
  assert.match(challenges, /requireCapability\("manageChallenges"\)/);
  assert.match(challenges, /requireCapability\("reviewSubmissions"\)/);
  assert.match(curriculum, /requireCapability\("manageAssignments"\)/);
  assert.match(roleRepository, /auth_version = auth_version \+ 1/);
  assert.match(roleRepository, /ORDER BY id\s+FOR UPDATE/);
  assert.match(roleRepository, /LastUsableAdminError/);
});
