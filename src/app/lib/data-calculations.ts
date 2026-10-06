export const decimalDataUnitFactors = {
  B: 1,
  kB: 1_000,
  MB: 1_000_000,
  GB: 1_000_000_000,
  TB: 1_000_000_000_000,
} as const;

export const binaryDataUnitFactors = {
  B: 1,
  KiB: 1_024,
  MiB: 1_048_576,
  GiB: 1_073_741_824,
  TiB: 1_099_511_627_776,
} as const;

export type DecimalDataUnit = keyof typeof decimalDataUnitFactors;
export type BinaryDataUnit = keyof typeof binaryDataUnitFactors;

export function bitsToBytes(bits: number) {
  assertNonNegativeFinite(bits, "bits");
  return bits / 8;
}

export function bytesToBits(bytes: number) {
  assertNonNegativeFinite(bytes, "bytes");
  return bytes * 8;
}

export function convertDecimalDataAmount(value: number, from: DecimalDataUnit, to: DecimalDataUnit) {
  assertNonNegativeFinite(value, "value");
  return value * decimalDataUnitFactors[from] / decimalDataUnitFactors[to];
}

export function convertBinaryDataAmount(value: number, from: BinaryDataUnit, to: BinaryDataUnit) {
  assertNonNegativeFinite(value, "value");
  return value * binaryDataUnitFactors[from] / binaryDataUnitFactors[to];
}

export function megabitsPerSecondToMegabytesPerSecond(megabitsPerSecond: number) {
  return bitsToBytes(megabitsPerSecond);
}

export function megabytesPerSecondToMegabitsPerSecond(megabytesPerSecond: number) {
  return bytesToBits(megabytesPerSecond);
}

export function calculateTransferDurationSeconds(dataAmountBytes: number, dataRateBytesPerSecond: number) {
  assertNonNegativeFinite(dataAmountBytes, "dataAmountBytes");
  assertPositiveFinite(dataRateBytesPerSecond, "dataRateBytesPerSecond");
  return dataAmountBytes / dataRateBytesPerSecond;
}

export function calculateRequiredDataRateBytesPerSecond(dataAmountBytes: number, durationSeconds: number) {
  assertNonNegativeFinite(dataAmountBytes, "dataAmountBytes");
  assertPositiveFinite(durationSeconds, "durationSeconds");
  return dataAmountBytes / durationSeconds;
}

export function roundTo(value: number, decimalPlaces: number) {
  if (!Number.isFinite(value)) throw new RangeError("value must be finite.");
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 12) {
    throw new RangeError("decimalPlaces must be an integer from 0 to 12.");
  }
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function binaryToDecimal(binary: string) {
  if (!/^[01]+$/.test(binary)) throw new TypeError("binary must contain only 0 and 1.");
  const value = Number.parseInt(binary, 2);
  if (!Number.isSafeInteger(value)) throw new RangeError("binary value exceeds the safe integer range.");
  return value;
}

export function decimalToBinary(decimal: number) {
  assertNonNegativeSafeInteger(decimal, "decimal");
  return decimal.toString(2);
}

export function hexadecimalToDecimal(hexadecimal: string) {
  const normalized = normalizeHexadecimal(hexadecimal);
  const value = Number.parseInt(normalized, 16);
  if (!Number.isSafeInteger(value)) throw new RangeError("hexadecimal value exceeds the safe integer range.");
  return value;
}

export function decimalToHexadecimal(decimal: number) {
  assertNonNegativeSafeInteger(decimal, "decimal");
  return decimal.toString(16).toUpperCase();
}

export function binaryToHexadecimal(binary: string) {
  return decimalToHexadecimal(binaryToDecimal(binary));
}

export function hexadecimalToBinary(hexadecimal: string) {
  const normalized = normalizeHexadecimal(hexadecimal);
  return [...normalized]
    .map((digit) => Number.parseInt(digit, 16).toString(2).padStart(4, "0"))
    .join("");
}

export function calculateUncompressedImageSizeBytes(widthPixels: number, heightPixels: number, colorDepthBits: number) {
  assertPositiveSafeInteger(widthPixels, "widthPixels");
  assertPositiveSafeInteger(heightPixels, "heightPixels");
  assertPositiveSafeInteger(colorDepthBits, "colorDepthBits");
  return bitsToBytes(widthPixels * heightPixels * colorDepthBits);
}

export function calculateUncompressedAudioSizeBytes(
  sampleRateHertz: number,
  bitDepth: number,
  channels: number,
  durationSeconds: number,
) {
  assertPositiveSafeInteger(sampleRateHertz, "sampleRateHertz");
  assertPositiveSafeInteger(bitDepth, "bitDepth");
  assertPositiveSafeInteger(channels, "channels");
  assertPositiveFinite(durationSeconds, "durationSeconds");
  return bitsToBytes(sampleRateHertz * bitDepth * channels * durationSeconds);
}

export function calculateCompressedSizeBytes(uncompressedBytes: number, compressionRatio: number) {
  assertNonNegativeFinite(uncompressedBytes, "uncompressedBytes");
  assertPositiveFinite(compressionRatio, "compressionRatio");
  return uncompressedBytes / compressionRatio;
}

function normalizeHexadecimal(value: string) {
  const normalized = value.replace(/^0x/i, "");
  if (!/^[0-9a-f]+$/i.test(normalized)) throw new TypeError("hexadecimal must contain only hexadecimal digits.");
  return normalized.toUpperCase();
}

function assertNonNegativeFinite(value: number, name: string): asserts value is number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a non-negative finite number.`);
}

function assertPositiveFinite(value: number, name: string): asserts value is number {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be a positive finite number.`);
}

function assertNonNegativeSafeInteger(value: number, name: string): asserts value is number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative safe integer.`);
}

function assertPositiveSafeInteger(value: number, name: string): asserts value is number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive safe integer.`);
}
