import "server-only";

import { createHash, randomBytes } from "node:crypto";
import {
  getQuizCategoryForModule,
  getAssessmentGroupForModule,
  isQuizCategoryId,
  isQuizModuleSlug,
  type AssessmentGroupId,
  type QuizCategoryId,
  type QuizModuleSlug,
} from "../../data/quiz-bank/categories.ts";
import { quizTagIds, type QuizTagId } from "../../data/quiz-bank/tags.ts";
import type {
  QuestionBankQuestion,
  QuizDifficulty,
  QuizOption,
} from "../../data/quiz-bank/types.ts";
import type {
  CompletedPracticeAttemptView,
  InProgressPracticeAttemptView,
  PracticeAttemptQuestionView,
  PracticeAttemptView,
} from "../practice-quiz-attempt.ts";

export type PracticeAttemptStatus = "in_progress" | "completed";

export type PracticeQuestionRenderSnapshot = {
  questionId: string;
  revision: number;
  type: QuestionBankQuestion["type"];
  prompt: string;
  moduleSlug: QuizModuleSlug;
  lessonSlug: string;
  tags: readonly QuizTagId[];
  difficulty: QuizDifficulty;
  options: readonly QuizOption[];
  shuffleOptions: boolean;
};

export type PracticeQuestionGradingSnapshot = {
  type: QuestionBankQuestion["type"];
  correctOptionIds: readonly string[];
  explanation: string;
};

export type PracticeAttemptQuestionRecord = {
  position: number;
  questionId: string;
  questionRevision: number;
  categoryId: QuizCategoryId;
  renderSnapshot: PracticeQuestionRenderSnapshot;
  gradingSnapshot: PracticeQuestionGradingSnapshot;
  submittedOptionIds: readonly string[] | null;
  isCorrect: boolean | null;
  answeredAt: Date | null;
};

export type PracticeAttemptRecord = {
  id: string;
  userId: string;
  status: PracticeAttemptStatus;
  selectedCategoryIds: readonly AssessmentGroupId[];
  seed: string;
  questionCount: number;
  correctCount: number | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  questions: readonly PracticeAttemptQuestionRecord[];
};

export type PreparedPracticeQuestion = Pick<
  PracticeAttemptQuestionRecord,
  "position" | "questionId" | "questionRevision" | "categoryId" | "renderSnapshot" | "gradingSnapshot"
>;

export type GradedPracticeAnswer = {
  position: number;
  questionId: string;
  selectedOptionIds: readonly string[];
  isCorrect: boolean;
};

export type PracticeAttemptValidationErrorCode =
  | "INVALID_COMPLETION_INPUT"
  | "INVALID_ANSWER"
  | "DUPLICATE_QUESTION"
  | "UNKNOWN_QUESTION"
  | "INVALID_QUESTION_COVERAGE"
  | "DUPLICATE_OPTION"
  | "UNKNOWN_OPTION"
  | "INVALID_CARDINALITY"
  | "CORRUPT_SNAPSHOT";

export class PracticeAttemptValidationError extends Error {
  readonly code: PracticeAttemptValidationErrorCode;

  constructor(code: PracticeAttemptValidationErrorCode, message: string) {
    super(message);
    this.name = "PracticeAttemptValidationError";
    this.code = code;
  }
}

export function generatePracticeAttemptSeed() {
  return randomBytes(16).toString("hex");
}

export function createPracticeRandomSource(seed: string, stream: string) {
  const digest = createHash("sha256").update(seed).update("\0").update(stream).digest();
  let state = digest.readUInt32LE(0) || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 2 ** 32;
  };
}

export function shufflePracticeValues<T>(values: readonly T[], seed: string, stream: string) {
  const shuffled = [...values];
  const random = createPracticeRandomSource(seed, stream);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[otherIndex]] = [shuffled[otherIndex], shuffled[index]];
  }
  return shuffled;
}

export function shufflePracticeQuestionOptions(
  question: QuestionBankQuestion,
  seed: string,
  position: number,
) {
  if (!question.shuffleOptions) return question.options.map(copyOption);
  return shufflePracticeValues(
    question.options,
    seed,
    `options:${question.id}:${question.revision}:${position}`,
  ).map(copyOption);
}

