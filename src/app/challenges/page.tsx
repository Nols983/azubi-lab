import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AssignmentLateSubmissionBadge, AssignmentOverdueBadge, AssignmentStatusBadge, ChallengeDifficultyBadge } from "../components/challenges/challenge-badges";
import { formatChallengeDate } from "../lib/challenge-presenters";
import type { ChallengeAssignment } from "../lib/server/challenge-assignment-repository";
import { getChallengeOverviewPageData } from "../lib/server/challenge-service";

export const metadata: Metadata = { title: "Challenges" };
export const dynamic = "force-dynamic";

export default async function ChallengesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const data = await getChallengeOverviewPageData();
  if (data.audience === "password-change") redirect("/konto/passwort-aendern?callbackUrl=%2Fchallenges");
  if (data.audience === "anonymous") return <AudienceMessage kind="anonymous" />;
  if (data.audience === "admin") return <AudienceMessage kind="admin" />;
  if (data.audience === "preview") return <ChallengePreviewCatalogue challenges={data.challenges} />;
  if (data.audience === "unavailable") return <AudienceMessage kind="unavailable" />;

  const filter = parseFilter((await searchParams).status);
  const filtered = filter === "open"
    ? data.assignments.filter((assignment) => assignment.status !== "approved" && assignment.status !== "legacy-completed")
    : filter === "completed"
      ? data.assignments.filter((assignment) => assignment.status === "approved" || assignment.status === "legacy-completed")
      : data.assignments;
  const actionRequired = filtered.filter((assignment) => assignment.status === "revision-requested");
  const active = filtered.filter((assignment) => assignment.status === "not-started" || assignment.status === "in-progress");
  const submitted = filtered.filter((assignment) => assignment.status === "submitted");
  const completed = filtered.filter((assignment) => assignment.status === "approved" || assignment.status === "legacy-completed");

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Praxisaufgaben</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Meine Challenges</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">Bearbeite dir persönlich zugewiesene Aufgaben. Challenge-Fortschritt bleibt getrennt vom Lernfortschritt der Module.</p>
      </header>

      <section aria-labelledby="challenge-summary-heading">
        <h2 id="challenge-summary-heading" className="sr-only">Statusübersicht</h2>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><SummaryCard label="Offen" value={data.counts.notStarted} /><SummaryCard label="In Bearbeitung" value={data.counts.inProgress} /><SummaryCard label="Review offen" value={data.counts.submitted} /><SummaryCard label="Überarbeitung" value={data.counts.revisionRequested} /><SummaryCard label="Abgeschlossen" value={data.counts.approved} /><SummaryCard label="Fälligkeit überschritten" value={data.counts.overdue} /></dl>
      </section>

      <nav aria-label="Eigene Challenges filtern" className="flex flex-wrap gap-2">
        <FilterLink href="/challenges" active={filter === "all"}>Alle</FilterLink>
        <FilterLink href="/challenges?status=open" active={filter === "open"}>Offen</FilterLink>
        <FilterLink href="/challenges?status=completed" active={filter === "completed"}>Abgeschlossen</FilterLink>
      </nav>

      {data.assignments.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><h2 className="text-xl font-bold text-slate-950">Keine Zuweisungen</h2><p className="mt-2 leading-7 text-slate-600">Aktuell sind dir keine Challenges zugewiesen.</p><Link href="/lernen" className="mt-5 inline-flex min-h-11 items-center rounded-lg font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zu den Lernmodulen</Link></section>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 leading-7 text-slate-700 shadow-sm">In diesem Filter gibt es keine Challenges.</p>
      ) : (
        <div className="space-y-8">
          {actionRequired.length > 0 && <ChallengeSection id="revision-challenges" title="Überarbeitung erforderlich" assignments={actionRequired} />}
          {active.length > 0 && <ChallengeSection id="active-challenges" title="Offen und in Bearbeitung" assignments={active} />}
          {submitted.length > 0 && <ChallengeSection id="submitted-challenges" title="Wartet auf Review" assignments={submitted} />}
          {completed.length > 0 && <ChallengeSection id="completed-challenges" title={`Abgeschlossen (${completed.length})`} assignments={completed} />}
        </div>
      )}
    </div>
  );
}

function ChallengeSection({ id, title, assignments }: { id: string; title: string; assignments: readonly ChallengeAssignment[] }) {
  return <section aria-labelledby={id}><h2 id={id} className="text-2xl font-bold text-slate-950">{title}</h2><div className="mt-5 grid gap-5 lg:grid-cols-2">{assignments.map((assignment) => <ChallengeCard key={assignment.id} assignment={assignment} />)}</div></section>;
}

