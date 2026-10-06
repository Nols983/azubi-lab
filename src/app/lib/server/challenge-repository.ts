import "server-only";

import type { PoolClient } from "pg";
import type { ChallengeDifficulty, ChallengeInput, ChallengeStatus, RubricCriterionInput } from "../challenge-domain.ts";
import { getDatabasePool, withTransaction } from "./db.ts";

export type ChallengeRubricCriterion = RubricCriterionInput & {
  id: string;
  position: number;
};

export type ChallengeDefinition = Omit<ChallengeInput, "rubricCriteria"> & {
  rubricCriteria: ChallengeRubricCriterion[];
  id: string;
  createdBy: { id: string; displayName: string };
  createdAt: Date;
  updatedAt: Date;
};

export type ChallengeListItem = Omit<ChallengeDefinition, "instructions" | "rubricCriteria"> & {
  activeAssignments: number;
  completedAssignments: number;
  rubricCriterionCount: number;
  rubricTotalPoints: number;
};

export type ChallengeCataloguePreview = Pick<
  ChallengeDefinition,
  "id" | "title" | "shortDescription" | "instructions" | "difficulty" | "estimatedMinutes"
> & {
  rubricCriterionCount: number;
  rubricTotalPoints: number;
};

type ChallengeRow = {
  id: string;
  title: string;
  short_description: string;
  instructions: string;
  difficulty: ChallengeDifficulty | null;
  estimated_minutes: number | null;
  status: ChallengeStatus;
  created_by: string;
  creator_display_name: string;
  created_at: Date;
  updated_at: Date;
};

type ChallengeListRow = ChallengeRow & {
  active_assignments: string;
  completed_assignments: string;
  rubric_criterion_count: string;
  rubric_total_points: string;
};

type ChallengeCataloguePreviewRow = Pick<
  ChallengeRow,
  "id" | "title" | "short_description" | "instructions" | "difficulty" | "estimated_minutes"
> & {
  rubric_criterion_count: string;
  rubric_total_points: string;
};

type RubricRow = {
  id: string;
  position: number;
  title: string;
  description: string;
  max_points: number;
};

export class ChallengeNotFoundError extends Error {
  constructor() {
    super("The challenge does not exist.");
    this.name = "ChallengeNotFoundError";
  }
}

export async function listChallengeDefinitions(status?: ChallengeStatus) {
  const result = await getDatabasePool().query<ChallengeListRow>(
    `SELECT c.id, c.title, c.short_description, c.instructions, c.difficulty,
            c.estimated_minutes, c.status, c.created_by, creator.display_name AS creator_display_name,
            c.created_at, c.updated_at,
            count(a.id) FILTER (
              WHERE a.completed_at IS NULL AND latest_review.decision IS DISTINCT FROM 'approved'
            ) AS active_assignments,
            count(a.id) FILTER (
              WHERE a.completed_at IS NOT NULL OR latest_review.decision = 'approved'
            ) AS completed_assignments,
            (SELECT count(*) FROM challenge_rubric_criteria rc WHERE rc.challenge_id = c.id) AS rubric_criterion_count,
            (SELECT COALESCE(sum(rc.max_points), 0) FROM challenge_rubric_criteria rc WHERE rc.challenge_id = c.id) AS rubric_total_points
     FROM challenges c
     JOIN users creator ON creator.id = c.created_by
     LEFT JOIN challenge_assignments a ON a.challenge_id = c.id
     LEFT JOIN LATERAL (
       SELECT s.id
       FROM challenge_submissions s
       WHERE s.assignment_id = a.id
       ORDER BY s.submission_number DESC
       LIMIT 1
     ) latest_submission ON true
     LEFT JOIN challenge_reviews latest_review ON latest_review.submission_id = latest_submission.id
     WHERE ($1::text IS NULL OR c.status = $1)
     GROUP BY c.id, creator.display_name
     ORDER BY c.created_at DESC, c.id DESC`,
    [status ?? null],
  );
  return result.rows.map(mapChallengeListItem);
}

