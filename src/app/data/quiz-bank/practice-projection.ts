import type { PracticeQuestion, QuestionBankQuestion } from "./types.ts";

export function projectPracticeQuestion(question: QuestionBankQuestion): PracticeQuestion {
  return {
    id: question.id,
    revision: question.revision,
    moduleSlug: question.moduleSlug,
    lessonSlug: question.lessonSlug,
    tags: question.tags,
    difficulty: question.difficulty,
    practiceEligible: question.practiceEligible,
    completionEligible: question.completionEligible,
    shuffleOptions: question.shuffleOptions,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
  };
}
