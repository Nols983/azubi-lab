#!/bin/sh
set -eu

preflight_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$preflight_script_dir/swarm-job-lib.sh"

preflight_fail() {
  echo "Swarm preflight failed: $1" >&2
  exit 1
}

require_value() {
  preflight_name=$1
  preflight_value=$2
  [ -n "$preflight_value" ] || preflight_fail "$preflight_name is not defined."
}

check_private_directory() {
  preflight_directory=$1
  preflight_expected_uid=$2

  [ -d "$preflight_directory" ] || preflight_fail "$preflight_directory does not exist."
  [ ! -L "$preflight_directory" ] || preflight_fail "$preflight_directory must not be a symlink."

  preflight_mode=$(stat -c '%a' "$preflight_directory")
  preflight_uid=$(stat -c '%u' "$preflight_directory")
  [ "$preflight_mode" = "700" ] || preflight_fail "$preflight_directory must have mode 0700."
  [ "$preflight_uid" = "$preflight_expected_uid" ] || preflight_fail "$preflight_directory has the wrong owner UID."
}

require_value AZUBI_LAB_IMAGE "${AZUBI_LAB_IMAGE-}"
require_value AZUBI_LAB_HOST "${AZUBI_LAB_HOST-}"
require_value TRAEFIK_CERTRESOLVER "${TRAEFIK_CERTRESOLVER-}"
require_value AZUBI_LAB_PUBLIC_HOST "${AZUBI_LAB_PUBLIC_HOST-}"
require_value TRAEFIK_PUBLIC_CERTRESOLVER "${TRAEFIK_PUBLIC_CERTRESOLVER-}"
require_value POSTGRES_DB "${POSTGRES_DB-}"
require_value POSTGRES_USER "${POSTGRES_USER-}"
require_value AZUBI_LAB_DATABASE_URL_SECRET "${AZUBI_LAB_DATABASE_URL_SECRET-}"
require_value AZUBI_LAB_AUTH_SECRET "${AZUBI_LAB_AUTH_SECRET-}"
require_value AZUBI_LAB_POSTGRES_PASSWORD_SECRET "${AZUBI_LAB_POSTGRES_PASSWORD_SECRET-}"
require_value WEB_PUSH_VAPID_PUBLIC_KEY "${WEB_PUSH_VAPID_PUBLIC_KEY-}"
require_value WEB_PUSH_VAPID_SUBJECT "${WEB_PUSH_VAPID_SUBJECT-}"
require_value AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET "${AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET-}"

if ! printf '%s\n' "$AZUBI_LAB_IMAGE" | grep -Eq '^[A-Za-z0-9._/:@-]+$'; then
  preflight_fail "AZUBI_LAB_IMAGE contains unsupported characters."
fi
case "$AZUBI_LAB_IMAGE" in
  latest|*:latest)
    preflight_fail "AZUBI_LAB_IMAGE must use an immutable release or commit-SHA tag, not latest."
    ;;
  *@sha256:*) ;;
  *)
    preflight_image_tail=${AZUBI_LAB_IMAGE##*/}
    case "$preflight_image_tail" in
      *:*) ;;
      *) preflight_fail "AZUBI_LAB_IMAGE must include an explicit immutable tag or digest." ;;
    esac
    ;;
esac
if ! printf '%s\n' "$AZUBI_LAB_HOST" | grep -Eq '^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$' \
  || ! printf '%s\n' "$AZUBI_LAB_HOST" | grep -q '\.'; then
  preflight_fail "AZUBI_LAB_HOST is not a valid configured hostname."
fi
if ! printf '%s\n' "$TRAEFIK_CERTRESOLVER" | grep -Eq '^[A-Za-z0-9._-]+$'; then
  preflight_fail "TRAEFIK_CERTRESOLVER is invalid."
fi
if ! printf '%s\n' "$AZUBI_LAB_PUBLIC_HOST" | grep -Eq '^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$' \
  || ! printf '%s\n' "$AZUBI_LAB_PUBLIC_HOST" | grep -q '\.'; then
  preflight_fail "AZUBI_LAB_PUBLIC_HOST is not a valid configured hostname."
fi
if ! printf '%s\n' "$TRAEFIK_PUBLIC_CERTRESOLVER" | grep -Eq '^[A-Za-z0-9._-]+$'; then
  preflight_fail "TRAEFIK_PUBLIC_CERTRESOLVER is invalid."
