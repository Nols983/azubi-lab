import "server-only";

import {
  assessmentGroupIds,
  getAssessmentGroupsForLegacyCategory,
  isAssessmentGroupId,
  isQuizCategoryId,
  type AssessmentGroupId,
} from "./categories.ts";
import {
  AssessmentSelectionError,
  selectBalancedAssessmentQuestions,
  type RandomSource,
} from "./assessment-selection.ts";
import {
  practiceDifficultyQuota,
  practiceQuestionCount,
  practiceQuestionTypeQuota,
} from "./practice-config.ts";
import { questionBank } from "./question-bank.ts";
import type { QuestionBankQuestion } from "./types.ts";

export {
  practiceDifficultyQuota,
  practiceQuestionCount,
  practiceQuestionTypeQuota,
} from "./practice-config.ts";
export type { RandomSource } from "./assessment-selection.ts";

export type PracticeSelectionErrorCode =
  | "INVALID_CATEGORY_INPUT"
  | "EMPTY_CATEGORY_SELECTION"
  | "TOO_MANY_CATEGORIES"
  | "NON_STRING_CATEGORY"
  | "UNKNOWN_CATEGORY"
  | "DUPLICATE_CATEGORY"
  | "INVALID_RANDOM_SOURCE"
  | "UNSATISFIABLE_SELECTION";

export class PracticeSelectionError extends Error {
  readonly code: PracticeSelectionErrorCode;

  constructor(code: PracticeSelectionErrorCode, message: string) {
    super(message);
    this.name = "PracticeSelectionError";
    this.code = code;
  }
}

/**
 * Accept current group IDs and the four historic category values. Historic
 * values are aliases only; callers always receive current curriculum groups.
 */
export function validatePracticeCategoryIds(input: unknown) {
  if (!Array.isArray(input)) {
    throw new PracticeSelectionError("INVALID_CATEGORY_INPUT", "Die Lernbereiche müssen als Liste vorliegen.");
  }
  if (input.length === 0) {
    throw new PracticeSelectionError("EMPTY_CATEGORY_SELECTION", "Mindestens ein Lernbereich ist erforderlich.");
  }
  if (input.length > assessmentGroupIds.length) {
    throw new PracticeSelectionError(
      "TOO_MANY_CATEGORIES",
      `Es können höchstens ${assessmentGroupIds.length} Lernbereiche ausgewählt werden.`,
    );
  }

  const seenInput = new Set<string>();
  const groupIds: AssessmentGroupId[] = [];
  for (const value of input) {
    if (typeof value !== "string") {
      throw new PracticeSelectionError("NON_STRING_CATEGORY", "Lernbereichs-IDs müssen Zeichenketten sein.");
    }
    if (seenInput.has(value)) {
      throw new PracticeSelectionError("DUPLICATE_CATEGORY", `Lernbereich doppelt ausgewählt: ${value}`);
    }
    seenInput.add(value);
    const resolved = isAssessmentGroupId(value)
      ? [value]
      : isQuizCategoryId(value)
        ? getAssessmentGroupsForLegacyCategory(value)
        : undefined;
    if (!resolved) {
      throw new PracticeSelectionError("UNKNOWN_CATEGORY", `Unbekannter Lernbereich: ${value}`);
    }
    for (const groupId of resolved) {
      if (!groupIds.includes(groupId)) groupIds.push(groupId);
    }
  }
  return assessmentGroupIds.filter((groupId) => groupIds.includes(groupId));
}

export function selectPracticeQuestions(
  selectedCategoryIds: unknown,
  random: RandomSource,
  questionPool: readonly QuestionBankQuestion[] = questionBank,
): readonly QuestionBankQuestion[] {
  const groupIds = validatePracticeCategoryIds(selectedCategoryIds);
  try {
    return selectBalancedAssessmentQuestions({
      groupIds,
      questionCount: practiceQuestionCount,
      difficultyQuota: practiceDifficultyQuota,
      typeQuota: practiceQuestionTypeQuota,
      questionPool,
      random,
    }).questions;
  } catch (error) {
    if (error instanceof AssessmentSelectionError) {
      const code = error.message.includes("Zufallsquelle")
        ? "INVALID_RANDOM_SOURCE"
        : "UNSATISFIABLE_SELECTION";
      throw new PracticeSelectionError(code, error.message);
    }
    throw error;
  }
}
