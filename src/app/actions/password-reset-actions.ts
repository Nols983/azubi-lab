"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  hashPassword,
  isPasswordLengthValid,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "../lib/server/password";
import { isPasswordResetTokenFormat } from "../lib/password-reset-token";
import { resetPasswordWithToken } from "../lib/server/password-reset-service";
import {
  consumePasswordResetAttempt,
  SecurityRateLimitExceededError,
} from "../lib/server/security-rate-limit-service";

export type PasswordResetActionState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: { password?: string; confirmation?: string };
};

export async function resetPasswordAction(
  _state: PasswordResetActionState,
  formData: FormData,
): Promise<PasswordResetActionState> {
  if (!hasOnlyFormFields(formData, ["token", "password", "confirmation"])) {
    return genericFailure();
  }
  const token = formData.get("token");
  if (!isPasswordResetTokenFormat(token)) return genericFailure();
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  const fieldErrors: PasswordResetActionState["fieldErrors"] = {};
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
    await consumePasswordResetAttempt(token, await headers());
    const passwordHash = await hashPassword(password);
    await resetPasswordWithToken({ token, passwordHash });
  } catch (error) {
    if (error instanceof SecurityRateLimitExceededError) {
      return {
        status: "error",
        message: "Zu viele Versuche. Warte kurz und versuche es später erneut.",
      };
    }
    console.error("[azubi-lab] password reset failed", error instanceof Error ? error.name : "UnknownError");
    return genericFailure();
  }
  redirect("/passwort-zuruecksetzen?success=1");
}

function genericFailure(): PasswordResetActionState {
  return {
    status: "error",
    message: "Dieser Link ist ungültig, abgelaufen oder wurde bereits verwendet. Bitte fordere bei der Administration einen neuen Link an.",
  };
}

function hasOnlyFormFields(formData: FormData, allowed: readonly string[]) {
  const fields = new Set(allowed);
  return [...formData.keys()].every((key) => fields.has(key) || key.startsWith("$ACTION_"));
}
