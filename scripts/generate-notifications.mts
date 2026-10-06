import { generateNotifications } from "../src/app/lib/server/notification-generation-service.ts";
import { getDatabasePool } from "../src/app/lib/server/db.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to generate notifications.");

try {
  const result = await generateNotifications(new Date());
  console.log(JSON.stringify({ status: "ok", ...result }));
} finally {
  await getDatabasePool().end();
}
