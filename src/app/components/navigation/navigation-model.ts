import type { CurrentUser } from "../../lib/auth-types.ts";
import { canViewLearnerProgress, canViewPersonalProgress } from "../../lib/authorization.ts";

export type NavigationSurface = "desktop" | "mobile";
export type NavigationSection = "primary" | "role";
export type NavigationAudience = "all" | "authenticated" | "learner" | "learner-progress" | "personal-progress";
export type NavigationIconName =
  | "dashboard"
  | "learning"
  | "labs"
  | "quiz"
  | "challenges"
  | "progress"
  | "learning-plan"
  | "teams"
  | "trainer"
  | "notifications"
  | "profile";

export type NavigationDefinition = {
  href: string;
  label: string;
  icon: NavigationIconName;
  section: NavigationSection;
  audience: NavigationAudience;
  surfaces: readonly NavigationSurface[];
  badge?: "notifications";
};

const bothSurfaces = ["desktop", "mobile"] as const;

export const navigationDefinitions: readonly NavigationDefinition[] = [
  { href: "/", label: "Dashboard", icon: "dashboard", section: "primary", audience: "all", surfaces: bothSurfaces },
  { href: "/lernen", label: "Lernen", icon: "learning", section: "primary", audience: "all", surfaces: bothSurfaces },
  { href: "/labs", label: "Labs", icon: "labs", section: "primary", audience: "all", surfaces: bothSurfaces },
  { href: "/quiz", label: "Quiz", icon: "quiz", section: "primary", audience: "all", surfaces: bothSurfaces },
  { href: "/challenges", label: "Challenges", icon: "challenges", section: "primary", audience: "all", surfaces: bothSurfaces },
  { href: "/fortschritt", label: "Fortschritt", icon: "progress", section: "primary", audience: "personal-progress", surfaces: bothSurfaces },
  { href: "/teams", label: "Teams", icon: "teams", section: "primary", audience: "authenticated", surfaces: bothSurfaces },
  { href: "/lernplan", label: "Lernplan", icon: "learning-plan", section: "role", audience: "learner", surfaces: bothSurfaces },
  { href: "/admin", label: "Trainerbereich", icon: "trainer", section: "role", audience: "learner-progress", surfaces: bothSurfaces },
  { href: "/benachrichtigungen", label: "Benachrichtigungen", icon: "notifications", section: "primary", audience: "authenticated", surfaces: bothSurfaces, badge: "notifications" },
  { href: "/profil", label: "Profil", icon: "profile", section: "primary", audience: "authenticated", surfaces: ["mobile"] },
];

export function getNavigationDefinitions(surface: NavigationSurface, user?: CurrentUser) {
  if (surface === "mobile" && (!user || user.mustChangePassword)) return [];

  return navigationDefinitions.filter((item) => (
    item.surfaces.includes(surface) && canAccessNavigationItem(item.audience, user)
  ));
}

export function isNavigationPathActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function canAccessNavigationItem(audience: NavigationAudience, user?: CurrentUser) {
  if (audience === "all") return true;
  if (!user || user.mustChangePassword && audience === "authenticated") return false;
  if (audience === "authenticated") return true;
  if (audience === "learner") return user.role === "learner";
  if (audience === "personal-progress") return canViewPersonalProgress(user.role);
  return canViewLearnerProgress(user.role);
}
