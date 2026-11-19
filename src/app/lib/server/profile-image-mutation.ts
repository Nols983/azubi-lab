import "server-only";

import { withTransaction } from "./db.ts";
import { ProfileImageStorageError } from "./profile-image.ts";

// Prevent a request authenticated before deletion from writing a new orphan file.
export async function withProfileImageAccountLock<T>(user: { id: string; authVersion: number }, mutate: () => Promise<T>) {
  return withTransaction(async (client) => {
    const account = await client.query(
      `SELECT id FROM users WHERE id = $1 AND auth_version = $2
       AND disabled_at IS NULL AND must_change_password = false FOR UPDATE`, [user.id, user.authVersion],
    );
    if (!account.rowCount) throw new ProfileImageStorageError();
    return mutate();
  });
}
