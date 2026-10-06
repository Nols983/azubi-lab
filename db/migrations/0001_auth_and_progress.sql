CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login_identifier text NOT NULL CHECK (char_length(login_identifier) BETWEEN 1 AND 254),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  password_hash text NOT NULL CHECK (char_length(password_hash) BETWEEN 1 AND 512),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz
);

CREATE UNIQUE INDEX users_login_identifier_lower_key
  ON users (lower(login_identifier));

CREATE TABLE lesson_progress (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_slug text NOT NULL CHECK (char_length(module_slug) BETWEEN 1 AND 160),
  lesson_slug text NOT NULL CHECK (char_length(lesson_slug) BETWEEN 1 AND 160),
  status text NOT NULL CHECK (status IN ('in-progress', 'completed')),
  first_opened_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  completed_at timestamptz,
  PRIMARY KEY (user_id, module_slug, lesson_slug),
  CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status = 'in-progress' AND completed_at IS NULL)
  ),
  CHECK (updated_at >= first_opened_at)
);

CREATE INDEX lesson_progress_user_updated_idx
  ON lesson_progress (user_id, updated_at DESC);

CREATE TABLE quiz_progress (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_slug text NOT NULL CHECK (char_length(module_slug) BETWEEN 1 AND 160),
  attempts integer NOT NULL CHECK (attempts >= 1),
  latest_correct integer NOT NULL CHECK (latest_correct >= 0),
  latest_total integer NOT NULL CHECK (latest_total > 0),
  latest_percentage integer NOT NULL CHECK (latest_percentage BETWEEN 0 AND 100),
  best_correct integer NOT NULL CHECK (best_correct >= 0),
  best_total integer NOT NULL CHECK (best_total > 0),
  best_percentage integer NOT NULL CHECK (best_percentage BETWEEN 0 AND 100),
  last_submitted_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, module_slug),
  CHECK (latest_correct <= latest_total),
  CHECK (best_correct <= best_total),
  CHECK (latest_percentage = round((latest_correct::numeric / latest_total) * 100)),
  CHECK (best_percentage = round((best_correct::numeric / best_total) * 100))
);

CREATE INDEX quiz_progress_user_submitted_idx
  ON quiz_progress (user_id, last_submitted_at DESC);

CREATE TABLE local_progress_imports (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_hash text NOT NULL CHECK (char_length(snapshot_hash) = 64),
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, snapshot_hash)
);
