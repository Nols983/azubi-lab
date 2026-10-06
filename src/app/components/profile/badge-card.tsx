import Image from "next/image";
import { BADGE_FAMILIES, type RewardCollectionItem } from "../../lib/progression-rewards.ts";
import { formatRewardUnlockDate } from "../../lib/reward-history.ts";
import {
  getBadgeArtworkPath,
  getBadgeClassPresentation,
  getBadgeVisualTheme,
} from "../../lib/badge-presentation.ts";

export type BadgeCardVariant = "compact" | "preview" | "collection";

export function BadgeCard({
  badge,
  variant = "collection",
  showLocked = false,
  pinned = false,
  showUnlockDate = false,
}: {
  badge: RewardCollectionItem;
  variant?: BadgeCardVariant;
  showLocked?: boolean;
  pinned?: boolean;
  showUnlockDate?: boolean;
}) {
  const theme = getBadgeVisualTheme(badge);
  const presentation = getBadgeClassPresentation(badge);
  const familyLabel = badge.familyId ? BADGE_FAMILIES[badge.familyId].label : undefined;
  const locked = showLocked && !badge.unlocked;
  const unlockDate = showUnlockDate && badge.unlockedAt
    ? formatRewardUnlockDate(badge.unlockedAt)
    : undefined;
  if (variant === "compact") {
    return (
      <span
        aria-label={`Abzeichen: ${badge.displayName}, ${presentation.label}`}
        className={`inline-flex min-h-10 min-w-0 max-w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 ${theme.frameClass} ${theme.surfaceClass} ${presentation.cardClass}`}
      >
        <BadgeEmblem badge={badge} compact />
        <span className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{badge.displayName}</span>
        {badge.visualClass !== "unique" && <span className={`rounded-full border px-1.5 py-0.5 text-[0.65rem] font-black uppercase tracking-wide ${presentation.accentClass}`}>{presentation.label}</span>}
      </span>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${presentation.cardClass} ${locked ? "border-slate-300 bg-slate-100 opacity-75 dark:border-slate-700 dark:bg-slate-900" : `${theme.frameClass} ${theme.surfaceClass}`}`}>
      <div aria-hidden="true" className="absolute -right-8 -top-10 size-28 rounded-full border-[14px] border-white/35" />
      <div className="relative flex items-start gap-3">
        <BadgeEmblem badge={badge} locked={locked} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-black tracking-tight text-slate-950 dark:text-slate-50">{badge.displayName}</p>
              <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">{theme.label}{familyLabel ? ` · ${familyLabel}` : ""}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${presentation.accentClass}`}>{presentation.label}</span>
              {pinned && <span className="rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100">Angeheftet</span>}
              {showLocked && (
                <span className="rounded-full border border-slate-300 bg-white/85 px-2.5 py-1 text-xs font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-950/85 dark:text-slate-200">
                  {badge.unlocked ? "Freigeschaltet" : "Gesperrt"}
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{badge.unlockCondition}</p>
          {badge.progress && (
            <div className="mt-3">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Fortschritt</span><span>{badge.progress.current} / {badge.progress.target}</span>
              </div>
              <progress max={badge.progress.target} value={badge.progress.current} aria-label={`${badge.displayName}: ${badge.progress.current} von ${badge.progress.target}`} className="mt-1.5 h-2 w-full overflow-hidden rounded-full accent-blue-800 dark:accent-blue-400" />
            </div>
          )}
          {unlockDate && <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Freigeschaltet am <time dateTime={badge.unlockedAt}>{unlockDate}</time></p>}
        </div>
      </div>
    </div>
  );
}

function BadgeEmblem({
  badge,
  locked = false,
  compact = false,
}: {
  badge: RewardCollectionItem;
  locked?: boolean;
  compact?: boolean;
}) {
  const theme = getBadgeVisualTheme(badge);
  const presentation = getBadgeClassPresentation(badge);
  const artwork = getBadgeArtworkPath(badge);
  const sizeClass = compact ? "size-10" : "size-16";

  if (artwork) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex ${sizeClass} shrink-0 overflow-hidden rounded-[1rem] border bg-slate-950 shadow-sm ring-2 ring-offset-2 ring-transparent dark:ring-offset-slate-950 ${theme.frameClass} ${presentation.emblemClass}`}
      >
        <Image
          src={artwork}
          alt=""
          width={512}
          height={512}
          sizes={compact ? "40px" : "64px"}
          className={`size-full object-cover ${locked ? "grayscale opacity-45" : ""}`}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-[1rem] border border-white/60 text-xs font-black tracking-tight shadow-sm ring-2 ring-offset-2 dark:border-slate-700 dark:ring-offset-slate-950 ${locked ? "bg-slate-500 text-white ring-slate-300 dark:bg-slate-700 dark:ring-slate-600" : `${theme.emblemClass} ${presentation.emblemClass}`}`}
    >
      {badge.visual ?? "AZ"}
    </span>
  );
}
