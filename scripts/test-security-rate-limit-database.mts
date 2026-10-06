import assert from "node:assert/strict";
import { getDatabasePool } from "../src/app/lib/server/db.ts";
import {
  clearSecurityRateLimitBuckets,
  consumeSecurityRateLimitBuckets,
} from "../src/app/lib/server/security-rate-limit-repository.ts";
import type { SecurityRateLimitBucket } from "../src/app/lib/security-rate-limit.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const prefix = crypto.randomUUID().replaceAll("-", "");

try {
  const migration = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations WHERE filename = '0016_security_rate_limits.sql'",
  );
  assert.equal(migration.rows[0]?.filename, "0016_security_rate_limits.sql");

  const normal = testBucket("login-identifier", `${prefix}01`, 2);
  assert.equal((await consumeSecurityRateLimitBuckets([normal])).allowed, true);
  assert.equal((await consumeSecurityRateLimitBuckets([normal])).allowed, true);
  const blocked = await consumeSecurityRateLimitBuckets([normal]);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0 && blocked.retryAfterSeconds <= 60);

  await clearSecurityRateLimitBuckets([normal]);
  assert.equal((await consumeSecurityRateLimitBuckets([normal])).allowed, true);

  const concurrent = testBucket("login-network", `${prefix}02`, 5);
  const decisions = await Promise.all(
    Array.from({ length: 20 }, () => consumeSecurityRateLimitBuckets([concurrent])),
  );
  assert.equal(decisions.filter(({ allowed }) => allowed).length, 5);
  assert.equal(decisions.filter(({ allowed }) => !allowed).length, 15);
  const stored = await pool.query<{ attempt_count: number }>(
    "SELECT attempt_count FROM security_rate_limits WHERE bucket_type = $1 AND bucket_key = $2",
    [concurrent.type, concurrent.key],
  );
  assert.equal(stored.rows[0]?.attempt_count, 20);

  const expiredKey = `${prefix}03`.padEnd(64, "0").slice(0, 64);
  await pool.query(
    `INSERT INTO security_rate_limits
       (bucket_type, bucket_key, window_started_at, window_ends_at, attempt_count, updated_at)
     VALUES ('password-reset-token', $1, now() - interval '2 days', now() - interval '25 hours', 1, now() - interval '2 days')`,
    [expiredKey],
  );
  const cleanupTrigger = testBucket("password-reset-global", `${prefix}04`, 10);
  await consumeSecurityRateLimitBuckets([cleanupTrigger]);
  assert.equal(Number((await pool.query(
    "SELECT count(*) FROM security_rate_limits WHERE bucket_key = $1",
    [expiredKey],
  )).rows[0].count), 0);

  await assert.rejects(
    () => pool.query(
      `INSERT INTO security_rate_limits
         (bucket_type, bucket_key, window_started_at, window_ends_at, attempt_count, updated_at)
       VALUES ('login-identifier', 'raw-login-anna', now(), now() + interval '1 minute', 1, now())`,
    ),
    (error: unknown) => postgresCode(error) === "23514",
  );

  console.log("Security rate-limit database integration: PASS");
} finally {
  await pool.query("DELETE FROM security_rate_limits WHERE bucket_key LIKE $1", [`${prefix}%`]);
  await pool.end();
}

function testBucket(
  type: SecurityRateLimitBucket["type"],
  keyPrefix: string,
  limit: number,
): SecurityRateLimitBucket {
  return {
    type,
    key: keyPrefix.padEnd(64, "0").slice(0, 64),
    limit,
    windowSeconds: 60,
  };
}

function postgresCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
}
