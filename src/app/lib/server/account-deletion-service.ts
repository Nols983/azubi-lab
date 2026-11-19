import "server-only";

import { deleteManagedAccount } from "./account-deletion-repository.ts";
import { requireCapability } from "./current-user.ts";
import { cleanupDeletedAccountImages } from "./account-file-cleanup.ts";

export async function deleteAccountAsAdmin(input: { targetUserId: string; confirmed: unknown; confirmationLogin: unknown }) {
  const actor = await requireCapability("manageUsers");
  const deleted = await deleteManagedAccount({ ...input, actorId: actor.id, actorAuthVersion: actor.authVersion });
  try {
    const cleanup = await cleanupDeletedAccountImages(deleted.deletedUserId);
    return { ...deleted, cleanupPending: cleanup.pending };
  } catch {
    // Deletion already committed. Its durable cleanup job remains retryable.
    return { ...deleted, cleanupPending: true };
  }
}
