import { deriveLevelProgress, type LevelProgress } from "./xp-domain.ts";
import { canSelectAnyProfileBadge, canSelectAnyProfileTitle } from "./authorization.ts";
import type { AccountRole } from "./auth-types.ts";
import { TIME_ACHIEVEMENT_BADGE_IDS, type TimeAchievementBadgeId } from "./time-achievements.ts";

export const LAB_BASE_XP = 75;
export const LAB_HINT_DEDUCTION_XP = 25;
export const MAX_PINNED_BADGES = 3;
export const MAX_NEXT_MILESTONES = 3;

export const BADGE_VISUAL_CLASSES = ["tiered", "unique", "prestige"] as const;
export type BadgeVisualClass = (typeof BADGE_VISUAL_CLASSES)[number];
export const BADGE_TIERS = ["bronze", "silver", "gold"] as const;
export type BadgeTier = (typeof BADGE_TIERS)[number];
export const BADGE_TIER_LABELS: Readonly<Record<BadgeTier, string>> = Object.freeze({
  bronze: "Bronze",
  silver: "Silber",
  gold: "Gold",
});
export const BADGE_FAMILIES = Object.freeze({
  modules: { label: "Modulfortschritt", order: 0 },
  "perfect-quizzes": { label: "Perfekte Abschlussquizze", order: 1 },
  labs: { label: "Lab-Fortschritt", order: 2 },
  "independent-labs": { label: "Labs ohne Hinweise", order: 3 },
});
export type BadgeFamilyId = keyof typeof BADGE_FAMILIES;

// Fixed at the Batch-28.2 baseline. Future curriculum additions must not alter
// the Systemmeister or Perfektionist requirements retroactively.
export const BATCH_28_2_MODULE_IDS = Object.freeze([
  "ipv4-grundlagen",
  "subnetting",
  "dhcp",
  "dns",
  "osi-tcp-ip-modell",
  "netzwerk-koppelelemente",
  "netzwerktopologien",
  "linux-grundlagen",
  "arbeitsplatz-hardware",
  "windows-grundlagen",
  "webserver-grundlagen",
  "active-directory-grundlagen",
  "backup-datensicherung",
  "storage-und-raid",
  "it-sicherheit",
  "datenschutz",
  "netzwerkfehler-systematisch-analysieren",
  "programmierung-und-pseudocode",
  "uml-und-datenmodellierung",
  "projektmanagement",
  "wirtschaftlichkeit-und-beschaffung",
  "software-und-lizenzierung",
  "virtualisierung-und-cloud",
  "kundenauftrag-kommunikation-und-vertraege",
  "qualitaetssicherung-und-uebergabe",
] as const);

export const BATCH_28_2_PHASE_MODULE_IDS = Object.freeze([
  ["arbeitsplatz-hardware", "windows-grundlagen", "linux-grundlagen"],
  ["osi-tcp-ip-modell", "netzwerk-koppelelemente", "netzwerktopologien", "ipv4-grundlagen", "subnetting", "dhcp", "dns"],
  ["webserver-grundlagen", "active-directory-grundlagen", "virtualisierung-und-cloud", "storage-und-raid", "backup-datensicherung", "netzwerkfehler-systematisch-analysieren"],
  ["it-sicherheit", "datenschutz"],
  ["programmierung-und-pseudocode", "uml-und-datenmodellierung", "projektmanagement", "wirtschaftlichkeit-und-beschaffung", "software-und-lizenzierung", "kundenauftrag-kommunikation-und-vertraege", "qualitaetssicherung-und-uebergabe"],
] as const);

export const BADGE_CATEGORIES = ["allgemein", "quiz", "labs", "lernrhythmus", "netzwerk", "server-dienste"] as const;
export type BadgeCategory = (typeof BADGE_CATEGORIES)[number];
export const BADGE_CATEGORY_LABELS: Readonly<Record<BadgeCategory, string>> = Object.freeze({
  allgemein: "Allgemein",
  quiz: "Quiz",
  labs: "Labs",
  lernrhythmus: "Lernrhythmus",
  netzwerk: "Netzwerk",
  "server-dienste": "Server & Dienste",
});
export type RewardProgress = { current: number; target: number; ratio: number };
export type RewardCategory = BadgeCategory | "level";

export const NETWORK_FOUNDATION_MODULE_IDS = [
  "ipv4-grundlagen",
  "subnetting",
  "dhcp",
  "dns",
] as const;

export const MULTI_FAULT_LAB_IDS = [
  "client-multifault-001",
  "vlan-firewall-multifault-001",
] as const;

export type RewardEvidence = {
  completedModuleIds: readonly string[];
  perfectQuizModuleIds: readonly string[];
  completedNormalLabIds: readonly string[];
  zeroHintNormalLabIds: readonly string[];
  normalLabCount: number;
  unlockedTimeAchievementIds?: readonly TimeAchievementBadgeId[];
  canonicalLessonCompletionIds?: readonly string[];
  canonicalModuleCompletionIds?: readonly string[];
  canonicalQuizCompletionIds?: readonly string[];
  canonicalLearningDateCount?: number;
};

export type RewardDefinition = {
  id: string;
  displayName: string;
  description: string;
  unlockCondition: string;
  category: RewardCategory;
  getProgress?: (evidence: RewardEvidence, level: LevelProgress) => { current: number; target: number };
  milestone: { group: string; priority: number; destination: string };
};

export type LevelTitleDefinition = RewardDefinition & {
  type: "level";
  requiredLevel: number;
};

export type AchievementTitleDefinition = RewardDefinition & {
  type: "achievement";
  isUnlocked: (evidence: RewardEvidence) => boolean;
};

export type TitleDefinition = LevelTitleDefinition | AchievementTitleDefinition;

export type BadgeDefinition = RewardDefinition & {
  isUnlocked: (evidence: RewardEvidence) => boolean;
  category: BadgeCategory;
  visual: string;
  visualClass: BadgeVisualClass;
  familyId?: BadgeFamilyId;
  tier?: BadgeTier;
};

