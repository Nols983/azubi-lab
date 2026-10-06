import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignmentStartTracker } from "../../components/challenges/assignment-progress-controls";
import { ChallengeSubmissionForm } from "../../components/challenges/challenge-submission-form";
import { ChallengeCommentForm } from "../../components/challenges/challenge-comment-form";
import {
  AssignmentCommentThread,
  RubricEvaluation,
  RubricOverview,
  SubmissionAttachments,
} from "../../components/challenges/challenge-detail-sections";
import {
  AssignmentOverdueBadge,
  AssignmentLateSubmissionBadge,
  AssignmentStatusBadge,
  ChallengeDifficultyBadge,
} from "../../components/challenges/challenge-badges";
import { LearnerChallengeAccessDenied } from "../../components/challenges/learner-challenge-access-denied";
import { formatChallengeDate } from "../../lib/challenge-presenters";
import type { ChallengeSubmission } from "../../lib/server/challenge-submission-repository";
import { getOwnedLearnerAssignment } from "../../lib/server/challenge-service";
import { getLearnerPageAccess } from "../../lib/server/learner-page-access";

export const metadata: Metadata = { title: "Challenge bearbeiten" };
export const dynamic = "force-dynamic";

export default async function LearnerChallengeDetailPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const callbackUrl = `/challenges/${encodeURIComponent(assignmentId)}`;
  const access = await getLearnerPageAccess(callbackUrl);
  if (!access.allowed) return <LearnerChallengeAccessDenied />;
  const detail = await getOwnedLearnerAssignment(assignmentId);
  if (!detail) notFound();
  const { assignment, submissions, rubricCriteria, comments } = detail;
  const canSubmit = assignment.status === "not-started" || assignment.status === "in-progress" || assignment.status === "revision-requested";

  return (
    <div className="space-y-8 sm:space-y-10">
      <AssignmentStartTracker assignmentId={assignment.id} shouldStart={assignment.status === "not-started"} />
      <header>
        <Link href="/challenges" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zu meinen Challenges</Link>
        <div className="mt-5 flex flex-wrap gap-2"><AssignmentStatusBadge status={assignment.status} audience="learner" />{assignment.isOverdue && <AssignmentOverdueBadge />}{assignment.latestSubmission?.submittedAfterDue && <AssignmentLateSubmissionBadge />}<ChallengeDifficultyBadge difficulty={assignment.challenge.difficulty} /></div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Persönliche Zuweisung</p>
        <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{assignment.challenge.title}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">{assignment.challenge.shortDescription}</p>
      </header>

      {assignment.challenge.definitionStatus === "archived" && <p className="rounded-xl border border-slate-300 bg-slate-100 p-4 leading-7 text-slate-700">Diese Challenge wurde für neue Zuweisungen archiviert. Deine bestehende Aufgabe und der Abgabe-Workflow bleiben nutzbar.</p>}
      {assignment.status === "revision-requested" && assignment.latestSubmission?.review && (
        <section aria-labelledby="revision-feedback-heading" className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-900">Handlungsbedarf</p>
          <h2 id="revision-feedback-heading" className="mt-2 text-2xl font-bold text-slate-950">Feedback zur Überarbeitung</h2>
          <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-800">{assignment.latestSubmission.review.feedback}</p>
          <p className="mt-4 text-sm text-slate-600">Review am {formatChallengeDate(assignment.latestSubmission.review.reviewedAt)} durch {assignment.latestSubmission.review.reviewedBy.displayName}</p>
        </section>
      )}

      <section aria-labelledby="assignment-data-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="assignment-data-heading" className="text-xl font-bold text-slate-950">Rahmen der Aufgabe</h2>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4"><DataItem label="Zugewiesen" value={formatChallengeDate(assignment.assignedAt)} /><DataItem label="Fällig" value={assignment.dueAt ? formatChallengeDate(assignment.dueAt) : "Keine Fälligkeit"} /><DataItem label="Geschätzte Dauer" value={assignment.challenge.estimatedMinutes ? `${assignment.challenge.estimatedMinutes} Minuten` : "Keine Angabe"} /><DataItem label="Begonnen" value={assignment.startedAt ? formatChallengeDate(assignment.startedAt) : "Wird beim Öffnen erfasst"} /></dl>
        {assignment.isOverdue && <p className="mt-4 text-sm font-semibold text-red-800">Die Fälligkeit ist überschritten. Eine Abgabe bleibt möglich und wird als verspätet gekennzeichnet.</p>}
      </section>

      <section aria-labelledby="instructions-heading" className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="instructions-heading" className="text-2xl font-bold text-slate-950">Arbeitsauftrag</h2>
        <div className="mt-5 whitespace-pre-wrap break-words text-base leading-8 text-slate-700">{assignment.challenge.instructions}</div>
      </section>

      <RubricOverview criteria={rubricCriteria} />

      <section aria-labelledby="submission-heading" className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6 sm:p-8">
        <h2 id="submission-heading" className="text-2xl font-bold text-slate-950">Abgabe und Review</h2>
        {canSubmit ? (
          <><p className="mt-2 max-w-3xl leading-7 text-slate-700">{assignment.status === "revision-requested" ? "Reiche nach dem Feedback eine neue Version ein. Frühere Versionen und Reviews bleiben unverändert erhalten." : "Sende deine ausgearbeitete Lösung zur Prüfung. Nach der Annahme ist die Zuweisung abgeschlossen."}</p><div className="mt-6"><ChallengeSubmissionForm assignmentId={assignment.id} revision={assignment.status === "revision-requested"} /></div></>
        ) : assignment.status === "submitted" ? (
          <p className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-4 leading-7 text-violet-950">Version {assignment.latestSubmission?.submissionNumber} ist eingereicht und wartet auf Review. Bis zur Entscheidung ist keine weitere Abgabe möglich.</p>
        ) : assignment.status === "approved" ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 leading-7 text-emerald-950">Die aktuelle Abgabe wurde am {assignment.approvedAt ? formatChallengeDate(assignment.approvedAt) : "Review-Zeitpunkt"} angenommen. Die Zuweisung ist abgeschlossen.</p>
        ) : (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 leading-7 text-emerald-950">Diese Zuweisung wurde vor Einführung des Review-Workflows am {assignment.legacyCompletedAt ? formatChallengeDate(assignment.legacyCompletedAt) : "dokumentierten Zeitpunkt"} als abgeschlossen markiert. Sie bleibt als früherer Abschluss erhalten und kann nicht neu eingereicht werden.</p>
        )}
      </section>

      <section aria-labelledby="comments-heading" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
        <h2 id="comments-heading" className="text-2xl font-bold text-slate-950">Rückfragen &amp; Kommentare</h2>
        <p className="mt-2 leading-7 text-slate-600">Diese Unterhaltung ergänzt die Aufgabe, ist aber getrennt von formalem Review-Feedback.</p>
        <AssignmentCommentThread comments={comments} />
        <ChallengeCommentForm assignmentId={assignment.id} audience="learner" />
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="text-2xl font-bold text-slate-950">Abgabehistorie</h2>
        <p className="mt-2 leading-7 text-slate-600">Jede Version und jedes Review bleiben als unveränderliche Historie sichtbar.</p>
        {submissions.length === 0 ? <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">Noch keine Abgabe vorhanden.</p> : <ol className="mt-5 space-y-5">{submissions.map((submission) => <SubmissionHistoryItem key={submission.id} submission={submission} dueAt={assignment.dueAt} />)}</ol>}
      </section>
    </div>
  );
}

