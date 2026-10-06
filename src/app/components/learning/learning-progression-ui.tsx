"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LearningModule, Lesson } from "../../data/learning-modules";
import { deriveModuleLearningProgression, getLessonProgression, type LessonProgressionView } from "../../lib/learning-progression";
import { useLearnerProgress, useProgressSource } from "../../lib/progress-store";
import { QuizProgressSummary } from "../progress/learner-progress-ui";

export function ModuleProgressionContent({
  learningModule,
  quiz,
}: {
  learningModule: LearningModule;
  quiz?: { description: string };
}) {
  const state = useLearnerProgress();
  const { mode, ready, bypassProgression } = useProgressSource();
  const progression = deriveModuleLearningProgression(state, learningModule, { bypass: bypassProgression });

  return (
    <div className="space-y-10">
      <section aria-labelledby="lessons-heading">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-sm font-semibold text-blue-700">Modulinhalt</p><h2 id="lessons-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Lektionen</h2></div>
          <p className="text-sm text-slate-500" aria-live="polite">{mode === "anonymous" && !ready ? "Browser-Lernstand wird geprüft …" : "Dein Lernstand"}</p>
        </div>
        {mode === "anonymous" && (
          <p className="mt-3 text-sm leading-6 text-slate-600">Anonyme Freigaben werden nur in diesem Browser gespeichert und nach dem Laden des lokalen Lernstands geprüft.</p>
        )}
        <ol className="mt-5 space-y-3">
          {progression.lessons.map((item) => <LessonProgressionItem key={item.lesson.slug} moduleSlug={learningModule.slug} item={item} />)}
        </ol>
      </section>
      {quiz && (
        <section aria-labelledby="final-quiz-heading" className={`rounded-2xl border p-5 sm:p-7 ${progression.quiz.unlocked ? "border-blue-200 bg-blue-50" : "border-slate-300 bg-slate-50"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-sm font-semibold text-blue-700">Wissen prüfen</p><h2 id="final-quiz-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Abschlussquiz</h2></div>
            <ProgressionBadge label={progression.quiz.unlocked ? "Verfügbar" : "Gesperrt"} locked={!progression.quiz.unlocked} />
          </div>
          <p className="mt-3 leading-7 text-slate-700">{quiz.description}</p>
          {!progression.quiz.unlocked && <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{progression.quiz.lockReason}</p>}
          <div className="mt-4"><QuizProgressSummary moduleSlug={learningModule.slug} framed /></div>
          {progression.quiz.unlocked ? (
            <Link href={`/lernen/${learningModule.slug}/quiz`} className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Quiz starten</Link>
          ) : (
            <span aria-disabled="true" className="mt-5 inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-xl bg-slate-300 px-5 py-3 text-sm font-bold text-slate-700">Quiz gesperrt</span>
          )}
        </section>
      )}
    </div>
  );
}

function LessonProgressionItem({ moduleSlug, item }: { moduleSlug: string; item: LessonProgressionView }) {
  const content = (
    <>
      <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${item.unlocked ? "bg-blue-50 text-blue-800 group-hover:bg-white" : "bg-slate-200 text-slate-600"}`}>{item.lesson.order}</span>
      <span className="min-w-48 flex-1"><span className="block font-bold text-slate-950">{item.lesson.title}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{item.lesson.description}</span>{item.lockReason && <span className="mt-1 block text-sm font-semibold leading-6 text-slate-600">{item.lockReason}</span>}</span>
      <ProgressionBadge label={lessonStatusLabel(item)} locked={item.status === "locked"} />
    </>
  );
  const className = `group flex min-h-20 flex-wrap items-center gap-4 rounded-xl border p-4 ${item.unlocked ? "border-slate-200 transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" : "border-slate-300 bg-slate-50"}`;
  return (
    <li>
      {item.unlocked ? <Link href={`/lernen/${moduleSlug}/${item.lesson.slug}`} className={className}>{content}</Link> : <div aria-disabled="true" className={className}>{content}</div>}
    </li>
  );
}

function lessonStatusLabel(item: LessonProgressionView) {
  if (item.status === "completed") return "Erledigt";
  if (item.status === "planned") return "In Vorbereitung";
  return item.status === "locked" ? "Gesperrt" : "Verfügbar";
}

function ProgressionBadge({ label, locked = false }: { label: string; locked?: boolean }) {
  return <span className={`ml-14 inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold sm:ml-0 ${locked ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-900"}`}>{locked && <span aria-hidden="true">🔒</span>}{label}</span>;
}

export function AnonymousLessonAccessGate({
  learningModule,
  lesson,
  children,
}: {
  learningModule: LearningModule;
  lesson: Lesson;
  children: ReactNode;
}) {
  const state = useLearnerProgress();
  const { ready } = useProgressSource();
  if (!ready) return <BrowserProgressPending moduleSlug={learningModule.slug} />;
  const item = getLessonProgression(deriveModuleLearningProgression(state, learningModule), lesson.slug);
  return item.unlocked ? children : (
    <LockedLearningAccess
      kind="lesson"
      moduleSlug={learningModule.slug}
      reason={item.lockReason ?? "Diese Lektion ist noch gesperrt."}
      prerequisite={item.prerequisite}
      anonymous
    />
  );
}

export function AnonymousQuizAccessGate({ learningModule, children }: { learningModule: LearningModule; children: ReactNode }) {
  const state = useLearnerProgress();
  const { ready } = useProgressSource();
  if (!ready) return <BrowserProgressPending moduleSlug={learningModule.slug} />;
  const quiz = deriveModuleLearningProgression(state, learningModule).quiz;
  return quiz.unlocked ? children : <LockedLearningAccess kind="quiz" moduleSlug={learningModule.slug} reason={quiz.lockReason ?? "Das Abschlussquiz ist noch gesperrt."} anonymous />;
}

export function LessonProgressionNavigation({ learningModule, lesson, hasQuiz }: { learningModule: LearningModule; lesson: Lesson; hasQuiz: boolean }) {
  const state = useLearnerProgress();
  const { bypassProgression } = useProgressSource();
  const progression = deriveModuleLearningProgression(state, learningModule, { bypass: bypassProgression });
  const index = progression.lessons.findIndex((item) => item.lesson.slug === lesson.slug);
  const previous = progression.lessons[index - 1];
  const next = progression.lessons[index + 1];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {previous ? <ProgressionNavigationItem direction="previous" moduleSlug={learningModule.slug} item={previous} /> : <span />}
      {next ? <ProgressionNavigationItem direction="next" moduleSlug={learningModule.slug} item={next} /> : hasQuiz ? <QuizNavigationItem moduleSlug={learningModule.slug} unlocked={progression.quiz.unlocked} reason={progression.quiz.lockReason} /> : null}
    </div>
  );
}

function ProgressionNavigationItem({ direction, moduleSlug, item }: { direction: "previous" | "next"; moduleSlug: string; item: LessonProgressionView }) {
  const isNext = direction === "next";
  const content = <><span className="text-xs font-semibold text-slate-500">{isNext ? item.unlocked ? "Nächste Lektion →" : "Nächste Lektion · gesperrt" : "← Vorherige Lektion"}</span><span className="mt-1 text-sm font-bold text-slate-950">{item.lesson.title}</span>{!item.unlocked && <span className="mt-1 text-xs text-slate-600">{item.lockReason}</span>}</>;
  const className = `flex min-h-16 flex-col justify-center rounded-xl border px-4 py-3 ${isNext ? "sm:text-right" : ""} ${item.unlocked ? "border-slate-200 bg-white shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" : "cursor-not-allowed border-slate-300 bg-slate-50"}`;
  return item.unlocked ? <Link href={`/lernen/${moduleSlug}/${item.lesson.slug}`} className={className}>{content}</Link> : <div aria-disabled="true" className={className}>{content}</div>;
}

function QuizNavigationItem({ moduleSlug, unlocked, reason }: { moduleSlug: string; unlocked: boolean; reason?: string }) {
  const content = <><span className="text-xs font-semibold text-slate-500">{unlocked ? "Abschlussquiz →" : "Abschlussquiz · gesperrt"}</span><span className="mt-1 text-sm font-bold text-slate-950">Wissen prüfen</span>{!unlocked && <span className="mt-1 text-xs text-slate-600">{reason}</span>}</>;
  const className = `flex min-h-16 flex-col justify-center rounded-xl border px-4 py-3 sm:text-right ${unlocked ? "border-slate-200 bg-white shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" : "cursor-not-allowed border-slate-300 bg-slate-50"}`;
  return unlocked ? <Link href={`/lernen/${moduleSlug}/quiz`} className={className}>{content}</Link> : <div aria-disabled="true" className={className}>{content}</div>;
}

export function LockedLearningAccess({ kind, moduleSlug, reason, prerequisite, anonymous = false }: { kind: "lesson" | "quiz"; moduleSlug: string; reason: string; prerequisite?: Pick<Lesson, "slug" | "title" | "order">; anonymous?: boolean }) {
  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-300 bg-white p-6 shadow-sm sm:p-10">
      <p className="text-sm font-semibold text-blue-700">Lernreihenfolge</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{kind === "quiz" ? "Abschlussquiz noch gesperrt" : "Lektion noch gesperrt"}</h1>
      <p className="mt-4 leading-7 text-slate-700">{reason}</p>
      {anonymous && <p className="mt-3 text-sm leading-6 text-slate-600">Bei anonymer Nutzung kann der Server deinen lokalen Browser-Lernstand nicht vorab lesen. Die Freigabe wurde nach dem Laden in diesem Browser geprüft.</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        {prerequisite && <Link href={`/lernen/${moduleSlug}/${prerequisite.slug}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Lektion {prerequisite.order} öffnen</Link>}
        <Link href={`/lernen/${moduleSlug}`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zur Modulübersicht</Link>
      </div>
    </article>
  );
}

function BrowserProgressPending({ moduleSlug }: { moduleSlug: string }) {
  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-10" role="status" aria-live="polite">
      <h1 className="text-2xl font-bold text-slate-950">Browser-Lernstand wird geprüft …</h1>
      <p className="mt-3 leading-7 text-slate-700">Anonyme Freigaben liegen nur in diesem Browser. Der Inhalt wird angezeigt, sobald der lokale Lernstand geladen und geprüft wurde.</p>
      <Link href={`/lernen/${moduleSlug}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zur Modulübersicht</Link>
    </article>
  );
}
