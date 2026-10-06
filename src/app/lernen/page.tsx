import type { Metadata } from "next";
import Link from "next/link";
import { LearningOverview } from "../components/learning/learning-overview";
import { learningModules } from "../data/learning-modules";

export const metadata: Metadata = { title: "Lernen" };

export default function LearnPage() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Lernbereich</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Lernen</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Wähle ein Lernthema aus und setze deinen Lernfortschritt dort fort, wo du aufgehört hast.</p>
      </header>
      <section aria-labelledby="labs-heading" className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-7">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">Praxisumgebung</p>
        <h2 id="labs-heading" className="mt-2 text-2xl font-bold text-blue-950">Fehler in interaktiven Labs untersuchen</h2>
        <p className="mt-3 max-w-3xl leading-7 text-blue-950">Nutze die Inhalte aus den Lernmodulen in sicheren, deterministischen Netzwerk- und System-Szenarien – ohne echte Shell oder externe Systeme.</p>
        <Link href="/labs" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Troubleshooting-Labs öffnen</Link>
      </section>
      <LearningOverview modules={learningModules} />
    </div>
  );
}
