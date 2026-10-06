CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'curriculum-due',
    'curriculum-overdue',
    'challenge-due',
    'challenge-overdue',
    'challenge-revision',
    'challenge-approved',
    'challenge-review-pending',
    'trainer-curriculum-overdue',
    'trainer-challenge-overdue',
    'activity-digest'
  )),
  title text NOT NULL CHECK (
    char_length(title) BETWEEN 1 AND 160
    AND char_length(btrim(title)) > 0
  ),
  message text NOT NULL CHECK (
    char_length(message) BETWEEN 1 AND 1000
    AND char_length(btrim(message)) > 0
  ),
  href text CHECK (
    href IS NULL
    OR (
      char_length(href) BETWEEN 1 AND 500
      AND left(href, 1) = '/'
      AND left(href, 2) <> '//'
      AND strpos(href, chr(92)) = 0
      AND href !~ '[[:cntrl:]]'
    )
  ),
  dedupe_key text NOT NULL CHECK (
    char_length(dedupe_key) BETWEEN 1 AND 300
    AND dedupe_key ~ '^[a-z0-9][a-z0-9:._-]*$'
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  dismissed_at timestamptz,
  UNIQUE (user_id, dedupe_key),
  CHECK (read_at IS NULL OR read_at >= created_at),
  CHECK (dismissed_at IS NULL OR dismissed_at >= created_at)
);

CREATE INDEX notifications_user_recent_idx
  ON notifications (user_id, created_at DESC, id DESC)
  WHERE dismissed_at IS NULL;

CREATE INDEX notifications_user_unread_idx
  ON notifications (user_id, created_at DESC, id DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;
