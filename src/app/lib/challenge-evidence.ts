export const EVIDENCE_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_MAX_FILES = 5;
export const EVIDENCE_MAX_AGGREGATE_BYTES = 25 * 1024 * 1024;
export const EVIDENCE_FILENAME_MAX_LENGTH = 180;

export const EVIDENCE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "text/plain",
  "text/csv",
] as const;

export type EvidenceMimeType = (typeof EVIDENCE_MIME_TYPES)[number];

export const EVIDENCE_ACCEPT_ATTRIBUTE = ".png,.jpg,.jpeg,.pdf,.txt,.csv,image/png,image/jpeg,application/pdf,text/plain,text/csv";

export function formatEvidenceBytes(byteSize: number) {
  if (byteSize >= 1024 * 1024) return `${(byteSize / (1024 * 1024)).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MiB`;
  if (byteSize >= 1024) return `${(byteSize / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 })} KiB`;
  return `${byteSize.toLocaleString("de-DE")} Byte`;
}
