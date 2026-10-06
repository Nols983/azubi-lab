import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import manifest from "../src/app/manifest.ts";
import {
  getWebPushConfiguration,
  WebPushConfigurationError,
} from "../src/app/lib/server/web-push-config.ts";
import {
  parseVapidPrivateKey,
  parseVapidPublicKey,
  parseVapidSubject,
  parseWebPushSubscription,
  validateWebPushPayload,
  WEB_PUSH_TEST_PAYLOAD,
  WebPushValidationError,
} from "../src/app/lib/web-push-domain.ts";
import { createWebPushDeliveryService } from "../src/app/lib/server/web-push-delivery-service.ts";
import { WebPushSubscriptionOwnershipError } from "../src/app/lib/server/web-push-repository.ts";
import {
  createWebPushSubscriptionService,
  WebPushAccountUnavailableError,
} from "../src/app/lib/web-push-service-core.ts";

const publicKey = base64UrlKey(65, 4);
const privateKey = base64UrlKey(32, 1);
const p256dh = base64UrlKey(65, 4);
const auth = base64UrlKey(16, 1);
const endpoint = "https://fcm.googleapis.com/fcm/send/device-a";

test("manifest exposes an installable standalone Azubi Lab contract and valid icon sizes", async () => {
  const value = manifest();
  assert.equal(value.name, "Azubi Lab");
  assert.equal(value.short_name, "Azubi Lab");
  assert.equal(value.start_url, "/");
  assert.equal(value.scope, "/");
  assert.equal(value.display, "standalone");
  assert.equal(value.theme_color, "#172554");
  assert.equal(value.background_color, "#f5f7fb");
  assert.ok(value.icons?.some((icon) => icon.sizes === "192x192" && icon.type === "image/png"));
  assert.ok(value.icons?.some((icon) => icon.sizes === "512x512" && icon.type === "image/png"));
  assert.deepEqual(await pngDimensions("public/icons/azubi-lab-192.png"), { width: 192, height: 192 });
  assert.deepEqual(await pngDimensions("public/icons/azubi-lab-512.png"), { width: 512, height: 512 });
});

test("subscription and VAPID validation accept exact standards-shaped values", () => {
  assert.deepEqual(parseWebPushSubscription({ endpoint, keys: { p256dh, auth } }), { endpoint, p256dh, auth });
  for (const browserEndpoint of [
    "https://fcm.googleapis.com/wp/device-chromium",
    "https://jmt17.google.com/fcm/send/device-chromium-staging",
    "https://updates.push.services.mozilla.com/wpush/v2/device-firefox",
    "https://web.push.apple.com/device-safari",
    "https://device-region.push.apple.com/device-ios",
    "https://wns2-example.notify.windows.com/w/device-edge",
  ]) {
    assert.equal(
      parseWebPushSubscription({ endpoint: browserEndpoint, keys: { p256dh, auth } }).endpoint,
      browserEndpoint,
    );
  }
  assert.equal(parseVapidPublicKey(publicKey), publicKey);
  assert.equal(parseVapidPrivateKey(privateKey), privateKey);
  assert.equal(parseVapidSubject("mailto:operator@example.test"), "mailto:operator@example.test");
  assert.equal(parseVapidSubject("https://example.test/contact"), "https://example.test/contact");

  for (const invalid of [
    null,
    { endpoint: "http://push.example.test/a", keys: { p256dh, auth } },
    { endpoint: "https://127.0.0.1/push", keys: { p256dh, auth } },
    { endpoint: "https://example.test/push", keys: { p256dh, auth } },
    { endpoint: "https://jmt17.google.com/", keys: { p256dh, auth } },
    { endpoint: "https://jmt17.google.com/fcm/send/", keys: { p256dh, auth } },
    { endpoint: "https://jmt17.google.com/not-push/device", keys: { p256dh, auth } },
    { endpoint: "https://evil.jmt17.google.com/fcm/send/device", keys: { p256dh, auth } },
    { endpoint: "https://jmt17.google.com.evil.example/fcm/send/device", keys: { p256dh, auth } },
    { endpoint: "https://other.google.com/fcm/send/device", keys: { p256dh, auth } },
    { endpoint: "http://jmt17.google.com/fcm/send/device", keys: { p256dh, auth } },
    { endpoint: "https://jmt17.google.com:444/fcm/send/device", keys: { p256dh, auth } },
    { endpoint: "https://push.apple.com.evil.example/push", keys: { p256dh, auth } },
    { endpoint: "https://evilpush.apple.com/push", keys: { p256dh, auth } },
    { endpoint, keys: { p256dh: "invalid", auth } },
    { endpoint, keys: { p256dh, auth: "invalid" } },
    { endpoint, keys: { p256dh, auth }, userId: "attacker-controlled" },
  ]) assert.throws(() => parseWebPushSubscription(invalid), WebPushValidationError);
  assert.throws(() => parseVapidSubject("ftp://example.test"), WebPushValidationError);
});

