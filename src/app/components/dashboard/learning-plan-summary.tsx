import Link from "next/link";
import type { getDashboardLearningPlanView } from "../../lib/server/curriculum-planning-service.ts";
import { formatPlanningDate } from "../curriculum/curriculum-plan-card.tsx";

type LearningPlanData = Awaited<ReturnType<typeof getDashboardLearningPlanView>>;

export function LearningPlanSummary({ data }: { data: LearningPlanData }) {
  return (
    <section aria-labelledby="learning-plan-summary-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-blue-700">Trainerplanung</p>
      <h2 id="learning-plan-summary-heading" className="mt-1 text-xl font-bold text-slate-950">Mein Lernplan</h2>
      {data.audience === "learner" ? <LearnerSummary data={data} /> : data.audience === "admin" ? (
        <><p className="mt-4 text-sm leading-6 text-slate-600">Administrationskonten verwalten Lernpläne in der Lernenden- und Curriculum-Auswertung.</p><Link href="/admin" className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zur Trainerübersicht <span aria-hidden="true" className="ml-2">→</span></Link></>
      ) : data.audience === "unavailable" ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">Für diese Kontorolle wird kein persönlicher Lernplan geführt.</p>
      ) : (
        <><p className="mt-4 text-sm leading-6 text-slate-600">Melde dich mit deinem Lernkonto an, um zugewiesene Module und Zieltermine zu sehen.</p><Link href="/login?callbackUrl=%2Flernplan" className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zum Lernkonto anmelden <span aria-hidden="true" className="ml-2">→</span></Link></>
      )}
    </section>
  );
}

function LearnerSummary({ data }: { data: Extract<LearningPlanData, { audience: "learner" }> }) {
  if (!data.assignedCount) return <><p className="mt-4 text-sm leading-6 text-slate-600">Aktuell sind keine Module fest zugewiesen. Der gesamte Lehrplan bleibt frei zugänglich.</p><Link href="/lernplan" className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Lernplan öffnen <span aria-hidden="true" className="ml-2">→</span></Link></>;
  return (
    <>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <SummaryValue label="Offen" value={data.activeCount} />
        <SummaryValue label="Überfällig" value={data.overdueCount} urgent={data.overdueCount > 0} />
        <SummaryValue label="Erledigt" value={data.completedCount} />
      </dl>
      {data.next && <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-900">Als Nächstes: {data.next.module.title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{data.next.isOverdue ? "Zieltermin überschritten" : data.next.targetAt ? `Ziel: ${formatPlanningDate(data.next.targetAt, true)}` : "Ohne festen Zieltermin"} · {data.next.progress.percentage} %</p></div>}
      <Link href="/lernplan" className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Vollständigen Lernplan öffnen <span aria-hidden="true" className="ml-2">→</span></Link>
    </>
  );
}

function SummaryValue({ label, value, urgent = false }: { label: string; value: number; urgent?: boolean }) {
  return <div className={`rounded-xl border p-3 ${urgent ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}><dt className={`text-xs font-bold uppercase tracking-wide ${urgent ? "text-red-800" : "text-slate-600"}`}>{label}</dt><dd className="mt-1 text-2xl font-bold text-slate-950">{value}</dd></div>;
}
