import { Client } from "pg";
import { hashPassword } from "../src/app/lib/server/password.ts";

const databaseUrl = process.env.DATABASE_URL;
const login = process.env.SEED_USER_LOGIN?.trim();
const password = process.env.SEED_USER_PASSWORD;
const displayName = process.env.SEED_USER_DISPLAY_NAME?.trim();

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!login || login.length > 254) throw new Error("SEED_USER_LOGIN is required and must be at most 254 characters.");
if (!displayName || displayName.length > 120) throw new Error("SEED_USER_DISPLAY_NAME is required and must be at most 120 characters.");
if (!password || password.length < 12 || password.length > 256) throw new Error("SEED_USER_PASSWORD must contain 12 to 256 characters.");

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  const existing = await client.query<{ id: string }>(
    "SELECT id FROM users WHERE lower(login_identifier) = lower($1) LIMIT 1",
    [login],
  );
  if (existing.rowCount) {
    console.log("Learner already exists; no account data was changed.");
  } else {
    const passwordHash = await hashPassword(password);
    await client.query(
      "INSERT INTO users (login_identifier, display_name, password_hash) VALUES ($1, $2, $3)",
      [login, displayName, passwordHash],
    );
    console.log("Learner account created.");
  }
} finally {
  await client.end();
}
