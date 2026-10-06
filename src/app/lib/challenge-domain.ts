import { isUuid } from "./account-security.ts";

export const CHALLENGE_STATUSES = ["draft", "published", "archived"] as const;
export const CHALLENGE_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const CHALLENGE_REVIEW_DECISIONS = ["approved", "revision-requested"] as const;

export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];
export type ChallengeDifficulty = (typeof CHALLENGE_DIFFICULTIES)[number];
export type ChallengeReviewDecision = (typeof CHALLENGE_REVIEW_DECISIONS)[number];
export type AssignmentStatus = "not-started" | "in-progress" | "submitted" | "revision-requested" | "approved" | "legacy-completed";

export const CHALLENGE_TITLE_MAX_LENGTH = 120;
export const CHALLENGE_DESCRIPTION_MAX_LENGTH = 300;
export const CHALLENGE_INSTRUCTIONS_MAX_LENGTH = 10_000;
export const CHALLENGE_ESTIMATED_MINUTES_MAX = 1_440;
export const CHALLENGE_SUBMISSION_MAX_LENGTH = 20_000;
export const CHALLENGE_REVIEW_FEEDBACK_MAX_LENGTH = 10_000;
export const CHALLENGE_COMMENT_MAX_LENGTH = 5_000;
export const CHALLENGE_RUBRIC_MAX_CRITERIA = 10;
export const CHALLENGE_RUBRIC_TITLE_MAX_LENGTH = 120;
export const CHALLENGE_RUBRIC_DESCRIPTION_MAX_LENGTH = 1_000;
export const CHALLENGE_RUBRIC_MAX_POINTS_PER_CRITERION = 20;
export const CHALLENGE_RUBRIC_MAX_TOTAL_POINTS = 100;

export type RubricCriterionInput = {
  title: string;
  description: string;
  maxPoints: number;
};

export type RubricScoreInput = {
  criterionId: string;
  awardedPoints: number;
};

export type ChallengeInput = {
  title: string;
  shortDescription: string;
  instructions: string;
  difficulty: ChallengeDifficulty | null;
  estimatedMinutes: number | null;
  status: ChallengeStatus;
  rubricCriteria: RubricCriterionInput[];
};

export type ChallengeValidationResult =
  | { valid: true; value: ChallengeInput }
  | {
      valid: false;
      errors: Partial<Record<"title" | "shortDescription" | "instructions" | "difficulty" | "estimatedMinutes" | "status" | "rubric", string>>;
    };

export function parseChallengeStatus(value: unknown): ChallengeStatus | undefined {
  return typeof value === "string" && CHALLENGE_STATUSES.includes(value as ChallengeStatus)
    ? value as ChallengeStatus
    : undefined;
}

export function parseChallengeDifficulty(value: unknown): ChallengeDifficulty | null | undefined {
  if (value === "" || value === null || value === undefined) return null;
  return typeof value === "string" && CHALLENGE_DIFFICULTIES.includes(value as ChallengeDifficulty)
    ? value as ChallengeDifficulty
    : undefined;
}

export function validateChallengeInput(input: {
  title: unknown;
  shortDescription: unknown;
  instructions: unknown;
  difficulty: unknown;
  estimatedMinutes: unknown;
  status: unknown;
  rubricCriteria?: readonly { title: unknown; description: unknown; maxPoints: unknown }[];
}): ChallengeValidationResult {
  const title = normalizeSingleLine(input.title);
  const shortDescription = normalizeSingleLine(input.shortDescription);
  const instructions = typeof input.instructions === "string" ? input.instructions.trim() : "";
  const difficulty = parseChallengeDifficulty(input.difficulty);
  const status = parseChallengeStatus(input.status);
  const estimatedMinutes = parseEstimatedMinutes(input.estimatedMinutes);
  const rubric = validateRubricCriteria(input.rubricCriteria ?? []);
  const errors: Extract<ChallengeValidationResult, { valid: false }>["errors"] = {};

  if (title.length < 3 || title.length > CHALLENGE_TITLE_MAX_LENGTH) {
    errors.title = `Der Titel muss 3 bis ${CHALLENGE_TITLE_MAX_LENGTH} Zeichen lang sein.`;
  }
  if (shortDescription.length < 3 || shortDescription.length > CHALLENGE_DESCRIPTION_MAX_LENGTH) {
    errors.shortDescription = `Die Kurzbeschreibung muss 3 bis ${CHALLENGE_DESCRIPTION_MAX_LENGTH} Zeichen lang sein.`;
  }
  if (!instructions || instructions.length > CHALLENGE_INSTRUCTIONS_MAX_LENGTH) {
    errors.instructions = `Die Anleitung muss 1 bis ${CHALLENGE_INSTRUCTIONS_MAX_LENGTH.toLocaleString("de-DE")} Zeichen lang sein.`;
  }
  if (difficulty === undefined) errors.difficulty = "Wähle einen gültigen Schwierigkeitsgrad oder keine Angabe.";
  if (estimatedMinutes === undefined) {
    errors.estimatedMinutes = `Die Dauer muss eine ganze Zahl zwischen 1 und ${CHALLENGE_ESTIMATED_MINUTES_MAX} sein.`;
  }
  if (!status) errors.status = "Wähle einen gültigen Veröffentlichungsstatus.";
  if (!rubric.valid) errors.rubric = rubric.error;

  return Object.keys(errors).length > 0 || difficulty === undefined || estimatedMinutes === undefined || !status || !rubric.valid
    ? { valid: false, errors }
    : { valid: true, value: { title, shortDescription, instructions, difficulty, estimatedMinutes, status, rubricCriteria: rubric.value } };
}

