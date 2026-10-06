import assert from "node:assert/strict";
import { getDatabasePool } from "../src/app/lib/server/db.ts";
import {
  addTeamMember,
  createTeam,
  findTeamAccessBySlug,
  listActiveTeamsForUser,
  listTeamMembers,
  removeTeamMember,
  setTeamActive,
  sharesActiveTeam,
  TeamConflictError,
  TeamMemberConflictError,
  updateTeam,
  updateTeamMemberRole,
} from "../src/app/lib/server/team-repository.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const userIds: string[] = [];
const teamIds: string[] = [];

try {
  const migration = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations WHERE filename = '0021_teams_and_memberships.sql'",
  );
  assert.equal(migration.rows[0]?.filename, "0021_teams_and_memberships.sql");

  const adminId = await insertUser(`team-${suffix}-admin`, "Team DB Admin", "admin");
  const learnerA = await insertUser(`team-${suffix}-learner-a`, "Team DB Anna", "learner");
  const learnerB = await insertUser(`team-${suffix}-learner-b`, "Team DB Berta", "learner");
  const staffId = await insertUser(`team-${suffix}-staff`, "Team DB Trainer", "instructor");

  const teamA = await createTeam({
    name: `DB Team A ${suffix}`,
    slug: `db-team-a-${suffix}`,
    description: "Disposable Team A",
    createdByUserId: adminId,
  });
  const teamB = await createTeam({
    name: `DB Team B ${suffix}`,
    slug: `db-team-b-${suffix}`,
    createdByUserId: adminId,
  });
  teamIds.push(teamA.id, teamB.id);

  const renamedTeamB = await updateTeam(teamB.id, {
    name: `DB Team B renamed ${suffix}`,
    description: "Renamed without changing its stable route",
  });
  assert.equal(renamedTeamB.slug, teamB.slug);
  assert.equal(renamedTeamB.description, "Renamed without changing its stable route");

  await assert.rejects(
    () => createTeam({
      name: `DB Team Duplicate Slug ${suffix}`,
      slug: teamA.slug,
      createdByUserId: adminId,
    }),
    TeamConflictError,
  );

  await addTeamMember(teamA.id, learnerA, "member");
  await addTeamMember(teamA.id, learnerB, "member");
  await addTeamMember(teamA.id, staffId, "manager");
  await addTeamMember(teamB.id, learnerA, "manager");
  await assert.rejects(() => addTeamMember(teamA.id, learnerA, "member"), TeamMemberConflictError);

  await updateTeamMemberRole(teamA.id, learnerB, "manager");
  assert.equal((await listTeamMembers(teamA.id)).find((member) => member.id === learnerB)?.teamRole, "manager");
  await updateTeamMemberRole(teamA.id, learnerB, "member");

  assert.equal((await listActiveTeamsForUser(learnerA)).length, 2);
  assert.equal((await listTeamMembers(teamA.id)).filter((member) => member.id === learnerA).length, 1);
  assert.equal(await sharesActiveTeam(learnerA, learnerB), true);

  await assert.rejects(
    () => pool.query(
      "INSERT INTO team_members (team_id, user_id, team_role) VALUES ($1, $2, 'admin')",
      [teamB.id, learnerB],
    ),
    (error: unknown) => postgresCode(error) === "23514",
  );

  await pool.query(
    `INSERT INTO xp_events (user_id, source_type, source_key, xp_amount, awarded_at)
     VALUES ($1, 'lesson', 'team-db:test', 25, clock_timestamp())`,
    [learnerA],
  );
  await removeTeamMember(teamA.id, learnerA);
  assert.equal((await pool.query("SELECT 1 FROM users WHERE id = $1", [learnerA])).rowCount, 1);
  assert.equal((await pool.query("SELECT 1 FROM xp_events WHERE user_id = $1", [learnerA])).rowCount, 1);
  assert.equal((await pool.query("SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2", [teamB.id, learnerA])).rowCount, 1);

  await setTeamActive(teamA.id, false);
  assert.equal(await sharesActiveTeam(staffId, learnerB), false);
  assert.equal((await listActiveTeamsForUser(learnerB)).some((team) => team.id === teamA.id), false);
  const archivedAccess = await findTeamAccessBySlug(teamA.slug, learnerB);
  assert.equal(archivedAccess?.active, false);
  assert.equal(archivedAccess?.viewerTeamRole, "member");

  console.log("Team database integration: PASS");
} finally {
  if (teamIds.length > 0) await pool.query("DELETE FROM teams WHERE id = ANY($1::uuid[])", [teamIds]);
  if (userIds.length > 0) await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  const remainingTeams = Number((await pool.query(
    "SELECT count(*) FROM teams WHERE slug LIKE $1",
    [`db-team-%-${suffix}`],
  )).rows[0].count);
  const remainingUsers = Number((await pool.query(
    "SELECT count(*) FROM users WHERE login_identifier LIKE $1",
    [`team-${suffix}%`],
  )).rows[0].count);
  assert.equal(remainingTeams, 0);
  assert.equal(remainingUsers, 0);
  await pool.end();
}

async function insertUser(login: string, displayName: string, role: "learner" | "instructor" | "admin") {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role)
     VALUES ($1, $2, 'team-integration-test-hash', $3)
     RETURNING id`,
    [login, displayName, role],
  );
  userIds.push(result.rows[0].id);
  return result.rows[0].id;
}

function postgresCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}
