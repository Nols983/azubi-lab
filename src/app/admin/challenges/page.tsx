import type { Metadata } from "next";
import Link from "next/link";
import { AdminAccessDenied } from "../../components/admin/admin-access-denied";
import { ChallengeDifficultyBadge, ChallengeStatusBadge } from "../../components/challenges/challenge-badges";
import { parseChallengeStatus } from "../../lib/challenge-domain";
import { formatChallengeDate } from "../../lib/challenge-presenters";
import { getTrainerPageAccess } from "../../lib/server/admin-page-access";
import { getAdminChallengeManagement } from "../../lib/server/challenge-service";

export const metadata: Metadata = { title: "Challenges verwalten" };
export const dynamic = "force-dynamic";

export default async function AdminChallengesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const access = await getTrainerPageAccess("/admin/challenges");
  if (!access.allowed) return <AdminAccessDenied />;
  const requestedStatus = parseChallengeStatus((await searchParams).status);
  const { challenges, pendingReviews } = await getAdminChallengeManagement(requestedStatus);

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zur Administration</Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Praxisaufgaben</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Challenges verwalten</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">Challenge-Inhalte getrennt von persönlichen Zuweisungen erstellen, veröffentlichen und archivieren.</p>
        </div>
        <Link href="/admin/challenges/neu" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Challenge erstellen</Link>
      </header>

      <section aria-labelledby="pending-reviews-heading" className="rounded-2xl border border-violet-200 bg-violet-50/60 p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-violet-800">Trainer-Workflow</p><h2 id="pending-reviews-heading" className="mt-1 text-2xl font-bold text-slate-950">Ausstehende Reviews ({pendingReviews.length})</h2></div></div>
        {pendingReviews.length === 0 ? <p className="mt-4 leading-7 text-slate-700">Aktuell wartet keine Challenge-Abgabe auf eine Entscheidung.</p> : <div className="mt-5 grid gap-4 lg:grid-cols-2">{pendingReviews.map((review) => <article key={review.submissionId} className="min-w-0 rounded-xl border border-violet-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-bold text-slate-950">{review.challenge.title}</h3><p className="mt-1 break-words text-sm text-slate-600">{review.learner.displayName} · Version {review.submissionNumber}</p></div><span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">Review offen</span></div><p className="mt-3 text-sm text-slate-600">Eingereicht {formatChallengeDate(review.submittedAt)}{review.submittedAfterDue ? " · nach Fälligkeit" : ""}</p><Link href={`/admin/challenges/abgaben/${review.submissionId}`} className="mt-4 inline-flex min-h-11 items-center rounded-lg font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Abgabe prüfen <span aria-hidden="true" className="ml-2">→</span></Link></article>)}</div>}
      </section>

      <nav aria-label="Challenges nach Status filtern" className="flex flex-wrap gap-2">
        <FilterLink href="/admin/challenges" active={!requestedStatus}>Alle</FilterLink>
        <FilterLink href="/admin/challenges?status=draft" active={requestedStatus === "draft"}>Entwürfe</FilterLink>
        <FilterLink href="/admin/challenges?status=published" active={requestedStatus === "published"}>Veröffentlicht</FilterLink>
        <FilterLink href="/admin/challenges?status=archived" active={requestedStatus === "archived"}>Archiviert</FilterLink>
      </nav>

      {challenges.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-950">Keine Challenges in dieser Ansicht</h2>
          <p className="mt-2 leading-7 text-slate-600">Erstelle einen Entwurf und veröffentliche ihn, sobald Inhalt und Aufgabenstellung geprüft sind.</p>
          <Link href="/admin/challenges/neu" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-blue-950 px-5 py-2 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Erste Challenge erstellen</Link>
        </section>
      ) : (
        <section aria-labelledby="challenge-list-heading">
          <h2 id="challenge-list-heading" className="sr-only">Challenge-Liste</h2>
          <div className="grid gap-4 lg:hidden">
            {challenges.map((challenge) => (
              <article key={challenge.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-2"><ChallengeStatusBadge status={challenge.status} /><ChallengeDifficultyBadge difficulty={challenge.difficulty} /></div>
                <h3 className="mt-4 text-xl font-bold text-slate-950">{challenge.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{challenge.shortDescription}</p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <DataItem label="Dauer" value={challenge.estimatedMinutes ? `${challenge.estimatedMinutes} Minuten` : "Keine Angabe"} />
                  <DataItem label="Zuweisungen" value={`${challenge.activeAssignments} aktiv · ${challenge.completedAssignments} freigegeben`} />
                  <DataItem label="Erstellt" value={formatChallengeDate(challenge.createdAt, false)} />
                </dl>
                <Link href={`/admin/challenges/${challenge.id}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Bearbeiten und zuweisen <span aria-hidden="true" className="ml-2">→</span></Link>
              </article>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <caption className="sr-only">Challenges mit Status, Umfang und Zuweisungszahlen</caption>
              <thead className="bg-slate-50 text-slate-700"><tr><th scope="col" className="w-[30%] px-5 py-4">Challenge</th><th scope="col" className="w-[15%] px-4 py-4">Status</th><th scope="col" className="w-[16%] px-4 py-4">Schwierigkeit</th><th scope="col" className="w-[14%] px-4 py-4">Dauer</th><th scope="col" className="w-[15%] px-4 py-4">Zuweisungen</th><th scope="col" className="w-[10%] px-4 py-4"><span className="sr-only">Aktion</span></th></tr></thead>
              <tbody className="divide-y divide-slate-100">{challenges.map((challenge) => <tr key={challenge.id}><th scope="row" className="px-5 py-4 align-top"><span className="block font-bold text-slate-950">{challenge.title}</span><span className="mt-1 block font-normal leading-6 text-slate-600">{challenge.shortDescription}</span><span className="mt-1 block font-normal text-slate-500">Erstellt {formatChallengeDate(challenge.createdAt, false)}</span></th><td className="px-4 py-4 align-top"><ChallengeStatusBadge status={challenge.status} /></td><td className="px-4 py-4 align-top"><ChallengeDifficultyBadge difficulty={challenge.difficulty} /></td><td className="px-4 py-4 align-top text-slate-600">{challenge.estimatedMinutes ? `${challenge.estimatedMinutes} Minuten` : "Keine Angabe"}</td><td className="px-4 py-4 align-top text-slate-600">{challenge.activeAssignments} aktiv<br />{challenge.completedAssignments} freigegeben</td><td className="px-4 py-4 align-top"><Link href={`/admin/challenges/${challenge.id}`} className="inline-flex min-h-11 items-center rounded-lg font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Öffnen</Link></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${active ? "border-blue-900 bg-blue-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-800"}`}>{children}</Link>;
}

function DataItem({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-bold text-slate-800">{label}</dt><dd className="mt-1 text-slate-600">{value}</dd></div>;
}
