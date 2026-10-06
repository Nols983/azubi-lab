CREATE TABLE curriculum_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  module_slug text NOT NULL CHECK (
    char_length(module_slug) BETWEEN 1 AND 160
    AND module_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  assigned_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  target_at timestamptz,
  note text CHECK (
    note IS NULL
    OR (
      char_length(note) BETWEEN 1 AND 1000
      AND char_length(btrim(note)) > 0
    )
  ),
  archived_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learner_id, module_slug),
  CHECK (updated_at >= assigned_at),
  CHECK (archived_at IS NULL OR archived_at >= assigned_at)
);

CREATE INDEX curriculum_assignments_learner_active_idx
  ON curriculum_assignments (learner_id, assigned_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX curriculum_assignments_module_active_idx
  ON curriculum_assignments (module_slug, learner_id)
  WHERE archived_at IS NULL;

CREATE INDEX curriculum_assignments_active_target_idx
  ON curriculum_assignments (target_at, learner_id)
  WHERE archived_at IS NULL AND target_at IS NOT NULL;
