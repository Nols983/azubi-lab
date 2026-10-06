import "server-only";

import { redirect } from "next/navigation";
import { canManageTeams, canManageUsers, canViewLearnerProgress } from "../authorization";
import { getCurrentDatabaseUser, getSessionUserIdentity } from "./current-user";

export async function getTrainerPageAccess(callbackUrl: string) {
  const session = await getSessionUserIdentity();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  const user = await getCurrentDatabaseUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (user.mustChangePassword) {
    redirect(`/konto/passwort-aendern?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return canViewLearnerProgress(user.role)
    ? { allowed: true as const, user }
    : { allowed: false as const, user };
}

export async function getUserManagementPageAccess(callbackUrl: string) {
  const access = await getTrainerPageAccess(callbackUrl);
  return access.allowed && canManageUsers(access.user.role)
    ? access
    : { allowed: false as const, user: access.user };
}

export async function getTeamManagementPageAccess(callbackUrl: string) {
  const access = await getTrainerPageAccess(callbackUrl);
  return access.allowed && canManageTeams(access.user.role)
    ? access
    : { allowed: false as const, user: access.user };
}
