import type { QuizModuleSlug } from "./categories.ts";
import type { QuizTagId } from "./tags.ts";

export type QuizOption = {
  id: string;
  label: string;
};

type RenderableQuestionBase = {
  id: string;
  prompt: string;
  options: readonly QuizOption[];
  explanation: string;
};

export type SingleChoiceQuestion = RenderableQuestionBase & {
  lesson: string;
  type: "single-choice";
  correctOptionId: string;
};

export type MultipleSelectionQuestion = RenderableQuestionBase & {
  lesson: string;
  type: "multiple-selection";
  correctOptionIds: readonly string[];
};

export type QuizQuestion = SingleChoiceQuestion | MultipleSelectionQuestion;

export type Quiz = {
  id: string;
  moduleSlug: string;
  title: string;
  description: string;
  questions: readonly QuizQuestion[];
};

export type QuizDifficulty = "easy" | "medium" | "hard";

type QuestionBankMetadata = {
  id: `${QuizModuleSlug}:${string}`;
  revision: number;
  moduleSlug: QuizModuleSlug;
  lessonSlug: string;
  tags: readonly QuizTagId[];
  difficulty: QuizDifficulty;
  practiceEligible: boolean;
  completionEligible: boolean;
  shuffleOptions: boolean;
};

export type SingleChoiceBankQuestion = RenderableQuestionBase &
  QuestionBankMetadata & {
    type: "single-choice";
    correctOptionId: string;
  };

export type MultipleSelectionBankQuestion = RenderableQuestionBase &
  QuestionBankMetadata & {
    type: "multiple-selection";
    correctOptionIds: readonly string[];
  };

export type QuestionBankQuestion = SingleChoiceBankQuestion | MultipleSelectionBankQuestion;

export type ModuleCompletionDefinition = {
  id: string;
  moduleSlug: QuizModuleSlug;
  title: string;
  description: string;
  questionIds: readonly QuestionBankQuestion["id"][];
};

export type PracticeQuestion = Omit<
  QuestionBankQuestion,
  "correctOptionId" | "correctOptionIds" | "explanation"
>;
