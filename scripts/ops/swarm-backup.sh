#!/bin/sh
set -eu

backup_job_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$backup_job_script_dir/swarm-job-lib.sh"

: "${AZUBI_LAB_POSTGRES_PASSWORD_SECRET:?AZUBI_LAB_POSTGRES_PASSWORD_SECRET must be set}"
: "${POSTGRES_DB:?POSTGRES_DB must be set}"
: "${POSTGRES_USER:?POSTGRES_USER must be set}"

if [ "${AZUBI_LAB_BACKUP_CONFIRMED-}" != "APP_WRITES_STOPPED" ]; then
  echo "Refusing backup: stop the notification timer, scale app to 0 and set AZUBI_LAB_BACKUP_CONFIRMED=APP_WRITES_STOPPED." >&2
  exit 1
fi

swarm_require_manager_host
swarm_require_service_scaled_zero azubi-lab_app
swarm_resolve_healthy_local_container azubi-lab_postgres
$swarm_docker_bin secret inspect "$AZUBI_LAB_POSTGRES_PASSWORD_SECRET" >/dev/null

swarm_stack_dir=${AZUBI_LAB_STACK_DIR:-/srv/azubi-lab/app}
swarm_postgres_image=${AZUBI_LAB_POSTGRES_IMAGE:-postgres:17}
[ -f "$swarm_stack_dir/scripts/ops/backup-all.sh" ] || {
  echo "Backup helper is unavailable below AZUBI_LAB_STACK_DIR." >&2
  exit 1
}

backup_job="azubi-lab-backup-$(date -u +%Y%m%d%H%M%S)-$$"
backup_job_created=false
cleanup_backup_job() {
  if [ "$backup_job_created" = "true" ]; then
    $swarm_docker_bin service rm "$backup_job" >/dev/null || true
    backup_job_created=false
  fi
}
trap cleanup_backup_job EXIT
trap 'cleanup_backup_job; exit 1' HUP INT TERM

$swarm_docker_bin service create \
  --detach=true \
  --name "$backup_job" \
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
  --env "AZUBI_LAB_IMAGE=${AZUBI_LAB_IMAGE:-unknown}" \
  --env AZUBI_LAB_BACKUP_CONFIRMED=APP_WRITES_STOPPED \
  --mount type=bind,source=/srv/azubi-lab/data/evidence,destination=/data/evidence,readonly \
  --mount type=bind,source=/srv/azubi-lab/data/profile-images,destination=/data/profile-images,readonly \
  --mount type=bind,source=/srv/azubi-lab/data/backups,destination=/backups \
  --mount "type=bind,source=$swarm_stack_dir/scripts/ops,destination=/ops,readonly" \
  --entrypoint /bin/sh \
  --no-resolve-image \
  "$swarm_postgres_image" \
  /ops/backup-all.sh >/dev/null
backup_job_created=true

backup_status=0
swarm_wait_for_job "$backup_job" || backup_status=$?
swarm_print_job_logs "$backup_job" || true
[ "$backup_status" -eq 0 ] || exit "$backup_status"

echo "Swarm backup job completed successfully."
