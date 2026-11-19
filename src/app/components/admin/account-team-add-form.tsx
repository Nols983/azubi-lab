"use client";

import { useActionState } from "react";
import { addTeamMemberAction, type TeamActionState } from "../../actions/team-actions";

export function AccountTeamAddForm({ userId, teams, disabled }: {
  userId: string;
  teams: readonly { id: string; name: string }[];
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(async (previous: TeamActionState, data: FormData) => {
    const teamId = data.get("teamId");
    data.delete("teamId");
    data.set("userId", userId);
    return addTeamMemberAction(typeof teamId === "string" ? teamId : "", previous, data);
  }, { status: "idle", message: "" });
  if (disabled || teams.length === 0) return null;
  return <form action={action} className="grid gap-3 rounded-xl bg-slate-50 p-3">
    <label className="text-sm font-bold text-slate-800">Team hinzufügen
      <select name="teamId" required className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
        <option value="">Team auswählen</option>
        {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
      </select>
    </label>
    <label className="text-sm font-bold text-slate-800">Teamfunktion
      <select name="teamRole" className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="member">Mitglied</option><option value="manager">Teamleitung</option></select>
    </label>
    <button disabled={pending} className="min-h-11 rounded-lg bg-blue-950 px-4 font-bold text-white disabled:opacity-60">{pending ? "Speichern …" : "Team zuordnen"}</button>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className="text-sm text-slate-800">{state.message}</p>}
  </form>;
}