function ChallengeCard({ assignment }: { assignment: ChallengeAssignment }) {
  return <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap gap-2"><AssignmentStatusBadge status={assignment.status} audience="learner" />{assignment.isOverdue && <AssignmentOverdueBadge />}{assignment.latestSubmission?.submittedAfterDue && <AssignmentLateSubmissionBadge />}<ChallengeDifficultyBadge difficulty={assignment.challenge.difficulty} /></div><h3 className="mt-4 break-words text-xl font-bold text-slate-950">{assignment.challenge.title}</h3><p className="mt-2 leading-7 text-slate-600">{assignment.challenge.shortDescription}</p><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><DataItem label="Geschätzte Dauer" value={assignment.challenge.estimatedMinutes ? `${assignment.challenge.estimatedMinutes} Minuten` : "Keine Angabe"} /><DataItem label="Fällig" value={assignment.dueAt ? formatChallengeDate(assignment.dueAt) : "Keine Fälligkeit"} /></dl>{assignment.status === "revision-requested" && assignment.latestSubmission?.review && <p className="mt-4 line-clamp-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">Feedback: {assignment.latestSubmission.review.feedback}</p>}{assignment.challenge.definitionStatus === "archived" && <p className="mt-4 text-sm font-semibold text-slate-600">Die Challenge ist archiviert; deine bestehende Zuweisung bleibt nutzbar.</p>}<div className="mt-auto pt-6"><Link href={`/challenges/${assignment.id}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Challenge öffnen <span aria-hidden="true" className="ml-2">→</span></Link></div></article>;
}

function ChallengePreviewCatalogue({ challenges }: { challenges: Extract<Awaited<ReturnType<typeof getChallengeOverviewPageData>>, { audience: "preview" }>["challenges"] }) {
  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Schreibgeschützte Vorschau</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Challenge-Katalog</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">Veröffentlichte Praxisaufgaben können hier ohne Zuweisung, Abgabe, Kommentar oder Review angesehen werden. Personen- und Fortschrittsdaten werden nicht geladen.</p>
      </header>
      {challenges.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 leading-7 text-slate-700 shadow-sm">Aktuell sind keine veröffentlichten Challenges verfügbar.</p>
      ) : (
        <ul className="grid gap-5 lg:grid-cols-2">
          {challenges.map((challenge) => (
            <li key={challenge.id}>
              <article className="h-full min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap gap-2"><ChallengeDifficultyBadge difficulty={challenge.difficulty} /><span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">Nur ansehen</span></div>
                <h2 className="mt-4 break-words text-xl font-bold text-slate-950">{challenge.title}</h2>
                <p className="mt-2 leading-7 text-slate-600">{challenge.shortDescription}</p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><DataItem label="Geschätzte Dauer" value={challenge.estimatedMinutes ? `${challenge.estimatedMinutes} Minuten` : "Keine Angabe"} /><DataItem label="Bewertungsraster" value={`${challenge.rubricCriterionCount} Kriterien · ${challenge.rubricTotalPoints} Punkte`} /></dl>
                <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer font-bold text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Aufgabenbeschreibung ansehen</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{challenge.instructions}</p></details>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AudienceMessage({ kind }: { kind: "anonymous" | "admin" | "unavailable" }) {
  return <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Praxisaufgaben</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Challenges</h1>{kind === "anonymous" ? <><p className="mt-4 leading-7 text-slate-600">Melde dich mit deinem Lernkonto an, um deine persönlichen Challenge-Zuweisungen zu sehen.</p><Link href="/login?callbackUrl=%2Fchallenges" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Anmelden</Link></> : kind === "admin" ? <><p className="mt-4 leading-7 text-slate-600">Administrationskonten besitzen keinen persönlichen Challenge-Fortschritt. Challenges und Zuweisungen verwaltest du im Admin-Bereich.</p><Link href="/admin/challenges" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Challenges verwalten</Link></> : <p className="mt-4 leading-7 text-slate-600">Für diese Kontorolle steht kein Challenge-Arbeitsbereich zur Verfügung.</p>}</section>;
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) { return <Link href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${active ? "border-blue-900 bg-blue-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-800"}`}>{children}</Link>; }
function SummaryCard({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><dt className="text-sm font-semibold text-slate-600">{label}</dt><dd className="mt-2 text-3xl font-bold text-slate-950">{value}</dd></div>; }
function DataItem({ label, value }: { label: string; value: string }) { return <div><dt className="font-bold text-slate-800">{label}</dt><dd className="mt-1 break-words text-slate-600">{value}</dd></div>; }
function parseFilter(value: unknown): "all" | "open" | "completed" { return value === "open" || value === "completed" ? value : "all"; }
