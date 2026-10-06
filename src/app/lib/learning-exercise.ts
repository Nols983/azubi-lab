export type ExerciseTarget = {
  id: string;
  label: string;
};

export type ExerciseOption = {
  id: string;
  label: string;
  feedback: string;
};

type ExerciseBase = {
  id: string;
  moduleSlug: string;
  lessonSlug: string;
  title: string;
  instruction: string;
  successExplanation: string;
  retryHint: string;
};

export type AssignmentExercise = ExerciseBase & {
  type: "assignment";
  targets: readonly ExerciseTarget[];
  items: readonly {
    id: string;
    label: string;
    correctTargetId: string;
    feedback: string;
  }[];
};

export type SequenceExercise = ExerciseBase & {
  type: "sequence";
  items: readonly { id: string; label: string }[];
  correctItemIds: readonly string[];
  positionHints: readonly string[];
};

export type SingleChoiceExercise = ExerciseBase & {
  type: "single-choice";
  options: readonly ExerciseOption[];
  correctOptionId: string;
};

export type MultipleSelectionExercise = ExerciseBase & {
  type: "multiple-selection";
  options: readonly ExerciseOption[];
  correctOptionIds: readonly string[];
};

export type LearningExercise = AssignmentExercise | SequenceExercise | SingleChoiceExercise | MultipleSelectionExercise;

export type LearningExerciseAnswer =
  | { type: "assignment"; assignments: Record<string, string> }
  | { type: "sequence"; itemIds: string[] }
  | { type: "single-choice"; selectedOptionIds: string[] }
  | { type: "multiple-selection"; selectedOptionIds: string[] };

export type LearningExerciseGrade = {
  status: "incomplete" | "incorrect" | "correct";
  correctCount: number;
  totalCount: number;
  incorrectKeys: readonly string[];
};

export function createEmptyLearningExerciseAnswer(exercise: LearningExercise): LearningExerciseAnswer {
  if (exercise.type === "assignment") return { type: exercise.type, assignments: {} };
  if (exercise.type === "sequence") return { type: exercise.type, itemIds: exercise.items.map(() => "") };
  return { type: exercise.type, selectedOptionIds: [] };
}

export function gradeLearningExercise(exercise: LearningExercise, answer: LearningExerciseAnswer): LearningExerciseGrade {
  if (exercise.type !== answer.type) throw new TypeError(`Answer type does not match exercise ${exercise.id}.`);

  if (exercise.type === "assignment" && answer.type === "assignment") {
    const incomplete = exercise.items.some((item) => !answer.assignments[item.id]);
    const incorrectKeys = exercise.items
      .filter((item) => answer.assignments[item.id] !== item.correctTargetId)
      .map((item) => item.id);
    return gradeFrom(incomplete, exercise.items.length - incorrectKeys.length, exercise.items.length, incorrectKeys);
  }

  if (exercise.type === "sequence" && answer.type === "sequence") {
    const incomplete = answer.itemIds.length !== exercise.correctItemIds.length || answer.itemIds.some((id) => !id);
    const incorrectKeys = exercise.correctItemIds
      .map((correctId, index) => answer.itemIds[index] === correctId ? "" : `position-${index}`)
      .filter(Boolean);
    return gradeFrom(incomplete, exercise.correctItemIds.length - incorrectKeys.length, exercise.correctItemIds.length, incorrectKeys);
  }

  if (exercise.type === "single-choice" && answer.type === "single-choice") {
    const selected = answer.selectedOptionIds[0];
    const incorrectKeys = selected === exercise.correctOptionId ? [] : selected ? [selected] : [exercise.correctOptionId];
    return gradeFrom(!selected, selected === exercise.correctOptionId ? 1 : 0, 1, incorrectKeys);
  }

  if (exercise.type === "multiple-selection" && answer.type === "multiple-selection") {
    const selected = new Set(answer.selectedOptionIds);
    const correct = new Set(exercise.correctOptionIds);
    const incorrectKeys = exercise.options
      .filter((option) => selected.has(option.id) !== correct.has(option.id))
      .map((option) => option.id);
    return gradeFrom(selected.size === 0, exercise.options.length - incorrectKeys.length, exercise.options.length, incorrectKeys);
  }

  throw new TypeError(`Unsupported exercise answer for ${exercise.id}.`);
}

