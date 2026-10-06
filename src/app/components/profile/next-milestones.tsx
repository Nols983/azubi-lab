import Link from "next/link";
import type { NextMilestone } from "../../lib/progression-rewards.ts";

export function NextMilestones({
  milestones,
  compact = false,
}: {
  milestones: readonly NextMilestone[];
  compact?: boolean;
}) {
  if (milestones.length === 0) return null;
  return (
    <section aria-labelledby={compact ? "dashboard-milestones-heading" : "profile-milestones-heading"} className={compact ? "mt-5 min-w-0 border-t border-slate-100 pt-5 xl:mt-0 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0" : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"}>
      <p className="text-sm font-semibold text-blue-700">Als Nächstes erreichbar</p>
      <h2 id={compact ? "dashboard-milestones-heading" : "profile-milestones-heading"} className={compact ? "mt-1 text-lg font-bold text-slate-950" : "mt-1 text-2xl font-bold text-slate-950"}>Nächste Meilensteine</h2>
      <ul className={compact ? "mt-4 space-y-4" : "mt-5 grid gap-4 md:grid-cols-3"}>
        {milestones.map((milestone) => (
          <li key={milestone.rewardId} className={compact ? "" : "rounded-xl border border-slate-200 bg-slate-50 p-4"}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-950">{milestone.displayName}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{milestone.type === "title" ? "Titel" : "Abzeichen"} · {milestone.category}</p>
              </div>
              <span className="shrink-0 text-sm font-bold text-blue-800">{milestone.current} / {milestone.target}</span>
            </div>
            {!compact && <p className="mt-2 text-sm leading-6 text-slate-600">{milestone.description}</p>}
            <progress
              max={milestone.target}
              value={milestone.current}
              aria-label={`${milestone.displayName}: ${milestone.current} von ${milestone.target}`}
              className="mt-3 h-2 w-full overflow-hidden rounded-full accent-blue-800"
            />
            {!compact && (
              <Link href={milestone.destination} className="mt-3 inline-flex min-h-10 items-center text-sm font-bold text-blue-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                Details ansehen
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
