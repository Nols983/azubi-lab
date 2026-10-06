import { Client } from "pg";
import { hashPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../src/app/lib/server/password.ts";

const databaseUrl = process.env.DATABASE_URL;
const login = process.env.ADMIN_LOGIN?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const displayName = process.env.ADMIN_DISPLAY_NAME?.trim();

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!login || login.length > 64 || !/^[a-z0-9][a-z0-9._@-]*$/.test(login)) {
  throw new Error("ADMIN_LOGIN is required and must use the supported normalized login format.");
}
if (!displayName || displayName.length < 2 || displayName.length > 120) {
  throw new Error("ADMIN_DISPLAY_NAME is required and must contain 2 to 120 characters.");
}
if (!password || password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
  throw new Error(`ADMIN_PASSWORD must contain ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters.`);
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  const existing = await client.query<{ role: string }>(
    "SELECT role FROM users WHERE lower(login_identifier) = lower($1) LIMIT 1",
    [login],
  );
  if (existing.rows[0]) {
    if (existing.rows[0].role === "admin") {
      console.log("Administrator already exists; no account data was changed.");
    } else {
      throw new Error("The login belongs to an existing learner and was not promoted.");
    }
  } else {
    const passwordHash = await hashPassword(password);
    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO users
           (login_identifier, display_name, password_hash, role, must_change_password)
         VALUES ($1, $2, $3, 'admin', false)`,
        [login, displayName, passwordHash],
      );
      await client.query("COMMIT");
      console.log("Administrator account created.");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}
