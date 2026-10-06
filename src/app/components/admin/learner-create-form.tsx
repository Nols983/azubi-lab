"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createLearnerAction, type ProvisioningActionState } from "../../actions/admin-actions";
import { TemporaryPasswordPanel } from "./temporary-password-panel";
import { ACCOUNT_CREATION_ROLES, ACCOUNT_ROLE_LABELS } from "../../lib/auth-types";

const initialState: ProvisioningActionState = { status: "idle", message: "" };

export function LearnerCreateForm() {
  const [state, action] = useActionState(createLearnerAction, initialState);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state.status]);

  if (state.status === "success" && state.temporaryPassword && state.learnerId) {
    return (
      <div ref={statusRef} tabIndex={-1} className="space-y-5 focus:outline-none" aria-live="polite">
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-slate-900">{state.message}</p>
        <TemporaryPasswordPanel password={state.temporaryPassword} />
        <div className="flex flex-wrap gap-4">
          <Link href={state.role === "observer" ? "/admin/konten" : `/admin/lernende/${state.learnerId}`} className="inline-flex min-h-11 items-center rounded-xl bg-blue-950 px-5 py-2 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Konto öffnen</Link>
          <Link href="/admin" className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zur Übersicht</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <label htmlFor="displayName" className="block text-sm font-bold text-slate-800">Anzeigename</label>
        <input id="displayName" name="displayName" type="text" autoComplete="name" required minLength={2} maxLength={120} aria-invalid={Boolean(state.fieldErrors?.displayName)} aria-describedby={state.fieldErrors?.displayName ? "displayName-error" : undefined} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
        {state.fieldErrors?.displayName && <p id="displayName-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.displayName}</p>}
      </div>
      <div>
        <label htmlFor="login" className="block text-sm font-bold text-slate-800">Anmeldekennung</label>
        <input id="login" name="login" type="text" autoComplete="off" required minLength={3} maxLength={64} spellCheck={false} aria-invalid={Boolean(state.fieldErrors?.login)} aria-describedby={state.fieldErrors?.login ? "login-error login-help" : "login-help"} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
        <p id="login-help" className="mt-2 text-sm text-slate-600">Wird normalisiert und ohne Beachtung der Groß-/Kleinschreibung eindeutig gespeichert.</p>
        {state.fieldErrors?.login && <p id="login-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.login}</p>}
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-bold text-slate-800">Kontotyp</label>
        <select id="role" name="role" defaultValue="learner" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200">
          {ACCOUNT_CREATION_ROLES.map((role) => <option key={role} value={role}>{ACCOUNT_ROLE_LABELS[role]}</option>)}
        </select>
        <p className="mt-2 text-sm leading-6 text-slate-600">Betrachter können freigegebene Inhalte nur in der Vorschau erkunden und erzeugen keinen Lernfortschritt.</p>
      </div>
      <div ref={statusRef} tabIndex={-1} aria-live="assertive" className="focus:outline-none">
        {state.status === "error" && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-slate-900">{state.message}</p>}
      </div>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65 sm:w-auto">{pending ? "Konto wird angelegt …" : "Konto anlegen"}</button>;
}
