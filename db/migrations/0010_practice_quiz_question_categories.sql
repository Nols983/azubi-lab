ALTER TABLE practice_quiz_attempt_questions
  ADD COLUMN category_id text;

UPDATE practice_quiz_attempt_questions
SET category_id = CASE render_snapshot ->> 'moduleSlug'
  WHEN 'ipv4-grundlagen' THEN 'netzwerke'
  WHEN 'subnetting' THEN 'netzwerke'
  WHEN 'dhcp' THEN 'netzwerke'
  WHEN 'dns' THEN 'netzwerke'
  WHEN 'linux-grundlagen' THEN 'betriebssysteme'
  WHEN 'windows-grundlagen' THEN 'betriebssysteme'
  WHEN 'webserver-grundlagen' THEN 'server-dienste'
  WHEN 'active-directory-grundlagen' THEN 'server-dienste'
  WHEN 'netzwerkfehler-systematisch-analysieren' THEN 'troubleshooting'
END;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM practice_quiz_attempt_questions
    WHERE category_id IS NULL
      OR category_id NOT IN (
        'netzwerke',
        'betriebssysteme',
        'server-dienste',
        'troubleshooting'
      )
  ) THEN
    RAISE EXCEPTION 'practice quiz question category backfill found an unknown module';
  END IF;
END;
$$;

ALTER TABLE practice_quiz_attempt_questions
  ALTER COLUMN category_id SET NOT NULL,
  ADD CONSTRAINT practice_quiz_attempt_questions_category_check CHECK (
    category_id IN (
      'netzwerke',
      'betriebssysteme',
      'server-dienste',
      'troubleshooting'
    )
  );

CREATE FUNCTION prevent_practice_quiz_question_category_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    RAISE EXCEPTION 'practice quiz question category is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER practice_quiz_question_category_immutable
BEFORE UPDATE ON practice_quiz_attempt_questions
FOR EACH ROW
EXECUTE FUNCTION prevent_practice_quiz_question_category_changes();
