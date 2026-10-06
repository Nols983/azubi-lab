import { learningModules } from "../learning-modules.ts";
import {
  assessmentGroupIds,
  getAssessmentGroupForModule,
  mixedAssessmentModuleSlugs,
  type QuizModuleSlug,
} from "./categories.ts";
import {
  practiceDifficultyQuota,
  practiceQuestionCount,
  practiceQuestionTypeQuota,
} from "./practice-config.ts";
import { quizTagIds } from "./tags.ts";
import type {
  ModuleCompletionDefinition,
  QuestionBankQuestion,
  QuizDifficulty,
} from "./types.ts";

export class QuizBankIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuizBankIntegrityError";
  }
}

function fail(message: string): never {
  throw new QuizBankIntegrityError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertQuestionIntegrity(value: unknown): asserts value is QuestionBankQuestion {
  if (!isRecord(value)) {
    fail("Die Question-Bank enthält einen ungültigen Frageeintrag.");
  }

  const question = value;

  if (typeof question.id !== "string" || !question.id.trim()) {
    fail("Eine Frage besitzt keine gültige ID.");
  }
  const questionId = question.id;

  if (typeof question.moduleSlug !== "string" || !question.moduleSlug.trim()) {
    fail(`Frage ${questionId} besitzt kein gültiges Modul.`);
  }
  const moduleSlug = question.moduleSlug;

  if (
    !questionId.startsWith(`${moduleSlug}:`) ||
    questionId === `${moduleSlug}:`
  ) {
    fail(`Frage ${questionId} verwendet nicht den Namensraum ihres Moduls.`);
  }

  if (
    typeof question.revision !== "number" ||
    !Number.isInteger(question.revision) ||
    question.revision < 1
  ) {
    fail(`Frage ${questionId} besitzt keine gültige Revision.`);
  }

  if (
    question.type !== "single-choice" &&
    question.type !== "multiple-selection"
  ) {
    fail(`Frage ${questionId} besitzt einen unbekannten Fragetyp.`);
  }

  if (
    question.difficulty !== "easy" &&
    question.difficulty !== "medium" &&
    question.difficulty !== "hard"
  ) {
    fail(`Frage ${questionId} besitzt einen unbekannten Schwierigkeitsgrad.`);
  }

  if (typeof question.practiceEligible !== "boolean") {
    fail(`Frage ${questionId} besitzt keine gültige Practice-Freigabe.`);
  }

  if (typeof question.completionEligible !== "boolean") {
    fail(`Frage ${questionId} besitzt keine gültige Abschlussquiz-Freigabe.`);
  }

  if (typeof question.shuffleOptions !== "boolean") {
    fail(`Frage ${questionId} besitzt keine gültige Option-Shuffle-Einstellung.`);
  }

  if (
    typeof question.prompt !== "string" ||
    typeof question.explanation !== "string" ||
    !question.prompt.trim() ||
    !question.explanation.trim()
  ) {
    fail(`Frage ${questionId} besitzt leeren oder ungültigen Inhalt.`);
  }

  if (!Array.isArray(question.options) || question.options.length < 2) {
    fail(`Frage ${questionId} benötigt mindestens zwei Optionen.`);
  }

  const optionIds: string[] = [];

  for (const option of question.options) {
    if (
      !isRecord(option) ||
      typeof option.id !== "string" ||
      typeof option.label !== "string" ||
      !option.id.trim() ||
      !option.label.trim()
    ) {
      fail(`Frage ${questionId} besitzt eine ungültige Option.`);
    }

    optionIds.push(option.id);
  }

  if (new Set(optionIds).size !== optionIds.length) {
    fail(`Frage ${questionId} besitzt doppelte Options-IDs.`);
  }

  let correctOptionIds: string[];

  if (question.type === "single-choice") {
    if (
      typeof question.correctOptionId !== "string" ||
      !question.correctOptionId.trim()
    ) {
      fail(`Frage ${questionId} besitzt keinen gültigen Lösungsschlüssel.`);
    }

    correctOptionIds = [question.correctOptionId];
  } else {
    if (!Array.isArray(question.correctOptionIds)) {
      fail(`Frage ${questionId} besitzt keinen gültigen Lösungsschlüssel.`);
    }

    correctOptionIds = [];

    for (const optionId of question.correctOptionIds) {
      if (typeof optionId !== "string" || !optionId.trim()) {
        fail(`Frage ${questionId} besitzt keinen gültigen Lösungsschlüssel.`);
      }

      correctOptionIds.push(optionId);
    }

    if (correctOptionIds.length < 2) {
      fail(
        `Multiple-Selection-Frage ${questionId} benötigt mindestens zwei richtige Optionen.`,
      );
    }
  }

  if (
    correctOptionIds.length === 0 ||
    new Set(correctOptionIds).size !== correctOptionIds.length
  ) {
    fail(`Frage ${questionId} besitzt keinen eindeutigen Lösungsschlüssel.`);
  }

  if (correctOptionIds.some((optionId) => !optionIds.includes(optionId))) {
    fail(`Frage ${questionId} referenziert eine unbekannte richtige Option.`);
  }

  if (
    !Array.isArray(question.tags) ||
    question.tags.length === 0 ||
    question.tags.length > 4
  ) {
    fail(`Frage ${questionId} benötigt ein bis vier kontrollierte Tags.`);
  }

  const tags: string[] = [];

  for (const tag of question.tags) {
    if (typeof tag !== "string" || !tag.trim()) {
      fail(`Frage ${questionId} besitzt einen ungültigen Tag.`);
    }

    tags.push(tag);
  }

  if (new Set(tags).size !== tags.length) {
    fail(`Frage ${questionId} besitzt doppelte Tags.`);
  }

  if (tags.some((tag) => !(quizTagIds as readonly string[]).includes(tag))) {
    fail(`Frage ${questionId} besitzt einen unbekannten Tag.`);
  }

  if (typeof question.lessonSlug !== "string" || !question.lessonSlug.trim()) {
    fail(`Frage ${questionId} besitzt keine gültige Lektion.`);
  }
  const lessonSlug = question.lessonSlug;

  const learningModule = learningModules.find(
    (candidate) => candidate.slug === moduleSlug,
  );

  if (!learningModule) {
    fail(`Frage ${questionId} referenziert ein unbekanntes Modul.`);
  }

  const lesson = learningModule.lessons?.find(
    (candidate) => candidate.slug === lessonSlug,
  );

  if (!lesson) {
    fail(`Frage ${questionId} referenziert eine unbekannte Lektion.`);
  }

  if (lesson.status !== "available") {
    fail(`Frage ${questionId} referenziert eine nicht verfügbare Lektion.`);
  }
}

export function assertQuestionBankIntegrity(questionBank: readonly unknown[]) {
  /*
   * Validate every entry before accessing any question properties. This keeps
   * malformed runtime data inside the intentional QuizBankIntegrityError
   * boundary instead of leaking incidental TypeErrors.
   */
  for (const question of questionBank) {
    assertQuestionIntegrity(question);
  }

  const validatedQuestionBank = questionBank as readonly QuestionBankQuestion[];

  const questionIds = validatedQuestionBank.map((question) => question.id);
  if (new Set(questionIds).size !== questionIds.length) {
    fail("Die Question-Bank besitzt doppelte globale Frage-IDs.");
  }

  const registeredModules = new Set<QuizModuleSlug>(mixedAssessmentModuleSlugs);

  for (const moduleSlug of registeredModules) {
    if (!validatedQuestionBank.some((question) => question.moduleSlug === moduleSlug)) {
      fail(`Das registrierte Quizmodul ${moduleSlug} besitzt keine Fragen.`);
    }
  }

  if (
    validatedQuestionBank.some(
      (question) => !registeredModules.has(question.moduleSlug),
    )
  ) {
    fail("Die Question-Bank enthält ein nicht registriertes Modul.");
  }

  if (
    validatedQuestionBank.some(
      (question) => question.practiceEligible && !registeredModules.has(question.moduleSlug),
    )
  ) {
    fail("Eine Übungsfrage gehört zu keinem persistierbaren Praxisquiz-Modul.");
  }

  const usedTags = new Set(
    validatedQuestionBank.flatMap((question) => [...question.tags]),
  );
  const unusedTags = quizTagIds.filter((tag) => !usedTags.has(tag));

  if (unusedTags.length > 0) {
    fail(`Nicht verwendete Quiz-Tags: ${unusedTags.join(", ")}`);
  }

  if (
    Object.values(practiceDifficultyQuota).reduce((total, count) => total + count, 0)
      !== practiceQuestionCount
    || Object.values(practiceQuestionTypeQuota).reduce((total, count) => total + count, 0)
      !== practiceQuestionCount
  ) {
    fail("Die Übungsquiz-Quoten stimmen nicht mit der Fragenanzahl überein.");
  }

  for (const groupId of assessmentGroupIds) {
    const questions = validatedQuestionBank.filter(
      (question) =>
        question.practiceEligible &&
        getAssessmentGroupForModule(question.moduleSlug) === groupId,
    );

    const difficultyCounts = {
      easy: questions.filter((question) => question.difficulty === "easy").length,
      medium: questions.filter((question) => question.difficulty === "medium").length,
      hard: questions.filter((question) => question.difficulty === "hard").length,
    } satisfies Record<QuizDifficulty, number>;
    const typeCounts = {
      "single-choice": questions.filter((question) => question.type === "single-choice").length,
      "multiple-selection": questions.filter(
        (question) => question.type === "multiple-selection",
      ).length,
    };

    if ((Object.keys(practiceDifficultyQuota) as QuizDifficulty[]).some(
      (difficulty) => difficultyCounts[difficulty] < practiceDifficultyQuota[difficulty],
    )) {
      fail(`Lernbereich ${groupId} erfüllt die Schwierigkeitskapazität nicht.`);
    }

    if ((Object.keys(practiceQuestionTypeQuota) as Array<keyof typeof practiceQuestionTypeQuota>).some(
      (type) => typeCounts[type] < practiceQuestionTypeQuota[type],
    )) {
      fail(`Lernbereich ${groupId} erfüllt die Fragetypkapazität nicht.`);
    }
  }
}

export function assertCompletionDefinitionsIntegrity(
  definitions: readonly ModuleCompletionDefinition[],
  questionBank: readonly QuestionBankQuestion[],
) {
  const questionById = new Map(questionBank.map((question) => [question.id, question]));
  const definitionIds = definitions.map((definition) => definition.id);
  const definitionModules = definitions.map((definition) => definition.moduleSlug);
  if (new Set(definitionIds).size !== definitionIds.length) {
    fail("Die Abschlussquiz-Definitionen besitzen doppelte IDs.");
  }
  if (new Set(definitionModules).size !== definitionModules.length) {
    fail("Für ein Modul existieren mehrere Abschlussquiz-Definitionen.");
  }

  const referencedIds: string[] = [];
  for (const definition of definitions) {
    if (!definition.title.trim() || !definition.description.trim() || definition.questionIds.length === 0) {
      fail(`Abschlussquiz ${definition.id} besitzt unvollständige Metadaten.`);
    }
    for (const questionId of definition.questionIds) {
      const question = questionById.get(questionId);
      if (!question) fail(`Abschlussquiz ${definition.id} referenziert die fehlende Frage ${questionId}.`);
      if (question.moduleSlug !== definition.moduleSlug) {
        fail(`Abschlussquiz ${definition.id} referenziert eine Frage aus einem anderen Modul.`);
      }
      if (!question.completionEligible) {
        fail(`Frage ${question.id} ist nicht für ein Abschlussquiz freigegeben.`);
      }
      referencedIds.push(questionId);
    }
  }

  if (new Set(referencedIds).size !== referencedIds.length) {
    fail("Eine Question-Bank-Frage wird in mehreren Abschlussquiz-Positionen verwendet.");
  }
  const expectedIds = questionBank
    .filter((question) => question.completionEligible)
    .map((question) => question.id);
  const missingIds = expectedIds.filter((questionId) => !referencedIds.includes(questionId));
  if (missingIds.length > 0) {
    fail(`Abschlussquiz-Definitionen lassen Fragen aus: ${missingIds.join(", ")}`);
  }
}
