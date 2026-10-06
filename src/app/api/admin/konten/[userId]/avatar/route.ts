import {
  AdminAvatarTargetError,
  readAccountAvatarAsAdmin,
} from "../../../../../lib/server/admin-avatar-service.ts";
import {
  AuthenticationRequiredError,
  CapabilityAuthorizationError,
  PasswordChangeRequiredError,
} from "../../../../../lib/server/current-user.ts";
import { ProfileImageStorageError } from "../../../../../lib/server/profile-image.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await context.params;
    const bytes = await readAccountAvatarAsAdmin(userId);
    return new Response(bytes, {
      headers: {
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Type": "image/webp",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError || error instanceof PasswordChangeRequiredError) {
      return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof CapabilityAuthorizationError) {
      return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof AdminAvatarTargetError || error instanceof ProfileImageStorageError) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    console.error("[azubi-lab] admin profile image read failed", error instanceof Error ? error.name : "UnknownError");
    return new Response(null, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
