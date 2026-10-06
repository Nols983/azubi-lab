import "server-only";

import { isUuid, parseAccountRole } from "../account-security.ts";
import type { AccountRole } from "../auth-types.ts";
import { parseTeamRole, type TeamInput, type TeamRole } from "../team-domain.ts";
import { getDatabasePool } from "./db.ts";

type TeamRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
  member_count: string;
};

type TeamAccessRow = TeamRow & {
  viewer_team_role: string | null;
};

type TeamMemberRow = {
  id: string;
  display_name: string;
  account_role: string;
  disabled_at: Date | null;
  team_role: string;
  joined_at: Date;
  total_xp: string;
  active_title_id: string | null;
  pinned_badge_ids: string[] | null;
};

export type TeamRecord = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
};

export type TeamAccessRecord = TeamRecord & {
  viewerTeamRole?: TeamRole;
};

export type TeamMemberRecord = {
  id: string;
  displayName: string;
  accountRole: AccountRole;
  disabled: boolean;
  teamRole: TeamRole;
  joinedAt: Date;
  totalXp: number;
  activeTitleId?: string;
  pinnedBadgeIds: readonly string[];
};

export type AdminTeamMembershipRecord = Pick<
  TeamMemberRecord,
  "id" | "displayName" | "accountRole" | "disabled" | "teamRole" | "joinedAt"
> & { teamId: string };

export async function listTeamsForAdmin(): Promise<readonly TeamRecord[]> {
  const result = await getDatabasePool().query<TeamRow>(
    `${teamSelect()}
     GROUP BY team.id
     ORDER BY team.active DESC, lower(team.name) ASC, team.id ASC`,
  );
  return result.rows.map(mapTeam);
}

export async function listActiveTeamsForUser(userId: string): Promise<readonly TeamRecord[]> {
  assertUuid(userId);
  const result = await getDatabasePool().query<TeamRow>(
    `${teamSelect()}
     JOIN team_members own_membership
       ON own_membership.team_id = team.id AND own_membership.user_id = $1
     WHERE team.active = true
     GROUP BY team.id
     ORDER BY lower(team.name) ASC, team.id ASC`,
    [userId],
  );
  return result.rows.map(mapTeam);
}

