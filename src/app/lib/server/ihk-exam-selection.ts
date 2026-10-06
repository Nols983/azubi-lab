import "server-only";

import {
  assessmentGroupIds,
  type AssessmentGroupId,
} from "../../data/quiz-bank/categories.ts";
import {
  AssessmentSelectionError,
  selectBalancedAssessmentQuestions,
} from "../../data/quiz-bank/assessment-selection.ts";
import { questionBank } from "../../data/quiz-bank/question-bank.ts";
import type { QuestionBankQuestion } from "../../data/quiz-bank/types.ts";
import {
  ihkExamDifficultyQuota,
  ihkExamQuestionCount,
  ihkExamQuestionTypeQuota,
} from "../ihk-exam.ts";
import { createPracticeRandomSource } from "./practice-quiz-attempt-domain.ts";

export class IhkExamSelectionError extends Error {
  constructor() {
    super("The canonical question bank cannot satisfy the IHK exam quotas.");
    this.name = "IhkExamSelectionError";
  }
}

export function getIhkExamGroupQuotas(seed: string) {
  assertSeed(seed);
  const base = Math.floor(ihkExamQuestionCount / assessmentGroupIds.length);
  const remainder = ihkExamQuestionCount % assessmentGroupIds.length;
  const ordered = seededOrder(assessmentGroupIds, seed, "ihk:group-extra");
  const extraGroups = new Set(ordered.slice(0, remainder));
  return Object.fromEntries(assessmentGroupIds.map((groupId) => [
    groupId,
    base + (extraGroups.has(groupId) ? 1 : 0),
  ])) as Record<AssessmentGroupId, number>;
}

export function selectIhkExamQuestions(
  seed: string,
  questionPool: readonly QuestionBankQuestion[] = questionBank,
): readonly QuestionBankQuestion[] {
  assertSeed(seed);
  const quotas = getIhkExamGroupQuotas(seed);
  if (new Set(Object.values(quotas)).size !== 1) throw new IhkExamSelectionError();
  try {
    const result = selectBalancedAssessmentQuestions({
      groupIds: assessmentGroupIds,
      questionCount: ihkExamQuestionCount,
      difficultyQuota: ihkExamDifficultyQuota,
      typeQuota: ihkExamQuestionTypeQuota,
      questionPool,
      random: createPracticeRandomSource(seed, "ihk:question-selection"),
    });
    if (!result.usedExactQuotas) throw new IhkExamSelectionError();
    return result.questions;
  } catch (error) {
    if (error instanceof AssessmentSelectionError) throw new IhkExamSelectionError();
    throw error;
  }
}

function seededOrder<T>(values: readonly T[], seed: string, stream: string) {
  const random = createPracticeRandomSource(seed, stream);
  const ordered = [...values];
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(random() * (index + 1));
    [ordered[index], ordered[otherIndex]] = [ordered[otherIndex], ordered[index]];
  }
  return ordered;
}

function assertSeed(seed: string) {
  if (!/^[0-9a-f]{32}$/.test(seed)) throw new IhkExamSelectionError();
}
