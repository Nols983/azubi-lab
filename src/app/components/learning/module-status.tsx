import type { LearnerStatus } from "../../lib/learner-progress";

export const moduleStatusPresentation: Record<LearnerStatus, { label: string; actionLabel: string; className: string }> = {
  "not-started": { label: "Nicht begonnen", actionLabel: "Starten", className: "bg-slate-100 text-slate-700" },
  "in-progress": { label: "In Bearbeitung", actionLabel: "Weiterlernen", className: "bg-blue-50 text-blue-800" },
  completed: { label: "Erledigt", actionLabel: "Öffnen", className: "bg-emerald-50 text-emerald-800" },
};

export function ModuleStatus({ status }: { status: LearnerStatus }) {
  const presentation = moduleStatusPresentation[status];
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${presentation.className}`}>{presentation.label}</span>;
}