export async function findTeamAccessBySlug(slug: string, viewerUserId: string): Promise<TeamAccessRecord | undefined> {
  assertUuid(viewerUserId);
  const result = await getDatabasePool().query<TeamAccessRow>(
    `SELECT team.id, team.name, team.slug, team.description, team.active,
            team.created_by_user_id, team.created_at, team.updated_at,
            count(member.user_id) FILTER (WHERE account.disabled_at IS NULL)::text AS member_count,
            viewer.team_role AS viewer_team_role
     FROM teams team
     LEFT JOIN team_members member ON member.team_id = team.id
     LEFT JOIN users account ON account.id = member.user_id
     LEFT JOIN team_members viewer
       ON viewer.team_id = team.id AND viewer.user_id = $2
     WHERE team.slug = $1
     GROUP BY team.id, viewer.team_role
     LIMIT 1`,
    [slug, viewerUserId],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  const viewerTeamRole = row.viewer_team_role === null ? undefined : parseTeamRole(row.viewer_team_role);
  if (row.viewer_team_role !== null && !viewerTeamRole) throw new TeamRepositoryDataError();
  return { ...mapTeam(row), viewerTeamRole };
}

export async function listTeamMembers(teamId: string): Promise<readonly TeamMemberRecord[]> {
  assertUuid(teamId);
  const result = await getDatabasePool().query<TeamMemberRow>(
    `WITH xp AS (
       SELECT event.user_id, COALESCE(sum(event.xp_amount), 0)::text AS total_xp
       FROM xp_events event
       JOIN team_members membership
         ON membership.user_id = event.user_id AND membership.team_id = $1
       GROUP BY event.user_id
     )
     SELECT account.id, account.display_name, account.role AS account_role,
            account.disabled_at, membership.team_role, membership.created_at AS joined_at,
            COALESCE(xp.total_xp, '0') AS total_xp,
            preference.active_title_id,
            preference.pinned_badge_ids
     FROM team_members membership
     JOIN users account ON account.id = membership.user_id
     LEFT JOIN xp ON xp.user_id = account.id
     LEFT JOIN profile_preferences preference ON preference.user_id = account.id
     WHERE membership.team_id = $1
     ORDER BY lower(account.display_name) ASC, account.id ASC`,
    [teamId],
  );
  return result.rows.map(mapMember);
}

export async function listAssignableTeamAccounts() {
  const result = await getDatabasePool().query<{
    id: string;
    display_name: string;
    role: string;
  }>(
    `SELECT id, display_name, role
     FROM users
     WHERE disabled_at IS NULL
     ORDER BY lower(display_name) ASC, id ASC`,
  );
  return result.rows.flatMap((row) => {
    const role = parseAccountRole(row.role);
    return role ? [{ id: row.id, displayName: row.display_name, role }] : [];
  });
}

export async function listAdminTeamMemberships(): Promise<readonly AdminTeamMembershipRecord[]> {
  const result = await getDatabasePool().query<{
    team_id: string;
    id: string;
    display_name: string;
    account_role: string;
    disabled_at: Date | null;
    team_role: string;
    joined_at: Date;
  }>(
    `SELECT membership.team_id, account.id, account.display_name,
            account.role AS account_role, account.disabled_at,
            membership.team_role, membership.created_at AS joined_at
     FROM team_members membership
     JOIN users account ON account.id = membership.user_id
     ORDER BY membership.team_id ASC, lower(account.display_name) ASC, account.id ASC`,
  );
  return result.rows.map((row) => {
    const accountRole = parseAccountRole(row.account_role);
    const teamRole = parseTeamRole(row.team_role);
    if (!accountRole || !teamRole) throw new TeamRepositoryDataError();
    return {
      teamId: row.team_id,
      id: row.id,
      displayName: row.display_name,
      accountRole,
      disabled: row.disabled_at !== null,
      teamRole,
      joinedAt: row.joined_at,
    };
  });
}

export async function findSocialAccount(userId: string) {
  assertUuid(userId);
  const result = await getDatabasePool().query<{
    id: string;
    display_name: string;
    role: string;
    disabled_at: Date | null;
    active_title_id: string | null;
    pinned_badge_ids: string[] | null;
  }>(
    `SELECT account.id, account.display_name, account.role, account.disabled_at,
            preference.active_title_id, preference.pinned_badge_ids
     FROM users account
     LEFT JOIN profile_preferences preference ON preference.user_id = account.id
     WHERE account.id = $1
     LIMIT 1`,
    [userId],
  );
  const row = result.rows[0];
  const role = row ? parseAccountRole(row.role) : undefined;
  if (!row || !role) return undefined;
  if (row.pinned_badge_ids !== null && !Array.isArray(row.pinned_badge_ids)) throw new TeamRepositoryDataError();
  return {
    id: row.id,
    displayName: row.display_name,
    role,
    disabled: row.disabled_at !== null,
    activeTitleId: row.active_title_id ?? undefined,
    pinnedBadgeIds: row.pinned_badge_ids ?? [],
  };
}

export async function sharesActiveTeam(viewerUserId: string, targetUserId: string) {
  assertUuid(viewerUserId);
  assertUuid(targetUserId);
  const result = await getDatabasePool().query(
    `SELECT team.id
     FROM teams team
     JOIN team_members viewer ON viewer.team_id = team.id AND viewer.user_id = $1
     JOIN team_members target ON target.team_id = team.id AND target.user_id = $2
     WHERE team.active = true
     LIMIT 1`,
    [viewerUserId, targetUserId],
  );
  return Boolean(result.rowCount);
}

export async function listVisibleSocialTeams(input: {
  viewerUserId: string;
  targetUserId: string;
  viewerCanManageTeams: boolean;
}) {
  assertUuid(input.viewerUserId);
  assertUuid(input.targetUserId);
  const result = await getDatabasePool().query<{
    id: string;
    name: string;
    slug: string;
    team_role: string;
  }>(
    `SELECT team.id, team.name, team.slug, target.team_role
     FROM teams team
     JOIN team_members target ON target.team_id = team.id AND target.user_id = $2
     LEFT JOIN team_members viewer ON viewer.team_id = team.id AND viewer.user_id = $1
     WHERE team.active = true
       AND ($3::boolean OR $1 = $2 OR viewer.user_id IS NOT NULL)
     ORDER BY lower(team.name) ASC, team.id ASC`,
    [input.viewerUserId, input.targetUserId, input.viewerCanManageTeams],
  );
  return result.rows.map((row) => {
    const teamRole = parseTeamRole(row.team_role);
    if (!teamRole) throw new TeamRepositoryDataError();
    return { id: row.id, name: row.name, slug: row.slug, teamRole };
  });
}

export async function createTeam(input: TeamInput & { createdByUserId: string }) {
  assertUuid(input.createdByUserId);
  try {
    const result = await getDatabasePool().query<TeamRow>(
      `INSERT INTO teams (name, slug, description, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, slug, description, active, created_by_user_id,
                 created_at, updated_at, '0'::text AS member_count`,
      [input.name, input.slug, input.description ?? null, input.createdByUserId],
    );
    return mapTeam(result.rows[0]);
  } catch (error) {
    if (postgresErrorCode(error) === "23505") throw new TeamConflictError();
    throw error;
  }
}

export async function updateTeam(teamId: string, input: Pick<TeamInput, "name" | "description">) {
  assertUuid(teamId);
  try {
    const result = await getDatabasePool().query<TeamRow>(
      `UPDATE teams
       SET name = $2, description = $3, updated_at = clock_timestamp()
       WHERE id = $1
       RETURNING id, name, slug, description, active, created_by_user_id,
                 created_at, updated_at,
                 (SELECT count(*)::text FROM team_members WHERE team_id = $1) AS member_count`,
      [teamId, input.name, input.description ?? null],
    );
    if (!result.rows[0]) throw new TeamTargetError();
    return mapTeam(result.rows[0]);
  } catch (error) {
    if (postgresErrorCode(error) === "23505") throw new TeamConflictError();
    throw error;
  }
}

export async function setTeamActive(teamId: string, active: boolean) {
  assertUuid(teamId);
  const result = await getDatabasePool().query<{ slug: string }>(
    `UPDATE teams
     SET active = $2,
         updated_at = CASE WHEN active IS DISTINCT FROM $2 THEN clock_timestamp() ELSE updated_at END
     WHERE id = $1
     RETURNING slug`,
    [teamId, active],
  );
  if (!result.rows[0]) throw new TeamTargetError();
  return result.rows[0];
}

export async function addTeamMember(teamId: string, userId: string, teamRole: TeamRole) {
  assertUuid(teamId);
  assertUuid(userId);
  try {
    const result = await getDatabasePool().query(
      `INSERT INTO team_members (team_id, user_id, team_role)
       SELECT team.id, account.id, $3
       FROM teams team
       JOIN users account ON account.id = $2 AND account.disabled_at IS NULL
       WHERE team.id = $1 AND team.active = true
       RETURNING team_id`,
      [teamId, userId, teamRole],
    );
    if (!result.rowCount) throw new TeamTargetError();
  } catch (error) {
    if (postgresErrorCode(error) === "23505") throw new TeamMemberConflictError();
    throw error;
  }
}

export async function updateTeamMemberRole(teamId: string, userId: string, teamRole: TeamRole) {
  assertUuid(teamId);
  assertUuid(userId);
  const result = await getDatabasePool().query(
    `UPDATE team_members membership
     SET team_role = $3,
         updated_at = CASE
           WHEN membership.team_role IS DISTINCT FROM $3 THEN clock_timestamp()
           ELSE membership.updated_at
         END
     FROM teams team
     WHERE membership.team_id = $1
       AND membership.user_id = $2
       AND team.id = membership.team_id
       AND team.active = true
     RETURNING membership.team_id`,
    [teamId, userId, teamRole],
  );
  if (!result.rowCount) throw new TeamMembershipTargetError();
}

export async function removeTeamMember(teamId: string, userId: string) {
  assertUuid(teamId);
  assertUuid(userId);
  const result = await getDatabasePool().query(
    `DELETE FROM team_members membership
     USING teams team
     WHERE membership.team_id = $1
       AND membership.user_id = $2
       AND team.id = membership.team_id
     RETURNING membership.team_id`,
    [teamId, userId],
  );
  if (!result.rowCount) throw new TeamMembershipTargetError();
}

function teamSelect() {
  return `SELECT team.id, team.name, team.slug, team.description, team.active,
                 team.created_by_user_id, team.created_at, team.updated_at,
                 count(member.user_id)::text AS member_count
          FROM teams team
          LEFT JOIN team_members member ON member.team_id = team.id`;
}

function mapTeam(row: TeamRow): TeamRecord {
  const memberCount = parseCount(row.member_count);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    active: row.active,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberCount,
  };
}

