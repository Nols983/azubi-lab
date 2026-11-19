"use client";

import { useEffect, useState } from "react";
import { getAccountInitials } from "../../lib/account-presentation.ts";
import type { LevelProgress } from "../../lib/xp-domain.ts";
import { ProfileAvatar } from "../profile/profile-avatar.tsx";
import {
  getDashboardGreeting,
  getMillisecondsUntilNextGreetingBoundary,
  getNeutralDashboardGreeting,
} from "../../lib/dashboard-greeting.ts";

export function DynamicDashboardGreeting({ displayName, avatarSrc, roleLabel, activeTitle, xp }: {
  displayName?: string;
  avatarSrc?: string;
  roleLabel?: string;
  activeTitle?: string;
  xp?: LevelProgress;
}) {
  const [greeting, setGreeting] = useState(() => getNeutralDashboardGreeting(displayName));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      const now = new Date();
      setGreeting(getDashboardGreeting(now, displayName));
      if (timer) clearTimeout(timer);
      timer = setTimeout(update, getMillisecondsUntilNextGreetingBoundary(now));
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") update();
    };
    update();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", update);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", update);
    };
  }, [displayName]);

  return (
    <header className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
      <span aria-hidden="true" className="absolute -right-16 -top-20 size-56 rounded-full bg-blue-50" />
      <span aria-hidden="true" className="absolute right-20 top-8 size-16 rounded-full border-[12px] border-blue-100/70" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-700">Dashboard</p>
          <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {greeting.heading} <span aria-hidden="true">{greeting.emoji}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{greeting.subtitle}</p>
          {(roleLabel || activeTitle || xp) && (
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Profilübersicht">
              {roleLabel && <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">{roleLabel}</span>}
              {activeTitle && <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">{activeTitle}</span>}
              {xp && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">Level {xp.level} · {new Intl.NumberFormat("de-DE").format(xp.totalXp)} XP</span>}
            </div>
          )}
        </div>
        {displayName && roleLabel && (
          <div className="order-first shrink-0 sm:order-last">
            <ProfileAvatar displayName={displayName} initials={getAccountInitials(displayName)} src={avatarSrc} size="large" decorative progressRingPercentage={xp?.progressPercentage} />
          </div>
        )}
      </div>
    </header>
  );
}
