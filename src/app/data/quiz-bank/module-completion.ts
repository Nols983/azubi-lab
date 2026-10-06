import { learningModules } from "../learning-modules.ts";
import { moduleCompletionDefinitions } from "./module-completion-definitions.ts";
import { questionBank, questionBankById } from "./question-bank.ts";
import type {
  ModuleCompletionDefinition,
  QuestionBankQuestion,
  Quiz,
  QuizQuestion,
} from "./types.ts";
import { assertCompletionDefinitionsIntegrity } from "./validation.ts";

assertCompletionDefinitionsIntegrity(moduleCompletionDefinitions, questionBank);

function getCanonicalLessonTitle(question: QuestionBankQuestion) {
  const learningModule = learningModules.find((candidate) => candidate.slug === question.moduleSlug);
  const lesson = learningModule?.lessons?.find((candidate) => candidate.slug === question.lessonSlug);
  if (!lesson) throw new Error(`Kanonische Lektion für ${question.id} fehlt.`);
  return lesson.title;
}

function hydrateQuestion(question: QuestionBankQuestion): QuizQuestion {
  const common = {
    id: question.id,
    lesson: getCanonicalLessonTitle(question),
    prompt: question.prompt,
    options: question.options,
    explanation: question.explanation,
  };

  return question.type === "single-choice"
    ? { ...common, type: question.type, correctOptionId: question.correctOptionId }
    : { ...common, type: question.type, correctOptionIds: question.correctOptionIds };
}

function hydrateCompletionQuiz(definition: ModuleCompletionDefinition): Quiz {
  return {
    id: definition.id,
    moduleSlug: definition.moduleSlug,
    title: definition.title,
    description: definition.description,
    questions: definition.questionIds.map((questionId) => {
      const question = questionBankById.get(questionId);
      if (!question) throw new Error(`Question-Bank-Frage ${questionId} fehlt.`);
      return hydrateQuestion(question);
    }),
  };
}

export const quizzes: readonly Quiz[] = moduleCompletionDefinitions.map(hydrateCompletionQuiz);

export function getQuizForModule(moduleSlug: string) {
  return quizzes.find((quiz) => quiz.moduleSlug === moduleSlug);
}
