import "server-only";

import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, rename, unlink } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import sharp, { type Metadata, type Sharp } from "sharp";
import { isUuid } from "../account-security.ts";

export const PROFILE_IMAGE_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_MIN_DIMENSION = 256;
export const PROFILE_IMAGE_STORED_DIMENSION = 512;
export const PROFILE_IMAGE_MAX_DIMENSION = 10_000;
export const PROFILE_IMAGE_MAX_PIXELS = 40_000_000;
export const PROFILE_IMAGE_ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

export type ProfileImageInfo = {
  src: string;
  version: string;
};

export type StoredProfileImageInfo = {
  version: string;
};

export class ProfileImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileImageValidationError";
  }
}

export class ProfileImageStorageError extends Error {
  constructor() {
    super("Profile image storage is unavailable.");
    this.name = "ProfileImageStorageError";
  }
}

export class LocalFilesystemProfileImageStorage {
  private readonly root: string;

  constructor(configuredRoot = process.env.PROFILE_IMAGE_STORAGE_DIR) {
    if (!configuredRoot?.trim() || !isAbsolute(configuredRoot.trim())) throw new ProfileImageStorageError();
    this.root = resolve(configuredRoot.trim());
  }

  async replace(userId: string, bytes: Uint8Array) {
    const target = this.pathFor(userId);
    const temporary = join(this.root, `.${userId}.${randomUUID()}.tmp`);
    let handle;
    try {
      await mkdir(this.root, { recursive: true, mode: 0o700 });
      handle = await open(temporary, "wx", 0o600);
      await handle.writeFile(bytes);
      await handle.sync();
      await handle.close();
      handle = undefined;
      await rename(temporary, target);
    } catch {
      await handle?.close().catch(() => undefined);
      await unlink(temporary).catch(() => undefined);
      throw new ProfileImageStorageError();
    }
  }

  async read(userId: string) {
    let handle;
    try {
      handle = await open(this.pathFor(userId), constants.O_RDONLY | constants.O_NOFOLLOW);
      const metadata = await handle.stat();
      if (!metadata.isFile()) throw new ProfileImageStorageError();
      return new Uint8Array(await handle.readFile());
    } catch {
      throw new ProfileImageStorageError();
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }

  async delete(userId: string) {
    const target = this.pathFor(userId);
    try {
      const metadata = await lstat(target);
      if (!metadata.isFile() || metadata.isSymbolicLink()) throw new ProfileImageStorageError();
      await unlink(target);
      return true;
    } catch (error) {
      if (isMissingFileError(error)) return false;
      if (error instanceof ProfileImageStorageError) throw error;
      throw new ProfileImageStorageError();
    }
  }

  async metadata(userId: string): Promise<StoredProfileImageInfo | undefined> {
    try {
      const metadata = await lstat(this.pathFor(userId), { bigint: true });
      if (!metadata.isFile() || metadata.isSymbolicLink()) return undefined;
      const version = `${metadata.mtimeNs}-${metadata.size}`;
      return { version };
    } catch {
      return undefined;
    }
  }

  async info(userId: string): Promise<ProfileImageInfo | undefined> {
    const info = await this.metadata(userId);
    return info ? { ...info, src: `/api/profil/avatar?v=${encodeURIComponent(info.version)}` } : undefined;
  }

  private pathFor(userId: string) {
    if (!isUuid(userId)) throw new ProfileImageStorageError();
    const path = resolve(join(this.root, `${userId}.webp`));
    if (dirname(path) !== this.root) throw new ProfileImageStorageError();
    return path;
  }
}

export async function processProfileImage(file: File) {
  if (file.size < 1) throw new ProfileImageValidationError("Wähle eine Bilddatei aus.");
  if (file.size > PROFILE_IMAGE_MAX_UPLOAD_BYTES) {
    throw new ProfileImageValidationError("Das Profilbild darf höchstens 5 MiB groß sein.");
  }
  let image: Sharp;
  let metadata: Metadata;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    image = sharp(bytes, {
      failOn: "error",
      limitInputPixels: PROFILE_IMAGE_MAX_PIXELS,
      sequentialRead: true,
    });
    metadata = await image.metadata();
  } catch {
    throw new ProfileImageValidationError("Die Datei ist kein unterstütztes oder lesbares Bild.");
  }
  if (metadata.format !== "jpeg" && metadata.format !== "png" && metadata.format !== "webp") {
    throw new ProfileImageValidationError("Erlaubt sind ausschließlich JPEG-, PNG- und WebP-Bilder.");
  }
  if ((metadata.pages ?? 1) !== 1) {
    throw new ProfileImageValidationError("Animierte Profilbilder werden nicht unterstützt.");
  }
  const width = metadata.width;
  const height = metadata.height;
  if (!width || !height) throw new ProfileImageValidationError("Die Bildabmessungen konnten nicht gelesen werden.");
  if (width < PROFILE_IMAGE_MIN_DIMENSION || height < PROFILE_IMAGE_MIN_DIMENSION) {
    throw new ProfileImageValidationError("Das Profilbild muss mindestens 256 × 256 Pixel groß sein.");
  }
  if (width > PROFILE_IMAGE_MAX_DIMENSION || height > PROFILE_IMAGE_MAX_DIMENSION
    || width * height > PROFILE_IMAGE_MAX_PIXELS) {
    throw new ProfileImageValidationError("Die Bildabmessungen sind zu groß.");
  }
  try {
    return new Uint8Array(await image
      .rotate()
      .resize(PROFILE_IMAGE_STORED_DIMENSION, PROFILE_IMAGE_STORED_DIMENSION, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 82 })
      .toBuffer());
  } catch {
    throw new ProfileImageValidationError("Das Profilbild konnte nicht sicher verarbeitet werden.");
  }
}

export async function getOwnProfileImageInfo(userId: string) {
  try {
    return await new LocalFilesystemProfileImageStorage().info(userId);
  } catch {
    return undefined;
  }
}

function isMissingFileError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    && (error as { code?: unknown }).code === "ENOENT";
}
