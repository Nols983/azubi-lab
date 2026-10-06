import Link from "next/link";

export function LearnerChallengeAccessDenied() {
  return (
    <section aria-labelledby="challenge-denied-heading" className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm sm:p-9">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-800">Zugriff verweigert · 403</p>
      <h1 id="challenge-denied-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Nur für Lernkonten</h1>
      <p className="mt-4 leading-7 text-slate-700">Administrationskonten besitzen keinen persönlichen Challenge-Fortschritt. Nutze stattdessen die Challenge-Verwaltung.</p>
      <Link href="/admin/challenges" className="mt-6 inline-flex min-h-11 items-center rounded-lg font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zur Challenge-Verwaltung</Link>
    </section>
  );
}
