#!/bin/sh
set -eu

restore_job_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$restore_job_script_dir/swarm-job-lib.sh"

: "${AZUBI_LAB_POSTGRES_PASSWORD_SECRET:?AZUBI_LAB_POSTGRES_PASSWORD_SECRET must be set}"
: "${POSTGRES_DB:?POSTGRES_DB must be set}"
: "${POSTGRES_USER:?POSTGRES_USER must be set}"

if [ "${AZUBI_LAB_RESTORE_CONFIRM-}" != "RESTORE_TO_EMPTY_TARGET" ]; then
  echo "Refusing restore: prepare empty database/Evidence/profile-image targets and set AZUBI_LAB_RESTORE_CONFIRM=RESTORE_TO_EMPTY_TARGET." >&2
  exit 1
fi
if [ "$#" -ne 1 ]; then
  echo "Usage: swarm-restore.sh azubi-lab-backup-<UTC timestamp>" >&2
  exit 1
fi

restore_set=$1
if ! printf '%s\n' "$restore_set" | grep -Eq '^azubi-lab-backup-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{6}Z$'; then
  echo "Restore set name is invalid." >&2
  exit 1
fi

swarm_require_manager_host
swarm_require_service_scaled_zero azubi-lab_app
swarm_resolve_healthy_local_container azubi-lab_postgres
$swarm_docker_bin secret inspect "$AZUBI_LAB_POSTGRES_PASSWORD_SECRET" >/dev/null

swarm_stack_dir=${AZUBI_LAB_STACK_DIR:-/srv/azubi-lab/app}
swarm_postgres_image=${AZUBI_LAB_POSTGRES_IMAGE:-postgres:17}
[ -f "$swarm_stack_dir/scripts/ops/restore-all.sh" ] || {
  echo "Restore helper is unavailable below AZUBI_LAB_STACK_DIR." >&2
  exit 1
}
[ -d "/srv/azubi-lab/data/backups/$restore_set" ] || {
  echo "Requested restore set is unavailable." >&2
  exit 1
}

restore_job="azubi-lab-restore-$(date -u +%Y%m%d%H%M%S)-$$"
restore_job_created=false
cleanup_restore_job() {
  if [ "$restore_job_created" = "true" ]; then
    $swarm_docker_bin service rm "$restore_job" >/dev/null || true
    restore_job_created=false
  fi
}
trap cleanup_restore_job EXIT
trap 'cleanup_restore_job; exit 1' HUP INT TERM

$swarm_docker_bin service create \
  --detach=true \
  --name "$restore_job" \
  --mode replicated-job \
  --replicas 1 \
  --restart-condition none \
  --constraint 'node.hostname==swarm-manager' \
  --network azubi-lab-backend \
  --user 1000:1000 \
  --cap-drop ALL \
  --secret "source=$AZUBI_LAB_POSTGRES_PASSWORD_SECRET,target=azubi-lab-postgres-password,uid=1000,gid=1000,mode=0400" \
  --env PGHOST=azubi-lab_postgres \
  --env PGPORT=5432 \
  --env "PGDATABASE=$POSTGRES_DB" \
  --env "PGUSER=$POSTGRES_USER" \
  --env PGPASSWORD_FILE=/run/secrets/azubi-lab-postgres-password \
  --env EVIDENCE_STORAGE_DIR=/data/evidence \
  --env PROFILE_IMAGE_STORAGE_DIR=/data/profile-images \
  --env BACKUP_DIR=/backups \
  --env AZUBI_LAB_RESTORE_CONFIRM=RESTORE_TO_EMPTY_TARGET \
  --mount type=bind,source=/srv/azubi-lab/data/evidence,destination=/data/evidence \
  --mount type=bind,source=/srv/azubi-lab/data/profile-images,destination=/data/profile-images \
  --mount type=bind,source=/srv/azubi-lab/data/backups,destination=/backups,readonly \
  --mount "type=bind,source=$swarm_stack_dir/scripts/ops,destination=/ops,readonly" \
  --entrypoint /bin/sh \
  --no-resolve-image \
  "$swarm_postgres_image" \
  /ops/restore-all.sh "/backups/$restore_set" >/dev/null
restore_job_created=true

restore_status=0
swarm_wait_for_job "$restore_job" || restore_status=$?
swarm_print_job_logs "$restore_job" || true
[ "$restore_status" -eq 0 ] || exit "$restore_status"

echo "Swarm restore completed; run the migration checksum check before scaling the app to 1."
