import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { AccountRole, CurrentUser } from "../src/app/lib/auth-types.ts";
import {
  getNavigationDefinitions,
  isNavigationPathActive,
} from "../src/app/components/navigation/navigation-model.ts";

function currentUser(role: AccountRole, mustChangePassword = false): CurrentUser {
  return {
    id: `${role}-id`,
    login: role,
    displayName: `${role} Beispiel`,
    role,
    mustChangePassword,
  };
}

function paths(role: AccountRole) {
  return getNavigationDefinitions("mobile", currentUser(role)).map((item) => item.href);
}

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("learner drawer exposes every primary destination and the learner plan", () => {
  const learnerPaths = paths("learner");
  assert.deepEqual(new Set(learnerPaths), new Set([
    "/",
    "/lernen",
    "/labs",
    "/quiz",
    "/challenges",
    "/teams",
    "/fortschritt",
    "/lernplan",
    "/benachrichtigungen",
    "/profil",
  ]));
  assert.equal(learnerPaths.includes("/admin"), false);
  assert.equal(getNavigationDefinitions("mobile", currentUser("learner")).find((item) => item.href === "/labs")?.section, "primary");
});

test("instructor and admin drawer entries follow the existing progress-view capability", () => {
  for (const role of ["instructor", "admin"] as const) {
    const rolePaths = paths(role);
    assert.equal(rolePaths.includes("/admin"), true);
    assert.equal(rolePaths.includes("/lernplan"), false);
    assert.equal(rolePaths.includes("/labs"), true);
    assert.equal(rolePaths.includes("/benachrichtigungen"), true);
    assert.equal(rolePaths.includes("/profil"), true);
  }
});

test("observer drawer contains only safe preview and own-account destinations", () => {
  const observerPaths = paths("observer");
  assert.deepEqual(new Set(observerPaths), new Set([
    "/",
    "/lernen",
    "/labs",
    "/quiz",
    "/challenges",
    "/teams",
    "/benachrichtigungen",
    "/profil",
  ]));
  assert.equal(observerPaths.includes("/fortschritt"), false);
  assert.equal(observerPaths.includes("/lernplan"), false);
  assert.equal(observerPaths.includes("/admin"), false);
});

test("protected mobile navigation fails closed for public and password-change audiences", () => {
  assert.deepEqual(getNavigationDefinitions("mobile"), []);
  assert.deepEqual(getNavigationDefinitions("mobile", currentUser("learner", true)), []);
  assert.deepEqual(getNavigationDefinitions("mobile", currentUser("admin", true)), []);
});

test("shared active-route matching covers nested Labs, Lernen and Challenges routes", () => {
  assert.equal(isNavigationPathActive("/labs", "/labs"), true);
  assert.equal(isNavigationPathActive("/labs/dns-client-001", "/labs"), true);
  assert.equal(isNavigationPathActive("/lernen/ipv4-grundlagen/aufbau", "/lernen"), true);
  assert.equal(isNavigationPathActive("/challenges/example", "/challenges"), true);
  assert.equal(isNavigationPathActive("/labor", "/labs"), false);
  assert.equal(isNavigationPathActive("/lernen", "/"), false);
});

test("mobile shell renders a modal drawer trigger instead of the old bottom bar", async () => {
  const [shell, mobile] = await Promise.all([
    source("src/app/components/app-shell.tsx"),
    source("src/app/components/navigation/mobile-navigation.tsx"),
  ]);
  assert.match(shell, /learner && !learner\.mustChangePassword/);
  assert.match(shell, /<MobileNavigation learner=\{learner\}/);
  assert.doesNotMatch(shell, /pb-28/);
  assert.doesNotMatch(mobile, /fixed inset-x-0 bottom-0|grid-cols-5/);
  assert.match(mobile, /aria-label="Navigation öffnen"/);
  assert.match(mobile, /aria-expanded=\{isOpen\}/);
  assert.match(mobile, /<dialog/);
  assert.match(mobile, /aria-modal="true"/);
  assert.match(mobile, /aria-label="Navigation schließen"/);
  assert.match(mobile, /onCancel=/);
  assert.match(mobile, /dialog\.showModal\(\)/);
  assert.match(mobile, /document\.body\.style\.overflow = "hidden"/);
  assert.match(mobile, /requestAnimationFrame\(\(\) => triggerRef\.current\?\.focus\(\)\)/);
  assert.match(mobile, /onClick=\{onNavigate\}/);
  assert.match(mobile, /MobileDrawerXpSummary/);
  assert.match(mobile, /shellProfile\?\.roleLabel \?\? ACCOUNT_ROLE_LABELS\[learner\.role\]/);
  assert.match(mobile, /Titel: \{shellProfile\.activeTitle\}/);
  assert.doesNotMatch(mobile, /pinnedBadges|Abzeichen-Sammlung/);
});

test("desktop sidebar and secure logout keep their established integration points", async () => {
  const [sidebar, mobile, authStatus] = await Promise.all([
    source("src/app/components/navigation/desktop-sidebar.tsx"),
    source("src/app/components/navigation/mobile-navigation.tsx"),
    source("src/app/components/auth/auth-status.tsx"),
  ]);
  assert.match(sidebar, /hidden w-64[\s\S]*md:flex md:flex-col/);
  assert.match(sidebar, /getNavigationItems\("desktop", learner\)/);
  assert.match(mobile, /<AuthStatus learner=\{learner\} showIdentity=\{false\} \/>/);
  assert.match(authStatus, /<form action=\{logoutAction\}>/);
  assert.doesNotMatch(authStatus, /href="\/logout"/);
});