test("runtime Web Push configuration validates all VAPID fields without a browser build variable", () => {
  assert.deepEqual(getWebPushConfiguration({
    WEB_PUSH_VAPID_PUBLIC_KEY: publicKey,
    WEB_PUSH_VAPID_PRIVATE_KEY: privateKey,
    WEB_PUSH_VAPID_SUBJECT: "mailto:operator@example.test",
  }), { publicKey, privateKey, subject: "mailto:operator@example.test" });
  assert.throws(() => getWebPushConfiguration({
    WEB_PUSH_VAPID_PUBLIC_KEY: publicKey,
    WEB_PUSH_VAPID_SUBJECT: "mailto:operator@example.test",
  }), WebPushConfigurationError);
});

test("push targets are internal-only and reject external, javascript and data URLs", () => {
  assert.deepEqual(validateWebPushPayload(WEB_PUSH_TEST_PAYLOAD), WEB_PUSH_TEST_PAYLOAD);
  for (const target of ["https://example.test/", "//example.test/", "javascript:alert(1)", "data:text/html,test", "/\\example.test"]) {
    assert.throws(
      () => validateWebPushPayload({ title: "Azubi Lab", body: "Test", target }),
      WebPushValidationError,
    );
  }
});

test("subscription service enforces per-user isolation, duplicate handling and unsubscribe ownership", async () => {
  const stored = new Map<string, { userId: string; p256dh: string; auth: string }>();
  const serviceFor = (userId: string) => createWebPushSubscriptionService({
    requireUser: async () => ({ id: userId, disabledAt: null }),
    upsertSubscription: async (ownerId, subscription) => {
      const current = stored.get(subscription.endpoint);
      if (current && current.userId !== ownerId) throw new WebPushSubscriptionOwnershipError();
      stored.set(subscription.endpoint, { userId: ownerId, p256dh: subscription.p256dh, auth: subscription.auth });
      return "00000000-0000-4000-8000-000000000001";
    },
    hasSubscription: async (ownerId, target) => stored.get(target)?.userId === ownerId,
    deleteSubscription: async (ownerId, target) => {
      if (stored.get(target)?.userId !== ownerId) return false;
      return stored.delete(target);
    },
    deliverTest: async () => ({ attempted: 0, delivered: 0, failed: 0, staleRemoved: 0 }),
  });
  const userA = serviceFor("00000000-0000-4000-8000-00000000000a");
  const userB = serviceFor("00000000-0000-4000-8000-00000000000b");
  await userA.subscribe({ endpoint, keys: { p256dh, auth } });
  await userA.subscribe({ endpoint, keys: { p256dh, auth } });
  assert.equal(stored.size, 1, "same-user duplicate must update instead of duplicate");
  assert.equal(await userA.status(endpoint), true);
  assert.equal(await userB.status(endpoint), false);
  await assert.rejects(() => userB.subscribe({ endpoint, keys: { p256dh, auth } }), WebPushSubscriptionOwnershipError);
  assert.equal(await userB.unsubscribe(endpoint), false);
  assert.equal(stored.size, 1);
  assert.equal(await userA.unsubscribe(endpoint), true);
  assert.equal(stored.size, 0);
});

test("disabled accounts cannot subscribe or send a test notification", async () => {
  let mutations = 0;
  const service = createWebPushSubscriptionService({
    requireUser: async () => ({ id: "00000000-0000-4000-8000-00000000000a", disabledAt: new Date() }),
    upsertSubscription: async () => { mutations += 1; return "00000000-0000-4000-8000-000000000001"; },
    hasSubscription: async () => false,
    deleteSubscription: async () => false,
    deliverTest: async () => { mutations += 1; return { attempted: 1, delivered: 1, failed: 0, staleRemoved: 0 }; },
  });
  await assert.rejects(() => service.subscribe({ endpoint, keys: { p256dh, auth } }), WebPushAccountUnavailableError);
  await assert.rejects(() => service.sendTest(), WebPushAccountUnavailableError);
  assert.equal(mutations, 0);
});

