import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getSafeInternalNavigationTarget,
  isSafeInternalNavigationTarget,
} from "../src/app/lib/internal-navigation.ts";
import {
  buildLoginRateLimitBuckets,
  buildPasswordResetRateLimitBuckets,
  getTrustedClientAddress,
  isRateLimitProxyTrustEnabled,
  loginBucketsToClearAfterSuccess,
  normalizeLoginIdentifier,
  SECURITY_RATE_LIMIT_RULES,
} from "../src/app/lib/security-rate-limit.ts";
import { getApplicationSecurityHeaders } from "../src/app/lib/security-headers.ts";

const secret = "test-only-rate-limit-secret-with-at-least-32-characters";

test("internal navigation preserves valid local query and fragment targets", () => {
  for (const target of [
    "/",
    "/lernen?modul=dns#lektion",
    "/suche?q=a%2Fb#ergebnis",
  ]) {
    assert.equal(isSafeInternalNavigationTarget(target), true);
    assert.equal(getSafeInternalNavigationTarget(target, "/fallback"), target);
  }
});

test("internal navigation rejects external, active, malformed and encoded redirect bypasses", () => {
  for (const target of [
    "https://evil.example/",
    "//evil.example/",
    "javascript:alert(1)",
    "data:text/html,test",
    "/\\evil.example/",
    "/%5cevil.example/",
    "/%2f%2fevil.example/",
    "/%252f%252fevil.example/",
    "/%09evil.example/",
    "/%not-valid",
    "/line\nbreak",
  ]) {
    assert.equal(isSafeInternalNavigationTarget(target), false, target);
    assert.equal(getSafeInternalNavigationTarget(target, "/fallback"), "/fallback");
  }
});

test("rate-limit keys are stable HMAC pseudonyms and never contain identifiers or addresses", () => {
  const headers = new Headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.5" });
  const context = { headers, secret, trustProxy: true };
  const first = buildLoginRateLimitBuckets("  Anna.Example  ", context);
  const second = buildLoginRateLimitBuckets("anna.example", context);
  assert.deepEqual(first, second);
  assert.deepEqual(first.map(({ type }) => type), [
    "login-global",
    "login-identifier",
    "login-network",
    "login-identifier-network",
  ]);
  for (const rateLimitBucket of first) {
    assert.match(rateLimitBucket.key, /^[0-9a-f]{64}$/);
    assert.equal(rateLimitBucket.key.includes("anna"), false);
    assert.equal(rateLimitBucket.key.includes("10.0.0.5"), false);
  }
  assert.deepEqual(loginBucketsToClearAfterSuccess(first).map(({ type }) => type), [
    "login-identifier",
    "login-identifier-network",
  ]);
  assert.equal(normalizeLoginIdentifier("  ÄNNA  "), "änna");
});

test("network buckets trust only the explicit proxy boundary and rightmost valid forwarded address", () => {
  const spoofed = new Headers({ "x-forwarded-for": "203.0.113.99, 10.0.0.8" });
  assert.equal(getTrustedClientAddress(spoofed, false), undefined);
  assert.equal(getTrustedClientAddress(spoofed, true), "10.0.0.8");
  assert.equal(getTrustedClientAddress(new Headers({ "x-forwarded-for": "not-an-ip" }), true), undefined);
  assert.equal(isRateLimitProxyTrustEnabled("true"), true);
  assert.equal(isRateLimitProxyTrustEnabled("TRUE"), false);
  assert.equal(isRateLimitProxyTrustEnabled(undefined), false);
});

test("login and reset limits are layered, temporary and suitable for ordinary use", () => {
  const noProxy = { headers: new Headers(), secret, trustProxy: false };
  const login = buildLoginRateLimitBuckets("anna", noProxy);
  assert.deepEqual(login.map(({ type }) => type), ["login-global", "login-identifier"]);
  const reset = buildPasswordResetRateLimitBuckets("opaque-reset-token", noProxy);
  assert.deepEqual(reset.map(({ type }) => type), ["password-reset-global", "password-reset-token"]);
  for (const rule of Object.values(SECURITY_RATE_LIMIT_RULES)) {
    assert.equal(rule.windowSeconds, 15 * 60);
    assert.ok(rule.limit >= 5);
  }
});

test("production headers add compatible CSP and HSTS without unsafe-eval or wildcards", () => {
  const production = new Map(getApplicationSecurityHeaders(true).map(({ key, value }) => [key, value]));
  const csp = production.get("Content-Security-Policy") ?? "";
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /worker-src 'self'/);
  assert.match(csp, /manifest-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /upgrade-insecure-requests/);
  assert.doesNotMatch(csp, /unsafe-eval|\*/);
  assert.equal(production.get("Strict-Transport-Security"), "max-age=31536000");
  assert.equal(production.get("X-Content-Type-Options"), "nosniff");

  const development = new Map(getApplicationSecurityHeaders(false).map(({ key, value }) => [key, value]));
  assert.match(development.get("Content-Security-Policy") ?? "", /unsafe-eval/);
  assert.equal(development.has("Strict-Transport-Security"), false);
});

test("authentication integration reserves limits before expensive cryptography and has no learning side effects", async () => {
  const [authentication, resetAction, rateLimitFiles] = await Promise.all([
    source("src/auth.ts"),
    source("src/app/actions/password-reset-actions.ts"),
    Promise.all([
      source("src/app/lib/security-rate-limit.ts"),
      source("src/app/lib/server/security-rate-limit-repository.ts"),
      source("src/app/lib/server/security-rate-limit-service.ts"),
    ]).then((values) => values.join("\n")),
  ]);
  const loginReservation = authentication.indexOf("rateLimitBuckets = await consumeLoginAttempt");
  assert.ok(loginReservation < authentication.indexOf("const user = await findUserForAuthentication"));
  assert.ok(loginReservation < authentication.indexOf("const validPassword = await verifyPassword"));
  assert.ok(authentication.indexOf("const validPassword = await verifyPassword") < authentication.indexOf("await clearSuccessfulLoginAttempts"));
  assert.ok(resetAction.indexOf("await consumePasswordResetAttempt(token") < resetAction.indexOf("const passwordHash = await hashPassword"));
  assert.doesNotMatch(rateLimitFiles, /awardCanonicalXp|xp-repository|progress-repository|lesson_progress|quiz_progress/i);
});

function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}
