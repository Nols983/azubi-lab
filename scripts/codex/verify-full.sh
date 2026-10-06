#!/usr/bin/env bash

set -uo pipefail

RESULT_PRINTED=0
PHASE="initialization"
LOG_TAIL_LINES=160
TMP_ROOT=""

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

cleanup() {
    if [[ -n "$TMP_ROOT" && -d "$TMP_ROOT" ]]; then
        rm -rf -- "$TMP_ROOT"
    fi
}

trap cleanup EXIT HUP INT TERM

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

if [[ ! -f "$REPO_ROOT/package.json" ]]; then
    fail "package.json fehlt im Repository-Root."
fi

if [[ ! -d "$REPO_ROOT/node_modules" ]]; then
    fail "npm-Abhängigkeiten fehlen. Führe 'npm ci' aus."
fi

if ! (
    cd -- "$REPO_ROOT"
    npm ls --depth=0 --silent >/dev/null 2>&1
); then
    fail "npm-Abhängigkeiten sind unvollständig oder inkonsistent. Führe 'npm ci' aus."
fi

TMP_ROOT="$(
    mktemp -d "${TMPDIR:-/tmp}/azubi-lab-verify-full.XXXXXX"
)" || fail "Temporäres Log-Verzeichnis konnte nicht erstellt werden."

format_command() {
    printf '  '

    local arg
    for arg in "$@"; do
        printf '%q ' "$arg"
    done

    printf '\n'
}

run_phase() {
    local label="$1"
    shift

    local safe_label
    local logfile
    local started
    local finished
    local duration
    local exit_code

    safe_label="$(
        printf '%s' "$label" |
            tr '[:upper:]' '[:lower:]' |
            tr -cs 'a-z0-9' '-'
    )"

    logfile="$TMP_ROOT/${safe_label}.log"
    PHASE="$label"
    started="$(date +%s)"

    printf '\n--- %s ---\n' "$label"

    if (
        cd -- "$REPO_ROOT"
        "$@"
    ) >"$logfile" 2>&1; then
        finished="$(date +%s)"
        duration=$((finished - started))
        printf 'PASS (%ss)\n' "$duration"
        return 0
    else
        exit_code=$?
    fi

    finished="$(date +%s)"
    duration=$((finished - started))

    printf 'FAIL (%ss, exit=%s)\n' "$duration" "$exit_code" >&2
    printf 'Command:\n' >&2
    format_command "$@" >&2
    printf '\nLetzte %s Log-Zeilen:\n' "$LOG_TAIL_LINES" >&2
    tail -n "$LOG_TAIL_LINES" "$logfile" >&2 || true

    fail "Final validation fehlgeschlagen in Phase: $label" "$exit_code"
}

printf 'Full Validation\n'
printf 'Repo: %s\n' "$REPO_ROOT"
printf 'HEAD: %s\n' "$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"

PHASE="Codex shell syntax"

mapfile -t CODEX_SHELL_FILES < <(
    find "$REPO_ROOT/scripts/codex" \
        -maxdepth 1 \
        -type f \
        -name '*.sh' \
        -print |
        sort
)

if [[ "${#CODEX_SHELL_FILES[@]}" -gt 0 ]]; then
    run_phase \
        "Codex shell syntax" \
        bash -n "${CODEX_SHELL_FILES[@]}"
fi

run_phase "Codex toolkit self-test" \
    bash scripts/codex/self-test.sh

run_phase "Tests" \
    npm test

run_phase "ESLint" \
    npm run lint

run_phase "TypeScript" \
    npm run typecheck

run_phase "Ops validation" \
    npm run ops:validate

run_phase "Production build" \
    npm run build -- --webpack

run_phase "Git diff check" \
    git diff --check

RESULT_PRINTED=1
print_result "PASS"
