import "server-only";

import { redirect } from "next/navigation";
import { getCurrentDatabaseUser, getSessionUserIdentity } from "./current-user.ts";

export async function getLearnerPageAccess(callbackUrl: string) {
  const session = await getSessionUserIdentity();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  const user = await getCurrentDatabaseUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (user.mustChangePassword) {
    redirect(`/konto/passwort-aendern?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return user.role === "learner"
    ? { allowed: true as const, user }
    : { allowed: false as const, user };
}