export type RewardCollectionItem = Omit<RewardDefinition, "description" | "getProgress" | "milestone"> & {
  description: string;
  unlocked: boolean;
  type?: TitleDefinition["type"];
  visual?: string;
  visualClass?: BadgeVisualClass;
  familyId?: BadgeFamilyId;
  tier?: BadgeTier;
  progress?: RewardProgress;
  unlockedAt?: string;
  milestoneGroup: string;
  milestonePriority: number;
  destination: string;
};

export type NextMilestone = {
  rewardId: string;
  displayName: string;
  description: string;
  current: number;
  target: number;
  ratio: number;
  type: "badge" | "title";
  category: string;
  destination: string;
};

export type LearnerRewardState = {
  level: LevelProgress;
  titles: readonly RewardCollectionItem[];
  badges: readonly RewardCollectionItem[];
  activeTitle?: RewardCollectionItem;
  pinnedBadges: readonly RewardCollectionItem[];
  nextMilestones: readonly NextMilestone[];
};

export type ProfileTitleItem = Omit<RewardCollectionItem, "unlocked"> & {
  selectable: boolean;
};

export type ProfileTitleState = {
  access: "learner" | "staff";
  titles: readonly ProfileTitleItem[];
  activeTitle?: ProfileTitleItem;
};

export type ProfileBadgeItem = RewardCollectionItem & {
  selectable: boolean;
  access: "earned" | "staff";
};

export type ProfileBadgeState = {
  access: "learner" | "staff";
  badges: readonly ProfileBadgeItem[];
  pinnedBadges: readonly ProfileBadgeItem[];
};

type CatalogMetadata = {
  category: RewardCategory;
  visual?: string;
  visualClass?: BadgeVisualClass;
  familyId?: BadgeFamilyId;
  tier?: BadgeTier;
  summary: string;
  measure?: (evidence: RewardEvidence) => { current: number; target: number };
  group: string;
  priority: number;
  destination: string;
};

