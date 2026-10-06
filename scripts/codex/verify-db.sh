#!/usr/bin/env bash

set -euo pipefail

RESULT_PRINTED=0
PHASE="initialization"
RUNTIME=""
CONTAINER_NAME=""
CONTAINER_STARTED=0
DRY_RUN=0

DB_USER="azubi_verify"
DB_NAME="azubi_verify"
DB_PASSWORD=""
DB_PORT=""
DISPOSABLE_DATABASE_URL=""

print_result() {
    local result="$1"
    printf '\n===Ergebnis===\n%s\n' "$result"
}

fail() {
    local message="$1"
    local exit_code="${2:-1}"

    RESULT_PRINTED=1
    printf 'Fehler: %s\n' "$message" >&2
    print_result "FAIL"
    exit "$exit_code"
}

runtime_container_exists() {
    [[ -n "$RUNTIME" && -n "$CONTAINER_NAME" ]] || return 1
    "$RUNTIME" inspect "$CONTAINER_NAME" >/dev/null 2>&1
}

cleanup_container() {
    if [[ "$CONTAINER_STARTED" -ne 1 ]]; then
        return 0
    fi

    if runtime_container_exists; then
        if ! "$RUNTIME" rm -f "$CONTAINER_NAME" >/dev/null 2>&1; then
            return 1
        fi
    fi

    CONTAINER_STARTED=0
    return 0
}

on_exit() {
    local exit_code=$?

    set +e

    if [[ "$CONTAINER_STARTED" -eq 1 ]]; then
        if cleanup_container; then
            if [[ "$exit_code" -ne 0 ]]; then
                printf 'Cleanup: disposable PostgreSQL container removed\n' >&2
            fi
        else
            printf 'WARNUNG: Disposable PostgreSQL container konnte nicht sicher entfernt werden: %s\n' \
                "$CONTAINER_NAME" >&2

            if [[ "$exit_code" -eq 0 ]]; then
                exit_code=1
            fi
        fi
    fi

    if [[ "$exit_code" -ne 0 && "$RESULT_PRINTED" -eq 0 ]]; then
        printf 'Fehler während Phase: %s\n' "$PHASE" >&2
        print_result "FAIL"
    fi

    exit "$exit_code"
}

trap on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

usage() {
    cat <<'USAGE'
Usage:
  scripts/codex/verify-db.sh [options] [suite...]

Without suites, all database suites are executed.

Options:
  --list       Available database suites anzeigen.
  --dry-run    Auflösung und Runtime anzeigen, aber keinen Container starten.
  -h, --help   Hilfe anzeigen.

Examples:
  scripts/codex/verify-db.sh
  scripts/codex/verify-db.sh labs
  scripts/codex/verify-db.sh profile
  scripts/codex/verify-db.sh xp labs security
  scripts/codex/verify-db.sh --dry-run all
USAGE
}

declare -A SUITE_SCRIPTS=(
    [accounts]="scripts/test-admin-database.mts"
    [challenges]="scripts/test-challenge-database.mts"
    [planning]="scripts/test-curriculum-planning-database.mts"
    [notifications]="scripts/test-notification-database.mts"
    [practice]="scripts/test-practice-quiz-database.mts"
    [xp]="scripts/test-xp-database.mts"
    [ihk]="scripts/test-ihk-exam-database.mts"
    [web-push]="scripts/test-web-push-database.mts"
    [security]="scripts/test-security-rate-limit-database.mts"
    [labs]="scripts/test-interactive-lab-database.mts"
    [profile-moderation]="scripts/test-profile-moderation-database.mts"
    [teams]="scripts/test-team-database.mts"
)

