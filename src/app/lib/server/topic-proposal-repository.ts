import "server-only";

import { isUuid } from "../account-security.ts";
import { parseTopicProposalStatus, validateTopicProposal, type TopicProposalInput, type TopicProposalStatus } from "../topic-proposal-domain.ts";
import { getDatabasePool } from "./db.ts";
import { managedTeamPredicate } from "./learner-access-repository.ts";

const activeActor = `actor.disabled_at IS NULL AND actor.must_change_password = false`;

export async function listProposalTeams(actorId: string) {
  const result = await getDatabasePool().query<{ id: string; name: string }>(
    `SELECT team.id, team.name FROM teams team
     JOIN users actor ON actor.id = $1 AND ${activeActor}
     WHERE team.active = true AND (actor.role = 'admin' OR ${managedTeamPredicate("$1", "team.id")})
     ORDER BY lower(team.name), team.id`, [actorId],
  );
  return result.rows;
}

export async function createTopicProposal(actorId: string, input: TopicProposalInput) {
  const value = validateTopicProposal(input);
  if (!isUuid(actorId) || !value) throw new TopicProposalTargetError();
  const result = await getDatabasePool().query<{ id: string }>(
    `INSERT INTO topic_proposals (title, description, learning_objective, category, team_id, created_by)
     SELECT $2, $3, $4, $5, team.id, actor.id FROM teams team
     JOIN users actor ON actor.id = $1 AND ${activeActor}
     WHERE team.id = $6 AND team.active = true
       AND (actor.role = 'admin' OR ${managedTeamPredicate("$1", "team.id")})
     RETURNING id`,
    [actorId, value.title, value.description, value.learningObjective, value.category, value.teamId],
  );
  if (!result.rows[0]) throw new TopicProposalTargetError();
  return result.rows[0].id;
}

export async function listTopicProposals(actorId: string) {
  const result = await getDatabasePool().query<{
    id: string; title: string; description: string; learning_objective: string; category: string;
    team_name: string; team_active: boolean; creator_name: string; status: TopicProposalStatus;
    admin_feedback: string | null; created_at: Date; updated_at: Date;
  }>(
    `SELECT proposal.id, proposal.title, proposal.description, proposal.learning_objective, proposal.category,
            team.name AS team_name, team.active AS team_active, creator.display_name AS creator_name,
            proposal.status, proposal.admin_feedback, proposal.created_at, proposal.updated_at
     FROM topic_proposals proposal
     JOIN teams team ON team.id = proposal.team_id
     JOIN users creator ON creator.id = proposal.created_by
     JOIN users actor ON actor.id = $1 AND ${activeActor}
     WHERE actor.role = 'admin' OR (actor.role = 'instructor' AND proposal.created_by = actor.id)
     ORDER BY proposal.created_at DESC, proposal.id`, [actorId],
  );
  return result.rows;
}

export async function reviewTopicProposal(actorId: string, proposalId: string, status: TopicProposalStatus, feedback: string) {
  if (!isUuid(actorId) || !isUuid(proposalId) || !parseTopicProposalStatus(status)
    || typeof feedback !== "string" || feedback.trim().length > 3000) throw new TopicProposalTargetError();
  const result = await getDatabasePool().query(
    `UPDATE topic_proposals proposal
     SET status = $3, admin_feedback = NULLIF($4, ''), reviewed_by = actor.id, updated_at = clock_timestamp()
     FROM users actor WHERE proposal.id = $2 AND actor.id = $1 AND actor.role = 'admin' AND ${activeActor}
     RETURNING proposal.id`, [actorId, proposalId, status, feedback.trim()],
  );
  if (!result.rowCount) throw new TopicProposalTargetError();
}

export class TopicProposalTargetError extends Error {
  constructor() {
    super("The proposal or team is unavailable or the input is invalid.");
    this.name = "TopicProposalTargetError";
  }
}
