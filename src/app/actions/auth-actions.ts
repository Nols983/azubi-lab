"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";
import { getSafeInternalNavigationTarget } from "../lib/internal-navigation";

export type LoginActionState = { message: string };

export async function loginAction(_state: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const login = formData.get("login");
  const password = formData.get("password");
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"));
  if (typeof login !== "string" || typeof password !== "string" || !login.trim() || !password) {
    return { message: "Anmeldung fehlgeschlagen. Prüfe deine Zugangsdaten." };
  }
  try {
    const passwordGate = `/konto/passwort-aendern?callbackUrl=${encodeURIComponent(redirectTo)}`;
    await signIn("credentials", { login: login.trim(), password, redirectTo: passwordGate });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "rate_limited") {
      return { message: "Zu viele Anmeldeversuche. Warte kurz und versuche es später erneut." };
    }
    if (error instanceof AuthError) {
      return { message: "Anmeldung fehlgeschlagen. Prüfe deine Zugangsdaten." };
    }
    throw error;
  }
  return { message: "" };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

function safeRedirectTarget(value: FormDataEntryValue | null) {
  return getSafeInternalNavigationTarget(value, "/");
}
