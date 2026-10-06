"use client";

import { useActionState, useRef, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { assignChallengeAction, type AssignmentActionState } from "../../actions/challenge-actions";
import type { LearnerOption } from "../../lib/server/challenge-assignment-repository";

const initialState: AssignmentActionState = { status: "idle", message: "" };

export function ChallengeAssignmentForm({ challengeId, learners }: { challengeId: string; learners: readonly LearnerOption[] }) {
  const [state, action] = useActionState(assignChallengeAction.bind(null, challengeId), initialState);
  const dueAtIsoRef = useRef<HTMLInputElement>(null);
  const updateAbsoluteDue = (localValue: string) => {
    if (dueAtIsoRef.current) {
      dueAtIsoRef.current.value = localValue
        ? new Date(localValue).toISOString()
        : "";
    }
  };
  const prepareDueAt = (event: FormEvent<HTMLFormElement>) => {
    const localInput = event.currentTarget.elements.namedItem("dueAtLocal");
    updateAbsoluteDue(localInput instanceof HTMLInputElement ? localInput.value : "");
  };
  return (
    <form action={action} onSubmit={prepareDueAt} className="space-y-5" noValidate>
      <fieldset aria-describedby={state.fieldErrors?.learnerIds ? "assignment-learners-error assignment-learners-help" : "assignment-learners-help"}>
        <legend className="text-sm font-bold text-slate-800">Aktive Lernkonten auswählen</legend>
        <p id="assignment-learners-help" className="mt-2 text-sm leading-6 text-slate-600">Eine Zeile wird pro Person angelegt. Bereits zugewiesene oder gesperrte Konten werden nicht angeboten.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {learners.map((learner) => (
            <label key={learner.id} className="flex min-h-12 min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
              <input type="checkbox" name="learnerIds" value={learner.id} className="mt-0.5 size-5 shrink-0 accent-blue-800" />
              <span className="min-w-0"><span className="block font-bold">{learner.displayName}</span><span className="block break-all text-slate-600">{learner.login}</span></span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.learnerIds && <p id="assignment-learners-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.learnerIds}</p>}
      </fieldset>
      <div>
        <label htmlFor="assignment-due-at" className="block text-sm font-bold text-slate-800">Fällig am (deine lokale Zeit, optional)</label>
        <input id="assignment-due-at" name="dueAtLocal" type="datetime-local" onInput={(event) => updateAbsoluteDue(event.currentTarget.value)} aria-invalid={Boolean(state.fieldErrors?.dueAt)} aria-describedby={state.fieldErrors?.dueAt ? "assignment-due-error assignment-due-help" : "assignment-due-help"} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
        <input ref={dueAtIsoRef} type="hidden" name="dueAtIso" defaultValue="" />
        <p id="assignment-due-help" className="mt-2 text-sm leading-6 text-slate-600">Datum und Uhrzeit werden aus deiner lokalen Zeitzone in einen eindeutigen Zeitpunkt umgewandelt.</p>
        {state.fieldErrors?.dueAt && <p id="assignment-due-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.dueAt}</p>}
      </div>
      <input type="hidden" name="role" value="learner" />
      <div aria-live={state.status === "error" ? "assertive" : "polite"}>{state.status !== "idle" && <p className={`rounded-xl border p-4 text-sm font-semibold text-slate-900 ${state.status === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>{state.message}</p>}</div>
      <AssignmentSubmitButton />
    </form>
  );
}

function AssignmentSubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65 sm:w-auto">{pending ? "Zuweisung wird gespeichert …" : "Challenge zuweisen"}</button>;
}
