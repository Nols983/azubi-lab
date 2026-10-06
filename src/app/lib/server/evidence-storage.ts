import "server-only";

import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, open, readFile, unlink } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { ValidatedEvidenceFile } from "./evidence-file-validation.ts";

const storageKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type StoredEvidenceFile = Omit<ValidatedEvidenceFile, "bytes"> & { storageKey: string };

export interface EvidenceStorage {
  save(storageKey: string, bytes: Uint8Array): Promise<void>;
  read(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
}

export class EvidenceStorageConfigurationError extends Error {
  constructor() {
    super("Evidence storage is unavailable.");
    this.name = "EvidenceStorageConfigurationError";
  }
}

export class EvidenceStorageOperationError extends Error {
  constructor(operation: "save" | "read") {
    super(`Evidence storage ${operation} failed.`);
    this.name = "EvidenceStorageOperationError";
  }
}

export class LocalFilesystemEvidenceStorage implements EvidenceStorage {
  private readonly root: string;

  constructor(configuredRoot = process.env.EVIDENCE_STORAGE_DIR) {
    if (!configuredRoot?.trim() || !isAbsolute(configuredRoot.trim())) throw new EvidenceStorageConfigurationError();
    this.root = resolve(configuredRoot.trim());
  }

  async save(storageKey: string, bytes: Uint8Array) {
    const path = this.pathFor(storageKey);
    let created = false;
    try {
      await mkdir(this.root, { recursive: true, mode: 0o700 });
      const handle = await open(path, "wx", 0o600);
      created = true;
      try {
        await handle.writeFile(bytes);
      } finally {
        await handle.close();
      }
    } catch {
      if (created) await unlink(path).catch(() => undefined);
      throw new EvidenceStorageOperationError("save");
    }
  }

  async read(storageKey: string) {
    try {
      return new Uint8Array(await readFile(this.pathFor(storageKey)));
    } catch {
      throw new EvidenceStorageOperationError("read");
    }
  }

  async delete(storageKey: string) {
    await unlink(this.pathFor(storageKey)).catch((error: unknown) => {
      if (!isMissingFileError(error)) throw error;
    });
  }

  async exists(storageKey: string) {
    try {
      await access(this.pathFor(storageKey));
      return true;
    } catch {
      return false;
    }
  }

  private pathFor(storageKey: string) {
    if (!storageKeyPattern.test(storageKey)) throw new EvidenceStorageOperationError("read");
    const path = join(this.root, storageKey);
    if (dirname(resolve(path)) !== this.root) throw new EvidenceStorageOperationError("read");
    return path;
  }
}

export async function storeEvidenceFiles(files: readonly ValidatedEvidenceFile[]) {
  if (files.length === 0) return [];
  const storage = new LocalFilesystemEvidenceStorage();
  const stored: StoredEvidenceFile[] = [];
  try {
    for (const file of files) {
      const storageKey = randomUUID();
      await storage.save(storageKey, file.bytes);
      stored.push({
        storageKey,
        originalFilename: file.originalFilename,
        mimeType: file.mimeType,
        byteSize: file.byteSize,
        sha256: file.sha256,
      });
    }
    return stored;
  } catch (error) {
    await cleanupStoredEvidence(stored);
    throw error;
  }
}

export async function cleanupStoredEvidence(files: readonly { storageKey: string }[]) {
  if (files.length === 0 || !process.env.EVIDENCE_STORAGE_DIR) return;
  const storage = new LocalFilesystemEvidenceStorage();
  await Promise.allSettled(files.map((file) => storage.delete(file.storageKey)));
}

export async function checkEvidenceStorageReadiness() {
  const configuredRoot = process.env.EVIDENCE_STORAGE_DIR;
  if (!configuredRoot?.trim() || !isAbsolute(configuredRoot.trim())) return false;
  try {
    await access(resolve(configuredRoot.trim()), constants.R_OK | constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function isMissingFileError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT";
}
