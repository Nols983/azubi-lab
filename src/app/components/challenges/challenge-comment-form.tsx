"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  addAdminChallengeCommentAction,
  addLearnerChallengeCommentAction,
  type CommentActionState,
} from "../../actions/challenge-actions";
import { CHALLENGE_COMMENT_MAX_LENGTH } from "../../lib/challenge-domain";

const initialState: CommentActionState = { status: "idle", message: "" };

export function ChallengeCommentForm({ assignmentId, audience }: { assignmentId: string; audience: "learner" | "admin" }) {
  const action = audience === "admin" ? addAdminChallengeCommentAction : addLearnerChallengeCommentAction;
  const [state, formAction] = useActionState(action.bind(null, assignmentId), initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);
  return (
    <form ref={formRef} action={formAction} className="mt-5 space-y-4">
      <div>
        <label htmlFor={`challenge-comment-${audience}`} className="block font-bold text-slate-900">
          {audience === "admin" ? "Trainer-Kommentar hinzufügen" : "Kommentar oder Rückfrage hinzufügen"}
        </label>
        <p id={`challenge-comment-help-${audience}`} className="mt-2 text-sm leading-6 text-slate-600">Kommentare sind Klartext, bleiben unverändert erhalten und ändern weder Abgabe- noch Reviewstatus.</p>
        <textarea
          id={`challenge-comment-${audience}`}
          name="body"
          required
          maxLength={CHALLENGE_COMMENT_MAX_LENGTH}
          rows={4}
          aria-invalid={Boolean(state.fieldErrors?.body)}
          aria-describedby={`${`challenge-comment-help-${audience}`}${state.fieldErrors?.body ? ` challenge-comment-error-${audience}` : ""}`}
          className="mt-3 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 leading-7 text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        />
        {state.fieldErrors?.body && <p id={`challenge-comment-error-${audience}`} className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.body}</p>}
      </div>
      <CommentButton audience={audience} />
      <div aria-live={state.status === "error" ? "assertive" : "polite"}>{state.status !== "idle" && <p className={`rounded-xl border p-4 text-sm font-semibold ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>{state.message}</p>}</div>
    </form>
  );
}

function CommentButton({ audience }: { audience: "learner" | "admin" }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65 sm:w-auto">{pending ? "Kommentar wird gespeichert …" : audience === "admin" ? "Trainer-Kommentar senden" : "Kommentar senden"}</button>;
}
