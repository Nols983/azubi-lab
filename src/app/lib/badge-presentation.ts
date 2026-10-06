import { BADGE_TIER_LABELS, type RewardCollectionItem } from "./progression-rewards.ts";

export type BadgeThemeKey =
  | "general"
  | "quiz"
  | "labs"
  | "network"
  | "services"
  | "rhythm-morning"
  | "rhythm-day"
  | "rhythm-evening"
  | "rhythm-night"
  | "rhythm"
  | "fallback";

export type BadgeVisualTheme = {
  key: BadgeThemeKey;
  label: string;
  frameClass: string;
  surfaceClass: string;
  emblemClass: string;
};

export type BadgeClassPresentation = {
  label: string;
  cardClass: string;
  emblemClass: string;
  accentClass: string;
};

const categoryThemes: Readonly<Record<string, BadgeVisualTheme>> = Object.freeze({
  allgemein: theme("general", "Allgemein", "border-slate-300 dark:border-slate-600", "bg-gradient-to-br from-white to-slate-100 dark:from-slate-900 dark:to-slate-800", "bg-slate-800 text-white ring-slate-300 dark:bg-slate-200 dark:text-slate-950 dark:ring-slate-600"),
  quiz: theme("quiz", "Quiz", "border-violet-300 dark:border-violet-700", "bg-gradient-to-br from-white to-violet-100 dark:from-slate-900 dark:to-violet-950", "bg-violet-800 text-white ring-violet-300 dark:bg-violet-300 dark:text-violet-950 dark:ring-violet-700"),
  labs: theme("labs", "Labs", "border-amber-300 dark:border-amber-700", "bg-gradient-to-br from-white to-amber-100 dark:from-slate-900 dark:to-amber-950", "bg-amber-700 text-white ring-amber-300 dark:bg-amber-300 dark:text-amber-950 dark:ring-amber-700"),
  netzwerk: theme("network", "Netzwerk", "border-cyan-300 dark:border-cyan-700", "bg-gradient-to-br from-white to-cyan-100 dark:from-slate-900 dark:to-cyan-950", "bg-cyan-800 text-white ring-cyan-300 dark:bg-cyan-300 dark:text-cyan-950 dark:ring-cyan-700"),
  "server-dienste": theme("services", "Server & Dienste", "border-emerald-300 dark:border-emerald-700", "bg-gradient-to-br from-white to-emerald-100 dark:from-slate-900 dark:to-emerald-950", "bg-emerald-800 text-white ring-emerald-300 dark:bg-emerald-300 dark:text-emerald-950 dark:ring-emerald-700"),
  lernrhythmus: theme("rhythm", "Lernrhythmus", "border-indigo-300 dark:border-indigo-700", "bg-gradient-to-br from-white to-indigo-100 dark:from-slate-900 dark:to-indigo-950", "bg-indigo-800 text-white ring-indigo-300 dark:bg-indigo-300 dark:text-indigo-950 dark:ring-indigo-700"),
});

const rhythmThemes: Readonly<Record<string, BadgeVisualTheme>> = Object.freeze({
  "badge-fruehstarter": theme("rhythm-morning", "Lernrhythmus · Morgen", "border-amber-300 dark:border-amber-700", "bg-gradient-to-br from-amber-50 to-sky-100 dark:from-amber-950 dark:to-sky-950", "bg-amber-500 text-slate-950 ring-amber-200 dark:ring-amber-700"),
  "badge-tagesform": theme("rhythm-day", "Lernrhythmus · Tag", "border-sky-300 dark:border-sky-700", "bg-gradient-to-br from-sky-50 to-cyan-100 dark:from-sky-950 dark:to-cyan-950", "bg-sky-700 text-white ring-sky-300 dark:bg-sky-300 dark:text-sky-950 dark:ring-sky-700"),
  "badge-feierabend-fokus": theme("rhythm-evening", "Lernrhythmus · Abend", "border-orange-300 dark:border-orange-700", "bg-gradient-to-br from-orange-50 to-fuchsia-100 dark:from-orange-950 dark:to-fuchsia-950", "bg-orange-700 text-white ring-orange-300 dark:bg-orange-300 dark:text-orange-950 dark:ring-orange-700"),
  "badge-nachteule": theme("rhythm-night", "Lernrhythmus · Nacht", "border-indigo-400 dark:border-indigo-600", "bg-gradient-to-br from-indigo-100 to-slate-200 dark:from-indigo-950 dark:to-slate-900", "bg-indigo-950 text-white ring-indigo-400 dark:bg-indigo-300 dark:text-indigo-950 dark:ring-indigo-600"),
});

