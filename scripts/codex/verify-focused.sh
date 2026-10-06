#!/usr/bin/env bash

set -euo pipefail

RESULT_PRINTED=0
PHASE="initialization"
RUN_TYPECHECK=0
DRY_RUN=0

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
  scripts/codex/verify-focused.sh [options] <profile> [profile...]

Options:
  --list             Available profiles anzeigen.
  --dry-run          Auflösung anzeigen, aber keine Tests ausführen.
  --typecheck        Zusätzlich npm run typecheck ausführen.
  -h, --help         Hilfe anzeigen.

Examples:
  scripts/codex/verify-focused.sh profile
  scripts/codex/verify-focused.sh profile rewards auth
  scripts/codex/verify-focused.sh --typecheck labs
  scripts/codex/verify-focused.sh --dry-run profile rewards profile
USAGE
}

declare -A PROFILE_TESTS=(
    [labs]="
tests/interactive-lab.test.mts
tests/evidence-file-validation.test.mts
"

    [rewards]="
tests/progression-rewards.test.mts
tests/reward-history.test.mts
tests/xp-event-presentation.test.mts
tests/xp-architecture.test.mts
tests/xp-domain.test.mts
tests/app-shell-xp.test.mts
tests/learning-progression.test.mts
tests/practice-quiz-attempt.test.mts
"

    [profile]="
tests/profile.test.mts
tests/profile-image.test.mts
tests/profile-backup.test.mts
tests/avatar-moderation.test.mts
tests/app-shell-xp.test.mts
"

    [auth]="
tests/access-control-recovery.test.mts
tests/observer-role.test.mts
tests/security-hardening.test.mts
"

    [admin]="
tests/admin-domain.test.mts
tests/trainer-reporting.test.mts
tests/challenge-domain.test.mts
tests/observer-role.test.mts
tests/avatar-moderation.test.mts
"

    [teams]="
tests/team-domain.test.mts
tests/team-social.test.mts
tests/progression-rewards.test.mts
tests/profile.test.mts
tests/avatar-moderation.test.mts
tests/mobile-navigation.test.mts
"

    [content]="
tests/learning-content.test.mts
tests/learning-exercise.test.mts
tests/quiz-engine.test.mts
tests/data-calculations.test.mts
tests/client-installation.test.mts
"

    [planning]="
tests/curriculum-planning.test.mts
"

    [notifications]="
tests/notification-domain.test.mts
tests/notification-push.test.mts
tests/web-push.test.mts
"

    [practice]="
tests/practice-quiz-attempt.test.mts
tests/practice-quiz-statistics.test.mts
tests/practice-quiz-ui.test.mts
"

    [ihk]="
tests/ihk-exam.test.mts
"

    [ops]="
tests/swarm-operations.test.mts
tests/profile-backup.test.mts
tests/evidence-file-validation.test.mts
"
)

declare -A PROFILE_DESCRIPTIONS=(
    [labs]="Interactive Labs und Evidence-Dateien"
    [rewards]="XP, Progression, Titel und Rewards"
    [profile]="Profil, Profilbilder und Profil-Backup"
    [auth]="Zugriffskontrolle, Observer und Security"
    [admin]="Administration und Trainer-Zugriffe"
    [teams]="Teams, Social Profiles und Badge Showcase"
    [content]="Lerninhalte, Übungen und Quiz-Engine"
    [planning]="Curriculum- und Ausbildungsplanung"
    [notifications]="Benachrichtigungen und Web Push"
    [practice]="Practice-Quiz"
    [ihk]="IHK-Prüfungssimulation"
    [ops]="Swarm-, Backup- und Evidence-Ops"
)

PROFILE_ORDER=(
    labs
    rewards
    profile
    auth
    admin
    teams
    content
    planning
    notifications
    practice
    ihk
    ops
)

