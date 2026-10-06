import "server-only";

import type { AccountRole } from "../auth-types.ts";
import { getDatabasePool } from "./db.ts";

export type ChallengeAssignmentComment = {
  id: string;
  assignmentId: string;
  body: string;
  createdAt: Date;
  author: { displayName: string; role: AccountRole };
};

type CommentRow = {
  id: string;
  assignment_id: string;
  body: string;
  created_at: Date;
  author_display_name: string;
  author_role: AccountRole;
};

export class CommentAssignmentNotFoundError extends Error {
  constructor() {
    super("The challenge assignment is not available to this author.");
    this.name = "CommentAssignmentNotFoundError";
  }
}

export async function listOwnedAssignmentComments(assignmentId: string, learnerId: string) {
  const result = await getDatabasePool().query<CommentRow>(
    `${commentSelect}
     JOIN challenge_assignments a ON a.id = comment.assignment_id
     WHERE comment.assignment_id = $1 AND a.learner_id = $2
     ORDER BY comment.created_at ASC, comment.id ASC`,
    [assignmentId, learnerId],
  );
  return result.rows.map(mapComment);
}

export async function listAssignmentComments(assignmentId: string) {
  const result = await getDatabasePool().query<CommentRow>(
    `${commentSelect}
     WHERE comment.assignment_id = $1
     ORDER BY comment.created_at ASC, comment.id ASC`,
    [assignmentId],
  );
  return result.rows.map(mapComment);
}

export async function createOwnedLearnerComment(input: { assignmentId: string; learnerId: string; body: string }) {
  const result = await getDatabasePool().query<{ id: string; created_at: Date }>(
    `INSERT INTO challenge_assignment_comments (assignment_id, author_id, body)
     SELECT a.id, $2, $3
     FROM challenge_assignments a
     WHERE a.id = $1 AND a.learner_id = $2
     RETURNING id, created_at`,
    [input.assignmentId, input.learnerId, input.body],
  );
  if (!result.rows[0]) throw new CommentAssignmentNotFoundError();
  return { id: result.rows[0].id, createdAt: result.rows[0].created_at };
}

export async function createAdminComment(input: { assignmentId: string; adminId: string; body: string }) {
  const result = await getDatabasePool().query<{ id: string; created_at: Date }>(
    `INSERT INTO challenge_assignment_comments (assignment_id, author_id, body)
     SELECT a.id, $2, $3
     FROM challenge_assignments a
     WHERE a.id = $1
     RETURNING id, created_at`,
    [input.assignmentId, input.adminId, input.body],
  );
  if (!result.rows[0]) throw new CommentAssignmentNotFoundError();
  return { id: result.rows[0].id, createdAt: result.rows[0].created_at };
}

const commentSelect = `SELECT comment.id, comment.assignment_id, comment.body, comment.created_at,
    author.display_name AS author_display_name, author.role AS author_role
  FROM challenge_assignment_comments comment
  JOIN users author ON author.id = comment.author_id`;

function mapComment(row: CommentRow): ChallengeAssignmentComment {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    body: row.body,
    createdAt: row.created_at,
    author: { displayName: row.author_display_name, role: row.author_role },
  };
}
