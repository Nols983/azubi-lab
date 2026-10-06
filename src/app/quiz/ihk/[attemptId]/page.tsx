import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { IhkExamAttempt } from "../../../components/quiz/ihk-exam-attempt.tsx";
import {
  AuthenticationRequiredError,
  CapabilityAuthorizationError,
  PasswordChangeRequiredError,
} from "../../../lib/server/current-user.ts";
import { IhkExamNotFoundError } from "../../../lib/server/ihk-exam-repository.ts";
import {
  getIhkExamAttempt,
  IhkExamRequestError,
} from "../../../lib/server/ihk-exam-service.ts";

export const metadata: Metadata = { title: "IHK-Simulation bearbeiten" };
export const dynamic = "force-dynamic";

export default async function IhkExamAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  let attempt;
  try {
    attempt = await getIhkExamAttempt(attemptId);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect(`/login?callbackUrl=${encodeURIComponent(`/quiz/ihk/${attemptId}`)}`);
    }
    if (error instanceof PasswordChangeRequiredError) {
      redirect(`/konto/passwort-aendern?callbackUrl=${encodeURIComponent(`/quiz/ihk/${attemptId}`)}`);
    }
    if (error instanceof IhkExamRequestError || error instanceof IhkExamNotFoundError) notFound();
    if (error instanceof CapabilityAuthorizationError) notFound();
    throw error;
  }
  return <IhkExamAttempt attempt={attempt} />;
}
