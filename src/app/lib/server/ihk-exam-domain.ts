import "server-only";

import { randomBytes } from "node:crypto";
import {
  getAssessmentGroupForModule,
  getQuizCategoryForModule,
  type QuizCategoryId,
} from "../../data/quiz-bank/categories.ts";
import type { QuestionBankQuestion, QuizOption } from "../../data/quiz-bank/types.ts";
import {
  getIhkExamScorePercentage,
  getIhkExamTimeUsedSeconds,
  ihkExamQuestionCount,
  type CompletedIhkExamView,
  type IhkExamAttemptView,
  type IhkExamCompletionReason,
  type InProgressIhkExamView,
} from "../ihk-exam.ts";
import {
  parsePracticeGradingSnapshot,
  parsePracticeRenderSnapshot,
  shufflePracticeValues,
  type PracticeQuestionGradingSnapshot,
  type PracticeQuestionRenderSnapshot,
} from "./practice-quiz-attempt-domain.ts";

export type IhkExamAttemptStatus = "in_progress" | "completed";

export type IhkExamQuestionRecord = {
  position: number;
  questionId: string;
  questionRevision: number;
  categoryId: QuizCategoryId;
  renderSnapshot: PracticeQuestionRenderSnapshot;
  gradingSnapshot: PracticeQuestionGradingSnapshot;
  selectedOptionIds: readonly string[];
  answeredAt: Date | null;
  isCorrect: boolean | null;
};

export type IhkExamAttemptRecord = {
  id: string;
  userId: string;
  status: IhkExamAttemptStatus;
  seed: string;
  questionCount: number;
  correctCount: number | null;
  passed: boolean | null;
  completionReason: IhkExamCompletionReason | null;
  startedAt: Date;
  deadlineAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  questions: readonly IhkExamQuestionRecord[];
};

export type PreparedIhkExamQuestion = Pick<
  IhkExamQuestionRecord,
  "position" | "questionId" | "questionRevision" | "categoryId" | "renderSnapshot" | "gradingSnapshot"
>;

export type ValidatedIhkExamAnswer = {
  position: number;
  questionId: string;
  selectedOptionIds: readonly string[];
};

export type GradedIhkExamAnswer = ValidatedIhkExamAnswer & { isCorrect: boolean };

export type IhkExamValidationErrorCode =
  | "INVALID_ANSWER"
  | "UNKNOWN_QUESTION"
  | "DUPLICATE_OPTION"
  | "UNKNOWN_OPTION"
  | "INVALID_CARDINALITY"
  | "CORRUPT_SNAPSHOT";

export class IhkExamValidationError extends Error {
  readonly code: IhkExamValidationErrorCode;

  constructor(code: IhkExamValidationErrorCode) {
    super("The IHK exam data is invalid.");
    this.name = "IhkExamValidationError";
    this.code = code;
  }
}

export function generateIhkExamSeed() {
  return randomBytes(16).toString("hex");
}

export function prepareIhkExamQuestions(
  selectedQuestions: readonly QuestionBankQuestion[],
  seed: string,
): readonly PreparedIhkExamQuestion[] {
  const presented = shufflePracticeValues(selectedQuestions, seed, "ihk:question-presentation");
  return presented.map((question, index) => {
    const position = index + 1;
    const options = question.shuffleOptions
      ? shufflePracticeValues(
          question.options,
          seed,
          `ihk:option-presentation:${question.id}:${question.revision}:${position}`,
        ).map(copyOption)
      : question.options.map(copyOption);
    return {
      position,
      questionId: question.id,
      questionRevision: question.revision,
      categoryId: getQuizCategoryForModule(question.moduleSlug),
      renderSnapshot: {
        questionId: question.id,
        revision: question.revision,
        type: question.type,
        prompt: question.prompt,
        moduleSlug: question.moduleSlug,
        lessonSlug: question.lessonSlug,
        tags: [...question.tags],
        difficulty: question.difficulty,
        options,
        shuffleOptions: question.shuffleOptions,
      },
      gradingSnapshot: {
        type: question.type,
        correctOptionIds: question.type === "single-choice"
          ? [question.correctOptionId]
          : [...question.correctOptionIds],
        explanation: question.explanation,
      },
    };
  });
}

