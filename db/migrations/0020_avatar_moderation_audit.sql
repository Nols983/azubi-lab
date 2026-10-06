CREATE TABLE avatar_moderation_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  moderator_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action_type text NOT NULL CHECK (action_type = 'profile_avatar_removed'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX avatar_moderation_events_target_created_idx
  ON avatar_moderation_events (target_user_id, created_at DESC);

CREATE INDEX avatar_moderation_events_moderator_created_idx
  ON avatar_moderation_events (moderator_user_id, created_at DESC);

CREATE FUNCTION prevent_avatar_moderation_event_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'avatar moderation events are immutable';
END;
$$;

CREATE TRIGGER avatar_moderation_events_immutable
BEFORE UPDATE OR DELETE ON avatar_moderation_events
FOR EACH ROW
EXECUTE FUNCTION prevent_avatar_moderation_event_changes();
