import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountManagementActions } from "../../../components/admin/account-management-actions";
import { AdminAvatarModeration } from "../../../components/admin/admin-avatar-moderation";
import { AccountTeamAddForm } from "../../../components/admin/account-team-add-form";
import { MembershipControls } from "../../../components/admin/team-management-forms";
import { AccountDeleteForm } from "../../../components/admin/account-delete-form";
import { AdminAccessDenied } from "../../../components/admin/admin-access-denied";
import { ACCOUNT_ROLE_LABELS } from "../../../lib/auth-types";
import { TEAM_ROLE_LABELS } from "../../../lib/team-domain";
import { accountStatusLabel } from "../../../lib/account-directory";
import { ACCOUNT_DELETION_REASON_LABELS, ACCOUNT_DELETION_WARNING } from "../../../lib/account-deletion";
import { getUserManagementPageAccess } from "../../../lib/server/admin-page-access";
import { getManagedAccountDetail } from "../../../lib/server/account-directory-service";

export const metadata: Metadata = { title: "Kontodetails" };
export const dynamic = "force-dynamic";

export default async function ManagedAccountDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const access = await getUserManagementPageAccess(`/admin/konten/${encodeURIComponent(userId)}`);
  if (!access.allowed) return <AdminAccessDenied />;
  const view = await getManagedAccountDetail(userId);
  if (!view) notFound();
  const { account, avatar, deletion } = view;
  const isCurrentUser = access.user.id === account.id;
  return <div className="mx-auto max-w-5xl space-y-6">
    <Link href="/admin/konten" className="inline-flex min-h-11 items-center text-sm font-bold text-blue-700 hover:underline">← Zum Benutzerverzeichnis</Link>
    <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Kontodetails</p>
      <h1 className="mt-2 break-words text-3xl font-bold text-slate-950">{account.displayName}</h1>
      <p className="mt-2 break-all text-sm text-slate-500">{account.login}</p>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><dt className="font-bold text-slate-800">Kontotyp</dt><dd className="mt-1 text-slate-600">{ACCOUNT_ROLE_LABELS[account.role]}</dd></div><div><dt className="font-bold text-slate-800">Kontostatus</dt><dd className="mt-1 text-slate-600">{accountStatusLabel(account)}</dd></div><div><dt className="font-bold text-slate-800">Erstellt am</dt><dd className="mt-1 text-slate-600">{new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" }).format(account.createdAt)}</dd></div></dl>
      {account.role === "learner" && <Link href={`/admin/lernende/${account.id}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-blue-700 hover:underline">Lernfortschritt öffnen →</Link>}
    </header>
    <div className="grid min-w-0 gap-6 xl:grid-cols-2">
      <section aria-labelledby="account-access-heading" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 id="account-access-heading" className="mb-5 text-xl font-bold text-slate-950">Kontotyp und Zugriff</h2><AccountManagementActions key={`${account.role}-${Boolean(account.disabledAt)}`} userId={account.id} role={account.role} disabled={Boolean(account.disabledAt)} isCurrentUser={isCurrentUser} /></section>
      <div className="min-w-0 space-y-6">
        <section aria-labelledby="account-teams-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 id="account-teams-heading" className="text-xl font-bold text-slate-950">Teammitgliedschaften</h2><div className="mt-4 space-y-4">
          {account.teams.length === 0 && <p className="text-sm text-slate-600">Dieses Konto ist keinem Team zugeordnet.</p>}
          {account.teams.map((team) => <div key={team.id} className="rounded-xl border border-slate-200 p-4"><p className="break-words font-bold text-slate-900">{team.name}</p><p className="mt-1 text-xs text-slate-500">{TEAM_ROLE_LABELS[team.teamRole]}{!team.active && " · Archiviert"}</p><MembershipControls teamId={team.id} userId={account.id} teamRole={team.teamRole} active={team.active} /></div>)}
          <AccountTeamAddForm userId={account.id} teams={view.availableTeams.map(({ id, name }) => ({ id, name }))} disabled={Boolean(account.disabledAt)} />
        </div></section>
        <section aria-labelledby="account-avatar-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 id="account-avatar-heading" className="mb-4 text-xl font-bold text-slate-950">Profilbildverwaltung</h2><AdminAvatarModeration userId={account.id} displayName={account.displayName} initials={avatar.initials} avatarSrc={avatar.avatar.src} isCurrentUser={isCurrentUser} /></section>
      </div>
    </div>
    <section aria-labelledby="account-delete-heading" className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-5 sm:p-7">
      <h2 id="account-delete-heading" className="text-xl font-bold text-red-950">Endgültige Kontolöschung</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{ACCOUNT_DELETION_WARNING}</p>
      <p className="mt-3 text-sm leading-6 text-slate-700">Teams, Challenge-Vorlagen und die Zuweisungen anderer Lernender bleiben erhalten. Deren Verantwortung übernimmt der löschende Administrator, ohne zusätzliche Rollen oder Teamrechte zu vergeben. Bewertungen anderer Lernender behalten Ergebnis und Punkte; der Bewerter wird als „Gelöschtes Konto“ angezeigt und sein Freitext entfernt. Eigene Kommentare und Themenvorschläge werden gelöscht. Moderationsereignisse bleiben ohne den Bezug zu diesem Konto erhalten. Vom Konto ausgestellte Passwort-Reset-Links werden ungültig.</p>
      {deletion.allowed ? <AccountDeleteForm userId={account.id} login={account.login} /> : <div className="mt-4 rounded-xl border border-red-200 bg-white p-4"><p className="font-bold text-red-900">Dieses Konto kann nicht endgültig gelöscht werden.</p><button type="button" disabled className="mt-3 min-h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 opacity-60">Konto endgültig löschen</button><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">{deletion.reasons.map((reason) => <li key={reason}>{ACCOUNT_DELETION_REASON_LABELS[reason]}</li>)}</ul>{!isCurrentUser && <a href={`#account-status-${account.id}`} className="mt-4 inline-flex min-h-11 items-center font-bold text-blue-700 hover:underline">Stattdessen Kontozugriff sperren oder verwalten ↑</a>}</div>}
    </section>
  </div>;
}
