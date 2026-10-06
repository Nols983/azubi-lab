import "server-only";

import {
  PracticeSelectionError,
  validatePracticeCategoryIds,
} from "../../data/quiz-bank/practice-selection.ts";

export class PracticeAttemptRequestError extends Error {
  constructor() {
    super("The practice attempt request is invalid.");
    this.name = "PracticeAttemptRequestError";
  }
}

export function parsePracticeAttemptCreationRequest(input: unknown) {
  if (!isRecord(input) || !hasOnlyKeys(input, ["categoryIds"])) {
    throw new PracticeAttemptRequestError();
  }

  try {
    return {
      categoryIds: validatePracticeCategoryIds(input.categoryIds),
    };
  } catch (error) {
    if (error instanceof PracticeSelectionError) {
      throw new PracticeAttemptRequestError();
    }
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).length === keys.length
    && Object.keys(value).every((key) => allowed.has(key));
}
