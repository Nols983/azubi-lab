import type { XpHistoryItem } from "../../lib/xp-event-presentation.ts";

export function XpHistory({ items }: { items: readonly XpHistoryItem[] }) {
  return (
    <section aria-labelledby="xp-history-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-sm font-semibold text-blue-700">Persönlicher Verlauf</p>
      <h2 id="xp-history-heading" className="mt-1 text-2xl font-bold text-slate-950">Letzte XP</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">Noch keine XP-Ereignisse vorhanden.</p>
      ) : (
        <ol className="mt-5 divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-bold leading-6 text-slate-950">{item.label}</p>
                {item.detail && <p className="mt-1 text-sm font-medium text-slate-600">{item.detail}</p>}
                <time dateTime={item.awardedAt} className="mt-1 block text-xs text-slate-500">{formatXpDate(item.awardedAt)}</time>
              </div>
              <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">{item.xpLabel}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatXpDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}
