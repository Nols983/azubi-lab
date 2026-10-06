import type { Metadata } from "next";
import Link from "next/link";
import { AdminAccessDenied } from "../../components/admin/admin-access-denied";
import { TrainerReportFilters, firstSearchParam } from "../../components/admin/trainer-report-filters";
import { TrainerSkillMatrix } from "../../components/admin/trainer-skill-matrix";
import { learningModules } from "../../data/learning-modules";
import { getTrainerPageAccess } from "../../lib/server/admin-page-access";
import { getAdminDashboardData } from "../../lib/server/admin-service";
import { filterTrainerLearnerReports, parseTrainerOverviewFilters } from "../../lib/trainer-reporting";

export const metadata: Metadata = { title: "Skill-Matrix" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SkillMatrixPage({ searchParams }: { searchParams: SearchParams }) {
  const access = await getTrainerPageAccess("/admin/skill-matrix");
  if (!access.allowed) return <AdminAccessDenied />;
  const [dashboard, rawSearchParams] = await Promise.all([getAdminDashboardData(), searchParams]);
  const filters = parseTrainerOverviewFilters({
    query: firstSearchParam(rawSearchParams.q),
    moduleSlug: firstSearchParam(rawSearchParams.module),
    status: firstSearchParam(rawSearchParams.status),
  });
  const reports = filterTrainerLearnerReports(dashboard.learnerReports, filters);
  const modules = filters.moduleSlug
    ? learningModules.filter((learningModule) => learningModule.slug === filters.moduleSlug)
    : learningModules;

  return (
    <div className="space-y-7 sm:space-y-9">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zum Trainer-Cockpit</Link>
          <h1 id="skill-matrix-heading" className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Skill-Matrix</h1>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">Übersicht über den Lernstand der Module. Die Status zeigen Fortschritt, keine Rangfolge.</p>
        </div>
        <Link href="/admin/lernende" className="inline-flex min-h-12 items-center justify-center self-start rounded-xl border border-blue-900 bg-white px-5 py-3 text-sm font-bold text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Lernende öffnen</Link>
      </header>

      <TrainerReportFilters action="/admin/skill-matrix" resetHref="/admin/skill-matrix" filters={filters} filteredCount={reports.length} totalCount={dashboard.learnerReports.length} />

      <section aria-labelledby="skill-matrix-heading">
        <TrainerSkillMatrix reports={reports} modules={modules} />
      </section>
    </div>
  );
}
