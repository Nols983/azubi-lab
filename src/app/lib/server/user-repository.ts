import "server-only";

import { parseAccountRole } from "../account-security";
import type { AccountRole, CurrentUser } from "../auth-types";
import { getDatabasePool } from "./db";

export type AuthenticationUser = {
  id: string;
  login: string;
  displayName: string;
  passwordHash: string;
  disabledAt: Date | null;
  authVersion: number;
};

export type DatabaseUser = CurrentUser & {
  authVersion: number;
  disabledAt: Date | null;
  createdAt: Date;
  passwordChangedAt: Date | null;
};

type UserRow = {
  id: string;
  login_identifier: string;
  display_name: string;
  password_hash: string;
  disabled_at: Date | null;
  role: string;
  must_change_password: boolean;
  auth_version: number;
  created_at: Date;
  password_changed_at: Date | null;
};

type DatabaseUserRow = Omit<UserRow, "password_hash">;
type AuthenticationUserRow = Pick<
  UserRow,
  "id" | "login_identifier" | "display_name" | "password_hash" | "disabled_at" | "auth_version"
>;

export async function findUserForAuthentication(login: string): Promise<AuthenticationUser | undefined> {
  const result = await getDatabasePool().query<AuthenticationUserRow>(
    `SELECT id, login_identifier, display_name, password_hash, disabled_at, auth_version
     FROM users
     WHERE lower(login_identifier) = lower($1)
     LIMIT 1`,
    [login],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    id: row.id,
    login: row.login_identifier,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    disabledAt: row.disabled_at,
    authVersion: row.auth_version,
  };
}

export async function findDatabaseUserById(id: string): Promise<DatabaseUser | undefined> {
  const result = await getDatabasePool().query<DatabaseUserRow>(
    `SELECT id, login_identifier, display_name, disabled_at, role,
            must_change_password, auth_version, created_at, password_changed_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  const role = parseAccountRole(row.role);
  if (!role) return undefined;
  return mapDatabaseUser(row, role);
}

function mapDatabaseUser(row: DatabaseUserRow, role: AccountRole): DatabaseUser {
  return {
    id: row.id,
    login: row.login_identifier,
    displayName: row.display_name,
    role,
    mustChangePassword: row.must_change_password,
    authVersion: row.auth_version,
    disabledAt: row.disabled_at,
    createdAt: row.created_at,
    passwordChangedAt: row.password_changed_at,
  };
}
