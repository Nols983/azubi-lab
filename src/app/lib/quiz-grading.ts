import type { Quiz, QuizQuestion } from "../data/quizzes";

export type QuizAnswers = Readonly<Record<string, readonly string[] | undefined>>;

export type QuestionResult = {
  question: QuizQuestion;
  selectedOptionIds: readonly string[];
  isCorrect: boolean;
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort();
}

export function getCorrectOptionIds(question: QuizQuestion): readonly string[] {
  return question.type === "single-choice" ? [question.correctOptionId] : question.correctOptionIds;
}

export function isQuestionAnswered(question: QuizQuestion, answer: readonly string[] | undefined) {
  if (!answer || answer.length === 0) return false;
  return question.type === "multiple-selection" || answer.length === 1;
}

export function isAnswerCorrect(question: QuizQuestion, answer: readonly string[] | undefined) {
  if (!isQuestionAnswered(question, answer)) return false;
  const selected = uniqueSorted(answer ?? []);
  const correct = uniqueSorted(getCorrectOptionIds(question));
  return selected.length === correct.length && selected.every((id, index) => id === correct[index]);
}

export function gradeQuiz(quiz: Quiz, answers: QuizAnswers) {
  const results = quiz.questions.map((question) => ({
    question,
    selectedOptionIds: uniqueSorted(answers[question.id] ?? []),
    isCorrect: isAnswerCorrect(question, answers[question.id]),
  }));
  const correctCount = results.filter((result) => result.isCorrect).length;
  return {
    correctCount,
    totalCount: quiz.questions.length,
    percentage: Math.round((correctCount / quiz.questions.length) * 100),
    results,
  };
}
