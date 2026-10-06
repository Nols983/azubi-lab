import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { selectAppShellXpProgress } from "../src/app/lib/app-shell-xp.ts";
import { deriveLevelProgress } from "../src/app/lib/xp-domain.ts";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("root layout passes the authoritative shell profile into AppShell", async () => {
  const [layout, service] = await Promise.all([
    source("src/app/layout.tsx"),
    source("src/app/lib/server/profile-service.ts"),
  ]);
  assert.match(layout, /Promise\.all\(\[[\s\S]*getLearnerBootstrap\(\)[\s\S]*getNotificationIndicatorView\(\)[\s\S]*getCurrentShellProfileView\(\)/);
  assert.match(layout, /shellProfile=\{shellProfile\}/);
  assert.match(service, /user\.role !== "learner"/);
  assert.match(service, /getLearnerRewardState\(user\.id\)/);
  assert.match(service, /roleLabel: ACCOUNT_ROLE_LABELS\.learner/);
});

test("only an authenticated active learner receives the AppShell XP projection", () => {
  const progress = deriveLevelProgress(1420);
  const learner = { id: "learner", login: "anna", displayName: "Anna", role: "learner", mustChangePassword: false } as const;
  const instructor = { ...learner, id: "instructor", role: "instructor" } as const;
  const observer = { ...learner, id: "observer", role: "observer" } as const;
  const admin = { ...learner, id: "admin", role: "admin" } as const;
  assert.equal(selectAppShellXpProgress("authenticated", learner, { audience: "learner", progress }), progress);
  assert.equal(selectAppShellXpProgress("anonymous", undefined, { audience: "anonymous" }), undefined);
  assert.equal(selectAppShellXpProgress("authenticated", instructor, { audience: "other-role" }), undefined);
  assert.equal(selectAppShellXpProgress("preview", observer, { audience: "other-role" }), undefined);
  assert.equal(selectAppShellXpProgress("authenticated", admin, { audience: "other-role" }), undefined);
  assert.equal(selectAppShellXpProgress("authenticated", { ...learner, mustChangePassword: true }, { audience: "password-change" }), undefined);
  assert.deepEqual(progress, {
    totalXp: 1420,
    level: 7,
    currentLevelStartXp: 1350,
    nextLevelXp: 1750,
    xpIntoCurrentLevel: 70,
    xpRequiredForNextLevel: 400,
    xpRemainingToNextLevel: 330,
    progressPercentage: 18,
  });
});

test("AppShell exposes desktop and mobile learner XP without duplicating level math", async () => {
  const [shell, sidebar, summary] = await Promise.all([
    source("src/app/components/app-shell.tsx"),
    source("src/app/components/navigation/desktop-sidebar.tsx"),
    source("src/app/components/xp/app-shell-xp-summary.tsx"),
  ]);
  assert.match(shell, /xpProgress &&[\s\S]*MobileAppShellXpSummary/);
  assert.match(summary, /export function MobileDrawerXpSummary/);
  assert.match(sidebar, /shellProfile\.xp && <DesktopAppShellXpSummary/);
  assert.match(summary, /progress\.level/);
  assert.match(summary, /progress\.totalXp/);
  assert.match(summary, /progress\.xpIntoCurrentLevel/);
  assert.match(summary, /progress\.xpRequiredForNextLevel/);
  assert.match(summary, /ProgressBar value=\{progress\.progressPercentage\}/);
  assert.match(summary, /Level \$\{progress\.level\} · \$\{formatXp\(progress\.totalXp\)\} XP/);
  assert.match(summary, /aria-label=\{`\$\{label\}\. XP-Fortschritt öffnen`\}/);
  for (const content of [shell, sidebar, summary]) {
    assert.doesNotMatch(content, /deriveLevelProgress|getXpThresholdForLevel|25\s*\*\s*\(.*level/);
  }
});

test("XP mutations revalidate the root layout for the persistent indicator", async () => {
  const [progressActions, practiceActions, challengeActions] = await Promise.all([
    source("src/app/actions/progress-actions.ts"),
    source("src/app/actions/practice-quiz-actions.ts"),
    source("src/app/actions/challenge-actions.ts"),
  ]);
  assert.match(progressActions, /revalidatePath\("\/", "layout"\)/);
  assert.match(practiceActions, /revalidatePath\("\/", "layout"\)/);
  assert.match(challengeActions, /decision === "approved"\) revalidatePath\("\/", "layout"\)/);
});
