import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAccessDenied } from "../../../components/admin/admin-access-denied.tsx";
import { ModuleStatus } from "../../../components/learning/module-status.tsx";
import { ProgressBar } from "../../../components/progress-bar.tsx";
import { formatPlanningDate } from "../../../components/curriculum/curriculum-plan-card.tsx";
import { getTrainerPageAccess } from "../../../lib/server/admin-page-access.ts";
import { getAdminCurriculumModuleReport } from "../../../lib/server/admin-service.ts";

export const metadata: Metadata = { title: "Modulbericht" };
export const dynamic = "force-dynamic";

export default async function CurriculumModuleReportPage({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const { moduleSlug } = await params;
  const callbackUrl = `/admin/lerninhalte/${encodeURIComponent(moduleSlug)}`;
  const access = await getTrainerPageAccess(callbackUrl);
  if (!access.allowed) return <AdminAccessDenied />;
  const report = await getAdminCurriculumModuleReport(moduleSlug);
  if (!report) notFound();

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <Link href="/admin/lerninhalte" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zum Lerninhalte-Bericht</Link>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">{report.module.category}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{report.module.title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Lernstand aktiver Lernkonten. Quizwerte zeigen Versuche und Bestwerte, ohne eine zusätzliche Bestanden-Bewertung einzuführen.</p>
      </header>

      <section aria-labelledby="module-summary-heading" className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="module-summary-heading" className="text-2xl font-bold text-slate-950">Modulübersicht</h2>
        <div className="mt-5"><ProgressBar value={report.averageProgress} label={`Durchschnittlicher Fortschritt ${report.module.title}`} /></div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><SummaryValue label="Nicht begonnen" value={report.counts.notStarted} /><SummaryValue label="In Bearbeitung" value={report.counts.inProgress} /><SummaryValue label="Erledigt" value={report.counts.completed} /><SummaryValue label="Zugewiesen" value={report.counts.assigned} /><SummaryValue label="Planung überfällig" value={report.counts.overdue} urgent={report.counts.overdue > 0} /></dl>
      </section>

      <section aria-labelledby="module-learners-heading">
        <h2 id="module-learners-heading" className="text-2xl font-bold text-slate-950">Lernende</h2>
        {report.learnerRows.length === 0 ? <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">Keine aktiven Lernkonten vorhanden.</p> : <><div className="mt-5 grid gap-4 lg:hidden">{report.learnerRows.map((row) => <LearnerModuleCard key={row.learner.id} row={row} />)}</div><div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block"><table className="w-full table-fixed border-collapse text-left text-sm"><caption className="sr-only">Lernende mit Modulfortschritt, Quizwerten und Lernplanziel</caption><thead className="bg-slate-50 text-slate-700"><tr><th scope="col" className="w-[24%] px-5 py-4 font-bold">Lernkonto</th><th scope="col" className="w-[24%] px-4 py-4 font-bold">Fortschritt</th><th scope="col" className="w-[17%] px-4 py-4 font-bold">Status</th><th scope="col" className="w-[18%] px-4 py-4 font-bold">Quiz</th><th scope="col" className="w-[17%] px-4 py-4 font-bold">Lernplan</th></tr></thead><tbody className="divide-y divide-slate-100">{report.learnerRows.map((row) => <tr key={row.learner.id}><th scope="row" className="px-5 py-4 align-top"><Link href={`/admin/lernende/${row.learner.id}`} className="inline-flex min-h-11 items-center font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{row.learner.displayName}</Link><span className="block break-all font-normal text-slate-600">{row.learner.login}</span></th><td className="px-4 py-4 align-top"><ProgressBar value={row.module.summary.percentage} label={`Fortschritt ${row.learner.displayName}`} /></td><td className="px-4 py-4 align-top"><ModuleStatus status={row.module.summary.status} /></td><td className="px-4 py-4 align-top text-slate-600">{quizDescription(row.module.quiz)}</td><td className="px-4 py-4 align-top text-slate-600">{planningDescription(row.assignment)}</td></tr>)}</tbody></table></div></>}
      </section>
    </div>
  );
}

type LearnerRow = NonNullable<Awaited<ReturnType<typeof getAdminCurriculumModuleReport>>>["learnerRows"][number];

function LearnerModuleCard({ row }: { row: LearnerRow }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{row.learner.displayName}</h3><p className="mt-1 break-all text-sm text-slate-600">{row.learner.login}</p></div><ModuleStatus status={row.module.summary.status} /></div><div className="mt-5"><ProgressBar value={row.module.summary.percentage} label={`Fortschritt ${row.learner.displayName}`} /></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-bold text-slate-800">Quiz</dt><dd className="mt-1 text-slate-600">{quizDescription(row.module.quiz)}</dd></div><div><dt className="font-bold text-slate-800">Lernplan</dt><dd className="mt-1 text-slate-600">{planningDescription(row.assignment)}</dd></div></dl><Link href={`/admin/lernende/${row.learner.id}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Lernendenbericht öffnen <span aria-hidden="true" className="ml-2">→</span></Link></article>;
}

function quizDescription(quiz: LearnerRow["module"]["quiz"]) { return quiz ? `${quiz.attempts} Versuch${quiz.attempts === 1 ? "" : "e"} · Bestwert ${quiz.bestCorrectCount}/${quiz.bestTotal} (${quiz.bestPercentage} %)` : "Noch kein Versuch"; }
function planningDescription(assignment: LearnerRow["assignment"]) { return assignment ? `${assignment.isOverdue ? "Überfällig · " : ""}${assignment.targetAt ? formatPlanningDate(assignment.targetAt, true) : "Ohne Zieltermin"}` : "Nicht zugewiesen"; }
function SummaryValue({ label, value, urgent = false }: { label: string; value: number; urgent?: boolean }) { return <div className={`rounded-xl border p-4 ${urgent ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}><dt className={`text-sm font-semibold ${urgent ? "text-red-800" : "text-slate-600"}`}>{label}</dt><dd className="mt-1 text-2xl font-bold text-slate-950">{value}</dd></div>; }
