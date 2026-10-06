"use client";

import { useEffect, useState } from "react";
import {
  getDashboardGreeting,
  getMillisecondsUntilNextGreetingBoundary,
  getNeutralDashboardGreeting,
} from "../../lib/dashboard-greeting.ts";

export function DynamicDashboardGreeting({ displayName }: { displayName?: string }) {
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
    <header>
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Dashboard</p>
      <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        {greeting.heading} <span aria-hidden="true">{greeting.emoji}</span>
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{greeting.subtitle}</p>
    </header>
  );
}
