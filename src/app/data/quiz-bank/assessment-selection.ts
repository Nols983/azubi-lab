import {
  getAssessmentGroupForModule,
  getAssessmentModulesForGroup,
  type AssessmentGroupId,
  type QuizModuleSlug,
} from "./categories.ts";
import type { QuestionBankQuestion, QuizDifficulty } from "./types.ts";

export type RandomSource = () => number;

type QuestionType = QuestionBankQuestion["type"];
type Counts = {
  difficulty: Record<QuizDifficulty, number>;
  type: Record<QuestionType, number>;
};

type ModuleTarget = {
  moduleSlug: QuizModuleSlug;
  count: number;
  candidates: QuestionBankQuestion[];
};

export class AssessmentSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssessmentSelectionError";
  }
}

export function selectBalancedAssessmentQuestions(input: {
  groupIds: readonly AssessmentGroupId[];
  questionCount: number;
  difficultyQuota: Readonly<Record<QuizDifficulty, number>>;
  typeQuota: Readonly<Record<QuestionType, number>>;
  questionPool: readonly QuestionBankQuestion[];
  random: RandomSource;
}) {
  assertInput(input);
  const eligiblePool = input.questionPool.filter((question) =>
    question.practiceEligible
    && input.groupIds.includes(getAssessmentGroupForModule(question.moduleSlug)),
  );
  const targets = buildModuleTargets(
    input.groupIds,
    input.questionCount,
    eligiblePool,
    input.random,
  );
  const exact = solveExactSelection(
    targets,
    input.questionCount,
    input.difficultyQuota,
    input.typeQuota,
  );
  const selected = exact ?? selectDeterministicFallback(
    targets,
    input.difficultyQuota,
    input.typeQuota,
  );

  if (selected.length !== input.questionCount
    || new Set(selected.map((question) => question.id)).size !== input.questionCount
    || selected.some((question) =>
      !input.groupIds.includes(getAssessmentGroupForModule(question.moduleSlug)))) {
    throw new AssessmentSelectionError("Der angeforderte Fragenmix kann nicht gebildet werden.");
  }

  return {
    questions: shuffle(selected, input.random),
    usedExactQuotas: Boolean(exact),
  };
}

function assertInput(input: {
  groupIds: readonly AssessmentGroupId[];
  questionCount: number;
  difficultyQuota: Readonly<Record<QuizDifficulty, number>>;
  typeQuota: Readonly<Record<QuestionType, number>>;
  random: RandomSource;
}) {
  if (!Number.isInteger(input.questionCount) || input.questionCount < 1
    || input.groupIds.length < 1
    || new Set(input.groupIds).size !== input.groupIds.length
    || Object.values(input.difficultyQuota).reduce((sum, value) => sum + value, 0) !== input.questionCount
    || Object.values(input.typeQuota).reduce((sum, value) => sum + value, 0) !== input.questionCount) {
    throw new AssessmentSelectionError("Die Auswahlkonfiguration ist ungültig.");
  }
  drawRandom(input.random);
}

function buildModuleTargets(
  groupIds: readonly AssessmentGroupId[],
  questionCount: number,
  questionPool: readonly QuestionBankQuestion[],
  random: RandomSource,
) {
  return allocateBalanced(groupIds, questionCount, random).flatMap(({ value: groupId, count }) => {
    const moduleSlugs = getAssessmentModulesForGroup(groupId);
    const capacities = new Map(moduleSlugs.map((moduleSlug) => [
      moduleSlug,
      questionPool.filter((question) => question.moduleSlug === moduleSlug).length,
    ]));
    return allocateWithCapacity(moduleSlugs, count, capacities, random).map(({ value: moduleSlug, count: moduleCount }) => ({
      moduleSlug,
      count: moduleCount,
      candidates: shuffle(
        questionPool.filter((question) => question.moduleSlug === moduleSlug),
        random,
      ),
    }));
  });
}

function allocateBalanced<T>(values: readonly T[], count: number, random: RandomSource) {
  const ordered = shuffle(values, random);
  const base = Math.floor(count / ordered.length);
  const extra = count % ordered.length;
  return ordered.map((value, index) => ({
    value,
    count: base + (index < extra ? 1 : 0),
  }));
}

function allocateWithCapacity<T>(
  values: readonly T[],
  count: number,
  capacities: ReadonlyMap<T, number>,
  random: RandomSource,
) {
  const allocations = allocateBalanced(values, count, random).map((allocation, index) => ({
    ...allocation,
    index,
    count: Math.min(allocation.count, capacities.get(allocation.value) ?? 0),
  }));
  let remaining = count - allocations.reduce((sum, allocation) => sum + allocation.count, 0);
  while (remaining > 0) {
    const target = allocations
      .filter((allocation) => allocation.count < (capacities.get(allocation.value) ?? 0))
      .sort((left, right) => left.count - right.count || left.index - right.index)[0];
    if (!target) throw new AssessmentSelectionError("Der gewählte Lernbereich enthält nicht genügend Fragen.");
    target.count += 1;
    remaining -= 1;
  }
  return allocations;
}

