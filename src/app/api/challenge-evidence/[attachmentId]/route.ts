import { getAuthorizedEvidenceDownload } from "../../../lib/server/challenge-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  try {
    const result = await getAuthorizedEvidenceDownload((await params).attachmentId);
    if (!result) return safeTextResponse("Nachweis nicht gefunden.", 404);
    if (result.unavailable) return safeTextResponse("Der Nachweis ist derzeit nicht verfügbar.", 410);
    return new Response(result.bytes, {
      status: 200,
      headers: {
        "Content-Type": result.attachment.mimeType,
        "Content-Length": String(result.attachment.byteSize),
        "Content-Disposition": contentDisposition(result.attachment.originalFilename),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return safeTextResponse("Nachweis nicht gefunden.", 404);
  }
}

function safeTextResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

function contentDisposition(filename: string) {
  const fallback = filename
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_")
    .slice(0, 180) || "nachweis";
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
