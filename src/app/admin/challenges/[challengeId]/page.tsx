import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAccessDenied } from "../../../components/admin/admin-access-denied";
import { ChallengeAssignmentForm } from "../../../components/challenges/challenge-assignment-form";
import { ChallengeForm } from "../../../components/challenges/challenge-form";
import { AssignmentOverdueBadge, AssignmentStatusBadge, ChallengeDifficultyBadge, ChallengeStatusBadge } from "../../../components/challenges/challenge-badges";
import { formatChallengeDate } from "../../../lib/challenge-presenters";
import { getTrainerPageAccess } from "../../../lib/server/admin-page-access";
import { getAdminChallengeDetail } from "../../../lib/server/challenge-service";

export const metadata: Metadata = { title: "Challenge bearbeiten" };
export const dynamic = "force-dynamic";

export default async function AdminChallengeDetailPage({ params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params;
  const callbackUrl = `/admin/challenges/${encodeURIComponent(challengeId)}`;
  const access = await getTrainerPageAccess(callbackUrl);
  if (!access.allowed) return <AdminAccessDenied />;
  const detail = await getAdminChallengeDetail(challengeId);
  if (!detail) notFound();
  const { challenge, assignments, availableLearners, counts } = detail;

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <Link href="/admin/challenges" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zu den Challenges</Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Challenge-Definition</p><h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{challenge.title}</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">{challenge.shortDescription}</p></div>
          <div className="flex flex-wrap gap-2"><ChallengeStatusBadge status={challenge.status} /><ChallengeDifficultyBadge difficulty={challenge.difficulty} /></div>
        </div>
      </header>

      <section aria-labelledby="edit-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="edit-heading" className="text-2xl font-bold text-slate-950">Inhalt bearbeiten</h2>
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Änderungen gelten auch für bereits zugewiesene Challenges. Eine Versionierung von Inhalten ist in diesem Meilenstein nicht vorgesehen.</p>
        <div className="mt-6"><ChallengeForm key={challenge.updatedAt.toISOString()} challenge={challenge} /></div>
      </section>

      <section aria-labelledby="assignment-summary-heading">
        <h2 id="assignment-summary-heading" className="text-2xl font-bold text-slate-950">Zuweisungsübersicht</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><SummaryCard label="Offen" value={counts.notStarted} /><SummaryCard label="In Bearbeitung" value={counts.inProgress} /><SummaryCard label="Review offen" value={counts.submitted} /><SummaryCard label="Überarbeitung" value={counts.revisionRequested} /><SummaryCard label="Freigegeben" value={counts.approved} /><SummaryCard label="Überfällig" value={counts.overdue} /></dl>
      </section>

      <section aria-labelledby="assign-heading" className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="assign-heading" className="text-2xl font-bold text-slate-950">Lernenden zuweisen</h2>
        {challenge.status !== "published" ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 leading-7 text-amber-950">Neue Zuweisungen sind nur für veröffentlichte Challenges möglich. Bestehende Zuweisungen bleiben auch nach einer Archivierung erhalten.</p> : availableLearners.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 leading-7 text-slate-700">Alle aktiven Lernkonten haben diese Challenge bereits erhalten, oder es sind keine aktiven Lernkonten vorhanden.</p> : <div className="mt-6"><ChallengeAssignmentForm challengeId={challenge.id} learners={availableLearners} /></div>}
      </section>

      <section aria-labelledby="assignments-heading">
        <h2 id="assignments-heading" className="text-2xl font-bold text-slate-950">Bestehende Zuweisungen</h2>
        <p className="mt-2 leading-7 text-slate-600">Der Status folgt dem Abgabe- und Review-Verlauf. Frühere Abschlüsse bleiben ausdrücklich als Legacy-Zustand erhalten.</p>
        {assignments.length === 0 ? <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">Noch keine Zuweisungen vorhanden.</p> : <div className="mt-5 grid gap-4">{assignments.map((assignment) => <article key={assignment.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-slate-950">{assignment.learner.displayName}</h3><p className="mt-1 break-all text-sm text-slate-600">{assignment.learner.login}{assignment.learner.disabled ? " · Konto gesperrt" : ""}</p></div><div className="flex flex-wrap gap-2"><AssignmentStatusBadge status={assignment.status} />{assignment.isOverdue && <AssignmentOverdueBadge />}</div></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4"><DataItem label="Zugewiesen" value={formatChallengeDate(assignment.assignedAt)} /><DataItem label="Fällig" value={assignment.dueAt ? formatChallengeDate(assignment.dueAt) : "Keine Fälligkeit"} /><DataItem label="Letzte Abgabe" value={assignment.latestSubmission ? `Version ${assignment.latestSubmission.submissionNumber} · ${formatChallengeDate(assignment.latestSubmission.submittedAt)}` : "Noch keine"} /><DataItem label="Freigegeben" value={assignment.approvedAt ? formatChallengeDate(assignment.approvedAt) : "Noch nicht"} /></dl>{assignment.status === "legacy-completed" && <p className="mt-4 text-sm font-semibold text-emerald-900">Früherer Abschluss vom {assignment.legacyCompletedAt ? formatChallengeDate(assignment.legacyCompletedAt) : "dokumentierten Zeitpunkt"}; keine Abgabehistorie erforderlich.</p>}{assignment.latestSubmission?.submittedAfterDue && <p className="mt-4 text-sm font-semibold text-red-800">Die letzte Version wurde nach der Fälligkeit eingereicht.</p>}{assignment.latestSubmission?.review?.feedback && <p className="mt-4 line-clamp-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">Letztes Feedback: {assignment.latestSubmission.review.feedback}</p>}{assignment.status === "submitted" && assignment.latestSubmission && <Link href={`/admin/challenges/abgaben/${assignment.latestSubmission.id}`} className="mt-4 inline-flex min-h-11 items-center rounded-lg font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Abgabe prüfen <span aria-hidden="true" className="ml-2">→</span></Link>}</article>)}</div>}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><dt className="text-sm font-semibold text-slate-600">{label}</dt><dd className="mt-2 text-3xl font-bold text-slate-950">{value}</dd></div>; }
function DataItem({ label, value }: { label: string; value: string }) { return <div><dt className="font-bold text-slate-800">{label}</dt><dd className="mt-1 break-words text-slate-600">{value}</dd></div>; }
