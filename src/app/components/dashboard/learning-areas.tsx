"use client";

import type { LearningAreaContent } from "../../data/dashboard-demo";
import { learningModules } from "../../data/learning-modules";
import { quizzes } from "../../data/quizzes";
import { getCategoryProgress } from "../../lib/learner-progress";
import { useLearnerProgress } from "../../lib/progress-store";
import { ProgressBar } from "../progress-bar";

const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export function LearningAreas({ areas }: { areas: LearningAreaContent[] }) {
  const state = useLearnerProgress();
  return (
    <section aria-labelledby="areas-heading">
      <div className="mb-4"><p className="text-sm font-medium text-blue-700">Themenübersicht</p><h2 id="areas-heading" className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Lernbereiche</h2></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {areas.map((area) => (
          <article key={area.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4"><span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-blue-800">{area.abbreviation}</span><div className="min-w-0"><h3 className="font-bold text-slate-950">{area.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{area.description}</p></div></div>
            <div className="mt-5"><ProgressBar value={getCategoryProgress(state, learningModules, area.title, quizModuleSlugs)} label={`Fortschritt ${area.title}`} /></div>
          </article>
        ))}
      </div>
    </section>
  );
}
