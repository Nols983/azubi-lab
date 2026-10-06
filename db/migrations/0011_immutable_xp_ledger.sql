CREATE TABLE xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (
    source_type IN ('lesson', 'module_quiz', 'challenge', 'practice_quiz')
  ),
  source_key text NOT NULL CHECK (char_length(source_key) BETWEEN 1 AND 360),
  xp_amount integer NOT NULL CHECK (xp_amount BETWEEN 1 AND 1000),
  awarded_at timestamptz NOT NULL,
  reward_date date,
  daily_slot smallint,
  UNIQUE (user_id, source_type, source_key),
  CHECK (
    (
      source_type = 'practice_quiz'
      AND reward_date IS NOT NULL
      AND daily_slot BETWEEN 1 AND 3
    )
    OR
    (
      source_type <> 'practice_quiz'
      AND reward_date IS NULL
      AND daily_slot IS NULL
    )
  )
);

CREATE INDEX xp_events_user_awarded_idx
  ON xp_events (user_id, awarded_at DESC, id DESC);

CREATE UNIQUE INDEX xp_events_practice_daily_slot_key
  ON xp_events (user_id, reward_date, daily_slot)
  WHERE source_type = 'practice_quiz';

CREATE FUNCTION prevent_xp_event_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.source_type IS DISTINCT FROM OLD.source_type
    OR NEW.source_key IS DISTINCT FROM OLD.source_key
    OR NEW.xp_amount IS DISTINCT FROM OLD.xp_amount
    OR NEW.awarded_at IS DISTINCT FROM OLD.awarded_at
    OR NEW.reward_date IS DISTINCT FROM OLD.reward_date
    OR NEW.daily_slot IS DISTINCT FROM OLD.daily_slot THEN
    RAISE EXCEPTION 'xp events are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER xp_events_immutable
BEFORE UPDATE ON xp_events
FOR EACH ROW
EXECUTE FUNCTION prevent_xp_event_changes();

INSERT INTO xp_events (user_id, source_type, source_key, xp_amount, awarded_at)
SELECT progress.user_id, 'lesson', progress.module_slug || ':' || progress.lesson_slug,
       25, progress.completed_at
FROM lesson_progress progress
JOIN users learner ON learner.id = progress.user_id
WHERE progress.status = 'completed'
  AND progress.completed_at IS NOT NULL
  AND learner.role = 'learner'
  AND learner.disabled_at IS NULL
ON CONFLICT (user_id, source_type, source_key) DO NOTHING;

INSERT INTO xp_events (user_id, source_type, source_key, xp_amount, awarded_at)
SELECT progress.user_id, 'module_quiz', progress.module_slug,
       100, progress.last_submitted_at
FROM quiz_progress progress
JOIN users learner ON learner.id = progress.user_id
WHERE learner.role = 'learner'
  AND learner.disabled_at IS NULL
ON CONFLICT (user_id, source_type, source_key) DO NOTHING;

WITH approved_assignments AS (
  SELECT assignment.id, assignment.learner_id,
    CASE
      WHEN assignment.completed_at IS NOT NULL THEN assignment.completed_at
      ELSE min(review.reviewed_at) FILTER (WHERE review.decision = 'approved')
    END AS awarded_at
  FROM challenge_assignments assignment
  LEFT JOIN challenge_submissions submission ON submission.assignment_id = assignment.id
  LEFT JOIN challenge_reviews review ON review.submission_id = submission.id
  GROUP BY assignment.id, assignment.learner_id, assignment.completed_at
  HAVING assignment.completed_at IS NOT NULL
    OR min(review.reviewed_at) FILTER (WHERE review.decision = 'approved') IS NOT NULL
)
INSERT INTO xp_events (user_id, source_type, source_key, xp_amount, awarded_at)
SELECT approved.learner_id, 'challenge', approved.id::text, 150, approved.awarded_at
FROM approved_assignments approved
JOIN users learner ON learner.id = approved.learner_id
WHERE learner.role = 'learner'
  AND learner.disabled_at IS NULL
ON CONFLICT (user_id, source_type, source_key) DO NOTHING;

WITH ranked_practice_attempts AS (
  SELECT attempt.id, attempt.user_id, attempt.correct_count, attempt.question_count,
    attempt.completed_at,
    (attempt.completed_at AT TIME ZONE 'Europe/Berlin')::date AS reward_date,
    row_number() OVER (
      PARTITION BY attempt.user_id,
        (attempt.completed_at AT TIME ZONE 'Europe/Berlin')::date
      ORDER BY attempt.completed_at ASC, attempt.id ASC
    ) AS daily_slot
  FROM practice_quiz_attempts attempt
  JOIN users learner ON learner.id = attempt.user_id
  WHERE attempt.status = 'completed'
    AND attempt.correct_count IS NOT NULL
    AND attempt.completed_at IS NOT NULL
    AND learner.role = 'learner'
    AND learner.disabled_at IS NULL
)
INSERT INTO xp_events (
  user_id, source_type, source_key, xp_amount, awarded_at, reward_date, daily_slot
)
SELECT ranked.user_id, 'practice_quiz', ranked.id::text,
  CASE
    WHEN ranked.correct_count * 100 < ranked.question_count * 50 THEN 20
    WHEN ranked.correct_count * 100 < ranked.question_count * 70 THEN 40
    WHEN ranked.correct_count * 100 < ranked.question_count * 85 THEN 60
    WHEN ranked.correct_count * 100 < ranked.question_count * 95 THEN 80
    ELSE 100
  END,
  ranked.completed_at, ranked.reward_date, ranked.daily_slot
FROM ranked_practice_attempts ranked
WHERE ranked.daily_slot <= 3
ON CONFLICT (user_id, source_type, source_key) DO NOTHING;
