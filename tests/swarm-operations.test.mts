import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("application-image Swarm jobs receive complete reset and Web Push configuration", async () => {
  const migration = await readProjectFile("scripts/ops/swarm-migrate.sh");
  const seed = await readProjectFile("scripts/ops/swarm-seed-admin.sh");
  const stack = await readProjectFile("deploy/swarm-stack.yml");

  for (const script of [migration, seed]) {
    assert.match(script, /AZUBI_LAB_PUBLIC_HOST:\?AZUBI_LAB_PUBLIC_HOST must be set/);
    assert.match(script, /--env "PASSWORD_RESET_ORIGIN=https:\/\/\$AZUBI_LAB_PUBLIC_HOST"/);
    assert.match(script, /WEB_PUSH_VAPID_PUBLIC_KEY:\?WEB_PUSH_VAPID_PUBLIC_KEY must be set/);
    assert.match(script, /WEB_PUSH_VAPID_SUBJECT:\?WEB_PUSH_VAPID_SUBJECT must be set/);
    assert.match(script, /AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET:\?AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET must be set/);
    assert.match(script, /WEB_PUSH_VAPID_PRIVATE_KEY_FILE=\/run\/secrets\/azubi-lab-web-push-vapid-private-key/);
    assert.match(script, /--env PROFILE_IMAGE_STORAGE_DIR=\/data\/profile-images/);
    assert.match(script, /source=\/srv\/azubi-lab\/data\/profile-images,destination=\/data\/profile-images/);
  }
  assert.match(stack, /PASSWORD_RESET_ORIGIN: https:\/\/\$\{AZUBI_LAB_PUBLIC_HOST\}/);
  assert.match(stack, /AUTH_RATE_LIMIT_TRUST_PROXY: "true"/);
  assert.match(stack, /WEB_PUSH_VAPID_PUBLIC_KEY: \$\{WEB_PUSH_VAPID_PUBLIC_KEY\}/);
  assert.match(stack, /WEB_PUSH_VAPID_PRIVATE_KEY_FILE: \/run\/secrets\/azubi-lab-web-push-vapid-private-key/);
  assert.match(stack, /WEB_PUSH_VAPID_SUBJECT: \$\{WEB_PUSH_VAPID_SUBJECT\}/);
  assert.match(stack, /PROFILE_IMAGE_STORAGE_DIR: \/data\/profile-images/);
  assert.match(stack, /source: \/srv\/azubi-lab\/data\/profile-images[\s\S]*target: \/data\/profile-images/);
  assert.doesNotMatch(`${migration}\n${seed}`, /azubi\.example\.com/);
});

test("migration and seed fail before Docker access when the public host is missing", async () => {
  const harness = await createDockerHarness();
  for (const script of ["scripts/ops/swarm-migrate.sh", "scripts/ops/swarm-seed-admin.sh"]) {
    await writeFile(harness.logFile, "", "utf8");
    const result = runOperation(script, harness, { AZUBI_LAB_PUBLIC_HOST: undefined });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /AZUBI_LAB_PUBLIC_HOST must be set/);
    assert.equal(await readFile(harness.logFile, "utf8"), "");
  }
});

test("application jobs fail before Docker access when Web Push runtime configuration is missing", async () => {
  const harness = await createDockerHarness();
  for (const script of ["scripts/ops/swarm-migrate.sh", "scripts/ops/swarm-seed-admin.sh"]) {
    for (const variable of [
      "WEB_PUSH_VAPID_PUBLIC_KEY",
      "WEB_PUSH_VAPID_SUBJECT",
      "AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET",
    ]) {
      await writeFile(harness.logFile, "", "utf8");
      const result = runOperation(script, harness, { [variable]: undefined });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, new RegExp(`${variable} must be set`));
      assert.equal(await readFile(harness.logFile, "utf8"), "");
    }
  }
});

test("representative application jobs render the reset origin without exposing secrets", async () => {
  const harness = await createDockerHarness();
  for (const script of ["scripts/ops/swarm-migrate.sh", "scripts/ops/swarm-seed-admin.sh"]) {
    await writeFile(harness.logFile, "", "utf8");
    const result = runOperation(script, harness);
    assert.equal(result.status, 0, result.stderr);
    const dockerCalls = await readFile(harness.logFile, "utf8");
    assert.match(dockerCalls, /service create .*--env PASSWORD_RESET_ORIGIN=https:\/\/public\.example\.test/);
    assert.match(dockerCalls, /--env WEB_PUSH_VAPID_PUBLIC_KEY=[A-Za-z0-9_-]{87}/);
    assert.match(dockerCalls, /--env WEB_PUSH_VAPID_PRIVATE_KEY_FILE=\/run\/secrets\/azubi-lab-web-push-vapid-private-key/);
    assert.match(dockerCalls, /--env WEB_PUSH_VAPID_SUBJECT=mailto:operator@example\.test/);
    assert.doesNotMatch(dockerCalls, /database-secret-content|auth-secret-content|admin-password-content/);
    assert.doesNotMatch(dockerCalls, /private-key-content/);
  }
});

test("notification, backup and restore operations do not need duplicate reset-origin wiring", async () => {
  const notifications = await readProjectFile("scripts/ops/swarm-notifications.sh");
  const backup = await readProjectFile("scripts/ops/swarm-backup.sh");
  const restore = await readProjectFile("scripts/ops/swarm-restore.sh");

  assert.match(notifications, /docker_bin exec|\$swarm_docker_bin exec/);
  assert.match(notifications, /container-entrypoint\.sh/);
  assert.doesNotMatch(notifications, /service create/);
  for (const script of [backup, restore]) {
    assert.match(script, /swarm_postgres_image/);
    assert.match(script, /--entrypoint \/bin\/sh/);
  }
});

