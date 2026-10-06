ALTER TABLE users
  ADD COLUMN role text NOT NULL DEFAULT 'learner'
    CHECK (role IN ('admin', 'learner')),
  ADD COLUMN must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN auth_version integer NOT NULL DEFAULT 1
    CHECK (auth_version >= 1),
  ADD COLUMN password_changed_at timestamptz;

CREATE INDEX users_role_created_idx
  ON users (role, created_at DESC);
