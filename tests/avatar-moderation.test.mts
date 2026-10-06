import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canModerateUserAvatars,
  canRemoveOtherUserAvatar,
  canViewUserAvatars,
} from "../src/app/lib/authorization.ts";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("cross-account avatar capabilities are admin-only and exclude self-moderation", () => {
  for (const role of ["learner", "observer", "instructor"] as const) {
    assert.equal(canViewUserAvatars(role), false);
    assert.equal(canModerateUserAvatars(role), false);
    assert.equal(canRemoveOtherUserAvatar({ id: `${role}-a`, role }, { id: "target-b" }), false);
  }
  assert.equal(canViewUserAvatars("admin"), true);
  assert.equal(canModerateUserAvatars("admin"), true);
  assert.equal(canRemoveOtherUserAvatar({ id: "admin-a", role: "admin" }, { id: "target-b" }), true);
  assert.equal(canRemoveOtherUserAvatar({ id: "admin-a", role: "admin" }, { id: "admin-a" }), false);
});

test("admin account view uses private versioned avatars with initials fallback and filtering", async () => {
  const [page, service, component, repository] = await Promise.all([
    source("src/app/admin/konten/page.tsx"),
    source("src/app/lib/server/admin-avatar-service.ts"),
    source("src/app/components/admin/admin-avatar-moderation.tsx"),
    source("src/app/lib/server/admin-repository.ts"),
  ]);
  assert.match(page, /listAdminAccountAvatarViews/);
  assert.match(page, /Mit Profilbild/);
  assert.match(page, /accounts\.filter\(\(account\) => Boolean\(account\.avatar\.src\)\)/);
  assert.match(page, /AdminAvatarModeration/);
  assert.match(service, /listAccountSummaries\(\)/);
  assert.match(repository, /FROM users\s+ORDER BY display_name/);
  assert.match(service, /withoutAvatar/);
  assert.match(service, /getProfileInitials/);
  assert.match(service, /\/api\/admin\/konten\/\$\{encodeURIComponent\(userId\)\}\/avatar\?v=/);
  assert.match(component, /size="xlarge"/);
  assert.match(component, /Profilbild ansehen/);
  assert.match(component, /Profilbild von \$\{displayName\} wirklich entfernen\?/);
  assert.match(component, /state\.avatarRemoved \? undefined : avatarSrc/);
  assert.doesNotMatch(component, /type="file"|profileImage/);
});

test("admin avatar read path is capability-guarded, UUID-resolved and non-public", async () => {
  const [route, service, ownRoute, learnerDetail] = await Promise.all([
    source("src/app/api/admin/konten/[userId]/avatar/route.ts"),
    source("src/app/lib/server/admin-avatar-service.ts"),
    source("src/app/api/profil/avatar/route.ts"),
    source("src/app/admin/lernende/[userId]/page.tsx"),
  ]);
  const guard = service.indexOf('requireCapability("viewUserAvatars")');
  const resolution = service.indexOf("resolveTarget(targetUserId)");
  assert.ok(guard >= 0 && guard < resolution);
  assert.match(service, /if \(!isUuid\(targetUserId\)\) throw new AdminAvatarTargetError/);
  assert.match(service, /findDatabaseUserById\(targetUserId\)/);
  assert.match(route, /status: 403[\s\S]*Cache-Control": "no-store"/);
  assert.match(route, /status: 404[\s\S]*Cache-Control": "no-store"/);
  assert.match(route, /private, max-age=31536000, immutable/);
  assert.doesNotMatch(service, /originalFilename|filename|pathFor|searchParams/);
  assert.doesNotMatch(ownRoute, /params|searchParams|userId/);
  assert.doesNotMatch(learnerDetail, /ProfileAvatar|avatar/);
});

test("avatar removal resolves a locked database target, deletes only UUID storage and audits actual removal", async () => {
  const [action, service, storage, migration] = await Promise.all([
    source("src/app/actions/admin-actions.ts"),
    source("src/app/lib/server/admin-avatar-service.ts"),
    source("src/app/lib/server/profile-image.ts"),
    source("db/migrations/0020_avatar_moderation_audit.sql"),
  ]);
  assert.match(action, /removeAccountAvatarAsAdmin\(userId\)/);
  assert.match(service, /requireCapability\("moderateUserAvatars"\)/);
  assert.match(service, /canRemoveOtherUserAvatar/);
  assert.match(service, /WHERE id = \$1\s+FOR UPDATE/);
  assert.match(storage, /isUuid\(userId\)/);
  assert.match(storage, /lstat\(target\)/);
  assert.match(storage, /!metadata\.isFile\(\) \|\| metadata\.isSymbolicLink\(\)/);
  assert.match(storage, /if \(isMissingFileError\(error\)\) return false/);
  assert.match(service, /if \(removed\) \{[\s\S]*INSERT INTO avatar_moderation_events/);
  assert.match(action, /avatarRemoved: true/);

  assert.match(migration, /moderator_user_id uuid NOT NULL/);
  assert.match(migration, /target_user_id uuid NOT NULL/);
  assert.match(migration, /action_type = 'profile_avatar_removed'/);
  assert.match(migration, /created_at timestamptz NOT NULL DEFAULT clock_timestamp\(\)/);
  assert.match(migration, /BEFORE UPDATE OR DELETE/);
  assert.doesNotMatch(migration, /image|bytea|metadata|session|secret/i);
});
