CREATE TABLE practice_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed')),
  selected_category_ids text[] NOT NULL CHECK (
    cardinality(selected_category_ids) BETWEEN 1 AND 4
    AND selected_category_ids <@ ARRAY[
      'netzwerke',
      'betriebssysteme',
      'server-dienste',
      'troubleshooting'
    ]::text[]
  ),
  seed text NOT NULL CHECK (seed ~ '^[0-9a-f]{32}$'),
  question_count integer NOT NULL DEFAULT 15 CHECK (question_count = 15),
  correct_count integer CHECK (
    correct_count IS NULL
    OR correct_count BETWEEN 0 AND question_count
  ),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status = 'in_progress' AND correct_count IS NULL AND completed_at IS NULL)
    OR
    (status = 'completed' AND correct_count IS NOT NULL AND completed_at IS NOT NULL)
  ),
  CHECK (started_at >= created_at),
  CHECK (updated_at >= created_at),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX practice_quiz_attempts_user_recent_idx
  ON practice_quiz_attempts (user_id, started_at DESC, id DESC);

CREATE TABLE practice_quiz_attempt_questions (
  attempt_id uuid NOT NULL REFERENCES practice_quiz_attempts(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 15),
  question_id text NOT NULL CHECK (
    char_length(question_id) BETWEEN 3 AND 240
    AND question_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  question_revision integer NOT NULL CHECK (question_revision > 0),
  render_snapshot jsonb NOT NULL CHECK (jsonb_typeof(render_snapshot) = 'object'),
  grading_snapshot jsonb NOT NULL CHECK (jsonb_typeof(grading_snapshot) = 'object'),
  submitted_option_ids text[],
  is_correct boolean,
  answered_at timestamptz,
  PRIMARY KEY (attempt_id, position),
  UNIQUE (attempt_id, question_id),
  CHECK (
    (
      submitted_option_ids IS NULL
      AND is_correct IS NULL
      AND answered_at IS NULL
    )
    OR
    (
      submitted_option_ids IS NOT NULL
      AND cardinality(submitted_option_ids) > 0
      AND array_position(submitted_option_ids, NULL) IS NULL
      AND is_correct IS NOT NULL
      AND answered_at IS NOT NULL
    )
  )
);

CREATE FUNCTION prevent_practice_quiz_attempt_identity_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.selected_category_ids IS DISTINCT FROM OLD.selected_category_ids
    OR NEW.seed IS DISTINCT FROM OLD.seed
    OR NEW.question_count IS DISTINCT FROM OLD.question_count
    OR NEW.started_at IS DISTINCT FROM OLD.started_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'practice quiz attempt identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER practice_quiz_attempt_identity_immutable
BEFORE UPDATE ON practice_quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION prevent_practice_quiz_attempt_identity_changes();

CREATE FUNCTION prevent_completed_practice_quiz_attempt_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'completed'
    AND (
      NEW.status IS DISTINCT FROM OLD.status
      OR NEW.correct_count IS DISTINCT FROM OLD.correct_count
      OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
    ) THEN
    RAISE EXCEPTION 'completed practice quiz attempt result is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER practice_quiz_attempt_completion_immutable
BEFORE UPDATE ON practice_quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION prevent_completed_practice_quiz_attempt_changes();

CREATE FUNCTION prevent_practice_quiz_question_snapshot_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.attempt_id IS DISTINCT FROM OLD.attempt_id
    OR NEW.position IS DISTINCT FROM OLD.position
    OR NEW.question_id IS DISTINCT FROM OLD.question_id
    OR NEW.question_revision IS DISTINCT FROM OLD.question_revision
    OR NEW.render_snapshot IS DISTINCT FROM OLD.render_snapshot
    OR NEW.grading_snapshot IS DISTINCT FROM OLD.grading_snapshot THEN
    RAISE EXCEPTION 'practice quiz question snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER practice_quiz_question_snapshot_immutable
BEFORE UPDATE ON practice_quiz_attempt_questions
FOR EACH ROW
EXECUTE FUNCTION prevent_practice_quiz_question_snapshot_changes();

CREATE FUNCTION prevent_answered_practice_quiz_question_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.submitted_option_ids IS NOT NULL
    AND (
      NEW.submitted_option_ids IS DISTINCT FROM OLD.submitted_option_ids
      OR NEW.is_correct IS DISTINCT FROM OLD.is_correct
      OR NEW.answered_at IS DISTINCT FROM OLD.answered_at
    ) THEN
    RAISE EXCEPTION 'answered practice quiz question result is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER practice_quiz_question_answer_immutable
BEFORE UPDATE ON practice_quiz_attempt_questions
FOR EACH ROW
EXECUTE FUNCTION prevent_answered_practice_quiz_question_changes();
