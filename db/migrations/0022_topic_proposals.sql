CREATE TABLE topic_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 6000),
  learning_objective text NOT NULL CHECK (char_length(learning_objective) BETWEEN 10 AND 3000),
  category text NOT NULL CHECK (char_length(category) BETWEEN 2 AND 100),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in-review', 'accepted', 'rejected')),
  admin_feedback text CHECK (char_length(admin_feedback) <= 3000),
  reviewed_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX topic_proposals_creator_created_idx ON topic_proposals (created_by, created_at DESC);
CREATE INDEX topic_proposals_status_created_idx ON topic_proposals (status, created_at DESC);
