#!/usr/bin/env bash

set -uo pipefail

RESULT_PRINTED=0
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

TMP_ROOT="$(
    mktemp -d "${TMPDIR:-/tmp}/azubi-lab-codex-self-test.XXXXXX"
)" || fail "Temporäres Testverzeichnis konnte nicht erstellt werden."

run_success() {
    local label="$1"
    shift

    local logfile="$TMP_ROOT/success-${RANDOM}.log"

    printf '%-42s' "$label"

    if (
        cd -- "$REPO_ROOT"
        "$@"
    ) >"$logfile" 2>&1; then
        printf 'PASS\n'
        return 0
    fi

    local rc=$?

    printf 'FAIL\n' >&2
    tail -n 80 "$logfile" >&2 || true
    fail "$label ist fehlgeschlagen." "$rc"
}

expect_failure() {
    local label="$1"
    shift

    local logfile="$TMP_ROOT/failure-${RANDOM}.log"

    printf '%-42s' "$label"

    if (
        cd -- "$REPO_ROOT"
        "$@"
    ) >"$logfile" 2>&1; then
        printf 'FAIL\n' >&2
        tail -n 80 "$logfile" >&2 || true
        fail "$label hätte fehlschlagen müssen."
    fi

    printf 'PASS\n'
}

printf 'Codex Toolkit Self-Test\n'
printf 'Repo: %s\n\n' "$REPO_ROOT"

REQUIRED_SCRIPTS=(
    scripts/codex/preflight.sh
    scripts/codex/verify-focused.sh
    scripts/codex/verify-db.sh
    scripts/codex/verify-full.sh
    scripts/codex/report.sh
    scripts/codex/self-test.sh
)

printf '%-42s' "Toolkit scripts vorhanden"

for file in "${REQUIRED_SCRIPTS[@]}"; do
    if [[ ! -f "$REPO_ROOT/$file" ]]; then
        printf 'FAIL\n' >&2
        fail "Toolkit-Datei fehlt: $file"
    fi
done

printf 'PASS\n'

printf '%-42s' "Toolkit scripts ausführbar"

for file in "${REQUIRED_SCRIPTS[@]}"; do
    if [[ ! -x "$REPO_ROOT/$file" ]]; then
        printf 'FAIL\n' >&2
        fail "Toolkit-Datei ist nicht ausführbar: $file"
    fi
done

printf 'PASS\n'

run_success \
    "Bash-Syntax" \
    bash -n "${REQUIRED_SCRIPTS[@]}"

run_success \
    "npm Alias-Konfiguration" \
    node <<'NODE'
const pkg = require("./package.json");

const expected = {
  "codex:preflight": "bash scripts/codex/preflight.sh",
  "codex:report": "bash scripts/codex/report.sh",
  "codex:self-test": "bash scripts/codex/self-test.sh",
  "verify:focused": "bash scripts/codex/verify-focused.sh",
  "verify:db": "bash scripts/codex/verify-db.sh",
  "verify:full": "bash scripts/codex/verify-full.sh",
};

for (const [name, command] of Object.entries(expected)) {
  if (pkg.scripts?.[name] !== command) {
    throw new Error(
      `${name}: expected ${JSON.stringify(command)}, got ${JSON.stringify(pkg.scripts?.[name])}`,
    );
  }
}
NODE

printf '%-42s' "Codex-Dokumentation vorhanden"

for file in \
    docs/CODEX_WORKFLOW.md \
    docs/CODEX_CONTEXT.md \
    docs/CODEX_BATCH_TEMPLATE.md
do
    if [[ ! -f "$REPO_ROOT/$file" ]]; then
        printf 'FAIL\n' >&2
        fail "Dokumentation fehlt: $file"
    fi
done

printf 'PASS\n'

run_success \
    "AGENTS Workflow-Verweise" \
    node <<'NODE'
const fs = require("node:fs");

const text = fs.readFileSync("AGENTS.md", "utf8");

for (const required of [
  "## Repository Workflow",
  "docs/CODEX_WORKFLOW.md",
  "docs/CODEX_CONTEXT.md",
  "docs/CODEX_BATCH_TEMPLATE.md",
]) {
  if (!text.includes(required)) {
    throw new Error(`AGENTS.md missing: ${required}`);
  }
}
NODE

run_success \
    "Next.js Managed Block eindeutig" \
    node <<'NODE'
const fs = require("node:fs");

const text = fs.readFileSync("AGENTS.md", "utf8");

const begin = "<!-- BEGIN:nextjs-agent-rules -->";
const end = "<!-- END:nextjs-agent-rules -->";

const beginCount = text.split(begin).length - 1;
const endCount = text.split(end).length - 1;

if (beginCount !== 1 || endCount !== 1) {
  throw new Error(`managed block markers: begin=${beginCount}, end=${endCount}`);
}

if (text.indexOf(begin) >= text.indexOf(end)) {
  throw new Error("managed block marker order invalid");
}
NODE

HEAD_SHORT="$(
    git -C "$REPO_ROOT" rev-parse --short=12 HEAD
)"

run_success \
    "Preflight Happy Path" \
    "$REPO_ROOT/scripts/codex/preflight.sh" \
        --expected-head "$HEAD_SHORT" \
        --allow-dirty

expect_failure \
    "Preflight falscher HEAD" \
    "$REPO_ROOT/scripts/codex/preflight.sh" \
        --expected-head deadbeefdead \
        --allow-dirty

run_success \
    "Focused Resolver + Dedupe" \
    "$REPO_ROOT/scripts/codex/verify-focused.sh" \
        --dry-run \
        profile rewards profile

expect_failure \
    "Focused unbekanntes Profil" \
    "$REPO_ROOT/scripts/codex/verify-focused.sh" \
        --dry-run \
        __invalid_profile__

run_success \
    "DB Resolver Dry-Run" \
    "$REPO_ROOT/scripts/codex/verify-db.sh" \
        --dry-run \
        security profile-moderation

expect_failure \
    "DB unbekannte Suite" \
    "$REPO_ROOT/scripts/codex/verify-db.sh" \
        --dry-run \
        __invalid_suite__

run_success \
    "Codex Report" \
    "$REPO_ROOT/scripts/codex/report.sh" \
        --baseline "$HEAD_SHORT"

printf '%-42s' "Keine Production-Adressen im Toolkit"

PRODUCTION_PATTERN='192\.168\.[0-9]+\.[0-9]+|100\.[0-9]+\.[0-9]+\.[0-9]+|/mnt/data/'

PRODUCTION_MATCHES="$(
    grep -RniE \
        "$PRODUCTION_PATTERN" \
        "$REPO_ROOT/scripts/codex" \
        "$REPO_ROOT/docs/CODEX_WORKFLOW.md" \
        "$REPO_ROOT/docs/CODEX_CONTEXT.md" \
        "$REPO_ROOT/docs/CODEX_BATCH_TEMPLATE.md" \
        2>/dev/null \
        | grep -vE '/self-test\.sh:[0-9]+:PRODUCTION_PATTERN=' \
        || true
)"

if [[ -n "$PRODUCTION_MATCHES" ]]; then
    printf 'FAIL\n' >&2
    printf '%s\n' "$PRODUCTION_MATCHES" >&2
    fail "Produktions-/Homelab-Adresse im Codex-Toolkit gefunden."
fi

printf 'PASS\n'

run_success \
    "Git diff check" \
    git diff --check

RESULT_PRINTED=1
print_result "PASS"
