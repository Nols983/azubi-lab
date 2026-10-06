import type { Quiz } from "../data/quizzes.ts";

export function prepareModuleQuizAttempt(quiz: Quiz, seed: number): Quiz {
  const questions = shuffle(quiz.questions, createRandomSource(seed, `${quiz.id}:questions`));
  return {
    ...quiz,
    questions: questions.map((question) => ({
      ...question,
      options: shuffle(question.options, createRandomSource(seed, `${quiz.id}:options:${question.id}`)),
    })),
  };
}

function createRandomSource(seed: number, stream: string) {
  let state = ((seed >>> 0) ^ hashStream(stream)) || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 2 ** 32;
  };
}

function hashStream(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function shuffle<T>(values: readonly T[], random: () => number) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[otherIndex]] = [shuffled[otherIndex], shuffled[index]];
  }
  return shuffled;
}
