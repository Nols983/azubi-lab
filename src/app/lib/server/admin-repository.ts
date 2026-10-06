import "server-only";

import type { PoolClient } from "pg";
import { parseAccountRole } from "../account-security.ts";
import type { AccountCreationRole, AccountRole } from "../auth-types.ts";
import { getDatabasePool, withTransaction } from "./db.ts";

export type LearnerAccountRecord = {
  id: string;
  login: string;
  displayName: string;
  role: AccountRole;
  mustChangePassword: boolean;
  disabledAt: Date | null;
  createdAt: Date;
};

type LearnerAccountRow = {
  id: string;
  login_identifier: string;
  display_name: string;
  role: "learner";
  must_change_password: boolean;
  disabled_at: Date | null;
  created_at: Date;
};

type AccountSummaryRow = Omit<LearnerAccountRow, "role"> & { role: string };

export type AccountSummaryRecord = LearnerAccountRecord;

export class DuplicateLoginIdentifierError extends Error {
  constructor() {
    super("The login identifier already exists.");
    this.name = "DuplicateLoginIdentifierError";
  }
}

export class LearnerAccountNotFoundError extends Error {
  constructor() {
    super("The learner account does not exist.");
    this.name = "LearnerAccountNotFoundError";
  }
}

export class AccountRoleTargetError extends Error {
  constructor() {
    super("The account role target is unavailable.");
    this.name = "AccountRoleTargetError";
  }
}

export class AccountStatusTargetError extends Error {
  constructor() {
    super("The account status target is unavailable.");
    this.name = "AccountStatusTargetError";
  }
}

export class LastUsableAdminError extends Error {
  constructor() {
    super("The last usable administrator cannot lose administrative access.");
    this.name = "LastUsableAdminError";
  }
}

export type AccountStatusChangeResult = {
  changed: boolean;
  targetRole: AccountRole;
};

export async function listLearnerAccounts() {
  const result = await getDatabasePool().query<LearnerAccountRow>(
    `SELECT id, login_identifier, display_name, role, must_change_password, disabled_at, created_at
     FROM users
     WHERE role = 'learner'
     ORDER BY display_name ASC, login_identifier ASC`,
  );
  return result.rows.map(mapLearnerAccount);
}

export async function findLearnerAccountById(userId: string) {
  const result = await getDatabasePool().query<LearnerAccountRow>(
    `SELECT id, login_identifier, display_name, role, must_change_password, disabled_at, created_at
     FROM users
     WHERE id = $1 AND role = 'learner'
     LIMIT 1`,
    [userId],
  );
  return result.rows[0] ? mapLearnerAccount(result.rows[0]) : undefined;
}

export async function listAccountSummaries() {
  const result = await getDatabasePool().query<AccountSummaryRow>(
    `SELECT id, login_identifier, display_name, role, must_change_password, disabled_at, created_at
     FROM users
     ORDER BY display_name ASC, login_identifier ASC`,
  );
  return result.rows.flatMap((row) => {
    const role = parseAccountRole(row.role);
    return role ? [mapAccountSummary(row, role)] : [];
  });
}

export async function createLearnerAccount(input: { displayName: string; login: string; passwordHash: string }) {
  const account = await createManagedAccount({ ...input, role: "learner" });
  return { ...account, role: "learner" as const };
}

export async function createManagedAccount(input: {
  displayName: string;
  login: string;
  passwordHash: string;
  role: AccountCreationRole;
}) {
  try {
    return await withTransaction(async (client) => {
      const result = await client.query<AccountSummaryRow>(
        `INSERT INTO users
           (login_identifier, display_name, password_hash, role, must_change_password)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, login_identifier, display_name, role, must_change_password, disabled_at, created_at`,
        [input.login, input.displayName, input.passwordHash, input.role],
      );
      return mapAccountSummary(result.rows[0], input.role);
    });
  } catch (error) {
    if (postgresErrorCode(error) === "23505") throw new DuplicateLoginIdentifierError();
    throw error;
  }
}