const CATALOG_METADATA: Readonly<Record<string, CatalogMetadata>> = Object.freeze({
  "achievement-dns-debugger": {
    category: "netzwerk", summary: "Auszeichnung für einen vollständig bearbeiteten DNS-Lernpfad.",
    measure: (evidence) => booleanProgress(includes(evidence.completedModuleIds, "dns")),
    group: "module-dns", priority: 0, destination: "/profil#title-collection-heading",
  },
  "achievement-subnetting-spezialist": {
    category: "netzwerk", summary: "Auszeichnung für einen vollständig bearbeiteten Subnetting-Lernpfad.",
    measure: (evidence) => booleanProgress(includes(evidence.completedModuleIds, "subnetting")),
    group: "module-subnetting", priority: 0, destination: "/profil#title-collection-heading",
  },
  "achievement-backup-waechter": {
    category: "server-dienste", summary: "Auszeichnung für den vollständigen Backup-&-Datensicherungs-Lernpfad.",
    measure: (evidence) => booleanProgress(includes(evidence.completedModuleIds, "backup-datensicherung")),
    group: "module-backup", priority: 0, destination: "/profil#title-collection-heading",
  },
  "achievement-lab-retter": {
    category: "labs", summary: "Titel für verlässlich gelöste Troubleshooting-Szenarien.",
    measure: (evidence) => countProgress(evidence.completedNormalLabIds.length, 10),
    group: "labs-completed-10", priority: 0, destination: "/profil#title-collection-heading",
  },
  "achievement-packet-whisperer": {
    category: "labs", summary: "Titel für eigenständig gelöste Troubleshooting-Szenarien.",
    measure: (evidence) => countProgress(evidence.zeroHintNormalLabIds.length, 10),
    group: "labs-no-hint-10", priority: 0, destination: "/profil#title-collection-heading",
  },
  "achievement-fehlerjaeger": {
    category: "labs", summary: "Titel für die beiden komplexen Multi-Fault-Szenarien.",
    measure: (evidence) => countProgress(countIncluded(evidence.completedNormalLabIds, MULTI_FAULT_LAB_IDS), MULTI_FAULT_LAB_IDS.length),
    group: "labs-multi-fault", priority: 0, destination: "/profil#title-collection-heading",
  },
  "badge-erste-schritte": {
    category: "allgemein", visual: "01", visualClass: "tiered", familyId: "modules", tier: "bronze",
    summary: "Der Einstieg in den Modulfortschritt.",
    measure: (evidence) => countProgress(countUnique(evidence.completedModuleIds), 1),
    group: "family-modules", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-wissenssammler": {
    category: "allgemein", visual: "10M", visualClass: "tiered", familyId: "modules", tier: "silver",
    summary: "Fortgeschrittener Modulfortschritt.",
    measure: (evidence) => countProgress(countUnique(evidence.completedModuleIds), 10),
    group: "family-modules", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-lernprofi": {
    category: "allgemein", visual: "20M", visualClass: "tiered", familyId: "modules", tier: "gold",
    summary: "Umfassender Modulfortschritt.",
    measure: (evidence) => countProgress(countUnique(evidence.completedModuleIds), 20),
    group: "family-modules", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-quiz-profi": {
    category: "quiz", visual: "100", visualClass: "tiered", familyId: "perfect-quizzes", tier: "bronze",
    summary: "Der Einstieg in perfekte Abschlussquizze.",
    measure: (evidence) => countProgress(countUnique(evidence.perfectQuizModuleIds), 1),
    group: "family-perfect-quizzes", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-quiz-experte": {
    category: "quiz", visual: "5×", visualClass: "tiered", familyId: "perfect-quizzes", tier: "silver",
    summary: "Fortgeschrittene Sicherheit in Abschlussquizzen.",
    measure: (evidence) => countProgress(countUnique(evidence.perfectQuizModuleIds), 5),
    group: "family-perfect-quizzes", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-quiz-meister": {
    category: "quiz", visual: "15×", visualClass: "tiered", familyId: "perfect-quizzes", tier: "gold",
    summary: "Umfassende Sicherheit in Abschlussquizzen.",
    measure: (evidence) => countProgress(countUnique(evidence.perfectQuizModuleIds), 15),
    group: "family-perfect-quizzes", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-lab-einsteiger": {
    category: "labs", visual: "LAB", visualClass: "tiered", familyId: "labs", tier: "bronze",
    summary: "Der Einstieg in die Troubleshooting-Labs.",
    measure: (evidence) => countProgress(countUnique(evidence.completedNormalLabIds), 1),
    group: "family-labs", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-lab-erfahren": {
    category: "labs", visual: "L5", visualClass: "tiered", familyId: "labs", tier: "silver",
    summary: "Fortgeschrittene Lab-Erfahrung.",
    measure: (evidence) => countProgress(countUnique(evidence.completedNormalLabIds), 5),
    group: "family-labs", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-lab-profi": {
    category: "labs", visual: "L10", visualClass: "tiered", familyId: "labs", tier: "gold",
    summary: "Umfassende Lab-Erfahrung.",
    measure: (evidence) => countProgress(countUnique(evidence.completedNormalLabIds), 10),
    group: "family-labs", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-ohne-hilfe": {
    category: "labs", visual: "0H", visualClass: "tiered", familyId: "independent-labs", tier: "bronze",
    summary: "Eigenständige Lösungen ohne Hinweise.",
    measure: (evidence) => countProgress(countUnique(evidence.zeroHintNormalLabIds), 5),
    group: "family-independent-labs", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-eigenstaendig": {
    category: "labs", visual: "10H", visualClass: "tiered", familyId: "independent-labs", tier: "silver",
    summary: "Dauerhaft eigenständige Lösungen ohne Hinweise.",
    measure: (evidence) => countProgress(countUnique(evidence.zeroHintNormalLabIds), 10),
    group: "family-independent-labs", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-selbststaendig": {
    category: "labs", visual: "15H", visualClass: "tiered", familyId: "independent-labs", tier: "gold",
    summary: "Umfassend eigenständige Lösungen ohne Hinweise.",
    measure: (evidence) => countProgress(countUnique(evidence.zeroHintNormalLabIds), 15),
    group: "family-independent-labs", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-netzwerk-fundament": {
    category: "netzwerk", visual: "NW", visualClass: "unique", summary: "Die vier grundlegenden Netzwerkmodule.",
    measure: (evidence) => countProgress(countIncluded(evidence.completedModuleIds, NETWORK_FOUNDATION_MODULE_IDS), NETWORK_FOUNDATION_MODULE_IDS.length),
    group: "network-foundation", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-backup-waechter": {
    category: "server-dienste", visual: "SD", visualClass: "unique", summary: "Backup- und Datensicherungswissen.",
    measure: (evidence) => booleanProgress(includes(evidence.completedModuleIds, "backup-datensicherung")),
    group: "module-backup", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-multi-fault": {
    category: "labs", visual: "MF", visualClass: "unique", summary: "Mehrschichtige Fehlersuche.",
    measure: (evidence) => countProgress(countIncluded(evidence.completedNormalLabIds, MULTI_FAULT_LAB_IDS), MULTI_FAULT_LAB_IDS.length),
    group: "labs-multi-fault", priority: 1, destination: "/profil#badge-collection-heading",
  },
  "badge-lab-meister": {
    category: "labs", visual: "LM", visualClass: "prestige", summary: "Der vollständige normale Lab-Katalog.",
    measure: (evidence) => countProgress(countUnique(evidence.completedNormalLabIds), Math.max(1, evidence.normalLabCount)),
    group: "labs-all", priority: 2, destination: "/profil#badge-collection-heading",
  },
  "badge-querbeet": {
    category: "allgemein", visual: "QB", visualClass: "unique", summary: "Lernbreite über mehrere Module hinweg.",
    measure: (evidence) => countProgress(countLessonModules(evidence.canonicalLessonCompletionIds ?? []), 5),
    group: "lesson-module-breadth-5", priority: 2, destination: "/profil#badge-collection-heading",
  },
  "badge-fuenferpack": {
    category: "allgemein", visual: "5M", visualClass: "unique", summary: "Fünf vollständig abgeschlossene Lernmodule.",
    measure: (evidence) => countProgress(countUnique(evidence.canonicalModuleCompletionIds ?? []), 5),
    group: "canonical-modules-5", priority: 2, destination: "/profil#badge-collection-heading",
  },
  "badge-quizmarathon": {
    category: "quiz", visual: "Q10", visualClass: "unique", summary: "Zehn unterschiedliche abgeschlossene Modulquizze.",
    measure: (evidence) => countProgress(countUnique(evidence.canonicalQuizCompletionIds ?? []), 10),
    group: "canonical-quizzes-10", priority: 2, destination: "/profil#badge-collection-heading",
  },
  "badge-halbzeit": {
    category: "allgemein", visual: "13", visualClass: "unique", summary: "Dreizehn vollständig abgeschlossene Lernmodule.",
    measure: (evidence) => countProgress(countUnique(evidence.canonicalModuleCompletionIds ?? []), 13),
    group: "canonical-modules-13", priority: 2, destination: "/profil#badge-collection-heading",
  },
  "badge-langstrecke": {
    category: "allgemein", visual: "100L", visualClass: "prestige", summary: "Einhundert unterschiedliche abgeschlossene Lektionen.",
    measure: (evidence) => countProgress(countUnique(evidence.canonicalLessonCompletionIds ?? []), 100),
    group: "canonical-lessons-100", priority: 3, destination: "/profil#badge-collection-heading",
  },
  "badge-ausdauer": {
    category: "lernrhythmus", visual: "30T", visualClass: "prestige", summary: "Lernen an dreißig unterschiedlichen Kalendertagen.",
    measure: (evidence) => countProgress(evidence.canonicalLearningDateCount ?? 0, 30),
    group: "canonical-learning-days-30", priority: 3, destination: "/profil#badge-collection-heading",
  },
  "badge-rund-um-die-uhr": {
    category: "lernrhythmus", visual: "24H", visualClass: "prestige", summary: "Alle vier Tageszeit-Abzeichen.",
    measure: (evidence) => countProgress(countIncluded(evidence.unlockedTimeAchievementIds ?? [], Object.values(TIME_ACHIEVEMENT_BADGE_IDS)), 4),
    group: "all-time-achievements", priority: 3, destination: "/profil#badge-collection-heading",
  },
  "badge-systemmeister": {
    category: "server-dienste", visual: "SYS", visualClass: "prestige", summary: "Abschluss aller 25 Module.",
    measure: (evidence) => countProgress(countIncluded(evidence.canonicalModuleCompletionIds ?? [], BATCH_28_2_MODULE_IDS), BATCH_28_2_MODULE_IDS.length),
    group: "batch-28-2-modules", priority: 3, destination: "/profil#badge-collection-heading",
  },
  "badge-perfektionist": {
    category: "quiz", visual: "25Q", visualClass: "prestige", summary: "Abschluss aller 25 Abschlussquizze.",
    measure: (evidence) => countProgress(countIncluded(evidence.canonicalQuizCompletionIds ?? [], BATCH_28_2_MODULE_IDS), BATCH_28_2_MODULE_IDS.length),
    group: "batch-28-2-quizzes", priority: 3, destination: "/profil#badge-collection-heading",
  },
  "badge-allrounder": {
    category: "allgemein", visual: "5P", visualClass: "unique", summary: "Mindestens ein abgeschlossenes Modul in jeder der fünf Lernphasen.",
    measure: (evidence) => countProgress(countCompletedPhases(evidence.canonicalModuleCompletionIds ?? []), BATCH_28_2_PHASE_MODULE_IDS.length),
    group: "learning-phase-breadth", priority: 2, destination: "/profil#badge-collection-heading",
  },
  "badge-fruehstarter": {
    category: "lernrhythmus", visual: "05", visualClass: "unique", summary: "Drei unterschiedliche Lektionen am selben Morgen.",
    group: "time-morning", priority: 2, destination: "/profil#badge-collection-heading",
  },
  "badge-tagesform": {
    category: "lernrhythmus", visual: "10", visualClass: "unique", summary: "Drei unterschiedliche Lektionen am selben Tag.",
    group: "time-day", priority: 2, destination: "/profil#badge-collection-heading",
  },
  "badge-feierabend-fokus": {
    category: "lernrhythmus", visual: "18", visualClass: "unique", summary: "Drei unterschiedliche Lektionen am selben Abend.",
    group: "time-evening", priority: 2, destination: "/profil#badge-collection-heading",
  },
  "badge-nachteule": {
    category: "lernrhythmus", visual: "23", visualClass: "unique", summary: "Drei unterschiedliche Lektionen in derselben Nacht.",
    group: "time-night", priority: 2, destination: "/profil#badge-collection-heading",
  },
});
export const LEVEL_TITLES: readonly LevelTitleDefinition[] = Object.freeze([
  levelTitle("level-systemstarter", "Systemstarter", 1),
  levelTitle("level-packet-scout", "Packet Scout", 3),
  levelTitle("level-netzwerkentdecker", "Netzwerkentdecker", 5),
  levelTitle("level-troubleshooter", "Troubleshooter", 8),
  levelTitle("level-systemtechniker", "Systemtechniker", 12),
  levelTitle("level-infrastruktur-spezialist", "Infrastruktur-Spezialist", 16),
  levelTitle("level-netzwerkprofi", "Netzwerkprofi", 20),
  levelTitle("level-troubleshooting-experte", "Troubleshooting-Experte", 25),
  levelTitle("level-systemarchitekt", "Systemarchitekt", 30),
  levelTitle("level-infrastruktur-meister", "Infrastruktur-Meister", 40),
]);

