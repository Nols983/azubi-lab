import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  LocalFilesystemProfileImageStorage,
  processProfileImage,
  PROFILE_IMAGE_MAX_UPLOAD_BYTES,
  ProfileImageStorageError,
  ProfileImageValidationError,
} from "../src/app/lib/server/profile-image.ts";

const userId = "4f8b00d6-e6b8-4ec3-bf95-09c642663661";
const otherUserId = "7e56617a-c370-4df5-a568-a647ce8c2ce3";

test("JPEG, PNG and WebP inputs are decoded, cropped and metadata-free", async () => {
  for (const format of ["jpeg", "png", "webp"] as const) {
    const source = sharp({ create: { width: 640, height: 480, channels: 3, background: "#336699" } });
    const encoded = await source[format]().withMetadata({ orientation: 6 }).toBuffer();
    const output = await processProfileImage(new File([encoded], `misleading.${format === "jpeg" ? "png" : "jpg"}`, { type: "application/octet-stream" }));
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 512);
    assert.equal(metadata.height, 512);
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.icc, undefined);
  }
});

test("profile image validation rejects spoofed, unsupported and unsafe inputs", async () => {
  await assert.rejects(
    () => processProfileImage(new File(["not an image"], "photo.png", { type: "image/png" })),
    ProfileImageValidationError,
  );
  await assert.rejects(
    () => processProfileImage(new File(["<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'/>"] , "avatar.svg", { type: "image/svg+xml" })),
    ProfileImageValidationError,
  );
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");
  await assert.rejects(() => processProfileImage(new File([gif], "avatar.gif", { type: "image/gif" })), ProfileImageValidationError);
  await assert.rejects(() => processProfileImage(new File([new Uint8Array(PROFILE_IMAGE_MAX_UPLOAD_BYTES + 1)], "large.png")), ProfileImageValidationError);
  const tooSmall = await sharp({ create: { width: 255, height: 256, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(() => processProfileImage(new File([tooSmall], "small.png")), ProfileImageValidationError);
  const tooWide = await sharp({ create: { width: 10_001, height: 256, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(() => processProfileImage(new File([tooWide], "wide.png")), ProfileImageValidationError);
  const corruptPng = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
  await assert.rejects(() => processProfileImage(new File([corruptPng], "corrupt.png")), ProfileImageValidationError);
});

test("private profile storage atomically replaces, versions and deletes trusted UUID paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "azubi-lab-profile-images-"));
  try {
    const storage = new LocalFilesystemProfileImageStorage(root);
    const first = new Uint8Array([1, 2, 3]);
    await storage.replace(userId, first);
    const firstInfo = await storage.info(userId);
    assert.ok(firstInfo?.src.startsWith("/api/profil/avatar?v="));
    assert.deepEqual(await storage.read(userId), first);
    assert.equal((await stat(root)).mode & 0o777, 0o700);
    assert.equal((await stat(join(root, `${userId}.webp`))).mode & 0o777, 0o600);

    await new Promise((resolve) => setTimeout(resolve, 5));
    const replacement = new Uint8Array([4, 5, 6, 7]);
    await storage.replace(userId, replacement);
    assert.deepEqual(await storage.read(userId), replacement);
    assert.notEqual((await storage.info(userId))?.version, firstInfo?.version);
    assert.deepEqual((await readFile(join(root, `${userId}.webp`))), Buffer.from(replacement));
    assert.deepEqual(await readdir(root), [`${userId}.webp`]);

    assert.equal(await storage.delete(userId), true);
    assert.equal(await storage.info(userId), undefined);
    assert.equal(await storage.delete(userId), false);
    await assert.rejects(() => storage.read("../escape"), ProfileImageStorageError);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("avatar removal rejects symlinks and leaves unrelated avatars untouched", async () => {
  const root = await mkdtemp(join(tmpdir(), "azubi-lab-profile-images-symlink-"));
  try {
    const storage = new LocalFilesystemProfileImageStorage(root);
    const unrelatedBytes = new Uint8Array([9, 8, 7]);
    await storage.replace(otherUserId, unrelatedBytes);
    await symlink(join(root, `${otherUserId}.webp`), join(root, `${userId}.webp`));
    assert.equal(await storage.info(userId), undefined);
    await assert.rejects(() => storage.read(userId), ProfileImageStorageError);
    await assert.rejects(() => storage.delete(userId), ProfileImageStorageError);
    assert.deepEqual(await storage.read(otherUserId), unrelatedBytes);
    assert.deepEqual((await readFile(join(root, `${otherUserId}.webp`))), Buffer.from(unrelatedBytes));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("missing or unavailable avatar storage degrades to fallback information", async () => {
  assert.throws(() => new LocalFilesystemProfileImageStorage("relative/path"), ProfileImageStorageError);
  const root = await mkdtemp(join(tmpdir(), "azubi-lab-profile-images-missing-"));
  try {
    assert.equal(await new LocalFilesystemProfileImageStorage(root).info(userId), undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
