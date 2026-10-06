"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  resetPasswordAction,
  type PasswordResetActionState,
} from "../../actions/password-reset-actions";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../../lib/password-policy";
import { isPasswordResetTokenFormat } from "../../lib/password-reset-token";

const initialState: PasswordResetActionState = { status: "idle", message: "" };

export function PasswordResetForm() {
  const [state, action] = useActionState(resetPasswordAction, initialState);
  const [token, setToken] = useState<string | null>();
  const messageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    function captureFragment() {
      const fragmentToken = new URLSearchParams(window.location.hash.slice(1)).get("token");
      const nextToken = isPasswordResetTokenFormat(fragmentToken) ? fragmentToken : null;
      queueMicrotask(() => setToken(nextToken));
      clearFragment();
    }
    captureFragment();
    window.addEventListener("hashchange", captureFragment);
    return () => window.removeEventListener("hashchange", captureFragment);
  }, []);

  useEffect(() => {
    if (state.message) messageRef.current?.focus();
  }, [state.message]);

  if (token === undefined) return <p className="mt-5 text-sm font-semibold text-slate-600" role="status">Reset-Link wird geprüft …</p>;
  if (token === null) {
    return <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 leading-7 text-slate-900">Dieser Link ist ungültig, abgelaufen oder wurde bereits verwendet. Bitte fordere bei der Administration einen neuen Link an.</p>;
  }

  return (
    <form action={action} className="mt-7 space-y-5">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="new-password" className="block text-sm font-bold text-slate-800">Neues Passwort</label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          aria-describedby="password-requirements password-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
        />
        <p id="password-requirements" className="mt-2 text-sm leading-6 text-slate-600">{PASSWORD_MIN_LENGTH} bis {PASSWORD_MAX_LENGTH} Zeichen.</p>
        {state.fieldErrors?.password && <p id="password-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.password}</p>}
      </div>
      <div>
        <label htmlFor="password-confirmation" className="block text-sm font-bold text-slate-800">Neues Passwort bestätigen</label>
        <input
          id="password-confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          aria-describedby="confirmation-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
        />
        {state.fieldErrors?.confirmation && <p id="confirmation-error" className="mt-2 text-sm font-semibold text-red-700">{state.fieldErrors.confirmation}</p>}
      </div>
      <div aria-live="assertive" aria-atomic="true">
        {state.message && <p ref={messageRef} tabIndex={-1} className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-slate-900 focus:outline-none">{state.message}</p>}
      </div>
      <ResetButton />
    </form>
  );
}

function clearFragment() {
  if (window.location.hash) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
}

function ResetButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65">{pending ? "Passwort wird gespeichert …" : "Neues Passwort speichern"}</button>;
}
