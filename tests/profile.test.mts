import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { learningModules } from "../src/app/data/learning-modules.ts";
import { quizzes } from "../src/app/data/quizzes.ts";
import {
  buildLearnerProfileSummary,
  buildPrivateProfileAccount,
  getProfileInitials,
  getProfileQuickLinks,
  getProfileXpRingPercentage,
} from "../src/app/lib/profile.ts";
import {
  createEmptyLearnerProgressState,
  getOverallProgress,
  recordQuizAttempt,
  setLessonCompleted,
} from "../src/app/lib/learner-progress.ts";
import { deriveLevelProgress } from "../src/app/lib/xp-domain.ts";
import {
  getBrowserGreetingPeriod,
  getDashboardGreeting,
  getMillisecondsUntilNextGreetingBoundary,
  getNeutralDashboardGreeting,
} from "../src/app/lib/dashboard-greeting.ts";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("profile initials are deterministic, Unicode-safe and limited to two visible code points", () => {
  assert.equal(getProfileInitials("Nico"), "N");
  assert.equal(getProfileInitials("Max Mustermann"), "MM");
  assert.equal(getProfileInitials("Johann Wolfgang von Goethe"), "JG");
  assert.equal(getProfileInitials("  Max   Mustermann  "), "MM");
  assert.equal(getProfileInitials("élise özdemir"), "ÉÖ");
  assert.equal(getProfileInitials("ß"), "S");
  assert.equal(getProfileInitials(""), "?");
  assert.equal(getProfileInitials("   "), "?");
  assert.equal(getProfileInitials(undefined), "?");
});

