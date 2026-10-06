import "server-only";

import { withTransaction } from "./db.ts";

export class PasswordResetTargetError extends Error {
  constructor() {
    super("The password reset target is unavailable.");
    this.name = "PasswordResetTargetError";
  }
}

export class PasswordResetCreatorError extends Error {
  constructor() {
    super("The password reset creator is not a current administrator.");
    this.name = "PasswordResetCreatorError";
  }
}

export class PasswordResetTokenError extends Error {
  constructor() {
    super("The password reset token is invalid, expired or already used.");
    this.name = "PasswordResetTokenError";
  }
}

export function createPasswordResetTokenRecord(input: {
  userId: string;
  createdByAdminId: string;
  tokenHash: string;
}) {
  return withTransaction(async (client) => {
    const creator = await client.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'admin' AND disabled_at IS NULL FOR SHARE",
      [input.createdByAdminId],
    );
    if (!creator.rowCount) throw new PasswordResetCreatorError();

    const target = await client.query(
      "SELECT id FROM users WHERE id = $1 AND disabled_at IS NULL FOR UPDATE",
      [input.userId],
    );
    if (!target.rowCount) throw new PasswordResetTargetError();

    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
      [input.userId],
    );
    await client.query(
      `INSERT INTO password_reset_tokens
         (user_id, token_hash, expires_at, created_by_admin_id)
       VALUES ($1, $2, now() + interval '30 minutes', $3)`,
      [input.userId, input.tokenHash, input.createdByAdminId],
    );
  });
}

export function consumePasswordResetToken(input: { tokenHash: string; passwordHash: string }) {
  return withTransaction(async (client) => {
    const result = await client.query<{ id: string; user_id: string }>(
      `SELECT token.id, token.user_id
       FROM password_reset_tokens token
       JOIN users account ON account.id = token.user_id
       WHERE token.token_hash = $1
         AND token.used_at IS NULL
         AND token.expires_at > now()
         AND account.disabled_at IS NULL
       FOR UPDATE OF token, account`,
      [input.tokenHash],
    );
    const token = result.rows[0];
    if (!token) throw new PasswordResetTokenError();

    const updated = await client.query(
      `UPDATE users
       SET password_hash = $2,
           must_change_password = false,
           password_changed_at = now(),
           auth_version = auth_version + 1,
           updated_at = now()
       WHERE id = $1 AND disabled_at IS NULL
       RETURNING id`,
      [token.user_id, input.passwordHash],
    );
    if (!updated.rowCount) throw new PasswordResetTokenError();

    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
      [token.user_id],
    );
  });
}
