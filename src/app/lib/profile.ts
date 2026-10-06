import { learningModules } from "../data/learning-modules.ts";
import { quizzes } from "../data/quizzes.ts";
import { getAccountInitials } from "./account-presentation.ts";
import { hasCapability } from "./authorization.ts";
import { ACCOUNT_ROLE_LABELS, type AccountRole } from "./auth-types.ts";
import {
  getModuleProgress,
  getOverallProgress,
  type LearnerProgressState,
} from "./learner-progress.ts";
import type { LevelProgress } from "./xp-domain.ts";
import type { LearnerRewardState } from "./progression-rewards.ts";

export type PrivateProfileAccount = {
  displayName: string;
  login: string;
  role: AccountRole;
  roleLabel: string;
  status: "active";
  statusLabel: "Aktiv";
  createdAt: Date;
  initials: string;
  context: string;
};

export type ProfileQuickLink = {
  href: string;
  label: string;
  description: string;
};

export type LearnerProfileSummary = {
  xp: LevelProgress;
  completedLessons: number;
  totalLessons: number;
  completedModules: number;
  totalModules: number;
  overallPercentage: number;
};

export type ProfileAvatarView = {
  src?: string;
};

export type ShellProfileView = {
  avatar: ProfileAvatarView;
  roleLabel: string;
  activeTitle?: string;
  xp?: LevelProgress;
  nextMilestones?: LearnerRewardState["nextMilestones"];
};

export type LearnerProfileRewards = LearnerRewardState;

export const getProfileInitials = getAccountInitials;
export function getProfileXpRingPercentage(progress: LevelProgress) {
  return Math.max(0, Math.min(100, progress.progressPercentage));
}


export function buildPrivateProfileAccount(input: {
  displayName: string;
  login: string;
  role: AccountRole;
  createdAt: Date;
}): PrivateProfileAccount {
  return {
    displayName: input.displayName,
    login: input.login,
    role: input.role,
    roleLabel: ACCOUNT_ROLE_LABELS[input.role],
    status: "active",
    statusLabel: "Aktiv",
    createdAt: input.createdAt,
    initials: getProfileInitials(input.displayName),
    context: getAccountContext(input.role),
  };
}

export function buildLearnerProfileSummary(
  state: LearnerProgressState,
  xp: LevelProgress,
): LearnerProfileSummary {
  const quizModuleSlugs = new Set(quizzes.map((quiz) => quiz.moduleSlug));
  const modules = learningModules.map((learningModule) => (
    getModuleProgress(state, learningModule, quizModuleSlugs.has(learningModule.slug))
  ));
  const overall = getOverallProgress(state, learningModules, quizModuleSlugs);
  return {
    xp,
    completedLessons: modules.reduce((total, module) => total + module.completedLessons, 0),
    totalLessons: modules.reduce((total, module) => total + module.totalLessons, 0),
    completedModules: overall.completedModules,
    totalModules: modules.length,
    overallPercentage: overall.percentage,
  };
}

export function getProfileQuickLinks(role: AccountRole): readonly ProfileQuickLink[] {
  if (role === "learner") {
    return [
      { href: "/fortschritt", label: "Fortschritt", description: "Deinen ausführlichen Lernstand ansehen" },
      { href: "/lernen", label: "Lernmodule", description: "Mit einer Lektion weitermachen" },
      { href: "/labs", label: "Troubleshooting-Labs", description: "Simulierte Netzwerk- und Systemfehler untersuchen" },
      { href: "/challenges", label: "Challenges", description: "Deine Praxisaufgaben öffnen" },
      { href: "/quiz", label: "Übungsquiz", description: "Wissen mit Fragen trainieren" },
      { href: "/benachrichtigungen", label: "Benachrichtigungen", description: "Posteingang und Push-Einstellungen verwalten" },
    ];
  }
  if (hasCapability(role, "readOnlyPlatformPreview")) {
    return [
      { href: "/lernen", label: "Lernmodule", description: "Alle Lektionen in der Vorschau ansehen" },
      { href: "/labs", label: "Labs in Vorschau", description: "Alle Szenarien ohne Lernendenfortschritt testen" },
      { href: "/quiz", label: "Quiz-Vorschau", description: "Quiz und IHK-Simulation ohne Versuchshistorie testen" },
      { href: "/challenges", label: "Challenge-Katalog", description: "Veröffentlichte Aufgaben schreibgeschützt ansehen" },
      { href: "/benachrichtigungen", label: "Benachrichtigungen", description: "Eigenen Posteingang und Push-Einstellungen verwalten" },
    ];
  }

  const links: ProfileQuickLink[] = [];
  links.push({ href: "/labs", label: "Labs in Vorschau", description: "Szenarien ohne Lernendenfortschritt testen" });
  if (hasCapability(role, "viewLearnerProgress")) {
    links.push(
      { href: "/admin", label: "Trainerbereich", description: "Operative Übersicht öffnen" },
      { href: "/admin/lerninhalte", label: "Lerninhalte", description: "Lernfortschritt auswerten" },
    );
  }
  if (hasCapability(role, "manageChallenges")) {
    links.push({ href: "/admin/challenges", label: "Challenges verwalten", description: "Aufgaben und Reviews bearbeiten" });
  }
  if (hasCapability(role, "manageUsers")) {
    links.push({ href: "/admin/konten", label: "Konten und Rollen", description: "Konten administrieren" });
  }
  links.push({ href: "/benachrichtigungen", label: "Benachrichtigungen", description: "Posteingang und Push-Einstellungen verwalten" });
  return links;
}

function getAccountContext(role: AccountRole) {
  if (role === "learner") return "Dein privates Lernprofil und dein persönlicher Lernstand.";
  if (role === "observer") return "Dein privates Betrachterkonto für die schreibgeschützte Plattformvorschau.";
  if (role === "instructor") return "Dein privates Werkstattleiterkonto für Betreuung und Auswertung.";
  return "Dein privates Administrationskonto für Azubi Lab.";
}
