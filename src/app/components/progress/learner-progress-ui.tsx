"use client";

import { useEffect, useRef, useState } from "react";
import type { LearningModule, LessonStatus } from "../../data/learning-modules";
import { quizzes } from "../../data/quizzes";
import { getLessonStatus, getModuleProgress, getQuizProgress } from "../../lib/learner-progress";
import { useLearnerProgress, useLearnerProgressActions, useProgressSource } from "../../lib/progress-store";
import { ProgressBar } from "../progress-bar";
import { ModuleStatus } from "../learning/module-status";

const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export function ModuleLearnerStatus({ learningModule }: { learningModule: LearningModule }) {
  const state = useLearnerProgress();
  const { mode } = useProgressSource();
  if (mode === "preview") return <PreviewBadge />;
  const summary = getModuleProgress(state, learningModule, quizModuleSlugs.has(learningModule.slug));
  return <ModuleStatus status={summary.status} />;
}

export function ModuleProgressSummary({ learningModule }: { learningModule: LearningModule }) {
  const state = useLearnerProgress();
  const { mode } = useProgressSource();
  if (mode === "preview") return <PreviewSummary />;
  const hasQuiz = quizModuleSlugs.has(learningModule.slug);
  const summary = getModuleProgress(state, learningModule, hasQuiz);
  return (
    <div className="grid gap-5 rounded-xl bg-slate-50 p-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center sm:p-6" aria-live="polite">
      <div>
        <p className="text-sm font-medium text-slate-500">Umfang</p>
        <p className="mt-1 font-bold text-slate-950">{summary.totalLessons} Lektionen{hasQuiz ? " + Abschlussquiz" : ""}</p>
        <p className="mt-1 text-sm text-slate-600">{summary.completedActivities} von {summary.totalActivities} Aktivitäten erledigt</p>
      </div>
      <ProgressBar value={summary.percentage} label="Modulfortschritt" />
    </div>
  );
}

export function LessonLearnerStatus({ moduleSlug, lessonSlug, availability }: { moduleSlug: string; lessonSlug: string; availability: LessonStatus }) {
  const state = useLearnerProgress();
  const { mode } = useProgressSource();
  if (availability !== "available") {
    return <span className="ml-14 inline-flex shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 sm:ml-0">In Vorbereitung</span>;
  }
  if (mode === "preview") return <PreviewBadge />;
  return <ModuleStatus status={getLessonStatus(state, moduleSlug, lessonSlug)} />;
}

export function QuizProgressSummary({ moduleSlug, framed = false }: { moduleSlug: string; framed?: boolean }) {
  const state = useLearnerProgress();
  const { mode } = useProgressSource();
  if (mode === "preview") {
    return <div className={framed ? "rounded-xl border border-blue-200 bg-white p-4" : ""}><p className="text-sm font-bold text-blue-950">Vorschau: Quizversuche werden nicht gespeichert.</p></div>;
  }
  const quiz = getQuizProgress(state, moduleSlug);
  return (
    <div aria-live="polite" className={framed ? "rounded-xl border border-blue-200 bg-white p-4" : ""}>
      <p className="text-sm font-bold text-slate-900">Quizstatus: {quiz ? "Versucht" : "Noch nicht versucht"}</p>
      {quiz && (
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700">
          <div><dt className="inline font-semibold">Versuche:</dt> <dd className="inline">{quiz.attempts}</dd></div>
          <div><dt className="inline font-semibold">Bestwert:</dt> <dd className="inline">{quiz.bestCorrectCount} von {quiz.bestTotal} ({quiz.bestPercentage} %)</dd></div>
          <div><dt className="inline font-semibold">Zuletzt:</dt> <dd className="inline">{quiz.latestCorrectCount} von {quiz.latestTotal} ({quiz.latestPercentage} %)</dd></div>
        </dl>
      )}
    </div>
  );
}

export function LessonProgressControl({ moduleSlug, lessonSlug, availability }: { moduleSlug: string; lessonSlug: string; availability: LessonStatus }) {
  const state = useLearnerProgress();
  const { startLesson, updateLessonCompletion } = useLearnerProgressActions();
  const openedLesson = useRef("");
  const [pending, setPending] = useState(false);
  const { mode } = useProgressSource();
  const available = availability === "available";
  const status = getLessonStatus(state, moduleSlug, lessonSlug);

  useEffect(() => {
    const key = `${moduleSlug}/${lessonSlug}`;
    if (mode === "preview" || !available || openedLesson.current === key) return;
    openedLesson.current = key;
    void startLesson(moduleSlug, lessonSlug, true);
  }, [available, lessonSlug, mode, moduleSlug, startLesson]);

  if (!available) return null;
  if (mode === "preview") {
    return (
      <section aria-labelledby="lesson-preview-heading" className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
        <p className="text-sm font-semibold text-blue-700">Betrachtermodus</p>
        <h2 id="lesson-preview-heading" className="mt-1 text-xl font-bold text-slate-950">Lektion in der Vorschau</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">Das Öffnen und Bearbeiten dieser Lektion verändert keinen Lernfortschritt.</p>
      </section>
    );
  }
  const completed = status === "completed";
  return (
    <section aria-labelledby="lesson-progress-heading" className={`rounded-2xl border p-5 sm:p-6 ${completed ? "border-emerald-300 bg-emerald-50" : "border-blue-200 bg-blue-50"}`}>
      <p className="text-sm font-semibold text-blue-700">Dein Lernstand</p>
      <h2 id="lesson-progress-heading" className="mt-1 text-xl font-bold text-slate-950">{completed ? "Lektion erledigt" : "Lektion in Bearbeitung"}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700" aria-live="polite">{completed ? "Diese Lektion zählt als erledigte Modulaktivität." : "Das Öffnen startet die Lektion. Als erledigt zählt sie erst nach deiner ausdrücklichen Bestätigung."}</p>
      <button type="button" disabled={pending} onClick={async () => { setPending(true); await updateLessonCompletion(moduleSlug, lessonSlug, !completed, true); setPending(false); }} className={`mt-4 inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65 ${completed ? "border border-emerald-400 bg-white text-emerald-950 hover:bg-emerald-100" : "bg-blue-950 text-white hover:bg-blue-900"}`}>
        {pending ? "Wird gespeichert …" : completed ? "Als offen markieren" : "Lektion als erledigt markieren"}
      </button>
    </section>
  );
}

function PreviewBadge() {
  return <span className="inline-flex shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">Vorschau</span>;
}

function PreviewSummary() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
      <p className="font-bold text-blue-950">Alle Inhalte sind in der Vorschau verfügbar.</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">Für Betrachter werden weder Lektions- noch Modulfortschritt gespeichert.</p>
    </div>
  );
}
