import "server-only";

import { parseAccountRole } from "../account-security.ts";
import type { AccountDirectoryFilters } from "../account-directory.ts";
import type { TeamRole } from "../team-domain.ts";
import type { AccountSummaryRecord } from "./admin-repository.ts";
import { withTransaction, getDatabasePool } from "./db.ts";

export type AccountDirectoryTeam = { id: string; name: string; teamRole: TeamRole; active: boolean };
export type AccountDirectoryRecord = AccountSummaryRecord & { teams: AccountDirectoryTeam[] };
type AccountRow = {
  id: string; display_name: string; login_identifier: string; role: string;
  must_change_password: boolean; disabled_at: Date | null; created_at: Date;
  teams: AccountDirectoryTeam[];
};
const accountSelect = `SELECT account.id, account.display_name, account.login_identifier, account.role,
  account.must_change_password, account.disabled_at, account.created_at,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id', team.id, 'name', team.name,
    'teamRole', membership.team_role, 'active', team.active) ORDER BY lower(team.name), team.id)
    FROM team_members membership JOIN teams team ON team.id = membership.team_id
    WHERE membership.user_id = account.id), '[]'::jsonb) AS teams
  FROM users account`;

export async function readAccountDirectory(filters: AccountDirectoryFilters, avatarUserIds?: readonly string[]) {
  return withTransaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const values: unknown[] = [];
    const conditions: string[] = [];
    const bind = (value: unknown) => { values.push(value); return `$${values.length}`; };
    if (filters.query) {
      const pattern = `%${filters.query.replace(/[\\%_]/g, "\\$&")}%`;
      const param = bind(pattern);
      conditions.push(`(account.display_name ILIKE ${param} OR account.login_identifier ILIKE ${param})`);
    }
    if (filters.team === "none") conditions.push("NOT EXISTS (SELECT 1 FROM team_members membership WHERE membership.user_id = account.id)");
    else if (filters.team !== "all") conditions.push(`EXISTS (SELECT 1 FROM team_members membership WHERE membership.user_id = account.id AND membership.team_id::text = ${bind(filters.team)})`);
    if (filters.role !== "all") conditions.push(`account.role = ${bind(filters.role)}`);
    if (filters.status === "disabled") conditions.push("account.disabled_at IS NOT NULL");
    if (filters.status === "active") conditions.push("account.disabled_at IS NULL AND account.must_change_password = false");
    if (filters.status === "password-change") conditions.push("account.disabled_at IS NULL AND account.must_change_password = true");
    if (filters.withAvatar) conditions.push(`account.id = ANY(${bind(avatarUserIds ?? [])}::uuid[])`);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const count = Number((await client.query<{ count: string }>(`SELECT count(*) FROM users account ${where}`, values)).rows[0].count);
    const pages = Math.max(1, Math.ceil(count / filters.pageSize));
    const page = Math.min(filters.page, pages);
    const order = filters.sort === "newest" ? "account.created_at DESC, account.id" : filters.sort === "oldest" ? "account.created_at ASC, account.id" : "lower(account.display_name), lower(account.login_identifier), account.id";
    const limit = bind(filters.pageSize);
    const offset = bind((page - 1) * filters.pageSize);
    const rows = await client.query<AccountRow>(`${accountSelect} ${where} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`, values);
    const totals = (await client.query<{ all_count: string; unassigned_count: string }>(
      `SELECT count(*) AS all_count, count(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM team_members membership WHERE membership.user_id = account.id)) AS unassigned_count FROM users account`,
    )).rows[0];
    return { accounts: rows.rows.map(mapAccount), count, pages, filters: { ...filters, page }, allCount: Number(totals.all_count), unassignedCount: Number(totals.unassigned_count) };
  });
}

export async function findDirectoryAccount(userId: string) {
  const result = await getDatabasePool().query<AccountRow>(`${accountSelect} WHERE account.id = $1`, [userId]);
  return result.rows[0] ? mapAccount(result.rows[0]) : undefined;
}
function mapAccount(row: AccountRow): AccountDirectoryRecord {
  const role = parseAccountRole(row.role);
  if (!role) throw new Error("Invalid account role in directory.");
  return { id: row.id, displayName: row.display_name, login: row.login_identifier, role,
    disabledAt: row.disabled_at, mustChangePassword: row.must_change_password, createdAt: row.created_at, teams: row.teams };
}
