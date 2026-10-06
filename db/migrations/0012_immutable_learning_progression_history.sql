CREATE TABLE lesson_completion_history (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_slug text NOT NULL CHECK (char_length(module_slug) BETWEEN 1 AND 160),
  lesson_slug text NOT NULL CHECK (char_length(lesson_slug) BETWEEN 1 AND 160),
  first_completed_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, module_slug, lesson_slug)
);

CREATE FUNCTION prevent_learning_progression_history_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'learning progression history is immutable';
END;
$$;

CREATE TRIGGER lesson_completion_history_immutable
BEFORE UPDATE ON lesson_completion_history
FOR EACH ROW
EXECUTE FUNCTION prevent_learning_progression_history_changes();

-- Preserve the earliest evidence already recorded by the XP ledger, including
-- lessons that were completed and later reset in the current-progress table.
INSERT INTO lesson_completion_history
  (user_id, module_slug, lesson_slug, first_completed_at)
SELECT event.user_id, progress.module_slug, progress.lesson_slug, event.awarded_at
FROM xp_events event
JOIN lesson_progress progress
  ON progress.user_id = event.user_id
 AND event.source_key = progress.module_slug || ':' || progress.lesson_slug
WHERE event.source_type = 'lesson'
ON CONFLICT (user_id, module_slug, lesson_slug) DO NOTHING;

-- Current progress is authoritative even when no XP was awarded, for example
-- after an anonymous import or content activity while the account was staff.
INSERT INTO lesson_completion_history
  (user_id, module_slug, lesson_slug, first_completed_at)
SELECT progress.user_id, progress.module_slug, progress.lesson_slug, progress.completed_at
FROM lesson_progress progress
WHERE progress.status = 'completed'
  AND progress.completed_at IS NOT NULL
ON CONFLICT (user_id, module_slug, lesson_slug) DO NOTHING;
