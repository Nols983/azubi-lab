import "server-only";

import { learningModules } from "../../data/learning-modules.ts";
import { getDatabasePool, withTransaction } from "./db.ts";
import type { PoolClient } from "pg";

export type CurriculumAssignmentRecord = {
  id: string;
  learnerId: string;
  moduleSlug: string;
  assignedBy: { id: string; displayName: string };
  assignedAt: Date;
  targetAt: Date | null;
  note: string | null;
  archivedAt: Date | null;
  updatedAt: Date;
};

type CurriculumAssignmentRow = {
  id: string;
  learner_id: string;
  module_slug: string;
  assigned_by: string;
  assigner_display_name: string;
  assigned_at: Date;
  target_at: Date | null;
  note: string | null;
  archived_at: Date | null;
  updated_at: Date;
};

export type CreatedCurriculumAssignment = {
  id: string;
  learnerId: string;
  moduleSlug: string;
  assignedAt: Date;
  eventVersion: string;
};

const canonicalModuleSlugs = new Set(learningModules.map((learningModule) => learningModule.slug));

export class CurriculumAssignmentLearnerInvalidError extends Error {
  constructor() {
    super("The target is missing, disabled or not a learner account.");
    this.name = "CurriculumAssignmentLearnerInvalidError";
  }
}

export class CurriculumAssignmentAdminInvalidError extends Error {
  constructor() {
    super("The assigning account cannot manage curriculum assignments.");
    this.name = "CurriculumAssignmentAdminInvalidError";
  }
}

export class CurriculumAssignmentModuleInvalidError extends Error {
  constructor() {
    super("At least one module slug is not canonical.");
    this.name = "CurriculumAssignmentModuleInvalidError";
  }
}

export class DuplicateCurriculumAssignmentError extends Error {
  constructor() {
    super("At least one module already has an active curriculum assignment.");
    this.name = "DuplicateCurriculumAssignmentError";
  }
}

export class CurriculumAssignmentNotFoundError extends Error {
  constructor() {
    super("The active curriculum assignment does not exist.");
    this.name = "CurriculumAssignmentNotFoundError";
  }
}

export function assignCurriculumModules(input: {
  learnerId: string;
  moduleSlugs: readonly string[];
  assignedBy: string;
  targetAt: Date | null;
  note: string | null;
}) {
  return withTransaction(async (client) => (
    await assignCurriculumModulesWithClient(client, input)
  ).map((assignment) => assignment.id));
}

export async function assignCurriculumModulesWithClient(
  client: PoolClient,
  input: {
    learnerId: string;
    moduleSlugs: readonly string[];
    assignedBy: string;
    targetAt: Date | null;
    note: string | null;
  },
) {
  assertCanonicalModuleSlugs(input.moduleSlugs);
  const learnerResult = await client.query(
    "SELECT id FROM users WHERE id = $1 AND role = 'learner' AND disabled_at IS NULL FOR SHARE",
    [input.learnerId],
  );
  const adminResult = await client.query(
    "SELECT id FROM users WHERE id = $1 AND role IN ('admin', 'instructor') AND disabled_at IS NULL FOR SHARE",
    [input.assignedBy],
  );
  if (!learnerResult.rowCount) throw new CurriculumAssignmentLearnerInvalidError();
  if (!adminResult.rowCount) throw new CurriculumAssignmentAdminInvalidError();

  const active = await client.query<{ module_slug: string }>(
    `SELECT module_slug
     FROM curriculum_assignments
     WHERE learner_id = $1 AND module_slug = ANY($2::text[]) AND archived_at IS NULL
     FOR UPDATE`,
    [input.learnerId, input.moduleSlugs],
  );
  if (active.rowCount) throw new DuplicateCurriculumAssignmentError();

  const result = await client.query<{
    id: string;
    learner_id: string;
    module_slug: string;
    assigned_at: Date;
    event_version: string;
  }>(
    `INSERT INTO curriculum_assignments
       (learner_id, module_slug, assigned_by, target_at, note)
     SELECT $1, module_slug, $3, $4, $5
     FROM unnest($2::text[]) AS selected(module_slug)
     ON CONFLICT (learner_id, module_slug)
     DO UPDATE SET
       assigned_by = EXCLUDED.assigned_by,
       assigned_at = now(),
       target_at = EXCLUDED.target_at,
       note = EXCLUDED.note,
       archived_at = NULL,
       updated_at = now()
     WHERE curriculum_assignments.archived_at IS NOT NULL
     RETURNING id, learner_id, module_slug, assigned_at,
       (extract(epoch FROM assigned_at) * 1000000)::bigint::text AS event_version`,
    [input.learnerId, input.moduleSlugs, input.assignedBy, input.targetAt, input.note],
  );
  if (result.rowCount !== input.moduleSlugs.length) throw new DuplicateCurriculumAssignmentError();
  return result.rows.map((row): CreatedCurriculumAssignment => ({
    id: row.id,
    learnerId: row.learner_id,
    moduleSlug: row.module_slug,
    assignedAt: row.assigned_at,
    eventVersion: row.event_version,
  }));
}

