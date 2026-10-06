"use client";

import Link from "next/link";
import { learningModules } from "../../data/learning-modules";
import { quizzes } from "../../data/quizzes";
import { getContinueLearningTarget } from "../../lib/learner-progress";
import { useLearnerProgress } from "../../lib/progress-store";

const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export function ContinueLearningCard() {
  const state = useLearnerProgress();
  const target = getContinueLearningTarget(state, learningModules, quizModuleSlugs);
  const moduleTitle = target?.moduleTitle ?? "Alle Kernmodule erledigt";
  const targetTitle = target?.targetTitle ?? "Deinen Fortschritt ansehen";
  const href = target?.href ?? "/fortschritt";
  const percentage = target?.modulePercentage ?? 100;
  return (
    <article className="flex min-h-72 flex-col rounded-2xl bg-blue-950 p-6 text-white shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-semibold text-blue-200">Weiterlernen</p><h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{moduleTitle}</h3><p className="mt-2 text-sm text-blue-100">{target ? `${target.kind === "lesson" ? "Nächste Lektion" : "Nächste Aktivität"}: ${targetTitle}` : targetTitle}</p></div>
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-lg font-bold">→</span>
      </div>
      <div className="mt-auto pt-8">
        <div className="mb-2 flex justify-between text-sm"><span className="font-medium text-blue-100">Modulfortschritt</span><span className="font-bold">{percentage} %</span></div>
        <div role="progressbar" aria-label={`Modulfortschritt für ${moduleTitle}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} className="h-2.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-blue-300" style={{ width: `${percentage}%` }} /></div>
        <Link href={href} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-950 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{target ? "Weiterlernen" : "Fortschritt ansehen"}<span aria-hidden="true" className="ml-2">→</span></Link>
      </div>
    </article>
  );
}
