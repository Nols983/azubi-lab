import { createHash, randomBytes } from "node:crypto";
import { isPasswordResetTokenFormat } from "./password-reset-token.ts";

export { isPasswordResetTokenFormat } from "./password-reset-token.ts";

export const PASSWORD_RESET_EXPIRY_MINUTES = 30;
export const PASSWORD_RESET_TOKEN_BYTES = 32;

export function generatePasswordResetToken() {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function getPasswordResetExpiry(now = new Date()) {
  return new Date(now.getTime() + PASSWORD_RESET_EXPIRY_MINUTES * 60_000);
}

export function isPasswordResetRecordUsable(
  record: { usedAt: Date | null; expiresAt: Date },
  now = new Date(),
) {
  return record.usedAt === null && record.expiresAt.getTime() > now.getTime();
}

export function parsePasswordResetOrigin(value: unknown, allowLocalHttp = false) {
  if (typeof value !== "string" || value.length > 300) return undefined;
  try {
    const origin = new URL(value);
    const localHttp = allowLocalHttp
      && origin.protocol === "http:"
      && (origin.hostname === "localhost" || origin.hostname === "127.0.0.1" || origin.hostname === "[::1]");
    if (
      (origin.protocol !== "https:" && !localHttp)
      || origin.username
      || origin.password
      || origin.pathname !== "/"
      || origin.search
      || origin.hash
    ) return undefined;
    return origin.origin;
  } catch {
    return undefined;
  }
}

export function buildPasswordResetUrl(origin: string, token: string) {
  if (!isPasswordResetTokenFormat(token)) throw new TypeError("The password reset token is malformed.");
  const url = new URL("/passwort-zuruecksetzen", origin);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}