export function changeAccountRole(input: {
  actorId: string;
  targetUserId: string;
  role: AccountRole;
}) {
  return withTransaction(async (client) => {
    if (input.actorId === input.targetUserId) throw new AccountRoleTargetError();
    const activeAdmins = await lockActiveAdministrators(client);
    if (!activeAdmins.rows.some((admin) => admin.id === input.actorId)) throw new AccountRoleTargetError();
    const target = await client.query<{ role: string }>(
      "SELECT role FROM users WHERE id = $1 FOR UPDATE",
      [input.targetUserId],
    );
    const currentRole = parseAccountRole(target.rows[0]?.role);
    if (!currentRole) throw new AccountRoleTargetError();
    if (currentRole === input.role) return false;

    if (
      currentRole === "admin"
      && activeAdmins.rows.some((admin) => admin.id === input.targetUserId)
      && activeAdmins.rowCount === 1
    ) {
      throw new LastUsableAdminError();
    }

    const changed = await client.query(
      `UPDATE users
       SET role = $2,
           auth_version = auth_version + 1,
           updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [input.targetUserId, input.role],
    );
    if (!changed.rowCount) throw new AccountRoleTargetError();
    return true;
  });
}

export function setAccountDisabled(input: {
  actorId: string;
  targetUserId: string;
  disabled: boolean;
}): Promise<AccountStatusChangeResult> {
  return withTransaction(async (client) => {
    const activeAdmins = await lockActiveAdministrators(client);
    if (!activeAdmins.rows.some((admin) => admin.id === input.actorId)) {
      throw new AccountStatusTargetError();
    }

    const target = await client.query<{ role: string; disabled_at: Date | null }>(
      "SELECT role, disabled_at FROM users WHERE id = $1 FOR UPDATE",
      [input.targetUserId],
    );
    const targetRow = target.rows[0];
    const targetRole = parseAccountRole(targetRow?.role);
    if (!targetRow || !targetRole || input.actorId === input.targetUserId) {
      throw new AccountStatusTargetError();
    }

    const currentlyDisabled = targetRow.disabled_at !== null;
    if (currentlyDisabled === input.disabled) return { changed: false, targetRole };

    if (
      input.disabled
      && targetRole === "admin"
      && activeAdmins.rows.some((admin) => admin.id === input.targetUserId)
      && activeAdmins.rows.length === 1
    ) {
      throw new LastUsableAdminError();
    }

    const changed = await client.query(
      `UPDATE users
       SET disabled_at = CASE WHEN $2::boolean THEN now() ELSE NULL END,
           auth_version = auth_version + 1,
           updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [input.targetUserId, input.disabled],
    );
    if (!changed.rowCount) throw new AccountStatusTargetError();
    return { changed: true, targetRole };
  });
}

export async function changeAccountPassword(userId: string, expectedAuthVersion: number, passwordHash: string) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE users
       SET password_hash = $3,
           must_change_password = false,
           password_changed_at = now(),
           auth_version = auth_version + 1,
           updated_at = now()
       WHERE id = $1 AND auth_version = $2 AND disabled_at IS NULL AND must_change_password = true
       RETURNING id`,
      [userId, expectedAuthVersion, passwordHash],
    );
    if (!result.rowCount) throw new LearnerAccountNotFoundError();
  });
}

function lockActiveAdministrators(client: PoolClient) {
  return client.query<{ id: string }>(
    `SELECT id FROM users
     WHERE role = 'admin' AND disabled_at IS NULL
     ORDER BY id
     FOR UPDATE`,
  );
}

function mapLearnerAccount(row: LearnerAccountRow): LearnerAccountRecord {
  return {
    id: row.id,
    login: row.login_identifier,
    displayName: row.display_name,
    role: row.role,
    mustChangePassword: row.must_change_password,
    disabledAt: row.disabled_at,
    createdAt: row.created_at,
  };
}

function mapAccountSummary(row: AccountSummaryRow, role: AccountRole): AccountSummaryRecord {
  return {
    id: row.id,
    login: row.login_identifier,
    displayName: row.display_name,
    role,
    mustChangePassword: row.must_change_password,
    disabledAt: row.disabled_at,
    createdAt: row.created_at,
  };
}

function postgresErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}
