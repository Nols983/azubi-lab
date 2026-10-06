#!/bin/sh
set -eu
umask 077

restore_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$restore_script_dir/secret-file-env.sh"
load_secret_file_env PGPASSWORD

if [ "${AZUBI_LAB_RESTORE_CONFIRM-}" != "RESTORE_TO_EMPTY_TARGET" ]; then
  echo "Refusing restore: use an empty target and set AZUBI_LAB_RESTORE_CONFIRM=RESTORE_TO_EMPTY_TARGET." >&2
  exit 1
fi

if [ -z "${PGHOST-}" ] \
  || [ -z "${PGDATABASE-}" ] \
  || [ -z "${PGUSER-}" ] \
  || [ -z "${PGPASSWORD-}" ] \
  || [ -z "${EVIDENCE_STORAGE_DIR-}" ] \
  || [ -z "${PROFILE_IMAGE_STORAGE_DIR-}" ] \
  || [ -z "${BACKUP_DIR-}" ]; then
  echo "Restore configuration is incomplete." >&2
  exit 1
fi

if [ "$#" -ne 1 ]; then
  echo "Usage: restore-all.sh /backups/azubi-lab-backup-<UTC timestamp>" >&2
  exit 1
fi

backup_path=$(realpath -e "$1")
backup_root=$(realpath -e "$BACKUP_DIR")
case "$backup_path" in
  "$backup_root"/azubi-lab-backup-*) ;;
  *)
    echo "Restore source must be a backup set below BACKUP_DIR." >&2
    exit 1
    ;;
esac

manifest_path="$backup_path/manifest.txt"
if [ ! -f "$manifest_path" ] || [ -L "$manifest_path" ]; then
  echo "Backup manifest is missing or unsafe." >&2
  exit 1
fi

manifest_value() {
  manifest_key=$1
  manifest_result=$(awk -F= -v key="$manifest_key" '$1 == key { print substr($0, length(key) + 2) }' "$manifest_path")
  manifest_lines=$(printf '%s\n' "$manifest_result" | awk 'NF { count++ } END { print count + 0 }')
  if [ "$manifest_lines" -ne 1 ]; then
    echo "Backup manifest is incomplete or ambiguous." >&2
    exit 1
  fi
  printf '%s\n' "$manifest_result"
}

database_filename=$(manifest_value database_dump)
database_sha256=$(manifest_value database_sha256)
evidence_filename=$(manifest_value evidence_archive)
evidence_sha256=$(manifest_value evidence_sha256)
profile_images_filename=$(manifest_value profile_images_archive)
profile_images_sha256=$(manifest_value profile_images_sha256)

if ! printf '%s\n' "$database_filename" | grep -Eq '^azubi-lab-db-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{6}Z\.dump$' \
  || ! printf '%s\n' "$evidence_filename" | grep -Eq '^azubi-lab-evidence-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{6}Z\.tar\.gz$' \
  || ! printf '%s\n' "$profile_images_filename" | grep -Eq '^azubi-lab-profile-images-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{6}Z\.tar\.gz$' \
  || ! printf '%s\n' "$database_sha256" | grep -Eq '^[0-9a-f]{64}$' \
  || ! printf '%s\n' "$evidence_sha256" | grep -Eq '^[0-9a-f]{64}$' \
  || ! printf '%s\n' "$profile_images_sha256" | grep -Eq '^[0-9a-f]{64}$'; then
  echo "Backup manifest contains invalid values." >&2
  exit 1
fi

database_path="$backup_path/$database_filename"
evidence_path="$backup_path/$evidence_filename"
profile_images_path="$backup_path/$profile_images_filename"
if [ ! -f "$database_path" ] || [ -L "$database_path" ] \
  || [ ! -f "$evidence_path" ] || [ -L "$evidence_path" ] \
  || [ ! -f "$profile_images_path" ] || [ -L "$profile_images_path" ]; then
  echo "Backup artifacts are missing or unsafe." >&2
  exit 1
fi

printf '%s  %s\n' "$database_sha256" "$database_path" | sha256sum --check --status
printf '%s  %s\n' "$evidence_sha256" "$evidence_path" | sha256sum --check --status
printf '%s  %s\n' "$profile_images_sha256" "$profile_images_path" | sha256sum --check --status

