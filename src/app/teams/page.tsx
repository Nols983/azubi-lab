import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthenticationRequiredError, PasswordChangeRequiredError } from "../lib/server/current-user";
import { getTeamsEntryView } from "../lib/server/team-service";

export const metadata: Metadata = { title: "Teams" };
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  let view;
  try {
    view = await getTeamsEntryView();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login?callbackUrl=%2Fteams");
    if (error instanceof PasswordChangeRequiredError) redirect("/konto/passwort-aendern?callbackUrl=%2Fteams");
    throw error;
  }
  return (
    <div className="mx-auto max-w-6xl space-y-8 sm:space-y-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Community</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Deine Teams</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">Entdecke die sichtbaren Erfolge deines Teams. Private Lernstände, Versuche und Trainerdaten bleiben geschützt.</p>
        {view.managesTeams && <Link href="/admin/teams" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-900 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Teams verwalten</Link>}
      </header>
      {view.teams.length === 0 ? (
        <section aria-labelledby="teams-empty-heading" className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <span aria-hidden="true" className="text-4xl">◇</span>
          <h2 id="teams-empty-heading" className="mt-3 text-2xl font-bold text-slate-950">Noch kein Team</h2>
          <p className="mx-auto mt-2 max-w-xl leading-7 text-slate-600">Du bist aktuell keinem Team zugeordnet.</p>
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {view.teams.map((team) => (
            <li key={team.id}>
              <Link href={`/teams/${encodeURIComponent(team.slug)}`} className="group flex h-full min-h-48 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                <span>
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="break-words text-xl font-bold text-slate-950 group-hover:text-blue-900">{team.name}</span>
                    {!team.active && <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">Archiviert</span>}
                  </span>
                  <span className="mt-3 block text-sm leading-6 text-slate-600">{team.description ?? "Gemeinsam lernen und Erfolge sichtbar machen."}</span>
                </span>
                <span className="mt-5 flex items-center justify-between gap-3 text-sm font-bold text-blue-800">
                  <span>{team.memberCount} {team.memberCount === 1 ? "Mitglied" : "Mitglieder"}</span>
                  <span>Öffnen <span aria-hidden="true">→</span></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
