-- Operational retry queue, deliberately independent of the deleted users row.
-- No login, display name, file path or file content is retained.
CREATE TABLE account_file_cleanup_jobs (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
