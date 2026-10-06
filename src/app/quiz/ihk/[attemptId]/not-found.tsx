import Link from "next/link";

export default function IhkExamNotFound() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">IHK-Simulation</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Prüfung nicht gefunden</h1>
      <p className="mt-4 leading-7 text-slate-600">Diese Prüfung ist für dein Konto nicht verfügbar.</p>
      <Link href="/quiz/ihk" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zur IHK-Simulation</Link>
    </section>
  );
}