test("failed authentication prevents test delivery", async () => {
  let deliveries = 0;
  const authenticationError = new Error("authentication required");
  const service = createWebPushSubscriptionService({
    requireUser: async () => { throw authenticationError; },
    upsertSubscription: async () => "00000000-0000-4000-8000-000000000001",
    hasSubscription: async () => false,
    deleteSubscription: async () => false,
    deliverTest: async () => {
      deliveries += 1;
      return { attempted: 1, delivered: 1, failed: 0, staleRemoved: 0 };
    },
  });
  await assert.rejects(() => service.sendTest(), authenticationError);
  assert.equal(deliveries, 0);
});

test("test push remains own-device only and has no XP side effect", async () => {
  const calls: unknown[][] = [];
  const service = createWebPushSubscriptionService({
    requireUser: async () => ({ id: "00000000-0000-4000-8000-00000000000a", disabledAt: null }),
    upsertSubscription: async () => "00000000-0000-4000-8000-000000000001",
    hasSubscription: async () => true,
    deleteSubscription: async () => true,
    deliverTest: async (...values) => {
      calls.push(values);
      return { attempted: 1, delivered: 1, failed: 0, staleRemoved: 0 };
    },
  });
  assert.deepEqual(await service.sendTest(), { attempted: 1, delivered: 1, failed: 0, staleRemoved: 0 });
  assert.deepEqual(calls, [["00000000-0000-4000-8000-00000000000a", WEB_PUSH_TEST_PAYLOAD]]);
  const [serviceSource, actionSource] = await Promise.all([
    source("src/app/lib/web-push-service-core.ts"),
    source("src/app/actions/web-push-actions.ts"),
  ]);
  assert.doesNotMatch(`${serviceSource}\n${actionSource}`, /xp[-_ ]|awardCanonicalXp|progress-repository/i);
  assert.doesNotMatch(await source("src/app/components/notifications/push-notification-settings.tsx"), /NEXT_PUBLIC/);
});

test("delivery removes only permanently stale owned subscriptions", async () => {
  const removed: string[] = [];
  const records = [
    subscriptionRecord("00000000-0000-4000-8000-000000000001", endpoint),
    subscriptionRecord("00000000-0000-4000-8000-000000000002", "https://updates.push.services.mozilla.com/wpush/v2/device-b"),
  ];
  const delivery = createWebPushDeliveryService({
    listSubscriptions: async () => records,
    removeSubscription: async (userId, id) => {
      assert.equal(userId, "00000000-0000-4000-8000-00000000000a");
      removed.push(id);
      return true;
    },
    send: async (subscription) => {
      if (subscription.id.endsWith("1")) throw { statusCode: 410 };
    },
  });
  assert.deepEqual(
    await delivery.sendToUser("00000000-0000-4000-8000-00000000000a", WEB_PUSH_TEST_PAYLOAD),
    { attempted: 2, delivered: 1, failed: 0, staleRemoved: 1 },
  );
  assert.deepEqual(removed, ["00000000-0000-4000-8000-000000000001"]);
});

test("temporary delivery failures do not delete subscriptions", async () => {
  let removals = 0;
  const delivery = createWebPushDeliveryService({
    listSubscriptions: async () => [subscriptionRecord("00000000-0000-4000-8000-000000000001", endpoint)],
    removeSubscription: async () => { removals += 1; return true; },
    send: async () => { throw { statusCode: 503 }; },
  });
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    assert.deepEqual(
      await delivery.sendToUser("00000000-0000-4000-8000-00000000000a", WEB_PUSH_TEST_PAYLOAD),
      { attempted: 1, delivered: 0, failed: 1, staleRemoved: 0 },
    );
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(removals, 0);
});