function solveExactSelection(
  targets: readonly ModuleTarget[],
  questionCount: number,
  difficultyQuota: Readonly<Record<QuizDifficulty, number>>,
  typeQuota: Readonly<Record<QuestionType, number>>,
) {
  const selected: QuestionBankQuestion[] = [];
  const failedStates = new Set<string>();
  const remaining: Counts = {
    difficulty: { ...difficultyQuota },
    type: { ...typeQuota },
  };

  function visit(targetIndex: number, candidateIndex: number, needed: number): boolean {
    const stateKey = [
      targetIndex,
      candidateIndex,
      needed,
      remaining.difficulty.easy,
      remaining.difficulty.medium,
      remaining.difficulty.hard,
      remaining.type["single-choice"],
      remaining.type["multiple-selection"],
    ].join(":");
    if (failedStates.has(stateKey)) return false;

    if (targetIndex === targets.length) {
      return selected.length === questionCount
        && Object.values(remaining.difficulty).every((value) => value === 0)
        && Object.values(remaining.type).every((value) => value === 0);
    }

    const target = targets[targetIndex];
    if (needed === 0) {
      const solved = visit(targetIndex + 1, 0, targets[targetIndex + 1]?.count ?? 0);
      if (!solved) failedStates.add(stateKey);
      return solved;
    }
    if (target.candidates.length - candidateIndex < needed) {
      failedStates.add(stateKey);
      return false;
    }

    for (let index = candidateIndex; index <= target.candidates.length - needed; index += 1) {
      const question = target.candidates[index];
      if (remaining.difficulty[question.difficulty] < 1 || remaining.type[question.type] < 1) continue;
      selected.push(question);
      remaining.difficulty[question.difficulty] -= 1;
      remaining.type[question.type] -= 1;
      if (hasGlobalCapacity(targets, targetIndex, index + 1, remaining)
        && visit(targetIndex, index + 1, needed - 1)) return true;
      remaining.type[question.type] += 1;
      remaining.difficulty[question.difficulty] += 1;
      selected.pop();
    }
    failedStates.add(stateKey);
    return false;
  }

  return visit(0, 0, targets[0]?.count ?? 0) ? selected : undefined;
}

function hasGlobalCapacity(
  targets: readonly ModuleTarget[],
  targetIndex: number,
  candidateIndex: number,
  remaining: Counts,
) {
  const available = [
    ...targets[targetIndex].candidates.slice(candidateIndex),
    ...targets.slice(targetIndex + 1).flatMap((target) => target.candidates),
  ];
  return (Object.keys(remaining.difficulty) as QuizDifficulty[]).every(
    (difficulty) => available.filter((question) => question.difficulty === difficulty).length
      >= remaining.difficulty[difficulty],
  ) && (Object.keys(remaining.type) as QuestionType[]).every(
    (type) => available.filter((question) => question.type === type).length >= remaining.type[type],
  );
}

function selectDeterministicFallback(
  targets: readonly ModuleTarget[],
  difficultyQuota: Readonly<Record<QuizDifficulty, number>>,
  typeQuota: Readonly<Record<QuestionType, number>>,
) {
  const selected: QuestionBankQuestion[] = [];
  const counts: Counts = {
    difficulty: { easy: 0, medium: 0, hard: 0 },
    type: { "single-choice": 0, "multiple-selection": 0 },
  };
  for (const target of targets) {
    const available = [...target.candidates];
    for (let index = 0; index < target.count; index += 1) {
      available.sort((left, right) =>
        fallbackScore(right, counts, difficultyQuota, typeQuota)
        - fallbackScore(left, counts, difficultyQuota, typeQuota));
      const question = available.shift();
      if (!question) throw new AssessmentSelectionError("Der gewählte Lernbereich enthält nicht genügend Fragen.");
      selected.push(question);
      counts.difficulty[question.difficulty] += 1;
      counts.type[question.type] += 1;
    }
  }
  return selected;
}

function fallbackScore(
  question: QuestionBankQuestion,
  counts: Counts,
  difficultyQuota: Readonly<Record<QuizDifficulty, number>>,
  typeQuota: Readonly<Record<QuestionType, number>>,
) {
  return Math.max(0, difficultyQuota[question.difficulty] - counts.difficulty[question.difficulty])
    + Math.max(0, typeQuota[question.type] - counts.type[question.type]);
}

function drawRandom(random: RandomSource) {
  let value: number;
  try {
    value = random();
  } catch {
    throw new AssessmentSelectionError("Die Zufallsquelle konnte keinen Wert liefern.");
  }
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new AssessmentSelectionError("Die Zufallsquelle muss einen Wert zwischen 0 und 1 liefern.");
  }
  return value;
}

function shuffle<T>(values: readonly T[], random: RandomSource) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(drawRandom(random) * (index + 1));
    [shuffled[index], shuffled[otherIndex]] = [shuffled[otherIndex], shuffled[index]];
  }
  return shuffled;
}