export const ACHIEVEMENT_TITLES: readonly AchievementTitleDefinition[] = Object.freeze([
  achievementTitle(
    "achievement-dns-debugger",
    "DNS-Debugger",
    "DNS-Modul einschließlich Abschlussquiz abgeschlossen.",
    (evidence) => includes(evidence.completedModuleIds, "dns"),
  ),
  achievementTitle(
    "achievement-subnetting-spezialist",
    "Subnetting-Spezialist",
    "Subnetting-Modul einschließlich Abschlussquiz abgeschlossen.",
    (evidence) => includes(evidence.completedModuleIds, "subnetting"),
  ),
  achievementTitle(
    "achievement-backup-waechter",
    "Backup-Wächter",
    "Backup-&-Datensicherung-Modul einschließlich Abschlussquiz abgeschlossen.",
    (evidence) => includes(evidence.completedModuleIds, "backup-datensicherung"),
  ),
  achievementTitle(
    "achievement-lab-retter",
    "Lab-Ritter",
    "10 normale Labs erstmals erfolgreich abgeschlossen.",
    (evidence) => evidence.completedNormalLabIds.length >= 10,
  ),
  achievementTitle(
    "achievement-packet-whisperer",
    "Packet Whisperer",
    "10 normale Labs beim Erstabschluss ohne Hinweis gelöst.",
    (evidence) => evidence.zeroHintNormalLabIds.length >= 10,
  ),
  achievementTitle(
    "achievement-fehlerjaeger",
    "Fehlerjäger",
    "Beide Multi-Fault-Labs erstmals erfolgreich abgeschlossen.",
    (evidence) => MULTI_FAULT_LAB_IDS.every((id) => includes(evidence.completedNormalLabIds, id)),
  ),
]);

export const TITLE_CATALOG: readonly TitleDefinition[] = Object.freeze([
  ...LEVEL_TITLES,
  ...ACHIEVEMENT_TITLES,
]);

