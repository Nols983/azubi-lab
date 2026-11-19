"use client";

import Link from "next/link";
import { learningModules } from "../../data/learning-modules";
import { quizzes } from "../../data/quizzes";
import { getContinueLearningTarget } from "../../lib/learner-progress";
import { useLearnerProgress, useProgressSource } from "../../lib/progress-store";

const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export function ContinueLearningCard() {
  const state = useLearnerProgress();
  const progressSource = useProgressSource();
  if (!progressSource.ready || progressSource.error) {
    const loading = !progressSource.ready && !progressSource.error;
    return (
      <article className="flex min-h-72 flex-col rounded-2xl bg-blue-950 p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-200">Weiterlernen</p>
        <h3 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{loading ? "Lernstand wird geladen" : "Lernstand nicht verfügbar"}</h3>
        <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">{loading ? "Dein nächster Lernschritt erscheint gleich." : "Du kannst die Lernmodule weiterhin öffnen, ohne dass ein unbekannter Stand als 0 % dargestellt wird."}</p>
        <div className="mt-auto pt-8"><Link href="/lernen" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-950 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Lernmodule öffnen<span aria-hidden="true" className="ml-2">→</span></Link></div>
      </article>
    );
  }
  const target = getContinueLearningTarget(state, learningModules, quizModuleSlugs);
  const moduleTitle = target?.moduleTitle ?? "Alle Kernmodule erledigt";
  const targetTitle = target?.targetTitle ?? "Deinen Fortschritt ansehen";
  const href = target?.href ?? "/fortschritt";
  const percentage = target?.modulePercentage ?? 100;
  return (
    <article className="relative flex min-h-72 flex-col overflow-hidden rounded-2xl bg-blue-950 p-6 text-white shadow-sm sm:p-8">
      <span aria-hidden="true" className="absolute -right-14 -top-14 size-40 rounded-full border-[22px] border-white/5" />
      <div className="flex items-start justify-between gap-4">
        <div className="relative"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-blue-200">Weiterlernen</p>{target && <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold text-blue-50">{target.category}</span>}</div><h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{moduleTitle}</h3><p className="mt-2 text-sm leading-6 text-blue-100">{target ? `${target.kind === "lesson" ? "Nächste Lektion" : "Nächste Aktivität"}: ${targetTitle}` : targetTitle}</p></div>
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-lg font-bold">→</span>
      </div>
      <div className="mt-auto pt-8">
        <div className="mb-2 flex justify-between text-sm"><span className="font-medium text-blue-100">Modulfortschritt</span><span className="font-bold">{percentage} %</span></div>
        <div role="progressbar" aria-label={`Modulfortschritt für ${moduleTitle}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} className="h-2.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-blue-300 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percentage}%` }} /></div>
        <Link href={href} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-950 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{target ? "Weiterlernen" : "Fortschritt ansehen"}<span aria-hidden="true" className="ml-2">→</span></Link>
      </div>
    </article>
  );
}
