import type { Metadata } from "next";
import Link from "next/link";
import { AdminAccessDenied } from "../../components/admin/admin-access-denied.tsx";
import { ProgressBar } from "../../components/progress-bar.tsx";
import { getTrainerPageAccess } from "../../lib/server/admin-page-access.ts";
import { getAdminCurriculumReport } from "../../lib/server/admin-service.ts";

export const metadata: Metadata = { title: "Lerninhalte-Bericht" };
export const dynamic = "force-dynamic";

export default async function CurriculumReportPage() {
  const access = await getTrainerPageAccess("/admin/lerninhalte");
  if (!access.allowed) return <AdminAccessDenied />;
  const report = await getAdminCurriculumReport();

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <Link href="/admin" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zum Trainer-Dashboard</Link>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Lerninhalte</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Lerninhalte-Bericht</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Statuszahlen und Durchschnittswerte über alle aktiven Lernkonten. Individuelle Prozentwerte bleiben aktivitätsgewichtet und werden hier nicht durch Modulmittelwerte ersetzt.</p>
      </header>

      <section aria-labelledby="module-report-heading">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-blue-700">{report.curriculumModules.length} Module</p><h2 id="module-report-heading" className="mt-1 text-2xl font-bold text-slate-950">Curriculum nach Modul</h2></div><p className="text-sm font-semibold text-slate-600">{report.activeLearnerReports.length} aktive Lernkonten</p></div>
        {report.activeLearnerReports.length === 0 && <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">Es gibt noch keine aktiven Lernkonten. Die Module werden mit neutralen Nullwerten angezeigt.</p>}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {report.curriculumModules.map((moduleReport) => (
            <article key={moduleReport.module.slug} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-semibold text-blue-700">{moduleReport.module.category}</p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">{moduleReport.module.title}</h3>
              <div className="mt-5"><ProgressBar value={moduleReport.averageProgress} label={`Durchschnittlicher Fortschritt ${moduleReport.module.title}`} /></div>
              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><ReportValue label="Nicht begonnen" value={moduleReport.counts.notStarted} /><ReportValue label="In Bearbeitung" value={moduleReport.counts.inProgress} /><ReportValue label="Erledigt" value={moduleReport.counts.completed} /><ReportValue label="Zugewiesen" value={moduleReport.counts.assigned} /><ReportValue label="Planung überfällig" value={moduleReport.counts.overdue} urgent={moduleReport.counts.overdue > 0} /></dl>
              <Link href={`/admin/lerninhalte/${moduleReport.module.slug}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Lernendenbericht öffnen <span aria-hidden="true" className="ml-2">→</span></Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportValue({ label, value, urgent = false }: { label: string; value: number; urgent?: boolean }) {
  return <div className={`rounded-xl border p-3 ${urgent ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}><dt className={`text-xs font-bold ${urgent ? "text-red-800" : "text-slate-600"}`}>{label}</dt><dd className="mt-1 text-2xl font-bold text-slate-950">{value}</dd></div>;
}
