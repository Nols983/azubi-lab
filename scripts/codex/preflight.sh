#!/usr/bin/env bash

set -euo pipefail

EXPECTED_HEAD=""
ALLOW_DIRTY=0
RESULT_PRINTED=0
PHASE="initialization"

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

on_error() {
    local exit_code=$?

    if [[ "$RESULT_PRINTED" -eq 0 ]]; then
        printf 'Unerwarteter Fehler während: %s\n' "$PHASE" >&2
        print_result "FAIL"
    fi

    exit "$exit_code"
}

trap on_error ERR

usage() {
    cat <<'USAGE'
Usage:
  scripts/codex/preflight.sh [options]

Options:
  --expected-head <sha>   Require HEAD to match this Git commit prefix.
                          Accepts 7 to 40 hexadecimal characters.

  --allow-dirty           Allow tracked or untracked working-tree changes.

  -h, --help              Show this help.

Default behavior:
  - validates the repository containing this script
  - requires a clean working tree
  - reports Git HEAD, branch, Node.js and npm versions
USAGE
}

PHASE="argument parsing"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --expected-head)
            [[ $# -ge 2 ]] || fail "--expected-head benötigt einen SHA-Wert."
            EXPECTED_HEAD="$2"
            shift 2
            ;;
        --expected-head=*)
            EXPECTED_HEAD="${1#*=}"
            shift
            ;;
        --allow-dirty)
            ALLOW_DIRTY=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            fail "Unbekanntes Argument: $1"
            ;;
    esac
done

if [[ -n "$EXPECTED_HEAD" ]]; then
    if [[ ! "$EXPECTED_HEAD" =~ ^[0-9a-fA-F]{7,40}$ ]]; then
        fail "--expected-head muss aus 7 bis 40 hexadezimalen Zeichen bestehen."
    fi

    EXPECTED_HEAD="${EXPECTED_HEAD,,}"
fi

PHASE="tool checks"

for tool in git node npm; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        fail "Benötigtes Werkzeug fehlt: $tool"
    fi
done

PHASE="repository discovery"

SCRIPT_DIR="$(
    cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
    pwd -P
)"

EXPECTED_REPO_ROOT="$(
    cd -- "$SCRIPT_DIR/../.."
    pwd -P
)"

if ! GIT_ROOT="$(
    git -C "$EXPECTED_REPO_ROOT" rev-parse --show-toplevel 2>/dev/null
)"; then
    fail "Das Toolkit befindet sich nicht in einem Git-Repository."
fi

GIT_ROOT="$(
    cd -- "$GIT_ROOT"
    pwd -P
)"

if [[ "$GIT_ROOT" != "$EXPECTED_REPO_ROOT" ]]; then
    fail "Repository-Grenze stimmt nicht mit dem Toolkit-Verzeichnis überein."
fi

if [[ ! -f "$GIT_ROOT/package.json" ]]; then
    fail "package.json fehlt im Repository-Root."
fi

PHASE="dependency health"

if [[ ! -d "$GIT_ROOT/node_modules" ]]; then
    fail "npm-Abhängigkeiten fehlen. Führe im Repository einmal 'npm ci' aus."
fi

if ! (
    cd -- "$GIT_ROOT"
    npm ls --depth=0 --silent >/dev/null 2>&1
); then
    fail "npm-Abhängigkeiten sind unvollständig oder inkonsistent. Führe 'npm ci' aus."
fi

PHASE="Git state"

HEAD_FULL="$(git -C "$GIT_ROOT" rev-parse --verify HEAD)"
HEAD_SHORT="$(git -C "$GIT_ROOT" rev-parse --short=12 HEAD)"

if BRANCH="$(git -C "$GIT_ROOT" symbolic-ref --quiet --short HEAD 2>/dev/null)"; then
    :
else
    BRANCH="DETACHED"
fi

if [[ -n "$EXPECTED_HEAD" ]]; then
    if [[ "${HEAD_FULL:0:${#EXPECTED_HEAD}}" != "$EXPECTED_HEAD" ]]; then
        fail "HEAD stimmt nicht überein: erwartet $EXPECTED_HEAD, gefunden $HEAD_SHORT."
    fi
fi

STATUS_OUTPUT="$(
    git -C "$GIT_ROOT" status --porcelain=v1 --untracked-files=normal
)"

if [[ -n "$STATUS_OUTPUT" && "$ALLOW_DIRTY" -ne 1 ]]; then
    printf 'Working-Tree-Änderungen:\n%s\n' "$STATUS_OUTPUT" >&2
    fail "Working Tree ist nicht sauber. Nutze --allow-dirty nur für einen bewusst fortgesetzten Arbeitsstand."
fi

PHASE="runtime versions"

NODE_VERSION="$(node --version)"
NPM_VERSION="$(npm --version)"

printf 'Codex Preflight\n'
printf 'Repo:         %s\n' "$GIT_ROOT"
printf 'Branch:       %s\n' "$BRANCH"
printf 'HEAD:         %s\n' "$HEAD_SHORT"

if [[ -n "$EXPECTED_HEAD" ]]; then
    printf 'Expected:     %s (OK)\n' "$EXPECTED_HEAD"
fi

if [[ -z "$STATUS_OUTPUT" ]]; then
    printf 'Working tree: clean\n'
else
    printf 'Working tree: dirty (allowed)\n'
fi

printf 'Node.js:      %s\n' "$NODE_VERSION"
printf 'npm:          %s\n' "$NPM_VERSION"
printf 'Dependencies: OK\n'

RESULT_PRINTED=1
print_result "PASS"
