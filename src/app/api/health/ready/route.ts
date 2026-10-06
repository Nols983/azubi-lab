import { getDatabasePool } from "../../../lib/server/db";
import { checkEvidenceStorageReadiness } from "../../../lib/server/evidence-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [databaseResult, evidenceReady] = await Promise.all([
      getDatabasePool().query("SELECT 1"),
      checkEvidenceStorageReadiness(),
    ]);
    if (databaseResult.rowCount !== 1 || !evidenceReady) return unavailable();
    return Response.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return unavailable();
  }
}

function unavailable() {
  return Response.json(
    { status: "unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
