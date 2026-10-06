import { getLearningModule, learningModules, type LearningModule } from "../data/learning-modules.ts";
import { quizzes } from "../data/quizzes.ts";
import { getModuleProgress, type LearnerProgressState, type LearnerStatus, type ModuleActivitySummary } from "./learner-progress.ts";

export const CURRICULUM_ASSIGNMENT_NOTE_MAX_LENGTH = 1_000;
export const CURRICULUM_ASSIGNMENT_MIN_YEAR = 2000;
export const CURRICULUM_ASSIGNMENT_MAX_YEAR = 2100;

export type CurriculumAssignmentInput = {
  moduleSlugs: string[];
  targetAt: Date | null;
  note: string | null;
};

export type CurriculumPlanningStatus = LearnerStatus;

export type CurriculumAssignmentView = {
  id: string;
  learnerId: string;
  module: LearningModule;
  assignedBy: { id: string; displayName: string };
  assignedAt: Date;
  targetAt: Date | null;
  note: string | null;
  archivedAt: Date | null;
  updatedAt: Date;
  progress: ModuleActivitySummary;
  status: CurriculumPlanningStatus;
  isOverdue: boolean;
};

export type CurriculumAssignmentSource = Omit<CurriculumAssignmentView, "module" | "progress" | "status" | "isOverdue"> & {
  moduleSlug: string;
};

const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export function buildCurriculumAssignmentViews(
  assignments: readonly CurriculumAssignmentSource[],
  state: LearnerProgressState,
  now: Date = new Date(),
) {
  const views = assignments.flatMap((assignment): CurriculumAssignmentView[] => {
    const learningModule = getLearningModule(assignment.moduleSlug);
    if (!learningModule) return [];
    const progress = getModuleProgress(state, learningModule, quizModuleSlugs.has(learningModule.slug));
    return [{
      id: assignment.id,
      learnerId: assignment.learnerId,
      module: learningModule,
      assignedBy: assignment.assignedBy,
      assignedAt: assignment.assignedAt,
      targetAt: assignment.targetAt,
      note: assignment.note,
      archivedAt: assignment.archivedAt,
      updatedAt: assignment.updatedAt,
      progress,
      ...deriveCurriculumPlanningState(progress, assignment.targetAt, now),
    }];
  });
  return sortCurriculumAssignmentViews(views);
}

export function validateCurriculumAssignmentInput(input: {
  moduleSlugs: readonly unknown[];
  targetAtIso: unknown;
  targetAtLocal: unknown;
  note: unknown;
}) {
  const moduleSlugs = [...new Set(input.moduleSlugs.filter((value): value is string => typeof value === "string"))];
  const canonicalSlugs = new Set(learningModules.map((learningModule) => learningModule.slug));
  const errors: { moduleSlugs?: string; targetAt?: string; note?: string } = {};
  if (moduleSlugs.length === 0 || moduleSlugs.length > learningModules.length || moduleSlugs.some((slug) => !canonicalSlugs.has(slug))) {
    errors.moduleSlugs = "Wähle mindestens ein gültiges kanonisches Lernmodul aus.";
  }

  const localTargetWasEntered = typeof input.targetAtLocal === "string" && input.targetAtLocal.trim() !== "";
  const targetAt = parseCurriculumTargetAt(input.targetAtIso);
  if (targetAt === undefined || (localTargetWasEntered && targetAt === null)) {
    errors.targetAt = `Der Zieltermin muss ein gültiger Zeitpunkt zwischen ${CURRICULUM_ASSIGNMENT_MIN_YEAR} und ${CURRICULUM_ASSIGNMENT_MAX_YEAR} sein.`;
  }

  const note = normalizePlanningNote(input.note);
  if (note === undefined) {
    errors.note = `Der Hinweis darf höchstens ${CURRICULUM_ASSIGNMENT_NOTE_MAX_LENGTH.toLocaleString("de-DE")} Zeichen lang sein.`;
  }

  return Object.keys(errors).length > 0 || targetAt === undefined || note === undefined
    ? { valid: false as const, errors }
    : { valid: true as const, value: { moduleSlugs, targetAt, note } satisfies CurriculumAssignmentInput };
}

export function validateCurriculumAssignmentUpdate(input: {
  targetAtIso: unknown;
  targetAtLocal: unknown;
  note: unknown;
}) {
  const validated = validateCurriculumAssignmentInput({ ...input, moduleSlugs: [learningModules[0].slug] });
  if (!validated.valid) {
    const { moduleSlugs: _moduleSlugs, ...errors } = validated.errors;
    void _moduleSlugs;
    return { valid: false as const, errors };
  }
  return { valid: true as const, value: { targetAt: validated.value.targetAt, note: validated.value.note } };
}

export function deriveCurriculumPlanningState(
  progress: ModuleActivitySummary,
  targetAt: Date | string | null,
  now: Date = new Date(),
) {
  const isOverdue = Boolean(
    targetAt
    && progress.status !== "completed"
    && new Date(targetAt).getTime() < now.getTime(),
  );
  return { status: progress.status, isOverdue };
}

export function sortCurriculumAssignmentViews(assignments: readonly CurriculumAssignmentView[]) {
  return [...assignments].sort((left, right) => {
    const priorityDifference = planningPriority(left) - planningPriority(right);
    if (priorityDifference) return priorityDifference;
    const targetDifference = (left.targetAt?.getTime() ?? Number.POSITIVE_INFINITY)
      - (right.targetAt?.getTime() ?? Number.POSITIVE_INFINITY);
    if (targetDifference) return targetDifference;
    const assignedDifference = left.assignedAt.getTime() - right.assignedAt.getTime();
    if (assignedDifference) return assignedDifference;
    return canonicalModuleOrder(left.module.slug) - canonicalModuleOrder(right.module.slug)
      || left.id.localeCompare(right.id);
  });
}

export function parseCurriculumTargetAt(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const year = parsed.getUTCFullYear();
  return year >= CURRICULUM_ASSIGNMENT_MIN_YEAR && year <= CURRICULUM_ASSIGNMENT_MAX_YEAR ? parsed : undefined;
}

function normalizePlanningNote(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const note = value.trim();
  if (!note) return null;
  return note.length <= CURRICULUM_ASSIGNMENT_NOTE_MAX_LENGTH ? note : undefined;
}

function planningPriority(assignment: CurriculumAssignmentView) {
  if (assignment.status === "completed") return 3;
  if (assignment.isOverdue) return 0;
  if (assignment.targetAt) return 1;
  return 2;
}

function canonicalModuleOrder(moduleSlug: string) {
  const index = learningModules.findIndex((learningModule) => learningModule.slug === moduleSlug);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}
