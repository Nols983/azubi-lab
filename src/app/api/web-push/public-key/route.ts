import {
  AuthenticationRequiredError,
  PasswordChangeRequiredError,
  requireAuthenticatedUser,
} from "../../../lib/server/current-user.ts";
import {
  getWebPushConfiguration,
  WebPushConfigurationError,
} from "../../../lib/server/web-push-config.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  try {
    await requireAuthenticatedUser();
    return Response.json({ publicKey: getWebPushConfiguration().publicKey }, { headers });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError || error instanceof PasswordChangeRequiredError) {
      return Response.json({ error: "authentication_required" }, { status: 401, headers });
    }
    if (error instanceof WebPushConfigurationError) {
      return Response.json({ error: "push_unavailable" }, { status: 503, headers });
    }
    console.error("[azubi-lab] web push public configuration failed", error instanceof Error ? error.name : "UnknownError");
    return Response.json({ error: "push_unavailable" }, { status: 503, headers });
  }
}
