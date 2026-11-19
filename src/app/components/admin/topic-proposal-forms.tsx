"use client";

import { useActionState } from "react";
import { createTopicProposalAction, reviewTopicProposalAction, type TopicProposalActionState } from "../../actions/topic-proposal-actions";
import { TOPIC_PROPOSAL_STATUSES, TOPIC_PROPOSAL_STATUS_LABELS, type TopicProposalStatus } from "../../lib/topic-proposal-domain";

const initial: TopicProposalActionState = { status: "idle", message: "" };
const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal text-slate-950 focus:outline-2 focus:outline-blue-600";
const buttonClass = "min-h-12 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60";

export function CreateTopicProposalForm({ teams }: { teams: readonly { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createTopicProposalAction, initial);
  if (teams.length === 0) return <p className="mt-4 text-slate-600">Du leitest derzeit kein aktives Team. Für eine Einreichung ist eine Teamleitung erforderlich.</p>;
  return <form action={action} className="mt-5 space-y-5">
    <label className="block text-sm font-bold text-slate-800">Titel<input name="title" required minLength={3} maxLength={160} className={inputClass} /></label>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block text-sm font-bold text-slate-800">Themenbereich<input name="category" required minLength={2} maxLength={100} placeholder="z. B. Netzwerktechnik" className={inputClass} /></label>
      <label className="block text-sm font-bold text-slate-800">Team<select name="teamId" required className={inputClass}><option value="">Team auswählen</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
    </div>
    <label className="block text-sm font-bold text-slate-800">Beschreibung<textarea name="description" required minLength={10} maxLength={6000} rows={4} className={inputClass} /></label>
    <label className="block text-sm font-bold text-slate-800">Lernziel<textarea name="learningObjective" required minLength={10} maxLength={3000} rows={3} className={inputClass} /></label>
    <button disabled={pending} className={buttonClass}>{pending ? "Einreichen …" : "Thema vorschlagen"}</button>
    <ActionMessage state={state} />
  </form>;
}

export function ReviewTopicProposalForm({ id, status, feedback }: { id: string; status: TopicProposalStatus; feedback: string | null }) {
  const [state, action, pending] = useActionState(reviewTopicProposalAction.bind(null, id), initial);
  return <form action={action} className="mt-5 space-y-4 border-t border-slate-200 pt-5">
    <label className="block text-sm font-bold text-slate-800">Bearbeitungsstatus<select name="status" defaultValue={status} className={inputClass}>{TOPIC_PROPOSAL_STATUSES.map((value) => <option key={value} value={value}>{TOPIC_PROPOSAL_STATUS_LABELS[value]}</option>)}</select></label>
    <label className="block text-sm font-bold text-slate-800">Administratorrückmeldung (optional)<textarea name="feedback" defaultValue={feedback ?? ""} maxLength={3000} rows={3} className={inputClass} /></label>
    <button disabled={pending} className={buttonClass}>{pending ? "Speichern …" : "Prüfung speichern"}</button>
    <ActionMessage state={state} />
  </form>;
}
function ActionMessage({ state }: { state: TopicProposalActionState }) {
  return state.status === "idle" ? null : <p role={state.status === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm font-semibold ${state.status === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{state.message}</p>;
}
