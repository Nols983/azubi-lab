"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { generatePasswordResetLinkAction, type AdminMutationActionState } from "../../actions/admin-actions";
import { AccountStatusActions } from "./account-status-actions";
import { PasswordResetLinkPanel } from "./password-reset-link-panel";

const initialState: AdminMutationActionState = { status: "idle", message: "" };

export function LearnerAccountActions({ userId, disabled }: { userId: string; disabled: boolean }) {
  const [resetState, resetAction] = useActionState(generatePasswordResetLinkAction.bind(null, userId), initialState);
  return (
    <div className="space-y-6">
      <section aria-labelledby="password-reset-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 id="password-reset-heading" className="text-xl font-bold text-slate-950">Passwort zurücksetzen</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Erzeugt einen einmaligen Link. Das Passwort wird erst geändert, wenn die vorgesehene Person den Link verwendet.</p>
        <form action={resetAction} className="mt-4"><MutationButton pendingLabel="Link wird erzeugt …" disabled={disabled}>Passwort-Link erzeugen</MutationButton></form>
        {disabled && <p className="mt-2 text-sm leading-6 text-slate-600">Für ein gesperrtes Konto kann kein Reset-Link erzeugt werden.</p>}
        <ActionMessage state={resetState} />
        {resetState.status === "success" && resetState.resetUrl && <div className="mt-4"><PasswordResetLinkPanel resetUrl={resetState.resetUrl} /></div>}
      </section>

      <AccountStatusActions userId={userId} role="learner" disabled={disabled} presentation="card" />
    </div>
  );
}

function ActionMessage({ state }: { state: AdminMutationActionState }) {
  return <div className="mt-4" aria-live={state.status === "error" ? "assertive" : "polite"}>{state.status !== "idle" && <p className={`rounded-xl border p-4 text-sm font-semibold text-slate-900 ${state.status === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>{state.message}</p>}</div>;
}

function MutationButton({ children, pendingLabel, disabled = false }: { children: string; pendingLabel: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || disabled} className="inline-flex min-h-11 items-center rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-65">{pending ? pendingLabel : children}</button>;
}
