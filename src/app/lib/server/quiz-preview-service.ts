import "server-only";

import { learningModules } from "../../data/learning-modules.ts";
import { assessmentGroupIds } from "../../data/quiz-bank/categories.ts";
import { selectPracticeQuestions } from "../../data/quiz-bank/practice-selection.ts";
import type { QuestionBankQuestion, Quiz, QuizQuestion } from "../../data/quiz-bank/types.ts";
import { createPracticeRandomSource } from "./practice-quiz-attempt-domain.ts";
import { selectIhkExamQuestions } from "./ihk-exam-selection.ts";

const moduleTitles = new Map(learningModules.map((module) => [module.slug, module.title]));
const previewSeed = "00112233445566778899aabbccddeeff";

export function getPracticeQuizPreview(): Quiz {
  const questions = selectPracticeQuestions(
    assessmentGroupIds,
    createPracticeRandomSource(previewSeed, "practice-preview"),
  );
  return buildPreviewQuiz({
    id: "observer-practice-preview",
    moduleSlug: "observer-practice-preview",
    title: "Übungsquiz-Vorschau",
    description: "Ein repräsentativer Fragenmix aus allen fünf Lernbereichen. Der Versuch bleibt ausschließlich in dieser Ansicht und wird nicht gespeichert.",
    questions,
  });
}

export function getIhkExamPreview(): Quiz {
  return buildPreviewQuiz({
    id: "observer-ihk-preview",
    moduleSlug: "observer-ihk-preview",
    title: "IHK-Simulation in der Vorschau",
    description: "Der vollständige 30-Fragen-Mix demonstriert Aufbau und Auswertung. Es entstehen weder eine serverseitige Frist noch eine Versuchshistorie.",
    questions: selectIhkExamQuestions(previewSeed),
  });
}

function buildPreviewQuiz(input: {
  id: string;
  moduleSlug: string;
  title: string;
  description: string;
  questions: readonly QuestionBankQuestion[];
}): Quiz {
  return {
    id: input.id,
    moduleSlug: input.moduleSlug,
    title: input.title,
    description: input.description,
    questions: input.questions.map(toPreviewQuestion),
  };
}

function toPreviewQuestion(question: QuestionBankQuestion): QuizQuestion {
  const common = {
    id: question.id,
    lesson: moduleTitles.get(question.moduleSlug) ?? question.lessonSlug,
    prompt: question.prompt,
    options: question.options.map((option) => ({ ...option })),
    explanation: question.explanation,
  };
  return question.type === "single-choice"
    ? { ...common, type: "single-choice", correctOptionId: question.correctOptionId }
    : { ...common, type: "multiple-selection", correctOptionIds: [...question.correctOptionIds] };
}
