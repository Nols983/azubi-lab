import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TeamMemberCard } from "../../components/teams/team-member-card";
import { AuthenticationRequiredError, PasswordChangeRequiredError } from "../../lib/server/current-user";
import { getTeamDetailView, TeamVisibilityError } from "../../lib/server/team-service";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let view;
  try {
    view = await getTeamDetailView(slug);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect(`/login?callbackUrl=${encodeURIComponent(`/teams/${slug}`)}`);
    if (error instanceof PasswordChangeRequiredError) redirect(`/konto/passwort-aendern?callbackUrl=${encodeURIComponent(`/teams/${slug}`)}`);
    if (error instanceof TeamVisibilityError) notFound();
    throw error;
  }
  const { team } = view;
  return (
    <div className="mx-auto max-w-6xl space-y-8 sm:space-y-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <Link href="/teams" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Alle Teams</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Team</p>
            <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{team.name}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {!team.active && <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">Archiviert</span>}
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-bold text-blue-900">{team.memberCount} {team.memberCount === 1 ? "Mitglied" : "Mitglieder"}</span>
          </div>
        </div>
        {team.description && <p className="mt-4 max-w-3xl leading-7 text-slate-600">{team.description}</p>}
        {!team.active && <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">Dieses Team ist archiviert. Es gewährt Mitgliedern keinen sozialen Zugriff und zeigt keine Rangliste.</p>}
      </header>

      <section aria-labelledby="leaderboard-heading">
        <div>
          <p className="text-sm font-semibold text-blue-700">Gemeinsam vorankommen</p>
          <h2 id="leaderboard-heading" className="mt-1 text-2xl font-bold text-slate-950">Lernenden-Rangliste</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Sortiert nach den kanonischen Gesamt-XP. Bei Gleichstand folgen Anzeigename und stabile Konto-ID als deterministische Reihenfolge.</p>
        </div>
        {view.learnerLeaderboard.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">{team.active ? "In diesem Team sind aktuell keine aktiven Lernenden." : "Für archivierte Teams wird keine Rangliste angezeigt."}</p>
        ) : (
          <ol className="mt-5 space-y-3">
            {view.learnerLeaderboard.map((member) => (
              <li key={member.id} className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${member.rank <= 3 ? "border-amber-300" : member.id === view.currentUserId ? "border-blue-400" : "border-slate-200"}`}>
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
                  <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-5">
                    <span aria-label={`Rang ${member.rank}`} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border text-sm font-black ${member.rank === 1 ? "border-amber-400 bg-amber-100 text-amber-950" : member.rank === 2 ? "border-slate-400 bg-slate-100 text-slate-800" : member.rank === 3 ? "border-orange-400 bg-orange-100 text-orange-950" : "border-blue-200 bg-blue-50 text-blue-900"}`}>#{member.rank}</span>
                    <div className="min-w-0 flex-1">
                      <TeamMemberCard member={member} current={member.id === view.currentUserId} />
                    </div>
                  </div>
                  <div className="shrink-0 pl-14 text-left sm:pl-0 sm:text-right">
                    <p className="text-lg font-black text-slate-950">{formatNumber(member.totalXp)} XP</p>
                    <p className="mt-1 text-sm font-bold text-slate-600">Level {member.level}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="other-members-heading">
        <h2 id="other-members-heading" className="text-2xl font-bold text-slate-950">Weitere Teammitglieder</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Mitarbeitenden- und Betrachterkonten gehören zum Team, werden aber nicht als Lernende gerankt.</p>
        {view.staffMembers.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">Keine weiteren Teammitglieder.</p>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {view.staffMembers.map((member) => <li key={member.id}><TeamMemberCard member={member} current={member.id === view.currentUserId} /></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}