function mapMember(row: TeamMemberRow): TeamMemberRecord {
  const accountRole = parseAccountRole(row.account_role);
  const teamRole = parseTeamRole(row.team_role);
  const totalXp = parseCount(row.total_xp);
  if (!accountRole || !teamRole || row.pinned_badge_ids && !Array.isArray(row.pinned_badge_ids)) {
    throw new TeamRepositoryDataError();
  }
  return {
    id: row.id,
    displayName: row.display_name,
    accountRole,
    disabled: row.disabled_at !== null,
    teamRole,
    joinedAt: row.joined_at,
    totalXp,
    activeTitleId: row.active_title_id ?? undefined,
    pinnedBadgeIds: row.pinned_badge_ids ?? [],
  };
}

function parseCount(value: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new TeamRepositoryDataError();
  return parsed;
}

function assertUuid(value: string) {
  if (!isUuid(value)) throw new TeamTargetError();
}

function postgresErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
}

export class TeamConflictError extends Error {
  constructor() {
    super("A team with this name or slug already exists.");
    this.name = "TeamConflictError";
  }
}

export class TeamMemberConflictError extends Error {
  constructor() {
    super("The account already belongs to this team.");
    this.name = "TeamMemberConflictError";
  }
}

export class TeamTargetError extends Error {
  constructor() {
    super("The team or account target is unavailable.");
    this.name = "TeamTargetError";
  }
}

export class TeamMembershipTargetError extends Error {
  constructor() {
    super("The team membership target is unavailable.");
    this.name = "TeamMembershipTargetError";
  }
}

export class TeamRepositoryDataError extends Error {
  constructor() {
    super("Team data violates the application contract.");
    this.name = "TeamRepositoryDataError";
  }
}