export function preparePracticeAttemptQuestions(
  selectedQuestions: readonly QuestionBankQuestion[],
  seed: string,
): readonly PreparedPracticeQuestion[] {
  const presentedQuestions = shufflePracticeValues(selectedQuestions, seed, "question-presentation");
  return presentedQuestions.map((question, index) => {
    const position = index + 1;
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
        options: shufflePracticeQuestionOptions(question, seed, position),
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

export function validateAndGradePracticeAnswers(
  questions: readonly PracticeAttemptQuestionRecord[],
  value: unknown,
): readonly GradedPracticeAnswer[] {
  if (!Array.isArray(value)) {
    throw validationError("INVALID_COMPLETION_INPUT", "Die Antworten müssen als Liste vorliegen.");
  }

  const expected = new Map(questions.map((question) => [question.questionId, question]));
  const submitted = new Map<string, readonly string[]>();
  for (const item of value) {
    if (!isRecord(item) || !hasOnlyKeys(item, ["questionId", "selectedOptionIds"])) {
      throw validationError("INVALID_ANSWER", "Mindestens eine Antwort ist ungültig.");
    }
    const questionId = item.questionId;
    const selectedOptionIds = item.selectedOptionIds;
    if (typeof questionId !== "string" || !Array.isArray(selectedOptionIds)
      || selectedOptionIds.some((optionId) => typeof optionId !== "string" || !optionId)) {
      throw validationError("INVALID_ANSWER", "Mindestens eine Antwort ist ungültig.");
    }
    if (submitted.has(questionId)) {
      throw validationError("DUPLICATE_QUESTION", "Eine Frage wurde mehrfach übermittelt.");
    }
    const question = expected.get(questionId);
    if (!question) {
      throw validationError("UNKNOWN_QUESTION", "Die Übermittlung enthält eine unbekannte Frage.");
    }
    if (new Set(selectedOptionIds).size !== selectedOptionIds.length) {
      throw validationError("DUPLICATE_OPTION", "Eine Antwortoption wurde mehrfach übermittelt.");
    }
    const optionIds = new Set(question.renderSnapshot.options.map((option) => option.id));
    if (selectedOptionIds.some((optionId) => !optionIds.has(optionId))) {
      throw validationError("UNKNOWN_OPTION", "Die Übermittlung enthält eine unbekannte Antwortoption.");
    }
    if (selectedOptionIds.length === 0
      || (question.renderSnapshot.type === "single-choice" && selectedOptionIds.length !== 1)) {
      throw validationError("INVALID_CARDINALITY", "Die Anzahl ausgewählter Antworten ist ungültig.");
    }
    submitted.set(questionId, [...selectedOptionIds]);
  }

  if (submitted.size !== questions.length || submitted.size !== expected.size) {
    throw validationError("INVALID_QUESTION_COVERAGE", "Nicht alle gespeicherten Fragen wurden beantwortet.");
  }

  return questions.map((question) => {
    const selectedOptionIds = submitted.get(question.questionId);
    if (!selectedOptionIds) {
      throw validationError("INVALID_QUESTION_COVERAGE", "Nicht alle gespeicherten Fragen wurden beantwortet.");
    }
    return {
      position: question.position,
      questionId: question.questionId,
      selectedOptionIds,
      isCorrect: sameStringSet(selectedOptionIds, question.gradingSnapshot.correctOptionIds),
    };
  });
}

export function parsePracticeRenderSnapshot(value: unknown): PracticeQuestionRenderSnapshot {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "questionId", "revision", "type", "prompt", "moduleSlug", "lessonSlug",
    "tags", "difficulty", "options", "shuffleOptions",
  ])) throw corruptSnapshot();

  if (typeof value.questionId !== "string"
    || !Number.isInteger(value.revision) || Number(value.revision) < 1
    || (value.type !== "single-choice" && value.type !== "multiple-selection")
    || typeof value.prompt !== "string" || !value.prompt.trim()
    || typeof value.moduleSlug !== "string" || !isQuizModuleSlug(value.moduleSlug)
    || !value.questionId.startsWith(`${value.moduleSlug}:`)
    || typeof value.lessonSlug !== "string" || !value.lessonSlug.trim()
    || !Array.isArray(value.tags) || value.tags.length < 1 || value.tags.length > 4
    || value.tags.some((tag) => typeof tag !== "string" || !quizTagIds.includes(tag as QuizTagId))
    || new Set(value.tags).size !== value.tags.length
    || (value.difficulty !== "easy" && value.difficulty !== "medium" && value.difficulty !== "hard")
    || !Array.isArray(value.options) || value.options.length < 2
    || typeof value.shuffleOptions !== "boolean") throw corruptSnapshot();

  const options = value.options.map(parseOption);
  if (new Set(options.map((option) => option.id)).size !== options.length) throw corruptSnapshot();
  return {
    questionId: value.questionId,
    revision: Number(value.revision),
    type: value.type,
    prompt: value.prompt,
    moduleSlug: value.moduleSlug,
    lessonSlug: value.lessonSlug,
    tags: [...value.tags] as QuizTagId[],
    difficulty: value.difficulty,
    options,
    shuffleOptions: value.shuffleOptions,
  };
}