export async function updateCurriculumAssignment(input: {
  assignmentId: string;
  targetAt: Date | null;
  note: string | null;
}) {
  const result = await getDatabasePool().query<{ learner_id: string }>(
    `UPDATE curriculum_assignments
     SET target_at = $2, note = $3, updated_at = now()
     WHERE id = $1 AND archived_at IS NULL
     RETURNING learner_id`,
    [input.assignmentId, input.targetAt, input.note],
  );
  if (!result.rows[0]) throw new CurriculumAssignmentNotFoundError();
  return result.rows[0].learner_id;
}

export async function archiveCurriculumAssignment(assignmentId: string) {
  const result = await getDatabasePool().query<{ learner_id: string }>(
    `UPDATE curriculum_assignments
     SET archived_at = now(), updated_at = now()
     WHERE id = $1 AND archived_at IS NULL
     RETURNING learner_id`,
    [assignmentId],
  );
  if (!result.rows[0]) throw new CurriculumAssignmentNotFoundError();
  return result.rows[0].learner_id;
}

export async function listCurriculumAssignmentsForLearner(learnerId: string, includeArchived = false) {
  const result = await getDatabasePool().query<CurriculumAssignmentRow>(
    `${assignmentSelect}
     WHERE assignment.learner_id = $1
       AND ($2::boolean OR assignment.archived_at IS NULL)
     ORDER BY assignment.assigned_at DESC, assignment.module_slug ASC`,
    [learnerId, includeArchived],
  );
  return result.rows.map(mapCurriculumAssignment);
}

export async function listCurriculumAssignmentsForLearners(learnerIds: readonly string[], includeArchived = false) {
  if (learnerIds.length === 0) return [];
  const result = await getDatabasePool().query<CurriculumAssignmentRow>(
    `${assignmentSelect}
     WHERE assignment.learner_id = ANY($1::uuid[])
       AND ($2::boolean OR assignment.archived_at IS NULL)
     ORDER BY assignment.learner_id, assignment.assigned_at DESC, assignment.module_slug ASC`,
    [learnerIds, includeArchived],
  );
  return result.rows.map(mapCurriculumAssignment);
}

export async function listActiveCurriculumAssignments() {
  const result = await getDatabasePool().query<CurriculumAssignmentRow>(
    `${assignmentSelect}
     WHERE assignment.archived_at IS NULL
     ORDER BY assignment.target_at ASC NULLS LAST, assignment.assigned_at ASC`,
  );
  return result.rows.map(mapCurriculumAssignment);
}

function assertCanonicalModuleSlugs(moduleSlugs: readonly string[]) {
  if (
    moduleSlugs.length === 0
    || moduleSlugs.length > learningModules.length
    || new Set(moduleSlugs).size !== moduleSlugs.length
    || moduleSlugs.some((slug) => !canonicalModuleSlugs.has(slug))
  ) {
    throw new CurriculumAssignmentModuleInvalidError();
  }
}

function mapCurriculumAssignment(row: CurriculumAssignmentRow): CurriculumAssignmentRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    moduleSlug: row.module_slug,
    assignedBy: { id: row.assigned_by, displayName: row.assigner_display_name },
    assignedAt: row.assigned_at,
    targetAt: row.target_at,
    note: row.note,
    archivedAt: row.archived_at,
    updatedAt: row.updated_at,
  };
}

const assignmentSelect = `SELECT assignment.id, assignment.learner_id, assignment.module_slug,
    assignment.assigned_by, assigner.display_name AS assigner_display_name,
    assignment.assigned_at, assignment.target_at, assignment.note,
    assignment.archived_at, assignment.updated_at
  FROM curriculum_assignments assignment
  JOIN users assigner ON assigner.id = assignment.assigned_by`;