export function validateAssignmentInput(input: {
  learnerIds: readonly unknown[];
  dueAtIso: unknown;
  dueAtLocal: unknown;
}) {
  const learnerIds = [...new Set(input.learnerIds.filter((value): value is string => typeof value === "string"))];
  const errors: { learnerIds?: string; dueAt?: string } = {};
  if (learnerIds.length === 0 || learnerIds.some((value) => !isUuid(value))) {
    errors.learnerIds = "Wähle mindestens ein gültiges aktives Lernkonto aus.";
  }

  const localDueWasEntered = typeof input.dueAtLocal === "string" && input.dueAtLocal.trim() !== "";
  const dueAt = parseDueAt(input.dueAtIso);
  if (dueAt === undefined || (localDueWasEntered && dueAt === null)) {
    errors.dueAt = "Prüfe Fälligkeitsdatum und lokale Uhrzeit.";
  }

  return Object.keys(errors).length > 0 || dueAt === undefined
    ? { valid: false as const, errors }
    : { valid: true as const, value: { learnerIds, dueAt } };
}

export function validateSubmissionInput(input: { content: unknown }) {
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (!content || content.length > CHALLENGE_SUBMISSION_MAX_LENGTH) {
    return {
      valid: false as const,
      errors: { content: `Die Abgabe muss 1 bis ${CHALLENGE_SUBMISSION_MAX_LENGTH.toLocaleString("de-DE")} Zeichen lang sein.` },
    };
  }
  return { valid: true as const, value: { content } };
}

export function validateReviewInput(input: { decision: unknown; feedback: unknown }) {
  const decision = typeof input.decision === "string" && CHALLENGE_REVIEW_DECISIONS.includes(input.decision as ChallengeReviewDecision)
    ? input.decision as ChallengeReviewDecision
    : undefined;
  const feedback = typeof input.feedback === "string" ? input.feedback.trim() : "";
  const errors: { decision?: string; feedback?: string } = {};
  if (!decision) errors.decision = "Wähle eine gültige Review-Entscheidung.";
  if (feedback.length > CHALLENGE_REVIEW_FEEDBACK_MAX_LENGTH) {
    errors.feedback = `Das Feedback darf höchstens ${CHALLENGE_REVIEW_FEEDBACK_MAX_LENGTH.toLocaleString("de-DE")} Zeichen lang sein.`;
  } else if (decision === "revision-requested" && !feedback) {
    errors.feedback = "Für eine Überarbeitung ist konkretes Feedback erforderlich.";
  }
  return Object.keys(errors).length > 0 || !decision
    ? { valid: false as const, errors }
    : { valid: true as const, value: { decision, feedback } };
}

export function validateCommentInput(input: { body: unknown }) {
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!body || body.length > CHALLENGE_COMMENT_MAX_LENGTH) {
    return {
      valid: false as const,
      errors: { body: `Der Kommentar muss 1 bis ${CHALLENGE_COMMENT_MAX_LENGTH.toLocaleString("de-DE")} Zeichen lang sein.` },
    };
  }
  return { valid: true as const, value: { body } };
}