test("service worker shows safe payloads, constrains click targets and only caches offline shell", async () => {
  const serviceWorker = await source("public/sw.js");
  const listeners: Record<string, (event: Record<string, unknown>) => void> = {};
  const shown: unknown[][] = [];
  const navigated: string[] = [];
  const opened: string[] = [];
  let focused = 0;
  const windowClients = [{
    url: "https://azubi.example.test/lernen",
    navigate: async (target: string) => { navigated.push(target); },
    focus: async () => { focused += 1; },
  }];
  const context = {
    self: {
      location: { origin: "https://azubi.example.test" },
      addEventListener: (type: string, listener: (event: Record<string, unknown>) => void) => { listeners[type] = listener; },
      skipWaiting: () => Promise.resolve(),
      registration: { showNotification: async (...values: unknown[]) => { shown.push(values); } },
      clients: {
        claim: () => Promise.resolve(),
        matchAll: async () => windowClients,
        openWindow: async (target: string) => { opened.push(target); },
      },
    },
    caches: { open: async () => ({ add: async () => undefined }), keys: async () => [], delete: async () => true, match: async () => undefined },
    fetch: async () => new Response("ok"),
    Request,
    Response,
    URL,
    Promise,
  };
  vm.runInNewContext(serviceWorker, context);
  let pending: Promise<unknown> | undefined;
  listeners.push({
    data: { json: () => WEB_PUSH_TEST_PAYLOAD },
    waitUntil: (promise: Promise<unknown>) => { pending = promise; },
  });
  await pending;
  assert.equal(shown[0][0], "Azubi Lab");
  assert.deepEqual(JSON.parse(JSON.stringify(shown[0][1])), {
    body: "Push-Benachrichtigungen funktionieren.",
    icon: "/icons/azubi-lab-192.png",
    badge: "/icons/azubi-lab-192.png",
    tag: "web-push-test",
    data: { target: "/benachrichtigungen" },
  });

  for (const malformedData of [
    undefined,
    { json: () => null },
    { json: () => { throw new SyntaxError("invalid JSON"); } },
  ]) {
    listeners.push({
      data: malformedData,
      waitUntil: (promise: Promise<unknown>) => { pending = promise; },
    });
    await pending;
  }
  for (const fallbackNotification of shown.slice(1)) {
    assert.equal(fallbackNotification[0], "Azubi Lab");
    assert.deepEqual(JSON.parse(JSON.stringify(fallbackNotification[1])), {
      body: "Es gibt eine neue Benachrichtigung.",
      icon: "/icons/azubi-lab-192.png",
      badge: "/icons/azubi-lab-192.png",
      data: { target: "/benachrichtigungen" },
    });
  }

  for (const unsafeTarget of [
    "javascript:alert(1)",
    "data:text/html,test",
    "//external.example.test/path",
    "https://external.example.test/path",
    "http://external.example.test/path",
    "/\\external.example.test/path",
    "/%5cexternal.example.test/path",
    "/%2f%2fexternal.example.test/path",
    "/%252f%252fexternal.example.test/path",
  ]) {
    listeners.notificationclick({
      notification: { data: { target: unsafeTarget }, close: () => undefined },
      waitUntil: (promise: Promise<unknown>) => { pending = promise; },
    });
    await pending;
  }
  listeners.notificationclick({
    notification: { data: { target: "/lernen?modul=dns#lektion" }, close: () => undefined },
    waitUntil: (promise: Promise<unknown>) => { pending = promise; },
  });
  await pending;
  assert.deepEqual(navigated, [
    ...Array.from({ length: 9 }, () => "/benachrichtigungen"),
    "/lernen?modul=dns#lektion",
  ]);
  assert.equal(focused, 10);

  windowClients.length = 0;
  listeners.notificationclick({
    notification: { data: { target: "/benachrichtigungen" }, close: () => undefined },
    waitUntil: (promise: Promise<unknown>) => { pending = promise; },
  });
  await pending;
  assert.deepEqual(opened, ["/benachrichtigungen"]);
  assert.match(serviceWorker, /cache\.add\(new Request\(OFFLINE_URL/);
  assert.doesNotMatch(serviceWorker, /cache\.put|caches\.match\(event\.request/);
});

function base64UrlKey(bytes: number, firstByte: number) {
  const value = Buffer.alloc(bytes);
  value[0] = firstByte;
  return value.toString("base64url");
}

function subscriptionRecord(id: string, target: string) {
  return {
    id,
    userId: "00000000-0000-4000-8000-00000000000a",
    endpoint: target,
    p256dh,
    auth,
  };
}

async function pngDimensions(path: string) {
  const image = await readFile(new URL(`../${path}`, import.meta.url));
  assert.equal(image.subarray(1, 4).toString("ascii"), "PNG");
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}
