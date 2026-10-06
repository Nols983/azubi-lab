import type { Metadata } from "next";
import Link from "next/link";
import { AccountManagementActions } from "../../components/admin/account-management-actions";
import { AdminAvatarModeration } from "../../components/admin/admin-avatar-moderation";
import { AdminAccessDenied } from "../../components/admin/admin-access-denied";
import { ACCOUNT_ROLE_LABELS } from "../../lib/auth-types";
import { getUserManagementPageAccess } from "../../lib/server/admin-page-access";
import { listAdminAccountAvatarViews } from "../../lib/server/admin-avatar-service";

export const metadata: Metadata = { title: "Konten und Rollen" };
export const dynamic = "force-dynamic";

export default async function AccountManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ profilbild?: string | string[] }>;
}) {
  const access = await getUserManagementPageAccess("/admin/konten");
  if (!access.allowed) return <AdminAccessDenied />;
  const accounts = await listAdminAccountAvatarViews();
  const hasAvatarFilter = (await searchParams).profilbild === "vorhanden";
  const visibleAccounts = hasAvatarFilter ? accounts.filter((account) => Boolean(account.avatar.src)) : accounts;

  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zur Administration</Link>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Nur Administration</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Konten und Rollen</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">Rollen, Kontozugriff und Passwort-Wiederherstellung werden ausschließlich durch ein aktuelles Administrationskonto verwaltet. Rollenänderungen und Statuswechsel machen bestehende Sitzungen des Zielkontos ungültig.</p>
      </header>

      <section aria-labelledby="account-list-heading">
        <h2 id="account-list-heading" className="text-2xl font-bold text-slate-950">Alle Konten</h2>
        <form action="/admin/konten" method="get" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="inline-flex min-h-11 items-center gap-3 text-sm font-bold text-slate-800">
            <input type="checkbox" name="profilbild" value="vorhanden" defaultChecked={hasAvatarFilter} className="size-5 accent-blue-900" />
            Mit Profilbild
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            Filter anwenden
          </button>
          {hasAvatarFilter && <Link href="/admin/konten" className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Alle anzeigen</Link>}
        </form>
        {visibleAccounts.length === 0 && <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">Keine Konten mit Profilbild gefunden.</p>}
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {visibleAccounts.map((account) => (
            <article key={account.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><h3 className="text-xl font-bold text-slate-950">{account.displayName}</h3><p className="mt-1 break-all text-sm text-slate-600">{account.login}</p></div>
                <div className="flex items-start gap-3">
                  <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-800">{ACCOUNT_ROLE_LABELS[account.role]}</span>
                  <AdminAvatarModeration
                    userId={account.id}
                    displayName={account.displayName}
                    initials={account.initials}
                    avatarSrc={account.avatar.src}
                    isCurrentUser={account.id === access.user.id}
                  />
                </div>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3"><dt className="font-bold text-slate-800">Status</dt><dd className="mt-1 text-slate-600">{account.disabledAt ? "Gesperrt" : account.mustChangePassword ? "Passwortwechsel erforderlich" : "Aktiv"}</dd></div>
                <div className="rounded-xl bg-slate-50 p-3"><dt className="font-bold text-slate-800">Erstellt</dt><dd className="mt-1 text-slate-600">{formatDate(account.createdAt)}</dd></div>
              </dl>
              <div className="mt-5"><AccountManagementActions userId={account.id} role={account.role} disabled={Boolean(account.disabledAt)} isCurrentUser={account.id === access.user.id} /></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(value);
}