function gradeFrom(incomplete: boolean, correctCount: number, totalCount: number, incorrectKeys: readonly string[]): LearningExerciseGrade {
  return {
    status: incomplete ? "incomplete" : incorrectKeys.length === 0 ? "correct" : "incorrect",
    correctCount,
    totalCount,
    incorrectKeys,
  };
}

export function validateLearningExercises(exercises: readonly LearningExercise[]): string[] {
  const errors: string[] = [];
  const exerciseIds = new Set<string>();

  for (const exercise of exercises) {
    if (!isNonEmpty(exercise.id) || exerciseIds.has(exercise.id)) errors.push(`Exercise ID is empty or duplicated: ${exercise.id || "<empty>"}.`);
    exerciseIds.add(exercise.id);
    for (const [field, value] of Object.entries({ moduleSlug: exercise.moduleSlug, lessonSlug: exercise.lessonSlug, title: exercise.title, instruction: exercise.instruction, successExplanation: exercise.successExplanation, retryHint: exercise.retryHint })) {
      if (!isNonEmpty(value)) errors.push(`${exercise.id}: ${field} must not be empty.`);
    }

    if (exercise.type === "assignment") {
      const targetIds = validateIdentifiedValues(exercise.id, "target", exercise.targets, errors);
      validateIdentifiedValues(exercise.id, "item", exercise.items, errors);
      if (exercise.targets.length < 2 || exercise.items.length < 2) errors.push(`${exercise.id}: assignment exercises need at least two targets and items.`);
      for (const item of exercise.items) {
        if (!targetIds.has(item.correctTargetId)) errors.push(`${exercise.id}: item ${item.id} references unknown target ${item.correctTargetId}.`);
        if (!isNonEmpty(item.feedback)) errors.push(`${exercise.id}: item ${item.id} needs feedback.`);
      }
    } else if (exercise.type === "sequence") {
      const itemIds = validateIdentifiedValues(exercise.id, "item", exercise.items, errors);
      const correctIds = new Set(exercise.correctItemIds);
      if (exercise.items.length < 2) errors.push(`${exercise.id}: sequence exercises need at least two items.`);
      if (correctIds.size !== exercise.correctItemIds.length || correctIds.size !== itemIds.size || [...correctIds].some((id) => !itemIds.has(id))) errors.push(`${exercise.id}: correct sequence must contain every item exactly once.`);
      if (exercise.positionHints.length !== exercise.items.length || exercise.positionHints.some((hint) => !isNonEmpty(hint))) errors.push(`${exercise.id}: every sequence position needs a hint.`);
    } else {
      const optionIds = validateIdentifiedValues(exercise.id, "option", exercise.options, errors);
      if (exercise.options.length < 2) errors.push(`${exercise.id}: choice exercises need at least two options.`);
      if (exercise.options.some((option) => !isNonEmpty(option.feedback))) errors.push(`${exercise.id}: every option needs feedback.`);
      const correctIds = exercise.type === "single-choice" ? [exercise.correctOptionId] : exercise.correctOptionIds;
      if (correctIds.length === 0 || new Set(correctIds).size !== correctIds.length || correctIds.some((id) => !optionIds.has(id))) errors.push(`${exercise.id}: correct option references are invalid.`);
    }
  }

  return errors;
}

export function assertValidLearningExercises(exercises: readonly LearningExercise[]) {
  const errors = validateLearningExercises(exercises);
  if (errors.length > 0) throw new TypeError(`Invalid learning exercises:\n${errors.join("\n")}`);
}

function validateIdentifiedValues(exerciseId: string, label: string, values: readonly { id: string; label: string }[], errors: string[]) {
  const ids = new Set<string>();
  for (const value of values) {
    if (!isNonEmpty(value.id) || ids.has(value.id)) errors.push(`${exerciseId}: ${label} ID is empty or duplicated: ${value.id || "<empty>"}.`);
    if (!isNonEmpty(value.label)) errors.push(`${exerciseId}: ${label} ${value.id || "<empty>"} needs a label.`);
    ids.add(value.id);
  }
  return ids;
}

function isNonEmpty(value: string) {
  return value.trim().length > 0;
}
