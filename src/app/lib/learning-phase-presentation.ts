import type { LearningPathPhase } from "../data/learning-path-phases.ts";

export type LearningPhaseId = LearningPathPhase["id"];
export type LearningPhaseIconName = "workstation" | "network" | "server" | "shield" | "roadmap";

export type LearningPhasePresentation = {
  accentLabel: string;
  icon: LearningPhaseIconName;
  progressTone: "blue" | "teal" | "violet" | "amber" | "emerald";
  sectionClassName: string;
  eyebrowClassName: string;
  iconClassName: string;
  cardBorderClassName: string;
  cardAccentClassName: string;
};

export const learningPhasePresentations: Readonly<Record<LearningPhaseId, LearningPhasePresentation>> = {
  "it-grundlagen-arbeitsplatz": {
    accentLabel: "Blau",
    icon: "workstation",
    progressTone: "blue",
    sectionClassName: "border-blue-200 bg-blue-50/55",
    eyebrowClassName: "text-blue-800",
    iconClassName: "bg-blue-950 text-blue-50",
    cardBorderClassName: "border-blue-200 hover:border-blue-300",
    cardAccentClassName: "bg-blue-600",
  },
  netzwerke: {
    accentLabel: "Türkis",
    icon: "network",
    progressTone: "teal",
    sectionClassName: "border-teal-200 bg-teal-50/55",
    eyebrowClassName: "text-teal-800",
    iconClassName: "bg-teal-900 text-teal-50",
    cardBorderClassName: "border-teal-200 hover:border-teal-300",
    cardAccentClassName: "bg-teal-600",
  },
  "systeme-storage-betrieb": {
    accentLabel: "Violett",
    icon: "server",
    progressTone: "violet",
    sectionClassName: "border-violet-200 bg-violet-50/55",
    eyebrowClassName: "text-violet-800",
    iconClassName: "bg-violet-900 text-violet-50",
    cardBorderClassName: "border-violet-200 hover:border-violet-300",
    cardAccentClassName: "bg-violet-600",
  },
  "sicherheit-datenschutz": {
    accentLabel: "Orange",
    icon: "shield",
    progressTone: "amber",
    sectionClassName: "border-amber-200 bg-amber-50/60",
    eyebrowClassName: "text-amber-900",
    iconClassName: "bg-amber-900 text-amber-50",
    cardBorderClassName: "border-amber-200 hover:border-amber-300",
    cardAccentClassName: "bg-amber-600",
  },
  "entwicklung-planung-wirtschaft": {
    accentLabel: "Grün",
    icon: "roadmap",
    progressTone: "emerald",
    sectionClassName: "border-emerald-200 bg-emerald-50/55",
    eyebrowClassName: "text-emerald-800",
    iconClassName: "bg-emerald-900 text-emerald-50",
    cardBorderClassName: "border-emerald-200 hover:border-emerald-300",
    cardAccentClassName: "bg-emerald-600",
  },
};

export function getLearningPhasePresentation(id: LearningPhaseId) {
  return learningPhasePresentations[id];
}