export const BADGE_CATALOG: readonly BadgeDefinition[] = Object.freeze([
  badge("badge-erste-schritte", "Erste Schritte", "1 Lernmodul einschließlich Abschlussquiz abschließen.", (evidence) => countUnique(evidence.completedModuleIds) >= 1),
  badge("badge-wissenssammler", "Wissenssammler", "10 unterschiedliche Lernmodule abschließen.", (evidence) => countUnique(evidence.completedModuleIds) >= 10),
  badge("badge-lernprofi", "Lernprofi", "20 unterschiedliche Lernmodule abschließen.", (evidence) => countUnique(evidence.completedModuleIds) >= 20),
  badge("badge-quiz-profi", "Quiz-Profi", "1 Abschlussquiz mit 100 % abschließen.", (evidence) => countUnique(evidence.perfectQuizModuleIds) >= 1),
  badge("badge-quiz-experte", "Quiz-Experte", "5 unterschiedliche Abschlussquizze mit 100 % abschließen.", (evidence) => countUnique(evidence.perfectQuizModuleIds) >= 5),
  badge("badge-quiz-meister", "Quiz-Meister", "15 unterschiedliche Abschlussquizze mit 100 % abschließen.", (evidence) => countUnique(evidence.perfectQuizModuleIds) >= 15),
  badge("badge-lab-einsteiger", "Lab-Einsteiger", "1 normales Lab abschließen.", (evidence) => countUnique(evidence.completedNormalLabIds) >= 1),
  badge("badge-lab-erfahren", "Lab-Erfahren", "5 unterschiedliche normale Labs abschließen.", (evidence) => countUnique(evidence.completedNormalLabIds) >= 5),
  badge("badge-lab-profi", "Lab-Profi", "10 unterschiedliche normale Labs abschließen.", (evidence) => countUnique(evidence.completedNormalLabIds) >= 10),
  badge("badge-ohne-hilfe", "Ohne Hilfe", "5 unterschiedliche normale Labs beim Erstabschluss ohne Hinweis lösen.", (evidence) => countUnique(evidence.zeroHintNormalLabIds) >= 5),
  badge("badge-eigenstaendig", "Eigenständig", "10 unterschiedliche normale Labs beim Erstabschluss ohne Hinweis lösen.", (evidence) => countUnique(evidence.zeroHintNormalLabIds) >= 10),
  badge("badge-selbststaendig", "Selbstständig", "15 unterschiedliche normale Labs beim Erstabschluss ohne Hinweis lösen.", (evidence) => countUnique(evidence.zeroHintNormalLabIds) >= 15),
  badge("badge-netzwerk-fundament", "Netzwerk-Fundament", "IPv4, Subnetting, DHCP und DNS einschließlich Abschlussquiz abschließen.", (evidence) => NETWORK_FOUNDATION_MODULE_IDS.every((id) => includes(evidence.completedModuleIds, id))),
  badge("badge-backup-waechter", "Backup-Wächter", "Backup & Datensicherung einschließlich Abschlussquiz abschließen.", (evidence) => includes(evidence.completedModuleIds, "backup-datensicherung")),
  badge("badge-multi-fault", "Multi-Fault", "Beide Multi-Fault-Labs abschließen.", (evidence) => MULTI_FAULT_LAB_IDS.every((id) => includes(evidence.completedNormalLabIds, id))),
  badge("badge-lab-meister", "Lab-Meister", "Alle normalen Labs abschließen.", (evidence) => evidence.normalLabCount > 0 && countUnique(evidence.completedNormalLabIds) >= evidence.normalLabCount),
  badge("badge-querbeet", "Querbeet", "Lektionen in 5 unterschiedlichen Lernmodulen erstmals abschließen.", (evidence) => countLessonModules(evidence.canonicalLessonCompletionIds ?? []) >= 5),
  badge("badge-fuenferpack", "Fünferpack", "5 unterschiedliche Lernmodule abschließen.", (evidence) => countUnique(evidence.canonicalModuleCompletionIds ?? []) >= 5),
  badge("badge-quizmarathon", "Quizmarathon", "10 unterschiedliche Abschlussquizze abschließen.", (evidence) => countUnique(evidence.canonicalQuizCompletionIds ?? []) >= 10),
  badge("badge-halbzeit", "Halbzeit", "13 unterschiedliche Lernmodule abschließen.", (evidence) => countUnique(evidence.canonicalModuleCompletionIds ?? []) >= 13),
  badge("badge-langstrecke", "Langstrecke", "100 unterschiedliche Lektionen erstmals abschließen.", (evidence) => countUnique(evidence.canonicalLessonCompletionIds ?? []) >= 100),
  badge("badge-ausdauer", "Ausdauer", "An 30 unterschiedlichen Kalendertagen nach Berliner Zeit eine Lektion erstmals abschließen.", (evidence) => (evidence.canonicalLearningDateCount ?? 0) >= 30),
  badge("badge-rund-um-die-uhr", "Rund um die Uhr", "Frühstarter, Tagesform, Feierabend-Fokus und Nachteule freischalten.", (evidence) => Object.values(TIME_ACHIEVEMENT_BADGE_IDS).every((id) => includes(evidence.unlockedTimeAchievementIds ?? [], id))),
  badge("badge-systemmeister", "Systemmeister", "Alle 25 Module abschließen.", (evidence) => BATCH_28_2_MODULE_IDS.every((id) => includes(evidence.canonicalModuleCompletionIds ?? [], id))),
  badge("badge-perfektionist", "Perfektionist", "Alle 25 Abschlussquizze abschließen.", (evidence) => BATCH_28_2_MODULE_IDS.every((id) => includes(evidence.canonicalQuizCompletionIds ?? [], id))),
  badge("badge-allrounder", "Allrounder", "In jeder der 5 Lernphasen mindestens ein Modul abschließen.", (evidence) => countCompletedPhases(evidence.canonicalModuleCompletionIds ?? []) === BATCH_28_2_PHASE_MODULE_IDS.length),
  badge(
    TIME_ACHIEVEMENT_BADGE_IDS.MORNING,
    "Frühstarter",
    "3 unterschiedliche Lektionen zwischen 05:00 und 09:59 Uhr am selben Morgen abschließen.",
    (evidence) => includes(evidence.unlockedTimeAchievementIds ?? [], TIME_ACHIEVEMENT_BADGE_IDS.MORNING),
  ),
  badge(
    TIME_ACHIEVEMENT_BADGE_IDS.DAY,
    "Tagesform",
    "3 unterschiedliche Lektionen zwischen 10:00 und 17:59 Uhr am selben Tag abschließen.",
    (evidence) => includes(evidence.unlockedTimeAchievementIds ?? [], TIME_ACHIEVEMENT_BADGE_IDS.DAY),
  ),
  badge(
    TIME_ACHIEVEMENT_BADGE_IDS.EVENING,
    "Feierabend-Fokus",
    "3 unterschiedliche Lektionen zwischen 18:00 und 22:59 Uhr am selben Abend abschließen.",
    (evidence) => includes(evidence.unlockedTimeAchievementIds ?? [], TIME_ACHIEVEMENT_BADGE_IDS.EVENING),
  ),
  badge(
    TIME_ACHIEVEMENT_BADGE_IDS.NIGHT,
    "Nachteule",
    "3 unterschiedliche Lektionen zwischen 23:00 und 04:59 Uhr in derselben Nacht abschließen – über Mitternacht hinweg.",
    (evidence) => includes(evidence.unlockedTimeAchievementIds ?? [], TIME_ACHIEVEMENT_BADGE_IDS.NIGHT),
  ),
]);

