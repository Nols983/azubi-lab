CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  slug text NOT NULL CHECK (
    char_length(slug) BETWEEN 2 AND 96
    AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX teams_name_lower_key ON teams (lower(name));
CREATE UNIQUE INDEX teams_slug_key ON teams (slug);
CREATE INDEX teams_active_name_idx ON teams (active DESC, lower(name), id);

CREATE TABLE team_members (
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_role text NOT NULL DEFAULT 'member' CHECK (team_role IN ('member', 'manager')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX team_members_user_team_idx ON team_members (user_id, team_id);
