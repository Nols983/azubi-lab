import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const firstImage = "4f8b00d6-e6b8-4ec3-bf95-09c642663661.webp";
const secondImage = "0880182b-f5f9-4cad-a2ca-3cc8cd9c42b2.webp";

test("profile images are backed up for empty, one-file and multi-file storage", async () => {
  const harness = await createHarness();
  try {
    const empty = runBackup(harness, "2026-09-23T100000Z");
    assert.equal(empty.status, 0, empty.stderr);
    await assertBackupSet(harness, "2026-09-23T100000Z", []);

    await writeFile(join(harness.profile, firstImage), "first-avatar", { mode: 0o600 });
    const one = runBackup(harness, "2026-09-23T100100Z");
    assert.equal(one.status, 0, one.stderr);
    await assertBackupSet(harness, "2026-09-23T100100Z", [firstImage]);

    await writeFile(join(harness.profile, secondImage), "second-avatar", { mode: 0o600 });
    const multiple = runBackup(harness, "2026-09-23T100200Z");
    assert.equal(multiple.status, 0, multiple.stderr);
    await assertBackupSet(harness, "2026-09-23T100200Z", [firstImage, secondImage]);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});

test("backup fails before creating a set when profile storage is missing or unsafe", async () => {
  const harness = await createHarness();
  try {
    await rm(harness.profile, { recursive: true });
    const missing = runBackup(harness, "2026-09-23T110000Z");
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /Profile image source is not readable/);
    assert.deepEqual(await readdir(harness.backups), []);

    await mkdir(harness.profile, { mode: 0o700 });
    await mkdir(join(harness.profile, "nested"));
    const unsafe = runBackup(harness, "2026-09-23T110100Z");
    assert.notEqual(unsafe.status, 0);
    assert.match(unsafe.stderr, /non-regular entry/);
    assert.deepEqual(await readdir(harness.backups), []);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});

test("guarded restore verifies and restores the dedicated profile archive", async () => {
  const harness = await createHarness();
  try {
    await writeFile(join(harness.profile, firstImage), "restored-avatar", { mode: 0o600 });
    const backup = runBackup(harness, "2026-09-23T120000Z");
    assert.equal(backup.status, 0, backup.stderr);
    const restoreEvidence = join(harness.root, "restore-evidence");
    const restoreProfile = join(harness.root, "restore-profile");
    await mkdir(restoreEvidence, { mode: 0o700 });
    await mkdir(restoreProfile, { mode: 0o700 });
    const backupSet = join(harness.backups, "azubi-lab-backup-2026-09-23T120000Z");
    const restored = runScript("scripts/ops/restore-all.sh", [backupSet], harness, {
      AZUBI_LAB_RESTORE_CONFIRM: "RESTORE_TO_EMPTY_TARGET",
      EVIDENCE_STORAGE_DIR: restoreEvidence,
      PROFILE_IMAGE_STORAGE_DIR: restoreProfile,
    });
    assert.equal(restored.status, 0, restored.stderr);
    assert.equal(await readFile(join(restoreProfile, firstImage), "utf8"), "restored-avatar");
    assert.equal((await stat(restoreProfile)).mode & 0o777, 0o700);
    assert.equal((await stat(join(restoreProfile, firstImage))).mode & 0o777, 0o600);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});

test("guarded restore rejects a profile archive with traversal paths before extraction", async () => {
  const harness = await createHarness();
  try {
    await writeFile(join(harness.profile, firstImage), "unsafe-avatar", { mode: 0o600 });
    const backup = runBackup(harness, "2026-09-23T130000Z");
    assert.equal(backup.status, 0, backup.stderr);
    const set = join(harness.backups, "azubi-lab-backup-2026-09-23T130000Z");
    const archive = join(set, "azubi-lab-profile-images-2026-09-23T130000Z.tar.gz");
    const malicious = spawnSync("tar", [
      `--directory=${harness.profile}`,
      "--create",
      "--gzip",
      `--file=${archive}`,
      "--transform=s|^./|../|",
      ".",
    ], { encoding: "utf8" });
    assert.equal(malicious.status, 0, malicious.stderr);
    const hash = createHash("sha256").update(await readFile(archive)).digest("hex");
    const manifestPath = join(set, "manifest.txt");
    const manifest = await readFile(manifestPath, "utf8");
    await writeFile(manifestPath, manifest.replace(/^profile_images_sha256=.*$/m, `profile_images_sha256=${hash}`), { mode: 0o600 });
    const restoreEvidence = join(harness.root, "unsafe-restore-evidence");
    const restoreProfile = join(harness.root, "unsafe-restore-profile");
    await mkdir(restoreEvidence, { mode: 0o700 });
    await mkdir(restoreProfile, { mode: 0o700 });
    const restored = runScript("scripts/ops/restore-all.sh", [set], harness, {
      AZUBI_LAB_RESTORE_CONFIRM: "RESTORE_TO_EMPTY_TARGET",
      EVIDENCE_STORAGE_DIR: restoreEvidence,
      PROFILE_IMAGE_STORAGE_DIR: restoreProfile,
    });
    assert.notEqual(restored.status, 0);
    assert.deepEqual(await readdir(restoreProfile), []);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});

async function createHarness() {
  const root = await mkdtemp(join(tmpdir(), "azubi-lab-profile-backup-"));
  const bin = join(root, "bin");
  const evidence = join(root, "evidence");
  const profile = join(root, "profile-images");
  const backups = join(root, "backups");
  await Promise.all([
    mkdir(bin, { mode: 0o700 }),
    mkdir(evidence, { mode: 0o700 }),
    mkdir(profile, { mode: 0o700 }),
    mkdir(backups, { mode: 0o700 }),
  ]);
  await executable(join(bin, "pg_dump"), `#!/bin/sh
set -eu
for value in "$@"; do
  case "$value" in --file=*) target=\${value#--file=} ;; esac
done
printf 'fake-postgresql-dump' > "$target"
`);
  await executable(join(bin, "pg_restore"), "#!/bin/sh\nexit 0\n");
  await executable(join(bin, "psql"), `#!/bin/sh
case "$*" in
  *"count(*) FROM pg_tables"*) printf '0\\n' ;;
  *"challenge_submission_attachments"*) : ;;
  *) printf '0021_teams_and_memberships.sql\\n' ;;
esac
`);
  return { root, bin, evidence, profile, backups };
}

async function executable(path: string, content: string) {
  await writeFile(path, content, "utf8");
  await chmod(path, 0o700);
}

function runBackup(harness: Awaited<ReturnType<typeof createHarness>>, timestamp: string) {
  return runScript("scripts/ops/backup-all.sh", [], harness, {
    AZUBI_LAB_BACKUP_CONFIRMED: "APP_WRITES_STOPPED",
    BACKUP_TIMESTAMP: timestamp,
  });
}

function runScript(
  path: string,
  args: readonly string[],
  harness: Awaited<ReturnType<typeof createHarness>>,
  overrides: Record<string, string>,
) {
  return spawnSync("sh", [new URL(path, projectRoot).pathname, ...args], {
    cwd: new URL(".", projectRoot),
    encoding: "utf8",
    env: {
      NODE_ENV: "test",
      PATH: `${harness.bin}:${process.env.PATH}`,
      PGHOST: "postgres",
      PGDATABASE: "azubi_lab",
      PGUSER: "azubi_lab",
      PGPASSWORD: "test-only-password",
      EVIDENCE_STORAGE_DIR: harness.evidence,
      PROFILE_IMAGE_STORAGE_DIR: harness.profile,
      BACKUP_DIR: harness.backups,
      AZUBI_LAB_IMAGE: "azubi-lab:test-sha",
      ...overrides,
    },
  });
}

async function assertBackupSet(
  harness: Awaited<ReturnType<typeof createHarness>>,
  timestamp: string,
  expectedImages: readonly string[],
) {
  const set = join(harness.backups, `azubi-lab-backup-${timestamp}`);
  const manifest = await readFile(join(set, "manifest.txt"), "utf8");
  const archiveName = `azubi-lab-profile-images-${timestamp}.tar.gz`;
  const archive = join(set, archiveName);
  assert.match(manifest, new RegExp(`profile_images_archive=${archiveName.replaceAll(".", "\\.")}`));
  const expectedHash = createHash("sha256").update(await readFile(archive)).digest("hex");
  assert.match(manifest, new RegExp(`profile_images_sha256=${expectedHash}`));
  const listing = spawnSync("tar", ["--list", "--gzip", `--file=${archive}`], { encoding: "utf8" });
  assert.equal(listing.status, 0, listing.stderr);
  const files = listing.stdout.split("\n").filter((entry) => entry.startsWith("./") && entry !== "./").map((entry) => entry.slice(2)).sort();
  assert.deepEqual(files, [...expectedImages].sort());
  assert.equal((await stat(archive)).mode & 0o777, 0o600);
}