export function calculateLabXpReward(uniqueHintsUsed: number) {
  if (!Number.isSafeInteger(uniqueHintsUsed) || uniqueHintsUsed < 0) {
    throw new RangeError("Unique Lab hint count must be a non-negative safe integer.");
  }
  const hintDeduction = Math.min(LAB_BASE_XP, uniqueHintsUsed * LAB_HINT_DEDUCTION_XP);
  return {
    baseXp: LAB_BASE_XP,
    uniqueHintsUsed,
    hintDeduction,
    earnedXp: LAB_BASE_XP - hintDeduction,
  };
}

export function deriveLearnerRewardState(input: {
  totalXp: number;
  evidence: RewardEvidence;
  selectedTitleId?: string;
  pinnedBadgeIds?: readonly string[];
  unlockDates?: Readonly<Record<string, string>>;
}): LearnerRewardState {
  const level = deriveLevelProgress(input.totalXp);
  const titles = TITLE_CATALOG.map((definition): RewardCollectionItem => {
    const unlocked = definition.type === "level"
      ? level.level >= definition.requiredLevel
      : definition.isUnlocked(input.evidence);
    return collectionItem(definition, level, input.evidence, unlocked, input.unlockDates);
  });
  const badges = BADGE_CATALOG.map((definition): RewardCollectionItem => (
    collectionItem(definition, level, input.evidence, definition.isUnlocked(input.evidence), input.unlockDates)
  ));
  const selected = titles.find((title) => title.id === input.selectedTitleId && title.unlocked);
  const defaultTitle = [...titles]
    .reverse()
    .find((title) => title.type === "level" && title.unlocked);
  const pinnedBadgeIds = unique(input.pinnedBadgeIds ?? []).slice(0, MAX_PINNED_BADGES);
  const pinnedBadges = pinnedBadgeIds
    .map((id) => badges.find((badge) => badge.id === id && badge.unlocked))
    .filter((badge): badge is RewardCollectionItem => Boolean(badge));
  return {
    level,
    titles,
    badges,
    activeTitle: selected ?? defaultTitle,
    pinnedBadges,
    nextMilestones: deriveNextMilestones({ titles, badges }),
  };
}

export function deriveNextMilestones(
  state: Pick<LearnerRewardState, "titles" | "badges">,
  limit = MAX_NEXT_MILESTONES,
): readonly NextMilestone[] {
  const boundedLimit = Number.isSafeInteger(limit) ? Math.max(0, Math.min(MAX_NEXT_MILESTONES, limit)) : MAX_NEXT_MILESTONES;
  const nextTierBadgeIds = new Set(getNextTierBadges(state.badges).map((badge) => badge.id));
  const candidates = [
    ...state.titles.map((reward) => ({ reward, type: "title" as const })),
    ...state.badges.map((reward) => ({ reward, type: "badge" as const })),
  ]
    .filter(({ reward, type }) => (
      !reward.unlocked
      && reward.progress
      && reward.progress.target > 0
      && (type === "title" || reward.visualClass !== "tiered" || nextTierBadgeIds.has(reward.id))
    ))
    .sort((left, right) => (
      right.reward.progress!.ratio - left.reward.progress!.ratio
      || left.reward.milestonePriority - right.reward.milestonePriority
      || left.reward.id.localeCompare(right.reward.id)
    ));

  const distinctGoals = candidates.filter(({ reward }, index, all) => (
    all.findIndex((candidate) => candidate.reward.milestoneGroup === reward.milestoneGroup) === index
  ));
  const selected: typeof distinctGoals = [];
  for (const candidate of distinctGoals) {
    const sameCategory = selected.filter((item) => item.reward.category === candidate.reward.category).length;
    if (sameCategory < 2) selected.push(candidate);
    if (selected.length === boundedLimit) break;
  }
  for (const candidate of distinctGoals) {
    if (selected.length === boundedLimit) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }

  return selected.map(({ reward, type }) => ({
    rewardId: reward.id,
    displayName: reward.displayName,
    description: reward.unlockCondition,
    current: reward.progress!.current,
    target: reward.progress!.target,
    ratio: reward.progress!.ratio,
    type,
    category: reward.category === "level" ? "Level" : BADGE_CATEGORY_LABELS[reward.category],
    destination: reward.destination,
  }));
}

export function isUnlockedTitle(state: LearnerRewardState, titleId: string) {
  return state.titles.some((title) => title.id === titleId && title.unlocked);
}

export function deriveProfileTitleState(input: {
  role: AccountRole;
  learnerRewards?: LearnerRewardState;
  selectedTitleId?: string;
}): ProfileTitleState | undefined {
  if (input.role === "learner" && input.learnerRewards) {
    const titles = input.learnerRewards.titles.map(({ unlocked, ...title }) => ({
      ...title,
      selectable: unlocked,
    }));
    return {
      access: "learner",
      titles,
      activeTitle: titles.find((title) => title.id === input.learnerRewards?.activeTitle?.id),
    };
  }
  if (!canSelectAnyProfileTitle(input.role)) return undefined;
  const titles = TITLE_CATALOG.map((title): ProfileTitleItem => ({
    id: title.id,
    displayName: title.displayName,
    description: title.description,
    unlockCondition: title.unlockCondition,
    type: title.type,
    category: title.category,
    milestoneGroup: title.milestone.group,
    milestonePriority: title.milestone.priority,
    destination: title.milestone.destination,
    selectable: true,
  }));
  return {
    access: "staff",
    titles,
    activeTitle: titles.find((title) => title.id === input.selectedTitleId),
  };
}

