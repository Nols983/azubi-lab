import type { ReactNode } from "react";
import type { CurrentUser } from "../../lib/auth-types.ts";
import {
  getNavigationDefinitions,
  isNavigationPathActive,
  navigationDefinitions,
  type NavigationDefinition,
  type NavigationIconName,
  type NavigationSurface,
} from "./navigation-model.ts";

export type NavigationItem = NavigationDefinition & { iconElement: ReactNode };
const iconClassName = "size-5 shrink-0";

const navigationIcons: Record<NavigationIconName, ReactNode> = {
  dashboard: <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75h6.5v6.5h-6.5zm10 0h6.5v6.5h-6.5zm-10 10h6.5v6.5h-6.5zm10 0h6.5v6.5h-6.5z" /></svg>,
  learning: <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 5.25A2.25 2.25 0 0 1 6.25 3H11v16H6.25A2.25 2.25 0 0 0 4 21.25zm16 0A2.25 2.25 0 0 0 17.75 3H13v16h4.75A2.25 2.25 0 0 1 20 21.25z" /></svg>,
  labs: <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 3v5l-4.5 8a3 3 0 0 0 2.62 4.5h11.76A3 3 0 0 0 20.5 16L16 8V3M7 12h10M6 3h12" /></svg>,
  quiz: <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9a2.25 2.25 0 1 1 3.8 1.63c-.87.84-1.55 1.22-1.55 2.37m0 3h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /></svg>,
  challenges: <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5a6.5 6.5 0 0 0-3.9 11.7c.58.43.9 1.02.9 1.6V18h6v-1.2c0-.58.32-1.17.9-1.6A6.5 6.5 0 0 0 12 3.5ZM9.5 21h5" /></svg>,
  progress: <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10m5 10V4m6 16v-7m5 7V7" /></svg>,
  "learning-plan": <svg aria-hidden="true" viewBox="0 0 24 24" className={`${iconClassName} fill-none stroke-current`} strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v13.5l-3.75-2.25L12 19.5l-3.75-2.25L4.5 19.5V6A1.5 1.5 0 0 1 6 4.5Z" /><path strokeLinecap="round" d="M8 8.5h8M8 12h5" /></svg>,
  teams: <svg aria-hidden="true" viewBox="0 0 24 24" className={`${iconClassName} fill-none stroke-current`} strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5-1a2.5 2.5 0 1 0 0-5M3.5 19a5 5 0 0 1 10 0m1.5-5a4.5 4.5 0 0 1 5.5 4.4" /></svg>,
  trainer: <svg aria-hidden="true" viewBox="0 0 24 24" className={`${iconClassName} fill-none stroke-current`} strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-3Z" /><path strokeLinecap="round" d="M9 12h6M12 9v6" /></svg>,
  notifications: <svg aria-hidden="true" viewBox="0 0 24 24" className={`${iconClassName} fill-none stroke-current`} strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path strokeLinecap="round" d="M10 20h4" /></svg>,
  profile: <svg aria-hidden="true" viewBox="0 0 24 24" className={`${iconClassName} fill-none stroke-current`} strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" /></svg>,
};

export const navigationItems: readonly NavigationItem[] = navigationDefinitions.map(withIcon);

export function getNavigationItems(surface: NavigationSurface, user?: CurrentUser) {
  return getNavigationDefinitions(surface, user).map(withIcon);
}

function withIcon(item: NavigationDefinition): NavigationItem {
  return { ...item, iconElement: navigationIcons[item.icon] };
}

export { isNavigationPathActive };
