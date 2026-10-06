import type { ReactNode } from "react";
import type { CurrentUser } from "../lib/auth-types";
import { AuthStatus } from "./auth/auth-status";
import { DesktopSidebar } from "./navigation/desktop-sidebar";
import { MobileNavigation } from "./navigation/mobile-navigation";
import { ProgressSyncNotices } from "./progress/progress-sync-ui";
import { MobileAppShellXpSummary } from "./xp/app-shell-xp-summary";
import { isReadOnlyPlatformPreview } from "../lib/authorization";
import type { ShellProfileView } from "../lib/profile";

export function AppShell({ children, learner, notificationUnreadCount = 0, shellProfile }: {
  children: ReactNode;
  learner?: CurrentUser;
  notificationUnreadCount?: number;
  shellProfile?: ShellProfileView;
}) {
  const xpProgress = shellProfile?.xp;
  const showMobileDrawer = Boolean(learner && !learner.mustChangePassword);
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <DesktopSidebar learner={learner} notificationUnreadCount={notificationUnreadCount} shellProfile={shellProfile} />
      <main id="main-content" className="md:ml-64">
        <div className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <div className="mb-4 md:hidden">
            <div className="flex min-h-12 items-center justify-between gap-3">
              {showMobileDrawer && learner && (
                <MobileNavigation learner={learner} notificationUnreadCount={notificationUnreadCount} shellProfile={shellProfile} />
              )}
              <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
                {xpProgress && <MobileAppShellXpSummary progress={xpProgress} />}
                {!showMobileDrawer && <AuthStatus learner={learner} compact />}
              </div>
            </div>
          </div>
          {learner && isReadOnlyPlatformPreview(learner.role) && (
            <p role="status" className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-blue-950">
              Betrachtermodus – Aktivitäten verändern keinen Lernfortschritt.
            </p>
          )}
          <ProgressSyncNotices />
          {children}
        </div>
      </main>
    </div>
  );
}
