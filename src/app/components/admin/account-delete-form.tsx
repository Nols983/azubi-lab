"use client";

import { useActionState, useEffect, useRef } from "react";
import { deleteAccountAction, retryAccountFileCleanupAction, type AdminMutationActionState } from "../../actions/admin-actions";

import { ACCOUNT_DELETION_WARNING } from "../../lib/account-deletion";

const initial: AdminMutationActionState = { status: "idle", message: "" };

export function AccountDeleteForm({ userId, login }: { userId: string; login: string }) {
  const [state, action, pending] = useActionState(deleteAccountAction.bind(null, userId), initial);
  const message = useRef<HTMLDivElement>(null);
  useEffect(() => { if (state.status !== "idle") message.current?.focus(); }, [state]);
  return <details className="mt-5 rounded-xl border border-red-300 bg-white p-4">
    <summary className="min-h-11 cursor-pointer py-3 font-bold text-red-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600">Konto endgültig löschen</summary>
    <form action={action} className="mt-4 space-y-4">
      <p className="text-sm leading-6 text-slate-700">{ACCOUNT_DELETION_WARNING}</p>
      <label htmlFor={`delete-login-${userId}`} className="block text-sm font-bold text-slate-800">Anmeldekennung zur Bestätigung: <span className="break-all">{login}</span></label>
      <input id={`delete-login-${userId}`} name="confirmationLogin" required autoComplete="off" spellCheck={false} maxLength={254} className="min-h-12 w-full rounded-xl border border-red-300 px-4 text-slate-950 focus:outline-2 focus:outline-red-600" />
      <label className="flex min-h-11 items-start gap-3 text-sm font-semibold text-slate-800"><input type="checkbox" name="confirmed" value="yes" required className="mt-1 size-5 shrink-0 accent-red-700" /><span>Ich bestätige die endgültige Löschung dieses Kontos.</span></label>
      <button disabled={pending} className="min-h-12 rounded-xl bg-red-800 px-5 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600 disabled:opacity-60">{pending ? "Löschen …" : "Konto endgültig löschen"}</button>
      <div ref={message} tabIndex={-1} aria-live="assertive" className="focus:outline-none">{state.status === "error" && <p className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-950">{state.message}</p>}</div>
    </form>
  </details>;
}

export function AccountCleanupRetryForm() {
  const [state, action, pending] = useActionState(retryAccountFileCleanupAction, initial);
  return <form action={action} className="mt-3 space-y-3">
    <button disabled={pending} className="min-h-11 rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60">{pending ? "Bereinigen …" : "Private Dateien erneut bereinigen"}</button>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className="text-sm text-slate-800">{state.message}</p>}
  </form>;
}
