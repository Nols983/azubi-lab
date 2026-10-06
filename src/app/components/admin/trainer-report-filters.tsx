import Link from "next/link";
import { learningModules } from "../../data/learning-modules";
import type { TrainerOverviewFilters } from "../../lib/trainer-reporting";

export function TrainerReportFilters({
  action,
  resetHref,
  filters,
  filteredCount,
  totalCount,
  includeFocus = false,
}: {
  action: string;
  resetHref: string;
  filters: TrainerOverviewFilters;
  filteredCount: number;
  totalCount: number;
  includeFocus?: boolean;
}) {
  const hasFilters = Boolean(filters.query || filters.moduleSlug || filters.status !== "all" || (includeFocus && filters.focus !== "all"));
  return (
    <section aria-labelledby="report-filter-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="report-filter-heading" className="text-lg font-bold text-slate-950">Ansicht filtern</h2>
          <p className="mt-1 text-sm text-slate-600">Name, Modul und Lernstand gezielt eingrenzen.</p>
        </div>
        <p className="text-sm font-semibold text-slate-600">{filteredCount} von {totalCount} Lernkonten</p>
      </div>
      <form action={action} method="get" className={"mt-5 grid gap-4 md:grid-cols-2 " + (includeFocus ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
        <label className="block text-sm font-bold text-slate-800">Name oder Anmeldekennung
          <input name="q" defaultValue={filters.query} maxLength={120} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
        </label>
        <label className="block text-sm font-bold text-slate-800">Modul
          <select name="module" defaultValue={filters.moduleSlug} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <option value="">Alle Module</option>
            {learningModules.map((learningModule) => <option key={learningModule.slug} value={learningModule.slug}>{learningModule.title}</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold text-slate-800">Lernstand
          <select name="status" defaultValue={filters.status} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <option value="all">Alle Status</option>
            <option value="not-started">Nicht begonnen</option>
            <option value="in-progress">In Arbeit</option>
            <option value="completed">Abgeschlossen</option>
          </select>
        </label>
        {includeFocus && <label className="block text-sm font-bold text-slate-800">Betreuungsfokus
          <select name="focus" defaultValue={filters.focus} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <option value="all">Alle Lernkonten</option>
            <option value="lab-active">Aktive Labs</option>
            <option value="lab-support">Lab-Unterstützung prüfen</option>
            <option value="challenge-open">Offene Challenges</option>
            <option value="challenge-review">Challenge-Aktion nötig</option>
            <option value="curriculum-active">Aktiver Lernplan</option>
            <option value="curriculum-overdue">Lernplanziel überschritten</option>
          </select>
        </label>}
        <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-full">
          <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Filter anwenden</button>
          {hasFilters && <Link href={resetHref} className="inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Filter zurücksetzen</Link>}
        </div>
      </form>
    </section>
  );
}

export function firstSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : value?.[0];
}
