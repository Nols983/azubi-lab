CREATE TABLE security_rate_limits (
  bucket_type text NOT NULL CHECK (bucket_type IN (
    'login-global',
    'login-identifier',
    'login-network',
    'login-identifier-network',
    'password-reset-global',
    'password-reset-token',
    'password-reset-network'
  )),
  bucket_key text NOT NULL CHECK (bucket_key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL,
  window_ends_at timestamptz NOT NULL,
  attempt_count integer NOT NULL CHECK (attempt_count >= 1),
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (bucket_type, bucket_key),
  CHECK (window_ends_at > window_started_at)
);

CREATE INDEX security_rate_limits_expiry_idx
  ON security_rate_limits (window_ends_at);
