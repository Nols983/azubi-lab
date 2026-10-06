"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  reviewChallengeSubmissionAction,
  type ReviewActionState,
} from "../../actions/challenge-actions";
import { CHALLENGE_REVIEW_FEEDBACK_MAX_LENGTH } from "../../lib/challenge-domain";
import type { ChallengeRubricCriterion } from "../../lib/server/challenge-repository";

const initialState: ReviewActionState = { status: "idle", message: "" };

export function ChallengeReviewForm({ submissionId, rubricCriteria }: { submissionId: string; rubricCriteria: readonly ChallengeRubricCriterion[] }) {
  const [state, formAction] = useActionState(reviewChallengeSubmissionAction.bind(null, submissionId), initialState);
  return (
    <form action={formAction} className="space-y-5">
      <fieldset aria-describedby={state.fieldErrors?.decision ? "review-decision-error" : undefined}>
        <legend className="font-bold text-slate-900">Entscheidung</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ReviewOption value="approved" label="Freigeben" description="Die Zuweisung gilt nach diesem Review als abgeschlossen." />
          <ReviewOption value="revision-requested" label="Überarbeitung anfordern" description="Das Lernkonto kann danach eine neue, nummerierte Version einreichen." />
        </div>
        {state.fieldErrors?.decision && <p id="review-decision-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.decision}</p>}
      </fieldset>
      {rubricCriteria.length > 0 && (
        <fieldset aria-describedby={`review-rubric-help${state.fieldErrors?.scores ? " review-rubric-error" : ""}`} className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 sm:p-5">
          <legend className="px-2 font-bold text-slate-900">Rubrikbewertung</legend>
          <p id="review-rubric-help" className="mt-1 text-sm leading-6 text-slate-600">Bewerte jedes aktuelle Kriterium mit einer ganzen Punktzahl. Die Review-Entscheidung bleibt davon unabhängig.</p>
          <ol className="mt-4 space-y-4">{rubricCriteria.map((criterion) => <li key={criterion.id} className="rounded-xl border border-teal-200 bg-white p-4"><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-end"><div><p className="font-bold text-slate-950">{criterion.position}. {criterion.title}</p>{criterion.description && <p className="mt-1 text-sm leading-6 text-slate-600">{criterion.description}</p>}</div><div><label htmlFor={`review-score-${criterion.id}`} className="block text-sm font-bold text-slate-800">Punkte für {criterion.title} (max. {criterion.maxPoints})</label><input id={`review-score-${criterion.id}`} name={`rubricScore:${criterion.id}`} type="number" required min={0} max={criterion.maxPoints} step={1} aria-invalid={Boolean(state.fieldErrors?.scores)} aria-describedby={`review-rubric-help${state.fieldErrors?.scores ? " review-rubric-error" : ""}`} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" /></div></div></li>)}</ol>
          {state.fieldErrors?.scores && <p id="review-rubric-error" className="mt-3 text-sm font-semibold text-red-700">{state.fieldErrors.scores}</p>}
        </fieldset>
      )}
      <div>
        <label htmlFor="review-feedback" className="block font-bold text-slate-900">Feedback</label>
        <p id="review-feedback-help" className="mt-2 text-sm leading-6 text-slate-600">Bei „Überarbeitung anfordern“ ist Feedback verpflichtend; bei einer Freigabe ist es optional.</p>
        <textarea id="review-feedback" name="feedback" rows={7} maxLength={CHALLENGE_REVIEW_FEEDBACK_MAX_LENGTH} aria-describedby={`review-feedback-help${state.fieldErrors?.feedback ? " review-feedback-error" : ""}`} aria-invalid={Boolean(state.fieldErrors?.feedback)} className="mt-3 min-h-40 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 leading-7 text-slate-950 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
        {state.fieldErrors?.feedback && <p id="review-feedback-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.feedback}</p>}
      </div>
      <ReviewButton />
      <div aria-live={state.status === "error" ? "assertive" : "polite"}>{state.status !== "idle" && <p className={`rounded-xl border p-4 text-sm font-semibold ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>{state.message}</p>}</div>
    </form>
  );
}

function ReviewOption({ value, label, description }: { value: "approved" | "revision-requested"; label: string; description: string }) {
  return <label className="flex min-h-24 cursor-pointer gap-3 rounded-xl border border-slate-300 bg-white p-4 has-[:checked]:border-blue-700 has-[:checked]:bg-blue-50"><input type="radio" name="decision" value={value} required className="mt-1 size-5 shrink-0 accent-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" /><span><span className="block font-bold text-slate-900">{label}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{description}</span></span></label>;
}

function ReviewButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65 sm:w-auto">{pending ? "Review wird gespeichert …" : "Review verbindlich speichern"}</button>;
}
