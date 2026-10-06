"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "../lib/account-security";
import {
  validateAssignmentInput,
  validateChallengeInput,
  validateCommentInput,
  validateReviewInput,
  validateRubricScoreInput,
  validateSubmissionInput,
} from "../lib/challenge-domain";
import {
  AssignmentLearnerInvalidError,
  ChallengeAssignmentNotFoundError,
  ChallengeNotAssignableError,
  DuplicateChallengeAssignmentError,
} from "../lib/server/challenge-assignment-repository";
import { ChallengeNotFoundError } from "../lib/server/challenge-repository";
import {
  ReviewSubmissionNotFoundError,
  RubricScoreValidationError,
  SubmissionAlreadyReviewedError,
} from "../lib/server/challenge-review-repository";
import { CommentAssignmentNotFoundError } from "../lib/server/challenge-comment-repository";
import { EvidenceValidationError } from "../lib/server/evidence-file-validation";
import {
  EvidenceStorageConfigurationError,
  EvidenceStorageOperationError,
} from "../lib/server/evidence-storage";
import {
  LegacyAssignmentCompletedError,
  SubmissionAlreadyApprovedError,
  SubmissionAssignmentNotFoundError,
  SubmissionPendingReviewError,
} from "../lib/server/challenge-submission-repository";
import {
  assignChallengeAsAdmin,
  addAdminComment,
  addOwnedLearnerComment,
  createChallengeAsAdmin,
  reviewSubmissionAsAdmin,
  startOwnedLearnerAssignment,
  submitOwnedLearnerAssignment,
  updateChallengeAsAdmin,
} from "../lib/server/challenge-service";
import {
  AuthenticationRequiredError,
  CapabilityAuthorizationError,
  LearnerAuthorizationError,
  PasswordChangeRequiredError,
  requireCapability,
  requireLearnerUser,
} from "../lib/server/current-user";

export type ChallengeActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Partial<Record<"title" | "shortDescription" | "instructions" | "difficulty" | "estimatedMinutes" | "status" | "rubric", string>>;
  challengeId?: string;
};

export type AssignmentActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: { learnerIds?: string; dueAt?: string };
};

export type SubmissionActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: { content?: string; evidence?: string };
};

export type ReviewActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: { decision?: string; feedback?: string; scores?: string };
};

export type CommentActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: { body?: string };
};

export async function createChallengeAction(
  _state: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  try {
    await requireCapability("manageChallenges");
    const validated = validateChallengeForm(formData);
    if (!validated.valid) return { status: "error", message: "Prüfe die markierten Angaben.", fieldErrors: validated.errors };
    const challengeId = await createChallengeAsAdmin(validated.value);
    revalidatePath("/admin/challenges");
    return { status: "success", message: "Die Challenge wurde angelegt.", challengeId };
  } catch (error) {
    return challengeActionFailure("create challenge", error);
  }
}

export async function updateChallengeAction(
  challengeId: string,
  _state: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  try {
    await requireCapability("manageChallenges");
    if (!isUuid(challengeId)) return challengeNotFound();
    const validated = validateChallengeForm(formData);
    if (!validated.valid) return { status: "error", message: "Prüfe die markierten Angaben.", fieldErrors: validated.errors };
    await updateChallengeAsAdmin(challengeId, validated.value);
    revalidatePath("/admin/challenges");
    revalidatePath(`/admin/challenges/${challengeId}`);
    revalidatePath("/challenges");
    revalidatePath("/");
    return { status: "success", message: "Die Challenge wurde aktualisiert." };
  } catch (error) {
    if (error instanceof ChallengeNotFoundError) return challengeNotFound();
    return challengeActionFailure("update challenge", error);
  }
}

