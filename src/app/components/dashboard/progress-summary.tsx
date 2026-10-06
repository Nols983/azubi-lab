"use client";

import Link from "next/link";
import { learningModules } from "../../data/learning-modules";
import { quizzes } from "../../data/quizzes";
import { getOverallProgress } from "../../lib/learner-progress";
import { useLearnerProgress } from "../../lib/progress-store";
import { ProgressBar } from "../progress-bar";

const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export function ProgressSummary() {
  const state = useLearnerProgress();
  const summary = getOverallProgress(state, learningModules, quizModuleSlugs);
  return (
    <section aria-labelledby="summary-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-blue-700">Kompakte Übersicht</p><h2 id="summary-heading" className="mt-1 text-xl font-bold text-slate-950">Dein Fortschritt</h2>
      <p className="mt-6 text-4xl font-bold tracking-tight text-slate-950">{summary.completedModules}<span className="text-lg font-semibold text-slate-500"> / {learningModules.length}</span></p><p className="mt-1 text-sm text-slate-600">Module erledigt</p>
      <div className="mt-6"><ProgressBar value={summary.percentage} label="Gesamtfortschritt" /></div>
      <Link href="/fortschritt" className="mt-6 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Fortschritt ansehen <span aria-hidden="true" className="ml-2">→</span></Link>
    </section>
  );
}
