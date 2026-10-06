ALTER TABLE xp_events
  DROP CONSTRAINT xp_events_source_type_check,
  ADD CONSTRAINT xp_events_source_type_check
    CHECK (source_type IN ('lesson', 'module_quiz', 'challenge', 'practice_quiz', 'lab'));

CREATE TABLE learner_lab_hint_history (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab_id text NOT NULL CHECK (
    char_length(lab_id) BETWEEN 3 AND 120
    AND lab_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  hint_index smallint NOT NULL CHECK (hint_index BETWEEN 1 AND 20),
  first_revealed_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, lab_id, hint_index)
);

CREATE TABLE learner_lab_completion_history (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab_id text NOT NULL CHECK (
    char_length(lab_id) BETWEEN 3 AND 120
    AND lab_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  first_attempt_id uuid NOT NULL,
  first_completed_at timestamptz NOT NULL,
  unique_hints_used smallint NOT NULL CHECK (unique_hints_used BETWEEN 0 AND 20),
  base_xp smallint NOT NULL DEFAULT 75 CHECK (base_xp = 75),
  xp_awarded smallint NOT NULL CHECK (xp_awarded IN (0, 25, 50, 75)),
  PRIMARY KEY (user_id, lab_id)
);

CREATE FUNCTION prevent_learner_lab_reward_history_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'learner lab reward history is immutable';
END;
$$;

CREATE TRIGGER learner_lab_hint_history_immutable
BEFORE UPDATE ON learner_lab_hint_history
FOR EACH ROW
EXECUTE FUNCTION prevent_learner_lab_reward_history_changes();

CREATE TRIGGER learner_lab_completion_history_immutable
BEFORE UPDATE ON learner_lab_completion_history
FOR EACH ROW
EXECUTE FUNCTION prevent_learner_lab_reward_history_changes();

CREATE TABLE profile_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_title_id text CHECK (
    active_title_id IS NULL
    OR (
      char_length(active_title_id) BETWEEN 3 AND 80
      AND active_title_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
  ),
  pinned_badge_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (cardinality(pinned_badge_ids) <= 3)
);

WITH parsed_hints AS (
  SELECT attempt.user_id,
         attempt.lab_id,
         ((regexp_match(event.summary, '^Hinweis ([1-9][0-9]*) geöffnet$'))[1])::smallint AS hint_index,
         event.created_at
  FROM interactive_lab_events event
  JOIN interactive_lab_attempts attempt ON attempt.id = event.attempt_id
  WHERE attempt.mode = 'learner'
    AND event.kind = 'hint'
    AND event.summary ~ '^Hinweis ([1-9][0-9]*) geöffnet$'
)
INSERT INTO learner_lab_hint_history
  (user_id, lab_id, hint_index, first_revealed_at)
SELECT user_id, lab_id, hint_index, min(created_at)
FROM parsed_hints
WHERE hint_index BETWEEN 1 AND 20
GROUP BY user_id, lab_id, hint_index
ON CONFLICT (user_id, lab_id, hint_index) DO NOTHING;

WITH first_completions AS (
  SELECT DISTINCT ON (attempt.user_id, attempt.lab_id)
         attempt.user_id,
         attempt.lab_id,
         attempt.id AS first_attempt_id,
         attempt.completed_at AS first_completed_at
  FROM interactive_lab_attempts attempt
  WHERE attempt.mode = 'learner'
    AND attempt.status = 'completed'
    AND attempt.completed_at IS NOT NULL
    AND attempt.lab_id IN (
      'subnet-client-001',
      'gateway-client-001',
      'prefix-client-001',
      'dns-client-001',
      'dns-record-001',
      'dhcp-client-001',
      'dhcp-options-001',
      'web-service-001',
      'application-backend-001',
      'web-port-001',
      'linux-routing-001',
      'linux-permissions-001',
      'vlan-access-001',
      'firewall-http-001',
      'client-multifault-001',
      'vlan-firewall-multifault-001'
    )
  ORDER BY attempt.user_id, attempt.lab_id, attempt.completed_at ASC, attempt.id ASC
), calculated AS (
  SELECT completion.*,
         count(hint.hint_index)::smallint AS unique_hints_used
  FROM first_completions completion
  LEFT JOIN learner_lab_hint_history hint
    ON hint.user_id = completion.user_id
   AND hint.lab_id = completion.lab_id
   AND hint.first_revealed_at <= completion.first_completed_at
  GROUP BY completion.user_id, completion.lab_id,
           completion.first_attempt_id, completion.first_completed_at
)
INSERT INTO learner_lab_completion_history
  (user_id, lab_id, first_attempt_id, first_completed_at,
   unique_hints_used, xp_awarded)
SELECT user_id,
       lab_id,
       first_attempt_id,
       first_completed_at,
       unique_hints_used,
       greatest(0, 75 - (25 * unique_hints_used))::smallint
FROM calculated
ON CONFLICT (user_id, lab_id) DO NOTHING;

INSERT INTO xp_events
  (user_id, source_type, source_key, xp_amount, awarded_at)
SELECT history.user_id,
       'lab',
       history.lab_id,
       history.xp_awarded,
       history.first_completed_at
FROM learner_lab_completion_history history
WHERE history.xp_awarded > 0
ON CONFLICT (user_id, source_type, source_key) DO NOTHING;
