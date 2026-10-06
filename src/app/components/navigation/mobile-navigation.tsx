"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { getAccountInitials } from "../../lib/account-presentation.ts";
import { ACCOUNT_ROLE_LABELS, type CurrentUser } from "../../lib/auth-types.ts";
import type { ShellProfileView } from "../../lib/profile.ts";
import { AuthStatus } from "../auth/auth-status.tsx";
import { ProfileAvatar } from "../profile/profile-avatar.tsx";
import { MobileDrawerXpSummary } from "../xp/app-shell-xp-summary.tsx";
import {
  getNavigationItems,
  isNavigationPathActive,
  type NavigationItem,
} from "./navigation-items.tsx";

const drawerId = "mobile-navigation-drawer";

export function MobileNavigation({ learner, notificationUnreadCount = 0, shellProfile }: {
  learner: CurrentUser;
  notificationUnreadCount?: number;
  shellProfile?: ShellProfileView;
}) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousBodyOverflow = useRef<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const items = getNavigationItems("mobile", learner);
  const primaryItems = items.filter((item) => item.section === "primary");
  const roleItems = items.filter((item) => item.section === "role");

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches && dialogRef.current?.open) dialogRef.current.close();
    };
    desktopQuery.addEventListener("change", closeAtDesktop);
    return () => {
      desktopQuery.removeEventListener("change", closeAtDesktop);
      if (previousBodyOverflow.current !== null) {
        document.body.style.overflow = previousBodyOverflow.current;
        previousBodyOverflow.current = null;
      }
    };
  }, []);

  function openDrawer() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    previousBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    setIsOpen(true);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
  }

  function closeDrawer() {
    if (dialogRef.current?.open) dialogRef.current.close();
  }

  function handleDialogClose() {
    setIsOpen(false);
    if (previousBodyOverflow.current !== null) {
      document.body.style.overflow = previousBodyOverflow.current;
      previousBodyOverflow.current = null;
    }
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDrawer();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Navigation öffnen"
        aria-haspopup="dialog"
        aria-controls={drawerId}
        aria-expanded={isOpen}
        onClick={openDrawer}
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 shadow-sm transition-colors hover:border-blue-400 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="1.8"><path strokeLinecap="round" d="M4 6.5h16M4 12h16M4 17.5h16" /></svg>
      </button>

      <dialog
        ref={dialogRef}
        id={drawerId}
        aria-labelledby={`${drawerId}-title`}
        aria-modal="true"
        onCancel={(event) => { event.preventDefault(); closeDrawer(); }}
        onClose={handleDialogClose}
        onClick={handleBackdropClick}
        className="mobile-navigation-drawer m-0 h-dvh max-h-dvh w-[min(84vw,20rem)] max-w-none overflow-hidden border-0 bg-transparent p-0 md:hidden"
      >
        <div className="flex h-dvh min-h-0 flex-col border-r border-slate-200 bg-white shadow-2xl">
          <header className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex min-h-12 items-center justify-between gap-3">
              <div>
                <p id={`${drawerId}-title`} className="text-lg font-bold tracking-tight text-slate-950">Azubi Lab</p>
                <p className="text-xs font-medium text-slate-500">Navigation</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Navigation schließen"
                onClick={closeDrawer}
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="1.8"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <Link
              href="/profil"
              onClick={closeDrawer}
              className="mt-4 flex min-h-16 min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              aria-label={`Profil von ${learner.displayName} öffnen`}
            >
              <ProfileAvatar displayName={learner.displayName} initials={getAccountInitials(learner.displayName)} src={shellProfile?.avatar.src} size="small" decorative />
              <span className="min-w-0">
                <span className="block truncate font-bold text-slate-950">{learner.displayName}</span>
                {shellProfile?.xp ? (
                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-600">{shellProfile.activeTitle ?? shellProfile.roleLabel}</span>
                ) : (
                  <>
                    <span className="mt-0.5 block truncate text-xs font-bold text-slate-600">{shellProfile?.roleLabel ?? ACCOUNT_ROLE_LABELS[learner.role]}</span>
                    {shellProfile?.activeTitle && <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">Titel: {shellProfile.activeTitle}</span>}
                  </>
                )}
              </span>
            </Link>
            {shellProfile?.xp && <MobileDrawerXpSummary progress={shellProfile.xp} />}
          </header>

          <nav aria-label="Mobile Hauptnavigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
            <NavigationList
              items={primaryItems}
              pathname={pathname}
              notificationUnreadCount={notificationUnreadCount}
              onNavigate={closeDrawer}
            />
            {roleItems.length > 0 && (
              <section aria-labelledby={`${drawerId}-role-heading`} className="mt-6 border-t border-slate-100 pt-5">
                <h2 id={`${drawerId}-role-heading`} className="px-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Dein Bereich</h2>
                <NavigationList
                  items={roleItems}
                  pathname={pathname}
                  notificationUnreadCount={notificationUnreadCount}
                  onNavigate={closeDrawer}
                  className="mt-2"
                />
              </section>
            )}
          </nav>

          <footer className="shrink-0 border-t border-slate-100 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <AuthStatus learner={learner} showIdentity={false} />
          </footer>
        </div>
      </dialog>
    </>
  );
}

function NavigationList({ items, pathname, notificationUnreadCount, onNavigate, className = "" }: {
  items: readonly NavigationItem[];
  pathname: string;
  notificationUnreadCount: number;
  onNavigate: () => void;
  className?: string;
}) {
  return (
    <ul className={`space-y-1 ${className}`}>
      {items.map((item) => {
        const isActive = isNavigationPathActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={onNavigate}
              className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${isActive ? "border-blue-200 bg-blue-50 text-blue-900" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
            >
              {item.iconElement}
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.badge === "notifications" && notificationUnreadCount > 0 && (
                <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-blue-950 px-1.5 text-xs font-bold text-white" aria-label={`${notificationUnreadCount} ungelesen`}>
                  {notificationUnreadCount}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
