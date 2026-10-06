import "server-only";

import { isUuid } from "../account-security.ts";
import type { AssessmentGroupId } from "../../data/quiz-bank/categories.ts";
import {
  practiceQuestionCount,
  selectPracticeQuestions,
} from "../../data/quiz-bank/practice-selection.ts";
import {
  createPracticeRandomSource,
  generatePracticeAttemptSeed,
  preparePracticeAttemptQuestions,
  projectPracticeAttempt,
} from "./practice-quiz-attempt-domain.ts";
import {
  completeOwnedPracticeAttempt,
  createPracticeAttemptRecord,
  findOwnedPracticeAttempt,
  PracticeAttemptNotFoundError,
} from "./practice-quiz-attempt-repository.ts";
import {
  parsePracticeAttemptCreationRequest,
  PracticeAttemptRequestError,
} from "./practice-quiz-attempt-request.ts";
import { requireCapability } from "./current-user.ts";
import type { PracticeAttemptRecord } from "./practice-quiz-attempt-domain.ts";
import type { PracticeAttemptPageView } from "../practice-quiz-attempt.ts";
import { readPracticeQuizXpStatus } from "./xp-repository.ts";

export { PracticeAttemptRequestError } from "./practice-quiz-attempt-request.ts";

export async function createPracticeQuizAttempt(input: unknown) {
  const user = await requireCapability("recordQuizAttempts");
  const { categoryIds: selectedCategoryIds } = parsePracticeAttemptCreationRequest(input);
  return createPracticeQuizAttemptForUser(user.id, selectedCategoryIds);
}

export async function restartPracticeQuizAttempt(completedAttemptId: unknown) {
  const user = await requireCapability("recordQuizAttempts");
  if (!isUuid(completedAttemptId)) throw new PracticeAttemptRequestError();
  const completedAttempt = await findOwnedPracticeAttempt(completedAttemptId, user.id);
  if (!completedAttempt) throw new PracticeAttemptNotFoundError();
  if (completedAttempt.status !== "completed") throw new PracticeAttemptRequestError();
  return createPracticeQuizAttemptForUser(user.id, completedAttempt.selectedCategoryIds);
}

async function createPracticeQuizAttemptForUser(
  userId: string,
  selectedCategoryIds: readonly AssessmentGroupId[],
) {
  const seed = generatePracticeAttemptSeed();
  const selectedQuestions = selectPracticeQuestions(
    selectedCategoryIds,
    createPracticeRandomSource(seed, "question-selection"),
  );
  if (selectedQuestions.length !== practiceQuestionCount) throw new PracticeAttemptRequestError();
  const record = await createPracticeAttemptRecord({
    userId,
    selectedCategoryIds,
    seed,
    questions: preparePracticeAttemptQuestions(selectedQuestions, seed),
  });
  return projectPracticeAttempt(record);
}

export async function getPracticeQuizAttempt(attemptId: unknown) {
  const user = await requireCapability("recordQuizAttempts");
  if (!isUuid(attemptId)) throw new PracticeAttemptRequestError();
  const record = await findOwnedPracticeAttempt(attemptId, user.id);
  if (!record) throw new PracticeAttemptNotFoundError();
  return projectPracticeAttemptForPage(record, user.id);
}

export async function completePracticeQuizAttempt(input: unknown) {
  const user = await requireCapability("recordQuizAttempts");
  if (!isRecord(input) || !hasOnlyKeys(input, ["attemptId", "answers"])
    || !isUuid(input.attemptId)) throw new PracticeAttemptRequestError();
  const record = await completeOwnedPracticeAttempt({
    attemptId: input.attemptId,
    userId: user.id,
    answers: input.answers,
  });
  return projectPracticeAttemptForPage(record, user.id);
}

async function projectPracticeAttemptForPage(
  record: PracticeAttemptRecord,
  userId: string,
): Promise<PracticeAttemptPageView> {
  const view = projectPracticeAttempt(record);
  if (view.status === "in_progress") return view;
  return { ...view, xpReward: await readPracticeQuizXpStatus(userId, view.id) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => allowed.has(key));
}
