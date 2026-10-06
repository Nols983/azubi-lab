import { formatEvidenceBytes } from "../../lib/challenge-evidence";
import { formatChallengeDate } from "../../lib/challenge-presenters";
import type { ChallengeAssignmentComment } from "../../lib/server/challenge-comment-repository";
import type { ChallengeRubricCriterion } from "../../lib/server/challenge-repository";
import type {
  ChallengeReviewCriterionResult,
  ChallengeSubmissionAttachment,
} from "../../lib/server/challenge-submission-repository";
import { ACCOUNT_ROLE_LABELS } from "../../lib/auth-types";

export function RubricOverview({ criteria }: { criteria: readonly ChallengeRubricCriterion[] }) {
  if (criteria.length === 0) return null;
  const total = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  return (
    <section aria-labelledby="rubric-expectations-heading" className="rounded-2xl border border-teal-200 bg-teal-50/60 p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-bold uppercase tracking-[0.12em] text-teal-900">Transparente Erwartungen</p><h2 id="rubric-expectations-heading" className="mt-1 text-2xl font-bold text-slate-950">Bewertungsrubrik</h2></div>
        <p className="rounded-full border border-teal-300 bg-white px-4 py-2 text-sm font-bold text-teal-950">Maximal {total} Punkte</p>
      </div>
      <ol className="mt-5 grid gap-4 lg:grid-cols-2">{criteria.map((criterion) => <li key={criterion.id} className="rounded-xl border border-teal-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-slate-950">{criterion.position}. {criterion.title}</h3><span className="shrink-0 text-sm font-bold text-teal-900">{criterion.maxPoints} P.</span></div>{criterion.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{criterion.description}</p>}</li>)}</ol>
      <p className="mt-4 text-sm leading-6 text-slate-600">Die Punktzahl dokumentiert die Bewertung. Sie entscheidet nicht automatisch über Freigabe oder Überarbeitung.</p>
    </section>
  );
}

export function SubmissionAttachments({ attachments }: { attachments: readonly ChallengeSubmissionAttachment[] }) {
  if (attachments.length === 0) return <p className="mt-4 text-sm text-slate-600">Keine Nachweise zu dieser Version.</p>;
  return (
    <div className="mt-5">
      <p className="font-bold text-slate-900">Private Nachweise</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">{attachments.map((attachment) => <li key={attachment.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"><a href={`/api/challenge-evidence/${attachment.id}`} className="inline-flex min-h-11 max-w-full items-center break-all font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{attachment.originalFilename} herunterladen</a><p className="mt-1 text-xs text-slate-500">{attachment.mimeType} · {formatEvidenceBytes(attachment.byteSize)}</p></li>)}</ul>
    </div>
  );
}

export function RubricEvaluation({ results }: { results: readonly ChallengeReviewCriterionResult[] }) {
  if (results.length === 0) return null;
  const awarded = results.reduce((sum, result) => sum + result.awardedPoints, 0);
  const maximum = results.reduce((sum, result) => sum + result.maxPoints, 0);
  return (
    <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold text-slate-950">Rubrikbewertung dieser Version</p><p className="rounded-full bg-white px-3 py-1 text-sm font-bold text-teal-950">{awarded} / {maximum} Punkte</p></div>
      <ol className="mt-4 space-y-3">{results.map((result) => <li key={result.id} className="rounded-lg bg-white p-3"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-slate-900">{result.position}. {result.criterionTitle}</p><p className="shrink-0 text-sm font-bold text-teal-900">{result.awardedPoints} / {result.maxPoints}</p></div>{result.criterionDescription && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{result.criterionDescription}</p>}</li>)}</ol>
    </div>
  );
}

export function AssignmentCommentThread({ comments }: { comments: readonly ChallengeAssignmentComment[] }) {
  return comments.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-slate-600">Noch keine Kommentare vorhanden.</p> : (
    <ol className="mt-5 space-y-4">{comments.map((comment) => <li key={comment.id}><article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-slate-950">{comment.author.displayName} <span className="ml-1 rounded-full border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-700">{ACCOUNT_ROLE_LABELS[comment.author.role]}</span></p><time dateTime={comment.createdAt.toISOString()} className="text-sm text-slate-500">{formatChallengeDate(comment.createdAt)}</time></div><p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-700">{comment.body}</p></article></li>)}</ol>
  );
}
