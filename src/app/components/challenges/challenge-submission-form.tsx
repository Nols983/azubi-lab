"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  submitChallengeAssignmentAction,
  type SubmissionActionState,
} from "../../actions/challenge-actions";
import { CHALLENGE_SUBMISSION_MAX_LENGTH } from "../../lib/challenge-domain";
import { EVIDENCE_ACCEPT_ATTRIBUTE } from "../../lib/challenge-evidence";

const initialState: SubmissionActionState = { status: "idle", message: "" };

export function ChallengeSubmissionForm({ assignmentId, revision }: { assignmentId: string; revision: boolean }) {
  const [state, formAction] = useActionState(submitChallengeAssignmentAction.bind(null, assignmentId), initialState);
  const errorId = state.fieldErrors?.content ? "submission-content-error" : undefined;
  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="submission-content" className="block font-bold text-slate-900">
          {revision ? "Überarbeitete Lösung" : "Deine Lösung"}
        </label>
        <p id="submission-content-help" className="mt-2 text-sm leading-6 text-slate-600">
          Reiche nachvollziehbaren Klartext ein. Markdown wird nicht ausgewertet. Nicht eingereichter Text oder nur ausgewählte Dateien werden bei einem Reload nicht gespeichert.
        </p>
        <textarea
          id="submission-content"
          name="content"
          required
          maxLength={CHALLENGE_SUBMISSION_MAX_LENGTH}
          rows={10}
          aria-describedby={["submission-content-help", errorId].filter(Boolean).join(" ")}
          aria-invalid={Boolean(errorId)}
          className="mt-3 min-h-48 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 leading-7 text-slate-950 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        />
        {state.fieldErrors?.content && <p id="submission-content-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.content}</p>}
      </div>
      <fieldset aria-describedby={`submission-evidence-help${state.fieldErrors?.evidence ? " submission-evidence-error" : ""}`} className="rounded-xl border border-slate-300 bg-white p-4 sm:p-5">
        <legend className="px-2 font-bold text-slate-900">Nachweise (optional)</legend>
        <label htmlFor="submission-evidence" className="block text-sm font-bold text-slate-800">Bis zu fünf Dateien auswählen</label>
        <input
          id="submission-evidence"
          name="evidence"
          type="file"
          multiple
          accept={EVIDENCE_ACCEPT_ATTRIBUTE}
          aria-invalid={Boolean(state.fieldErrors?.evidence)}
          aria-describedby={`submission-evidence-help${state.fieldErrors?.evidence ? " submission-evidence-error" : ""}`}
          className="mt-3 min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-blue-950 file:px-4 file:font-bold file:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        />
        <p id="submission-evidence-help" className="mt-3 text-sm leading-6 text-slate-600">Erlaubt: PNG, JPG/JPEG, PDF, TXT und CSV. Maximal 10 MiB je Datei, fünf Dateien und 25 MiB insgesamt. Dateien werden privat gespeichert und nicht automatisch auf Schadsoftware geprüft.</p>
        {state.fieldErrors?.evidence && <p id="submission-evidence-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.evidence}</p>}
      </fieldset>
      <SubmissionButton revision={revision} />
      <div aria-live={state.status === "error" ? "assertive" : "polite"}>
        {state.status !== "idle" && <p className={`rounded-xl border p-4 text-sm font-semibold ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>{state.message}</p>}
      </div>
    </form>
  );
}

function SubmissionButton({ revision }: { revision: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65 sm:w-auto">
      {pending ? "Abgabe wird gespeichert …" : revision ? "Überarbeitete Version abgeben" : "Lösung verbindlich abgeben"}
    </button>
  );
}
