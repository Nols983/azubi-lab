"use client";

import Link from "next/link";
import { learningModules } from "../../data/learning-modules";
import { quizzes } from "../../data/quizzes";
import { getModuleProgress, getOverallProgress, getQuizProgress } from "../../lib/learner-progress";
import { useLearnerProgress } from "../../lib/progress-store";
import { ModuleStatus } from "../learning/module-status";
import { ProgressBar } from "../progress-bar";

const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export function ProgressOverview() {
  const state = useLearnerProgress();
  const overall = getOverallProgress(state, learningModules, quizModuleSlugs);
  return (
    <div className="space-y-8">
      <section aria-labelledby="overall-progress-heading" className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">Alle Lernaktivitäten</p>
        <h2 id="overall-progress-heading" className="mt-1 text-2xl font-bold text-slate-950">Gesamtfortschritt</h2>
        <div className="mt-6"><ProgressBar value={overall.percentage} label="Gesamtfortschritt" /></div>
        <p className="mt-3 text-sm text-slate-600">{overall.completedActivities} von {overall.totalActivities} Aktivitäten erledigt</p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Module erledigt" value={overall.completedModules} />
          <Stat label="In Bearbeitung" value={overall.inProgressModules} />
          <Stat label="Nicht begonnen" value={overall.notStartedModules} />
        </dl>
      </section>

      <section aria-labelledby="module-progress-heading">
        <div><p className="text-sm font-medium text-blue-700">Modulübersicht</p><h2 id="module-progress-heading" className="mt-1 text-2xl font-bold text-slate-950">Fortschritt je Modul</h2></div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {learningModules.map((learningModule) => {
            const summary = getModuleProgress(state, learningModule, quizModuleSlugs.has(learningModule.slug));
            const quiz = getQuizProgress(state, learningModule.slug);
            return (
              <article key={learningModule.slug} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3"><p className="text-sm font-semibold text-blue-700">{learningModule.category}</p><ModuleStatus status={summary.status} /></div>
                <h3 className="mt-3 text-xl font-bold text-slate-950">{learningModule.title}</h3>
                <div className="mt-5"><ProgressBar value={summary.percentage} label={`Fortschritt ${learningModule.title}`} /></div>
                <p className="mt-3 text-sm text-slate-600">Lektionen: {summary.completedLessons} von {summary.totalLessons} erledigt</p>
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-bold text-slate-900">Abschlussquiz: {quiz ? "Versucht" : "Noch nicht versucht"}</p>
                  {quiz && <p className="mt-1">Versuche: {quiz.attempts} · Bestwert: {quiz.bestCorrectCount} von {quiz.bestTotal} ({quiz.bestPercentage} %) · Zuletzt: {quiz.latestCorrectCount} von {quiz.latestTotal} ({quiz.latestPercentage} %)</p>}
                </div>
                <Link href={`/lernen/${learningModule.slug}`} className="mt-5 inline-flex min-h-11 items-center self-start rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Modul öffnen <span aria-hidden="true" className="ml-2">→</span></Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-50 p-4"><dt className="text-sm font-medium text-slate-600">{label}</dt><dd className="mt-1 text-2xl font-bold text-slate-950">{value}</dd></div>;
}
