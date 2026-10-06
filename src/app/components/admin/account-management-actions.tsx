"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  changeAccountRoleAction,
  generatePasswordResetLinkAction,
  type AdminMutationActionState,
} from "../../actions/admin-actions";
import { ACCOUNT_ROLE_LABELS, ACCOUNT_ROLES, type AccountRole } from "../../lib/auth-types";
import { AccountStatusActions } from "./account-status-actions";
import { PasswordResetLinkPanel } from "./password-reset-link-panel";

const initialState: AdminMutationActionState = { status: "idle", message: "" };

export function AccountManagementActions({
  userId,
  role,
  disabled,
  isCurrentUser,
}: {
  userId: string;
  role: AccountRole;
  disabled: boolean;
  isCurrentUser: boolean;
}) {
  const [roleState, roleAction] = useActionState(changeAccountRoleAction.bind(null, userId), initialState);
  const [resetState, resetAction] = useActionState(generatePasswordResetLinkAction.bind(null, userId), initialState);

  return (
    <div className="space-y-5">
      <form action={roleAction} className="space-y-3">
        <label htmlFor={`role-${userId}`} className="block text-sm font-bold text-slate-800">Rolle</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <select id={`role-${userId}`} name="role" defaultValue={role} disabled={isCurrentUser} className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-500">
            {ACCOUNT_ROLES.map((option) => <option key={option} value={option}>{ACCOUNT_ROLE_LABELS[option]}</option>)}
          </select>
          <SubmitButton pendingLabel="Rolle wird gespeichert …" disabled={isCurrentUser}>Rolle speichern</SubmitButton>
        </div>
        {isCurrentUser && <p className="text-sm leading-6 text-slate-600">Die eigene Rolle kann nicht geändert werden.</p>}
        <ActionMessage state={roleState} />
      </form>

      <AccountStatusActions
        userId={userId}
        role={role}
        disabled={disabled}
        isCurrentUser={isCurrentUser}
      />

      <div className="border-t border-slate-200 pt-5">
        <p className="text-sm font-bold text-slate-800">Kontowiederherstellung</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">Erzeugt einen 30 Minuten gültigen Einmal-Link. Beim erfolgreichen Einsatz werden bestehende Sitzungen ungültig.</p>
        <form action={resetAction} className="mt-3">
          <SubmitButton pendingLabel="Link wird erzeugt …" disabled={disabled}>Passwort zurücksetzen</SubmitButton>
        </form>
        {disabled && <p className="mt-2 text-sm leading-6 text-slate-600">Für ein gesperrtes Konto kann kein Reset-Link erzeugt werden.</p>}
        <ActionMessage state={resetState} />
        {resetState.status === "success" && resetState.resetUrl && <div className="mt-4"><PasswordResetLinkPanel resetUrl={resetState.resetUrl} /></div>}
      </div>
    </div>
  );
}

function ActionMessage({ state }: { state: AdminMutationActionState }) {
  return <div aria-live={state.status === "error" ? "assertive" : "polite"}>{state.status !== "idle" && <p className={`rounded-xl border p-3 text-sm font-semibold text-slate-900 ${state.status === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>{state.message}</p>}</div>;
}

function SubmitButton({ children, pendingLabel, disabled = false }: { children: string; pendingLabel: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || disabled} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-55">{pending ? pendingLabel : children}</button>;
}
