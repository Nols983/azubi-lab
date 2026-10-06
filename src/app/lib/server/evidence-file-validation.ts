import "server-only";

import { createHash } from "node:crypto";
import {
  EVIDENCE_FILENAME_MAX_LENGTH,
  EVIDENCE_MAX_AGGREGATE_BYTES,
  EVIDENCE_MAX_FILE_BYTES,
  EVIDENCE_MAX_FILES,
  type EvidenceMimeType,
} from "../challenge-evidence.ts";

const extensionsByMime: Record<EvidenceMimeType, readonly string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
};

export type ValidatedEvidenceFile = {
  originalFilename: string;
  mimeType: EvidenceMimeType;
  byteSize: number;
  sha256: string;
  bytes: Uint8Array;
};

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidenceValidationError";
  }
}

export async function validateEvidenceFiles(values: readonly FormDataEntryValue[]) {
  const files = values.filter((value): value is File => value instanceof File && !(value.name === "" && value.size === 0));
  if (files.length > EVIDENCE_MAX_FILES) {
    throw new EvidenceValidationError(`Du kannst höchstens ${EVIDENCE_MAX_FILES} Nachweise pro Version einreichen.`);
  }
  const aggregateSize = files.reduce((sum, file) => sum + file.size, 0);
  if (aggregateSize > EVIDENCE_MAX_AGGREGATE_BYTES) {
    throw new EvidenceValidationError("Alle Nachweise zusammen dürfen höchstens 25 MiB groß sein.");
  }

  const validated: ValidatedEvidenceFile[] = [];
  for (const file of files) {
    if (file.size < 1 || file.size > EVIDENCE_MAX_FILE_BYTES) {
      throw new EvidenceValidationError(`„${safeDisplayName(file.name)}“ muss zwischen 1 Byte und 10 MiB groß sein.`);
    }
    const originalFilename = normalizeEvidenceFilename(file.name);
    const mimeType = validateDeclaredTypeAndExtension(originalFilename, file.type);
    const bytes = new Uint8Array(await file.arrayBuffer());
    validateObservedContent(bytes, mimeType, originalFilename);
    validated.push({
      originalFilename,
      mimeType,
      byteSize: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes,
    });
  }
  return validated;
}

export function normalizeEvidenceFilename(value: string) {
  const filename = value.normalize("NFC").trim();
  if (!filename
    || filename.length > EVIDENCE_FILENAME_MAX_LENGTH
    || filename === "."
    || filename === ".."
    || /[\u0000-\u001f\u007f/\\\u2044\u2215\uff0f\uff3c\u202a-\u202e\u2066-\u2069]/u.test(filename)
    || /^[a-zA-Z]:/.test(filename)) {
    throw new EvidenceValidationError("Der Dateiname ist ungültig oder enthält nicht erlaubte Pfadangaben.");
  }
  return filename;
}

function validateDeclaredTypeAndExtension(filename: string, declaredMime: string) {
  if (!(declaredMime in extensionsByMime)) {
    throw new EvidenceValidationError(`Der Dateityp von „${safeDisplayName(filename)}“ ist nicht erlaubt.`);
  }
  const mimeType = declaredMime as EvidenceMimeType;
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (!extensionsByMime[mimeType].includes(extension)) {
    throw new EvidenceValidationError(`Dateiendung und Dateityp von „${safeDisplayName(filename)}“ passen nicht zusammen.`);
  }
  return mimeType;
}

function validateObservedContent(bytes: Uint8Array, mimeType: EvidenceMimeType, filename: string) {
  const valid = mimeType === "image/png"
    ? startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    : mimeType === "image/jpeg"
      ? startsWith(bytes, [0xff, 0xd8, 0xff])
      : mimeType === "application/pdf"
        ? startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])
        : isSafeUtf8Text(bytes);
  if (!valid) {
    throw new EvidenceValidationError(`Der tatsächliche Dateiinhalt von „${safeDisplayName(filename)}“ passt nicht zum erlaubten Dateityp.`);
  }
}

function isSafeUtf8Text(bytes: Uint8Array) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text);
  } catch {
    return false;
  }
}

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

function safeDisplayName(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/gu, "").slice(0, 80) || "Datei";
}
