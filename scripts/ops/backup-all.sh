#!/bin/sh
set -eu
umask 077

backup_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$backup_script_dir/secret-file-env.sh"
load_secret_file_env PGPASSWORD

if [ "${AZUBI_LAB_BACKUP_CONFIRMED-}" != "APP_WRITES_STOPPED" ]; then
  echo "Refusing backup: stop application writes and set AZUBI_LAB_BACKUP_CONFIRMED=APP_WRITES_STOPPED." >&2
  exit 1
fi

if [ -z "${PGHOST-}" ] \
  || [ -z "${PGDATABASE-}" ] \
  || [ -z "${PGUSER-}" ] \
  || [ -z "${PGPASSWORD-}" ] \
  || [ -z "${EVIDENCE_STORAGE_DIR-}" ] \
  || [ -z "${PROFILE_IMAGE_STORAGE_DIR-}" ] \
  || [ -z "${BACKUP_DIR-}" ]; then
  echo "Backup configuration is incomplete." >&2
  exit 1
fi

if [ ! -d "$EVIDENCE_STORAGE_DIR" ] || [ ! -r "$EVIDENCE_STORAGE_DIR" ]; then
  echo "Evidence source is not readable." >&2
  exit 1
fi
if [ ! -d "$PROFILE_IMAGE_STORAGE_DIR" ] || [ ! -r "$PROFILE_IMAGE_STORAGE_DIR" ]; then
  echo "Profile image source is not readable." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
if [ ! -w "$BACKUP_DIR" ]; then
  echo "Backup destination is not writable." >&2
  exit 1
fi

invalid_entry=$(find "$EVIDENCE_STORAGE_DIR" -mindepth 1 ! -type f -print -quit)
if [ -n "$invalid_entry" ]; then
  echo "Evidence backup refused: storage contains a non-regular entry." >&2
  exit 1
fi

for evidence_path in "$EVIDENCE_STORAGE_DIR"/*; do
  [ -e "$evidence_path" ] || continue
  evidence_name=${evidence_path##*/}
  if ! printf '%s\n' "$evidence_name" | grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'; then
    echo "Evidence backup refused: storage contains an unexpected filename." >&2
    exit 1
  fi
done

invalid_profile_entry=$(find "$PROFILE_IMAGE_STORAGE_DIR" -mindepth 1 ! -type f -print -quit)
if [ -n "$invalid_profile_entry" ]; then
  echo "Profile image backup refused: storage contains a non-regular entry." >&2
  exit 1
fi

for profile_image_path in "$PROFILE_IMAGE_STORAGE_DIR"/*; do
  [ -e "$profile_image_path" ] || continue
  profile_image_name=${profile_image_path##*/}
  if ! printf '%s\n' "$profile_image_name" | grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'; then
    echo "Profile image backup refused: storage contains an unexpected filename." >&2
    exit 1
  fi
done

backup_timestamp=${BACKUP_TIMESTAMP-$(date -u +%Y-%m-%dT%H%M%SZ)}
if ! printf '%s\n' "$backup_timestamp" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{6}Z$'; then
  echo "Backup timestamp is invalid." >&2
  exit 1
fi

backup_name="azubi-lab-backup-$backup_timestamp"
backup_path="$BACKUP_DIR/$backup_name"
if ! mkdir -m 700 "$backup_path"; then
  echo "Backup destination already exists or cannot be created." >&2
  exit 1
fi

database_filename="azubi-lab-db-$backup_timestamp.dump"
evidence_filename="azubi-lab-evidence-$backup_timestamp.tar.gz"
profile_images_filename="azubi-lab-profile-images-$backup_timestamp.tar.gz"
database_path="$backup_path/$database_filename"
evidence_path="$backup_path/$evidence_filename"
profile_images_path="$backup_path/$profile_images_filename"
manifest_path="$backup_path/manifest.txt"

pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$database_path"

tar \
  --directory="$EVIDENCE_STORAGE_DIR" \
  --create \
  --gzip \
  --file="$evidence_path" \
  .

tar \
  --directory="$PROFILE_IMAGE_STORAGE_DIR" \
  --create \
  --gzip \
  --file="$profile_images_path" \
  .

database_sha256=$(sha256sum "$database_path")
database_sha256=${database_sha256%% *}
evidence_sha256=$(sha256sum "$evidence_path")
evidence_sha256=${evidence_sha256%% *}
profile_images_sha256=$(sha256sum "$profile_images_path")
profile_images_sha256=${profile_images_sha256%% *}
schema_context=$(psql -X --no-psqlrc --tuples-only --no-align --command="SELECT coalesce(string_agg(filename, ',' ORDER BY filename), 'none') FROM schema_migrations")
application_image=${AZUBI_LAB_IMAGE-unknown}
if ! printf '%s\n' "$application_image" | grep -Eq '^[A-Za-z0-9._:/@-]{1,200}$'; then
  application_image=unknown
fi

{
  printf 'backup_timestamp=%s\n' "$backup_timestamp"
  printf 'database_dump=%s\n' "$database_filename"
  printf 'database_sha256=%s\n' "$database_sha256"
  printf 'evidence_archive=%s\n' "$evidence_filename"
  printf 'evidence_sha256=%s\n' "$evidence_sha256"
  printf 'profile_images_archive=%s\n' "$profile_images_filename"
  printf 'profile_images_sha256=%s\n' "$profile_images_sha256"
  printf 'application_image=%s\n' "$application_image"
  printf 'schema_context=%s\n' "$schema_context"
} > "$manifest_path"

chmod 600 "$database_path" "$evidence_path" "$profile_images_path" "$manifest_path"
printf 'Backup completed: %s\n' "$backup_name"
