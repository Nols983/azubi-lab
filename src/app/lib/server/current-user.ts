import "server-only";

import { cache } from "react";
import { auth } from "@/auth";
import { isCurrentAuthVersion, isUuid } from "../account-security";
import { canManageUsers, hasCapability, type AccountCapability } from "../authorization";
import type { SessionUserIdentity } from "../auth-types";
import { findDatabaseUserById, type DatabaseUser } from "./user-repository";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("A current authenticated database user is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class PasswordChangeRequiredError extends Error {
  constructor() {
    super("The current user must change their password first.");
    this.name = "PasswordChangeRequiredError";
  }
}

export class AdminAuthorizationError extends Error {
  constructor() {
    super("A current administrator is required.");
    this.name = "AdminAuthorizationError";
  }
}

export class LearnerAuthorizationError extends Error {
  constructor() {
    super("A current learner account is required.");
    this.name = "LearnerAuthorizationError";
  }
}

export class CapabilityAuthorizationError extends Error {
  constructor(readonly capability: AccountCapability) {
    super(`The current database user lacks the ${capability} capability.`);
    this.name = "CapabilityAuthorizationError";
  }
}

export const getSessionUserIdentity = cache(async (): Promise<SessionUserIdentity | undefined> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id
    || !isUuid(user.id)
    || typeof user.displayName !== "string"
    || typeof user.login !== "string"
    || !Number.isSafeInteger(user.authVersion)
    || user.authVersion < 1) return undefined;
  return {
    id: user.id,
    displayName: user.displayName,
    login: user.login,
    authVersion: user.authVersion,
  };
});

export const getCurrentDatabaseUser = cache(async (): Promise<DatabaseUser | undefined> => {
  const identity = await getSessionUserIdentity();
  if (!identity) return undefined;
  const user = await findDatabaseUserById(identity.id);
  if (!user || user.disabledAt || !isCurrentAuthVersion(identity.authVersion, user.authVersion)) return undefined;
  return user;
});

export async function requireAuthenticatedUser(options: { allowPasswordChange?: boolean } = {}) {
  const user = await getCurrentDatabaseUser();
  if (!user) throw new AuthenticationRequiredError();
  if (user.mustChangePassword && !options.allowPasswordChange) throw new PasswordChangeRequiredError();
  return user;
}

export async function requireAdminUser() {
  const user = await requireAuthenticatedUser();
  if (!canManageUsers(user.role)) throw new AdminAuthorizationError();
  return user;
}

export async function requireCapability(capability: AccountCapability) {
  const user = await requireAuthenticatedUser();
  if (!hasCapability(user.role, capability)) throw new CapabilityAuthorizationError(capability);
  return user;
}

export async function requireLearnerUser() {
  const user = await requireAuthenticatedUser();
  if (user.role !== "learner") throw new LearnerAuthorizationError();
  return user;
}
