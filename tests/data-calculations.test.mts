import assert from "node:assert/strict";
import test from "node:test";
import { dataCalculationExerciseDefinitions } from "../src/app/data/learning-exercises/data-calculations.ts";
import { getLearningModule } from "../src/app/data/learning-modules.ts";
import { dataCalculationQuestions } from "../src/app/data/quiz-bank/questions/data-calculations.ts";
import {
  binaryToDecimal,
  binaryToHexadecimal,
  bitsToBytes,
  bytesToBits,
  calculateCompressedSizeBytes,
  calculateRequiredDataRateBytesPerSecond,
  calculateTransferDurationSeconds,
  calculateUncompressedAudioSizeBytes,
  calculateUncompressedImageSizeBytes,
  convertBinaryDataAmount,
  convertDecimalDataAmount,
  decimalToBinary,
  decimalToHexadecimal,
  hexadecimalToBinary,
  hexadecimalToDecimal,
  megabitsPerSecondToMegabytesPerSecond,
  megabytesPerSecondToMegabitsPerSecond,
  roundTo,
} from "../src/app/lib/data-calculations.ts";

const moduleSlug = "datenmengen-zahlensysteme-uebertragungsrechnungen";
const lessonSlugs = [
  "bit-byte-und-einheiten",
  "si-iec-und-speicherkapazitaet",
  "datenmenge-datenrate-und-uebertragungszeit",
  "binaer-dezimal-und-hexadezimal",
  "bild-audio-und-kompression",
  "ascii-unicode-utf-8-und-praxisfall",
] as const;

test("data units convert with explicit SI, IEC, bit, and Byte factors", () => {
  assert.equal(bitsToBytes(8), 1);
  assert.equal(bytesToBits(1), 8);
  assert.equal(megabitsPerSecondToMegabytesPerSecond(100), 12.5);
  assert.equal(megabytesPerSecondToMegabitsPerSecond(125), 1_000);
  assert.equal(convertDecimalDataAmount(2_500, "MB", "GB"), 2.5);
  assert.equal(convertDecimalDataAmount(1, "TB", "B"), 1_000_000_000_000);
  assert.equal(convertBinaryDataAmount(2_048, "MiB", "GiB"), 2);
  assert.equal(convertBinaryDataAmount(1, "GiB", "B"), 1_073_741_824);
  assert.equal(roundTo(convertBinaryDataAmount(1_000_000_000_000, "B", "GiB"), 2), 931.32);
});

test("transfer calculations use compatible units and deterministic rounding", () => {
  assert.equal(calculateTransferDurationSeconds(20_000_000_000, 100_000_000), 200);
  assert.equal(calculateRequiredDataRateBytesPerSecond(20_000_000_000, 150), 133_333_333.33333333);
  assert.equal(roundTo(calculateRequiredDataRateBytesPerSecond(20_000_000_000, 150) / 1_000_000, 2), 133.33);
  assert.equal(roundTo(1.005, 2), 1.01);
});

test("number-system conversions cover powers-of-two boundaries", () => {
  assert.equal(binaryToDecimal("00101111"), 47);
  assert.equal(decimalToBinary(47), "101111");
  assert.equal(binaryToHexadecimal("00101111"), "2F");
  assert.equal(hexadecimalToBinary("2F"), "00101111");
  assert.equal(hexadecimalToDecimal("0x2f"), 47);
  assert.equal(decimalToHexadecimal(255), "FF");
  assert.equal(decimalToBinary(255), "11111111");
  assert.equal(decimalToBinary(256), "100000000");
});

test("media sizing and supplied compression ratios are exact", () => {
  assert.equal(calculateUncompressedImageSizeBytes(1_920, 1_080, 24), 6_220_800);
  assert.equal(calculateUncompressedAudioSizeBytes(48_000, 24, 2, 10), 2_880_000);
  assert.equal(calculateUncompressedAudioSizeBytes(48_000, 24, 1, 10), 1_440_000);
  assert.equal(calculateUncompressedAudioSizeBytes(48_000, 24, 2, 20), 5_760_000);
  assert.equal(calculateCompressedSizeBytes(6_220_800, 4), 1_555_200);
});

test("calculation helpers reject ambiguous or invalid inputs", () => {
  assert.throws(() => bitsToBytes(-1), RangeError);
  assert.throws(() => calculateTransferDurationSeconds(1, 0), RangeError);
  assert.throws(() => calculateRequiredDataRateBytesPerSecond(1, Number.POSITIVE_INFINITY), RangeError);
  assert.throws(() => roundTo(1, -1), RangeError);
  assert.throws(() => binaryToDecimal("102"), TypeError);
  assert.throws(() => decimalToBinary(1.5), RangeError);
  assert.throws(() => hexadecimalToDecimal("FG"), TypeError);
  assert.throws(() => calculateUncompressedImageSizeBytes(0, 1_080, 24), RangeError);
  assert.throws(() => calculateUncompressedAudioSizeBytes(48_000, 24, 0, 10), RangeError);
  assert.throws(() => calculateCompressedSizeBytes(100, 0), RangeError);
});

test("Batch 30 quiz is Practice-eligible, unique, balanced, and covers every lesson", () => {
  assert.equal(dataCalculationQuestions.length, 12);
  assert.equal(new Set(dataCalculationQuestions.map((question) => question.id)).size, 12);
  assert.equal(new Set(dataCalculationQuestions.map((question) => question.prompt)).size, 12);
  assert.deepEqual(new Set(dataCalculationQuestions.map((question) => question.lessonSlug)), new Set(lessonSlugs));
  assert.ok(dataCalculationQuestions.every((question) => question.moduleSlug === moduleSlug));
  assert.ok(dataCalculationQuestions.every((question) => question.practiceEligible && question.completionEligible && question.shuffleOptions));
  assert.ok(dataCalculationQuestions.some((question) => question.type === "single-choice"));
  assert.ok(dataCalculationQuestions.some((question) => question.type === "multiple-selection"));
});

test("Batch 30 exercises are unique and no definition is orphaned", () => {
  const learningModule = getLearningModule(moduleSlug);
  assert.ok(learningModule);
  const exercises = Object.values(dataCalculationExerciseDefinitions);
  assert.equal(exercises.length, 9);
  assert.equal(new Set(exercises.map((exercise) => exercise.id)).size, exercises.length);
  assert.ok(exercises.every((exercise) => exercise.moduleSlug === moduleSlug));
  assert.ok(exercises.every((exercise) => learningModule.lessons?.some((lesson) => lesson.slug === exercise.lessonSlug)));
  assert.deepEqual(new Set(exercises.map((exercise) => exercise.lessonSlug)), new Set(lessonSlugs));
});
