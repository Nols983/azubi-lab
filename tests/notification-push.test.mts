import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  challengeAssignmentNotificationCandidate,
  challengeReviewNotificationCandidate,
  curriculumAssignmentNotificationCandidate,
  type NotificationType,
} from "../src/app/lib/notification-domain.ts";
import { buildNotificationWebPushPayload } from "../src/app/lib/notification-push-domain.ts";
import {
  createNotificationPushDispatchService,
  type PersistedNotificationForPush,
} from "../src/app/lib/notification-push-service-core.ts";

const learnerId = "00000000-0000-4000-8000-00000000000a";
const assignedAt = new Date("2026-09-02T10:00:00.000Z");

test("assignment and review events create stable authoritative notification candidates", () => {
  const curriculum = curriculumAssignmentNotificationCandidate({
    assignmentId: "00000000-0000-4000-8000-000000000101",
    learnerId,
    moduleTitle: "DNS",
    assignedAt,
    eventVersion: "1788343200000000",
  });
  assert.deepEqual(curriculum, {
    userId: learnerId,
    type: "curriculum-assigned",
    title: "Neuer Lernplan",
    message: "DNS wurde deinem Lernplan hinzugefügt.",
    href: "/lernplan",
    dedupeKey: "curriculum-assigned:00000000-0000-4000-8000-000000000101:1788343200000000",
    createdAt: assignedAt,
  });

  const challenge = challengeAssignmentNotificationCandidate({
    assignmentId: "00000000-0000-4000-8000-000000000102",
    learnerId,
    challengeTitle: "DNS-Analyse",
    assignedAt,
  });
  assert.equal(challenge.type, "challenge-assigned");
  assert.equal(challenge.href, "/challenges/00000000-0000-4000-8000-000000000102");
  assert.equal(challenge.dedupeKey, "challenge-assigned:00000000-0000-4000-8000-000000000102");

  for (const [decision, type] of [
    ["revision-requested", "challenge-revision"],
    ["approved", "challenge-approved"],
  ] as const) {
    const review = challengeReviewNotificationCandidate({
      reviewId: `00000000-0000-4000-8000-00000000010${decision === "approved" ? "4" : "3"}`,
      assignmentId: "00000000-0000-4000-8000-000000000102",
      learnerId,
      challengeTitle: "DNS-Analyse",
      decision,
      reviewedAt: assignedAt,
    });
    assert.equal(review.type, type);
    assert.equal(review.href, challenge.href);
    assert.doesNotMatch(review.message, /geheim|passwort/i);
  }
});

test("only actionable learner notifications become privacy-conscious push payloads", () => {
  const expected = new Map<NotificationType, [string, string]>([
    ["curriculum-assigned", ["Neuer Lernplan", "Dir wurde ein neuer Lernplan zugewiesen."]],
    ["challenge-assigned", ["Neue Challenge", "Dir wurde eine neue Challenge zugewiesen."]],
    ["challenge-revision", ["Überarbeitung erforderlich", "Für eine Challenge wurde eine Überarbeitung angefordert."]],
    ["challenge-approved", ["Challenge bewertet", "Eine deiner Challenge-Abgaben wurde bewertet."]],
    ["curriculum-due", ["Aufgabe bald fällig", "Ein Lernplan-Ziel wird bald fällig."]],
    ["curriculum-overdue", ["Aufgabe überfällig", "Ein Lernplan-Ziel ist überfällig."]],
    ["challenge-due", ["Aufgabe bald fällig", "Eine Challenge wird bald fällig."]],
    ["challenge-overdue", ["Aufgabe überfällig", "Eine Challenge ist überfällig."]],
  ]);
  for (const [index, [type, [title, body]]] of [...expected].entries()) {
    const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    assert.deepEqual(buildNotificationWebPushPayload({ id, type, href: "/lernplan?quelle=push" }), {
      title,
      body,
      target: "/lernplan?quelle=push",
      notificationId: id,
    });
  }
  for (const type of [
    "challenge-review-pending",
    "trainer-curriculum-overdue",
    "trainer-challenge-overdue",
    "activity-digest",
  ] as const) {
    assert.equal(buildNotificationWebPushPayload({ id: crypto.randomUUID(), type, href: "/admin" }), null);
  }
  assert.equal(buildNotificationWebPushPayload({
    id: crypto.randomUUID(),
    type: "challenge-assigned",
    href: "https://external.example.test",
  }), null);
});

test("only newly inserted notifications dispatch once and no subscription remains harmless", async () => {
  const calls: { userId: string; target: string }[] = [];
  const service = createNotificationPushDispatchService({
    deliverToUser: async (userId, payload) => {
      calls.push({ userId, target: payload.target });
      return { attempted: 0, delivered: 0, failed: 0, staleRemoved: 0 };
    },
  });
  const inserted = [notification("curriculum-due", "/lernplan")];
  const first = await service.dispatchBestEffort(inserted);
  const idempotentRerun = await service.dispatchBestEffort([]);
  assert.deepEqual(first, {
    eligibleNotifications: 1,
    attempted: 0,
    delivered: 0,
    failed: 0,
    staleRemoved: 0,
    dispatchFailures: 0,
  });
  assert.equal(idempotentRerun.eligibleNotifications, 0);
  assert.deepEqual(calls, [{ userId: learnerId, target: "/lernplan" }]);
});

test("push adapter failures are contained after the authoritative notification exists", async () => {
  const logged: string[] = [];
  const service = createNotificationPushDispatchService({
    deliverToUser: async () => { throw new Error("provider unavailable with secret details"); },
    logError: (message, errorName) => logged.push(`${message}:${errorName}`),
  });
  assert.deepEqual(await service.dispatchBestEffort([notification("challenge-approved", "/challenges/owned")]), {
    eligibleNotifications: 1,
    attempted: 0,
    delivered: 0,
    failed: 0,
    staleRemoved: 0,
    dispatchFailures: 1,
  });
  assert.deepEqual(logged, ["[azubi-lab] notification web push dispatch failed:Error"]);
  assert.doesNotMatch(logged.join("\n"), /secret details/);
});

test("business event wiring commits before external dispatch and has no XP coupling", async () => {
  const [curriculumService, challengeService, pushFiles] = await Promise.all([
    source("src/app/lib/server/curriculum-planning-service.ts"),
    source("src/app/lib/server/challenge-service.ts"),
    Promise.all([
      source("src/app/lib/notification-push-domain.ts"),
      source("src/app/lib/notification-push-service-core.ts"),
      source("src/app/lib/server/notification-push-service.ts"),
    ]).then((values) => values.join("\n")),
  ]);
  assert.match(curriculumService, /withTransaction\([\s\S]*insertNotificationCandidatesWithClient[\s\S]*\}\);\s+await dispatchPersistedNotificationPushBestEffort/);
  assert.match(challengeService, /assignChallengeAsAdmin[\s\S]*withTransaction\([\s\S]*insertNotificationCandidatesWithClient[\s\S]*\}\);\s+await dispatchPersistedNotificationPushBestEffort/);
  assert.match(challengeService, /reviewSubmissionAsAdmin[\s\S]*withTransaction\([\s\S]*challengeReviewNotificationCandidate[\s\S]*\}\);\s+await dispatchPersistedNotificationPushBestEffort/);
  assert.doesNotMatch(pushFiles, /awardCanonicalXp|xp-repository|progress-repository|quiz/i);
});

function notification(type: NotificationType, href: string): PersistedNotificationForPush {
  return { id: "00000000-0000-4000-8000-000000000001", userId: learnerId, type, href };
}

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}