declare -A SUITE_DESCRIPTIONS=(
    [accounts]="Konten und Administration"
    [challenges]="Challenges und Evidence-Persistenz"
    [planning]="Curriculum- und Trainer-Planung"
    [notifications]="Benachrichtigungen"
    [practice]="Practice-Quiz"
    [xp]="XP-Ledger und XP-Vergabe"
    [ihk]="IHK-Prüfungssimulation"
    [web-push]="Web-Push-Persistenz"
    [security]="Persistente Security-Rate-Limits"
    [labs]="Interactive Labs"
    [profile-moderation]="Profilbild-Moderation und Audit"
    [teams]="Teams und Mitgliedschaften"
)

SUITE_ORDER=(
    accounts
    challenges
    planning
    notifications
    practice
    xp
    ihk
    web-push
    security
    labs
    teams
)

list_suites() {
    printf 'Verfügbare DB-Suites:\n'

    local suite
    for suite in "${SUITE_ORDER[@]}"; do
        printf '  %-14s %s\n' "$suite" "${SUITE_DESCRIPTIONS[$suite]}"
    done
}

PHASE="argument parsing"

REQUESTED_SUITES=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --list)
            list_suites
            exit 0
            ;;
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        --*)
            fail "Unbekannte Option: $1"
            ;;
        *)
            REQUESTED_SUITES+=("$1")
            shift
            ;;
    esac
done

PHASE="repository discovery"

SCRIPT_DIR="$(
    cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
    pwd -P
)"

REPO_ROOT="$(
    cd -- "$SCRIPT_DIR/../.."
    pwd -P
)"

if ! GIT_ROOT="$(
    git -C "$REPO_ROOT" rev-parse --show-toplevel 2>/dev/null
)"; then
    fail "Kein Git-Repository gefunden."
fi

GIT_ROOT="$(
    cd -- "$GIT_ROOT"
    pwd -P
)"

if [[ "$GIT_ROOT" != "$REPO_ROOT" ]]; then
    fail "Repository-Grenze stimmt nicht mit dem Toolkit-Verzeichnis überein."
fi

for required_file in \
    package.json \
    scripts/migrate.mts
do
    if [[ ! -f "$REPO_ROOT/$required_file" ]]; then
        fail "Benötigte Datei fehlt: $required_file"
    fi
done

PHASE="dependency health"

if [[ ! -d "$REPO_ROOT/node_modules" ]]; then
    fail "npm-Abhängigkeiten fehlen. Führe im Repository einmal 'npm ci' aus."
fi

if ! (
    cd -- "$REPO_ROOT"
    npm ls --depth=0 --silent >/dev/null 2>&1
); then
    fail "npm-Abhängigkeiten sind unvollständig oder inkonsistent. Führe 'npm ci' aus."
fi

PHASE="suite resolution"

SELECTED_SUITES=()
declare -A SEEN_SUITES=()

if [[ "${#REQUESTED_SUITES[@]}" -eq 0 ]]; then
    SELECTED_SUITES=("${SUITE_ORDER[@]}")
else
    USE_ALL=0

    for suite in "${REQUESTED_SUITES[@]}"; do
        if [[ "$suite" == "all" ]]; then
            USE_ALL=1
            continue
        fi

        if [[ ! -v "SUITE_SCRIPTS[$suite]" ]]; then
            fail "Unbekannte DB-Suite: $suite. Nutze --list."
        fi

        if [[ ! -v "SEEN_SUITES[$suite]" ]]; then
            SEEN_SUITES["$suite"]=1
            SELECTED_SUITES+=("$suite")
        fi
    done

    if [[ "$USE_ALL" -eq 1 ]]; then
        SELECTED_SUITES=("${SUITE_ORDER[@]}")
    fi
fi

if [[ "${#SELECTED_SUITES[@]}" -eq 0 ]]; then
    fail "Keine DB-Suite ausgewählt."
fi

for suite in "${SELECTED_SUITES[@]}"; do
    test_script="${SUITE_SCRIPTS[$suite]}"

    if [[ ! -f "$REPO_ROOT/$test_script" ]]; then
        fail "Hinterlegtes DB-Testskript fehlt: $test_script"
    fi
done

PHASE="runtime discovery"

