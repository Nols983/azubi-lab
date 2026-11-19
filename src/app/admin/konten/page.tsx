import type { Metadata } from "next";
import Link from "next/link";
import { AdminAccessDenied } from "../../components/admin/admin-access-denied";
import { AccountCleanupRetryForm } from "../../components/admin/account-delete-form";
import { ACCOUNT_ROLE_LABELS, ACCOUNT_ROLES } from "../../lib/auth-types";
import { accountDirectoryHref, accountStatusLabel, type AccountDirectorySearch } from "../../lib/account-directory";
import { getUserManagementPageAccess } from "../../lib/server/admin-page-access";
import { getAccountDirectoryView } from "../../lib/server/account-directory-service";

export const metadata: Metadata = { title: "Benutzerverzeichnis" };
export const dynamic = "force-dynamic";
const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-950 focus:outline-2 focus:outline-blue-600";
const rowClass = "grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center";

export default async function AccountManagementPage({ searchParams }: { searchParams: Promise<AccountDirectorySearch> }) {
  const access = await getUserManagementPageAccess("/admin/konten");
  if (!access.allowed) return <AdminAccessDenied />;
  const search = await searchParams;
  const view = await getAccountDirectoryView(search);
  const { filters } = view;
  const selectedTeam = view.teams.find((team) => team.id === filters.team);
  const folderTitle = filters.team === "all" ? "Alle Konten" : filters.team === "none" ? "Konten ohne Team" : selectedTeam?.name ?? "Team nicht gefunden";
  const navClass = (selected: boolean) => `flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${selected ? "bg-blue-100 text-blue-950" : "text-slate-700 hover:bg-slate-100"}`;
  return <div className="space-y-6">
    <header>
      <Link href="/admin" className="inline-flex min-h-11 items-center text-sm font-bold text-blue-700 hover:underline">← Zur Administration</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Konten und Rollen</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Benutzerverzeichnis</h1><p className="mt-2 text-sm leading-6 text-slate-600">Konto auswählen, Details öffnen und Berechtigungen gezielt verwalten.</p></div>
        <Link href="/admin/lernende/neu" className="inline-flex min-h-11 items-center rounded-xl bg-blue-950 px-4 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">+ Konto anlegen</Link>
      </div>
    </header>
    {search.deleted === "1" && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-slate-900">Das Konto wurde endgültig gelöscht.</p>}
    {view.pendingCleanups > 0 && <section aria-label="Ausstehende Dateibereinigung" className="rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="text-sm font-semibold text-slate-900">Für {view.pendingCleanups} gelöschte Konten steht die Bereinigung privater Dateien noch aus. Diese Dateien sind über die Anwendung nicht mehr abrufbar.</p><AccountCleanupRetryForm /></section>}
    <div className="grid min-w-0 gap-5 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <aside className="hidden self-start rounded-2xl border border-slate-200 bg-white p-3 lg:block">
        <nav aria-label="Kontenverzeichnis">
          <p className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Verzeichnis</p>
          <Link aria-current={filters.team === "all" ? "page" : undefined} href={accountDirectoryHref(filters, { team: "all", page: 1 })} className={navClass(filters.team === "all")}><span>Alle Konten</span><span className="text-xs tabular-nums">{view.allCount}</span></Link>
          <Link aria-current={filters.team === "none" ? "page" : undefined} href={accountDirectoryHref(filters, { team: "none", page: 1 })} className={navClass(filters.team === "none")}><span>Konten ohne Team</span><span className="text-xs tabular-nums">{view.unassignedCount}</span></Link>
          <details open className="mt-2"><summary className="min-h-11 cursor-pointer rounded-lg px-3 py-3 text-sm font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600">Teams</summary><ul className="ml-3 space-y-1 border-l border-slate-200 pl-2">
            {view.teams.map((team) => <li key={team.id}><Link aria-current={filters.team === team.id ? "page" : undefined} href={accountDirectoryHref(filters, { team: team.id, page: 1 })} className={navClass(filters.team === team.id)}><span className="min-w-0 break-words">{team.name}{!team.active && <span className="block text-xs font-normal text-slate-500">Archiviert</span>}</span><span className="text-xs tabular-nums">{team.memberCount}</span></Link></li>)}
            {view.teams.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Noch keine Teams</li>}
          </ul></details>
        </nav>
      </aside>
      <section aria-labelledby="account-list-heading" className="min-w-0 space-y-4">
        <form key={accountDirectoryHref(filters)} action="/admin/konten" method="get" className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="min-w-0 text-sm font-bold text-slate-800 sm:col-span-2 xl:col-span-3">Konten suchen<input type="search" name="q" maxLength={120} defaultValue={filters.query} placeholder="Anzeigename oder Anmeldekennung" className={inputClass} /></label>
            <label className="min-w-0 text-sm font-bold text-slate-800 lg:hidden">Teamfilter<select name="team" defaultValue={filters.team} className={inputClass}><option value="all">Alle Konten</option><option value="none">Konten ohne Team</option>{view.teams.map((team) => <option key={team.id} value={team.id}>{team.name}{!team.active && " (archiviert)"}</option>)}{filters.team === "invalid" || (!selectedTeam && !["all", "none"].includes(filters.team)) ? <option value={filters.team}>Team nicht gefunden</option> : null}</select></label>
            <label className="min-w-0 text-sm font-bold text-slate-800">Kontotyp<select name="role" defaultValue={filters.role} className={inputClass}><option value="all">Alle Kontotypen</option>{ACCOUNT_ROLES.map((role) => <option key={role} value={role}>{ACCOUNT_ROLE_LABELS[role]}</option>)}</select></label>
            <label className="min-w-0 text-sm font-bold text-slate-800">Kontostatus<select name="status" defaultValue={filters.status} className={inputClass}><option value="all">Alle Status</option><option value="active">Aktiv</option><option value="password-change">Passwortwechsel erforderlich</option><option value="disabled">Gesperrt</option></select></label>
            <label className="min-w-0 text-sm font-bold text-slate-800">Sortierung<select name="sort" defaultValue={filters.sort} className={inputClass}><option value="name">Name (A–Z)</option><option value="newest">Neueste zuerst</option><option value="oldest">Älteste zuerst</option></select></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" name="profilbild" value="vorhanden" defaultChecked={filters.withAvatar} className="size-4 accent-blue-950" />Mit Profilbild</label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">Pro Seite<select name="pageSize" defaultValue={filters.pageSize} className="min-h-11 rounded-lg border border-slate-300 bg-white px-2 focus:outline-2 focus:outline-blue-600">{[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
            <button className="min-h-11 rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Filter anwenden</button>
            <Link href="/admin/konten" className="inline-flex min-h-11 items-center px-2 text-sm font-bold text-blue-700 hover:underline">Zurücksetzen</Link>
          </div>
        </form>
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="account-list-heading" tabIndex={-1} className="break-words text-xl font-bold text-slate-950">{folderTitle}</h2><p className="text-sm text-slate-600">{view.count} {view.count === 1 ? "Konto" : "Konten"} · Seite {filters.page} von {view.pages}</p></div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div aria-hidden="true" className={`${rowClass} hidden border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 lg:grid`}><span>Konto</span><span>Kontotyp</span><span>Teams</span><span>Status</span><span>Details</span></div>
          <ul className="divide-y divide-slate-100">
            {view.accounts.map((account) => <li key={account.id} className={`${rowClass} px-4 py-4 hover:bg-blue-50/30`}>
              <div className="col-span-2 min-w-0 lg:col-span-1"><Link href={`/admin/konten/${account.id}`} className="break-words font-bold text-blue-950 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600">{account.displayName}</Link><p className="mt-1 break-all text-xs text-slate-500">{account.login}</p></div>
              <div className="text-sm text-slate-700"><span className="sr-only">Kontotyp: </span>{ACCOUNT_ROLE_LABELS[account.role]}</div>
              <div className="min-w-0 break-words text-xs leading-5 text-slate-600"><span className="sr-only">Teams: </span>{account.teams.length ? account.teams.map((team) => `${team.name}${!team.active ? " (archiviert)" : ""}`).join(", ") : "Ohne Team"}</div>
              <div><span className={`inline-block max-w-full rounded-lg px-2 py-1 text-xs font-semibold ${account.disabledAt ? "bg-red-50 text-red-800" : account.mustChangePassword ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>{accountStatusLabel(account)}</span></div>
              <Link href={`/admin/konten/${account.id}`} aria-label={`Details zu ${account.displayName}`} className="inline-flex min-h-11 items-center justify-center justify-self-end rounded-lg border border-slate-200 lg:justify-self-start px-3 text-sm font-bold text-blue-700 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Öffnen<span aria-hidden="true" className="ml-2">→</span></Link>
            </li>)}
          </ul>
          {view.accounts.length === 0 && <div className="p-8 text-center"><p className="font-bold text-slate-900">Keine passenden Konten</p><p className="mt-2 text-sm text-slate-600">Ändere die Suche oder setze die Filter zurück.</p></div>}
        </div>
        <nav aria-label="Seiten des Benutzerverzeichnisses" className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold">
          {filters.page > 1 ? <Link href={accountDirectoryHref(filters, { page: filters.page - 1 })} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">← Vorherige Seite</Link> : <span className="px-4 text-slate-400">← Vorherige Seite</span>}
          <span aria-current="page" className="text-slate-600">{filters.page} / {view.pages}</span>
          {filters.page < view.pages ? <Link href={accountDirectoryHref(filters, { page: filters.page + 1 })} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">Nächste Seite →</Link> : <span className="px-4 text-slate-400">Nächste Seite →</span>}
        </nav>
      </section>
    </div>
  </div>;
}
