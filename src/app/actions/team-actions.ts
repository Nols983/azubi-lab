"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "../lib/account-security.ts";
import { parseTeamRole, validateTeamInput, type TeamInputErrors } from "../lib/team-domain.ts";
import {
  AuthenticationRequiredError,
  CapabilityAuthorizationError,
  PasswordChangeRequiredError,
  requireCapability,
} from "../lib/server/current-user.ts";
import {
  addTeamMember,
  createTeam,
  removeTeamMember,
  setTeamActive,
  TeamConflictError,
  TeamMemberConflictError,
  TeamMembershipTargetError,
  TeamTargetError,
  updateTeam,
  updateTeamMemberRole,
} from "../lib/server/team-repository.ts";

export type TeamActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: TeamInputErrors;
};

export async function createTeamAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    const admin = await requireCapability("manageTeams");
    if (!hasOnlyFormFields(formData, ["name", "description"])) return invalidTeamInput();
    const validated = validateTeamInput(formData.get("name"), formData.get("description"));
    if (!validated.valid) {
      return { status: "error", message: "Prüfe die markierten Teamangaben.", fieldErrors: validated.errors };
    }
    const team = await createTeam({ ...validated.value, createdByUserId: admin.id });
    revalidateTeamPaths(team.slug);
    return { status: "success", message: `Das Team „${team.name}“ wurde angelegt.` };
  } catch (error) {
    if (error instanceof TeamConflictError) {
      return { status: "error", message: "Ein Team mit diesem Namen oder dieser Team-Adresse existiert bereits." };
    }
    return teamActionFailure("create team", error);
  }
}

export async function updateTeamAction(
  teamId: string,
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    await requireCapability("manageTeams");
    if (!isUuid(teamId) || !hasOnlyFormFields(formData, ["name", "description"])) return invalidTarget();
    const validated = validateTeamInput(formData.get("name"), formData.get("description"));
    if (!validated.valid) {
      return { status: "error", message: "Prüfe die markierten Teamangaben.", fieldErrors: validated.errors };
    }
    const team = await updateTeam(teamId, validated.value);
    revalidateTeamPaths(team.slug);
    return { status: "success", message: "Name und Beschreibung wurden gespeichert." };
  } catch (error) {
    if (error instanceof TeamConflictError) {
      return { status: "error", message: "Ein anderes Team verwendet bereits diesen Namen." };
    }
    if (error instanceof TeamTargetError) return invalidTarget();
    return teamActionFailure("update team", error);
  }
}

export async function setTeamArchivedAction(
  teamId: string,
  archived: boolean,
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    await requireCapability("manageTeams");
    if (!isUuid(teamId) || typeof archived !== "boolean" || !hasOnlyFormFields(formData, [])) return invalidTarget();
    const team = await setTeamActive(teamId, !archived);
    revalidateTeamPaths(team.slug);
    return {
      status: "success",
      message: archived
        ? "Das Team wurde archiviert. Mitgliedschaften und Fortschritt bleiben erhalten."
        : "Das Team wurde wieder aktiviert.",
    };
  } catch (error) {
    if (error instanceof TeamTargetError) return invalidTarget();
    return teamActionFailure("archive team", error);
  }
}

export async function addTeamMemberAction(
  teamId: string,
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    await requireCapability("manageTeams");
    const userId = formData.get("userId");
    const teamRole = parseTeamRole(formData.get("teamRole"));
    if (!isUuid(teamId) || typeof userId !== "string" || !isUuid(userId) || !teamRole
      || !hasOnlyFormFields(formData, ["userId", "teamRole"])) return invalidMembershipInput();
    await addTeamMember(teamId, userId, teamRole);
    revalidateMembershipPaths(userId);
    return { status: "success", message: "Das Mitglied wurde dem Team hinzugefügt." };
  } catch (error) {
    if (error instanceof TeamMemberConflictError) {
      return { status: "error", message: "Dieses Konto gehört bereits zum Team." };
    }
    if (error instanceof TeamTargetError) {
      return { status: "error", message: "Team oder Konto ist nicht verfügbar. Archivierte Teams können keine neuen Mitglieder erhalten." };
    }
    return teamActionFailure("add team member", error);
  }
}

export async function changeTeamMemberRoleAction(
  teamId: string,
  userId: string,
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    await requireCapability("manageTeams");
    const teamRole = parseTeamRole(formData.get("teamRole"));
    if (!isUuid(teamId) || !isUuid(userId) || !teamRole
      || !hasOnlyFormFields(formData, ["teamRole"])) return invalidMembershipInput();
    await updateTeamMemberRole(teamId, userId, teamRole);
    revalidateMembershipPaths(userId);
    return { status: "success", message: "Die Teamrolle wurde gespeichert." };
  } catch (error) {
    if (error instanceof TeamMembershipTargetError) return invalidMembershipInput();
    return teamActionFailure("change team role", error);
  }
}

export async function removeTeamMemberAction(
  teamId: string,
  userId: string,
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    await requireCapability("manageTeams");
    if (!isUuid(teamId) || !isUuid(userId) || !hasOnlyFormFields(formData, [])) return invalidMembershipInput();
    await removeTeamMember(teamId, userId);
    revalidateMembershipPaths(userId);
    return { status: "success", message: "Die Teamzuordnung wurde entfernt. Konto und Lernfortschritt bleiben unverändert." };
  } catch (error) {
    if (error instanceof TeamMembershipTargetError) return invalidMembershipInput();
    return teamActionFailure("remove team member", error);
  }
}

function revalidateTeamPaths(slug: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/teams");
  revalidatePath("/teams");
  revalidatePath(`/teams/${slug}`);
}

function revalidateMembershipPaths(userId: string) {
  revalidatePath("/admin/teams");
  revalidatePath("/teams");
  revalidatePath("/teams", "layout");
  revalidatePath(`/community/${userId}`);
}

function invalidTeamInput(): TeamActionState {
  return { status: "error", message: "Die Teamangaben sind ungültig." };
}

function invalidMembershipInput(): TeamActionState {
  return { status: "error", message: "Die Teamzuordnung wurde nicht gefunden oder ist ungültig." };
}

function invalidTarget(): TeamActionState {
  return { status: "error", message: "Das Team wurde nicht gefunden oder darf nicht geändert werden." };
}

function teamActionFailure(area: string, error: unknown): TeamActionState {
  if (error instanceof AuthenticationRequiredError
    || error instanceof PasswordChangeRequiredError
    || error instanceof CapabilityAuthorizationError) {
    return { status: "error", message: "Diese Aktion erfordert ein aktuelles Administrationskonto." };
  }
  console.error(`[azubi-lab] ${area} failed`, error instanceof Error ? error.name : "UnknownError");
  return { status: "error", message: "Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut." };
}

function hasOnlyFormFields(formData: FormData, allowed: readonly string[]) {
  const fields = new Set(allowed);
  return [...formData.keys()].every((key) => fields.has(key) || key.startsWith("$ACTION_"));
}
