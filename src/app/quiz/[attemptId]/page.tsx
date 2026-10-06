import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PracticeQuizAttempt } from "../../components/quiz/practice-quiz-attempt.tsx";
import { PracticeAttemptNotFoundError } from "../../lib/server/practice-quiz-attempt-repository.ts";
import {
  getPracticeQuizAttempt,
  PracticeAttemptRequestError,
} from "../../lib/server/practice-quiz-attempt-service.ts";
import {
  AuthenticationRequiredError,
  CapabilityAuthorizationError,
  PasswordChangeRequiredError,
} from "../../lib/server/current-user.ts";

export const metadata: Metadata = { title: "Übungsquiz bearbeiten" };
export const dynamic = "force-dynamic";

export default async function PracticeQuizAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;

  let attempt;
  try {
    attempt = await getPracticeQuizAttempt(attemptId);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect(`/login?callbackUrl=${encodeURIComponent(`/quiz/${attemptId}`)}`);
    }
    if (error instanceof PasswordChangeRequiredError) {
      redirect(`/konto/passwort-aendern?callbackUrl=${encodeURIComponent(`/quiz/${attemptId}`)}`);
    }
    if (error instanceof PracticeAttemptRequestError
      || error instanceof PracticeAttemptNotFoundError) {
      notFound();
    }
    if (error instanceof CapabilityAuthorizationError) notFound();
    throw error;
  }

  return <PracticeQuizAttempt attempt={attempt} />;
}
