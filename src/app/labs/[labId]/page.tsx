import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LabWorkspace } from "../../components/labs/lab-workspace.tsx";
import { AuthenticationRequiredError, PasswordChangeRequiredError } from "../../lib/server/current-user.ts";
import { getLabPage, LabDefinitionNotFoundError } from "../../lib/server/lab-service.ts";

export const metadata: Metadata = { title: "Troubleshooting-Lab" };
export const dynamic = "force-dynamic";

export default async function LabPage({ params }: { params: Promise<{ labId: string }> }) {
  const { labId } = await params;
  let view;
  try { view = await getLabPage(labId); }
  catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect(`/login?callbackUrl=${encodeURIComponent(`/labs/${labId}`)}`);
    if (error instanceof PasswordChangeRequiredError) redirect(`/konto/passwort-aendern?callbackUrl=${encodeURIComponent(`/labs/${labId}`)}`);
    if (error instanceof LabDefinitionNotFoundError) notFound();
    console.error("[azubi-lab] lab page failed", error instanceof Error ? error.name : "UnknownError");
    return <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6"><h1 className="text-2xl font-bold text-slate-950">Lab vorübergehend nicht verfügbar</h1><p className="mt-3 text-slate-700">Der Versuch konnte gerade nicht sicher geladen werden.</p></section>;
  }
  return (
    <div className="mx-auto max-w-6xl">
      <p><Link href="/labs" className="font-bold text-blue-900 underline decoration-blue-300 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">← Alle Labs</Link></p>
      <header className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">{view.definition.category} · Version {view.definition.version}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{view.definition.title}</h1>
        {view.definition.kind === "tutorial" ? (
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            {view.definition.summary}
          </p>
        ) : null}
      </header>
      <div className={view.definition.kind === "tutorial" ? "mt-8" : "mt-6"}>
        <LabWorkspace initial={view} />
      </div>
    </div>
  );
}
