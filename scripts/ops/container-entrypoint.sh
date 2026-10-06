#!/bin/sh
set -eu

entrypoint_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$entrypoint_script_dir/secret-file-env.sh"

load_secret_file_env DATABASE_URL
load_secret_file_env AUTH_SECRET
load_secret_file_env WEB_PUSH_VAPID_PRIVATE_KEY
load_secret_file_env ADMIN_PASSWORD

if [ -z "${DATABASE_URL-}" ] \
  || [ -z "${AUTH_SECRET-}" ] \
  || [ -z "${PASSWORD_RESET_ORIGIN-}" ] \
  || [ -z "${WEB_PUSH_VAPID_PUBLIC_KEY-}" ] \
  || [ -z "${WEB_PUSH_VAPID_PRIVATE_KEY-}" ] \
  || [ -z "${WEB_PUSH_VAPID_SUBJECT-}" ] \
  || [ -z "${EVIDENCE_STORAGE_DIR-}" ] \
  || [ -z "${PROFILE_IMAGE_STORAGE_DIR-}" ]; then
  echo "Azubi Lab production configuration is incomplete." >&2
  exit 1
fi

if [ "${#WEB_PUSH_VAPID_PUBLIC_KEY}" -ne 87 ] \
  || ! printf '%s\n' "$WEB_PUSH_VAPID_PUBLIC_KEY" | grep -Eq '^B[A-P][A-Za-z0-9_-]{85}$' \
  || [ "${#WEB_PUSH_VAPID_PRIVATE_KEY}" -ne 43 ] \
  || ! printf '%s\n' "$WEB_PUSH_VAPID_PRIVATE_KEY" | grep -Eq '^[A-Za-z0-9_-]+$'; then
  echo "Azubi Lab Web Push key configuration is invalid." >&2
  exit 1
fi

if ! printf '%s\n' "$WEB_PUSH_VAPID_SUBJECT" \
  | grep -Eq '^(mailto:[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+|https://[^[:space:]/?#]+[^[:space:]]*)$'; then
  echo "Azubi Lab Web Push subject must use a valid mailto: or HTTPS URI." >&2
  exit 1
fi

case "$PASSWORD_RESET_ORIGIN" in
  https://*) ;;
  *)
    echo "Azubi Lab password reset origin must use HTTPS in production." >&2
    exit 1
    ;;
esac

case "$DATABASE_URL" in
  postgres://*|postgresql://*) ;;
  *)
    echo "Azubi Lab database configuration is invalid." >&2
    exit 1
    ;;
esac

if [ "${#AUTH_SECRET}" -lt 32 ]; then
  echo "Azubi Lab authentication configuration is too weak." >&2
  exit 1
fi

case "${AUTH_RATE_LIMIT_TRUST_PROXY:-false}" in
  true|false) ;;
  *)
    echo "Azubi Lab rate-limit proxy trust configuration is invalid." >&2
    exit 1
    ;;
esac

case "$EVIDENCE_STORAGE_DIR" in
  /*) ;;
  *)
    echo "Azubi Lab Evidence storage must use an absolute path." >&2
    exit 1
    ;;
esac

case "$PROFILE_IMAGE_STORAGE_DIR" in
  /*) ;;
  *)
    echo "Azubi Lab profile image storage must use an absolute path." >&2
    exit 1
    ;;
esac

if [ ! -d "$EVIDENCE_STORAGE_DIR" ] \
  || [ ! -r "$EVIDENCE_STORAGE_DIR" ] \
  || [ ! -w "$EVIDENCE_STORAGE_DIR" ] \
  || [ ! -x "$EVIDENCE_STORAGE_DIR" ]; then
  echo "Azubi Lab Evidence storage is not accessible." >&2
  exit 1
fi

exec "$@"