test("production entrypoint loads the VAPID private key from a file without printing it", async () => {
  const harness = await createDockerHarness();
  const privateKeyFile = join(harness.directory, "vapid-private-key");
  const privateKey = Buffer.alloc(32, 1).toString("base64url");
  await writeFile(privateKeyFile, privateKey, { mode: 0o600 });
  const result = spawnSync("sh", [new URL("scripts/ops/container-entrypoint.sh", projectRoot).pathname, "sh", "-c", "exit 0"], {
    cwd: new URL(".", projectRoot),
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://app:password@postgres/database",
      AUTH_SECRET: "a".repeat(48),
      PASSWORD_RESET_ORIGIN: "https://public.example.test",
      WEB_PUSH_VAPID_PUBLIC_KEY: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"),
      WEB_PUSH_VAPID_PRIVATE_KEY_FILE: privateKeyFile,
      WEB_PUSH_VAPID_SUBJECT: "mailto:operator@example.test",
      EVIDENCE_STORAGE_DIR: harness.directory,
      PROFILE_IMAGE_STORAGE_DIR: harness.directory,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(privateKey));
});

test("production entrypoint accepts only an explicit boolean rate-limit proxy trust setting", async () => {
  const harness = await createDockerHarness();
  const privateKeyFile = join(harness.directory, "vapid-private-key");
  await writeFile(privateKeyFile, Buffer.alloc(32, 1).toString("base64url"), { mode: 0o600 });
  const result = spawnSync("sh", [new URL("scripts/ops/container-entrypoint.sh", projectRoot).pathname, "sh", "-c", "exit 0"], {
    cwd: new URL(".", projectRoot),
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://app:password@postgres/database",
      AUTH_SECRET: "a".repeat(48),
      AUTH_RATE_LIMIT_TRUST_PROXY: "yes",
      PASSWORD_RESET_ORIGIN: "https://public.example.test",
      WEB_PUSH_VAPID_PUBLIC_KEY: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"),
      WEB_PUSH_VAPID_PRIVATE_KEY_FILE: privateKeyFile,
      WEB_PUSH_VAPID_SUBJECT: "mailto:operator@example.test",
      EVIDENCE_STORAGE_DIR: harness.directory,
      PROFILE_IMAGE_STORAGE_DIR: harness.directory,
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /rate-limit proxy trust configuration is invalid/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /postgresql:\/\/app:password/);
});

async function readProjectFile(path: string) {
  return readFile(new URL(path, projectRoot), "utf8");
}

async function createDockerHarness() {
  const directory = await mkdtemp(join(tmpdir(), "azubi-lab-swarm-test-"));
  const dockerBin = join(directory, "docker");
  const logFile = join(directory, "docker.log");
  await writeFile(logFile, "", "utf8");
  await writeFile(
    dockerBin,
    `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$FAKE_DOCKER_LOG"
case "$1" in
  info)
    case "$*" in
      *LocalNodeState*) echo active ;;
      *ControlAvailable*) echo true ;;
      *NodeID*) echo local-node ;;
      *) echo swarm-manager ;;
    esac
    ;;
  service)
    case "$2" in
      inspect) echo 0 ;;
      ps)
        case "$*" in
          *azubi-lab_postgres*) echo postgres-task ;;
          *) echo job-task ;;
        esac
        ;;
      create) echo test-job ;;
      logs|rm) : ;;
    esac
    ;;
  inspect)
    case "$*" in
      *NodeID*) echo local-node ;;
      *ContainerStatus.ContainerID*) echo postgres-container ;;
      *Status.State*) echo complete ;;
      *Status.Err*) echo ;;
      *State.Health*) echo healthy ;;
    esac
    ;;
  secret|image) : ;;
esac
`,
    "utf8",
  );
  await chmod(dockerBin, 0o700);
  return { directory, dockerBin, logFile };
}

function runOperation(
  script: string,
  harness: { dockerBin: string; logFile: string },
  overrides: Record<string, string | undefined> = {},
) {
  const environment: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    NODE_ENV: "test",
    DOCKER_BIN: harness.dockerBin,
    FAKE_DOCKER_LOG: harness.logFile,
    SWARM_JOB_TIMEOUT_SECONDS: "2",
    AZUBI_LAB_IMAGE: "azubi-lab:test-sha",
    AZUBI_LAB_PUBLIC_HOST: "public.example.test",
    AZUBI_LAB_DATABASE_URL_SECRET: "database-secret-name",
    AZUBI_LAB_AUTH_SECRET: "auth-secret-name",
    WEB_PUSH_VAPID_PUBLIC_KEY: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"),
    WEB_PUSH_VAPID_SUBJECT: "mailto:operator@example.test",
    AZUBI_LAB_WEB_PUSH_VAPID_PRIVATE_KEY_SECRET: "vapid-private-secret-name",
    AZUBI_LAB_ADMIN_PASSWORD_SECRET: "admin-password-secret-name",
    ADMIN_LOGIN: "initial-admin",
    ADMIN_DISPLAY_NAME: "Initial Admin",
    ...overrides,
  };
  for (const [name, value] of Object.entries(overrides)) {
    if (value === undefined) delete environment[name];
  }
  return spawnSync("sh", [new URL(script, projectRoot).pathname], {
    cwd: new URL(".", projectRoot),
    encoding: "utf8",
    env: environment,
  });
}
