"use server";

import { signOut } from "@/auth";
import { getSafeInternalNavigationTarget } from "../lib/internal-navigation";
import { isPasswordLengthValid, hashPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../lib/server/password";
import { changeAccountPassword } from "../lib/server/admin-repository";
import { requireAuthenticatedUser } from "../lib/server/current-user";

export type PasswordChangeActionState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: { password?: string; confirmation?: string };
};

export async function changeForcedPasswordAction(
  _state: PasswordChangeActionState,
  formData: FormData,
): Promise<PasswordChangeActionState> {
  let user;
  try {
    user = await requireAuthenticatedUser({ allowPasswordChange: true });
  } catch (error) {
    console.error("[azubi-lab] forced password authorization failed", error instanceof Error ? error.name : "UnknownError");
    return { status: "error", message: "Die Kontositzung ist nicht mehr gültig. Melde dich erneut an." };
  }
  if (!user.mustChangePassword) {
    return { status: "error", message: "Für dieses Konto ist derzeit kein erzwungener Passwortwechsel offen." };
  }

  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  const callbackUrl = safeRedirectTarget(formData.get("callbackUrl"));
  const fieldErrors: PasswordChangeActionState["fieldErrors"] = {};
  if (!isPasswordLengthValid(password)) {
    fieldErrors.password = `Das neue Passwort muss ${PASSWORD_MIN_LENGTH} bis ${PASSWORD_MAX_LENGTH} Zeichen lang sein.`;
  }
  if (typeof confirmation !== "string" || confirmation !== password) {
    fieldErrors.confirmation = "Die Passwortbestätigung stimmt nicht überein.";
  }
  if (Object.keys(fieldErrors).length > 0 || typeof password !== "string") {
    return { status: "error", message: "Prüfe die markierten Angaben.", fieldErrors };
  }

  try {
    const passwordHash = await hashPassword(password);
    await changeAccountPassword(user.id, user.authVersion, passwordHash);
  } catch (error) {
    console.error("[azubi-lab] forced password change failed", error instanceof Error ? error.name : "UnknownError");
    return { status: "error", message: "Das Passwort konnte nicht geändert werden. Melde dich erneut an und versuche es noch einmal." };
  }

  await signOut({ redirectTo: `/login?passwordChanged=1&callbackUrl=${encodeURIComponent(callbackUrl)}` });
  return { status: "idle", message: "" };
}

function safeRedirectTarget(value: FormDataEntryValue | null) {
  return getSafeInternalNavigationTarget(value, "/konto");
}
