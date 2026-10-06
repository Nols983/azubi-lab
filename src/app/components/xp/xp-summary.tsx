import type { LevelProgress } from "../../lib/xp-domain.ts";
import type { NextMilestone } from "../../lib/progression-rewards.ts";
import { NextMilestones } from "../profile/next-milestones.tsx";
import { ProgressBar } from "../progress-bar.tsx";
import Link from "next/link";

export function DashboardXpCard({ progress, activeTitle, milestones = [] }: {
  progress: LevelProgress;
  activeTitle?: string;
  milestones?: readonly NextMilestone[];
}) {
  return (
    <section aria-labelledby="dashboard-xp-heading" className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
      <div className={milestones.length ? "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-start" : ""}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-700">Deine Erfahrung</p>
          <h2 id="dashboard-xp-heading" className="mt-1 text-2xl font-bold text-slate-950">Level {progress.level}</h2>
          {activeTitle && <p className="mt-1 text-sm font-bold text-blue-800">{activeTitle}</p>}
          <p className="mt-1 font-semibold text-slate-700">{formatXp(progress.totalXp)} XP gesamt</p>
          <div className="mt-5">
            <ProgressBar value={progress.progressPercentage} label={`Fortschritt zu Level ${progress.level + 1}`} />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">
            {formatXp(progress.xpIntoCurrentLevel)} / {formatXp(progress.xpRequiredForNextLevel)} XP bis Level {progress.level + 1}
          </p>
          <Link href="/profil" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-blue-800 underline decoration-blue-300 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Titel und Abzeichen ansehen</Link>
        </div>
        <NextMilestones milestones={milestones} compact />
      </div>
    </section>
  );
}

export function ProgressXpSection({ progress }: { progress: LevelProgress }) {
  return (
    <section aria-labelledby="xp-progress-heading" className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-700">Erfahrungspunkte</p>
          <h2 id="xp-progress-heading" className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Level {progress.level}</h2>
          <p className="mt-2 text-lg font-bold text-slate-800">{formatXp(progress.totalXp)} XP gesamt</p>
        </div>
        <p className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-950">
          Noch {formatXp(progress.xpRemainingToNextLevel)} XP bis Level {progress.level + 1}
        </p>
      </div>
      <div className="mt-6">
        <ProgressBar value={progress.progressPercentage} label={`XP-Fortschritt zu Level ${progress.level + 1}`} />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">
        {formatXp(progress.xpIntoCurrentLevel)} / {formatXp(progress.xpRequiredForNextLevel)} XP im aktuellen Level
      </p>
    </section>
  );
}

function formatXp(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}