list_profiles() {
    printf 'Verfügbare Focus-Profile:\n'

    local profile
    for profile in "${PROFILE_ORDER[@]}"; do
        printf '  %-14s %s\n' "$profile" "${PROFILE_DESCRIPTIONS[$profile]}"
    done
}

PHASE="argument parsing"

SELECTED_PROFILES=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --list)
            list_profiles
            exit 0
            ;;
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        --typecheck)
            RUN_TYPECHECK=1
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
            SELECTED_PROFILES+=("$1")
            shift
            ;;
    esac
done

if [[ "${#SELECTED_PROFILES[@]}" -eq 0 ]]; then
    fail "Mindestens ein Focus-Profil ist erforderlich. Nutze --list für die verfügbaren Profile."
fi

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

if [[ ! -f "$REPO_ROOT/package.json" ]]; then
    fail "package.json fehlt im Repository-Root."
fi

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

PHASE="profile resolution"

declare -A SEEN_PROFILES=()
declare -A SEEN_TESTS=()

RESOLVED_PROFILES=()
TEST_FILES=()

for profile in "${SELECTED_PROFILES[@]}"; do
    if [[ ! -v "PROFILE_TESTS[$profile]" ]]; then
        fail "Unbekanntes Focus-Profil: $profile. Nutze --list."
    fi

    if [[ ! -v "SEEN_PROFILES[$profile]" ]]; then
        SEEN_PROFILES["$profile"]=1
        RESOLVED_PROFILES+=("$profile")
    fi

    while IFS= read -r test_file; do
        [[ -n "$test_file" ]] || continue

        if [[ ! -f "$REPO_ROOT/$test_file" ]]; then
            fail "Hinterlegte Testdatei fehlt: $test_file (Profil: $profile)"
        fi

        if [[ ! -v "SEEN_TESTS[$test_file]" ]]; then
            SEEN_TESTS["$test_file"]=1
            TEST_FILES+=("$test_file")
        fi
    done <<< "${PROFILE_TESTS[$profile]}"
done

if [[ "${#TEST_FILES[@]}" -eq 0 ]]; then
    fail "Die gewählten Profile haben keine Testdateien aufgelöst."
fi

printf 'Focused Validation\n'
printf 'Repo:      %s\n' "$REPO_ROOT"
printf 'Profile:   %s\n' "${RESOLVED_PROFILES[*]}"
printf 'Tests:     %d\n' "${#TEST_FILES[@]}"
printf 'Typecheck: %s\n' "$(
    if [[ "$RUN_TYPECHECK" -eq 1 ]]; then
        printf 'yes'
    else
        printf 'no'
    fi
)"

printf '\nTestdateien:\n'

for test_file in "${TEST_FILES[@]}"; do
    printf '  %s\n' "$test_file"
done

if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '\nDry-run: keine Tests ausgeführt.\n'
    RESULT_PRINTED=1
    print_result "PASS"
    exit 0
fi

LOG_TAIL_LINES=120

run_logged_phase() {
    local label="$1"
    shift

    local logfile
    local started
    local finished
    local duration
    local exit_code

    logfile="$(
        mktemp "${TMPDIR:-/tmp}/azubi-lab-focused.XXXXXX.log"
    )" || fail "Temporäre Logdatei konnte nicht erstellt werden."

    PHASE="$label"
    started="$(date +%s)"

    printf '\n--- %s ---\n' "$label"

    if (
        cd -- "$REPO_ROOT"
        "$@"
    ) >"$logfile" 2>&1; then
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

    fail "Focused validation fehlgeschlagen in Phase: $label" "$exit_code"
}

run_logged_phase     "Focused tests"     node         --conditions=react-server         --experimental-strip-types         --test         "${TEST_FILES[@]}"

if [[ "$RUN_TYPECHECK" -eq 1 ]]; then
    run_logged_phase         "TypeScript"         npm run typecheck
fi

PHASE="git diff check"

printf '\n--- git diff --check ---\n'

git -C "$REPO_ROOT" diff --check

RESULT_PRINTED=1
print_result "PASS"
