import Link from "next/link";

export function AdminAccessDenied() {
  return (
    <div className="mx-auto max-w-2xl py-8 sm:py-14">
      <section aria-labelledby="admin-denied-heading" className="rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-800">Zugriff verweigert · 403</p>
        <h1 id="admin-denied-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Keine Administrationsberechtigung</h1>
        <p className="mt-4 leading-7 text-slate-700">Deine aktuelle Kontorolle darf diese Verwaltungsfunktion nicht verwenden.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zum Dashboard</Link>
      </section>
    </div>
  );
}