export async function listPublishedChallengePreviews(): Promise<readonly ChallengeCataloguePreview[]> {
  const result = await getDatabasePool().query<ChallengeCataloguePreviewRow>(
    `SELECT c.id, c.title, c.short_description, c.instructions, c.difficulty,
            c.estimated_minutes,
            count(rc.id)::text AS rubric_criterion_count,
            COALESCE(sum(rc.max_points), 0)::text AS rubric_total_points
     FROM challenges c
     LEFT JOIN challenge_rubric_criteria rc ON rc.challenge_id = c.id
     WHERE c.status = 'published'
     GROUP BY c.id
     ORDER BY c.title ASC, c.id ASC`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    shortDescription: row.short_description,
    instructions: row.instructions,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    rubricCriterionCount: Number(row.rubric_criterion_count),
    rubricTotalPoints: Number(row.rubric_total_points),
  }));
}

export async function findChallengeDefinitionById(challengeId: string) {
  const result = await getDatabasePool().query<ChallengeRow>(
    `SELECT c.id, c.title, c.short_description, c.instructions, c.difficulty,
            c.estimated_minutes, c.status, c.created_by, creator.display_name AS creator_display_name,
            c.created_at, c.updated_at
     FROM challenges c
     JOIN users creator ON creator.id = c.created_by
     WHERE c.id = $1
     LIMIT 1`,
    [challengeId],
  );
  if (!result.rows[0]) return undefined;
  return { ...mapChallengeDefinition(result.rows[0]), rubricCriteria: await listRubricCriteriaForChallenge(challengeId) };
}

export function createChallengeDefinition(input: ChallengeInput, createdBy: string) {
  return withTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `INSERT INTO challenges
         (title, short_description, instructions, difficulty, estimated_minutes, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.title,
        input.shortDescription,
        input.instructions,
        input.difficulty,
        input.estimatedMinutes,
        input.status,
        createdBy,
      ],
    );
    await insertRubricCriteria(client, result.rows[0].id, input.rubricCriteria);
    return result.rows[0].id;
  });
}

export async function updateChallengeDefinition(challengeId: string, input: ChallengeInput) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE challenges
       SET title = $2,
           short_description = $3,
           instructions = $4,
           difficulty = $5,
           estimated_minutes = $6,
           status = $7,
           updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [
        challengeId,
        input.title,
        input.shortDescription,
        input.instructions,
        input.difficulty,
        input.estimatedMinutes,
        input.status,
      ],
    );
    if (!result.rowCount) throw new ChallengeNotFoundError();
    await client.query("DELETE FROM challenge_rubric_criteria WHERE challenge_id = $1", [challengeId]);
    await insertRubricCriteria(client, challengeId, input.rubricCriteria);
  });
}

export async function listRubricCriteriaForChallenge(challengeId: string) {
  const result = await getDatabasePool().query<RubricRow>(
    `SELECT id, position, title, description, max_points
     FROM challenge_rubric_criteria
     WHERE challenge_id = $1
     ORDER BY position ASC`,
    [challengeId],
  );
  return result.rows.map(mapRubricCriterion);
}

function mapChallengeListItem(row: ChallengeListRow): ChallengeListItem {
  const challenge = mapChallengeDefinition(row);
  return {
    id: challenge.id,
    title: challenge.title,
    shortDescription: challenge.shortDescription,
    difficulty: challenge.difficulty,
    estimatedMinutes: challenge.estimatedMinutes,
    status: challenge.status,
    createdBy: challenge.createdBy,
    createdAt: challenge.createdAt,
    updatedAt: challenge.updatedAt,
    activeAssignments: Number(row.active_assignments),
    completedAssignments: Number(row.completed_assignments),
    rubricCriterionCount: Number(row.rubric_criterion_count),
    rubricTotalPoints: Number(row.rubric_total_points),
  };
}

function mapChallengeDefinition(row: ChallengeRow): ChallengeDefinition {
  return {
    id: row.id,
    title: row.title,
    shortDescription: row.short_description,
    instructions: row.instructions,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    status: row.status,
    rubricCriteria: [],
    createdBy: { id: row.created_by, displayName: row.creator_display_name },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function insertRubricCriteria(
  client: PoolClient,
  challengeId: string,
  criteria: readonly RubricCriterionInput[],
) {
  for (const [index, criterion] of criteria.entries()) {
    await client.query(
      `INSERT INTO challenge_rubric_criteria (challenge_id, position, title, description, max_points)
       VALUES ($1, $2, $3, $4, $5)`,
      [challengeId, index + 1, criterion.title, criterion.description, criterion.maxPoints],
    );
  }
}

function mapRubricCriterion(row: RubricRow): ChallengeRubricCriterion {
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    description: row.description,
    maxPoints: row.max_points,
  };
}
