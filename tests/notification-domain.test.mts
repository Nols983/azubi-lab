import assert from "node:assert/strict";
import test from "node:test";
import {
  buildActivityDigestMessage,
  classifyDueWindow,
  deduplicateNotificationCandidates,
  getCompletedUtcDigestWindow,
  isSafeInternalNotificationHref,
} from "../src/app/lib/notification-domain.ts";

const now = new Date("2026-08-25T12:00:00.000Z");

test("due windows are exclusive and use the provided server time", () => {
  assert.equal(classifyDueWindow(new Date("2026-08-28T12:00:00.000Z"), now), "3d");
  assert.equal(classifyDueWindow(new Date("2026-08-26T12:00:00.000Z"), now), "1d");
  assert.equal(classifyDueWindow(new Date("2026-08-25T11:59:59.999Z"), now), "overdue");
  assert.equal(classifyDueWindow(new Date("2026-08-28T12:00:00.001Z"), now), null);
  assert.equal(classifyDueWindow(null, now), null);
});

test("UTC digest window is the last completed calendar day", () => {
  assert.deepEqual(getCompletedUtcDigestWindow(now), {
    start: new Date("2026-08-24T00:00:00.000Z"),
    end: new Date("2026-08-25T00:00:00.000Z"),
    key: "2026-08-24",
  });
});

test("activity digest omits empty counters and empty digests", () => {
  assert.equal(buildActivityDigestMessage({ completedLessons: 0, quizSubmissions: 0, completedModules: 0, challengeSubmissions: 0, approvedChallenges: 0, requestedRevisions: 0 }), null);
  assert.equal(buildActivityDigestMessage({ completedLessons: 2, quizSubmissions: 1, completedModules: 0, challengeSubmissions: 3, approvedChallenges: 0, requestedRevisions: 0 }), "2 abgeschlossene Lektionen · 1 Quiz-Abgaben · 3 Challenge-Abgaben");
});

test("dedupe is scoped to user and key", () => {
  const candidate = { userId: "user-a", type: "challenge-due" as const, title: "Titel", message: "Text", href: "/challenges/example", dedupeKey: "challenge-due:one:1d" };
  assert.equal(deduplicateNotificationCandidates([candidate, candidate, { ...candidate, userId: "user-b" }]).length, 2);
});

test("notification links must remain internal", () => {
  assert.equal(isSafeInternalNotificationHref("/lernplan"), true);
  assert.equal(isSafeInternalNotificationHref("/challenges/id?tab=review"), true);
  assert.equal(isSafeInternalNotificationHref(null), true);
  assert.equal(isSafeInternalNotificationHref("https://example.test"), false);
  assert.equal(isSafeInternalNotificationHref("//example.test"), false);
  assert.equal(isSafeInternalNotificationHref("/\\example.test"), false);
  assert.equal(isSafeInternalNotificationHref("/%5cexample.test"), false);
  assert.equal(isSafeInternalNotificationHref("/%2f%2fexample.test"), false);
  assert.equal(isSafeInternalNotificationHref("/%252f%252fexample.test"), false);
  assert.equal(isSafeInternalNotificationHref("javascript:alert(1)"), false);
});
