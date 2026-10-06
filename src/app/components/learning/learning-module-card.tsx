import Link from "next/link";
import type { LearningModule } from "../../data/learning-modules";
import { quizzes } from "../../data/quizzes";
import { getModuleProgress, type LearnerProgressState } from "../../lib/learner-progress";
import { ProgressBar } from "../progress-bar";
import { ModuleStatus, moduleStatusPresentation } from "./module-status";

const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export function LearningModuleCard({ module, learnerState }: { module: LearningModule; learnerState: LearnerProgressState }) {
  const summary = getModuleProgress(learnerState, module, quizModuleSlugs.has(module.slug));
  const actionLabel = moduleStatusPresentation[summary.status].actionLabel;
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><p className="text-sm font-semibold text-blue-700">{module.category}</p><ModuleStatus status={summary.status} /></div>
      <h4 className="mt-4 text-xl font-bold tracking-tight text-slate-950">{module.title}</h4>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{module.description}</p>
      <div className="mt-auto pt-5">
        <p className="text-sm font-medium text-slate-600">{module.lessonCount} {module.lessonCount === 1 ? "Lektion" : "Lektionen"}</p>
        <div className="mt-4"><ProgressBar value={summary.percentage} label="Modulfortschritt" /></div>
        <Link href={`/lernen/${module.slug}`} aria-label={`${actionLabel}: ${module.title}`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
          {actionLabel}<span aria-hidden="true" className="ml-2">→</span>
        </Link>
      </div>
    </article>
  );
}