const fallbackTheme = theme("fallback", "Abzeichen", "border-slate-300 dark:border-slate-600", "bg-white dark:bg-slate-900", "bg-blue-950 text-white ring-slate-300 dark:bg-blue-200 dark:text-blue-950 dark:ring-slate-600");

const classPresentations = Object.freeze({
  bronze: {
    label: BADGE_TIER_LABELS.bronze,
    cardClass: "border-2 shadow-sm ring-1 ring-orange-200 dark:ring-orange-900",
    emblemClass: "outline outline-2 outline-offset-2 outline-orange-400 dark:outline-orange-500",
    accentClass: "border-orange-500 bg-orange-100 text-orange-950 dark:border-orange-400 dark:bg-orange-950 dark:text-orange-100",
  },
  silver: {
    label: BADGE_TIER_LABELS.silver,
    cardClass: "border-2 shadow-sm ring-1 ring-slate-300 dark:ring-slate-600",
    emblemClass: "outline outline-2 outline-offset-2 outline-slate-400 dark:outline-slate-500",
    accentClass: "border-slate-500 bg-slate-100 text-slate-900 dark:border-slate-400 dark:bg-slate-800 dark:text-slate-100",
  },
  gold: {
    label: BADGE_TIER_LABELS.gold,
    cardClass: "border-2 shadow-md ring-2 ring-amber-300 dark:ring-amber-700",
    emblemClass: "outline outline-2 outline-offset-2 outline-amber-500 dark:outline-amber-400",
    accentClass: "border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-100",
  },
  unique: {
    label: "Einzigartig",
    cardClass: "shadow-sm",
    emblemClass: "",
    accentClass: "border-blue-400 bg-blue-50 text-blue-950 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-100",
  },
  prestige: {
    label: "Prestige",
    cardClass: "border-2 shadow-lg ring-2 ring-violet-300 dark:ring-violet-700",
    emblemClass: "outline outline-2 outline-offset-2 outline-violet-500 dark:outline-violet-400",
    accentClass: "border-violet-500 bg-violet-950 text-white dark:border-violet-400 dark:bg-violet-200 dark:text-violet-950",
  },
} satisfies Readonly<Record<"bronze" | "silver" | "gold" | "unique" | "prestige", BadgeClassPresentation>>);

const BADGE_ARTWORK_IDS = new Set([
  "badge-erste-schritte",
  "badge-wissenssammler",
  "badge-lernprofi",
  "badge-quiz-profi",
  "badge-quiz-experte",
  "badge-quiz-meister",
  "badge-lab-einsteiger",
  "badge-lab-erfahren",
  "badge-lab-profi",
  "badge-ohne-hilfe",
  "badge-eigenstaendig",
  "badge-selbststaendig",
  "badge-netzwerk-fundament",
  "badge-backup-waechter",
  "badge-multi-fault",
  "badge-lab-meister",
  "badge-querbeet",
  "badge-fuenferpack",
  "badge-quizmarathon",
  "badge-halbzeit",
  "badge-langstrecke",
  "badge-ausdauer",
  "badge-rund-um-die-uhr",
  "badge-systemmeister",
  "badge-perfektionist",
  "badge-allrounder",
  "badge-fruehstarter",
  "badge-tagesform",
  "badge-feierabend-fokus",
  "badge-nachteule",
] as const);

export function getBadgeArtworkPath(
  item: Pick<RewardCollectionItem, "id">,
): string | undefined {
  return BADGE_ARTWORK_IDS.has(item.id as never)
    ? `/badges/${item.id}.png`
    : undefined;
}

export function getBadgeVisualTheme(item: Pick<RewardCollectionItem, "id" | "category">): BadgeVisualTheme {
  return rhythmThemes[item.id] ?? categoryThemes[item.category] ?? fallbackTheme;
}

export function getBadgeClassPresentation(item: Pick<RewardCollectionItem, "visualClass" | "tier">): BadgeClassPresentation {
  if (item.visualClass === "tiered") return classPresentations[item.tier ?? "bronze"];
  return classPresentations[item.visualClass ?? "unique"];
}

function theme(
  key: BadgeThemeKey,
  label: string,
  frameClass: string,
  surfaceClass: string,
  emblemClass: string,
): BadgeVisualTheme {
  return { key, label, frameClass, surfaceClass, emblemClass };
}
