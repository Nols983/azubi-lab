import type { Quiz } from "../data/quizzes.ts";
import { isQuestionAnswered, type QuizAnswers } from "./quiz-grading.ts";

export function validateQuizAnswers(quiz: Quiz, value: unknown): QuizAnswers | undefined {
  if (!isRecord(value) || Object.keys(value).length !== quiz.questions.length) return undefined;
  const answers: Record<string, string[]> = {};
  for (const question of quiz.questions) {
    const submitted = value[question.id];
    if (!Array.isArray(submitted) || submitted.some((optionId) => typeof optionId !== "string")) {
      return undefined;
    }
    const unique = [...new Set(submitted as string[])];
    if (unique.length !== submitted.length || !isQuestionAnswered(question, unique)) return undefined;
    if (question.type === "single-choice" && unique.length !== 1) return undefined;
    const optionIds = new Set(question.options.map((option) => option.id));
    if (unique.some((optionId) => !optionIds.has(optionId))) return undefined;
    answers[question.id] = unique;
  }
  return answers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
