import "server-only";

import type { SecurityRateLimitBucket } from "../security-rate-limit.ts";
import { withTransaction } from "./db.ts";

type DecisionRow = {
  allowed: boolean;
  retry_after_seconds: number;
};

export type SecurityRateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function consumeSecurityRateLimitBuckets(
  buckets: readonly SecurityRateLimitBucket[],
): Promise<SecurityRateLimitDecision> {
  return withTransaction(async (client) => {
    await client.query(
      `DELETE FROM security_rate_limits
       WHERE window_ends_at < statement_timestamp() - interval '24 hours'`,
    );

    let allowed = true;
    let retryAfterSeconds = 0;
    for (const rateLimitBucket of [...buckets].sort(compareBuckets)) {
      const result = await client.query<DecisionRow>(
        `INSERT INTO security_rate_limits
           (bucket_type, bucket_key, window_started_at, window_ends_at, attempt_count, updated_at)
         VALUES
           ($1, $2, statement_timestamp(), statement_timestamp() + make_interval(secs => $3), 1, statement_timestamp())
         ON CONFLICT (bucket_type, bucket_key) DO UPDATE
         SET window_started_at = CASE
               WHEN security_rate_limits.window_ends_at <= statement_timestamp() THEN statement_timestamp()
               ELSE security_rate_limits.window_started_at
             END,
             window_ends_at = CASE
               WHEN security_rate_limits.window_ends_at <= statement_timestamp()
                 THEN statement_timestamp() + make_interval(secs => $3)
               ELSE security_rate_limits.window_ends_at
             END,
             attempt_count = CASE
               WHEN security_rate_limits.window_ends_at <= statement_timestamp() THEN 1
               ELSE security_rate_limits.attempt_count + 1
             END,
             updated_at = statement_timestamp()
         RETURNING attempt_count <= $4 AS allowed,
           GREATEST(1, ceil(extract(epoch FROM (window_ends_at - statement_timestamp()))))::integer
             AS retry_after_seconds`,
        [rateLimitBucket.type, rateLimitBucket.key, rateLimitBucket.windowSeconds, rateLimitBucket.limit],
      );
      const decision = result.rows[0];
      if (!decision.allowed) {
        allowed = false;
        retryAfterSeconds = Math.max(retryAfterSeconds, decision.retry_after_seconds);
      }
    }
    return { allowed, retryAfterSeconds };
  });
}

export function clearSecurityRateLimitBuckets(buckets: readonly SecurityRateLimitBucket[]) {
  if (buckets.length === 0) return Promise.resolve();
  return withTransaction(async (client) => {
    await client.query(
      `DELETE FROM security_rate_limits
       WHERE (bucket_type, bucket_key) IN (
         SELECT bucket_type, bucket_key
         FROM unnest($1::text[], $2::text[]) AS target(bucket_type, bucket_key)
       )`,
      [buckets.map(({ type }) => type), buckets.map(({ key }) => key)],
    );
  });
}

function compareBuckets(left: SecurityRateLimitBucket, right: SecurityRateLimitBucket) {
  return left.type.localeCompare(right.type) || left.key.localeCompare(right.key);
}
