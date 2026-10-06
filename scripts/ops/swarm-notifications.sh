#!/bin/sh
set -eu

notification_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$notification_script_dir/swarm-job-lib.sh"

swarm_require_manager_host
swarm_app_service=${AZUBI_LAB_SWARM_APP_SERVICE:-azubi-lab_app}
swarm_resolve_healthy_local_container "$swarm_app_service"

$swarm_docker_bin exec \
  "$swarm_container_id" \
  sh /app/scripts/ops/container-entrypoint.sh \
  npm run notifications:generate
