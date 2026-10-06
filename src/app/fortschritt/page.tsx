import type { Metadata } from "next";
import { PracticeQuizStatistics, type PracticeQuizStatisticsDisplayData } from "../components/progress/practice-quiz-statistics";
import { ProgressOverview } from "../components/progress/progress-overview";
import { ProgressStorageIndicator } from "../components/progress/progress-sync-ui";
import { getCurrentPracticeQuizStatisticsPageData } from "../lib/server/practice-quiz-statistics-service";
import { getCurrentXpHistoryView, getCurrentXpView, type CurrentXpHistoryView, type CurrentXpView } from "../lib/server/xp-service";
import { ProgressXpSection } from "../components/xp/xp-summary";
import { XpHistory } from "../components/xp/xp-history";
import Link from "next/link";
import { canViewPersonalProgress } from "../lib/authorization";
import { getCurrentDatabaseUser } from "../lib/server/current-user";
export const metadata: Metadata = { title: "Fortschritt" };
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const currentUser = await getCurrentDatabaseUser();
  if (currentUser && !canViewPersonalProgress(currentUser.role)) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-800">Zugriff verweigert · 403</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Kein persönlicher Lernstand</h1>
        <p className="mt-4 leading-7 text-slate-700">Betrachterkonten führen keine persönlichen XP-, Quiz- oder Fortschrittsdaten.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zum Dashboard</Link>
      </section>
    );
  }
  const [quizResult, xpResult, xpHistoryResult] = await Promise.allSettled([
    getCurrentPracticeQuizStatisticsPageData(),
    getCurrentXpView(),
    getCurrentXpHistoryView(),
  ]);
  const quizStatistics: PracticeQuizStatisticsDisplayData = quizResult.status === "fulfilled"
    ? quizResult.value
    : { audience: "unavailable" };
  const xp: CurrentXpView | { audience: "unavailable" } = xpResult.status === "fulfilled"
    ? xpResult.value
    : { audience: "unavailable" };
  const xpHistory: CurrentXpHistoryView | { audience: "unavailable"; items: readonly [] } = xpHistoryResult.status === "fulfilled"
    ? xpHistoryResult.value
    : { audience: "unavailable", items: [] };
  if (quizResult.status === "rejected") {
    console.error("[azubi-lab] personal practice quiz statistics failed", errorName(quizResult.reason));
  }
  if (xpResult.status === "rejected") {
    console.error("[azubi-lab] current XP summary failed", errorName(xpResult.reason));
  }
  if (xpHistoryResult.status === "rejected") {
    console.error("[azubi-lab] XP history failed", errorName(xpHistoryResult.reason));
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Lernstand</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Fortschritt</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Dein Lernstand wird aus erledigten Lektionen und eingereichten Abschlussquizzen berechnet.</p>
        <div className="mt-4"><ProgressStorageIndicator /></div>
      </header>
      <ProgressOverview />
      {xp.audience === "learner" && <ProgressXpSection progress={xp.progress} />}
      {xpHistory.audience === "learner" && <XpHistory items={xpHistory.items} />}
      <PracticeQuizStatistics data={quizStatistics} />
    </div>
  );
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}
