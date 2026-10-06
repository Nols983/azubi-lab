import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAccessDenied } from "../../../components/admin/admin-access-denied";
import { CurriculumAssignmentEditor, CurriculumAssignmentForm } from "../../../components/admin/curriculum-assignment-form";
import { AssignmentOverdueBadge, AssignmentStatusBadge, ChallengeDifficultyBadge } from "../../../components/challenges/challenge-badges";
import { CurriculumPlanCard } from "../../../components/curriculum/curriculum-plan-card";
import { ModuleStatus } from "../../../components/learning/module-status";
import { ProgressBar } from "../../../components/progress-bar";
import { getAssessmentGroupLabel } from "../../../data/quiz-bank/categories";
import { learnerDetailSectionHref, learnerDetailSections, parseLearnerDetailSection } from "../../../lib/admin-navigation";
import { formatChallengeDate } from "../../../lib/challenge-presenters";
import { getTrainerPageAccess } from "../../../lib/server/admin-page-access";
import { getAdminLearnerDetail } from "../../../lib/server/admin-service";

export const metadata: Metadata = { title: "Lernkonto" };
export const dynamic = "force-dynamic";

type LearnerDetail = NonNullable<Awaited<ReturnType<typeof getAdminLearnerDetail>>>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LearnerDetailPage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: SearchParams }) {
  const [{ userId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const section = parseLearnerDetailSection(rawSearchParams.section);
  const callbackUrl = learnerDetailSectionHref(userId, section);
  const access = await getTrainerPageAccess(callbackUrl);
  if (!access.allowed) return <AdminAccessDenied />;
  const detail = await getAdminLearnerDetail(userId);
  if (!detail) notFound();

  return (
    <div className="space-y-7 sm:space-y-9">
      <header>
        <Link href="/admin/lernende" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zu den Lernenden</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">Lernkonto · Rolle: Lernende</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{detail.learner.displayName}</h1>
            <p className="mt-2 break-all text-slate-600">{detail.learner.login}</p>
          </div>
          {detail.learner.disabledAt && <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-900">Konto inaktiv</span>}
        </div>
        <nav aria-label="Bereiche des Lernkontos" className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {learnerDetailSections.map((item) => {
            const active = item.id === section;
            return (
              <Link key={item.id} href={learnerDetailSectionHref(detail.learner.id, item.id)} aria-current={active ? "page" : undefined} className={"inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 " + (active ? "border-blue-950 bg-blue-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-800")}>
                {item.label}{active && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">Aktiv</span>}
              </Link>
            );
          })}
        </nav>
        <details className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Kontodaten</summary>
          <dl className="grid gap-3 border-t border-slate-100 py-4 text-sm sm:grid-cols-3">
            <DataItem label="Anmeldekennung" value={detail.learner.login} breakAll />
            <DataItem label="Sicherheitsrolle" value="Lernkonto" />
            <DataItem label="Erstellt" value={formatDate(detail.learner.createdAt)} />
          </dl>
        </details>
      </header>

      {section === "overview" && <OverviewSection detail={detail} />}
      {section === "learning" && <LearningSection detail={detail} />}
      {section === "practice" && <PracticeSection detail={detail} />}
      {section === "labs" && <LabsSection detail={detail} />}
      {section === "progression" && <ProgressionSection detail={detail} />}
      {section === "activity" && <ActivitySection detail={detail} />}
    </div>
  );
}

function OverviewSection({ detail }: { detail: LearnerDetail }) {
  const { learner, progress, labs, planning, progression, activity } = detail;
  const completedLabs = labs.items.filter((lab) => lab.hasCompleted).length;
  return (
    <section aria-labelledby="overview-heading">
      <div><h2 id="overview-heading" className="text-2xl font-bold text-slate-950">Aktueller Stand</h2><p className="mt-2 text-slate-600">Die wichtigsten Fakten für das nächste Betreuungsgespräch.</p></div>
      <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><h3 className="text-lg font-bold text-slate-950">Gesamtfortschritt</h3><span className="text-2xl font-bold text-blue-950">{progress.overall.percentage} %</span></div>
        <div className="mt-4"><ProgressBar value={progress.overall.percentage} label={"Gesamtfortschritt " + learner.displayName} /></div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewValue label="Module abgeschlossen" value={progress.overall.completedModules + " von " + progress.modules.length} />
        <OverviewValue label="Normale Labs abgeschlossen" value={completedLabs + " von " + labs.canonicalTotal} />
        <OverviewValue label="Level / XP" value={"Level " + progression.level.level + " · " + formatNumber(progression.level.totalXp) + " XP"} />
        <OverviewValue label="Aktiver Lernplan" value={planning.active.length + " Module"} />
        <OverviewValue label="Aktiver Titel" value={progression.activeTitle?.displayName ?? "Kein aktiver Titel"} />
        <OverviewValue label="Letzte Lernaktivität" value={activity[0] ? formatDate(activity[0].timestamp, true) + " · " + activity[0].label : "Noch keine Lernaktivität"} wide />
      </dl>
    </section>
  );
}

function LearningSection({ detail }: { detail: LearnerDetail }) {
  const { learner, progress, planning } = detail;
  return (
    <section aria-labelledby="learning-heading" className="space-y-7">
      <div><h2 id="learning-heading" className="text-2xl font-bold text-slate-950">Lernen</h2><p className="mt-2 text-slate-600">Module, Quizaktivität und Lernplanung für dieses Lernkonto.</p></div>
      <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><h3 className="text-lg font-bold text-slate-950">Gesamtfortschritt</h3><span className="text-2xl font-bold text-blue-950">{progress.overall.percentage} %</span></div>
        <div className="mt-4"><ProgressBar value={progress.overall.percentage} label={"Gesamtfortschritt " + learner.displayName} /></div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3"><ProgressStat label="Abgeschlossen" value={progress.overall.completedModules} /><ProgressStat label="In Bearbeitung" value={progress.overall.inProgressModules} /><ProgressStat label="Nicht begonnen" value={progress.overall.notStartedModules} /></dl>
      </div>

      <section aria-labelledby="learning-plan-heading">
        <h3 id="learning-plan-heading" className="text-xl font-bold text-slate-950">Lernplan</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">Module und Zieltermine für diesen Lernenden verwalten.</p>
        {planning.active.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm">Noch keine aktiven Module zugewiesen.</p>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {planning.active.map((assignment) => (
              <CurriculumPlanCard key={assignment.id} assignment={assignment} showAssigner>
                <details className="mt-5 rounded-xl border border-slate-200 px-4 py-2">
                  <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Zuweisung bearbeiten</summary>
                  <CurriculumAssignmentEditor key={assignment.updatedAt.toISOString()} assignmentId={assignment.id} targetAtIso={assignment.targetAt?.toISOString() ?? ""} note={assignment.note ?? ""} />
                </details>
              </CurriculumPlanCard>
            ))}
          </div>
        )}
        <details className="mt-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <summary className="min-h-11 cursor-pointer py-2 text-lg font-bold text-blue-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">+ Module zuweisen</summary>
          {learner.disabledAt ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Das Lernkonto ist inaktiv. Neue Zuweisungen sind erst nach der Reaktivierung möglich.</p> : planning.availableModules.length === 0 ? <p className="mt-4 text-sm text-slate-600">Alle Module sind bereits aktiv zugewiesen.</p> : <div className="mt-5 border-t border-slate-100 pt-5"><CurriculumAssignmentForm learnerId={learner.id} modules={planning.availableModules} /></div>}
        </details>
        {planning.archived.length > 0 && <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="min-h-11 cursor-pointer py-2 font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Entfernte Zuweisungen ({planning.archived.length})</summary><div className="mt-5 grid gap-4 xl:grid-cols-2">{planning.archived.map((assignment) => <CurriculumPlanCard key={assignment.id} assignment={assignment} showAssigner showArchived />)}</div></details>}
      </section>

      <section aria-labelledby="modules-heading">
        <h3 id="modules-heading" className="text-xl font-bold text-slate-950">Fortschritt je Modul</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {progress.modules.map((module) => (
            <article key={module.slug} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3"><p className="text-sm font-semibold text-blue-700">{module.category}</p><ModuleStatus status={module.summary.status} /></div>
              <h4 className="mt-2 text-lg font-bold text-slate-950">{module.title}</h4>
              <div className="mt-4"><ProgressBar value={module.summary.percentage} label={"Fortschritt " + module.title} /></div>
              <p className="mt-3 text-sm text-slate-600">{module.summary.completedLessons} von {module.summary.totalLessons} Lektionen · {module.quiz ? "Abschlussquiz versucht" : "Abschlussquiz offen"}</p>
              {module.quiz && <p className="mt-2 text-sm text-slate-600">Bestwert: {module.quiz.bestCorrectCount} von {module.quiz.bestTotal} ({module.quiz.bestPercentage} %) · {module.quiz.attempts} Versuche</p>}
              <details className="mt-4 rounded-xl border border-slate-200 px-4 py-2"><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Abgeschlossene Lektionen ({module.completedLessons.length})</summary>{module.completedLessons.length > 0 ? <ul className="mb-2 list-disc space-y-2 pl-5 text-sm text-slate-600">{module.completedLessons.map((title) => <li key={title}>{title}</li>)}</ul> : <p className="mb-2 text-sm text-slate-600">Noch keine Lektion abgeschlossen.</p>}</details>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function PracticeSection({ detail }: { detail: LearnerDetail }) {
  const { practice, challenges } = detail;
  const practicedCategories = practice.categories.filter((category) => category.answeredQuestionCount > 0);
  return (
    <section aria-labelledby="practice-heading" className="space-y-7">
      <div><h2 id="practice-heading" className="text-2xl font-bold text-slate-950">Praxis</h2><p className="mt-2 text-slate-600">Übungsquiz und zugewiesene Challenges.</p></div>
      <section aria-labelledby="practice-quiz-heading">
        <h3 id="practice-quiz-heading" className="text-xl font-bold text-slate-950">Übungsquiz</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><OverviewValue label="Abgeschlossen" value={formatNumber(practice.completedQuizCount)} /><OverviewValue label="Beantwortete Fragen" value={formatNumber(practice.answeredQuestionCount)} /><OverviewValue label="Richtig beantwortet" value={formatNumber(practice.correctQuestionCount)} /><OverviewValue label="Anteil richtig" value={practice.overallAccuracyPercentage === null ? "Noch keine Auswertung" : practice.overallAccuracyPercentage + " %"} /></dl>
        {practicedCategories.length > 0 && <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="min-h-11 cursor-pointer py-2 font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Bearbeitete Lernbereiche ({practicedCategories.length})</summary><ul className="mt-3 grid gap-3 sm:grid-cols-2">{practicedCategories.map((category) => <li key={category.categoryId} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><span className="font-bold text-slate-950">{getAssessmentGroupLabel(category.categoryId)}</span><span className="mt-1 block">{category.correctQuestionCount} von {category.answeredQuestionCount} richtig</span></li>)}</ul></details>}
      </section>
      <section aria-labelledby="challenges-heading">
        <h3 id="challenges-heading" className="text-xl font-bold text-slate-950">Challenges</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6"><ProgressStat label="Offen" value={challenges.counts.notStarted} /><ProgressStat label="In Bearbeitung" value={challenges.counts.inProgress} /><ProgressStat label="Review offen" value={challenges.counts.submitted} /><ProgressStat label="Überarbeitung" value={challenges.counts.revisionRequested} /><ProgressStat label="Freigegeben" value={challenges.counts.approved} /><ProgressStat label="Überfällig" value={challenges.counts.overdue} /></dl>
        {challenges.assignments.length === 0 ? <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm">Keine Challenges zugewiesen.</p> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{challenges.assignments.map((assignment) => <article key={assignment.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap gap-2"><AssignmentStatusBadge status={assignment.status} />{assignment.isOverdue && <AssignmentOverdueBadge />}<ChallengeDifficultyBadge difficulty={assignment.challenge.difficulty} /></div><h4 className="mt-3 text-lg font-bold text-slate-950">{assignment.challenge.title}</h4><p className="mt-2 text-sm leading-6 text-slate-600">{assignment.challenge.shortDescription}</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><DataItem label="Fällig" value={assignment.dueAt ? formatChallengeDate(assignment.dueAt) : "Keine Fälligkeit"} /><DataItem label="Letzte Abgabe" value={assignment.latestSubmission ? "Version " + assignment.latestSubmission.submissionNumber + " · " + formatChallengeDate(assignment.latestSubmission.submittedAt) : "Noch keine"} /></dl>{assignment.status === "submitted" && assignment.latestSubmission && <Link href={"/admin/challenges/abgaben/" + assignment.latestSubmission.id} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Abgabe prüfen <span aria-hidden="true" className="ml-2">→</span></Link>}</article>)}</div>}
      </section>
    </section>
  );
}

function LabsSection({ detail }: { detail: LearnerDetail }) {
  const { labs } = detail;
  const completed = labs.items.filter((lab) => lab.hasCompleted).length;
  const active = labs.items.filter((lab) => lab.hasActive).length;
  const support = labs.items.filter((lab) => lab.supportSuggested).length;
  return (
    <section aria-labelledby="labs-heading">
      <div><h2 id="labs-heading" className="text-2xl font-bold text-slate-950">Labs</h2><p className="mt-2 text-slate-600">Normale Lab-Versuche und Hinweise für die Betreuung. Das Tutorial ist nicht enthalten.</p></div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3"><ProgressStat label="Abgeschlossen" value={completed} /><ProgressStat label="Aktive Versuche" value={active} /><ProgressStat label="Unterstützung prüfen" value={support} /></dl>
      {labs.items.length === 0 ? <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm">Noch kein normaler Lab-Versuch vorhanden.</p> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{labs.items.map((lab) => <article key={lab.labId} className={"min-w-0 rounded-2xl border bg-white p-5 shadow-sm " + (lab.supportSuggested ? "border-amber-300" : "border-slate-200")}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-blue-700">{lab.category}</p><h3 className="mt-1 text-lg font-bold text-slate-950">{lab.title}</h3></div><LabState hasCompleted={lab.hasCompleted} hasActive={lab.hasActive} /></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><DataItem label="Versuche" value={String(lab.runCount)} /><DataItem label="Hinweise verwendet" value={String(lab.hintCount)} /><DataItem label="Letzte Aktivität" value={formatDate(lab.latestActivityAt, true)} /><DataItem label="Letzter Abschluss" value={lab.latestCompletedAt ? formatDate(lab.latestCompletedAt, true) : "Noch nicht abgeschlossen"} /></dl></article>)}</div>}
    </section>
  );
}

function ProgressionSection({ detail }: { detail: LearnerDetail }) {
  const { progression } = detail;
  const earnedBadges = progression.badges.filter((badge) => badge.unlocked);
  return (
    <section aria-labelledby="progression-heading" className="space-y-6">
      <div><h2 id="progression-heading" className="text-2xl font-bold text-slate-950">Progression</h2><p className="mt-2 text-slate-600">Persönliche XP, Titel, Abzeichen und nächste Meilensteine.</p></div>
      <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6"><dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><DataItem label="Level" value={String(progression.level.level)} /><DataItem label="Gesamt-XP" value={formatNumber(progression.level.totalXp)} /><DataItem label="XP bis zum nächsten Level" value={formatNumber(progression.level.xpRemainingToNextLevel)} /><DataItem label="Aktiver Titel" value={progression.activeTitle?.displayName ?? "Kein aktiver Titel"} /></dl><div className="mt-5"><ProgressBar value={progression.level.progressPercentage} label={"Fortschritt in Level " + progression.level.level} /></div></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="badges-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 id="badges-heading" className="text-lg font-bold text-slate-950">Verdiente Abzeichen</h3>{earnedBadges.length === 0 ? <p className="mt-3 text-sm text-slate-600">Noch kein Abzeichen verdient.</p> : <ul className="mt-3 space-y-3">{earnedBadges.map((badge) => <li key={badge.id} className="rounded-xl bg-slate-50 p-4"><p className="font-bold text-slate-950">{badge.displayName}</p><p className="mt-1 text-sm text-slate-600">{badge.description}</p></li>)}</ul>}</section>
        <section aria-labelledby="milestones-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 id="milestones-heading" className="text-lg font-bold text-slate-950">Nächste Meilensteine</h3>{progression.nextMilestones.length === 0 ? <p className="mt-3 text-sm text-slate-600">Aktuell kein weiterer Meilenstein ausgewiesen.</p> : <ul className="mt-3 space-y-3">{progression.nextMilestones.map((milestone) => <li key={milestone.rewardId} className="rounded-xl bg-slate-50 p-4"><p className="font-bold text-slate-950">{milestone.displayName}</p><p className="mt-1 text-sm text-slate-600">{milestone.current} von {milestone.target}</p></li>)}</ul>}</section>
      </div>
    </section>
  );
}

function ActivitySection({ detail }: { detail: LearnerDetail }) {
  return (
    <section aria-labelledby="activity-heading">
      <div><h2 id="activity-heading" className="text-2xl font-bold text-slate-950">Aktivität</h2><p className="mt-2 text-slate-600">Lernereignisse aus Modulen, Übungsquiz, Challenges und normalen Labs in zeitlicher Reihenfolge.</p></div>
      {detail.activity.length === 0 ? <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm">Noch keine Lernaktivität vorhanden.</p> : <ol className="mt-5 space-y-3">{detail.activity.map((item) => <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-bold text-slate-950">{item.label}</p>{item.detail && <p className="mt-1 text-sm text-slate-600">{item.detail}</p>}</div><time dateTime={item.timestamp.toISOString()} className="shrink-0 text-sm text-slate-500">{formatDate(item.timestamp, true)}</time></div></li>)}</ol>}
    </section>
  );
}

function OverviewValue({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={"rounded-2xl border border-slate-200 bg-white p-5 shadow-sm " + (wide ? "sm:col-span-2 xl:col-span-3" : "")}><dt className="text-sm font-semibold text-slate-600">{label}</dt><dd className="mt-2 break-words text-lg font-bold text-slate-950">{value}</dd></div>;
}

function DataItem({ label, value, breakAll = false }: { label: string; value: string; breakAll?: boolean }) {
  return <div className="rounded-xl bg-slate-50 p-4"><dt className="font-bold text-slate-800">{label}</dt><dd className={"mt-1 text-slate-600 " + (breakAll ? "break-all" : "")}>{value}</dd></div>;
}

function ProgressStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><dt className="text-sm font-medium text-slate-600">{label}</dt><dd className="mt-1 text-2xl font-bold text-slate-950">{value}</dd></div>;
}

function LabState({ hasCompleted, hasActive }: { hasCompleted: boolean; hasActive: boolean }) {
  const label = hasCompleted && hasActive ? "Abgeschlossen · Wiederholung aktiv" : hasCompleted ? "Abgeschlossen" : "In Arbeit";
  const style = hasCompleted ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-blue-200 bg-blue-50 text-blue-800";
  return <span className={"rounded-full border px-3 py-1 text-xs font-bold " + style}>{label}</span>;
}

function formatDate(value: Date, includeTime = false) {
  return new Intl.DateTimeFormat("de-DE", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}
