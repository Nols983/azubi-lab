import "server-only";

import { isUuid } from "../account-security.ts";
import type { IhkExamOverview } from "../ihk-exam.ts";
import {
  generateIhkExamSeed,
  prepareIhkExamQuestions,
  projectIhkExamAttempt,
} from "./ihk-exam-domain.ts";
import {
  completeOwnedIhkExam,
  findOwnedIhkExamRecord,
  IhkExamNotFoundError,
  readIhkExamOverviewRecord,
  saveOwnedIhkExamAnswer,
  startOrResumeIhkExamRecord,
} from "./ihk-exam-repository.ts";
import { selectIhkExamQuestions } from "./ihk-exam-selection.ts";
import { requireCapability } from "./current-user.ts";

export class IhkExamRequestError extends Error {
  constructor() {
    super("The IHK exam request is invalid.");
    this.name = "IhkExamRequestError";
  }
}

export async function getIhkExamOverview(): Promise<IhkExamOverview> {
  const user = await requireCapability("recordQuizAttempts");
  return readIhkExamOverviewRecord(user.id);
}

export async function startIhkExam() {
  const user = await requireCapability("recordQuizAttempts");
  const seed = generateIhkExamSeed();
  const selectedQuestions = selectIhkExamQuestions(seed);
  const result = await startOrResumeIhkExamRecord({
    userId: user.id,
    seed,
    questions: prepareIhkExamQuestions(selectedQuestions, seed),
  });
  return projectIhkExamAttempt(result.record, result.serverNow);
}

export async function getIhkExamAttempt(attemptId: unknown) {
  const user = await requireCapability("recordQuizAttempts");
  if (!isUuid(attemptId)) throw new IhkExamRequestError();
  const result = await findOwnedIhkExamRecord(attemptId, user.id);
  if (!result) throw new IhkExamNotFoundError();
  return projectIhkExamAttempt(result.record, result.serverNow);
}

export async function saveIhkExamAnswer(input: unknown) {
  const user = await requireCapability("recordQuizAttempts");
  if (!isRecord(input) || !hasOnlyKeys(input, ["attemptId", "answer"])
    || !isUuid(input.attemptId)) throw new IhkExamRequestError();
  const result = await saveOwnedIhkExamAnswer({
    userId: user.id,
    attemptId: input.attemptId,
    answer: input.answer,
  });
  return projectIhkExamAttempt(result.record, result.serverNow);
}

export async function completeIhkExamAttempt(attemptId: unknown) {
  const user = await requireCapability("recordQuizAttempts");
  if (!isUuid(attemptId)) throw new IhkExamRequestError();
  const result = await completeOwnedIhkExam({ attemptId, userId: user.id });
  return projectIhkExamAttempt(result.record, result.serverNow);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => allowed.has(key));
}
