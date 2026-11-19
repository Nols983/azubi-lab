import "server-only";

import { withTransaction } from "./db.ts";
import { LocalFilesystemEvidenceStorage } from "./evidence-storage.ts";
import { LocalFilesystemProfileImageStorage } from "./profile-image.ts";

// Also used by an admin-only retry action. Jobs survive failed filesystem cleanup.
export async function cleanupDeletedAccountImages(userId?: string) {
  return withTransaction(async (client) => {
    const jobs = await client.query<{ user_id: string; evidence_storage_keys: string[] }>(
      `SELECT job.user_id, job.evidence_storage_keys FROM account_file_cleanup_jobs job
       WHERE ($1::uuid IS NULL OR job.user_id = $1)
       AND NOT EXISTS (SELECT 1 FROM users account WHERE account.id = job.user_id)
       ORDER BY job.created_at, job.user_id LIMIT 50 FOR UPDATE OF job SKIP LOCKED`, [userId ?? null],
    );
    for (const job of jobs.rows) {
      try {
        await new LocalFilesystemProfileImageStorage().delete(job.user_id);
        for (const storageKey of job.evidence_storage_keys) {
          // Never remove a key still referenced by any account's evidence.
          const referenced = await client.query("SELECT 1 FROM challenge_submission_attachments WHERE storage_key = $1", [storageKey]);
          if (referenced.rowCount) throw new Error("Evidence is still referenced.");
          await new LocalFilesystemEvidenceStorage().delete(storageKey);
        }
      } catch {
        continue;
      }
      await client.query("DELETE FROM account_file_cleanup_jobs WHERE user_id = $1", [job.user_id]);
    }
    const remaining = await client.query("SELECT 1 FROM account_file_cleanup_jobs WHERE ($1::uuid IS NULL OR user_id = $1) LIMIT 1", [userId ?? null]);
    return { pending: Boolean(remaining.rowCount) };
  });
}
