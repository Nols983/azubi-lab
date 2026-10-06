CREATE TABLE challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES challenge_assignments(id) ON DELETE RESTRICT,
  submission_number integer NOT NULL CHECK (submission_number > 0),
  content text NOT NULL CHECK (
    char_length(content) BETWEEN 1 AND 20000
    AND char_length(btrim(content)) > 0
  ),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, submission_number)
);

CREATE INDEX challenge_submissions_assignment_history_idx
  ON challenge_submissions (assignment_id, submission_number DESC);

CREATE INDEX challenge_submissions_submitted_idx
  ON challenge_submissions (submitted_at DESC);

CREATE TABLE challenge_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL UNIQUE REFERENCES challenge_submissions(id) ON DELETE RESTRICT,
  reviewed_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('approved', 'revision-requested')),
  feedback text NOT NULL DEFAULT '' CHECK (
    char_length(feedback) <= 10000
    AND (decision = 'approved' OR char_length(btrim(feedback)) > 0)
  ),
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX challenge_reviews_reviewer_time_idx
  ON challenge_reviews (reviewed_by, reviewed_at DESC);
