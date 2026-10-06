#!/usr/bin/env bash

set -uo pipefail

BASELINE=""
RESULT_PRINTED=0

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

usage() {
    cat <<'USAGE'
Usage:
  scripts/codex/report.sh [options]

Options:
  --baseline <sha>   Compare tracked changes against this commit.
                     Accepts 7 to 40 hexadecimal characters.

  -h, --help         Show this help.

The report is read-only and intentionally concise.
It never prints full diffs, environment variables or file contents.
USAGE
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --baseline)
            [[ $# -ge 2 ]] || fail "--baseline benötigt einen SHA-Wert."
            BASELINE="$2"
            shift 2
            ;;
        --baseline=*)
            BASELINE="${1#*=}"
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

HEAD_FULL="$(git -C "$REPO_ROOT" rev-parse --verify HEAD)"
HEAD_SHORT="$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"

if BRANCH="$(
    git -C "$REPO_ROOT" symbolic-ref --quiet --short HEAD 2>/dev/null
)"; then
    :
else
    BRANCH="DETACHED"
fi

COMPARE_REF="$HEAD_FULL"
COMPARE_LABEL="HEAD ($HEAD_SHORT)"

if [[ -n "$BASELINE" ]]; then
    if [[ ! "$BASELINE" =~ ^[0-9a-fA-F]{7,40}$ ]]; then
        fail "--baseline muss aus 7 bis 40 hexadezimalen Zeichen bestehen."
    fi

    if ! BASELINE_FULL="$(
        git -C "$REPO_ROOT" rev-parse --verify "${BASELINE}^{commit}" 2>/dev/null
    )"; then
        fail "Baseline-Commit existiert nicht: $BASELINE"
    fi

    COMPARE_REF="$BASELINE_FULL"
    BASELINE_SHORT="$(
        git -C "$REPO_ROOT" rev-parse --short=12 "$BASELINE_FULL"
    )"
    COMPARE_LABEL="baseline $BASELINE_SHORT"
fi

STATUS_OUTPUT="$(
    git -C "$REPO_ROOT" status \
        --short \
        --untracked-files=normal
)"

mapfile -d '' -t TRACKED_CHANGED < <(
    git -C "$REPO_ROOT" diff \
        --name-only \
        -z \
        "$COMPARE_REF" \
        --
)

mapfile -d '' -t UNTRACKED_FILES < <(
    git -C "$REPO_ROOT" ls-files \
        --others \
        --exclude-standard \
        -z
)

mapfile -d '' -t ADDED_MIGRATIONS < <(
    git -C "$REPO_ROOT" diff \
        --name-only \
        --diff-filter=A \
        -z \
        "$COMPARE_REF" \
        -- db/migrations
)

for file in "${UNTRACKED_FILES[@]}"; do
    if [[ "$file" == db/migrations/*.sql ]]; then
        ADDED_MIGRATIONS+=("$file")
    fi
done

path_changed() {
    local wanted="$1"
    local file

    for file in "${TRACKED_CHANGED[@]}"; do
        if [[ "$file" == "$wanted" ]]; then
            return 0
        fi
    done

    for file in "${UNTRACKED_FILES[@]}"; do
        if [[ "$file" == "$wanted" ]]; then
            return 0
        fi
    done

    return 1
}

if DIFF_CHECK_OUTPUT="$(
    git -C "$REPO_ROOT" diff \
        --check \
        "$COMPARE_REF" \
        -- 2>&1
)"; then
    DIFF_CHECK_RESULT="PASS"
else
    DIFF_CHECK_EXIT=$?

    if [[ -n "$DIFF_CHECK_OUTPUT" ]]; then
        printf '%s\n' "$DIFF_CHECK_OUTPUT" >&2
    fi

    fail "git diff --check ist fehlgeschlagen." "$DIFF_CHECK_EXIT"
fi

printf 'Codex Report\n'
printf 'Repo:       %s\n' "$REPO_ROOT"
printf 'Branch:     %s\n' "$BRANCH"
printf 'HEAD:       %s\n' "$HEAD_SHORT"
printf 'Compare:    %s\n' "$COMPARE_LABEL"

if [[ -z "$STATUS_OUTPUT" ]]; then
    printf 'Worktree:   clean\n'
else
    printf 'Worktree:   dirty\n'
fi

printf 'Diff check: %s\n' "$DIFF_CHECK_RESULT"

printf '\n--- Working tree status ---\n'

if [[ -z "$STATUS_OUTPUT" ]]; then
    printf 'clean\n'
else
    printf '%s\n' "$STATUS_OUTPUT"
fi

printf '\n--- Changed tracked files ---\n'

if [[ "${#TRACKED_CHANGED[@]}" -eq 0 ]]; then
    printf 'none\n'
else
    for file in "${TRACKED_CHANGED[@]}"; do
        printf '%s\n' "$file"
    done
fi

printf '\n--- Untracked files ---\n'

if [[ "${#UNTRACKED_FILES[@]}" -eq 0 ]]; then
    printf 'none\n'
else
    for file in "${UNTRACKED_FILES[@]}"; do
        printf '%s\n' "$file"
    done
fi

printf '\n--- Diff stat ---\n'

DIFF_STAT="$(
    git -C "$REPO_ROOT" diff \
        --stat \
        "$COMPARE_REF" \
        --
)"

if [[ -z "$DIFF_STAT" ]]; then
    printf 'no tracked changes\n'
else
    printf '%s\n' "$DIFF_STAT"
fi

printf '\n--- New migrations ---\n'

if [[ "${#ADDED_MIGRATIONS[@]}" -eq 0 ]]; then
    printf 'none\n'
else
    printf '%s\n' "${ADDED_MIGRATIONS[@]}"
fi

printf '\n--- Dependency metadata ---\n'

if path_changed "package.json"; then
    printf 'package.json:      changed\n'
else
    printf 'package.json:      unchanged\n'
fi

if path_changed "package-lock.json"; then
    printf 'package-lock.json: changed\n'
else
    printf 'package-lock.json: unchanged\n'
fi

RESULT_PRINTED=1
print_result "PASS"
