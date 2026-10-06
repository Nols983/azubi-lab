import type { QuizDifficulty, QuizOption } from "../data/quiz-bank/types.ts";
import type { AssessmentGroupId } from "../data/quiz-bank/categories.ts";

export type PracticeAttemptQuestionView = {
  position: number;
  questionId: string;
  revision: number;
  type: "single-choice" | "multiple-selection";
  prompt: string;
  moduleSlug: string;
  assessmentGroupId: AssessmentGroupId;
  lessonSlug: string;
  tags: readonly string[];
  difficulty: QuizDifficulty;
  options: readonly QuizOption[];
};

export type InProgressPracticeAttemptView = {
  id: string;
  status: "in_progress";
  selectedCategoryIds: readonly string[];
  questionCount: number;
  startedAt: string;
  questions: readonly PracticeAttemptQuestionView[];
};

export type CompletedPracticeQuestionView = PracticeAttemptQuestionView & {
  selectedOptionIds: readonly string[];
  isCorrect: boolean;
  correctOptionIds: readonly string[];
  explanation: string;
  answeredAt: string;
};

export type CompletedPracticeAttemptView = {
  id: string;
  status: "completed";
  selectedCategoryIds: readonly string[];
  questionCount: number;
  correctCount: number;
  scorePercentage: number;
  startedAt: string;
  completedAt: string;
  questions: readonly CompletedPracticeQuestionView[];
};

export type PracticeAttemptView = InProgressPracticeAttemptView | CompletedPracticeAttemptView;

export type PracticeQuizXpRewardView =
  | { status: "awarded"; xpAmount: number }
  | { status: "daily-limit" }
  | { status: "ineligible" };

export type CompletedPracticeAttemptPageView = CompletedPracticeAttemptView & {
  xpReward: PracticeQuizXpRewardView;
};

export type PracticeAttemptPageView = InProgressPracticeAttemptView | CompletedPracticeAttemptPageView;
