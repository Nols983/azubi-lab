import "server-only";

import { isUuid } from "../account-security.ts";
import {
  buildPasswordResetUrl,
  generatePasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenFormat,
  parsePasswordResetOrigin,
} from "../password-reset.ts";
import { requireCapability } from "./current-user.ts";
import {
  consumePasswordResetToken,
  createPasswordResetTokenRecord,
  PasswordResetTargetError,
} from "./password-reset-repository.ts";

export class PasswordResetConfigurationError extends Error {
  constructor() {
    super("The configured password reset origin is invalid.");
    this.name = "PasswordResetConfigurationError";
  }
}

export async function createPasswordResetLinkAsAdmin(userId: unknown) {
  const admin = await requireCapability("resetPasswords");
  if (!isUuid(userId)) throw new PasswordResetTargetError();
  const origin = parsePasswordResetOrigin(
    process.env.PASSWORD_RESET_ORIGIN,
    process.env.NODE_ENV !== "production",
  );
  if (!origin) throw new PasswordResetConfigurationError();

  const token = generatePasswordResetToken();
  await createPasswordResetTokenRecord({
    userId,
    createdByAdminId: admin.id,
    tokenHash: hashPasswordResetToken(token),
  });
  return buildPasswordResetUrl(origin, token);
}

export async function resetPasswordWithToken(input: { token: unknown; passwordHash: string }) {
  if (!isPasswordResetTokenFormat(input.token)) throw new PasswordResetTargetError();
  await consumePasswordResetToken({
    tokenHash: hashPasswordResetToken(input.token),
    passwordHash: input.passwordHash,
  });
}
