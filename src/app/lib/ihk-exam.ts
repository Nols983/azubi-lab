import type { QuizOption } from "../data/quiz-bank/types.ts";
import type { AssessmentGroupId } from "../data/quiz-bank/categories.ts";

export const ihkExamQuestionCount = 30;
export const ihkExamDurationMinutes = 45;
export const ihkExamPassNumerator = 1;
export const ihkExamPassDenominator = 2;
export const ihkExamHistoryLimit = 10;

export const ihkExamDifficultyQuota = {
  easy: 8,
  medium: 16,
  hard: 6,
} as const;

export const ihkExamQuestionTypeQuota = {
  "single-choice": 16,
  "multiple-selection": 14,
} as const;

export const ihkExamCurriculumGroupQuestionCount = 6;

export type IhkExamCompletionReason = "submitted" | "timeout";

export type IhkExamQuestionView = {
  position: number;
  questionId: string;
  assessmentGroupId: AssessmentGroupId;
  type: "single-choice" | "multiple-selection";
  prompt: string;
  options: readonly QuizOption[];
  selectedOptionIds: readonly string[];
  answered: boolean;
};

export type InProgressIhkExamView = {
  id: string;
  status: "in_progress";
  questionCount: number;
  startedAt: string;
  deadlineAt: string;
  serverNow: string;
  questions: readonly IhkExamQuestionView[];
};

export type CompletedIhkExamQuestionView = IhkExamQuestionView & {
  isCorrect: boolean;
  correctOptionIds: readonly string[];
  explanation: string;
};

export type CompletedIhkExamView = {
  id: string;
  status: "completed";
  questionCount: number;
  correctCount: number;
  scorePercentage: number;
  passed: boolean;
  completionReason: IhkExamCompletionReason;
  startedAt: string;
  deadlineAt: string;
  completedAt: string;
  timeUsedSeconds: number;
  questions: readonly CompletedIhkExamQuestionView[];
};

export type IhkExamAttemptView = InProgressIhkExamView | CompletedIhkExamView;

export type IhkExamHistoryItem = {
  id: string;
  correctCount: number;
  questionCount: number;
  scorePercentage: number;
  passed: boolean;
  completionReason: IhkExamCompletionReason;
  completedAt: string;
};

export type IhkExamOverview = {
  activeAttempt: Pick<InProgressIhkExamView, "id" | "startedAt" | "deadlineAt"> | null;
  history: readonly IhkExamHistoryItem[];
};

export function getIhkExamDeadline(startedAt: Date) {
  return new Date(startedAt.getTime() + ihkExamDurationMinutes * 60_000);
}

export function isIhkExamExpired(deadlineAt: Date, serverNow: Date) {
  return serverNow.getTime() >= deadlineAt.getTime();
}

export function isIhkExamPassed(correctCount: number, questionCount = ihkExamQuestionCount) {
  assertScore(correctCount, questionCount);
  return correctCount * ihkExamPassDenominator >= questionCount * ihkExamPassNumerator;
}

export function getIhkExamScorePercentage(correctCount: number, questionCount = ihkExamQuestionCount) {
  assertScore(correctCount, questionCount);
  return Math.round((correctCount / questionCount) * 100);
}

export function getIhkExamTimeUsedSeconds(startedAt: Date, completedAt: Date) {
  return Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1_000));
}

function assertScore(correctCount: number, questionCount: number) {
  if (!Number.isInteger(correctCount) || !Number.isInteger(questionCount)
    || questionCount <= 0 || correctCount < 0 || correctCount > questionCount) {
    throw new RangeError("Invalid IHK exam score.");
  }
}
