CREATE TABLE ihk_exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed')),
  seed text NOT NULL CHECK (seed ~ '^[0-9a-f]{32}$'),
  question_count integer NOT NULL DEFAULT 30 CHECK (question_count = 30),
  correct_count integer CHECK (
    correct_count IS NULL OR correct_count BETWEEN 0 AND question_count
  ),
  passed boolean,
  completion_reason text CHECK (
    completion_reason IS NULL OR completion_reason IN ('submitted', 'timeout')
  ),
  started_at timestamptz NOT NULL,
  deadline_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (deadline_at = started_at + interval '45 minutes'),
  CHECK (started_at >= created_at),
  CHECK (updated_at >= created_at),
  CHECK (
    (status = 'in_progress'
      AND correct_count IS NULL
      AND passed IS NULL
      AND completion_reason IS NULL
      AND completed_at IS NULL)
    OR
    (status = 'completed'
      AND correct_count IS NOT NULL
      AND passed IS NOT NULL
      AND completion_reason IS NOT NULL
      AND completed_at IS NOT NULL)
  ),
  CHECK (passed IS NULL OR passed = (correct_count * 2 >= question_count)),
  CHECK (
    completed_at IS NULL
    OR (completion_reason = 'submitted' AND completed_at >= started_at AND completed_at < deadline_at)
    OR (completion_reason = 'timeout' AND completed_at = deadline_at)
  )
);

CREATE UNIQUE INDEX ihk_exam_attempts_one_active_per_user
  ON ihk_exam_attempts (user_id)
  WHERE status = 'in_progress';

CREATE INDEX ihk_exam_attempts_user_history_idx
  ON ihk_exam_attempts (user_id, completed_at DESC, id DESC)
  WHERE status = 'completed';

CREATE TABLE ihk_exam_attempt_questions (
  attempt_id uuid NOT NULL REFERENCES ihk_exam_attempts(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 30),
  question_id text NOT NULL CHECK (
    char_length(question_id) BETWEEN 3 AND 240
    AND question_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  question_revision integer NOT NULL CHECK (question_revision > 0),
  category_id text NOT NULL CHECK (
    category_id IN ('netzwerke', 'betriebssysteme', 'server-dienste', 'troubleshooting')
  ),
  render_snapshot jsonb NOT NULL CHECK (jsonb_typeof(render_snapshot) = 'object'),
  grading_snapshot jsonb NOT NULL CHECK (jsonb_typeof(grading_snapshot) = 'object'),
  selected_option_ids text[] NOT NULL DEFAULT ARRAY[]::text[] CHECK (
    array_position(selected_option_ids, NULL) IS NULL
  ),
  answered_at timestamptz,
  is_correct boolean,
  PRIMARY KEY (attempt_id, position),
  UNIQUE (attempt_id, question_id),
  CHECK (
    (cardinality(selected_option_ids) = 0 AND answered_at IS NULL)
    OR (cardinality(selected_option_ids) > 0 AND answered_at IS NOT NULL)
  )
);

CREATE FUNCTION prevent_ihk_exam_attempt_identity_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.seed IS DISTINCT FROM OLD.seed
    OR NEW.question_count IS DISTINCT FROM OLD.question_count
    OR NEW.started_at IS DISTINCT FROM OLD.started_at
    OR NEW.deadline_at IS DISTINCT FROM OLD.deadline_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'IHK exam attempt identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ihk_exam_attempt_identity_immutable
BEFORE UPDATE ON ihk_exam_attempts
FOR EACH ROW
EXECUTE FUNCTION prevent_ihk_exam_attempt_identity_changes();

CREATE FUNCTION validate_ihk_exam_attempt_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  persisted_question_count integer;
  persisted_graded_count integer;
  persisted_correct_count integer;
BEGIN
  IF OLD.status = 'completed' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'completed IHK exam attempt is immutable';
  END IF;

  IF OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
    SELECT count(*), count(*) FILTER (WHERE is_correct IS NOT NULL),
      count(*) FILTER (WHERE is_correct = true)
    INTO persisted_question_count, persisted_graded_count, persisted_correct_count
    FROM ihk_exam_attempt_questions
    WHERE attempt_id = OLD.id;

    IF persisted_question_count <> OLD.question_count
      OR persisted_graded_count <> OLD.question_count
      OR persisted_correct_count <> NEW.correct_count THEN
      RAISE EXCEPTION 'IHK exam completion does not match persisted question grading';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ihk_exam_attempt_completion_immutable
BEFORE UPDATE ON ihk_exam_attempts
FOR EACH ROW
EXECUTE FUNCTION validate_ihk_exam_attempt_completion();

CREATE FUNCTION prevent_ihk_exam_question_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  attempt_status text;
BEGIN
  IF NEW.attempt_id IS DISTINCT FROM OLD.attempt_id
    OR NEW.position IS DISTINCT FROM OLD.position
    OR NEW.question_id IS DISTINCT FROM OLD.question_id
    OR NEW.question_revision IS DISTINCT FROM OLD.question_revision
    OR NEW.category_id IS DISTINCT FROM OLD.category_id
    OR NEW.render_snapshot IS DISTINCT FROM OLD.render_snapshot
    OR NEW.grading_snapshot IS DISTINCT FROM OLD.grading_snapshot THEN
    RAISE EXCEPTION 'IHK exam question snapshot is immutable';
  END IF;

  SELECT status INTO attempt_status
  FROM ihk_exam_attempts
  WHERE id = OLD.attempt_id;

  IF attempt_status = 'completed'
    AND (
      NEW.selected_option_ids IS DISTINCT FROM OLD.selected_option_ids
      OR NEW.answered_at IS DISTINCT FROM OLD.answered_at
      OR NEW.is_correct IS DISTINCT FROM OLD.is_correct
    ) THEN
    RAISE EXCEPTION 'completed IHK exam answer is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ihk_exam_question_immutable
BEFORE UPDATE ON ihk_exam_attempt_questions
FOR EACH ROW
EXECUTE FUNCTION prevent_ihk_exam_question_changes();
