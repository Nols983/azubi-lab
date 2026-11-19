import Link from "next/link";
import type { LearningModule } from "../../data/learning-modules";
import { getLearningPhasePresentation, type LearningPhaseId } from "../../lib/learning-phase-presentation";
import { quizzes } from "../../data/quizzes";
import { getModuleProgress, type LearnerProgressState } from "../../lib/learner-progress";
import { ProgressBar } from "../progress-bar";
import { ModuleStatus, moduleStatusPresentation } from "./module-status";

const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export function LearningModuleCard({
  module,
  learnerState,
  phaseId,
  phaseOrder,
  progressAvailable = true,
  progressFallback = "Status nicht verfügbar",
}: {
  module: LearningModule;
  learnerState: LearnerProgressState;
  phaseId: LearningPhaseId;
  phaseOrder: number;
  progressAvailable?: boolean;
  progressFallback?: string;
}) {
  const summary = progressAvailable ? getModuleProgress(learnerState, module, quizModuleSlugs.has(module.slug)) : undefined;
  const actionLabel = summary ? moduleStatusPresentation[summary.status].actionLabel : "Modul öffnen";
  const phase = getLearningPhasePresentation(phaseId);
  return (
    <article className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none sm:p-6 ${phase.cardBorderClassName}`}>
      <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${phase.cardAccentClassName}`} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-bold ${phase.eyebrowClassName}`}>{module.category}</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-slate-600">Phase {phaseOrder}</span>
        </div>
        {summary ? <ModuleStatus status={summary.status} /> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{progressFallback}</span>}
      </div>
      <h4 className="mt-4 break-words text-xl font-bold tracking-tight text-slate-950">{module.title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
      <div className="mt-auto pt-5">
        <p className="text-sm font-medium text-slate-600">{module.lessonCount} {module.lessonCount === 1 ? "Lektion" : "Lektionen"}</p>
        {summary ? (
          <div className="mt-4"><ProgressBar value={summary.percentage} label={`Modulfortschritt ${module.title}`} tone={phase.progressTone} /></div>
        ) : (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">Persönlicher Fortschritt wird hier nicht angezeigt.</p>
        )}
        <Link href={`/lernen/${module.slug}`} aria-label={`${actionLabel}: ${module.title}`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
          {actionLabel}<span aria-hidden="true" className="ml-2">→</span>
        </Link>
      </div>
    </article>
  );
}