test("dashboard greetings use exact browser-local boundaries and remain deterministic per logical window", () => {
  const cases = [
    [new Date(2026, 0, 15, 4, 59, 59), "NIGHT"],
    [new Date(2026, 0, 15, 5, 0, 0), "MORNING"],
    [new Date(2026, 0, 15, 9, 59, 59), "MORNING"],
    [new Date(2026, 0, 15, 10, 0, 0), "DAY"],
    [new Date(2026, 0, 15, 17, 59, 59), "DAY"],
    [new Date(2026, 0, 15, 18, 0, 0), "EVENING"],
    [new Date(2026, 0, 15, 22, 59, 59), "EVENING"],
    [new Date(2026, 0, 15, 23, 0, 0), "NIGHT"],
  ] as const;
  for (const [date, expected] of cases) assert.equal(getBrowserGreetingPeriod(date), expected);

  const families = [
    [new Date(2026, 0, 15, 7), /^(Guten Morgen|Früh dran), Anna$/],
    [new Date(2026, 0, 15, 12), /^(Guten Tag|Schön, dass du da bist|Weiter geht's), Anna$/],
    [new Date(2026, 0, 15, 20), /^(Guten Abend|Feierabend-Fokus), Anna$|^Noch eine Runde, Anna\?$/],
    [new Date(2026, 0, 15, 23), /^(Späte Lernrunde), Anna$|^(Noch wach|Nachtschicht), Anna\?$/],
  ] as const;
  for (const [date, expected] of families) {
    const greeting = getDashboardGreeting(date, "Anna");
    assert.match(greeting.heading, expected);
    assert.ok(greeting.subtitle.length > 0);
  }

  const date = new Date(2026, 0, 15, 10, 30, 0);
  assert.deepEqual(getDashboardGreeting(date, "Anna"), getDashboardGreeting(new Date(date), "Anna"));
  assert.equal(
    getDashboardGreeting(new Date(2026, 8, 30, 23, 40), "Anna").variant,
    getDashboardGreeting(new Date(2026, 9, 1, 1, 10), "Anna").variant,
  );
  assert.deepEqual(getNeutralDashboardGreeting(" Anna "), {
    heading: "Willkommen zurück, Anna",
    emoji: "👋",
    subtitle: "Bereit für die nächste Lerneinheit?",
  });
});

test("dashboard exposes all three curated variants per period and schedules the next boundary", () => {
  const hours = [6, 12, 20, 23] as const;
  for (const hour of hours) {
    const variants = new Set(Array.from({ length: 40 }, (_, day) => (
      getDashboardGreeting(new Date(2026, 0, day + 1, hour, 30), "Anna").variant
    )));
    assert.deepEqual([...variants].sort(), [0, 1, 2]);
  }
  assert.equal(getMillisecondsUntilNextGreetingBoundary(new Date(2026, 0, 15, 9, 59, 59, 500)), 525);
  assert.equal(getMillisecondsUntilNextGreetingBoundary(new Date(2026, 0, 15, 23, 0, 0, 0)), 6 * 60 * 60 * 1000 + 25);
});

test("dashboard greeting is hydration-safe, updates at boundaries and refreshes after tab inactivity", async () => {
  const [page, component, rewardService, progressActions] = await Promise.all([
    source("src/app/page.tsx"),
    source("src/app/components/dashboard/dynamic-greeting.tsx"),
    source("src/app/lib/server/reward-service.ts"),
    source("src/app/actions/progress-actions.ts"),
  ]);
  assert.match(page, /<DynamicDashboardGreeting displayName=\{currentUser\?\.displayName\}/);
  assert.match(component, /useState\(\(\) => getNeutralDashboardGreeting\(displayName\)\)/);
  assert.match(component, /useEffect/);
  assert.match(component, /setTimeout\(update, getMillisecondsUntilNextGreetingBoundary\(now\)\)/);
  assert.match(component, /visibilitychange/);
  assert.match(component, /window\.addEventListener\("focus", update\)/);
  assert.match(component, /clearTimeout/);
  assert.match(component, /break-words/);
  assert.doesNotMatch(component, /aria-live|role="alert"|suppressHydrationWarning|Math\.random/);

  const lessonHistory = rewardService.slice(
    rewardService.indexOf("function deriveLessonCompletionHistory"),
    rewardService.indexOf("export async function selectProfileActiveTitle"),
  );
  assert.match(lessonHistory, /progress\.progression\.lessonCompletions/);
  assert.match(lessonHistory, /canonicalLessonIds\.has\(lessonId\)/);
  assert.match(lessonHistory, /event\.sourceType === "lesson"/);
  assert.match(lessonHistory, /learnerLessonEvents\.get\(toLessonXpSourceKey\(lessonId\)\) === completedAt/);
  assert.doesNotMatch(lessonHistory, /quizzes|labHistory|challenge|practice/i);
  assert.match(progressActions, /requireCapability\("recordLearningProgress"\)/);
});

test("private account projection maps role labels and exposes only intended account fields", () => {
  const createdAt = new Date("2026-09-15T12:00:00.000Z");
  const account = buildPrivateProfileAccount({
    displayName: "Anna Beispiel",
    login: "anna",
    role: "learner",
    createdAt,
  });
  assert.deepEqual(account, {
    displayName: "Anna Beispiel",
    login: "anna",
    role: "learner",
    roleLabel: "Lernender",
    status: "active",
    statusLabel: "Aktiv",
    createdAt,
    initials: "AB",
    context: "Dein privates Lernprofil und dein persönlicher Lernstand.",
  });
  assert.equal(buildPrivateProfileAccount({ displayName: "I", login: "i", role: "instructor", createdAt }).roleLabel, "Werkstattleiter");
  assert.equal(buildPrivateProfileAccount({ displayName: "B", login: "b", role: "observer", createdAt }).roleLabel, "Betrachter");
  assert.equal(buildPrivateProfileAccount({ displayName: "A", login: "a", role: "admin", createdAt }).roleLabel, "Administrator");
  for (const prohibited of ["id", "passwordHash", "authVersion", "disabledAt", "resetToken", "endpoint", "vapid"]) {
    assert.equal(Object.hasOwn(account, prohibited), false);
  }
});

test("new learner summary uses canonical XP and progression with a friendly zero state", () => {
  const xp = deriveLevelProgress(0);
  const summary = buildLearnerProfileSummary(createEmptyLearnerProgressState(), xp);
  assert.equal(summary.xp, xp);
  assert.deepEqual(summary.xp, deriveLevelProgress(0));
  assert.equal(summary.completedLessons, 0);
  assert.equal(summary.completedModules, 0);
  assert.equal(summary.overallPercentage, 0);
  assert.equal(summary.totalModules, learningModules.length);
  assert.ok(summary.totalLessons > 0);
});

test("learner profile mapping agrees with canonical module progression", () => {
  const learningModule = learningModules[0];
  assert.ok(learningModule?.lessons);
  const timestamp = "2026-09-15T12:00:00.000Z";
  let state = createEmptyLearnerProgressState();
  for (const lesson of learningModule.lessons.filter((candidate) => candidate.status === "available")) {
    state = setLessonCompleted(state, learningModule.slug, lesson.slug, true, true, timestamp);
  }
  state = recordQuizAttempt(state, learningModule.slug, 4, 5, timestamp);
  const xp = deriveLevelProgress(425);
  const summary = buildLearnerProfileSummary(state, xp);
  const canonicalOverall = getOverallProgress(
    state,
    learningModules,
    new Set(quizzes.map((quiz) => quiz.moduleSlug)),
  );
  assert.equal(summary.xp, xp);
  assert.equal(summary.completedLessons, learningModule.lessons.length);
  assert.equal(summary.completedModules, 1);
  assert.equal(summary.overallPercentage, canonicalOverall.percentage);
});

test("profile quick links follow role capabilities and keep notifications authoritative elsewhere", () => {
  const learnerLinks = getProfileQuickLinks("learner").map((link) => link.href);
  const instructorLinks = getProfileQuickLinks("instructor").map((link) => link.href);
  const observerLinks = getProfileQuickLinks("observer").map((link) => link.href);
  const adminLinks = getProfileQuickLinks("admin").map((link) => link.href);

  assert.deepEqual(learnerLinks, ["/fortschritt", "/lernen", "/labs", "/challenges", "/quiz", "/benachrichtigungen"]);
  assert.deepEqual(observerLinks, ["/lernen", "/labs", "/quiz", "/challenges", "/benachrichtigungen"]);
  assert.equal(observerLinks.some((href) => href.startsWith("/admin")), false);
  assert.equal(observerLinks.includes("/fortschritt"), false);
  assert.ok(instructorLinks.includes("/labs"));
  assert.ok(instructorLinks.includes("/admin"));
  assert.ok(instructorLinks.includes("/admin/lerninhalte"));
  assert.ok(instructorLinks.includes("/admin/challenges"));
  assert.equal(instructorLinks.includes("/admin/konten"), false);
  assert.ok(adminLinks.includes("/admin/konten"));
  assert.ok(instructorLinks.includes("/benachrichtigungen"));
  assert.ok(adminLinks.includes("/benachrichtigungen"));
});

test("profile route resolves only the authenticated active user and has no public lookup surface", async () => {
  const [page, service, currentUser, profileEntries] = await Promise.all([
    source("src/app/profil/page.tsx"),
    source("src/app/lib/server/profile-service.ts"),
    source("src/app/lib/server/current-user.ts"),
    readdir(new URL("../src/app/profil", import.meta.url), { withFileTypes: true }),
  ]);
  assert.match(page, /getCurrentProfileView\(\)/);
  assert.match(page, /AuthenticationRequiredError/);
  assert.match(page, /\/login\?callbackUrl=%2Fprofil/);
  assert.match(page, /PasswordChangeRequiredError/);
  assert.doesNotMatch(page, /searchParams|params\s*:/);
  assert.match(service, /export async function getCurrentProfileView\(\)/);
  assert.match(service, /requireAuthenticatedUser\(\)/);
  assert.match(service, /readLearnerProgress\(user\.id\)/);
  assert.doesNotMatch(service, /userId\s*:/);
  assert.match(currentUser, /!user \|\| user\.disabledAt/);
  assert.deepEqual(profileEntries.map((entry) => entry.name).sort(), ["page.tsx"]);
  assert.equal(profileEntries.some((entry) => entry.isDirectory()), false);
});

test("staff profiles skip learner XP and progress reads", async () => {
  const [page, service] = await Promise.all([
    source("src/app/profil/page.tsx"),
    source("src/app/lib/server/profile-service.ts"),
  ]);
  const roleGuard = service.indexOf('if (user.role !== "learner") {');
  const progressRead = service.indexOf("readLearnerProgress(user.id)");
  const rewardRead = service.indexOf("getLearnerRewardState(user.id)");
  assert.ok(roleGuard >= 0 && roleGuard < progressRead && roleGuard < rewardRead);
  assert.match(page, /profile\.learnerSummary \?/);
  assert.match(page, /Persönliche Lernlevel und XP werden für Mitarbeitendenkonten nicht geführt/);
  assert.doesNotMatch(page, /Level 1/);
});

test("profile visit is read-only and reuses the single notification settings UI", async () => {
  const sources = await Promise.all([
    source("src/app/profil/page.tsx"),
    source("src/app/lib/profile.ts"),
    source("src/app/lib/server/profile-service.ts"),
  ]);
  const combined = sources.join("\n");
  assert.doesNotMatch(combined, /\b(?:INSERT|UPDATE|DELETE)\b/);
  assert.doesNotMatch(combined, /awardCanonicalXp|setLessonProgressCompleted|recordQuizProgress|openLessonProgress/);
  assert.doesNotMatch(combined, /PushNotificationSettings|PushManager|subscribe\(/);
  assert.match(combined, /\/benachrichtigungen/);
  for (const prohibited of ["passwordHash", "passwordChangedAt", "resetToken", "subscriptionEndpoint", "vapidPrivateKey"]) {
    assert.equal(combined.includes(prohibited), false);
  }
});

test("authenticated identity area exposes profile in the desktop account area and mobile drawer", async () => {
  const [authStatus, shell, sidebar, mobileNavigation] = await Promise.all([
    source("src/app/components/auth/auth-status.tsx"),
    source("src/app/components/app-shell.tsx"),
    source("src/app/components/navigation/desktop-sidebar.tsx"),
    source("src/app/components/navigation/mobile-navigation.tsx"),
  ]);
  assert.match(authStatus, /mustChangePassword \? "\/konto\/passwort-aendern" : "\/profil"/);
  assert.match(authStatus, /Profil von .* öffnen/);
  assert.match(shell, /!showMobileDrawer && <AuthStatus learner=\{learner\} compact \/>/);
  assert.match(sidebar, /href="\/profil"/);
  assert.match(sidebar, /<ProfileAvatar/);
  assert.match(sidebar, /showIdentity=\{!shellProfile\}/);
  assert.match(mobileNavigation, /href="\/profil"/);
  assert.match(mobileNavigation, /shellProfile\?\.roleLabel \?\? ACCOUNT_ROLE_LABELS\[learner\.role\]/);
});

test("avatar route is own-account authenticated and never publicly cacheable on failure", async () => {
  const route = await source("src/app/api/profil/avatar/route.ts");
  assert.match(route, /requireAuthenticatedUser\(\)/);
  assert.match(route, /storage\.read|LocalFilesystemProfileImageStorage\(\)\.read/);
  assert.doesNotMatch(route, /params|searchParams|userId/);
  assert.match(route, /private, max-age=31536000, immutable/);
  assert.match(route, /status: 401[\s\S]*Cache-Control": "no-store"/);
  assert.match(route, /status: 404[\s\S]*Cache-Control": "no-store"/);
});

test("profile actions ignore only Next.js transport fields and reject extra business fields", async () => {
  const actions = await source("src/app/actions/profile-actions.ts");
  assert.match(actions, /businessFieldKeys\(formData\)/);
  assert.match(actions, /filter\(\(key\) => !key\.startsWith\("\$ACTION_"\)\)/);
  assert.match(actions, /keys\.length === allowedFields\.length/);
  assert.match(actions, /keys\.every\(\(key\) => allowed\.has\(key\)\)/);
});
test("staff cosmetic titles remain visually distinct from security roles and learner rewards", async () => {
  const [page, service, controls] = await Promise.all([
    source("src/app/profil/page.tsx"),
    source("src/app/lib/server/profile-service.ts"),
    source("src/app/components/profile/profile-customization.tsx"),
  ]);
  assert.match(page, /profile\.account\.roleLabel/);
  assert.match(page, /profile\.titleState\.activeTitle\.displayName/);
  assert.match(page, /profile\.titleState\?\.access === "staff"/);
  assert.match(page, /StaffTitleControls/);
  assert.match(service, /canSelectAnyProfileTitle\(user\.role\)/);
  assert.match(service, /readProfilePreferences\(user\.id\)/);
  assert.match(service, /roleLabel,/);
  assert.match(controls, /weder XP noch Level, Erfolge oder Abzeichen/);
  assert.match(controls, /Verfügbar durch Staff-Rolle/);
});

test("staff cosmetic badges reuse canonical profile preferences without fake achievement state", async () => {
  const [page, service, controls, actions, rewards] = await Promise.all([
    source("src/app/profil/page.tsx"),
    source("src/app/lib/server/profile-service.ts"),
    source("src/app/components/profile/profile-customization.tsx"),
    source("src/app/actions/profile-actions.ts"),
    source("src/app/lib/server/reward-service.ts"),
  ]);
  assert.match(page, /profile\.badgeState\?\.access === "staff"/);
  assert.match(page, /StaffBadgeControls/);
  assert.match(service, /deriveProfileBadgeState/);
  assert.match(service, /pinnedBadgeIds: preferences\.pinnedBadgeIds/);
  assert.match(controls, /vollständige Abzeichenkatalog/);
  assert.match(controls, /weder Lernfortschritt noch XP, Freischaltungen oder Freischaltdaten/);
  assert.match(controls, /Staff-Vorschau/);
  assert.match(controls, /getBadgeCollectionGroups/);
  const badgeControls = controls.slice(controls.indexOf("export function StaffBadgeControls"), controls.indexOf("export function RewardControls"));
  assert.doesNotMatch(badgeControls, /Kosmetisch verfügbar durch Staff-Rolle|Kanonische Lernbedingung/);
  assert.match(actions, /requireAuthenticatedUser\(\)[\s\S]*updateProfilePinnedBadges\(user, badgeIds/);
  assert.match(rewards, /canSelectProfileBadges\(user\.role, badgeIds, learnerState\)/);
  assert.match(rewards, /savePinnedBadgePreferences\(user\.id, badgeIds\)/);
  assert.doesNotMatch(rewards.slice(rewards.indexOf("export async function updateProfilePinnedBadges"), rewards.indexOf("async function readLearnerLabRewardHistory")), /awardCanonicalXp|INSERT INTO|xp_events/);
});

test("perfect-quiz badge evidence remains scoped to canonical module completion quizzes", async () => {
  const rewards = await source("src/app/lib/server/reward-service.ts");
  assert.match(rewards, /quizModuleIds\.has\(moduleId\) && quiz\.bestPercentage === 100/);
  assert.match(rewards, /const quizModuleIds = new Set\(quizzes\.map\(\(quiz\) => quiz\.moduleSlug\)\)/);
  assert.doesNotMatch(rewards.slice(rewards.indexOf("perfectQuizModuleIds:"), rewards.indexOf("completedNormalLabIds:")), /practice|ihk/i);
});

test("learner profile ring uses canonical in-level progress and clamps boundaries", () => {
  assert.equal(getProfileXpRingPercentage(deriveLevelProgress(0)), 0);
  assert.equal(getProfileXpRingPercentage(deriveLevelProgress(100)), 0);
  assert.equal(getProfileXpRingPercentage(deriveLevelProgress(1420)), 18);
  assert.equal(getProfileXpRingPercentage({ ...deriveLevelProgress(0), progressPercentage: -20 }), 0);
  assert.equal(getProfileXpRingPercentage({ ...deriveLevelProgress(0), progressPercentage: 140 }), 100);
});

test("learner profile showcase keeps title, pinned badges, filters and milestones accessible", async () => {
  const [page, avatar, controls, milestones, badgeCard] = await Promise.all([
    source("src/app/profil/page.tsx"),
    source("src/app/components/profile/profile-avatar.tsx"),
    source("src/app/components/profile/profile-customization.tsx"),
    source("src/app/components/profile/next-milestones.tsx"),
    source("src/app/components/profile/badge-card.tsx"),
  ]);
  assert.match(page, /size=\{profile\.learnerSummary \? "xlarge" : "large"\}/);
  assert.match(page, /getProfileXpRingPercentage\(profile\.learnerSummary\.xp\)/);
  assert.match(page, /flex min-w-0 flex-col gap-6 lg:flex-row/);
  assert.match(page, /Titel: \{profile\.titleState\.activeTitle\.displayName\}/);
  assert.match(page, /Angeheftete Abzeichen/);
  assert.match(page, /<BadgeCard badge=\{badge\} variant="compact"/);
  assert.match(badgeCard, /badge\.visual/);
  assert.match(avatar, /conic-gradient/);
  assert.match(avatar, /self-start/);
  assert.match(controls, /aria-label="Abzeichen filtern"/);
  assert.match(controls, /aria-pressed=\{selected\}/);
  assert.match(controls, /describeBadgeFamily/);
  assert.match(controls, /Nächste Stufe/);
  assert.match(badgeCard, /badge\.unlockCondition/);
  assert.match(badgeCard, /badge\.progress/);
  assert.match(badgeCard, /dark:/);
  assert.match(milestones, /<progress/);
  assert.match(milestones, /aria-label=.*milestone\.displayName/);
});
test("profile showcase and detailed learning progress have distinct responsibilities", async () => {
  const [profile, progress, navigation] = await Promise.all([
    source("src/app/profil/page.tsx"),
    source("src/app/fortschritt/page.tsx"),
    source("src/app/components/navigation/navigation-model.ts"),
  ]);

  assert.match(profile, /<ProfileMetric label="Level"/);
  assert.match(profile, /<ProfileMetric label="XP gesamt"/);
  assert.match(profile, /Angeheftete Abzeichen/);
  assert.match(profile, /<NextMilestones/);
  assert.match(profile, /<RewardControls/);
  assert.doesNotMatch(profile, /ProgressXpSection/);
  assert.doesNotMatch(profile, /Deine Lernübersicht|Kanonischer Lernstand/);
  assert.doesNotMatch(profile, /label="Gesamtfortschritt"/);

  const progressOverview = progress.indexOf("<ProgressOverview />");
  const xpSummary = progress.indexOf("<ProgressXpSection");
  assert.ok(progressOverview >= 0 && progressOverview < xpSummary);
  assert.match(progress, /<XpHistory/);
  assert.match(progress, /<PracticeQuizStatistics/);
  assert.match(progress, /ProgressStorageIndicator/);

  assert.match(navigation, /href: "\/fortschritt", label: "Fortschritt"/);
  assert.match(navigation, /href: "\/profil", label: "Profil"/);
});
