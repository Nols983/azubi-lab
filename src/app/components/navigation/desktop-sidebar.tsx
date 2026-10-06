"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CurrentUser } from "../../lib/auth-types";
import { AuthStatus } from "../auth/auth-status";
import { getNavigationItems, isNavigationPathActive } from "./navigation-items";
import type { ShellProfileView } from "../../lib/profile";
import { DesktopAppShellXpSummary } from "../xp/app-shell-xp-summary";
import { getAccountInitials } from "../../lib/account-presentation";
import { ProfileAvatar } from "../profile/profile-avatar";

export function DesktopSidebar({ learner, notificationUnreadCount = 0, shellProfile }: {
  learner?: CurrentUser;
  notificationUnreadCount?: number;
  shellProfile?: ShellProfileView;
}) {
  const pathname = usePathname();
  const navigationItems = getNavigationItems("desktop", learner);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white md:flex md:flex-col">
      <div className="flex h-24 items-center border-b border-slate-100 px-7">
        <Link href="/" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
          <span className="block text-xl font-bold tracking-tight text-slate-950">Azubi Lab</span>
          <span className="mt-0.5 block text-xs font-medium text-slate-500">Systemintegration lernen</span>
        </Link>
      </div>
      <nav aria-label="Hauptnavigation" className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = isNavigationPathActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={isActive ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${isActive ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>
                  {item.iconElement}
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {item.badge === "notifications" && notificationUnreadCount > 0 && <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-blue-950 px-1.5 text-xs font-bold text-white" aria-label={`${notificationUnreadCount} ungelesen`}>{notificationUnreadCount}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {learner && shellProfile && <section aria-label="Profil und Lernfortschritt" className="border-t border-slate-100 px-4 py-4">
        <Link href="/profil" className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl p-2 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          <ProfileAvatar displayName={learner.displayName} initials={getAccountInitials(learner.displayName)} src={shellProfile.avatar.src} size="small" decorative />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-950">{learner.displayName}</span>
            {shellProfile.xp ? (
              <span className="mt-0.5 block truncate text-xs font-semibold text-slate-600">{shellProfile.activeTitle ?? shellProfile.roleLabel}</span>
            ) : (
              <>
                <span className="mt-0.5 block truncate text-xs font-bold text-slate-600">{shellProfile.roleLabel}</span>
                {shellProfile.activeTitle && <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">Titel: {shellProfile.activeTitle}</span>}
              </>
            )}
          </span>
        </Link>
        {shellProfile.xp && <DesktopAppShellXpSummary progress={shellProfile.xp} embedded />}
      </section>}
      <div className="border-t border-slate-100 px-7 py-6">
        <AuthStatus learner={learner} showIdentity={!shellProfile} />
      </div>
    </aside>
  );
}
