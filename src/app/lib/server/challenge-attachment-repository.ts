import "server-only";

import { learnerAccessPredicate } from "./learner-access-repository.ts";
import type { EvidenceMimeType } from "../challenge-evidence.ts";
import { getDatabasePool } from "./db.ts";

type AuthorizedAttachmentRow = {
  id: string;
  storage_key: string;
  original_filename: string;
  mime_type: EvidenceMimeType;
  byte_size: number;
  sha256: string;
};

export async function findAuthorizedAttachment(input: {
  attachmentId: string;
  userId: string;
}) {
  const result = await getDatabasePool().query<AuthorizedAttachmentRow>(
    `SELECT attachment.id, attachment.storage_key, attachment.original_filename,
            attachment.mime_type, attachment.byte_size, attachment.sha256
     FROM challenge_submission_attachments attachment
     JOIN challenge_submissions submission ON submission.id = attachment.submission_id
     JOIN challenge_assignments assignment ON assignment.id = submission.assignment_id
     WHERE attachment.id = $1
       AND (assignment.learner_id = $2 OR ${learnerAccessPredicate("$2", "assignment.learner_id")})
     LIMIT 1`,
    [input.attachmentId, input.userId],
  );
  const row = result.rows[0];
  return row
    ? {
        id: row.id,
        storageKey: row.storage_key,
        originalFilename: row.original_filename,
        mimeType: row.mime_type,
        byteSize: row.byte_size,
        sha256: row.sha256,
      }
    : undefined;
}
