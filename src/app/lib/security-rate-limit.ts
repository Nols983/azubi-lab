import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export const SECURITY_RATE_LIMIT_RULES = {
  "login-global": { limit: 300, windowSeconds: 15 * 60 },
  "login-identifier": { limit: 10, windowSeconds: 15 * 60 },
  "login-network": { limit: 60, windowSeconds: 15 * 60 },
  "login-identifier-network": { limit: 6, windowSeconds: 15 * 60 },
  "password-reset-global": { limit: 120, windowSeconds: 15 * 60 },
  "password-reset-token": { limit: 5, windowSeconds: 15 * 60 },
  "password-reset-network": { limit: 20, windowSeconds: 15 * 60 },
} as const;

export type SecurityRateLimitBucketType = keyof typeof SECURITY_RATE_LIMIT_RULES;

export type SecurityRateLimitBucket = {
  type: SecurityRateLimitBucketType;
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitContext = {
  headers: Pick<Headers, "get">;
  secret: string;
  trustProxy: boolean;
};

export function buildLoginRateLimitBuckets(login: string, context: RateLimitContext) {
  const normalizedLogin = normalizeLoginIdentifier(login);
  const network = getTrustedClientAddress(context.headers, context.trustProxy);
  const buckets = [bucket("login-global", "application", context.secret)];
  if (normalizedLogin) {
    buckets.push(bucket("login-identifier", normalizedLogin, context.secret));
  }
  if (network) {
    buckets.push(bucket("login-network", network, context.secret));
    if (normalizedLogin) {
      buckets.push(bucket("login-identifier-network", `${normalizedLogin}\0${network}`, context.secret));
    }
  }
  return buckets;
}

export function buildPasswordResetRateLimitBuckets(token: string, context: RateLimitContext) {
  const network = getTrustedClientAddress(context.headers, context.trustProxy);
  const buckets = [
    bucket("password-reset-global", "application", context.secret),
    bucket("password-reset-token", token, context.secret),
  ];
  if (network) buckets.push(bucket("password-reset-network", network, context.secret));
  return buckets;
}

export function loginBucketsToClearAfterSuccess(buckets: readonly SecurityRateLimitBucket[]) {
  return buckets.filter(({ type }) => type === "login-identifier" || type === "login-identifier-network");
}

export function normalizeLoginIdentifier(value: string) {
  return value.trim().normalize("NFKC").toLowerCase();
}

export function getTrustedClientAddress(headers: Pick<Headers, "get">, trustProxy: boolean) {
  if (!trustProxy) return undefined;
  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) return undefined;
  const address = forwardedFor.split(",").at(-1)?.trim();
  return address && isIP(address) ? address : undefined;
}

export function isRateLimitProxyTrustEnabled(value: string | undefined) {
  return value === "true";
}

function bucket(type: SecurityRateLimitBucketType, identity: string, secret: string): SecurityRateLimitBucket {
  if (secret.length < 32) throw new Error("Rate-limit key configuration is unavailable.");
  const rule = SECURITY_RATE_LIMIT_RULES[type];
  return {
    type,
    key: createHmac("sha256", secret).update(type).update("\0").update(identity).digest("hex"),
    limit: rule.limit,
    windowSeconds: rule.windowSeconds,
  };
}
