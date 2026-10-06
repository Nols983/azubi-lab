"use server";

import { revalidatePath } from "next/cache";
import { isUuid, parseAccountCreationRole, parseAccountRole, validateLearnerAccountInput } from "../lib/account-security";
import { canChangeAccountRole, canManageAccountStatus } from "../lib/authorization";
import { generateTemporaryPassword, hashPassword } from "../lib/server/password";
import {
  AccountStatusTargetError,
  AccountRoleTargetError,
  changeAccountRole,
  createManagedAccount,
  DuplicateLoginIdentifierError,
  LastUsableAdminError,
  setAccountDisabled,
} from "../lib/server/admin-repository";
import {
  AdminAvatarTargetError,
  removeAccountAvatarAsAdmin,
} from "../lib/server/admin-avatar-service";
import {
  AdminAuthorizationError,
  AuthenticationRequiredError,
  CapabilityAuthorizationError,
  PasswordChangeRequiredError,
  requireAdminUser,
} from "../lib/server/current-user";
import { createPasswordResetLinkAsAdmin } from "../lib/server/password-reset-service";
import { PasswordResetTargetError } from "../lib/server/password-reset-repository";
import { ProfileImageStorageError } from "../lib/server/profile-image";

export type ProvisioningActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: { displayName?: string; login?: string };
  learnerId?: string;
  role?: "learner" | "observer";
  temporaryPassword?: string;
};

export type AdminMutationActionState = {
  status: "idle" | "error" | "success";
  message: string;
  resetUrl?: string;
};

export type AdminAvatarActionState = AdminMutationActionState & {
  avatarRemoved?: boolean;
};

export async function createLearnerAction(
  _state: ProvisioningActionState,
  formData: FormData,
): Promise<ProvisioningActionState> {
  try {
    await requireAdminUser();
    const role = parseAccountCreationRole(formData.get("role"));
    if (!hasOnlyFormFields(formData, ["displayName", "login", "role"]) || !role) {
      return { status: "error", message: "Wähle einen gültigen Kontotyp." };
    }
    const validated = validateLearnerAccountInput(formData.get("displayName"), formData.get("login"));
    if (!validated.valid) {
      return { status: "error", message: "Prüfe die markierten Angaben.", fieldErrors: validated.errors };
    }
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const learner = await createManagedAccount({ ...validated.value, passwordHash, role });
    revalidatePath("/admin");
    return {
      status: "success",
      message: role === "observer" ? "Das Betrachterkonto wurde angelegt." : "Das Lernkonto wurde angelegt.",
      learnerId: learner.id,
      role,
      temporaryPassword,
    };
  } catch (error) {
    if (error instanceof DuplicateLoginIdentifierError) {
      return {
        status: "error",
        message: "Diese Anmeldekennung ist bereits vergeben.",
        fieldErrors: { login: "Wähle eine andere Anmeldekennung." },
      };
    }
    return adminActionFailure("create learner", error);
  }
}

export async function generatePasswordResetLinkAction(
  userId: string,
  _state: AdminMutationActionState,
  _formData: FormData,
): Promise<AdminMutationActionState> {
  void _state;
  void _formData;
  try {
    const resetUrl = await createPasswordResetLinkAsAdmin(userId);
    revalidatePath(`/admin/lernende/${userId}`);
    return {
      status: "success",
      message: "Der einmalige Link wurde erzeugt und wird nur in dieser Ansicht angezeigt.",
      resetUrl,
    };
  } catch (error) {
    if (error instanceof PasswordResetTargetError) return invalidTarget();
    return adminActionFailure("generate password reset link", error);
  }
}