export async function assignChallengeAction(
  challengeId: string,
  _state: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  try {
    await requireCapability("manageAssignments");
    if (!isUuid(challengeId)) return { status: "error", message: "Die Challenge wurde nicht gefunden." };
    const validated = validateAssignmentInput({
      learnerIds: formData.getAll("learnerIds"),
      dueAtIso: formData.get("dueAtIso"),
      dueAtLocal: formData.get("dueAtLocal"),
    });
    if (!validated.valid) return { status: "error", message: "Prüfe die Zuweisung.", fieldErrors: validated.errors };
    const assignmentIds = await assignChallengeAsAdmin({ challengeId, ...validated.value });
    revalidatePath("/admin/challenges");
    revalidatePath(`/admin/challenges/${challengeId}`);
    revalidatePath("/admin");
    revalidatePath("/challenges");
    revalidatePath("/");
    return {
      status: "success",
      message: assignmentIds.length === 1
        ? "Die Challenge wurde einem Lernkonto zugewiesen."
        : `Die Challenge wurde ${assignmentIds.length} Lernkonten zugewiesen.`,
    };
  } catch (error) {
    if (error instanceof DuplicateChallengeAssignmentError) {
      return { status: "error", message: "Mindestens ein ausgewähltes Lernkonto hat diese Challenge bereits." };
    }
    if (error instanceof AssignmentLearnerInvalidError) {
      return { status: "error", message: "Mindestens ein Lernkonto ist nicht mehr aktiv oder nicht verfügbar." };
    }
    if (error instanceof ChallengeNotAssignableError) {
      return { status: "error", message: "Nur veröffentlichte Challenges können neu zugewiesen werden." };
    }
    return assignmentActionFailure("assign challenge", error);
  }
}

export async function startChallengeAssignmentAction(assignmentId: string) {
  try {
    await requireLearnerUser();
    if (!isUuid(assignmentId)) return { ok: false as const, message: "Challenge-Zuweisung nicht gefunden." };
    await startOwnedLearnerAssignment(assignmentId);
    revalidateLearnerAssignment(assignmentId);
    return { ok: true as const };
  } catch (error) {
    return learnerMutationFailure("start assignment", error);
  }
}

export async function submitChallengeAssignmentAction(
  assignmentId: string,
  _state: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  try {
    await requireLearnerUser();
    if (!isUuid(assignmentId)) return assignmentNotFound();
    if (!hasOnlyFormFields(formData, ["content", "evidence"])) return { status: "error", message: "Die Abgabe enthält unerwartete Felder." };
    const validated = validateSubmissionInput({ content: formData.get("content") });
    if (!validated.valid) return { status: "error", message: "Prüfe deine Abgabe.", fieldErrors: validated.errors };
    await submitOwnedLearnerAssignment(assignmentId, validated.value.content, formData.getAll("evidence"));
    revalidateLearnerAssignment(assignmentId);
    revalidatePath("/benachrichtigungen");
    return { status: "success", message: "Deine Abgabe wurde gespeichert und wartet auf Review." };
  } catch (error) {
    if (error instanceof SubmissionPendingReviewError) return { status: "error", message: "Die aktuelle Abgabe wartet bereits auf Review." };
    if (error instanceof SubmissionAlreadyApprovedError) return { status: "error", message: "Diese Challenge wurde bereits freigegeben." };
    if (error instanceof LegacyAssignmentCompletedError) return { status: "error", message: "Diese frühere Zuweisung ist bereits als abgeschlossen dokumentiert." };
    if (error instanceof EvidenceValidationError) return { status: "error", message: "Prüfe deine Nachweise.", fieldErrors: { evidence: error.message } };
    if (error instanceof EvidenceStorageConfigurationError || error instanceof EvidenceStorageOperationError) {
      return { status: "error", message: "Die Nachweise konnten nicht sicher gespeichert werden. Bitte versuche es später erneut." };
    }
    const failure = learnerMutationFailure("submit assignment", error);
    return { status: "error", message: failure.message };
  }
}

