export const learnerDetailSections = [
  { id: "overview", label: "Übersicht" },
  { id: "learning", label: "Lernen" },
  { id: "practice", label: "Praxis" },
  { id: "labs", label: "Labs" },
  { id: "progression", label: "Progression" },
  { id: "activity", label: "Aktivität" },
] as const;

export type LearnerDetailSection = (typeof learnerDetailSections)[number]["id"];

export function parseLearnerDetailSection(value: string | string[] | undefined): LearnerDetailSection {
  const candidate = typeof value === "string" ? value : value?.[0];
  return learnerDetailSections.some((section) => section.id === candidate)
    ? candidate as LearnerDetailSection
    : "overview";
}

export function learnerDetailSectionHref(learnerId: string, section: LearnerDetailSection) {
  const base = "/admin/lernende/" + encodeURIComponent(learnerId);
  return section === "overview" ? base : base + "?section=" + section;
}
