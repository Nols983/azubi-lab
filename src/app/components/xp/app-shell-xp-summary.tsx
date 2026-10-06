import Link from "next/link";
import type { LevelProgress } from "../../lib/xp-domain.ts";
import { ProgressBar } from "../progress-bar.tsx";

export function DesktopAppShellXpSummary({ progress, embedded = false }: { progress: LevelProgress; embedded?: boolean }) {
  return (
    <section aria-label="XP und Level" className={embedded ? "px-1 pt-3" : "border-t border-slate-100 px-4 py-4"}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <p className="font-bold text-slate-950">Level {progress.level}</p>
        <p className="text-sm font-bold text-blue-800">{formatXp(progress.totalXp)} XP</p>
      </div>
      <div className="mt-3">
        <ProgressBar value={progress.progressPercentage} label={`Fortschritt zu Level ${progress.level + 1}`} />
      </div>
      <p className="mt-2 px-1 text-xs font-medium leading-5 text-slate-600">
        {formatXp(progress.xpIntoCurrentLevel)} / {formatXp(progress.xpRequiredForNextLevel)} XP bis Level {progress.level + 1}
      </p>
    </section>
  );
}

export function MobileAppShellXpSummary({ progress }: { progress: LevelProgress }) {
  const label = `Level ${progress.level} · ${formatXp(progress.totalXp)} XP`;
  return (
    <Link
      href="/fortschritt"
      aria-label={`${label}. XP-Fortschritt öffnen`}
      className="inline-flex min-h-11 items-center rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-950 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      {label}
    </Link>
  );
}
export function MobileDrawerXpSummary({ progress }: { progress: LevelProgress }) {
  return (
    <section aria-label="XP und Level" className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold text-slate-950">Level {progress.level}</p>
        <p className="text-xs font-bold text-blue-800">{formatXp(progress.totalXp)} XP</p>
      </div>
      <div className="mt-2">
        <ProgressBar value={progress.progressPercentage} label={`Fortschritt zu Level ${progress.level + 1}`} />
      </div>
    </section>
  );
}

function formatXp(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}
