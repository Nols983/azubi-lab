import type { Metadata } from "next";
import Link from "next/link";
import { AdminAccessDenied } from "../../components/admin/admin-access-denied";
import { CreateTopicProposalForm, ReviewTopicProposalForm } from "../../components/admin/topic-proposal-forms";
import { hasCapability } from "../../lib/authorization";
import { TOPIC_PROPOSAL_STATUS_LABELS } from "../../lib/topic-proposal-domain";
import { getTrainerPageAccess } from "../../lib/server/admin-page-access";
import { listProposalTeams, listTopicProposals } from "../../lib/server/topic-proposal-repository";

export const metadata: Metadata = { title: "Themenvorschläge" };
export const dynamic = "force-dynamic";

export default async function TopicProposalsPage() {
  const access = await getTrainerPageAccess("/admin/themenvorschlaege");
  if (!access.allowed || !hasCapability(access.user.role, "submitTopicProposals")) return <AdminAccessDenied />;
  const [teams, proposals] = await Promise.all([listProposalTeams(access.user.id), listTopicProposals(access.user.id)]);
  const canReview = hasCapability(access.user.role, "reviewTopicProposals");
  return <div className="mx-auto max-w-5xl space-y-8">
    <header>
      <Link href="/admin" className="inline-flex min-h-11 items-center font-bold text-blue-700 hover:underline">← Zur Verwaltung</Link>
      <h1 className="mt-5 text-3xl font-bold text-slate-950 sm:text-4xl">Themenvorschläge</h1>
      <p className="mt-3 leading-7 text-slate-600">Schlage Ausbildungsthemen für dein Team vor und verfolge den Bearbeitungsstand. Die Administration prüft die Vorschläge. Eine Annahme veröffentlicht noch kein Lernmodul.</p>
    </header>
    <section aria-labelledby="create-topic-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 id="create-topic-heading" className="text-2xl font-bold text-slate-950">Thema einreichen</h2>
      <CreateTopicProposalForm teams={teams} />
    </section>
    <section aria-labelledby="topics-heading">
      <h2 id="topics-heading" className="text-2xl font-bold text-slate-950">{canReview ? "Alle Vorschläge" : "Meine Vorschläge"}</h2>
      {proposals.length === 0 && <p className="mt-5 rounded-xl border border-slate-200 bg-white p-5 text-slate-600">Noch keine Themenvorschläge vorhanden.</p>}
      <div className="mt-5 grid gap-5">
        {proposals.map((proposal) => <article key={proposal.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="break-words text-xl font-bold text-slate-950">{proposal.title}</h3>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-900">{TOPIC_PROPOSAL_STATUS_LABELS[proposal.status]}</span>
          </div>
          <p className="mt-2 break-words text-sm text-slate-600">{proposal.category} · {proposal.team_name}{!proposal.team_active && " (archiviert)"} · {proposal.creator_name}</p>
          <dl className="mt-5 space-y-4 text-slate-700">
            <div><dt className="font-bold text-slate-900">Beschreibung</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-7">{proposal.description}</dd></div>
            <div><dt className="font-bold text-slate-900">Lernziel</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-7">{proposal.learning_objective}</dd></div>
            {proposal.admin_feedback && <div className="rounded-xl bg-slate-50 p-4"><dt className="font-bold text-slate-900">Administratorrückmeldung</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-7">{proposal.admin_feedback}</dd></div>}
          </dl>
          <p className="mt-5 text-sm text-slate-500">Eingereicht: {formatDate(proposal.created_at)} · Aktualisiert: {formatDate(proposal.updated_at)}</p>
          {canReview && <ReviewTopicProposalForm key={proposal.updated_at.toISOString()} id={proposal.id} status={proposal.status} feedback={proposal.admin_feedback} />}
        </article>)}
      </div>
    </section>
  </div>;
}
function formatDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(date);
}
