import Link from "next/link";
import type { LearningModule } from "../../data/learning-modules.ts";
import type { LearnerStatus, ModuleActivitySummary } from "../../lib/learner-progress.ts";

type SkillMatrixReport = {
  learner: { id: string; displayName: string; login: string };
  progress: {
    modules: readonly {
      slug: string;
      summary: ModuleActivitySummary;
    }[];
  };
};

export function TrainerSkillMatrix({
  reports,
  modules,
}: {
  reports: readonly SkillMatrixReport[];
  modules: readonly LearningModule[];
}) {
  if (reports.length === 0) {
    return <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">Für die gewählten Filter wurden keine Lernkonten gefunden.</p>;
  }

  return (
    <>
      <div className="mt-5 grid gap-4 lg:hidden">
        {reports.map((report) => (
          <article key={report.learner.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-950">{report.learner.displayName}</h3>
            <p className="mt-1 break-all text-sm text-slate-600">{report.learner.login}</p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {modules.map((learningModule) => {
                const summary = moduleSummary(report, learningModule.slug);
                return (
                  <div key={learningModule.slug} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <dt className="font-bold text-slate-900">{learningModule.title}</dt>
                    <dd className="mt-2"><SkillState status={summary.status} /></dd>
                    <dd className="mt-2 text-sm leading-6 text-slate-600">{summary.completedLessons} von {summary.totalLessons} Lektionen · {summary.quizAttempted ? "Quiz versucht" : "Quiz offen"}</dd>
                  </div>
                );
              })}
            </dl>
            <DetailLink learnerId={report.learner.id} />
          </article>
        ))}
      </div>

      <div
        aria-labelledby="skill-matrix-heading"
        className="mt-5 hidden max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:block"
        role="region"
        tabIndex={0}
      >
        <table className="min-w-max border-collapse text-left text-sm">
          <caption className="sr-only">Modulstatus je Lernkonto mit abgeschlossenen Lektionen und Quizstatus</caption>
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-60 border-r border-slate-200 bg-slate-50 px-5 py-4 font-bold">Lernkonto</th>
              {modules.map((learningModule) => <th key={learningModule.slug} scope="col" className="min-w-48 px-4 py-4 font-bold">{learningModule.title}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.map((report) => (
              <tr key={report.learner.id}>
                <th scope="row" className="sticky left-0 z-10 border-r border-slate-200 bg-white px-5 py-4 align-top">
                  <span className="block font-bold text-slate-950">{report.learner.displayName}</span>
                  <span className="mt-1 block break-all font-normal text-slate-600">{report.learner.login}</span>
                  <DetailLink learnerId={report.learner.id} compact />
                </th>
                {modules.map((learningModule) => {
                  const summary = moduleSummary(report, learningModule.slug);
                  return (
                    <td key={learningModule.slug} className="px-4 py-4 align-top">
                      <SkillState status={summary.status} />
                      <span className="mt-2 block text-xs leading-5 text-slate-600">{summary.completedLessons}/{summary.totalLessons} Lektionen</span>
                      <span className="block text-xs leading-5 text-slate-600">{summary.quizAttempted ? "Quiz versucht" : "Quiz offen"}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function moduleSummary(report: SkillMatrixReport, moduleSlug: string) {
  const summary = report.progress.modules.find((item) => item.slug === moduleSlug)?.summary;
  if (!summary) throw new Error(`Missing canonical skill-matrix module ${moduleSlug}.`);
  return summary;
}

function SkillState({ status }: { status: LearnerStatus }) {
  const labels: Record<LearnerStatus, string> = {
    "not-started": "Nicht begonnen",
    "in-progress": "In Arbeit",
    completed: "Abgeschlossen",
  };
  const styles: Record<LearnerStatus, string> = {
    "not-started": "border-slate-300 bg-white text-slate-700",
    "in-progress": "border-blue-200 bg-blue-50 text-blue-800",
    completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${styles[status]}`}>{labels[status]}</span>;
}

function DetailLink({ learnerId, compact = false }: { learnerId: string; compact?: boolean }) {
  return <Link href={`/admin/lernende/${learnerId}`} className={`${compact ? "mt-2 text-xs" : "mt-5 text-sm"} inline-flex min-h-11 items-center rounded-lg font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600`}>Details<span className="sr-only"> zum Lernkonto</span><span aria-hidden="true" className="ml-2">→</span></Link>;
}
