import Link from "next/link";
import type { LabCatalogueView } from "../../lib/interactive-lab.ts";

const statusPresentation = {
  locked: { label: "Gesperrt", style: "border-slate-300 bg-slate-100 text-slate-700" },
  available: { label: "Verfügbar", style: "border-blue-200 bg-blue-50 text-blue-800" },
  "in-progress": { label: "In Bearbeitung", style: "border-amber-300 bg-amber-50 text-amber-900" },
  completed: { label: "Abgeschlossen", style: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  preview: { label: "Vorschau", style: "border-violet-300 bg-violet-50 text-violet-900" },
} as const;

export function LabCatalogue({ view }: { view: LabCatalogueView }) {
  const tutorialCards = view.cards.filter((card) => card.kind === "tutorial");
  const troubleshootingCards = view.cards.filter((card) => card.kind === "troubleshooting");
  return (
    <>
      <section aria-labelledby="lab-progress-heading" className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
        <h2 id="lab-progress-heading" className="font-bold text-blue-950">{view.audience === "preview" ? "Trainer-Vorschau" : "Dein Lab-Fortschritt"}</h2>
        <p className="mt-2 leading-7 text-blue-950">{view.audience === "preview" ? "Alle Labs sind zum Testen freigeschaltet. Vorschauversuche erzeugen weder Lernendenfortschritt noch XP." : `${view.completedCount} von ${view.totalCount} Labs abgeschlossen`}</p>
      </section>
      <section aria-labelledby="introduction-lab-heading">
        <div className="mb-4"><p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">Erster Schritt</p><h2 id="introduction-lab-heading" className="mt-1 text-2xl font-bold text-slate-950">Einführung</h2><p className="mt-2 text-sm leading-6 text-slate-600">Lerne Oberfläche und Ablauf einmal geführt kennen. Das Tutorial bleibt danach zum Wiederholen verfügbar.</p></div>
        <ul className="grid gap-5">{tutorialCards.map((card) => <LabCard key={card.id} card={card} />)}</ul>
      </section>
      <section aria-labelledby="troubleshooting-labs-heading">
        <div className="mb-4"><p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">Praxisfälle</p><h2 id="troubleshooting-labs-heading" className="mt-1 text-2xl font-bold text-slate-950">Troubleshooting-Labs</h2></div>
        <ul className="grid gap-5 lg:grid-cols-2">{troubleshootingCards.map((card) => <LabCard key={card.id} card={card} />)}</ul>
      </section>
    </>
  );
}

function LabCard({ card }: { card: LabCatalogueView["cards"][number] }) {
  const status = statusPresentation[card.status];
  return (
    <li className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-bold text-blue-700">{card.category}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{card.title}</h3></div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${status.style}`}>{status.label}</span>
      </div>
      <p className="mt-3 leading-7 text-slate-600">{card.summary}</p>
      <p className="mt-3 text-sm text-slate-600"><strong>{card.difficulty}</strong> · etwa {card.estimatedMinutes} Minuten · Version {card.version}</p>
      <Requirements requirements={card.requirements} locked={card.status === "locked"} />
      <Link href={card.actionHref} className={`mt-auto inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${card.status === "locked" ? "border border-slate-300 bg-white text-slate-800 hover:border-blue-400" : "bg-blue-950 text-white hover:bg-blue-900"}`}>
        {card.status === "locked" ? "Voraussetzungen ansehen" : card.status === "in-progress" ? "Lab fortsetzen" : card.status === "completed" ? "Abschluss ansehen" : card.status === "preview" ? "Vorschau öffnen" : card.kind === "tutorial" ? "Tutorial starten" : "Lab öffnen"}
      </Link>
    </li>
  );
}

export function Requirements({ requirements, locked }: { requirements: LabCatalogueView["cards"][number]["requirements"]; locked: boolean }) {
  if (requirements.bypassed) return <p className="my-5 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-950"><strong>Vorschau:</strong> Lernvoraussetzungen werden für Lehrkräfte nicht als Lernendenstatus simuliert.</p>;
  const missingLabs = requirements.labs.filter((lab) => !lab.satisfied);
  if (!requirements.level && requirements.modules.length === 0 && missingLabs.length === 0) return <p className="my-5 text-sm font-semibold text-emerald-800">Keine Voraussetzungen – direkt verfügbar.</p>;
  return (
    <section aria-label={locked ? "Fehlende Voraussetzungen" : "Erfüllte Voraussetzungen"} className={`my-5 rounded-xl border p-4 text-sm ${locked ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <h3 className="font-bold text-slate-950">Voraussetzungen</h3>
      {requirements.level && <p className="mt-2 text-slate-700"><span aria-hidden="true">{requirements.level.satisfied ? "✓" : "✗"} </span>Benötigt Level {requirements.level.required}. Dein aktuelles Level: {requirements.level.current}</p>}
      {missingLabs.length > 0 && <><p className="mt-2 font-semibold text-slate-800">Benötigtes Einführungslab:</p><ul className="mt-1 space-y-1">{missingLabs.map((lab) => <li key={lab.id}><span aria-hidden="true">✗ </span><Link href={lab.href} className="font-semibold text-blue-900 underline decoration-blue-300 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{lab.title}</Link><span className="sr-only"> – noch nicht abgeschlossen</span>{locked && <span className="mt-1 block text-amber-900">Schließe zuerst das Einführungslab ab.</span>}</li>)}</ul></>}
      {requirements.modules.length > 0 && <><p className="mt-2 font-semibold text-slate-800">Benötigte Module:</p><ul className="mt-1 space-y-1">{requirements.modules.map((module) => <li key={module.href}><span aria-hidden="true">{module.satisfied ? "✓" : "✗"} </span><Link href={module.href} className="font-semibold text-blue-900 underline decoration-blue-300 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{module.title}</Link><span className="sr-only"> – {module.satisfied ? "abgeschlossen" : "noch nicht abgeschlossen"}</span></li>)}</ul></>}
    </section>
  );
}
