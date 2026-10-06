"use server";

import { revalidatePath } from "next/cache";
import type { InProgressIhkExamView } from "../lib/ihk-exam.ts";
import {
  completeIhkExamAttempt,
  getIhkExamAttempt,
  IhkExamRequestError,
  saveIhkExamAnswer,
  startIhkExam,
} from "../lib/server/ihk-exam-service.ts";
import { IhkExamValidationError } from "../lib/server/ihk-exam-domain.ts";
import {
  IhkExamDataError,
  IhkExamExpiredError,
  IhkExamNotFoundError,
  IhkExamNotWritableError,
} from "../lib/server/ihk-exam-repository.ts";
import {
  AuthenticationRequiredError,
  CapabilityAuthorizationError,
  PasswordChangeRequiredError,
} from "../lib/server/current-user.ts";

export type StartIhkExamActionState = {
  status: "idle" | "error" | "success";
  message: string;
  attemptId?: string;
};

export type SaveIhkExamAnswerActionResult =
  | {
      ok: true;
      status: "in_progress";
      selectedOptionIds: readonly string[];
      answeredCount: number;
      serverNow: string;
      deadlineAt: string;
    }
  | { ok: true; status: "completed" }
  | { ok: false; message: string };

export type CompleteIhkExamActionResult =
  | { ok: true; status: "in_progress" | "completed" }
  | { ok: false; message: string };

export async function startIhkExamAction(): Promise<StartIhkExamActionState> {
  try {
    const attempt = await startIhkExam();
    revalidatePath("/quiz/ihk");
    return { status: "success", message: "Die IHK-Simulation ist bereit.", attemptId: attempt.id };
  } catch (error) {
    return actionFailure("start IHK exam", error);
  }
}

export async function saveIhkExamAnswerAction(input: unknown): Promise<SaveIhkExamAnswerActionResult> {
  try {
    const attempt = await saveIhkExamAnswer(input);
    if (attempt.status === "completed") {
      revalidateAttempt(attempt.id);
      return { ok: true, status: "completed" };
    }
    const question = findSubmittedQuestion(attempt, input);
    return {
      ok: true,
      status: "in_progress",
      selectedOptionIds: question.selectedOptionIds,
      answeredCount: attempt.questions.filter((candidate) => candidate.answered).length,
      serverNow: attempt.serverNow,
      deadlineAt: attempt.deadlineAt,
    };
  } catch (error) {
    if (error instanceof IhkExamExpiredError) {
      revalidateAttempt(error.attemptId);
      return { ok: true, status: "completed" };
    }
    if (error instanceof IhkExamNotWritableError) {
      return { ok: true, status: "completed" };
    }
    return mutationFailure("save IHK answer", error);
  }
}

export async function completeIhkExamAction(attemptId: unknown): Promise<CompleteIhkExamActionResult> {
  try {
    const attempt = await completeIhkExamAttempt(attemptId);
    revalidateAttempt(attempt.id);
    return { ok: true, status: attempt.status };
  } catch (error) {
    return mutationFailure("complete IHK exam", error);
  }
}

export async function finalizeExpiredIhkExamAction(attemptId: unknown): Promise<CompleteIhkExamActionResult> {
  try {
    const attempt = await getIhkExamAttempt(attemptId);
    revalidateAttempt(attempt.id);
    return { ok: true, status: attempt.status };
  } catch (error) {
    return mutationFailure("finalize expired IHK exam", error);
  }
}

function findSubmittedQuestion(attempt: InProgressIhkExamView, input: unknown) {
  const position = isRecord(input) && isRecord(input.answer) ? input.answer.position : undefined;
  const question = attempt.questions.find((candidate) => candidate.position === position);
  if (!question) throw new IhkExamRequestError();
  return question;
}

function revalidateAttempt(attemptId: string) {
  revalidatePath("/quiz/ihk");
  revalidatePath(`/quiz/ihk/${attemptId}`);
}

function mutationFailure(area: string, error: unknown): { ok: false; message: string } {
  if (error instanceof IhkExamRequestError || error instanceof IhkExamValidationError) {
    return { ok: false, message: "Die Prüfungsangaben sind ungültig. Lade die Prüfung neu und versuche es erneut." };
  }
  if (error instanceof IhkExamNotFoundError) {
    return { ok: false, message: "Diese Prüfung ist für dein Konto nicht verfügbar." };
  }
  if (error instanceof AuthenticationRequiredError) {
    return { ok: false, message: "Melde dich an, um die IHK-Simulation zu verwenden." };
  }
  if (error instanceof PasswordChangeRequiredError) {
    return { ok: false, message: "Ändere zuerst dein temporäres Passwort." };
  }
  if (error instanceof CapabilityAuthorizationError) {
    return { ok: false, message: "Im Betrachtermodus wird keine IHK-Versuchshistorie gespeichert." };
  }
  if (error instanceof IhkExamDataError) {
    console.error(`[azubi-lab] ${area} failed`, error.name);
    return { ok: false, message: "Die Prüfung konnte gerade nicht sicher gespeichert werden." };
  }
  console.error(`[azubi-lab] ${area} failed`, error instanceof Error ? error.name : "UnknownError");
  return { ok: false, message: "Die Prüfung konnte gerade nicht gespeichert werden. Bitte versuche es erneut." };
}

function actionFailure(area: string, error: unknown): StartIhkExamActionState {
  const failure = mutationFailure(area, error);
  return { status: "error", message: failure.message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
