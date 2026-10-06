"use client";

import { useActionState } from "react";
import {
  addTeamMemberAction,
  changeTeamMemberRoleAction,
  createTeamAction,
  removeTeamMemberAction,
  setTeamArchivedAction,
  updateTeamAction,
  type TeamActionState,
} from "../../actions/team-actions.ts";
import { ACCOUNT_ROLE_LABELS, type AccountRole } from "../../lib/auth-types.ts";
import { TEAM_ROLE_LABELS, TEAM_ROLES, type TeamRole } from "../../lib/team-domain.ts";

const initialState: TeamActionState = { status: "idle", message: "" };
const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";
const primaryButton = "inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60";
const secondaryButton = "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60";

export function CreateTeamForm() {
  const [state, action, pending] = useActionState(createTeamAction, initialState);
  return (
    <form action={action} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] lg:items-end">
      <TeamFields state={state} />
      <button type="submit" disabled={pending} className={primaryButton}>{pending ? "Anlegen …" : "Team anlegen"}</button>
      <ActionMessage state={state} className="lg:col-span-3" />
    </form>
  );
}

export function EditTeamForm({ team }: {
  team: { id: string; name: string; description?: string; active: boolean };
}) {
  const actionWithId = updateTeamAction.bind(null, team.id);
  const archiveAction = setTeamArchivedAction.bind(null, team.id, team.active);
  const [state, action, pending] = useActionState(actionWithId, initialState);
  const [archiveState, archiveFormAction, archivePending] = useActionState(archiveAction, initialState);
  return (
    <div className="mt-5 space-y-4">
      <form action={action} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] lg:items-end">
        <TeamFields state={state} name={team.name} description={team.description} idSuffix={team.id} />
        <button type="submit" disabled={pending} className={primaryButton}>{pending ? "Speichern …" : "Team speichern"}</button>
        <ActionMessage state={state} className="lg:col-span-3" />
      </form>
      <form action={archiveFormAction}>
        <button type="submit" disabled={archivePending} className={secondaryButton}>
          {archivePending ? "Status wird geändert …" : team.active ? "Team archivieren" : "Team reaktivieren"}
        </button>
        <ActionMessage state={archiveState} />
      </form>
    </div>
  );
}

export function AddTeamMemberForm({
  teamId,
  accounts,
  active,
}: {
  teamId: string;
  accounts: readonly { id: string; displayName: string; role: AccountRole }[];
  active: boolean;
}) {
  const actionWithTeam = addTeamMemberAction.bind(null, teamId);
  const [state, action, pending] = useActionState(actionWithTeam, initialState);
  if (!active) return <p className="mt-4 text-sm text-slate-600">Archivierte Teams nehmen keine neuen Mitglieder auf.</p>;
  if (accounts.length === 0) return <p className="mt-4 text-sm text-slate-600">Alle aktiven Konten sind bereits zugeordnet.</p>;
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.45fr)_auto] sm:items-end">
      <label className="text-sm font-bold text-slate-800">Konto
        <select name="userId" required className={inputClass}>
          <option value="">Konto auswählen</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.displayName} · {ACCOUNT_ROLE_LABELS[account.role]}</option>)}
        </select>
      </label>
      <TeamRoleSelect />
      <button type="submit" disabled={pending} className={primaryButton}>{pending ? "Zuordnen …" : "Hinzufügen"}</button>
      <ActionMessage state={state} className="sm:col-span-3" />
    </form>
  );
}

export function MembershipControls({
  teamId,
  userId,
  teamRole,
  active,
}: {
  teamId: string;
  userId: string;
  teamRole: TeamRole;
  active: boolean;
}) {
  const roleActionWithIds = changeTeamMemberRoleAction.bind(null, teamId, userId);
  const removeActionWithIds = removeTeamMemberAction.bind(null, teamId, userId);
  const [roleState, roleAction, rolePending] = useActionState(roleActionWithIds, initialState);
  const [removeState, removeAction, removePending] = useActionState(removeActionWithIds, initialState);
  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3">
      {active && (
        <form action={roleAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <TeamRoleSelect key={teamRole} defaultValue={teamRole} compact />
          <button type="submit" disabled={rolePending} className={secondaryButton}>{rolePending ? "Speichern …" : "Rolle speichern"}</button>
        </form>
      )}
      <ActionMessage state={roleState} />
      <form action={removeAction}>
        <button type="submit" disabled={removePending} className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-red-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600 disabled:opacity-60">
          {removePending ? "Entfernen …" : "Aus Team entfernen"}
        </button>
      </form>
      <ActionMessage state={removeState} />
    </div>
  );
}

function TeamFields({ state, name = "", description = "", idSuffix = "new" }: {
  state: TeamActionState;
  name?: string;
  description?: string;
  idSuffix?: string;
}) {
  const nameId = `team-name-${idSuffix}`;
  const descriptionId = `team-description-${idSuffix}`;
  return (
    <>
      <label htmlFor={nameId} className="text-sm font-bold text-slate-800">Teamname
        <input id={nameId} name="name" defaultValue={name} required minLength={2} maxLength={80} aria-invalid={Boolean(state.fieldErrors?.name)} className={inputClass} />
        {state.fieldErrors?.name && <span className="mt-2 block text-sm font-semibold text-red-700">{state.fieldErrors.name}</span>}
      </label>
      <label htmlFor={descriptionId} className="text-sm font-bold text-slate-800">Beschreibung <span className="font-normal text-slate-500">(optional)</span>
        <input id={descriptionId} name="description" defaultValue={description} maxLength={500} aria-invalid={Boolean(state.fieldErrors?.description)} className={inputClass} />
        {state.fieldErrors?.description && <span className="mt-2 block text-sm font-semibold text-red-700">{state.fieldErrors.description}</span>}
      </label>
    </>
  );
}

function TeamRoleSelect({ defaultValue = "member", compact = false }: { defaultValue?: TeamRole; compact?: boolean }) {
  return (
    <label className={`text-sm font-bold text-slate-800 ${compact ? "min-w-44" : ""}`}>Teamrolle
      <select name="teamRole" defaultValue={defaultValue} className={inputClass}>
        {TEAM_ROLES.map((role) => <option key={role} value={role}>{TEAM_ROLE_LABELS[role]}</option>)}
      </select>
    </label>
  );
}

function ActionMessage({ state, className = "" }: { state: TeamActionState; className?: string }) {
  if (state.status === "idle") return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`${className} rounded-xl border p-3 text-sm font-semibold ${state.status === "error" ? "border-red-300 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{state.message}</p>;
}
