import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("RootLayout keeps pool-safe independent reads parallel", async () => {
  const [layout, db, notificationRepository, profileService, xpRepository] = await Promise.all([
    source("src/app/layout.tsx"),
    source("src/app/lib/server/db.ts"),
    source("src/app/lib/server/notification-repository.ts"),
    source("src/app/lib/server/profile-service.ts"),
    source("src/app/lib/server/xp-repository.ts"),
  ]);

  assert.match(layout, /Promise\.all\(\[\s*getLearnerBootstrap\(\),\s*getNotificationIndicatorView\(\),\s*getCurrentShellProfileView\(\),\s*\]\)/);
  assert.match(db, /globalThis\.azubiLabPostgresPool = new Pool/);
  assert.match(notificationRepository, /getDatabasePool\(\)\.query/);
  assert.match(profileService, /getCurrentShellProfileView/);
  assert.match(xpRepository, /readTotalXpForUser[\s\S]*getDatabasePool\(\)\.query/);
});

test("checked-out transaction clients never receive concurrent queries", async () => {
  const serverDirectory = new URL("../src/app/lib/server/", import.meta.url);
  const serverFiles = (await readdir(serverDirectory)).filter((name) => name.endsWith(".ts"));
  for (const file of serverFiles) {
    const body = await readFile(new URL(file, serverDirectory), "utf8");
    for (const match of body.matchAll(/Promise\.all\(\[([\s\S]*?)\]\)/g)) {
      assert.doesNotMatch(match[1], /\bclient\.query\s*</, `${file} queues parallel queries on one checked-out client`);
      assert.doesNotMatch(match[1], /\bclient\.query\s*\(/, `${file} queues parallel queries on one checked-out client`);
    }
  }
});

test("progress snapshot and curriculum transactions serialize their client queries", async () => {
  const [progressRepository, curriculumRepository, db] = await Promise.all([
    source("src/app/lib/server/progress-repository.ts"),
    source("src/app/lib/server/curriculum-assignment-repository.ts"),
    source("src/app/lib/server/db.ts"),
  ]);
  const progressRead = progressRepository.slice(
    progressRepository.indexOf("async function readLearnerProgressWithClient"),
    progressRepository.indexOf("function mapProgressState"),
  );
  const assignmentWrite = curriculumRepository.slice(
    curriculumRepository.indexOf("export function assignCurriculumModules"),
    curriculumRepository.indexOf("export async function updateCurriculumAssignment"),
  );

  assert.equal((progressRead.match(/await client\.query/g) ?? []).length, 3);
  assert.doesNotMatch(progressRead, /Promise\.all/);
  assert.equal((assignmentWrite.match(/await client\.query/g) ?? []).length, 4);
  assert.doesNotMatch(assignmentWrite, /Promise\.all/);
  assert.match(db, /const client = await getDatabasePool\(\)\.connect\(\)/);
  assert.match(db, /await client\.query\("BEGIN"\)[\s\S]*await work\(client\)[\s\S]*await client\.query\("COMMIT"\)/);
});