export function validateIhkExamAnswer(
  question: IhkExamQuestionRecord,
  value: unknown,
): ValidatedIhkExamAnswer {
  if (!isRecord(value) || !hasOnlyKeys(value, ["position", "questionId", "selectedOptionIds"])
    || !Number.isInteger(value.position) || value.position !== question.position
    || typeof value.questionId !== "string" || value.questionId !== question.questionId
    || !Array.isArray(value.selectedOptionIds)
    || value.selectedOptionIds.some((optionId) => typeof optionId !== "string" || !optionId)) {
    throw new IhkExamValidationError("INVALID_ANSWER");
  }
  const selectedOptionIds = value.selectedOptionIds as string[];
  if (new Set(selectedOptionIds).size !== selectedOptionIds.length) {
    throw new IhkExamValidationError("DUPLICATE_OPTION");
  }
  const optionOrder = new Map(question.renderSnapshot.options.map((option, index) => [option.id, index]));
  if (selectedOptionIds.some((optionId) => !optionOrder.has(optionId))) {
    throw new IhkExamValidationError("UNKNOWN_OPTION");
  }
  if (question.renderSnapshot.type === "single-choice" && selectedOptionIds.length > 1) {
    throw new IhkExamValidationError("INVALID_CARDINALITY");
  }
  return {
    position: question.position,
    questionId: question.questionId,
    selectedOptionIds: [...selectedOptionIds].sort(
      (left, right) => (optionOrder.get(left) ?? 0) - (optionOrder.get(right) ?? 0),
    ),
  };
}

export function gradeIhkExamQuestions(
  questions: readonly IhkExamQuestionRecord[],
): readonly GradedIhkExamAnswer[] {
  return questions.map((question) => ({
    position: question.position,
    questionId: question.questionId,
    selectedOptionIds: [...question.selectedOptionIds],
    isCorrect: sameStringSet(question.selectedOptionIds, question.gradingSnapshot.correctOptionIds),
  }));
}

export function parseIhkExamSnapshots(renderValue: unknown, gradingValue: unknown) {
  try {
    const renderSnapshot = parsePracticeRenderSnapshot(renderValue);
    const gradingSnapshot = parsePracticeGradingSnapshot(gradingValue, renderSnapshot);
    return { renderSnapshot, gradingSnapshot };
  } catch {
    throw new IhkExamValidationError("CORRUPT_SNAPSHOT");
  }
}

export function projectIhkExamAttempt(record: IhkExamAttemptRecord, serverNow: Date): IhkExamAttemptView {
  const base = {
    id: record.id,
    questionCount: record.questionCount,
    startedAt: record.startedAt.toISOString(),
    deadlineAt: record.deadlineAt.toISOString(),
  };
  if (record.status === "in_progress") {
    if (record.correctCount !== null || record.passed !== null || record.completionReason !== null
      || record.completedAt !== null || record.questions.some((question) => question.isCorrect !== null)) {
      throw new IhkExamValidationError("CORRUPT_SNAPSHOT");
    }
    return {
      ...base,
      status: "in_progress",
      serverNow: serverNow.toISOString(),
      questions: record.questions.map(projectInProgressQuestion),
    } satisfies InProgressIhkExamView;
  }
  if (record.correctCount === null || record.passed === null || !record.completionReason || !record.completedAt
    || record.questions.some((question) => question.isCorrect === null)) {
    throw new IhkExamValidationError("CORRUPT_SNAPSHOT");
  }
  return {
    ...base,
    status: "completed",
    correctCount: record.correctCount,
    scorePercentage: getIhkExamScorePercentage(record.correctCount, record.questionCount),
    passed: record.passed,
    completionReason: record.completionReason,
    completedAt: record.completedAt.toISOString(),
    timeUsedSeconds: getIhkExamTimeUsedSeconds(record.startedAt, record.completedAt),
    questions: record.questions.map((question) => ({
      ...projectInProgressQuestion(question),
      isCorrect: Boolean(question.isCorrect),
      correctOptionIds: [...question.gradingSnapshot.correctOptionIds],
      explanation: question.gradingSnapshot.explanation,
    })),
  } satisfies CompletedIhkExamView;
}

function projectInProgressQuestion(question: IhkExamQuestionRecord) {
  return {
    position: question.position,
    questionId: question.questionId,
    assessmentGroupId: getAssessmentGroupForModule(question.renderSnapshot.moduleSlug),
    type: question.renderSnapshot.type,
    prompt: question.renderSnapshot.prompt,
    options: question.renderSnapshot.options.map(copyOption),
    selectedOptionIds: [...question.selectedOptionIds],
    answered: question.selectedOptionIds.length > 0,
  };
}

function copyOption(option: QuizOption): QuizOption {
  return { id: option.id, label: option.label };
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => allowed.has(key));
}

export function assertPreparedIhkExamQuestions(questions: readonly PreparedIhkExamQuestion[]) {
  if (questions.length !== ihkExamQuestionCount
    || new Set(questions.map((question) => question.questionId)).size !== ihkExamQuestionCount
    || questions.some((question, index) => question.position !== index + 1)) {
    throw new IhkExamValidationError("CORRUPT_SNAPSHOT");
  }
  for (const question of questions) {
    const snapshots = parseIhkExamSnapshots(question.renderSnapshot, question.gradingSnapshot);
    if (question.questionId !== snapshots.renderSnapshot.questionId
      || question.questionRevision !== snapshots.renderSnapshot.revision
      || question.categoryId !== getQuizCategoryForModule(snapshots.renderSnapshot.moduleSlug)) {
      throw new IhkExamValidationError("CORRUPT_SNAPSHOT");
    }
  }
}