fi
if [ "${#WEB_PUSH_VAPID_PUBLIC_KEY}" -ne 87 ] \
  || ! printf '%s\n' "$WEB_PUSH_VAPID_PUBLIC_KEY" | grep -Eq '^B[A-P][A-Za-z0-9_-]{85}$'; then
  preflight_fail "WEB_PUSH_VAPID_PUBLIC_KEY is invalid."
fi
if ! printf '%s\n' "$WEB_PUSH_VAPID_SUBJECT" \
  | grep -Eq '^(mailto:[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+|https://[^[:space:]/?#]+[^[:space:]]*)$'; then
  preflight_fail "WEB_PUSH_VAPID_SUBJECT must use a valid mailto: or HTTPS URI."
fi
if ! printf '%s\n' "$POSTGRES_DB" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$' \
  || ! printf '%s\n' "$POSTGRES_USER" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$'; then
  preflight_fail "POSTGRES_DB or POSTGRES_USER is invalid."
fi
for preflight_secret_name in \
  "$AZUBI_LAB_DATABASE_URL_SECRET" \
  "$AZUBI_LAB_AUTH_SECRET" \
  "$AZUBI_LAB_POSTGRES_PASSWORD_SECRET" \
  "$AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET"; do
  if ! printf '%s\n' "$preflight_secret_name" | grep -Eq '^[A-Za-z0-9._-]+$'; then
    preflight_fail "a Docker Secret name is invalid."
  fi
done
case "${AZUBI_LAB_APP_REPLICAS:-1}" in
  0|1) ;;
  *) preflight_fail "AZUBI_LAB_APP_REPLICAS must be 0 or 1." ;;
esac

swarm_require_manager_host || exit 1

preflight_node=$($swarm_docker_bin node inspect swarm-manager --format '{{.Status.State}}|{{.Spec.Availability}}')
[ "$preflight_node" = "ready|active" ] || preflight_fail "swarm-manager is not Ready and Active."

preflight_proxy=$($swarm_docker_bin network inspect proxy --format '{{.Driver}}|{{.Scope}}|{{.Internal}}')
[ "$preflight_proxy" = "overlay|swarm|false" ] || preflight_fail "proxy is not an external non-internal Swarm overlay."

if $swarm_docker_bin network inspect azubi-lab-backend >/dev/null 2>&1; then
  preflight_backend=$($swarm_docker_bin network inspect azubi-lab-backend --format '{{.Driver}}|{{.Scope}}|{{.Internal}}')
  [ "$preflight_backend" = "overlay|swarm|true" ] || preflight_fail "azubi-lab-backend exists with unexpected settings."
fi

check_private_directory /srv/azubi-lab/data/postgres "${AZUBI_LAB_POSTGRES_HOST_UID:-999}"
check_private_directory /srv/azubi-lab/data/evidence "${AZUBI_LAB_APP_HOST_UID:-1000}"
check_private_directory /srv/azubi-lab/data/profile-images "${AZUBI_LAB_APP_HOST_UID:-1000}"
check_private_directory /srv/azubi-lab/data/backups "${AZUBI_LAB_APP_HOST_UID:-1000}"

preflight_stack_file=${AZUBI_LAB_STACK_FILE:-/srv/azubi-lab/app/deploy/swarm-stack.yml}
[ -f "$preflight_stack_file" ] || preflight_fail "$preflight_stack_file is unavailable."
[ ! -L "$preflight_stack_file" ] || preflight_fail "$preflight_stack_file must not be a symlink."

for preflight_secret in \
  "$AZUBI_LAB_DATABASE_URL_SECRET" \
  "$AZUBI_LAB_AUTH_SECRET" \
  "$AZUBI_LAB_POSTGRES_PASSWORD_SECRET" \
  "$AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET"; do
  $swarm_docker_bin secret inspect "$preflight_secret" >/dev/null \
    || preflight_fail "required Docker Secret metadata is unavailable."
done

$swarm_docker_bin image inspect "$AZUBI_LAB_IMAGE" >/dev/null \
  || preflight_fail "the immutable application image is not present on swarm-manager."

$swarm_docker_bin stack config --compose-file "$preflight_stack_file" >/dev/null \
  || preflight_fail "docker stack config rejected the Swarm definition."

echo "Swarm preflight passed without changing Docker state."
