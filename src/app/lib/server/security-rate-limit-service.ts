import "server-only";

import {
  buildLoginRateLimitBuckets,
  buildPasswordResetRateLimitBuckets,
  isRateLimitProxyTrustEnabled,
  loginBucketsToClearAfterSuccess,
  type SecurityRateLimitBucket,
} from "../security-rate-limit.ts";
import {
  clearSecurityRateLimitBuckets,
  consumeSecurityRateLimitBuckets,
} from "./security-rate-limit-repository.ts";

export class SecurityRateLimitExceededError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("The security-sensitive operation is rate limited.");
    this.name = "SecurityRateLimitExceededError";
  }
}

export async function consumeLoginAttempt(login: string, headers: Pick<Headers, "get">) {
  const buckets = buildLoginRateLimitBuckets(login, context(headers));
  await enforce(buckets);
  return buckets;
}

export function clearSuccessfulLoginAttempts(buckets: readonly SecurityRateLimitBucket[]) {
  return clearSecurityRateLimitBuckets(loginBucketsToClearAfterSuccess(buckets));
}

export async function consumePasswordResetAttempt(token: string, headers: Pick<Headers, "get">) {
  await enforce(buildPasswordResetRateLimitBuckets(token, context(headers)));
}

async function enforce(buckets: readonly SecurityRateLimitBucket[]) {
  const decision = await consumeSecurityRateLimitBuckets(buckets);
  if (!decision.allowed) throw new SecurityRateLimitExceededError(decision.retryAfterSeconds);
}

function context(headers: Pick<Headers, "get">) {
  return {
    headers,
    secret: process.env.AUTH_SECRET ?? "",
    trustProxy: isRateLimitProxyTrustEnabled(process.env.AUTH_RATE_LIMIT_TRUST_PROXY),
  };
}