export function parsePracticeGradingSnapshot(
  value: unknown,
  renderSnapshot: PracticeQuestionRenderSnapshot,
): PracticeQuestionGradingSnapshot {
  if (!isRecord(value) || !hasOnlyKeys(value, ["type", "correctOptionIds", "explanation"])
    || value.type !== renderSnapshot.type
    || !Array.isArray(value.correctOptionIds)
    || value.correctOptionIds.some((optionId) => typeof optionId !== "string" || !optionId)
    || typeof value.explanation !== "string" || !value.explanation.trim()) throw corruptSnapshot();

  const correctOptionIds = [...value.correctOptionIds] as string[];
  if (new Set(correctOptionIds).size !== correctOptionIds.length
    || (value.type === "single-choice" && correctOptionIds.length !== 1)
    || (value.type === "multiple-selection" && correctOptionIds.length < 2)) throw corruptSnapshot();
  const optionIds = new Set(renderSnapshot.options.map((option) => option.id));
  if (correctOptionIds.some((optionId) => !optionIds.has(optionId))) throw corruptSnapshot();
  return { type: renderSnapshot.type, correctOptionIds, explanation: value.explanation };
}

export function parsePersistedPracticeCategoryId(value: unknown): QuizCategoryId {
  if (typeof value !== "string" || !isQuizCategoryId(value)) throw corruptSnapshot();
  return value;
}

export function projectPracticeAttempt(record: PracticeAttemptRecord): PracticeAttemptView {
  const base = {
    id: record.id,
    selectedCategoryIds: [...record.selectedCategoryIds],
    questionCount: record.questionCount,
    startedAt: record.startedAt.toISOString(),
  };
  if (record.status === "in_progress") {
    return {
      ...base,
      status: "in_progress",
      questions: record.questions.map(projectQuestion),
    } satisfies InProgressPracticeAttemptView;
  }

  if (record.correctCount === null || record.completedAt === null) throw corruptSnapshot();
  return {
    ...base,
    status: "completed",
    correctCount: record.correctCount,
    scorePercentage: Math.round((record.correctCount / record.questionCount) * 100),
    completedAt: record.completedAt.toISOString(),
    questions: record.questions.map((question) => {
      if (question.submittedOptionIds === null || question.isCorrect === null || question.answeredAt === null) {
        throw corruptSnapshot();
      }
      return {
        ...projectQuestion(question),
        selectedOptionIds: [...question.submittedOptionIds],
        isCorrect: question.isCorrect,
        correctOptionIds: [...question.gradingSnapshot.correctOptionIds],
        explanation: question.gradingSnapshot.explanation,
        answeredAt: question.answeredAt.toISOString(),
      };
    }),
  } satisfies CompletedPracticeAttemptView;
}

function projectQuestion(question: PracticeAttemptQuestionRecord): PracticeAttemptQuestionView {
  const snapshot = question.renderSnapshot;
  return {
    position: question.position,
    questionId: question.questionId,
    revision: question.questionRevision,
    type: snapshot.type,
    prompt: snapshot.prompt,
    moduleSlug: snapshot.moduleSlug,
    assessmentGroupId: getAssessmentGroupForModule(snapshot.moduleSlug),
    lessonSlug: snapshot.lessonSlug,
    tags: [...snapshot.tags],
    difficulty: snapshot.difficulty,
    options: snapshot.options.map(copyOption),
  };
}

function parseOption(value: unknown): QuizOption {
  if (!isRecord(value) || !hasOnlyKeys(value, ["id", "label"])
    || typeof value.id !== "string" || !value.id.trim()
    || typeof value.label !== "string" || !value.label.trim()) throw corruptSnapshot();
  return { id: value.id, label: value.label };
}

function copyOption(option: QuizOption): QuizOption {
  return { id: option.id, label: option.label };
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  const expected = new Set(right);
  return left.every((value) => expected.has(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => allowed.has(key));
}

function validationError(code: PracticeAttemptValidationErrorCode, message: string) {
  return new PracticeAttemptValidationError(code, message);
}

function corruptSnapshot() {
  return validationError("CORRUPT_SNAPSHOT", "Ein gespeicherter Quiz-Snapshot ist ungültig.");
}
