-- Extend the existing post-commit cleanup queue; never store names or file paths.
ALTER TABLE account_file_cleanup_jobs
  ADD COLUMN evidence_storage_keys uuid[] NOT NULL DEFAULT '{}';

-- Keep other learners' assessment outcomes without retaining a deleted reviewer.
ALTER TABLE challenge_reviews ALTER COLUMN reviewed_by DROP NOT NULL;

-- Retain the moderation event itself, but remove deleted account identifiers.
ALTER TABLE avatar_moderation_events
  ALTER COLUMN moderator_user_id DROP NOT NULL,
  ALTER COLUMN target_user_id DROP NOT NULL,
  DROP CONSTRAINT avatar_moderation_events_moderator_user_id_fkey,
  DROP CONSTRAINT avatar_moderation_events_target_user_id_fkey,
  ADD CONSTRAINT avatar_moderation_events_moderator_user_id_fkey
    FOREIGN KEY (moderator_user_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT avatar_moderation_events_target_user_id_fkey
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION prevent_avatar_moderation_event_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.moderator_user_id IS NOT NULL AND NEW.target_user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND pg_trigger_depth() > 1 THEN
    IF NEW.id = OLD.id AND NEW.action_type = OLD.action_type AND NEW.created_at = OLD.created_at
      AND (NEW.moderator_user_id IS NOT DISTINCT FROM OLD.moderator_user_id
        OR (NEW.moderator_user_id IS NULL AND OLD.moderator_user_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM users WHERE id = OLD.moderator_user_id)))
      AND (NEW.target_user_id IS NOT DISTINCT FROM OLD.target_user_id
        OR (NEW.target_user_id IS NULL AND OLD.target_user_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM users WHERE id = OLD.target_user_id))) THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'avatar moderation events are immutable';
END;
$$;

CREATE TRIGGER avatar_moderation_events_require_participants
BEFORE INSERT ON avatar_moderation_events
FOR EACH ROW EXECUTE FUNCTION prevent_avatar_moderation_event_changes();
