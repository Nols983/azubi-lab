"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setAccountDisabledAction, type AdminMutationActionState } from "../../actions/admin-actions";
import type { AccountRole } from "../../lib/auth-types";

const initialState: AdminMutationActionState = { status: "idle", message: "" };

export function AccountStatusActions({
  userId,
  role,
  disabled,
  isCurrentUser = false,
  presentation = "embedded",
}: {
  userId: string;
  role: AccountRole;
  disabled: boolean;
  isCurrentUser?: boolean;
  presentation?: "embedded" | "card";
}) {
  const [state, action] = useActionState(
    setAccountDisabledAction.bind(null, userId, !disabled),
    initialState,
  );
  const headingId = `account-status-${userId}`;
  const className = presentation === "card"
    ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    : "border-t border-slate-200 pt-5";

  return (
    <section aria-labelledby={headingId} className={className}>
      {presentation === "card"
        ? <h3 id={headingId} className="text-xl font-bold text-slate-950">Kontozugriff</h3>
        : <p id={headingId} className="text-sm font-bold text-slate-800">Kontozugriff</p>}

      {isCurrentUser ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">Das eigene Konto kann nicht gesperrt werden.</p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {disabled
              ? "Bei der Reaktivierung bleiben Rolle, Passwort und vorhandene Daten erhalten. Danach ist eine neue Anmeldung erforderlich."
              : "Die Sperrung beendet den geschützten Zugriff sofort. Rolle, Passwort und vorhandene Daten bleiben erhalten."}
          </p>
          {role === "admin" && (
            <p className="mt-2 text-sm leading-6 text-slate-600">Der letzte nutzbare Administrator ist vor einer Sperrung geschützt.</p>
          )}
          <form action={action} className="mt-4 space-y-4">
            {!disabled && (
              <label className="flex min-h-11 items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-slate-800">
                <input type="checkbox" name="confirmed" value="yes" required className="mt-0.5 size-5 shrink-0 accent-blue-800" />
                <span>Ich bestätige, dass dieses Konto gesperrt werden soll.</span>
              </label>
            )}
            <StatusSubmitButton disabled={disabled} />
          </form>
          <div className="mt-4" aria-live={state.status === "error" ? "assertive" : "polite"}>
            {state.status !== "idle" && (
              <p className={`rounded-xl border p-3 text-sm font-semibold text-slate-900 ${state.status === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                {state.message}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function StatusSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const label = disabled ? "Konto reaktivieren" : "Konto sperren";
  const pendingLabel = disabled ? "Konto wird reaktiviert …" : "Konto wird gesperrt …";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65 ${disabled ? "bg-blue-950 hover:bg-blue-900" : "bg-red-700 hover:bg-red-800"}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
