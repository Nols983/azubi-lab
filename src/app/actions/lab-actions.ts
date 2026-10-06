"use server";

import { revalidatePath } from "next/cache";
import type { LabAttemptView } from "../lib/interactive-lab.ts";
import { AuthenticationRequiredError, PasswordChangeRequiredError } from "../lib/server/current-user.ts";
import {
  configureLab,
  getLabActionErrorMessage,
  resetLab,
  revealLabHint,
  runLabCommand,
  selectLabDevice,
  startLab,
} from "../lib/server/lab-service.ts";

export type LabActionResult =
  | { ok: true; attempt: LabAttemptView; message?: string }
  | { ok: false; message: string };

export async function startLabAction(input: unknown) { return perform("start", input, startLab); }
export async function runLabCommandAction(input: unknown) { return perform("command", input, runLabCommand); }
export async function configureLabAction(input: unknown) { return perform("configure", input, configureLab); }
export async function selectLabDeviceAction(input: unknown) { return perform("select device", input, selectLabDevice); }
export async function revealLabHintAction(input: unknown) { return perform("reveal hint", input, revealLabHint); }
export async function resetLabAction(input: unknown) { return perform("reset", input, resetLab); }

async function perform(area: string, input: unknown, operation: (input: unknown) => Promise<LabAttemptView>): Promise<LabActionResult> {
  try {
    const attempt = await operation(input);
    revalidatePath("/labs");
    revalidatePath(`/labs/${attempt.labId}`);
    if (attempt.status === "completed") {
      revalidatePath("/", "layout");
      revalidatePath("/profil");
      revalidatePath("/fortschritt");
    }
    return { ok: true, attempt };
  } catch (error) {
    if (!(error instanceof AuthenticationRequiredError) && !(error instanceof PasswordChangeRequiredError)) {
      console.error(`[azubi-lab] interactive lab ${area} failed`, error instanceof Error ? error.name : "UnknownError");
    }
    return {
      ok: false,
      message: error instanceof AuthenticationRequiredError
        ? "Melde dich an, um Labs zu verwenden."
        : error instanceof PasswordChangeRequiredError
          ? "Ändere zuerst dein temporäres Passwort."
          : getLabActionErrorMessage(error),
    };
  }
}
