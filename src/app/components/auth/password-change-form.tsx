"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { changeForcedPasswordAction, type PasswordChangeActionState } from "../../actions/account-actions";

const initialState: PasswordChangeActionState = { status: "idle", message: "" };

export function PasswordChangeForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action] = useActionState(changeForcedPasswordAction, initialState);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state.status]);

  return (
    <form action={action} className="mt-7 space-y-5" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label htmlFor="new-password" className="block text-sm font-bold text-slate-800">Neues Passwort</label>
        <input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={256} aria-invalid={Boolean(state.fieldErrors?.password)} aria-describedby={state.fieldErrors?.password ? "new-password-error new-password-help" : "new-password-help"} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
        <p id="new-password-help" className="mt-2 text-sm text-slate-600">12 bis 256 Zeichen. Verwende ein neues, nur dir bekanntes Passwort.</p>
        {state.fieldErrors?.password && <p id="new-password-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.password}</p>}
      </div>
      <div>
        <label htmlFor="password-confirmation" className="block text-sm font-bold text-slate-800">Neues Passwort bestätigen</label>
        <input id="password-confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={256} aria-invalid={Boolean(state.fieldErrors?.confirmation)} aria-describedby={state.fieldErrors?.confirmation ? "password-confirmation-error" : undefined} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
        {state.fieldErrors?.confirmation && <p id="password-confirmation-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.confirmation}</p>}
      </div>
      <div ref={errorRef} tabIndex={-1} className="focus:outline-none" aria-live="assertive">{state.status === "error" && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-slate-900">{state.message}</p>}</div>
      <PasswordSubmitButton />
    </form>
  );
}

function PasswordSubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65">{pending ? "Passwort wird geändert …" : "Passwort ändern"}</button>;
}
