#!/bin/sh
set -eu
umask 077

verify_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$verify_script_dir/secret-file-env.sh"
load_secret_file_env PGPASSWORD

if [ -z "${PGHOST-}" ] \
  || [ -z "${PGDATABASE-}" ] \
  || [ -z "${PGUSER-}" ] \
  || [ -z "${PGPASSWORD-}" ] \
  || [ -z "${EVIDENCE_STORAGE_DIR-}" ]; then
  echo "Evidence verification configuration is incomplete." >&2
  exit 1
fi

records_path=$(mktemp)
trap 'rm -f "$records_path"' EXIT HUP INT TERM
psql \
  -X \
  --no-psqlrc \
  --tuples-only \
  --no-align \
  --field-separator='|' \
  --command="SELECT storage_key, sha256 FROM challenge_submission_attachments ORDER BY storage_key" \
  > "$records_path"

verified_count=0
while IFS='|' read -r storage_key expected_sha256; do
  [ -n "$storage_key" ] || continue
  evidence_path="$EVIDENCE_STORAGE_DIR/$storage_key"
  if [ ! -f "$evidence_path" ] || [ -L "$evidence_path" ]; then
    echo "Evidence verification failed: a stored object is unavailable." >&2
    exit 1
  fi
  actual_sha256=$(sha256sum "$evidence_path")
  actual_sha256=${actual_sha256%% *}
  if [ "$actual_sha256" != "$expected_sha256" ]; then
    echo "Evidence verification failed: a stored object hash differs." >&2
    exit 1
  fi
  verified_count=$((verified_count + 1))
done < "$records_path"

printf 'Evidence integrity verified: %s object(s).\n' "$verified_count"
