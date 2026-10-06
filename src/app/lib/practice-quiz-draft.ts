import type {
  InProgressPracticeAttemptView,
  PracticeAttemptQuestionView,
} from "./practice-quiz-attempt.ts";

export const PRACTICE_QUIZ_DRAFT_VERSION = 1;
const practiceQuizDraftKeyPrefix = "azubi-lab:practice-quiz:draft:v1:";

export type PracticeQuizDraftAnswers = Readonly<Record<string, readonly string[]>>;

export type PracticeQuizDraft = {
  answers: PracticeQuizDraftAnswers;
  currentQuestionIndex: number;
};

export function getPracticeQuizDraftStorageKey(attemptId: string) {
  return `${practiceQuizDraftKeyPrefix}${attemptId}`;
}

export function parsePracticeQuizDraft(
  raw: string | null,
  attempt: InProgressPracticeAttemptView,
): PracticeQuizDraft {
  if (raw === null) return emptyDraft();

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return emptyDraft();
  }

  if (!isRecord(value)
    || value.version !== PRACTICE_QUIZ_DRAFT_VERSION
    || value.attemptId !== attempt.id
    || !isRecord(value.answers)) {
    return emptyDraft();
  }

  return {
    answers: sanitizePracticeQuizAnswers(value.answers, attempt.questions),
    currentQuestionIndex: parseCurrentQuestionIndex(
      value.currentQuestionIndex,
      attempt.questionCount,
    ),
  };
}

export function serializePracticeQuizDraft(
  attempt: InProgressPracticeAttemptView,
  answers: PracticeQuizDraftAnswers,
  currentQuestionIndex: number,
) {
  return JSON.stringify({
    version: PRACTICE_QUIZ_DRAFT_VERSION,
    attemptId: attempt.id,
    currentQuestionIndex: parseCurrentQuestionIndex(
      currentQuestionIndex,
      attempt.questionCount,
    ),
    answers: sanitizePracticeQuizAnswers(answers, attempt.questions),
  });
}

export function sanitizePracticeQuizAnswers(
  value: unknown,
  questions: readonly PracticeAttemptQuestionView[],
): PracticeQuizDraftAnswers {
  if (!isRecord(value)) return {};

  const questionById = new Map(questions.map((question) => [question.questionId, question]));
  const answers: Record<string, readonly string[]> = {};

  for (const [questionId, selectedValue] of Object.entries(value)) {
    const question = questionById.get(questionId);
    if (!question || !Array.isArray(selectedValue)
      || selectedValue.length === 0
      || selectedValue.some((optionId) => typeof optionId !== "string" || !optionId)
      || new Set(selectedValue).size !== selectedValue.length
      || (question.type === "single-choice" && selectedValue.length !== 1)) {
      continue;
    }

    const optionIds = new Set(question.options.map((option) => option.id));
    if (selectedValue.some((optionId) => !optionIds.has(optionId))) continue;
    answers[questionId] = [...selectedValue] as string[];
  }

  return answers;
}

export function countAnsweredPracticeQuestions(
  attempt: InProgressPracticeAttemptView,
  answers: PracticeQuizDraftAnswers,
) {
  return Object.keys(sanitizePracticeQuizAnswers(answers, attempt.questions)).length;
}

export function isPracticeQuizSubmissionReady(
  attempt: InProgressPracticeAttemptView,
  answers: PracticeQuizDraftAnswers,
) {
  return countAnsweredPracticeQuestions(attempt, answers) === attempt.questionCount;
}

export function buildPracticeQuizSubmission(
  attempt: InProgressPracticeAttemptView,
  answers: PracticeQuizDraftAnswers,
) {
  const sanitized = sanitizePracticeQuizAnswers(answers, attempt.questions);
  if (Object.keys(sanitized).length !== attempt.questionCount) return undefined;
  return attempt.questions.map((question) => ({
    questionId: question.questionId,
    selectedOptionIds: [...(sanitized[question.questionId] ?? [])],
  }));
}

function parseCurrentQuestionIndex(value: unknown, questionCount: number) {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) < questionCount
    ? Number(value)
    : 0;
}

function emptyDraft(): PracticeQuizDraft {
  return { answers: {}, currentQuestionIndex: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
