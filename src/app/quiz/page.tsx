import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PracticeCategorySelector } from "../components/quiz/practice-category-selector.tsx";
import {
  assessmentGroupIds,
  assessmentGroupLabels,
  getAssessmentGroupForModule,
} from "../data/quiz-bank/categories.ts";
import { questionBank } from "../data/quiz-bank/question-bank.ts";
import { getCurrentDatabaseUser } from "../lib/server/current-user.ts";
import { canPreviewQuizzes, isReadOnlyPlatformPreview } from "../lib/authorization.ts";
import { getPracticeQuizPreview } from "../lib/server/quiz-preview-service.ts";
import { QuizApp } from "../components/quiz/quiz-app.tsx";

export const metadata: Metadata = { title: "Übungsquiz" };
export const dynamic = "force-dynamic";

export default async function QuizPage() {
  let currentUser;
  try {
    currentUser = await getCurrentDatabaseUser();
  } catch (error) {
    console.error("[azubi-lab] practice quiz access failed", error instanceof Error ? error.name : "UnknownError");
    return <QuizUnavailable />;
  }

  if (!currentUser) return <QuizSignIn />;
  if (currentUser.mustChangePassword) {
    redirect("/konto/passwort-aendern?callbackUrl=%2Fquiz");
  }

  if (isReadOnlyPlatformPreview(currentUser.role) && canPreviewQuizzes(currentUser.role)) {
    return <PracticeQuizPreview />;
  }

  const categories = assessmentGroupIds.map((categoryId) => ({
    id: categoryId,
    label: assessmentGroupLabels[categoryId],
    questionCount: questionBank.filter((question) =>
      question.practiceEligible && getAssessmentGroupForModule(question.moduleSlug) === categoryId).length,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Wissen festigen</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Übungsquiz</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
          Stelle dein persönliches Quiz aus den aktuellen Lernbereichen zusammen. Jedes Quiz enthält 15 Fragen mit gemischter Schwierigkeit sowie Single- und Multiple-Choice-Aufgaben.
        </p>
      </header>

      <section aria-labelledby="quiz-format-heading" className="mt-7 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 sm:p-6">
        <h2 id="quiz-format-heading" className="font-bold text-slate-950">So funktioniert das Übungsquiz</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700 sm:grid-cols-2">
          <li className="flex gap-2"><span aria-hidden="true">✓</span><span>15 Fragen pro Quiz</span></li>
          <li className="flex gap-2"><span aria-hidden="true">✓</span><span>Gemischte Schwierigkeit</span></li>
          <li className="flex gap-2"><span aria-hidden="true">✓</span><span>Single- und Multiple-Choice</span></li>
          <li className="flex gap-2"><span aria-hidden="true">✓</span><span>Fragen und Antworten werden bei jedem neuen Quiz neu gemischt</span></li>
          {currentUser.role === "learner" && <li className="flex gap-2"><span aria-hidden="true">XP</span><span>Die ersten 3 abgeschlossenen Übungsquizze pro Tag geben XP.</span></li>}
        </ul>
      </section>

      <PracticeCategorySelector categories={categories} />
      <IhkEntryCard authenticated />
    </div>
  );
}

function PracticeQuizPreview() {
  const quiz = getPracticeQuizPreview();
  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Betrachtermodus · Quiz-Vorschau</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Übungsquiz ausprobieren</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">Dieser repräsentative 15-Fragen-Mix läuft vollständig ohne persönliche Versuchshistorie, Lernfortschritt oder XP.</p>
      </header>
      <div className="mt-8"><QuizApp quiz={quiz} /></div>
      <IhkEntryCard authenticated />
    </div>
  );
}

function QuizSignIn() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Persönliches Übungsquiz</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Zum Quiz anmelden</h1>
      <p className="mt-4 leading-7 text-slate-600">Melde dich mit deinem Azubi-Lab-Konto an, damit dein Quiz sicher gespeichert und später ausgewertet werden kann.</p>
      <Link href="/login?callbackUrl=%2Fquiz" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Anmelden</Link>
      <IhkEntryCard />
    </section>
  );
}

function IhkEntryCard({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <section aria-labelledby="ihk-entry-heading" className="mt-10 rounded-2xl border border-slate-300 bg-slate-50 p-5 sm:p-7">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Prüfungsmodus</p>
      <h2 id="ihk-entry-heading" className="mt-2 text-2xl font-bold text-slate-950">IHK-Simulation</h2>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">30 Fragen, 45 Minuten, alle fünf Lernbereiche und eine persönliche Auswertung. Die ausgewogene Simulation vergibt keine XP und ersetzt keine offizielle IHK-Prüfung.</p>
      <Link href={authenticated ? "/quiz/ihk" : "/login?callbackUrl=%2Fquiz%2Fihk"} className="mt-5 inline-flex min-h-12 items-center rounded-xl border border-blue-300 bg-white px-5 py-3 text-sm font-bold text-blue-950 hover:border-blue-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{authenticated ? "IHK-Simulation öffnen" : "Für IHK-Simulation anmelden"}</Link>
    </section>
  );
}

function QuizUnavailable() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-950">Übungsquiz vorübergehend nicht verfügbar</h1>
      <p className="mt-3 leading-7 text-slate-700">Dein Konto und die Quizdaten konnten gerade nicht sicher geladen werden. Bitte versuche es später erneut.</p>
    </section>
  );
}
