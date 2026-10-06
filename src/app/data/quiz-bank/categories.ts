import { learningPathPhases } from "../learning-path-phases.ts";

/** Persisted Practice/IHK v1 IDs kept readable for historic attempts. */
export const quizCategoryIds = [
  "netzwerke",
  "betriebssysteme",
  "server-dienste",
  "troubleshooting",
] as const;

export type QuizCategoryId = (typeof quizCategoryIds)[number];

export const quizCategoryLabels = {
  netzwerke: "Netzwerke",
  betriebssysteme: "Betriebssysteme",
  "server-dienste": "Server & Dienste",
  troubleshooting: "Troubleshooting",
} as const satisfies Readonly<Record<QuizCategoryId, string>>;

/** Historic v1 category membership, retained as a compatibility contract. */
export const quizModulesByCategory = {
  netzwerke: ["ipv4-grundlagen", "subnetting", "dhcp", "dns", "osi-tcp-ip-modell", "netzwerk-koppelelemente", "netzwerktopologien"],
  betriebssysteme: ["linux-grundlagen", "windows-grundlagen", "arbeitsplatz-hardware"],
  "server-dienste": ["webserver-grundlagen", "active-directory-grundlagen", "backup-datensicherung", "storage-und-raid", "it-sicherheit", "datenschutz"],
  troubleshooting: ["netzwerkfehler-systematisch-analysieren"],
} as const satisfies Readonly<Record<QuizCategoryId, readonly string[]>>;

export const assessmentGroupIds = learningPathPhases.map((phase) => phase.id);

export type AssessmentGroupId = (typeof learningPathPhases)[number]["id"];
export type QuizModuleSlug = (typeof learningPathPhases)[number]["moduleSlugs"][number];

export const assessmentGroupLabels = Object.fromEntries(
  learningPathPhases.map((phase) => [phase.id, phase.title]),
) as Readonly<Record<AssessmentGroupId, string>>;

export const assessmentModulesByGroup = Object.fromEntries(
  learningPathPhases.map((phase) => [phase.id, phase.moduleSlugs]),
) as unknown as Readonly<Record<AssessmentGroupId, readonly QuizModuleSlug[]>>;

export const mixedAssessmentModuleSlugs = learningPathPhases.flatMap(
  (phase) => [...phase.moduleSlugs],
) as readonly QuizModuleSlug[];

const categoryIdSet = new Set<string>(quizCategoryIds);
const assessmentGroupIdSet = new Set<string>(assessmentGroupIds);
const moduleSlugSet = new Set<string>(mixedAssessmentModuleSlugs);
const assessmentGroupByModule = new Map<QuizModuleSlug, AssessmentGroupId>(
  learningPathPhases.flatMap((phase) =>
    phase.moduleSlugs.map((moduleSlug) => [moduleSlug, phase.id] as const),
  ),
);

/*
 * Batch 32 intentionally adds no migration. New questions therefore keep a
 * DB-safe v1 category value while learner-facing grouping comes exclusively
 * from the canonical learning path above.
 */
const persistedCategoryByModule = {
  "arbeitsplatz-hardware": "betriebssysteme",
  "datenmengen-zahlensysteme-uebertragungsrechnungen": "betriebssysteme",
  "clientinstallation-boot-datentraeger": "betriebssysteme",
  "windows-grundlagen": "betriebssysteme",
  "linux-grundlagen": "betriebssysteme",
  "osi-tcp-ip-modell": "netzwerke",
  "netzwerk-koppelelemente": "netzwerke",
  netzwerktopologien: "netzwerke",
  "ipv4-grundlagen": "netzwerke",
  subnetting: "netzwerke",
  dhcp: "netzwerke",
  dns: "netzwerke",
  "webserver-grundlagen": "server-dienste",
  "active-directory-grundlagen": "server-dienste",
  "virtualisierung-und-cloud": "server-dienste",
  "storage-und-raid": "server-dienste",
  "backup-datensicherung": "server-dienste",
  "netzwerkfehler-systematisch-analysieren": "troubleshooting",
  "it-sicherheit": "server-dienste",
  datenschutz: "server-dienste",
  "programmierung-und-pseudocode": "troubleshooting",
  "uml-und-datenmodellierung": "troubleshooting",
  projektmanagement: "troubleshooting",
  "wirtschaftlichkeit-und-beschaffung": "troubleshooting",
  "software-und-lizenzierung": "troubleshooting",
  "kundenauftrag-kommunikation-und-vertraege": "troubleshooting",
  "qualitaetssicherung-und-uebergabe": "troubleshooting",
} as const satisfies Readonly<Record<QuizModuleSlug, QuizCategoryId>>;

const legacyCategoryAssessmentGroups = {
  netzwerke: ["netzwerke"],
  betriebssysteme: ["it-grundlagen-arbeitsplatz"],
  "server-dienste": ["systeme-storage-betrieb", "sicherheit-datenschutz"],
  troubleshooting: ["systeme-storage-betrieb"],
} as const satisfies Readonly<Record<QuizCategoryId, readonly AssessmentGroupId[]>>;

export function isQuizCategoryId(value: string): value is QuizCategoryId {
  return categoryIdSet.has(value);
}

export function isAssessmentGroupId(value: string): value is AssessmentGroupId {
  return assessmentGroupIdSet.has(value);
}

export function isQuizModuleSlug(value: string): value is QuizModuleSlug {
  return moduleSlugSet.has(value);
}

export function getQuizCategoryLabel(categoryId: QuizCategoryId) {
  return quizCategoryLabels[categoryId];
}

export function getQuizModulesForCategory(categoryId: QuizCategoryId) {
  return quizModulesByCategory[categoryId] as readonly QuizModuleSlug[];
}

export function getQuizCategoryForModule(moduleSlug: QuizModuleSlug): QuizCategoryId {
  return persistedCategoryByModule[moduleSlug];
}

export function getAssessmentGroupLabel(groupId: AssessmentGroupId) {
  return assessmentGroupLabels[groupId];
}

export function getAssessmentModulesForGroup(groupId: AssessmentGroupId) {
  return assessmentModulesByGroup[groupId];
}

export function getAssessmentGroupForModule(moduleSlug: QuizModuleSlug): AssessmentGroupId {
  const groupId = assessmentGroupByModule.get(moduleSlug);
  if (!groupId) throw new Error(`Quizmodul ohne Lernbereich: ${moduleSlug}`);
  return groupId;
}

export function getAssessmentGroupsForLegacyCategory(categoryId: QuizCategoryId) {
  return legacyCategoryAssessmentGroups[categoryId];
}
