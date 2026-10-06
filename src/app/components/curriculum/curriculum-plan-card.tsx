import Link from "next/link";
import type { ReactNode } from "react";
import type { CurriculumAssignmentView } from "../../lib/curriculum-planning.ts";
import { ModuleStatus } from "../learning/module-status.tsx";
import { ProgressBar } from "../progress-bar.tsx";

export function CurriculumPlanCard({
  assignment,
  children,
  showAssigner = false,
  showArchived = false,
}: {
  assignment: CurriculumAssignmentView;
  children?: ReactNode;
  showAssigner?: boolean;
  showArchived?: boolean;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-semibold text-blue-700">{assignment.module.category}</p>
        <div className="flex flex-wrap gap-2">
          <ModuleStatus status={assignment.status} />
          {assignment.isOverdue && <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-800">Zieltermin überschritten</span>}
          {showArchived && assignment.archivedAt && <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Aus Lernplan entfernt</span>}
        </div>
      </div>
      <h3 className="mt-3 break-words text-xl font-bold text-slate-950">{assignment.module.title}</h3>
      <div className="mt-5"><ProgressBar value={assignment.progress.percentage} label={`Fortschritt ${assignment.module.title}`} /></div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <DataItem label="Zugewiesen" value={formatPlanningDate(assignment.assignedAt)} />
        <DataItem label="Zieltermin" value={assignment.targetAt ? formatPlanningDate(assignment.targetAt, true) : "Kein Zieltermin"} />
        <DataItem label="Modulstatus" value={assignment.isOverdue ? `Überfällig · ${statusLabel(assignment.status)}` : statusLabel(assignment.status)} />
        {showAssigner && <DataItem label="Zugewiesen von" value={assignment.assignedBy.displayName} />}
        {showArchived && assignment.archivedAt && <DataItem label="Entfernt" value={formatPlanningDate(assignment.archivedAt, true)} />}
      </dl>
      {assignment.note && <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-sm font-bold text-blue-950">Trainerhinweis</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{assignment.note}</p></div>}
      {!showArchived && <Link href={`/lernen/${assignment.module.slug}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Modul öffnen <span aria-hidden="true" className="ml-2">→</span></Link>}
      {children}
    </article>
  );
}

export function formatPlanningDate(value: Date, includeTime = false) {
  return new Intl.DateTimeFormat("de-DE", includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(value);
}

function DataItem({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-bold text-slate-800">{label}</dt><dd className="mt-1 break-words text-slate-600">{value}</dd></div>;
}

function statusLabel(status: CurriculumAssignmentView["status"]) {
  if (status === "completed") return "Erledigt";
  if (status === "in-progress") return "In Bearbeitung";
  return "Nicht begonnen";
}