export function validateRubricScoreInput(entries: readonly { criterionId: unknown; awardedPoints: unknown }[]) {
  const values: RubricScoreInput[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (typeof entry.criterionId !== "string" || !isUuid(entry.criterionId) || seen.has(entry.criterionId)) {
      return { valid: false as const, error: "Die Rubrikbewertung enthält ungültige oder doppelte Kriterien." };
    }
    if (typeof entry.awardedPoints !== "string" || !/^\d+$/.test(entry.awardedPoints)) {
      return { valid: false as const, error: "Trage für jedes Rubrikkriterium eine ganze Punktzahl ein." };
    }
    const awardedPoints = Number(entry.awardedPoints);
    if (!Number.isSafeInteger(awardedPoints) || awardedPoints < 0) {
      return { valid: false as const, error: "Rubrikpunkte müssen nicht-negative ganze Zahlen sein." };
    }
    seen.add(entry.criterionId);
    values.push({ criterionId: entry.criterionId, awardedPoints });
  }
  return { valid: true as const, value: values };
}

export function deriveAssignmentStatus(assignment: {
  startedAt: Date | string | null;
  legacyCompletedAt: Date | string | null;
  latestReviewDecision: ChallengeReviewDecision | null;
  hasSubmission: boolean;
}): AssignmentStatus {
  if (assignment.legacyCompletedAt) return "legacy-completed";
  if (!assignment.hasSubmission) return assignment.startedAt ? "in-progress" : "not-started";
  if (assignment.latestReviewDecision === "approved") return "approved";
  if (assignment.latestReviewDecision === "revision-requested") return "revision-requested";
  return "submitted";
}

export function isAssignmentOverdue(
  assignment: { dueAt: Date | string | null; status: AssignmentStatus },
  now: Date = new Date(),
) {
  return Boolean(
    assignment.dueAt
    && new Date(assignment.dueAt).getTime() < now.getTime()
    && assignment.status !== "submitted"
    && assignment.status !== "approved"
    && assignment.status !== "legacy-completed",
  );
}

export function wasSubmittedAfterDue(assignment: { submittedAt: Date | string | null; dueAt: Date | string | null }) {
  return Boolean(
    assignment.submittedAt
    && assignment.dueAt
    && new Date(assignment.submittedAt).getTime() > new Date(assignment.dueAt).getTime(),
  );
}

function normalizeSingleLine(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function validateRubricCriteria(criteria: readonly { title: unknown; description: unknown; maxPoints: unknown }[]) {
  if (criteria.length > CHALLENGE_RUBRIC_MAX_CRITERIA) {
    return { valid: false as const, error: `Eine Challenge darf höchstens ${CHALLENGE_RUBRIC_MAX_CRITERIA} Kriterien enthalten.` };
  }
  const values: RubricCriterionInput[] = [];
  let totalPoints = 0;
  for (const [index, criterion] of criteria.entries()) {
    const title = normalizeSingleLine(criterion.title);
    const description = typeof criterion.description === "string" ? criterion.description.trim() : "";
    const maxPoints = parseInteger(criterion.maxPoints);
    if (!title || title.length > CHALLENGE_RUBRIC_TITLE_MAX_LENGTH) {
      return { valid: false as const, error: `Kriterium ${index + 1}: Der Titel muss 1 bis ${CHALLENGE_RUBRIC_TITLE_MAX_LENGTH} Zeichen lang sein.` };
    }
    if (description.length > CHALLENGE_RUBRIC_DESCRIPTION_MAX_LENGTH) {
      return { valid: false as const, error: `Kriterium ${index + 1}: Die Beschreibung ist zu lang.` };
    }
    if (maxPoints === undefined || maxPoints < 1 || maxPoints > CHALLENGE_RUBRIC_MAX_POINTS_PER_CRITERION) {
      return { valid: false as const, error: `Kriterium ${index + 1}: Erlaubt sind 1 bis ${CHALLENGE_RUBRIC_MAX_POINTS_PER_CRITERION} Punkte.` };
    }
    totalPoints += maxPoints;
    values.push({ title, description, maxPoints });
  }
  if (totalPoints > CHALLENGE_RUBRIC_MAX_TOTAL_POINTS) {
    return { valid: false as const, error: `Die Rubrik darf insgesamt höchstens ${CHALLENGE_RUBRIC_MAX_TOTAL_POINTS} Punkte enthalten.` };
  }
  return { valid: true as const, value: values };
}

function parseInteger(value: unknown) {
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : undefined;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseEstimatedMinutes(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= CHALLENGE_ESTIMATED_MINUTES_MAX
    ? parsed
    : undefined;
}

function parseDueAt(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
