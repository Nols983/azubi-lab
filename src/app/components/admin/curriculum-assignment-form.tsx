"use client";

import { useActionState, useEffect, useId, useRef, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  archiveCurriculumAssignmentAction,
  assignCurriculumModulesAction,
  updateCurriculumAssignmentAction,
  type CurriculumPlanningActionState,
} from "../../actions/curriculum-planning-actions.ts";
import { CURRICULUM_ASSIGNMENT_NOTE_MAX_LENGTH } from "../../lib/curriculum-planning.ts";
import type { LearningModule } from "../../data/learning-modules.ts";
import type { ModuleActivitySummary } from "../../lib/learner-progress.ts";

const initialState: CurriculumPlanningActionState = { status: "idle", message: "" };

export function CurriculumAssignmentForm({
  learnerId,
  modules,
}: {
  learnerId: string;
  modules: readonly { module: LearningModule; progress?: ModuleActivitySummary }[];
}) {
  const [state, action] = useActionState(assignCurriculumModulesAction.bind(null, learnerId), initialState);
  const fieldId = useId();
  const targetIsoRef = useRef<HTMLInputElement>(null);
  const updateAbsoluteTarget = (localValue: string) => {
    if (targetIsoRef.current) targetIsoRef.current.value = localValue ? new Date(localValue).toISOString() : "";
  };
  const prepareTarget = (event: FormEvent<HTMLFormElement>) => {
    const localInput = event.currentTarget.elements.namedItem("targetAtLocal");
    updateAbsoluteTarget(localInput instanceof HTMLInputElement ? localInput.value : "");
  };

  return (
    <form action={action} onSubmit={prepareTarget} className="space-y-5" noValidate>
      <fieldset aria-describedby={state.fieldErrors?.moduleSlugs ? "curriculum-modules-help curriculum-modules-error" : "curriculum-modules-help"}>
        <legend className="text-sm font-bold text-slate-800">Module auswählen</legend>
        <p id="curriculum-modules-help" className="mt-2 text-sm leading-6 text-slate-600">Mehrere Module erhalten in diesem Vorgang denselben Zieltermin und Hinweis. Begonnener oder abgeschlossener Fortschritt bleibt unverändert.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {modules.map(({ module, progress }) => (
            <label key={module.slug} className="flex min-h-12 min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
              <input type="checkbox" name="moduleSlugs" value={module.slug} className="mt-0.5 size-5 shrink-0 accent-blue-800" />
              <span className="min-w-0"><span className="block font-bold">{module.title}</span><span className="mt-1 block text-slate-600">{progress?.percentage ?? 0} % bereits bearbeitet</span></span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.moduleSlugs && <p id="curriculum-modules-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.moduleSlugs}</p>}
      </fieldset>
      <PlanningFields idPrefix={fieldId} state={state} targetIsoRef={targetIsoRef} updateAbsoluteTarget={updateAbsoluteTarget} />
      <ActionMessage state={state} />
      <SubmitButton pendingLabel="Module werden zugewiesen …">Ausgewählte Module zuweisen</SubmitButton>
    </form>
  );
}

export function CurriculumAssignmentEditor({
  assignmentId,
  targetAtIso,
  note,
}: {
  assignmentId: string;
  targetAtIso: string;
  note: string;
}) {
  const [updateState, updateAction] = useActionState(updateCurriculumAssignmentAction.bind(null, assignmentId), initialState);
  const [archiveState, archiveAction] = useActionState(archiveCurriculumAssignmentAction.bind(null, assignmentId), initialState);
  const fieldId = useId();
  const targetIsoRef = useRef<HTMLInputElement>(null);
  const localTargetRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (localTargetRef.current) localTargetRef.current.value = targetAtIso ? toLocalDateTime(targetAtIso) : "";
  }, [targetAtIso]);

  const updateAbsoluteTarget = (localValue: string) => {
    if (targetIsoRef.current) targetIsoRef.current.value = localValue ? new Date(localValue).toISOString() : "";
  };
  const prepareTarget = (event: FormEvent<HTMLFormElement>) => {
    const localInput = event.currentTarget.elements.namedItem("targetAtLocal");
    updateAbsoluteTarget(localInput instanceof HTMLInputElement ? localInput.value : "");
  };

  return (
    <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
      <form action={updateAction} onSubmit={prepareTarget} className="space-y-4" noValidate>
        <PlanningFields
          idPrefix={fieldId}
          state={updateState}
          targetIsoRef={targetIsoRef}
          localTargetRef={localTargetRef}
          targetAtIso={targetAtIso}
          note={note}
          updateAbsoluteTarget={updateAbsoluteTarget}
          compact
        />
        <ActionMessage state={updateState} />
        <SubmitButton pendingLabel="Planung wird aktualisiert …">Ziel und Hinweis speichern</SubmitButton>
      </form>
      <form action={archiveAction}>
        <ActionMessage state={archiveState} />
        <SubmitButton pendingLabel="Zuweisung wird entfernt …" tone="secondary">Aus aktivem Lernplan entfernen</SubmitButton>
      </form>
    </div>
  );
}

function PlanningFields({
  idPrefix,
  state,
  targetIsoRef,
  localTargetRef,
  targetAtIso = "",
  note = "",
  updateAbsoluteTarget,
  compact = false,
}: {
  idPrefix: string;
  state: CurriculumPlanningActionState;
  targetIsoRef: React.RefObject<HTMLInputElement | null>;
  localTargetRef?: React.RefObject<HTMLInputElement | null>;
  targetAtIso?: string;
  note?: string;
  updateAbsoluteTarget(localValue: string): void;
  compact?: boolean;
}) {
  const suffix = idPrefix.replace(/:/g, "");
  return (
    <div className={`grid gap-4 ${compact ? "lg:grid-cols-2" : ""}`}>
      <div>
        <label htmlFor={`curriculum-target-${suffix}`} className="block text-sm font-bold text-slate-800">Zieltermin (lokale Zeit, optional)</label>
        <input ref={localTargetRef} id={`curriculum-target-${suffix}`} name="targetAtLocal" type="datetime-local" min="2000-01-01T00:00" max="2100-12-31T23:59" onInput={(event) => updateAbsoluteTarget(event.currentTarget.value)} aria-invalid={Boolean(state.fieldErrors?.targetAt)} aria-describedby={state.fieldErrors?.targetAt ? `curriculum-target-help-${suffix} curriculum-target-error-${suffix}` : `curriculum-target-help-${suffix}`} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
        <input ref={targetIsoRef} type="hidden" name="targetAtIso" defaultValue={targetAtIso} />
        <p id={`curriculum-target-help-${suffix}`} className="mt-2 text-sm leading-6 text-slate-600">Der Termin ist eine Planungshilfe, keine Sperre oder automatische Bewertung.</p>
        {state.fieldErrors?.targetAt && <p id={`curriculum-target-error-${suffix}`} className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.targetAt}</p>}
      </div>
      <div>
        <label htmlFor={`curriculum-note-${suffix}`} className="block text-sm font-bold text-slate-800">Trainerhinweis (optional)</label>
        <textarea id={`curriculum-note-${suffix}`} name="note" rows={compact ? 3 : 4} maxLength={CURRICULUM_ASSIGNMENT_NOTE_MAX_LENGTH} defaultValue={note} aria-invalid={Boolean(state.fieldErrors?.note)} aria-describedby={state.fieldErrors?.note ? `curriculum-note-help-${suffix} curriculum-note-error-${suffix}` : `curriculum-note-help-${suffix}`} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-6 text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
        <p id={`curriculum-note-help-${suffix}`} className="mt-2 text-sm leading-6 text-slate-600">Klartext, maximal {CURRICULUM_ASSIGNMENT_NOTE_MAX_LENGTH.toLocaleString("de-DE")} Zeichen.</p>
        {state.fieldErrors?.note && <p id={`curriculum-note-error-${suffix}`} className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.note}</p>}
      </div>
    </div>
  );
}

function ActionMessage({ state }: { state: CurriculumPlanningActionState }) {
  return <div aria-live={state.status === "error" ? "assertive" : "polite"}>{state.status !== "idle" && <p className={`rounded-xl border p-4 text-sm font-semibold text-slate-900 ${state.status === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>{state.message}</p>}</div>;
}

function SubmitButton({ children, pendingLabel, tone = "primary" }: { children: string; pendingLabel: string; tone?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65 ${tone === "primary" ? "bg-blue-950 text-white hover:bg-blue-900" : "border border-slate-300 bg-white text-slate-800 hover:border-blue-400 hover:text-blue-800"}`}>{pending ? pendingLabel : children}</button>;
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