export function deriveProfileBadgeState(input: {
  role: AccountRole;
  learnerRewards?: LearnerRewardState;
  pinnedBadgeIds?: readonly string[];
}): ProfileBadgeState | undefined {
  if (input.role === "learner" && input.learnerRewards) {
    const badges = input.learnerRewards.badges.map((badge): ProfileBadgeItem => ({
      ...badge,
      selectable: badge.unlocked,
      access: "earned",
    }));
    const badgesById = new Map(badges.map((badge) => [badge.id, badge]));
    return {
      access: "learner",
      badges,
      pinnedBadges: input.learnerRewards.pinnedBadges.flatMap((badge) => {
        const item = badgesById.get(badge.id);
        return item ? [item] : [];
      }),
    };
  }
  if (!canSelectAnyProfileBadge(input.role)) return undefined;
  const badges = BADGE_CATALOG.map((definition): ProfileBadgeItem => ({
    id: definition.id,
    displayName: definition.displayName,
    description: definition.description,
    unlockCondition: definition.unlockCondition,
    category: definition.category,
    visual: definition.visual,
    visualClass: definition.visualClass,
    familyId: definition.familyId,
    tier: definition.tier,
    milestoneGroup: definition.milestone.group,
    milestonePriority: definition.milestone.priority,
    destination: definition.milestone.destination,
    unlocked: false,
    selectable: true,
    access: "staff",
  }));
  const badgesById = new Map(badges.map((badge) => [badge.id, badge]));
  const pinnedBadgeIds = unique(input.pinnedBadgeIds ?? []).slice(0, MAX_PINNED_BADGES);
  return {
    access: "staff",
    badges,
    pinnedBadges: pinnedBadgeIds.flatMap((id) => {
      const badge = badgesById.get(id);
      return badge ? [badge] : [];
    }),
  };
}

export function canSelectProfileTitle(
  role: AccountRole,
  titleId: string | undefined,
  learnerState?: LearnerRewardState,
) {
  if (titleId !== undefined && !TITLE_CATALOG.some((title) => title.id === titleId)) return false;
  if (canSelectAnyProfileTitle(role)) return true;
  if (role !== "learner" || !learnerState) return false;
  return titleId === undefined || isUnlockedTitle(learnerState, titleId);
}

export function areUnlockedBadges(state: LearnerRewardState, badgeIds: readonly string[]) {
  if (badgeIds.length > MAX_PINNED_BADGES || unique(badgeIds).length !== badgeIds.length) return false;
  return badgeIds.every((id) => state.badges.some((badge) => badge.id === id && badge.unlocked));
}

export function canSelectProfileBadges(
  role: AccountRole,
  badgeIds: readonly string[],
  learnerState?: LearnerRewardState,
) {
  if (badgeIds.length > MAX_PINNED_BADGES || unique(badgeIds).length !== badgeIds.length) return false;
  if (badgeIds.some((id) => !BADGE_CATALOG.some((badge) => badge.id === id))) return false;
  if (canSelectAnyProfileBadge(role)) return true;
  return role === "learner" && Boolean(learnerState) && areUnlockedBadges(learnerState!, badgeIds);
}