public_table_count=$(psql -X --no-psqlrc --tuples-only --no-align --command="SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")
if [ "$public_table_count" -ne 0 ]; then
  echo "Restore target database is not empty." >&2
  exit 1
fi

if [ ! -d "$EVIDENCE_STORAGE_DIR" ] || [ ! -r "$EVIDENCE_STORAGE_DIR" ] || [ ! -w "$EVIDENCE_STORAGE_DIR" ]; then
  echo "Restore target Evidence directory is not accessible." >&2
  exit 1
fi
if [ -n "$(find "$EVIDENCE_STORAGE_DIR" -mindepth 1 -print -quit)" ]; then
  echo "Restore target Evidence directory is not empty." >&2
  exit 1
fi
if [ ! -d "$PROFILE_IMAGE_STORAGE_DIR" ] || [ ! -r "$PROFILE_IMAGE_STORAGE_DIR" ] || [ ! -w "$PROFILE_IMAGE_STORAGE_DIR" ]; then
  echo "Restore target profile image directory is not accessible." >&2
  exit 1
fi
if [ -n "$(find "$PROFILE_IMAGE_STORAGE_DIR" -mindepth 1 -print -quit)" ]; then
  echo "Restore target profile image directory is not empty." >&2
  exit 1
fi

archive_listing=$(mktemp)
archive_details=$(mktemp)
profile_archive_listing=$(mktemp)
profile_archive_details=$(mktemp)
trap 'rm -f "$archive_listing" "$archive_details" "$profile_archive_listing" "$profile_archive_details"' EXIT HUP INT TERM
tar --list --gzip --file="$evidence_path" > "$archive_listing"
tar --list --verbose --gzip --file="$evidence_path" > "$archive_details"

while IFS= read -r archive_entry; do
  case "$archive_entry" in
    .|./) ;;
    *)
      evidence_name=${archive_entry#./}
      if [ "$archive_entry" = "$evidence_name" ] \
        || ! printf '%s\n' "$evidence_name" | grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'; then
        echo "Evidence archive contains an unexpected path." >&2
        exit 1
      fi
      ;;
  esac
done < "$archive_listing"

while IFS= read -r archive_detail; do
  archive_type=$(printf '%s' "$archive_detail" | cut -c1)
  case "$archive_type" in
    -|d) ;;
    *)
      echo "Evidence archive contains a non-regular entry." >&2
      exit 1
      ;;
  esac
done < "$archive_details"

tar --list --gzip --file="$profile_images_path" > "$profile_archive_listing"
tar --list --verbose --gzip --file="$profile_images_path" > "$profile_archive_details"

while IFS= read -r archive_entry; do
  case "$archive_entry" in
    .|./) ;;
    *)
      profile_image_name=${archive_entry#./}
      if [ "$archive_entry" = "$profile_image_name" ] \
        || ! printf '%s\n' "$profile_image_name" | grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'; then
        echo "Profile image archive contains an unexpected path." >&2
        exit 1
      fi
      ;;
  esac
done < "$profile_archive_listing"

while IFS= read -r archive_detail; do
  archive_type=$(printf '%s' "$archive_detail" | cut -c1)
  case "$archive_type" in
    -|d) ;;
    *)
      echo "Profile image archive contains a non-regular entry." >&2
      exit 1
      ;;
  esac
done < "$profile_archive_details"

pg_restore \
  --exit-on-error \
  --no-owner \
  --no-acl \
  --dbname="$PGDATABASE" \
  "$database_path"

tar \
  --extract \
  --gzip \
  --no-same-owner \
  --no-same-permissions \
  --directory="$EVIDENCE_STORAGE_DIR" \
  --file="$evidence_path"

tar \
  --extract \
  --gzip \
  --no-same-owner \
  --no-same-permissions \
  --directory="$PROFILE_IMAGE_STORAGE_DIR" \
  --file="$profile_images_path"

chmod 700 "$EVIDENCE_STORAGE_DIR"
find "$EVIDENCE_STORAGE_DIR" -type f -exec chmod 600 {} +
chmod 700 "$PROFILE_IMAGE_STORAGE_DIR"
find "$PROFILE_IMAGE_STORAGE_DIR" -type f -exec chmod 600 {} +
/bin/sh "$restore_script_dir/verify-evidence.sh"
printf 'Restore completed; Evidence integrity and profile-image archive structure verified.\n'
