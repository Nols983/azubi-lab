"use client";

import { useState } from "react";
import { buildLearningPathGroups } from "../../data/learning-path";
import { learningCategories, type LearningModule } from "../../data/learning-modules";
import { useLearnerProgress } from "../../lib/progress-store";
import { LearningCategoryFilter, type LearningCategoryFilterValue } from "./learning-category-filter";
import { LearningModuleCard } from "./learning-module-card";

const filterCategories: readonly LearningCategoryFilterValue[] = ["Alle", ...learningCategories];

export function LearningOverview({ modules }: { modules: LearningModule[] }) {
  const [selectedCategory, setSelectedCategory] = useState<LearningCategoryFilterValue>("Alle");
  const learnerState = useLearnerProgress();
  const visibleGroups = buildLearningPathGroups(modules)
    .map((group) => ({
      ...group,
      modules: selectedCategory === "Alle" ? group.modules : group.modules.filter((module) => module.category === selectedCategory),
    }))
    .filter((group) => group.modules.length > 0);
  const visibleModuleCount = visibleGroups.reduce((total, group) => total + group.modules.length, 0);
  return (
    <section aria-labelledby="modules-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-blue-700">Empfohlene Reihenfolge</p><h2 id="modules-heading" className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Dein Lernpfad</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Die Phasen geben Orientierung. Alle für dich verfügbaren Module bleiben direkt zugänglich.</p></div>
        <p className="text-sm font-medium text-slate-500" aria-live="polite">{visibleModuleCount} {visibleModuleCount === 1 ? "Modul" : "Module"}</p>
      </div>
      <div className="mt-5"><LearningCategoryFilter categories={filterCategories} selectedCategory={selectedCategory} onSelect={setSelectedCategory} /></div>
      <div className="mt-8 space-y-12">
        {visibleGroups.map((group) => (
          <section key={group.id} aria-labelledby={`phase-${group.id}`}>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">Phase {group.order}</p>
            <h3 id={`phase-${group.id}`} className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{group.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{group.description}</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{group.modules.map((module) => <LearningModuleCard key={module.slug} module={module} learnerState={learnerState} />)}</div>
          </section>
        ))}
      </div>
    </section>
  );
}
