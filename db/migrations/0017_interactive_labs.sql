CREATE TABLE interactive_lab_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab_id text NOT NULL CHECK (
    char_length(lab_id) BETWEEN 3 AND 120
    AND lab_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  lab_version integer NOT NULL CHECK (lab_version > 0),
  mode text NOT NULL CHECK (mode IN ('learner', 'preview')),
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed')),
  state_json jsonb NOT NULL CHECK (jsonb_typeof(state_json) = 'object'),
  state_revision integer NOT NULL DEFAULT 0 CHECK (state_revision >= 0),
  selected_device_id text NOT NULL CHECK (
    char_length(selected_device_id) BETWEEN 1 AND 80
    AND selected_device_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  revealed_hint_count integer NOT NULL DEFAULT 0 CHECK (revealed_hint_count BETWEEN 0 AND 20),
  run_number integer NOT NULL DEFAULT 1 CHECK (run_number BETWEEN 1 AND 10000),
  last_event_sequence integer NOT NULL DEFAULT 0 CHECK (last_event_sequence >= 0),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  CHECK (updated_at >= started_at),
  CHECK (
    (status = 'in_progress' AND completed_at IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL AND completed_at >= started_at)
  )
);

CREATE UNIQUE INDEX interactive_lab_attempts_one_active
  ON interactive_lab_attempts (user_id, lab_id, lab_version, mode)
  WHERE status = 'in_progress';

CREATE INDEX interactive_lab_attempts_user_catalogue_idx
  ON interactive_lab_attempts (user_id, mode, lab_id, lab_version, status, updated_at DESC);

CREATE TABLE interactive_lab_events (
  attempt_id uuid NOT NULL REFERENCES interactive_lab_attempts(id) ON DELETE CASCADE,
  sequence integer NOT NULL CHECK (sequence > 0),
  run_number integer NOT NULL CHECK (run_number BETWEEN 1 AND 10000),
  kind text NOT NULL CHECK (kind IN ('command', 'configuration', 'hint', 'device', 'completion', 'reset')),
  device_id text CHECK (
    device_id IS NULL OR (
      char_length(device_id) BETWEEN 1 AND 80
      AND device_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
  ),
  command_text text CHECK (command_text IS NULL OR char_length(command_text) BETWEEN 1 AND 160),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (attempt_id, sequence)
);

CREATE INDEX interactive_lab_events_review_idx
  ON interactive_lab_events (attempt_id, run_number, sequence);

CREATE FUNCTION prevent_interactive_lab_attempt_identity_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.lab_id IS DISTINCT FROM OLD.lab_id
    OR NEW.lab_version IS DISTINCT FROM OLD.lab_version
    OR NEW.mode IS DISTINCT FROM OLD.mode
    OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'interactive lab attempt identity is immutable';
  END IF;

  IF OLD.status = 'completed' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'completed interactive lab attempt is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER interactive_lab_attempt_identity_immutable
BEFORE UPDATE ON interactive_lab_attempts
FOR EACH ROW
EXECUTE FUNCTION prevent_interactive_lab_attempt_identity_changes();

CREATE FUNCTION prevent_completed_interactive_lab_events()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  attempt_status text;
BEGIN
  SELECT status INTO attempt_status
  FROM interactive_lab_attempts
  WHERE id = NEW.attempt_id;

  IF attempt_status = 'completed' THEN
    RAISE EXCEPTION 'completed interactive lab history is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER interactive_lab_event_completed_guard
BEFORE INSERT OR UPDATE ON interactive_lab_events
FOR EACH ROW
EXECUTE FUNCTION prevent_completed_interactive_lab_events();