if command -v podman >/dev/null 2>&1 && podman info >/dev/null 2>&1; then
    RUNTIME="podman"
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    RUNTIME="docker"
else
    fail "Weder rootless Podman noch direkt nutzbares Docker ist verfügbar."
fi

printf 'DB Validation\n'
printf 'Repo:       %s\n' "$REPO_ROOT"
printf 'Runtime:    %s\n' "$RUNTIME"
printf 'PostgreSQL: 17\n'
printf 'Suites:     %s\n' "${SELECTED_SUITES[*]}"
printf 'Isolation:  disposable localhost database\n'

if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '\nTestskripte:\n'

    for suite in "${SELECTED_SUITES[@]}"; do
        printf '  %-14s %s\n' "$suite" "${SUITE_SCRIPTS[$suite]}"
    done

    printf '\nDry-run: kein Container gestartet.\n'

    RESULT_PRINTED=1
    print_result "PASS"
    exit 0
fi

PHASE="credential generation"

RANDOM_SUFFIX="$(
    python3 - <<'PY'
import secrets
print(secrets.token_hex(6))
PY
)"

DB_PASSWORD="$(
    python3 - <<'PY'
import secrets
print(secrets.token_hex(24))
PY
)"

CONTAINER_NAME="azubi-lab-db-verify-${RANDOM_SUFFIX}"

PHASE="PostgreSQL container start"

printf '\n--- PostgreSQL 17 start ---\n'

"$RUNTIME" run \
    -d \
    --rm \
    --name "$CONTAINER_NAME" \
    --label "azubi-lab.codex.verify-db=true" \
    -e "POSTGRES_USER=$DB_USER" \
    -e "POSTGRES_PASSWORD=$DB_PASSWORD" \
    -e "POSTGRES_DB=$DB_NAME" \
    -p "127.0.0.1::5432" \
    postgres:17 \
    >/dev/null

CONTAINER_STARTED=1

PHASE="mapped port discovery"

PORT_MAPPING="$(
    "$RUNTIME" port "$CONTAINER_NAME" 5432/tcp | tail -n 1
)"

DB_PORT="${PORT_MAPPING##*:}"

if [[ ! "$DB_PORT" =~ ^[0-9]+$ ]]; then
    fail "Konnte den lokalen PostgreSQL-Port nicht sicher bestimmen."
fi

DISPOSABLE_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${DB_PORT}/${DB_NAME}"

PHASE="database URL safety guard"

if ! DATABASE_URL="$DISPOSABLE_DATABASE_URL" EXPECTED_PORT="$DB_PORT" node <<'NODE'
const raw = process.env.DATABASE_URL;
const expectedPort = process.env.EXPECTED_PORT;

if (!raw || !expectedPort) process.exit(10);

const url = new URL(raw);

if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
  process.exit(11);
}

if (url.hostname !== "127.0.0.1") {
  process.exit(12);
}

if (url.port !== expectedPort) {
  process.exit(13);
}

if (url.pathname !== "/azubi_verify") {
  process.exit(14);
}
NODE
then
    fail "Safety Guard hat die disposable DATABASE_URL abgelehnt."
fi

printf 'Host:       127.0.0.1\n'
printf 'Port:       %s\n' "$DB_PORT"
printf 'Credentials: generated temporary values\n'

PHASE="PostgreSQL readiness"

READY=0

for _ in $(seq 1 30); do
    if "$RUNTIME" exec "$CONTAINER_NAME" \
        pg_isready \
        -h 127.0.0.1 \
        -p 5432 \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        >/dev/null 2>&1
    then
        READY=1
        break
    fi

    sleep 1
done

if [[ "$READY" -ne 1 ]]; then
    printf 'PostgreSQL wurde nicht rechtzeitig bereit.\n' >&2
    "$RUNTIME" logs --tail 40 "$CONTAINER_NAME" >&2 || true
    fail "PostgreSQL-17-Wegwerfcontainer ist nicht bereit."
fi

PHASE="PostgreSQL version verification"

