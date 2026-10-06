CREATE TABLE challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  short_description text NOT NULL CHECK (char_length(short_description) BETWEEN 3 AND 300),
  instructions text NOT NULL CHECK (char_length(instructions) BETWEEN 1 AND 10000),
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  estimated_minutes integer CHECK (estimated_minutes BETWEEN 1 AND 1440),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX challenges_status_created_idx
  ON challenges (status, created_at DESC);

CREATE TABLE challenge_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE RESTRICT,
  learner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  UNIQUE (challenge_id, learner_id),
  CHECK (started_at IS NULL OR started_at >= assigned_at),
  CHECK (completed_at IS NULL OR (started_at IS NOT NULL AND completed_at >= started_at))
);

CREATE INDEX challenge_assignments_learner_state_idx
  ON challenge_assignments (learner_id, completed_at, due_at, assigned_at DESC);

CREATE INDEX challenge_assignments_challenge_assigned_idx
  ON challenge_assignments (challenge_id, assigned_at DESC);

CREATE INDEX challenge_assignments_incomplete_due_idx
  ON challenge_assignments (due_at)
  WHERE completed_at IS NULL AND due_at IS NOT NULL;
