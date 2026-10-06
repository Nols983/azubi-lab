import { Buffer } from "node:buffer";
import { isSafeInternalNotificationHref } from "./notification-domain.ts";

export const WEB_PUSH_TEST_PAYLOAD = {
  title: "Azubi Lab",
  body: "Push-Benachrichtigungen funktionieren.",
  target: "/benachrichtigungen",
  notificationId: "web-push-test",
} as const;

export type ValidatedWebPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type WebPushPayload = {
  title: string;
  body: string;
  target: string;
  notificationId?: string;
};

export class WebPushValidationError extends Error {
  constructor() {
    super("Web Push input is invalid.");
    this.name = "WebPushValidationError";
  }
}

export function parseWebPushSubscription(value: unknown): ValidatedWebPushSubscription {
  if (!isRecord(value) || !hasOnlyKeys(value, ["endpoint", "keys"]) || !isRecord(value.keys)
    || !hasOnlyKeys(value.keys, ["p256dh", "auth"])) throw new WebPushValidationError();
  const endpoint = parseWebPushEndpoint(value.endpoint);
  const p256dh = parseBase64UrlKey(value.keys.p256dh, 65, true);
  const auth = parseBase64UrlKey(value.keys.auth, 16);
  return { endpoint, p256dh, auth };
}

export function parseWebPushEndpoint(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 2048
    || /[\u0000-\u0020\u007f]/.test(value)) throw new WebPushValidationError();
  try {
    const endpoint = new URL(value);
    if (endpoint.protocol !== "https:" || !endpoint.hostname || endpoint.username
      || endpoint.password || endpoint.hash || endpoint.port
      || !isSupportedPushServiceEndpoint(endpoint)) throw new WebPushValidationError();
    return endpoint.href;
  } catch (error) {
    if (error instanceof WebPushValidationError) throw error;
    throw new WebPushValidationError();
  }
}

function isSupportedPushServiceEndpoint(endpoint: URL) {
  const normalized = endpoint.hostname.toLowerCase();
  if (normalized === "jmt17.google.com") {
    return /^\/fcm\/send\/[^/]+$/.test(endpoint.pathname) && !endpoint.search;
  }
  return normalized === "fcm.googleapis.com"
    || normalized === "updates.push.services.mozilla.com"
    || normalized.endsWith(".push.apple.com")
    || normalized.endsWith(".notify.windows.com");
}

export function validateWebPushPayload(value: WebPushPayload): WebPushPayload {
  const title = validateText(value.title, 120);
  const body = validateText(value.body, 240);
  if (!isSafeInternalNotificationHref(value.target) || value.target === null) {
    throw new WebPushValidationError();
  }
  const notificationId = value.notificationId;
  if (notificationId !== undefined
    && (notificationId.length > 64 || !/^[a-z0-9][a-z0-9._:-]*$/i.test(notificationId))) {
    throw new WebPushValidationError();
  }
  return { title, body, target: value.target, ...(notificationId ? { notificationId } : {}) };
}

export function parseVapidPublicKey(value: unknown) {
  return parseBase64UrlKey(value, 65, true);
}

export function parseVapidPrivateKey(value: unknown) {
  return parseBase64UrlKey(value, 32);
}

export function parseVapidSubject(value: unknown) {
  if (typeof value !== "string" || value.length < 8 || value.length > 300
    || /[\u0000-\u0020\u007f]/.test(value)) throw new WebPushValidationError();
  let subject: URL;
  try {
    subject = new URL(value);
  } catch {
    throw new WebPushValidationError();
  }
  if (subject.protocol === "https:" && subject.hostname && !subject.username && !subject.password) {
    return subject.href;
  }
  if (subject.protocol === "mailto:" && /^[^?\s@]+@[^?\s@]+\.[^?\s@]+$/.test(subject.pathname)
    && !subject.search && !subject.hash) return value;
  throw new WebPushValidationError();
}

function parseBase64UrlKey(value: unknown, expectedBytes: number, uncompressedPoint = false) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new WebPushValidationError();
  }
  const decoded = Buffer.from(value, "base64url");
  if (decoded.length !== expectedBytes || decoded.toString("base64url") !== value
    || (uncompressedPoint && decoded[0] !== 4)) throw new WebPushValidationError();
  return value;
}

function validateText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") throw new WebPushValidationError();
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > maximumLength
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized)) {
    throw new WebPushValidationError();
  }
  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const expected = new Set(keys);
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => expected.has(key));
}