SERVER_VERSION_NUM="$(
    "$RUNTIME" exec "$CONTAINER_NAME" \
        psql \
        -h 127.0.0.1 \
        -p 5432 \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -Atc 'SHOW server_version_num;'
)"

if [[ ! "$SERVER_VERSION_NUM" =~ ^17[0-9]{4}$ ]]; then
    fail "Unerwartete PostgreSQL-Version: server_version_num=$SERVER_VERSION_NUM"
fi

printf 'Readiness:  PASS\n'
printf 'Version:    PostgreSQL 17 confirmed\n'

LOG_TAIL_LINES=140

run_logged_phase() {
    local label="$1"
    shift

    local logfile
    local started
    local finished
    local duration
    local exit_code

    logfile="$(
        mktemp "${TMPDIR:-/tmp}/azubi-lab-db.XXXXXX.log"
    )" || fail "Temporäre Logdatei konnte nicht erstellt werden."

    PHASE="$label"
    started="$(date +%s)"

    printf '\n--- %s ---\n' "$label"

    if "$@" >"$logfile" 2>&1; then
        finished="$(date +%s)"
        duration=$((finished - started))
        rm -f -- "$logfile"
        printf 'PASS (%ss)\n' "$duration"
        return 0
    else
        exit_code=$?
    fi

    finished="$(date +%s)"
    duration=$((finished - started))

    printf 'FAIL (%ss, exit=%s)\n' "$duration" "$exit_code" >&2
    printf 'Letzte %s Log-Zeilen:\n' "$LOG_TAIL_LINES" >&2
    tail -n "$LOG_TAIL_LINES" "$logfile" >&2 || true
    rm -f -- "$logfile"

    fail "DB validation fehlgeschlagen in Phase: $label" "$exit_code"
}

run_migrations() {
    (
        cd -- "$REPO_ROOT"

        env \
            DATABASE_URL="$DISPOSABLE_DATABASE_URL" \
            node \
                --experimental-strip-types \
                scripts/migrate.mts
    )
}

run_logged_phase     "Migration run 1"     run_migrations

run_logged_phase     "Migration run 2 / idempotency"     run_migrations

run_db_suite() {
    local suite="$1"
    local script="${SUITE_SCRIPTS[$suite]}"

    (
        cd -- "$REPO_ROOT"

        env \
            DATABASE_URL="$DISPOSABLE_DATABASE_URL" \
            node \
                --conditions=react-server \
                --experimental-strip-types \
                "$script"
    )
}

for suite in "${SELECTED_SUITES[@]}"; do
    run_logged_phase         "DB suite: $suite"         run_db_suite "$suite"
done

PHASE="database verification"

MIGRATION_COUNT="$(
    "$RUNTIME" exec "$CONTAINER_NAME" \
        psql \
        -h 127.0.0.1 \
        -p 5432 \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -Atc 'SELECT count(*) FROM schema_migrations;'
)"

EXPECTED_MIGRATION_COUNT="$(
    find "$REPO_ROOT/db/migrations" \
        -maxdepth 1 \
        -type f \
        -name '*.sql' \
        | wc -l
)"

EXPECTED_MIGRATION_COUNT="${EXPECTED_MIGRATION_COUNT//[[:space:]]/}"

if [[ "$MIGRATION_COUNT" != "$EXPECTED_MIGRATION_COUNT" ]]; then
    fail "Migration count mismatch: DB=$MIGRATION_COUNT, Repository=$EXPECTED_MIGRATION_COUNT"
fi

printf '\nMigration count: %s/%s\n' "$MIGRATION_COUNT" "$EXPECTED_MIGRATION_COUNT"

PHASE="container cleanup"

if ! cleanup_container; then
    fail "Disposable PostgreSQL container konnte nicht entfernt werden."
fi

if runtime_container_exists; then
    fail "Disposable PostgreSQL container existiert nach Cleanup weiterhin."
fi

printf 'Cleanup:         PASS\n'

RESULT_PRINTED=1
print_result "PASS"
