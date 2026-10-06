#!/bin/sh
set -eu
umask 077

orphan_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$orphan_script_dir/secret-file-env.sh"
load_secret_file_env PGPASSWORD

if [ -z "${PGHOST-}" ] \
  || [ -z "${PGDATABASE-}" ] \
  || [ -z "${PGUSER-}" ] \
  || [ -z "${PGPASSWORD-}" ] \
  || [ -z "${PROFILE_IMAGE_STORAGE_DIR-}" ]; then
  echo "Profile image orphan-report configuration is incomplete." >&2
  exit 1
fi
if [ ! -d "$PROFILE_IMAGE_STORAGE_DIR" ] || [ ! -r "$PROFILE_IMAGE_STORAGE_DIR" ]; then
  echo "Profile image storage is not readable." >&2
  exit 1
fi

known_users=$(mktemp)
trap 'rm -f "$known_users"' EXIT HUP INT TERM
psql -X --no-psqlrc --tuples-only --no-align \
  --command="SELECT id::text FROM users ORDER BY id" > "$known_users"

orphan_count=0
for profile_image_path in "$PROFILE_IMAGE_STORAGE_DIR"/*; do
  [ -e "$profile_image_path" ] || continue
  profile_image_name=${profile_image_path##*/}
  if ! printf '%s\n' "$profile_image_name" | grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'; then
    echo "Unexpected profile image entry: $profile_image_name" >&2
    exit 1
  fi
  profile_user_id=${profile_image_name%.webp}
  if ! grep -Fqx "$profile_user_id" "$known_users"; then
    printf '%s\n' "$profile_image_path"
    orphan_count=$((orphan_count + 1))
  fi
done

printf 'Profile image orphan report completed: %s orphan(s). No files were deleted.\n' "$orphan_count" >&2
