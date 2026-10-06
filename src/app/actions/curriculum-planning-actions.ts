"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "../lib/account-security.ts";
import {
  validateCurriculumAssignmentInput,
  validateCurriculumAssignmentUpdate,
} from "../lib/curriculum-planning.ts";
import {
  CurriculumAssignmentLearnerInvalidError,
  CurriculumAssignmentModuleInvalidError,
  CurriculumAssignmentNotFoundError,
  DuplicateCurriculumAssignmentError,
} from "../lib/server/curriculum-assignment-repository.ts";
import {
  archiveCurriculumAssignmentAsAdmin,
  assignCurriculumModulesAsAdmin,
  CurriculumPlanningTargetError,
  updateCurriculumAssignmentAsAdmin,
} from "../lib/server/curriculum-planning-service.ts";
import {
  AuthenticationRequiredError,
  CapabilityAuthorizationError,
  PasswordChangeRequiredError,
  requireCapability,
} from "../lib/server/current-user.ts";

export type CurriculumPlanningActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: { moduleSlugs?: string; targetAt?: string; note?: string };
};

export async function assignCurriculumModulesAction(
  learnerId: string,
  _state: CurriculumPlanningActionState,
  formData: FormData,
): Promise<CurriculumPlanningActionState> {
  try {
    await requireCapability("manageAssignments");
    if (!isUuid(learnerId)) return invalidPlanningTarget();
    if (!hasOnlyFormFields(formData, ["moduleSlugs", "targetAtLocal", "targetAtIso", "note"])) {
      return { status: "error", message: "Die Lernplan-Zuweisung enthält unerwartete Felder." };
    }
    const validated = validateCurriculumAssignmentInput({
      moduleSlugs: formData.getAll("moduleSlugs"),
      targetAtIso: formData.get("targetAtIso"),
      targetAtLocal: formData.get("targetAtLocal"),
      note: formData.get("note"),
    });
    if (!validated.valid) return { status: "error", message: "Prüfe die Lernplan-Zuweisung.", fieldErrors: validated.errors };
    const ids = await assignCurriculumModulesAsAdmin({ learnerId, ...validated.value });
    revalidatePlanningViews(learnerId);
    return {
      status: "success",
      message: ids.length === 1
        ? "Das Modul wurde dem Lernplan zugewiesen."
        : `${ids.length} Module wurden dem Lernplan zugewiesen.`,
    };
  } catch (error) {
    if (error instanceof DuplicateCurriculumAssignmentError) {
      return { status: "error", message: "Mindestens eines der ausgewählten Module ist bereits aktiv zugewiesen." };
    }
    if (error instanceof CurriculumAssignmentLearnerInvalidError) {
      return { status: "error", message: "Das Lernkonto ist gesperrt, nicht vorhanden oder kein Lernkonto." };
    }
    if (error instanceof CurriculumAssignmentModuleInvalidError) {
      return { status: "error", message: "Mindestens ein ausgewähltes Modul gehört nicht zum kanonischen Lehrplan." };
    }
    return planningFailure("assign curriculum", error);
  }
}

export async function updateCurriculumAssignmentAction(
  assignmentId: string,
  _state: CurriculumPlanningActionState,
  formData: FormData,
): Promise<CurriculumPlanningActionState> {
  try {
    await requireCapability("manageAssignments");
    if (!isUuid(assignmentId)) return invalidPlanningTarget();
    if (!hasOnlyFormFields(formData, ["targetAtLocal", "targetAtIso", "note"])) {
      return { status: "error", message: "Die Lernplan-Änderung enthält unerwartete Felder." };
    }
    const validated = validateCurriculumAssignmentUpdate({
      targetAtIso: formData.get("targetAtIso"),
      targetAtLocal: formData.get("targetAtLocal"),
      note: formData.get("note"),
    });
    if (!validated.valid) return { status: "error", message: "Prüfe Zieltermin und Hinweis.", fieldErrors: validated.errors };
    const learnerId = await updateCurriculumAssignmentAsAdmin({ assignmentId, ...validated.value });
    revalidatePlanningViews(learnerId);
    return { status: "success", message: "Die Lernplan-Zuweisung wurde aktualisiert." };
  } catch (error) {
    if (error instanceof CurriculumAssignmentNotFoundError || error instanceof CurriculumPlanningTargetError) return invalidPlanningTarget();
    return planningFailure("update curriculum", error);
  }
}

export async function archiveCurriculumAssignmentAction(
  assignmentId: string,
  _state: CurriculumPlanningActionState,
  formData: FormData,
): Promise<CurriculumPlanningActionState> {
  try {
    await requireCapability("manageAssignments");
    if (!isUuid(assignmentId)) return invalidPlanningTarget();
    if (!hasOnlyFormFields(formData, [])) {
      return { status: "error", message: "Die Lernplan-Änderung enthält unerwartete Felder." };
    }
    const learnerId = await archiveCurriculumAssignmentAsAdmin(assignmentId);
    revalidatePlanningViews(learnerId);
    return { status: "success", message: "Das Modul wurde aus dem aktiven Lernplan entfernt. Der Lernfortschritt bleibt erhalten." };
  } catch (error) {
    if (error instanceof CurriculumAssignmentNotFoundError || error instanceof CurriculumPlanningTargetError) return invalidPlanningTarget();
    return planningFailure("archive curriculum", error);
  }
}

function revalidatePlanningViews(learnerId: string) {
  revalidatePath("/");
  revalidatePath("/lernplan");
  revalidatePath("/admin");
  revalidatePath(`/admin/lernende/${learnerId}`);
  revalidatePath("/admin/lerninhalte");
  revalidatePath("/admin/lerninhalte/[moduleSlug]", "page");
}

function invalidPlanningTarget(): CurriculumPlanningActionState {
  return { status: "error", message: "Die Lernplan-Zuweisung wurde nicht gefunden." };
}

function planningFailure(area: string, error: unknown): CurriculumPlanningActionState {
  if (
    error instanceof AuthenticationRequiredError
    || error instanceof PasswordChangeRequiredError
    || error instanceof CapabilityAuthorizationError
  ) {
    return { status: "error", message: "Diese Aktion erfordert ein aktuelles Administrationskonto." };
  }
  console.error(`[azubi-lab] ${area} failed`, error instanceof Error ? error.name : "UnknownError");
  return { status: "error", message: "Die Lernplan-Änderung konnte nicht gespeichert werden. Bitte versuche es erneut." };
}

function hasOnlyFormFields(formData: FormData, allowed: readonly string[]) {
  const allowedFields = new Set(allowed);
  return [...formData.keys()].every((key) => allowedFields.has(key) || key.startsWith("$ACTION_"));
}
