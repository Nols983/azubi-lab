"use client";

import Link from "next/link";
import { learningModules } from "../../data/learning-modules";
import { quizzes } from "../../data/quizzes";
import { getOverallProgress } from "../../lib/learner-progress";
import { useLearnerProgress, useProgressSource } from "../../lib/progress-store";
import { ProgressBar } from "../progress-bar";

const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export function ProgressSummary() {
  const state = useLearnerProgress();
  const progressSource = useProgressSource();
  if (!progressSource.ready || progressSource.error) {
    return (
      <section aria-labelledby="summary-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-blue-700">Kompakte Übersicht</p><h2 id="summary-heading" className="mt-1 text-xl font-bold text-slate-950">Dein Fortschritt</h2>
        <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">{progressSource.error ? "Dein persönlicher Lernstand ist gerade nicht verfügbar. Es wird kein falscher 0-%-Wert angezeigt." : "Dein persönlicher Lernstand wird geladen."}</p>
        <Link href="/fortschritt" className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Fortschrittsseite öffnen <span aria-hidden="true" className="ml-2">→</span></Link>
      </section>
    );
  }
  const summary = getOverallProgress(state, learningModules, quizModuleSlugs);
  return (
    <section aria-labelledby="summary-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-blue-700">Kompakte Übersicht</p><h2 id="summary-heading" className="mt-1 text-xl font-bold text-slate-950">Dein Fortschritt</h2>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div aria-hidden="true" className="grid size-28 shrink-0 place-items-center rounded-full p-2" style={{ background: `conic-gradient(#2563eb ${summary.percentage}%, #e2e8f0 ${summary.percentage}% 100%)` }}><div className="grid size-full place-items-center rounded-full bg-white text-2xl font-black text-slate-950">{summary.percentage} %</div></div>
        <dl className="grid flex-1 grid-cols-3 gap-2">
          <SummaryState label="Erledigt" value={summary.completedModules} className="text-emerald-800" />
          <SummaryState label="Aktiv" value={summary.inProgressModules} className="text-blue-800" />
          <SummaryState label="Offen" value={summary.notStartedModules} className="text-slate-700" />
        </dl>
      </div>
      <div className="mt-6"><ProgressBar value={summary.percentage} label="Gesamtfortschritt" /></div>
      <Link href="/fortschritt" className="mt-6 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Fortschritt ansehen <span aria-hidden="true" className="ml-2">→</span></Link>
    </section>
  );
}

function SummaryState({ label, value, className }: { label: string; value: number; className: string }) {
  return <div className="rounded-xl bg-slate-50 p-2.5 text-center"><dt className="text-xs font-semibold text-slate-600">{label}</dt><dd className={`mt-1 text-xl font-black ${className}`}>{value}</dd></div>;
}
