import {
  ACCOUNT_CREATION_ROLES,
  ACCOUNT_ROLES,
  type AccountCreationRole,
  type AccountRole,
} from "./auth-types.ts";

export function parseAccountRole(value: unknown): AccountRole | undefined {
  return typeof value === "string" && ACCOUNT_ROLES.includes(value as AccountRole)
    ? value as AccountRole
    : undefined;
}

export function parseAccountCreationRole(value: unknown): AccountCreationRole | undefined {
  return typeof value === "string" && ACCOUNT_CREATION_ROLES.includes(value as AccountCreationRole)
    ? value as AccountCreationRole
    : undefined;
}

export function isCurrentAuthVersion(sessionVersion: unknown, databaseVersion: unknown) {
  return Number.isSafeInteger(sessionVersion)
    && Number.isSafeInteger(databaseVersion)
    && (sessionVersion as number) >= 1
    && sessionVersion === databaseVersion;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function requiresPasswordChange(value: unknown) {
  return value === true;
}

export function normalizeLoginIdentifier(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}

export function validateLearnerAccountInput(displayNameValue: unknown, loginValue: unknown) {
  const displayName = typeof displayNameValue === "string" ? displayNameValue.trim().replace(/\s+/g, " ") : "";
  const login = typeof loginValue === "string" ? normalizeLoginIdentifier(loginValue) : "";
  const errors: { displayName?: string; login?: string } = {};

  if (displayName.length < 2 || displayName.length > 120) {
    errors.displayName = "Der Anzeigename muss 2 bis 120 Zeichen lang sein.";
  }
  if (login.length < 3 || login.length > 64 || !/^[a-z0-9][a-z0-9._@-]*$/.test(login)) {
    errors.login = "Die Kennung muss 3 bis 64 Zeichen lang sein und darf Kleinbuchstaben, Ziffern, Punkt, Minus, Unterstrich und @ enthalten.";
  }

  return Object.keys(errors).length > 0
    ? { valid: false as const, errors }
    : { valid: true as const, value: { displayName, login } };
}
