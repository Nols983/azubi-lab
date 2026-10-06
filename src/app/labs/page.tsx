import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LabCatalogue } from "../components/labs/lab-catalogue.tsx";
import { AuthenticationRequiredError, PasswordChangeRequiredError } from "../lib/server/current-user.ts";
import { getLabCatalogue } from "../lib/server/lab-service.ts";

export const metadata: Metadata = { title: "Troubleshooting-Labs" };
export const dynamic = "force-dynamic";

export default async function LabsPage() {
  let view;
  try { view = await getLabCatalogue(); }
  catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login?callbackUrl=%2Flabs");
    if (error instanceof PasswordChangeRequiredError) redirect("/konto/passwort-aendern?callbackUrl=%2Flabs");
    console.error("[azubi-lab] lab catalogue failed", error instanceof Error ? error.name : "UnknownError");
    return <Unavailable />;
  }
  return <div className="space-y-8 sm:space-y-10"><header><p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Praxis</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Troubleshooting-Labs</h1><p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">Untersuche simulierte Geräte, führe sichere Diagnosebefehle aus und repariere konkrete Fehler. Es werden keine echten Systeme oder Netzwerke angesprochen.</p></header><LabCatalogue view={view} /></div>;
}

function Unavailable() { return <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6"><h1 className="text-2xl font-bold text-slate-950">Labs vorübergehend nicht verfügbar</h1><p className="mt-3 text-slate-700">Die Lab-Daten konnten gerade nicht sicher geladen werden. Bitte versuche es später erneut.</p></section>; }
