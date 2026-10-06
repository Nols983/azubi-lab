import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAccessDenied } from "../../../../components/admin/admin-access-denied";
import { ChallengeReviewForm } from "../../../../components/challenges/challenge-review-form";
import { ChallengeCommentForm } from "../../../../components/challenges/challenge-comment-form";
import {
  AssignmentCommentThread,
  RubricEvaluation,
  RubricOverview,
  SubmissionAttachments,
} from "../../../../components/challenges/challenge-detail-sections";
import { ChallengeDifficultyBadge, ChallengeStatusBadge } from "../../../../components/challenges/challenge-badges";
import { formatChallengeDate } from "../../../../lib/challenge-presenters";
import type { ChallengeSubmission } from "../../../../lib/server/challenge-submission-repository";
import { getTrainerPageAccess } from "../../../../lib/server/admin-page-access";
import { getAdminSubmissionReview } from "../../../../lib/server/challenge-service";

export const metadata: Metadata = { title: "Challenge-Abgabe prüfen" };
export const dynamic = "force-dynamic";

export default async function ChallengeSubmissionReviewPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const callbackUrl = `/admin/challenges/abgaben/${encodeURIComponent(submissionId)}`;
  const access = await getTrainerPageAccess(callbackUrl);
  if (!access.allowed) return <AdminAccessDenied />;
  const detail = await getAdminSubmissionReview(submissionId);
  if (!detail) notFound();
  const { assignment, challenge, learner, submission, history, comments } = detail;

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <Link href="/admin/challenges" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zu den Challenge-Reviews</Link>
        <div className="mt-5 flex flex-wrap gap-2"><ChallengeStatusBadge status={challenge.definitionStatus} /><ChallengeDifficultyBadge difficulty={challenge.difficulty} />{submission.submittedAfterDue && <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-800">Nach Fälligkeit eingereicht</span>}</div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-violet-800">Trainer-Review · Version {submission.submissionNumber}</p>
        <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{challenge.title}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">Abgabe von {learner.displayName} ({learner.login}){learner.disabled ? " · Konto gesperrt" : ""}</p>
      </header>

      <section aria-labelledby="review-context-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="review-context-heading" className="text-xl font-bold text-slate-950">Review-Kontext</h2>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4"><DataItem label="Zugewiesen" value={formatChallengeDate(assignment.assignedAt)} /><DataItem label="Fällig" value={assignment.dueAt ? formatChallengeDate(assignment.dueAt) : "Keine Fälligkeit"} /><DataItem label="Eingereicht" value={formatChallengeDate(submission.submittedAt)} /><DataItem label="Version" value={String(submission.submissionNumber)} /></dl>
      </section>

      <section aria-labelledby="review-instructions-heading" className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="review-instructions-heading" className="text-2xl font-bold text-slate-950">Arbeitsauftrag</h2>
        <div className="mt-5 whitespace-pre-wrap break-words leading-8 text-slate-700">{challenge.instructions}</div>
      </section>

      <section aria-labelledby="submitted-content-heading" className="rounded-2xl border border-violet-200 bg-violet-50/50 p-6 sm:p-8">
        <h2 id="submitted-content-heading" className="text-2xl font-bold text-slate-950">Eingereichte Lösung</h2>
        <div className="mt-5 whitespace-pre-wrap break-words rounded-xl border border-violet-200 bg-white p-5 leading-8 text-slate-800">{submission.content}</div>
        <SubmissionAttachments attachments={submission.attachments} />
      </section>

      <RubricOverview criteria={challenge.rubricCriteria} />

      <section aria-labelledby="admin-comments-heading" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
        <h2 id="admin-comments-heading" className="text-2xl font-bold text-slate-950">Rückfragen &amp; Kommentare</h2>
        <p className="mt-2 leading-7 text-slate-600">Kommentare sind informelle, unveränderliche Kommunikation. Formales Review-Feedback wird separat gespeichert.</p>
        <AssignmentCommentThread comments={comments} />
        <ChallengeCommentForm assignmentId={assignment.id} audience="admin" />
      </section>

      <section aria-labelledby="decision-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="decision-heading" className="text-2xl font-bold text-slate-950">Review-Entscheidung</h2>
        {submission.review ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><p className="font-bold text-emerald-950">Unveränderlich gespeichert: {submission.review.decision === "approved" ? "Freigegeben" : "Überarbeitung angefordert"}</p>{submission.review.feedback ? <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-800">{submission.review.feedback}</p> : <p className="mt-3 text-slate-700">Ohne zusätzliches Feedback freigegeben.</p>}<RubricEvaluation results={submission.review.criterionResults} /><p className="mt-3 text-sm text-slate-600">{formatChallengeDate(submission.review.reviewedAt)} · {submission.review.reviewedBy.displayName}</p></div> : <><p className="mt-2 leading-7 text-slate-600">Die Entscheidung wird einmalig gespeichert. Für eine angeforderte Überarbeitung ist konkretes Feedback erforderlich.</p><div className="mt-6"><ChallengeReviewForm submissionId={submission.id} rubricCriteria={challenge.rubricCriteria} /></div></>}
      </section>

      <section aria-labelledby="trainer-history-heading">
        <h2 id="trainer-history-heading" className="text-2xl font-bold text-slate-950">Vollständige Abgabehistorie</h2>
        <ol className="mt-5 space-y-4">{history.map((item) => <HistoryItem key={item.id} submission={item} current={item.id === submission.id} />)}</ol>
      </section>
    </div>
  );
}

function HistoryItem({ submission, current }: { submission: ChallengeSubmission; current: boolean }) {
  return <li><article className={`rounded-2xl border bg-white p-5 shadow-sm ${current ? "border-violet-400" : "border-slate-200"}`}><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold text-slate-950">Version {submission.submissionNumber}{current ? " · ausgewählt" : ""}</h3><p className="text-sm text-slate-600">{formatChallengeDate(submission.submittedAt)}</p></div><div className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 leading-7 text-slate-800">{submission.content}</div><SubmissionAttachments attachments={submission.attachments} />{submission.review && <div className="mt-4 border-l-4 border-slate-300 pl-4"><p className="font-bold text-slate-900">{submission.review.decision === "approved" ? "Freigegeben" : "Überarbeitung angefordert"}</p><p className="mt-1 whitespace-pre-wrap break-words text-slate-700">{submission.review.feedback || "Ohne zusätzliches Feedback."}</p><RubricEvaluation results={submission.review.criterionResults} /></div>}</article></li>;
}

function DataItem({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-4"><dt className="font-bold text-slate-800">{label}</dt><dd className="mt-1 break-words text-slate-600">{value}</dd></div>; }
