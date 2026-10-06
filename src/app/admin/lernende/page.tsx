import type { Metadata } from "next";
import Link from "next/link";
import { AdminAccessDenied } from "../../components/admin/admin-access-denied";
import { TrainerReportFilters, firstSearchParam } from "../../components/admin/trainer-report-filters";
import { ProgressBar } from "../../components/progress-bar";
import { getTrainerPageAccess } from "../../lib/server/admin-page-access";
import { getAdminDashboardData } from "../../lib/server/admin-service";
import { filterTrainerLearnerReports, parseTrainerOverviewFilters } from "../../lib/trainer-reporting";

export const metadata: Metadata = { title: "Lernende" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type LearnerReport = Awaited<ReturnType<typeof getAdminDashboardData>>["learnerReports"][number];

export default async function LearnerOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const access = await getTrainerPageAccess("/admin/lernende");
  if (!access.allowed) return <AdminAccessDenied />;
  const [dashboard, rawSearchParams] = await Promise.all([getAdminDashboardData(), searchParams]);
  const filters = parseTrainerOverviewFilters({
    query: firstSearchParam(rawSearchParams.q),
    moduleSlug: firstSearchParam(rawSearchParams.module),
    status: firstSearchParam(rawSearchParams.status),
    focus: firstSearchParam(rawSearchParams.focus),
  });
  const reports = filterTrainerLearnerReports(dashboard.learnerReports, filters);

  return (
    <div className="space-y-7 sm:space-y-9">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zum Trainer-Cockpit</Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Lernende</h1>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">Lernstand, Labs, Level und letzte Aktivität auf einen Blick.</p>
        </div>
        <Link href="/admin/skill-matrix" className="inline-flex min-h-12 items-center justify-center self-start rounded-xl border border-blue-900 bg-white px-5 py-3 text-sm font-bold text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Skill-Matrix öffnen</Link>
      </header>

      <TrainerReportFilters action="/admin/lernende" resetHref="/admin/lernende" filters={filters} filteredCount={reports.length} totalCount={dashboard.learnerReports.length} includeFocus />

      {dashboard.learnerReports.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">Noch keine Lernkonten vorhanden.</p>
      ) : reports.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">Für diese Filter wurden keine Lernkonten gefunden.</p>
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">{reports.map((report) => <LearnerCard key={report.learner.id} report={report} />)}</div>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <caption className="sr-only">Lernende mit Lernfortschritt, Labs, Level, Lernplan und letzter Aktivität</caption>
              <thead className="bg-slate-50 text-slate-700"><tr><th scope="col" className="w-[18%] px-5 py-4 font-bold">Lernkonto</th><th scope="col" className="w-[19%] px-4 py-4 font-bold">Lernen</th><th scope="col" className="w-[12%] px-4 py-4 font-bold">Labs</th><th scope="col" className="w-[12%] px-4 py-4 font-bold">Level / XP</th><th scope="col" className="w-[12%] px-4 py-4 font-bold">Lernplan</th><th scope="col" className="w-[18%] px-4 py-4 font-bold">Letzte Aktivität</th><th scope="col" className="w-[9%] px-4 py-4 font-bold"><span className="sr-only">Aktion</span></th></tr></thead>
              <tbody className="divide-y divide-slate-100">{reports.map((report) => <LearnerRow key={report.learner.id} report={report} />)}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function LearnerCard({ report }: { report: LearnerReport }) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="truncate text-lg font-bold text-slate-950">{report.learner.displayName}</h2><p className="mt-1 break-all text-sm text-slate-600">{report.learner.login}</p></div>
        {report.learner.disabledAt && <InactiveBadge />}
      </div>
      <div className="mt-5"><ProgressBar value={report.summary.progressPercentage} label={"Gesamtfortschritt " + report.learner.displayName} /></div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Value label="Module" value={report.summary.modules.completed + " von " + report.summary.modules.total + " abgeschlossen"} />
        <Value label="Labs" value={report.summary.normalLabs.completed + " von " + report.summary.normalLabs.total + " abgeschlossen"} />
        <Value label="Level / XP" value={"Level " + report.summary.progression.level + " · " + formatNumber(report.summary.progression.totalXp) + " XP"} />
        <Value label="Lernplan" value={report.summary.planning.active + " aktiv"} />
        <div className="col-span-2"><Activity report={report} /></div>
      </div>
      <DetailLink learnerId={report.learner.id} />
    </article>
  );
}

function LearnerRow({ report }: { report: LearnerReport }) {
  return (
    <tr>
      <th scope="row" className="px-5 py-4 align-top"><span className="block font-bold text-slate-950">{report.learner.displayName}</span><span className="mt-1 block break-all font-normal text-slate-600">{report.learner.login}</span>{report.learner.disabledAt && <span className="mt-2 block"><InactiveBadge /></span>}</th>
      <td className="px-4 py-4 align-top"><ProgressBar value={report.summary.progressPercentage} label={"Fortschritt " + report.learner.displayName} /><span className="mt-2 block text-xs text-slate-600">{report.summary.modules.completed} von {report.summary.modules.total} Modulen</span></td>
      <td className="px-4 py-4 align-top text-slate-700">{report.summary.normalLabs.completed} von {report.summary.normalLabs.total}<span className="mt-1 block text-xs text-slate-600">{report.labCounts.active} aktiv</span></td>
      <td className="px-4 py-4 align-top text-slate-700">Level {report.summary.progression.level}<span className="mt-1 block text-xs text-slate-600">{formatNumber(report.summary.progression.totalXp)} XP</span></td>
      <td className="px-4 py-4 align-top text-slate-700">{report.summary.planning.active} aktiv{report.summary.planning.overdue > 0 && <span className="mt-1 block text-xs font-bold text-red-700">{report.summary.planning.overdue} überfällig</span>}</td>
      <td className="px-4 py-4 align-top"><Activity report={report} /></td>
      <td className="px-4 py-4 align-top"><DetailLink learnerId={report.learner.id} compact /></td>
    </tr>
  );
}

function Activity({ report }: { report: LearnerReport }) {
  const activity = report.summary.latestActivity;
  return <div><p className="font-bold text-slate-800 lg:sr-only">Letzte Aktivität</p><p className="mt-1 text-slate-600 lg:mt-0">{activity ? <><time dateTime={activity.timestamp.toISOString()}>{formatDate(activity.timestamp)}</time><span className="mt-1 block text-xs leading-5">{activity.label}</span></> : "Noch keine Lernaktivität"}</p></div>;
}

function Value({ label, value }: { label: string; value: string }) {
  return <div><p className="font-bold text-slate-800">{label}</p><p className="mt-1 text-slate-600">{value}</p></div>;
}

function DetailLink({ learnerId, compact = false }: { learnerId: string; compact?: boolean }) {
  return <Link href={"/admin/lernende/" + learnerId} className={(compact ? "" : "mt-5 ") + "inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"}>{compact ? "Details" : "Lernkonto öffnen"}<span aria-hidden="true" className="ml-2">→</span></Link>;
}

function InactiveBadge() {
  return <span className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">Inaktiv</span>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(value);
}