export async function changeAccountRoleAction(
  userId: string,
  _state: AdminMutationActionState,
  formData: FormData,
): Promise<AdminMutationActionState> {
  try {
    const admin = await requireAdminUser();
    const role = parseAccountRole(formData.get("role"));
    if (!hasOnlyFormFields(formData, ["role"]) || !isUuid(userId) || !role || !canChangeAccountRole(admin, { id: userId })) return invalidTarget();
    const changed = await changeAccountRole({ actorId: admin.id, targetUserId: userId, role });
    revalidatePath("/admin");
    revalidatePath("/admin/konten");
    revalidatePath(`/admin/lernende/${userId}`);
    return {
      status: "success",
      message: changed
        ? "Die Rolle wurde geändert. Bestehende Sitzungen dieses Kontos sind nicht mehr gültig."
        : "Die ausgewählte Rolle war bereits gesetzt.",
    };
  } catch (error) {
    if (error instanceof AccountRoleTargetError) return invalidTarget();
    if (error instanceof LastUsableAdminError) {
      return { status: "error", message: "Der letzte nutzbare Administrator darf seine Rolle nicht verlieren." };
    }
    return adminActionFailure("change account role", error);
  }
}

export async function setAccountDisabledAction(
  userId: string,
  disabled: boolean,
  _state: AdminMutationActionState,
  formData: FormData,
): Promise<AdminMutationActionState> {
  try {
    const admin = await requireAdminUser();
    const allowedFields = disabled === true ? ["confirmed"] : [];
    if (
      typeof disabled !== "boolean"
      || !hasOnlyFormFields(formData, allowedFields)
      || !isUuid(userId)
      || !canManageAccountStatus(admin, { id: userId })
    ) return invalidTarget();
    if (disabled && formData.get("confirmed") !== "yes") {
      return { status: "error", message: "Bestätige die Kontosperrung zuerst." };
    }
    const result = await setAccountDisabled({ actorId: admin.id, targetUserId: userId, disabled });
    revalidatePath("/admin");
    revalidatePath("/admin/konten");
    revalidatePath("/admin/lerninhalte");
    if (result.targetRole === "learner") revalidatePath(`/admin/lernende/${userId}`);
    return {
      status: "success",
      message: result.changed
        ? disabled
          ? "Das Konto wurde gesperrt. Bestehende Sitzungen sind nicht mehr gültig."
          : "Das Konto wurde wieder aktiviert."
        : disabled
          ? "Das Konto war bereits gesperrt."
          : "Das Konto war bereits aktiv.",
    };
  } catch (error) {
    if (error instanceof AccountStatusTargetError) return invalidTarget();
    if (error instanceof LastUsableAdminError) {
      return { status: "error", message: "Der letzte nutzbare Administrator darf nicht gesperrt werden." };
    }
    return adminActionFailure("set account status", error);
  }
}

export async function removeAccountProfileImageAction(
  userId: string,
  _state: AdminAvatarActionState,
  formData: FormData,
): Promise<AdminAvatarActionState> {
  void _state;
  try {
    if (!hasOnlyFormFields(formData, [])) return invalidTarget();
    const result = await removeAccountAvatarAsAdmin(userId);
    revalidatePath("/", "layout");
    revalidatePath("/profil");
    revalidatePath("/admin/konten");
    return {
      status: "success",
      avatarRemoved: true,
      message: result.removed
        ? `Das Profilbild von ${result.targetDisplayName} wurde entfernt.`
        : "Für dieses Konto ist kein Profilbild gespeichert.",
    };
  } catch (error) {
    if (error instanceof AdminAvatarTargetError) return invalidTarget();
    if (error instanceof ProfileImageStorageError) {
      return { status: "error", message: "Das Profilbild konnte nicht sicher entfernt werden." };
    }
    return adminActionFailure("remove account profile image", error);
  }
}

function invalidTarget(): AdminMutationActionState {
  return { status: "error", message: "Das ausgewählte Konto wurde nicht gefunden oder darf nicht geändert werden." };
}

function adminActionFailure(area: string, error: unknown): ProvisioningActionState {
  if (
    error instanceof AuthenticationRequiredError
    || error instanceof PasswordChangeRequiredError
    || error instanceof AdminAuthorizationError
    || error instanceof CapabilityAuthorizationError
  ) {
    return { status: "error", message: "Diese Aktion erfordert ein aktuelles Administrationskonto." };
  }
  console.error(`[azubi-lab] ${area} failed`, error instanceof Error ? error.name : "UnknownError");
  return { status: "error", message: "Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut." };
}

function hasOnlyFormFields(formData: FormData, allowed: readonly string[]) {
  const fields = new Set(allowed);
  return [...formData.keys()].every((key) => fields.has(key) || key.startsWith("$ACTION_"));
}
