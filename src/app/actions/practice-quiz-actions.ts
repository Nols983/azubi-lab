"use server";

import { revalidatePath } from "next/cache";
import type { CompletedPracticeAttemptPageView } from "../lib/practice-quiz-attempt.ts";
import { PracticeAttemptValidationError } from "../lib/server/practice-quiz-attempt-domain.ts";
import { PracticeAttemptNotFoundError } from "../lib/server/practice-quiz-attempt-repository.ts";
import {
  completePracticeQuizAttempt,
  createPracticeQuizAttempt,
  PracticeAttemptRequestError,
  restartPracticeQuizAttempt,
} from "../lib/server/practice-quiz-attempt-service.ts";
import {
  AuthenticationRequiredError,
  CapabilityAuthorizationError,
  PasswordChangeRequiredError,
} from "../lib/server/current-user.ts";

export type CreatePracticeQuizActionState = {
  status: "idle" | "error" | "success";
  message: string;
  attemptId?: string;
};

export type CompletePracticeQuizActionResult =
  | { ok: true; attempt: CompletedPracticeAttemptPageView }
  | { ok: false; message: string };

export async function createPracticeQuizAction(
  _state: CreatePracticeQuizActionState,
  formData: FormData,
): Promise<CreatePracticeQuizActionState> {
  if (!hasOnlyFormFields(formData, ["categoryIds"])) {
    return { status: "error", message: "Die Quiz-Auswahl enthält unerwartete Angaben." };
  }
  return createAttempt(formData.getAll("categoryIds"));
}

export async function restartPracticeQuizAction(
  completedAttemptId: unknown,
): Promise<CreatePracticeQuizActionState> {
  try {
    const attempt = await restartPracticeQuizAttempt(completedAttemptId);
    return {
      status: "success",
      message: "Das Quiz wurde erstellt.",
      attemptId: attempt.id,
    };
  } catch (error) {
    if (error instanceof PracticeAttemptRequestError) {
      return { status: "error", message: "Nur ein abgeschlossenes Quiz kann mit gleicher Auswahl neu gestartet werden." };
    }
    if (error instanceof PracticeAttemptNotFoundError) {
      return { status: "error", message: "Dieses Quiz ist nicht mehr verfügbar." };
    }
    const failure = actionFailure("restart practice quiz", error);
    return { status: "error", message: failure.message };
  }
}

export async function completePracticeQuizAction(
  input: unknown,
): Promise<CompletePracticeQuizActionResult> {
  try {
    const attempt = await completePracticeQuizAttempt(input);
    if (attempt.status !== "completed") {
      return { ok: false, message: "Das Quiz konnte nicht vollständig ausgewertet werden." };
    }
    revalidatePath(`/quiz/${attempt.id}`);
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/fortschritt");
    return { ok: true, attempt };
  } catch (error) {
    if (error instanceof PracticeAttemptRequestError
      || error instanceof PracticeAttemptValidationError) {
      return { ok: false, message: "Die Antworten sind unvollständig oder ungültig. Prüfe das Quiz und versuche es erneut." };
    }
    if (error instanceof PracticeAttemptNotFoundError) {
      return { ok: false, message: "Dieses Quiz ist nicht mehr verfügbar." };
    }
    return actionFailure("complete practice quiz", error);
  }
}

async function createAttempt(selectedCategoryIds: unknown): Promise<CreatePracticeQuizActionState> {
  try {
    const attempt = await createPracticeQuizAttempt({ categoryIds: selectedCategoryIds });
    return {
      status: "success",
      message: "Das Quiz wurde erstellt.",
      attemptId: attempt.id,
    };
  } catch (error) {
    if (error instanceof PracticeAttemptRequestError) {
      return { status: "error", message: "Wähle mindestens einen gültigen Lernbereich aus." };
    }
    const failure = actionFailure("create practice quiz", error);
    return { status: "error", message: failure.message };
  }
}

function actionFailure(
  area: string,
  error: unknown,
): { ok: false; message: string } {
  if (error instanceof AuthenticationRequiredError) {
    return { ok: false, message: "Melde dich an, um ein persönliches Übungsquiz zu verwenden." };
  }
  if (error instanceof PasswordChangeRequiredError) {
    return { ok: false, message: "Ändere zuerst dein temporäres Passwort." };
  }
  if (error instanceof CapabilityAuthorizationError) {
    return { ok: false, message: "Im Betrachtermodus werden keine persönlichen Quizversuche gespeichert." };
  }
  console.error(`[azubi-lab] ${area} failed`, error instanceof Error ? error.name : "UnknownError");
  return { ok: false, message: "Das Quiz konnte gerade nicht gespeichert werden. Bitte versuche es erneut." };
}

function hasOnlyFormFields(formData: FormData, allowed: readonly string[]) {
  const allowedFields = new Set(allowed);
  return [...formData.keys()].every(
    (key) => allowedFields.has(key) || key.startsWith("$ACTION_"),
  );
}
