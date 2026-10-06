import type { Metadata } from "next";
import Link from "next/link";
import { AdminAccessDenied } from "../../components/admin/admin-access-denied";
import {
  AddTeamMemberForm,
  CreateTeamForm,
  EditTeamForm,
  MembershipControls,
} from "../../components/admin/team-management-forms";
import { ACCOUNT_ROLE_LABELS } from "../../lib/auth-types";
import { TEAM_ROLE_LABELS } from "../../lib/team-domain";
import { getTeamManagementPageAccess } from "../../lib/server/admin-page-access";
import { getAdminTeamManagementView } from "../../lib/server/team-service";

export const metadata: Metadata = { title: "Teams verwalten" };
export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const access = await getTeamManagementPageAccess("/admin/teams");
  if (!access.allowed) return <AdminAccessDenied />;
  const view = await getAdminTeamManagementView();

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <Link href="/admin" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zur Administration</Link>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Nur Administration</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Teams verwalten</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">Teams steuern ausschließlich soziale Sichtbarkeit und Darstellung. Teamrollen verleihen keine Administrations- oder Trainerrechte.</p>
      </header>

      <section aria-labelledby="create-team-heading" className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm sm:p-6">
        <h2 id="create-team-heading" className="text-2xl font-bold text-slate-950">Neues Team</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Die Team-Adresse wird sicher und deterministisch aus dem Namen gebildet.</p>
        <CreateTeamForm />
      </section>

      <section aria-labelledby="team-list-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="team-list-heading" className="text-2xl font-bold text-slate-950">Bestehende Teams</h2>
            <p className="mt-2 text-slate-600">{view.teams.length} {view.teams.length === 1 ? "Team" : "Teams"}</p>
          </div>
          <Link href="/teams" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Soziale Teamansicht öffnen</Link>
        </div>
        {view.teams.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">Noch keine Teams angelegt.</p>
        ) : (
          <div className="mt-5 space-y-6">
            {view.teams.map((team) => {
              const memberIds = new Set(team.members.map((member) => member.id));
              const availableAccounts = view.accounts.filter((account) => !memberIds.has(account.id));
              return (
                <article key={team.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-xl font-bold text-slate-950">{team.name}</h3>
                      <p className="mt-1 break-all text-sm text-slate-500">/teams/{team.slug}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${team.active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-slate-100 text-slate-700"}`}>{team.active ? "Aktiv" : "Archiviert"}</span>
                      <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700">{team.memberCount} {team.memberCount === 1 ? "Mitglied" : "Mitglieder"}</span>
                    </div>
                  </div>
                  <EditTeamForm team={team} />

                  <section aria-labelledby={`members-${team.id}`} className="mt-6 border-t border-slate-200 pt-6">
                    <h4 id={`members-${team.id}`} className="text-lg font-bold text-slate-950">Mitgliedschaften</h4>
                    <AddTeamMemberForm teamId={team.id} accounts={availableAccounts} active={team.active} />
                    {team.members.length === 0 ? (
                      <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Diesem Team sind noch keine Konten zugeordnet.</p>
                    ) : (
                      <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                        {team.members.map((member) => (
                          <li key={member.id} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="break-words font-bold text-slate-950">{member.displayName}</p>
                                <p className="mt-1 text-sm text-slate-600">{ACCOUNT_ROLE_LABELS[member.accountRole]} · {TEAM_ROLE_LABELS[member.teamRole]}{member.disabled ? " · Konto gesperrt" : ""}</p>
                              </div>
                            </div>
                            <MembershipControls teamId={team.id} userId={member.id} teamRole={member.teamRole} active={team.active} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
