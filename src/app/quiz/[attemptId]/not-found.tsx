import Link from "next/link";

export default function PracticeQuizNotFound() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Übungsquiz</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Quiz nicht gefunden</h1>
      <p className="mt-4 leading-7 text-slate-600">
        Dieses Quiz ist für dein Konto nicht verfügbar. Wähle Lernbereiche aus und starte ein neues Übungsquiz.
      </p>
      <Link href="/quiz" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
        Zur Quiz-Auswahl
      </Link>
    </section>
  );
}
