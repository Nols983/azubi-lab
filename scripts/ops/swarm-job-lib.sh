#!/bin/sh

swarm_docker_bin=${DOCKER_BIN:-docker}
swarm_job_timeout=${SWARM_JOB_TIMEOUT_SECONDS:-600}

swarm_require_manager_host() {
  if ! command -v "$swarm_docker_bin" >/dev/null 2>&1; then
    echo "Docker CLI is unavailable." >&2
    return 1
  fi

  swarm_state=$($swarm_docker_bin info --format '{{.Swarm.LocalNodeState}}')
  swarm_manager=$($swarm_docker_bin info --format '{{.Swarm.ControlAvailable}}')
  swarm_host=$($swarm_docker_bin info --format '{{.Name}}')
  if [ "$swarm_state" != "active" ] || [ "$swarm_manager" != "true" ]; then
    echo "Run this operation on an active Docker Swarm manager." >&2
    return 1
  fi
  if [ "$swarm_host" != "swarm-manager" ]; then
    echo "Run this node-local operation on swarm-manager." >&2
    return 1
  fi
}

swarm_require_service_scaled_zero() {
  swarm_service=$1
  swarm_replicas=$($swarm_docker_bin service inspect --format '{{.Spec.Mode.Replicated.Replicas}}' "$swarm_service")
  if [ "$swarm_replicas" != "0" ]; then
    echo "Refusing operation: $swarm_service must be scaled to 0." >&2
    return 1
  fi
}

swarm_resolve_healthy_local_container() {
  swarm_service=$1
  swarm_task_ids=$($swarm_docker_bin service ps \
    --filter desired-state=running \
    --no-trunc \
    --format '{{.ID}}' \
    "$swarm_service")

  set -- $swarm_task_ids
  if [ "$#" -ne 1 ]; then
    echo "Expected exactly one running task for $swarm_service." >&2
    return 1
  fi

  swarm_task_id=$1
  swarm_task_node=$($swarm_docker_bin inspect --type task --format '{{.NodeID}}' "$swarm_task_id")
  swarm_local_node=$($swarm_docker_bin info --format '{{.Swarm.NodeID}}')
  if [ "$swarm_task_node" != "$swarm_local_node" ]; then
    echo "The task for $swarm_service is not running on this node." >&2
    return 1
  fi

  swarm_container_id=$($swarm_docker_bin inspect \
    --type task \
    --format '{{.Status.ContainerStatus.ContainerID}}' \
    "$swarm_task_id")
  if [ -z "$swarm_container_id" ]; then
    echo "The task for $swarm_service has no running container." >&2
    return 1
  fi

  swarm_health=$($swarm_docker_bin inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$swarm_container_id")
  if [ "$swarm_health" != "healthy" ]; then
    echo "$swarm_service is not healthy (state: $swarm_health)." >&2
    return 1
  fi
}

swarm_wait_for_job() {
  swarm_job_service=$1
  swarm_elapsed=0

  case "$swarm_job_timeout" in
    ''|*[!0-9]*|0)
      echo "SWARM_JOB_TIMEOUT_SECONDS must be a positive integer." >&2
      return 1
      ;;
  esac

  while [ "$swarm_elapsed" -lt "$swarm_job_timeout" ]; do
    swarm_job_task=$($swarm_docker_bin service ps \
      --no-trunc \
      --format '{{.ID}}' \
      "$swarm_job_service" | sed -n '1p')

    if [ -n "$swarm_job_task" ]; then
      swarm_job_state=$($swarm_docker_bin inspect --type task --format '{{.Status.State}}' "$swarm_job_task")
      case "$swarm_job_state" in
        complete)
          return 0
          ;;
        failed|rejected|shutdown|orphaned|remove)
          swarm_job_error=$($swarm_docker_bin inspect --type task --format '{{.Status.Err}}' "$swarm_job_task")
          echo "Swarm job failed in state $swarm_job_state: ${swarm_job_error:-no task error reported}." >&2
          return 1
          ;;
      esac
    fi

    sleep 2
    swarm_elapsed=$((swarm_elapsed + 2))
  done

  echo "Swarm job timed out after ${swarm_job_timeout}s." >&2
  return 1
}

swarm_print_job_logs() {
  swarm_job_service=$1
  $swarm_docker_bin service logs --raw "$swarm_job_service" || {
    echo "Swarm job logs are unavailable; inspect the task result reported by this run." >&2
    return 1
  }
}
