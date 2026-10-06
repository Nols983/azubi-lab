const OFFLINE_CACHE = "azubi-lab-offline-v1";
const OFFLINE_URL = "/offline.html";
const DEFAULT_TARGET = "/benachrichtigungen";
const DEFAULT_TITLE = "Azubi Lab";
const DEFAULT_BODY = "Es gibt eine neue Benachrichtigung.";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith("azubi-lab-offline-") && key !== OFFLINE_CACHE)
        .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => (
      await caches.match(OFFLINE_URL)
      || new Response("Azubi Lab ist offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
    )),
  );
});

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event.data);
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/icons/azubi-lab-192.png",
    badge: "/icons/azubi-lab-192.png",
    tag: payload.notificationId,
    data: { target: payload.target },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = safeInternalTarget(event.notification.data?.target);
  event.waitUntil(openOrFocusTarget(target));
});

function readPushPayload(data) {
  let candidate = {};
  try {
    const parsed = data ? data.json() : {};
    candidate = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    candidate = {};
  }
  return {
    title: safeText(candidate.title, DEFAULT_TITLE, 120),
    body: safeText(candidate.body, DEFAULT_BODY, 240),
    target: safeInternalTarget(candidate.target),
    notificationId: typeof candidate.notificationId === "string"
      && /^[a-z0-9][a-z0-9._:-]{0,63}$/i.test(candidate.notificationId)
      ? candidate.notificationId
      : undefined,
  };
}

function safeText(value, fallback, maximumLength) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, maximumLength)
    : fallback;
}

function safeInternalTarget(value) {
  if (typeof value !== "string"
    || value.length > 500
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(value)
    || hasEncodedPathBypass(value)) return DEFAULT_TARGET;
  try {
    const target = new URL(value, self.location.origin);
    return target.origin === self.location.origin
      ? `${target.pathname}${target.search}${target.hash}`
      : DEFAULT_TARGET;
  } catch {
    return DEFAULT_TARGET;
  }
}

function hasEncodedPathBypass(value) {
  let path = value.split(/[?#]/, 1)[0];
  for (let index = 0; index < 3; index += 1) {
    try {
      const decoded = decodeURIComponent(path);
      if (decoded === path) return false;
      if (decoded.startsWith("//") || decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded)) {
        return true;
      }
      path = decoded;
    } catch {
      return true;
    }
  }
  return path.startsWith("//") || path.includes("\\") || /[\u0000-\u001f\u007f]/.test(path);
}

async function openOrFocusTarget(target) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const existing = windows.find((client) => {
    try {
      return new URL(client.url).origin === self.location.origin;
    } catch {
      return false;
    }
  });
  if (existing) {
    if ("navigate" in existing) await existing.navigate(target);
    return existing.focus();
  }
  return self.clients.openWindow(target);
}