function SubmissionHistoryItem({ submission, dueAt }: { submission: ChallengeSubmission; dueAt: Date | null }) {
  const late = Boolean(dueAt && submission.submittedAt.getTime() > dueAt.getTime());
  return <li><article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-950">Version {submission.submissionNumber}</h3><p className="mt-1 text-sm text-slate-600">Eingereicht am {formatChallengeDate(submission.submittedAt)}{late ? " · nach Fälligkeit" : ""}</p></div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${!submission.review ? "border-violet-200 bg-violet-50 text-violet-800" : submission.review.decision === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-950"}`}>{!submission.review ? "Review offen" : submission.review.decision === "approved" ? "Abgeschlossen" : "Überarbeitung"}</span></div><div className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 leading-7 text-slate-800">{submission.content}</div><SubmissionAttachments attachments={submission.attachments} />{submission.review && <div className="mt-4 rounded-xl border border-slate-200 p-4"><p className="font-bold text-slate-900">Formales Trainer-Feedback</p>{submission.review.feedback ? <p className="mt-2 whitespace-pre-wrap break-words leading-7 text-slate-700">{submission.review.feedback}</p> : <p className="mt-2 text-slate-600">Abgeschlossen ohne zusätzliches Feedback.</p>}<RubricEvaluation results={submission.review.criterionResults} /><p className="mt-3 text-sm text-slate-500">{formatChallengeDate(submission.review.reviewedAt)} · {submission.review.reviewedBy.displayName}</p></div>}</article></li>;
}

function DataItem({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-4"><dt className="font-bold text-slate-800">{label}</dt><dd className="mt-1 break-words text-slate-600">{value}</dd></div>; }