export function sortBadgesForSocialShowcase(items: readonly RewardCollectionItem[]) {
  const categoryOrder = new Map(BADGE_CATEGORIES.map((category, index) => [category, index]));
  const catalogOrder = new Map(BADGE_CATALOG.map((badge, index) => [badge.id, index]));
  return [...items].sort((left, right) => (
    badgeShowcaseRank(left) - badgeShowcaseRank(right)
    || (categoryOrder.get(left.category as BadgeCategory) ?? Number.MAX_SAFE_INTEGER)
      - (categoryOrder.get(right.category as BadgeCategory) ?? Number.MAX_SAFE_INTEGER)
    || (catalogOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER)
      - (catalogOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    || left.id.localeCompare(right.id)
  ));
}

export function getRepresentedBadgeCategories(items: readonly Pick<RewardCollectionItem, "category">[] = BADGE_CATALOG) {
  const represented = new Set(items.map((item) => item.category));
  return BADGE_CATEGORIES.filter((category) => represented.has(category));
}

export function filterBadgesByCategory(
  items: readonly RewardCollectionItem[],
  category: BadgeCategory | "all",
) {
  return category === "all" ? items : items.filter((item) => item.category === category);
}

export function getNextTierBadges(items: readonly RewardCollectionItem[]) {
  return Object.keys(BADGE_FAMILIES).flatMap((familyId) => {
    const family = items
      .filter((item) => item.visualClass === "tiered" && item.familyId === familyId)
      .sort(compareBadgeTiers);
    const next = family.find((item) => !item.unlocked);
    return next ? [next] : [];
  });
}

export type BadgeCollectionGroup = {
  id: string;
  familyId?: BadgeFamilyId;
  label?: string;
  badges: readonly RewardCollectionItem[];
};

export function getBadgeCollectionGroups(items: readonly RewardCollectionItem[]): readonly BadgeCollectionGroup[] {
  const familyGroups = (Object.entries(BADGE_FAMILIES) as [BadgeFamilyId, (typeof BADGE_FAMILIES)[BadgeFamilyId]][])
    .sort((left, right) => left[1].order - right[1].order || left[0].localeCompare(right[0]))
    .flatMap(([familyId, family]) => {
      const badges = items
        .filter((item) => item.visualClass === "tiered" && item.familyId === familyId)
        .sort(compareBadgeTiers);
      return badges.length > 0 ? [{ id: `family-${familyId}`, familyId, label: family.label, badges }] : [];
    });
  const standalone = items.filter((item) => item.visualClass !== "tiered");
  return standalone.length > 0
    ? [...familyGroups, { id: "standalone", label: "Einzelne Abzeichen", badges: standalone }]
    : familyGroups;
}

function collectionItem(
  definition: TitleDefinition | BadgeDefinition,
  level: LevelProgress,
  evidence: RewardEvidence,
  unlocked: boolean,
  unlockDates?: Readonly<Record<string, string>>,
): RewardCollectionItem {
  const measuredProgress = definition.getProgress?.(evidence, level);
  const progress = measuredProgress ? toRewardProgress(measuredProgress) : undefined;
  return {
    id: definition.id,
    displayName: definition.displayName,
    description: definition.description,
    unlockCondition: definition.unlockCondition,
    category: definition.category,
    type: "type" in definition ? definition.type : undefined,
    visual: "visual" in definition ? definition.visual : undefined,
    visualClass: "visualClass" in definition ? definition.visualClass : undefined,
    familyId: "familyId" in definition ? definition.familyId : undefined,
    tier: "tier" in definition ? definition.tier : undefined,
    progress,
    milestoneGroup: definition.milestone.group,
    milestonePriority: definition.milestone.priority,
    destination: definition.milestone.destination,
    unlocked,
    unlockedAt: unlocked ? unlockDates?.[definition.id] : undefined,
  };
}

function levelTitle(id: string, displayName: string, requiredLevel: number): LevelTitleDefinition {
  return {
    id,
    displayName,
    type: "level",
    requiredLevel,
    description: `Kosmetischer Titel für Level ${requiredLevel}.`,
    unlockCondition: `Level ${requiredLevel} erreichen.`,
    category: "level",
    getProgress: (_evidence, level) => ({ current: level.level, target: requiredLevel }),
    milestone: { group: id, priority: 3, destination: "/profil#title-collection-heading" },
  };
}

function achievementTitle(
  id: string,
  displayName: string,
  unlockCondition: string,
  isUnlocked: AchievementTitleDefinition["isUnlocked"],
): AchievementTitleDefinition {
  const metadata = getCatalogMetadata(id);
  return {
    id,
    displayName,
    type: "achievement",
    description: metadata.summary,
    unlockCondition,
    category: metadata.category,
    getProgress: metadata.measure ? (evidence) => metadata.measure!(evidence) : undefined,
    milestone: { group: metadata.group, priority: metadata.priority, destination: metadata.destination },
    isUnlocked,
  };
}

function badge(
  id: string,
  displayName: string,
  unlockCondition: string,
  isUnlocked: BadgeDefinition["isUnlocked"],
): BadgeDefinition {
  const metadata = getCatalogMetadata(id);
  if (metadata.category === "level" || !metadata.visual || !metadata.visualClass) {
    throw new TypeError(`Badge metadata missing: ${id}`);
  }
  if (metadata.visualClass === "tiered" && (!metadata.familyId || !metadata.tier)) {
    throw new TypeError(`Tiered badge metadata missing: ${id}`);
  }
  if (metadata.visualClass !== "tiered" && (metadata.familyId || metadata.tier)) {
    throw new TypeError(`Standalone badge contains tier metadata: ${id}`);
  }
  return {
    id,
    displayName,
    description: metadata.summary,
    unlockCondition,
    category: metadata.category,
    visual: metadata.visual,
    visualClass: metadata.visualClass,
    familyId: metadata.familyId,
    tier: metadata.tier,
    getProgress: metadata.measure ? (evidence) => metadata.measure!(evidence) : undefined,
    milestone: { group: metadata.group, priority: metadata.priority, destination: metadata.destination },
    isUnlocked,
  };
}

function getCatalogMetadata(id: string) {
  const metadata = CATALOG_METADATA[id];
  if (!metadata) throw new TypeError(`Reward metadata missing: ${id}`);
  return metadata;
}

function toRewardProgress(value: { current: number; target: number }): RewardProgress {
  if (!Number.isSafeInteger(value.current) || value.current < 0
    || !Number.isSafeInteger(value.target) || value.target < 1) {
    throw new RangeError("Reward progress must contain non-negative integer values and a positive target.");
  }
  const current = Math.min(value.current, value.target);
  return { current, target: value.target, ratio: current / value.target };
}

function countProgress(current: number, target: number) {
  return { current, target };
}

function booleanProgress(value: boolean) {
  return countProgress(value ? 1 : 0, 1);
}

function countIncluded(values: readonly string[], expected: readonly string[]) {
  return expected.filter((value) => values.includes(value)).length;
}

function countLessonModules(lessonIds: readonly string[]) {
  return new Set(lessonIds.flatMap((lessonId) => {
    const separator = lessonId.indexOf("/");
    return separator > 0 ? [lessonId.slice(0, separator)] : [];
  })).size;
}

function countCompletedPhases(moduleIds: readonly string[]) {
  const completed = new Set(moduleIds);
  return BATCH_28_2_PHASE_MODULE_IDS.filter((phase) => phase.some((moduleId) => completed.has(moduleId))).length;
}

function countUnique(values: readonly string[]) {
  return new Set(values).size;
}

function includes(values: readonly string[], expected: string) {
  return values.includes(expected);
}

function unique(values: readonly string[]) {
  return [...new Set(values)];
}

function compareBadgeTiers(left: Pick<RewardCollectionItem, "tier" | "id">, right: Pick<RewardCollectionItem, "tier" | "id">) {
  const order = new Map(BADGE_TIERS.map((tier, index) => [tier, index]));
  return (order.get(left.tier ?? "bronze") ?? Number.MAX_SAFE_INTEGER)
    - (order.get(right.tier ?? "bronze") ?? Number.MAX_SAFE_INTEGER)
    || left.id.localeCompare(right.id);
}

function badgeShowcaseRank(item: Pick<RewardCollectionItem, "visualClass" | "tier">) {
  if (item.visualClass === "prestige") return 0;
  if (item.visualClass === "tiered") {
    return item.tier === "gold" ? 1 : item.tier === "silver" ? 2 : 3;
  }
  return 4;
}
