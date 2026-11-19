"use client";

import { useState } from "react";
import { buildLearningPathGroups } from "../../data/learning-path";
import { learningCategories, type LearningModule } from "../../data/learning-modules";
import { quizzes } from "../../data/quizzes";
import { getLearningPhasePresentation, type LearningPhaseIconName } from "../../lib/learning-phase-presentation";
import { getOverallProgress } from "../../lib/learner-progress";
import { useLearnerProgress, useProgressSource } from "../../lib/progress-store";
import { ProgressBar } from "../progress-bar";
import { LearningCategoryFilter, type LearningCategoryFilterValue } from "./learning-category-filter";
import { LearningModuleCard } from "./learning-module-card";

const filterCategories: readonly LearningCategoryFilterValue[] = ["Alle", ...learningCategories];
const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export function LearningOverview({ modules }: { modules: LearningModule[] }) {
  const [selectedCategory, setSelectedCategory] = useState<LearningCategoryFilterValue>("Alle");
  const learnerState = useLearnerProgress();
  const progressSource = useProgressSource();
  const progressAvailable = progressSource.ready && !progressSource.error && progressSource.mode !== "preview";
  const progressFallback = progressSource.mode === "preview"
    ? "Vorschau"
    : progressSource.error ? "Status nicht verfügbar" : "Wird geladen";
  const visibleGroups = buildLearningPathGroups(modules)
    .map((group) => ({
      ...group,
      visibleModules: selectedCategory === "Alle" ? group.modules : group.modules.filter((module) => module.category === selectedCategory),
    }))
    .filter((group) => group.visibleModules.length > 0);
  const visibleModuleCount = visibleGroups.reduce((total, group) => total + group.visibleModules.length, 0);
  return (
    <section aria-labelledby="modules-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-blue-700">Empfohlene Reihenfolge</p><h2 id="modules-heading" className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Dein Lernpfad</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Die Phasen geben Orientierung. Alle für dich verfügbaren Module bleiben direkt zugänglich.</p></div>
        <p className="text-sm font-medium text-slate-500" aria-live="polite">{visibleModuleCount} {visibleModuleCount === 1 ? "Modul" : "Module"}</p>
      </div>
      <div className="mt-5"><LearningCategoryFilter categories={filterCategories} selectedCategory={selectedCategory} onSelect={setSelectedCategory} /></div>
      <div className="mt-8 space-y-8 sm:space-y-10">
        {visibleGroups.map((group) => {
          const phase = getLearningPhasePresentation(group.id);
          const phaseProgress = progressAvailable ? getOverallProgress(learnerState, group.modules, quizModuleSlugs) : undefined;
          return (
            <section key={group.id} aria-labelledby={`phase-${group.id}`} className={`rounded-3xl border p-5 sm:p-7 ${phase.sectionClassName}`}>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end">
                <div className="flex min-w-0 items-start gap-4">
                  <span aria-hidden="true" className={`grid size-12 shrink-0 place-items-center rounded-2xl shadow-sm ${phase.iconClassName}`}><PhaseIcon name={phase.icon} /></span>
                  <div className="min-w-0">
                    <p className={`text-sm font-black uppercase tracking-[0.12em] ${phase.eyebrowClassName}`}>Phase {group.order}</p>
                    <h3 id={`phase-${group.id}`} className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{group.title}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700 sm:text-base">{group.description}</p>
                  </div>
                </div>
                {phaseProgress ? (
                  <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
                    <ProgressBar value={phaseProgress.percentage} label={`Fortschritt Phase ${group.order}`} tone={phase.progressTone} />
                    <p className="mt-2 text-xs font-semibold text-slate-600">{phaseProgress.completedModules} von {group.modules.length} Modulen erledigt</p>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-700">{progressFallback}: kein persönlicher Phasenfortschritt</p>
                )}
              </div>
              <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {group.visibleModules.map((module) => (
                  <LearningModuleCard key={module.slug} module={module} learnerState={learnerState} phaseId={group.id} phaseOrder={group.order} progressAvailable={progressAvailable} progressFallback={progressFallback} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function PhaseIcon({ name }: { name: LearningPhaseIconName }) {
  const className = "size-6";
  if (name === "workstation") return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4.5h16v11H4zM8 20h8m-4-4.5V20" /></svg>;
  if (name === "network") return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5 22a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm14 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12 7v4m0 0H5v6m7-6h7v6" /></svg>;
  if (name === "server") return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 3.5h16v7H4zm0 10h16v7H4zM7.5 7h.01m-.01 10h.01M11 7h6m-6 10h6" /></svg>;
  if (name === "shield") return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2.5 4.5 5.4v5.4c0 4.8 3.1 8.7 7.5 10.7 4.4-2 7.5-5.9 7.5-10.7V5.4L12 2.5Zm-3 9 2 2 4-4" /></svg>;
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M5 19V8m7 11V4m7 15v-7M3 19h18M5 8l7-4 7 8" /></svg>;
}
