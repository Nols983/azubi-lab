import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  EvidenceValidationError,
  normalizeEvidenceFilename,
  validateEvidenceFiles,
} from "../src/app/lib/server/evidence-file-validation.ts";
import {
  EvidenceStorageConfigurationError,
  EvidenceStorageOperationError,
  LocalFilesystemEvidenceStorage,
} from "../src/app/lib/server/evidence-storage.ts";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00]);
const pdf = new TextEncoder().encode("%PDF-1.7\nsynthetic test");

test("evidence validation accepts allowlisted signatures and computes SHA-256", async () => {
  const files = [
    new File([png], "bild.png", { type: "image/png" }),
    new File([jpeg], "foto.jpeg", { type: "image/jpeg" }),
    new File([pdf], "analyse.pdf", { type: "application/pdf" }),
    new File(["UTF-8 Text äöü"], "notiz.txt", { type: "text/plain" }),
    new File(["name,value\nDNS,ok\n"], "werte.csv", { type: "text/csv" }),
  ];
  const validated = await validateEvidenceFiles(files);
  assert.deepEqual(validated.map((file) => file.mimeType), ["image/png", "image/jpeg", "application/pdf", "text/plain", "text/csv"]);
  assert.equal(validated.every((file) => /^[0-9a-f]{64}$/.test(file.sha256)), true);
  assert.equal(validated[0].byteSize, png.byteLength);
});

test("evidence validation rejects forbidden types, mismatches, and unsafe paths", async () => {
  await assert.rejects(
    validateEvidenceFiles([new File(["<svg/>"] , "grafik.svg", { type: "image/svg+xml" })]),
    EvidenceValidationError,
  );
  await assert.rejects(
    validateEvidenceFiles([new File([png], "bild.jpg", { type: "image/png" })]),
    EvidenceValidationError,
  );
  await assert.rejects(
    validateEvidenceFiles([new File(["not a png"], "bild.png", { type: "image/png" })]),
    EvidenceValidationError,
  );
  await assert.rejects(
    validateEvidenceFiles([new File([new Uint8Array([0xff, 0xfe])], "notiz.txt", { type: "text/plain" })]),
    EvidenceValidationError,
  );
  for (const name of ["../beweis.txt", "/beweis.txt", "C:\\beweis.txt", "unter/verzeichnis.txt", "beweis\u202etxt.exe"]) {
    assert.throws(() => normalizeEvidenceFilename(name), EvidenceValidationError);
  }
});

test("evidence validation enforces file, count, and aggregate limits", async () => {
  await assert.rejects(
    validateEvidenceFiles([new File([new Uint8Array(10 * 1024 * 1024 + 1)], "gross.pdf", { type: "application/pdf" })]),
    EvidenceValidationError,
  );
  await assert.rejects(
    validateEvidenceFiles(Array.from({ length: 6 }, (_, index) => new File([`Datei ${index}`], `${index}.txt`, { type: "text/plain" }))),
    EvidenceValidationError,
  );
  await assert.rejects(
    validateEvidenceFiles(Array.from({ length: 3 }, (_, index) => new File([new Uint8Array(9 * 1024 * 1024)], `${index}.txt`, { type: "text/plain" }))),
    EvidenceValidationError,
  );
});

test("local evidence storage requires an absolute private root and fails safely", async () => {
  assert.throws(() => new LocalFilesystemEvidenceStorage(""), EvidenceStorageConfigurationError);
  assert.throws(() => new LocalFilesystemEvidenceStorage("relative/evidence"), EvidenceStorageConfigurationError);

  const temporaryRoot = await mkdtemp(join(tmpdir(), "azubi-lab-evidence-storage-"));
  const nestedRoot = join(temporaryRoot, "missing", "evidence");
  const storage = new LocalFilesystemEvidenceStorage(nestedRoot);
  const storageKey = randomUUID();
  try {
    await storage.save(storageKey, new TextEncoder().encode("private evidence"));
    assert.equal(await storage.exists(storageKey), true);
    assert.equal(new TextDecoder().decode(await storage.read(storageKey)), "private evidence");
    await assert.rejects(() => storage.save(storageKey, new Uint8Array([1])), EvidenceStorageOperationError);
    await assert.rejects(() => storage.read("../unsafe"), EvidenceStorageOperationError);
    await storage.delete(storageKey);
    assert.equal(await storage.exists(storageKey), false);

    const nonDirectoryRoot = join(temporaryRoot, "not-a-directory");
    await writeFile(nonDirectoryRoot, "block mkdir");
    await assert.rejects(
      () => new LocalFilesystemEvidenceStorage(nonDirectoryRoot).save(randomUUID(), new Uint8Array([1])),
      EvidenceStorageOperationError,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
