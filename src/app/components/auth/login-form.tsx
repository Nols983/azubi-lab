"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginActionState } from "../../actions/auth-actions";

const initialState: LoginActionState = { message: "" };

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, action] = useActionState(loginAction, initialState);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.message) errorRef.current?.focus();
  }, [state.message]);

  return (
    <form action={action} className="mt-7 space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div>
        <label htmlFor="login" className="block text-sm font-bold text-slate-800">Benutzername oder Kennung</label>
        <input id="login" name="login" type="text" autoComplete="username" required maxLength={254} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-bold text-slate-800">Passwort</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
      </div>
      <div aria-live="assertive" aria-atomic="true">
        {state.message && <p ref={errorRef} tabIndex={-1} className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-slate-900 focus:outline-none">{state.message}</p>}
      </div>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65">{pending ? "Anmeldung läuft …" : "Anmelden"}</button>;
}
