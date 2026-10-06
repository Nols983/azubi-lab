#!/bin/sh
set -eu

seed_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$seed_script_dir/swarm-job-lib.sh"

: "${AZUBI_LAB_IMAGE:?AZUBI_LAB_IMAGE must be set}"
: "${AZUBI_LAB_PUBLIC_HOST:?AZUBI_LAB_PUBLIC_HOST must be set}"
: "${AZUBI_LAB_DATABASE_URL_SECRET:?AZUBI_LAB_DATABASE_URL_SECRET must be set}"
: "${AZUBI_LAB_AUTH_SECRET:?AZUBI_LAB_AUTH_SECRET must be set}"
: "${AZUBI_LAB_ADMIN_PASSWORD_SECRET:?AZUBI_LAB_ADMIN_PASSWORD_SECRET must be set}"
: "${WEB_PUSH_VAPID_PUBLIC_KEY:?WEB_PUSH_VAPID_PUBLIC_KEY must be set}"
: "${WEB_PUSH_VAPID_SUBJECT:?WEB_PUSH_VAPID_SUBJECT must be set}"
: "${AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET:?AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET must be set}"
: "${ADMIN_LOGIN:?ADMIN_LOGIN must be set}"
: "${ADMIN_DISPLAY_NAME:?ADMIN_DISPLAY_NAME must be set}"

swarm_require_manager_host
swarm_require_service_scaled_zero azubi-lab_app
swarm_resolve_healthy_local_container azubi-lab_postgres
$swarm_docker_bin secret inspect "$AZUBI_LAB_DATABASE_URL_SECRET" >/dev/null
$swarm_docker_bin secret inspect "$AZUBI_LAB_AUTH_SECRET" >/dev/null
$swarm_docker_bin secret inspect "$AZUBI_LAB_ADMIN_PASSWORD_SECRET" >/dev/null
$swarm_docker_bin secret inspect "$AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET" >/dev/null
$swarm_docker_bin image inspect "$AZUBI_LAB_IMAGE" >/dev/null

seed_job="azubi-lab-seed-admin-$(date -u +%Y%m%d%H%M%S)-$$"
seed_job_created=false
cleanup_seed_job() {
  if [ "$seed_job_created" = "true" ]; then
    $swarm_docker_bin service rm "$seed_job" >/dev/null || true
    seed_job_created=false
  fi
}
trap cleanup_seed_job EXIT
trap 'cleanup_seed_job; exit 1' HUP INT TERM

$swarm_docker_bin service create \
  --detach=true \
  --name "$seed_job" \
  --mode replicated-job \
  --replicas 1 \
  --restart-condition none \
  --constraint 'node.hostname==swarm-manager' \
  --network azubi-lab-backend \
  --secret "source=$AZUBI_LAB_DATABASE_URL_SECRET,target=azubi-lab-database-url,uid=1000,gid=1000,mode=0400" \
  --secret "source=$AZUBI_LAB_AUTH_SECRET,target=azubi-lab-auth-secret,uid=1000,gid=1000,mode=0400" \
  --secret "source=$AZUBI_LAB_ADMIN_PASSWORD_SECRET,target=azubi-lab-admin-password,uid=1000,gid=1000,mode=0400" \
  --secret "source=$AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET,target=azubi-lab-web-push-vapid-private-key,uid=1000,gid=1000,mode=0400" \
  --env DATABASE_URL_FILE=/run/secrets/azubi-lab-database-url \
  --env AUTH_SECRET_FILE=/run/secrets/azubi-lab-auth-secret \
  --env "PASSWORD_RESET_ORIGIN=https://$AZUBI_LAB_PUBLIC_HOST" \
  --env "WEB_PUSH_VAPID_PUBLIC_KEY=$WEB_PUSH_VAPID_PUBLIC_KEY" \
  --env WEB_PUSH_VAPID_PRIVATE_KEY_FILE=/run/secrets/azubi-lab-web-push-vapid-private-key \
  --env "WEB_PUSH_VAPID_SUBJECT=$WEB_PUSH_VAPID_SUBJECT" \
  --env ADMIN_PASSWORD_FILE=/run/secrets/azubi-lab-admin-password \
  --env "ADMIN_LOGIN=$ADMIN_LOGIN" \
  --env "ADMIN_DISPLAY_NAME=$ADMIN_DISPLAY_NAME" \
  --env EVIDENCE_STORAGE_DIR=/data/evidence \
  --env PROFILE_IMAGE_STORAGE_DIR=/data/profile-images \
  --mount type=bind,source=/srv/azubi-lab/data/evidence,destination=/data/evidence \
  --mount type=bind,source=/srv/azubi-lab/data/profile-images,destination=/data/profile-images \
  --cap-drop ALL \
  --no-resolve-image \
  "$AZUBI_LAB_IMAGE" \
  npm run db:seed-admin >/dev/null
seed_job_created=true

seed_status=0
swarm_wait_for_job "$seed_job" || seed_status=$?
swarm_print_job_logs "$seed_job" || true
[ "$seed_status" -eq 0 ] || exit "$seed_status"

echo "Initial admin bootstrap completed; remove the one-use admin password secret after verification."
