CREATE TABLE web_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (
    char_length(endpoint) BETWEEN 12 AND 2048
    AND endpoint ~ '^https://[^[:space:]]+$'
    AND endpoint !~ '[[:cntrl:]]'
  ),
  p256dh text NOT NULL CHECK (
    char_length(p256dh) = 87
    AND p256dh ~ '^[A-Za-z0-9_-]+$'
  ),
  auth text NOT NULL CHECK (
    char_length(auth) = 22
    AND auth ~ '^[A-Za-z0-9_-]+$'
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (updated_at >= created_at)
);

CREATE INDEX web_push_subscriptions_user_idx
  ON web_push_subscriptions (user_id, created_at, id);
