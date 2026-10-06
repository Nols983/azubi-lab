import {
  AuthenticationRequiredError,
  PasswordChangeRequiredError,
  requireAuthenticatedUser,
} from "../../../lib/server/current-user.ts";
import {
  LocalFilesystemProfileImageStorage,
  ProfileImageStorageError,
} from "../../../lib/server/profile-image.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const bytes = await new LocalFilesystemProfileImageStorage().read(user.id);
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
    if (error instanceof ProfileImageStorageError) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    console.error("[azubi-lab] profile image read failed", error instanceof Error ? error.name : "UnknownError");
    return new Response(null, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
