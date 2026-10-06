import "server-only";

import { Pool, type PoolClient } from "pg";

declare global {
  var azubiLabPostgresPool: Pool | undefined;
}

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("Database configuration is unavailable.");
    this.name = "DatabaseConfigurationError";
  }
}

export function getDatabasePool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseConfigurationError();
  if (!globalThis.azubiLabPostgresPool) {
    globalThis.azubiLabPostgresPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return globalThis.azubiLabPostgresPool;
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