export async function reviewChallengeSubmissionAction(
  submissionId: string,
  _state: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  try {
    await requireCapability("reviewSubmissions");
    if (!isUuid(submissionId)) return { status: "error", message: "Abgabe nicht gefunden." };
    if (!hasOnlyFormFields(formData, ["decision", "feedback"], ["rubricScore:"])) return { status: "error", message: "Das Review enthält unerwartete Felder." };
    const validated = validateReviewInput({ decision: formData.get("decision"), feedback: formData.get("feedback") });
    if (!validated.valid) return { status: "error", message: "Prüfe die Review-Angaben.", fieldErrors: validated.errors };
    const scores = validateRubricScoreInput([...formData.entries()]
      .filter(([key]) => key.startsWith("rubricScore:"))
      .map(([key, value]) => ({ criterionId: key.slice("rubricScore:".length), awardedPoints: value })));
    if (!scores.valid) return { status: "error", message: "Prüfe die Rubrikbewertung.", fieldErrors: { scores: scores.error } };
    await reviewSubmissionAsAdmin({ submissionId, ...validated.value, scores: scores.value });
    if (validated.value.decision === "approved") revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/fortschritt");
    revalidatePath("/challenges");
    revalidatePath("/admin");
    revalidatePath("/admin/challenges");
    revalidatePath(`/admin/challenges/abgaben/${submissionId}`);
    revalidatePath("/benachrichtigungen");
    return {
      status: "success",
      message: validated.value.decision === "approved"
        ? "Die Abgabe wurde freigegeben."
        : "Die Überarbeitung wurde mit Feedback angefordert.",
    };
  } catch (error) {
    if (error instanceof ReviewSubmissionNotFoundError) return { status: "error", message: "Abgabe nicht gefunden." };
    if (error instanceof SubmissionAlreadyReviewedError) return { status: "error", message: "Diese Abgabe wurde bereits unveränderlich geprüft." };
    if (error instanceof RubricScoreValidationError) return { status: "error", message: "Prüfe die Rubrikbewertung.", fieldErrors: { scores: "Bewerte jedes aktuelle Kriterium mit einer zulässigen ganzen Punktzahl." } };
    if (isCurrentUserError(error)) return { status: "error", message: "Diese Aktion erfordert ein aktuelles Administrationskonto." };
    console.error("[azubi-lab] review submission failed", error instanceof Error ? error.name : "UnknownError");
    return { status: "error", message: "Das Review konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }
}

export async function addLearnerChallengeCommentAction(
  assignmentId: string,
  _state: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  try {
    await requireLearnerUser();
    if (!isUuid(assignmentId)) return commentNotFound();
    if (!hasOnlyFormFields(formData, ["body"])) return { status: "error", message: "Der Kommentar enthält unerwartete Felder." };
    const validated = validateCommentInput({ body: formData.get("body") });
    if (!validated.valid) return { status: "error", message: "Prüfe deinen Kommentar.", fieldErrors: validated.errors };
    await addOwnedLearnerComment(assignmentId, validated.value.body);
    revalidatePath(`/challenges/${assignmentId}`);
    return { status: "success", message: "Dein Kommentar wurde hinzugefügt." };
  } catch (error) {
    return commentFailure("learner comment", error, "learner");
  }
}

export async function addAdminChallengeCommentAction(
  assignmentId: string,
  _state: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  try {
    await requireCapability("reviewSubmissions");
    if (!isUuid(assignmentId)) return commentNotFound();
    if (!hasOnlyFormFields(formData, ["body"])) return { status: "error", message: "Der Kommentar enthält unerwartete Felder." };
    const validated = validateCommentInput({ body: formData.get("body") });
    if (!validated.valid) return { status: "error", message: "Prüfe den Kommentar.", fieldErrors: validated.errors };
    await addAdminComment(assignmentId, validated.value.body);
    revalidatePath("/admin/challenges/abgaben/[submissionId]", "page");
    revalidatePath(`/challenges/${assignmentId}`);
    return { status: "success", message: "Der Trainer-Kommentar wurde hinzugefügt." };
  } catch (error) {
    return commentFailure("admin comment", error, "admin");
  }
}

function validateChallengeForm(formData: FormData) {
  const rubricTitles = formData.getAll("rubricTitle");
  const rubricDescriptions = formData.getAll("rubricDescription");
  const rubricMaxPoints = formData.getAll("rubricMaxPoints");
  return validateChallengeInput({
    title: formData.get("title"),
    shortDescription: formData.get("shortDescription"),
    instructions: formData.get("instructions"),
    difficulty: formData.get("difficulty"),
    estimatedMinutes: formData.get("estimatedMinutes"),
    status: formData.get("status"),
    rubricCriteria: rubricTitles.map((title, index) => ({
      title,
      description: rubricDescriptions[index],
      maxPoints: rubricMaxPoints[index],
    })),
  });
}

function challengeNotFound(): ChallengeActionState {
  return { status: "error", message: "Die Challenge wurde nicht gefunden." };
}

function assignmentNotFound(): SubmissionActionState {
  return { status: "error", message: "Challenge-Zuweisung nicht gefunden." };
}

function commentNotFound(): CommentActionState {
  return { status: "error", message: "Challenge-Zuweisung nicht gefunden." };
}

function challengeActionFailure(area: string, error: unknown): ChallengeActionState {
  if (isCurrentUserError(error)) return { status: "error", message: "Diese Aktion erfordert ein aktuelles Administrationskonto." };
  console.error(`[azubi-lab] ${area} failed`, error instanceof Error ? error.name : "UnknownError");
  return { status: "error", message: "Die Challenge konnte nicht gespeichert werden. Bitte versuche es erneut." };
}

function assignmentActionFailure(area: string, error: unknown): AssignmentActionState {
  if (isCurrentUserError(error)) return { status: "error", message: "Diese Aktion erfordert ein aktuelles Administrationskonto." };
  console.error(`[azubi-lab] ${area} failed`, error instanceof Error ? error.name : "UnknownError");
  return { status: "error", message: "Die Zuweisung konnte nicht gespeichert werden. Bitte versuche es erneut." };
}

function learnerMutationFailure(area: string, error: unknown) {
  if (error instanceof ChallengeAssignmentNotFoundError || error instanceof SubmissionAssignmentNotFoundError) {
    return { ok: false as const, message: "Challenge-Zuweisung nicht gefunden." };
  }
  if (isCurrentUserError(error) || error instanceof LearnerAuthorizationError) {
    return { ok: false as const, message: "Diese Aktion erfordert ein aktuelles Lernkonto." };
  }
  console.error(`[azubi-lab] ${area} failed`, error instanceof Error ? error.name : "UnknownError");
  return { ok: false as const, message: "Der Challenge-Status konnte nicht gespeichert werden." };
}

function commentFailure(area: string, error: unknown, audience: "learner" | "admin"): CommentActionState {
  if (error instanceof CommentAssignmentNotFoundError) return commentNotFound();
  if (isCurrentUserError(error) || error instanceof LearnerAuthorizationError) {
    return {
      status: "error",
      message: audience === "admin"
        ? "Diese Aktion erfordert ein aktuelles Administrationskonto."
        : "Diese Aktion erfordert ein aktuelles Lernkonto.",
    };
  }
  console.error(`[azubi-lab] ${area} failed`, error instanceof Error ? error.name : "UnknownError");
  return { status: "error", message: "Der Kommentar konnte nicht gespeichert werden. Bitte versuche es erneut." };
}

function isCurrentUserError(error: unknown) {
  return error instanceof AuthenticationRequiredError
    || error instanceof PasswordChangeRequiredError
    || error instanceof CapabilityAuthorizationError;
}

function revalidateLearnerAssignment(assignmentId: string) {
  revalidatePath("/");
  revalidatePath("/challenges");
  revalidatePath(`/challenges/${assignmentId}`);
  revalidatePath("/admin/challenges");
  revalidatePath("/admin");
}

function hasOnlyFormFields(formData: FormData, allowed: readonly string[], allowedPrefixes: readonly string[] = []) {
  const allowedFields = new Set(allowed);
  return [...formData.keys()].every((key) => allowedFields.has(key)
    || key.startsWith("$ACTION_")
    || allowedPrefixes.some((prefix) => key.startsWith(prefix)));
}
