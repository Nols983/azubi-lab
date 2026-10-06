CREATE TABLE challenge_submission_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES challenge_submissions(id) ON DELETE RESTRICT,
  storage_key text NOT NULL UNIQUE CHECK (
    storage_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  original_filename text NOT NULL CHECK (char_length(original_filename) BETWEEN 1 AND 180),
  mime_type text NOT NULL CHECK (
    mime_type IN ('image/png', 'image/jpeg', 'application/pdf', 'text/plain', 'text/csv')
  ),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX challenge_submission_attachments_submission_idx
  ON challenge_submission_attachments (submission_id, created_at, id);

CREATE TABLE challenge_assignment_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES challenge_assignments(id) ON DELETE RESTRICT,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body text NOT NULL CHECK (
    char_length(body) BETWEEN 1 AND 5000
    AND char_length(btrim(body)) > 0
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX challenge_assignment_comments_thread_idx
  ON challenge_assignment_comments (assignment_id, created_at, id);

CREATE TABLE challenge_rubric_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 10),
  title text NOT NULL CHECK (
    char_length(title) BETWEEN 1 AND 120
    AND char_length(btrim(title)) > 0
  ),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  max_points integer NOT NULL CHECK (max_points BETWEEN 1 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, position)
);

CREATE INDEX challenge_rubric_criteria_challenge_order_idx
  ON challenge_rubric_criteria (challenge_id, position);

CREATE TABLE challenge_review_criterion_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES challenge_reviews(id) ON DELETE RESTRICT,
  criterion_id uuid REFERENCES challenge_rubric_criteria(id) ON DELETE SET NULL,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 10),
  criterion_title_snapshot text NOT NULL CHECK (
    char_length(criterion_title_snapshot) BETWEEN 1 AND 120
    AND char_length(btrim(criterion_title_snapshot)) > 0
  ),
  criterion_description_snapshot text NOT NULL DEFAULT ''
    CHECK (char_length(criterion_description_snapshot) <= 1000),
  max_points_snapshot integer NOT NULL CHECK (max_points_snapshot BETWEEN 1 AND 20),
  awarded_points integer NOT NULL CHECK (
    awarded_points >= 0
    AND awarded_points <= max_points_snapshot
  ),
  UNIQUE (review_id, position),
  UNIQUE (review_id, criterion_id)
);

CREATE INDEX challenge_review_criterion_results_review_order_idx
  ON challenge_review_criterion_results (review_id, position);
