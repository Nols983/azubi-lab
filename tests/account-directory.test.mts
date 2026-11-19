import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { parseAccountDirectoryFilters, accountDirectoryHref, accountStatusLabel } from "../src/app/lib/account-directory.ts";
import { ACCOUNT_DELETION_WARNING, accountDeletionIdentityReasons, isAccountDeletionConfirmation } from "../src/app/lib/account-deletion.ts";

const team = "00000000-0000-4000-8000-000000000001";
test("directory parses bounded URL filters, duplicates and malformed pagination", () => {
  const filters = parseAccountDirectoryFilters({ q: ["  Müller  ", "ignored"], team, role: "instructor", status: "disabled", sort: "newest", page: "3", pageSize: "10", profilbild: "vorhanden" });
  assert.deepEqual(filters, { query: "Müller", team, role: "instructor", status: "disabled", sort: "newest", page: 3, pageSize: 10, withAvatar: true });
  for (const page of ["-1", "0", "1.2", "1e9", "999999999999999", "abc"]) assert.equal(parseAccountDirectoryFilters({ page }).page, 1);
  assert.equal(parseAccountDirectoryFilters({ pageSize: "100000" }).pageSize, 25);
  assert.equal(parseAccountDirectoryFilters({ team: "forged" }).team, "invalid");
  assert.equal(parseAccountDirectoryFilters({ q: "x".repeat(200) }).query.length, 120);
  assert.equal(parseAccountDirectoryFilters({ role: "owner", status: "unknown", sort: "drop" }).role, "all");
  const next = new URL(accountDirectoryHref(filters, { page: 4 }), "http://localhost:3000");
  assert.equal(next.searchParams.get("q"), "Müller");
  assert.equal(next.searchParams.get("team"), team);
  assert.equal(next.searchParams.get("page"), "4");
  assert.equal(next.searchParams.get("profilbild"), "vorhanden");
  assert.equal(new URL(accountDirectoryHref(filters, { team: "none", page: 1 }), next).searchParams.has("page"), false);
});

test("account status is unambiguous and destructive confirmation must match exactly", () => {
  assert.equal(accountStatusLabel({ disabledAt: new Date(), mustChangePassword: true }), "Gesperrt");
  assert.equal(accountStatusLabel({ disabledAt: null, mustChangePassword: true }), "Passwortwechsel erforderlich");
  assert.equal(accountStatusLabel({ disabledAt: null, mustChangePassword: false }), "Aktiv");
  assert.equal(isAccountDeletionConfirmation("yes", "azubi-a", "azubi-a"), true);
  for (const [confirmed, login] of [[null, "azubi-a"], ["no", "azubi-a"], ["yes", "AZUBI-A"], ["yes", "azubi-a "], ["yes", null]]) assert.equal(isAccountDeletionConfirmation(confirmed, login, "azubi-a"), false);
});

test("self and last active admin protection are independent", () => {
  assert.deepEqual(accountDeletionIdentityReasons({ actorId: "a", targetId: "a", targetRole: "admin", targetDisabled: false, activeAdminCount: 1 }), ["self", "last-admin"]);
  assert.deepEqual(accountDeletionIdentityReasons({ actorId: "a", targetId: "b", targetRole: "admin", targetDisabled: false, activeAdminCount: 1 }), ["last-admin"]);
  assert.deepEqual(accountDeletionIdentityReasons({ actorId: "a", targetId: "b", targetRole: "admin", targetDisabled: true, activeAdminCount: 1 }), []);
});

test("list remains compact, details hold privileged actions and deletion never changes historical FKs", async () => {
  const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const [page, detail, repository, cleanup, migration] = await Promise.all([source("src/app/admin/konten/page.tsx"), source("src/app/admin/konten/[userId]/page.tsx"), source("src/app/lib/server/account-deletion-repository.ts"), source("src/app/lib/server/account-file-cleanup.ts"), source("db/migrations/0023_account_file_cleanup_jobs.sql")]);
  assert.match(page, /Kontenverzeichnis/);
  assert.match(page, /Teamfilter/);
  assert.doesNotMatch(page, /<AccountManagementActions|<MembershipControls|<AdminAvatarModeration/);
  assert.match(detail, /AccountManagementActions/);
  assert.match(detail, /AccountDeleteForm/);
  assert.equal(ACCOUNT_DELETION_WARNING, "Dieses Konto und seine persönlichen Daten einschließlich Lernfortschritten, Quizversuchen und Abgaben werden dauerhaft gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.");
  assert.match(repository, /pg_constraint/);
  assert.match(repository, /FOR UPDATE/);
  assert.match(cleanup, /NOT EXISTS \(SELECT 1 FROM users/);
  assert.doesNotMatch(migration, /ALTER TABLE|ON DELETE CASCADE|REFERENCES users/);
});
