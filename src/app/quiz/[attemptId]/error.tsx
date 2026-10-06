"use client";

import Link from "next/link";

export default function PracticeQuizError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-950">Quiz konnte nicht geladen werden</h1>
      <p className="mt-3 leading-7 text-slate-700">
        Die Quizdaten konnten gerade nicht sicher geladen werden. Dein lokaler Entwurf bleibt im Browser erhalten.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
          Erneut laden
        </button>
        <Link href="/quiz" className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
          Zur Quiz-Auswahl
        </Link>
      </div>
    </section>
  );
}
