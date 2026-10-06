"use server";

import { revalidatePath } from "next/cache";
import {
  MAX_PINNED_BADGES,
} from "../lib/progression-rewards.ts";
import {
  AuthenticationRequiredError,
  PasswordChangeRequiredError,
  requireAuthenticatedUser,
} from "../lib/server/current-user.ts";
import {
  LocalFilesystemProfileImageStorage,
  processProfileImage,
  ProfileImageStorageError,
  ProfileImageValidationError,
} from "../lib/server/profile-image.ts";
import {
  LockedProfileRewardError,
  ProfileBadgeAuthorizationError,
  ProfileTitleAuthorizationError,
  selectProfileActiveTitle,
  updateProfilePinnedBadges,
} from "../lib/server/reward-service.ts";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function uploadProfileImageAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireAuthenticatedUser();
    if (!hasOnlyFields(formData, ["profileImage"])) return invalidRequest();
    const file = formData.get("profileImage");
    if (!(file instanceof File)) return { status: "error", message: "Wähle ein Profilbild aus." };
    const processed = await processProfileImage(file);
    await new LocalFilesystemProfileImageStorage().replace(user.id, processed);
    revalidateProfileViews();
    return { status: "success", message: "Dein Profilbild wurde gespeichert." };
  } catch (error) {
    return profileActionFailure("upload profile image", error);
  }
}

export async function deleteProfileImageAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireAuthenticatedUser();
    if (!hasOnlyFields(formData, [])) return invalidRequest();
    await new LocalFilesystemProfileImageStorage().delete(user.id);
    revalidateProfileViews();
    return { status: "success", message: "Dein Profilbild wurde entfernt." };
  } catch (error) {
    return profileActionFailure("delete profile image", error);
  }
}

export async function selectActiveTitleAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireAuthenticatedUser();
    if (!hasOnlyFields(formData, ["titleId"])) return invalidRequest();
    const value = formData.get("titleId");
    if (typeof value !== "string" || value.length > 80) return invalidRequest();
    await selectProfileActiveTitle(user, value || undefined);
    revalidateProfileViews();
    return {
      status: "success",
      message: value
        ? "Dein aktiver Titel wurde gespeichert."
        : user.role === "learner"
          ? "Der höchste Leveltitel wird automatisch angezeigt."
          : "Der kosmetische Titel wurde entfernt.",
    };
  } catch (error) {
    return profileActionFailure("select active title", error);
  }
}

export async function updatePinnedBadgesAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireAuthenticatedUser();
    if (!businessFieldKeys(formData).every((key) => key === "badgeId")) return invalidRequest();
    const badgeIds = formData.getAll("badgeId");
    if (badgeIds.length > MAX_PINNED_BADGES || badgeIds.some((id) => typeof id !== "string" || id.length > 80)) return invalidRequest();
    await updateProfilePinnedBadges(user, badgeIds as string[]);
    revalidateProfileViews();
    return { status: "success", message: "Deine angehefteten Abzeichen wurden gespeichert." };
  } catch (error) {
    return profileActionFailure("update pinned badges", error);
  }
}

function revalidateProfileViews() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/profil");
  revalidatePath("/fortschritt");
}

function profileActionFailure(area: string, error: unknown): ProfileActionState {
  if (error instanceof ProfileImageValidationError) return { status: "error", message: error.message };
  if (error instanceof ProfileImageStorageError) return { status: "error", message: "Das Profilbild konnte gerade nicht sicher gespeichert werden. Bitte versuche es später erneut." };
  if (error instanceof LockedProfileRewardError) return { status: "error", message: "Diese Belohnung ist für dein Profil noch nicht freigeschaltet." };
  if (error instanceof ProfileBadgeAuthorizationError) return { status: "error", message: "Für dieses Konto stehen keine kosmetischen Abzeichen zur Auswahl." };
  if (error instanceof ProfileTitleAuthorizationError) return { status: "error", message: "Für dieses Konto stehen keine kosmetischen Titel zur Auswahl." };
  if (error instanceof AuthenticationRequiredError) return { status: "error", message: "Melde dich erneut an, um dein Profil zu ändern." };
  if (error instanceof PasswordChangeRequiredError) return { status: "error", message: "Ändere zuerst dein temporäres Passwort." };
  console.error(`[azubi-lab] ${area} failed`, error instanceof Error ? error.name : "UnknownError");
  return { status: "error", message: "Die Profiländerung konnte nicht gespeichert werden. Bitte versuche es erneut." };
}

function invalidRequest(): ProfileActionState {
  return { status: "error", message: "Die Profilanfrage ist ungültig." };
}

function hasOnlyFields(formData: FormData, allowedFields: readonly string[]) {
  const allowed = new Set(allowedFields);
  const keys = businessFieldKeys(formData);
  return keys.length === allowedFields.length && keys.every((key) => allowed.has(key));
}

function businessFieldKeys(formData: FormData) {
  return [...formData.keys()].filter((key) => !key.startsWith("$ACTION_"));
}
