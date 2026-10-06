import type { Metadata } from "next";
import Link from "next/link";
import { AdminAccessDenied } from "../components/admin/admin-access-denied";
import { canManageTeams, canManageUsers } from "../lib/authorization";
import { getTrainerPageAccess } from "../lib/server/admin-page-access";
import { getAdminDashboardData } from "../lib/server/admin-service";

export const metadata: Metadata = { title: "Trainer-Cockpit" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const access = await getTrainerPageAccess("/admin");
  if (!access.allowed) return <AdminAccessDenied />;
  const dashboard = await getAdminDashboardData();

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Administration</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Trainer-Cockpit</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">Wähle den passenden Arbeitsbereich oder prüfe kurz, wo Unterstützung nötig ist.</p>
      </header>

      <nav aria-label="Arbeitsbereiche" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardLink href="/admin/lernende" title="Lernende" detail="Fortschritt, Labs, Level und letzte Aktivität überblicken." />
        <DashboardLink href="/admin/skill-matrix" title="Skill-Matrix" detail="Lernstand je Modul gezielt vergleichen und filtern." />
        <DashboardLink href="/admin/lernende?focus=curriculum-active" title="Lernplanung" detail="Aktive Modulzuweisungen und Zieltermine bearbeiten." />
        {canManageUsers(access.user.role) && <DashboardLink href="/admin/konten" title="Konten" detail="Konten, Rollen und Zugänge verwalten." />}
        {canManageTeams(access.user.role) && <DashboardLink href="/admin/teams" title="Teams" detail="Teams, Mitgliedschaften und Teamrollen verwalten." />}
      </nav>

      <section aria-labelledby="status-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="status-heading" className="text-2xl font-bold text-slate-950">Kurzüberblick</h2>
            <p className="mt-2 text-slate-600">Aktuelle Fakten für die tägliche Betreuung.</p>
          </div>
          <Link href="/admin/lernende" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Alle Lernenden ansehen <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCard label="Aktive Lernkonten" value={dashboard.counts.learners.total} />
          <StatusCard label="Überfällige Lernplanziele" value={dashboard.counts.planning.overdue} urgent={dashboard.counts.planning.overdue > 0} />
          <StatusCard label="Offene Challenge-Reviews" value={dashboard.counts.challenges.pendingReview} urgent={dashboard.counts.challenges.pendingReview > 0} />
          <StatusCard label="Lab-Unterstützung prüfen" value={dashboard.counts.labs.supportSuggested} urgent={dashboard.counts.labs.supportSuggested > 0} />
        </dl>
      </section>

      <section aria-labelledby="attention-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="attention-heading" className="text-2xl font-bold text-slate-950">Aktuell wichtig</h2>
            <p className="mt-2 text-slate-600">Die nächsten offenen Punkte aus Challenges, Lernplanung und Labs.</p>
          </div>
          <Link href="/admin/lernende" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zur Lernendenübersicht</Link>
        </div>
        {dashboard.attention.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm">Aktuell gibt es keine priorisierten offenen Punkte.</p>
        ) : (
          <ol className="mt-5 grid gap-3 lg:grid-cols-2">
            {dashboard.attention.slice(0, 4).map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-950">{item.label}</span>
                    <span className="mt-1 block break-words text-sm text-slate-600">{item.detail}</span>
                    <time dateTime={item.timestamp.toISOString()} className="mt-1 block text-xs font-medium text-slate-500">{formatDate(item.timestamp)}</time>
                  </span>
                  <span aria-hidden="true" className="shrink-0 font-bold text-blue-700">→</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="more-admin-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 id="more-admin-heading" className="text-lg font-bold text-slate-950">Weitere Verwaltung</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <AdminLink href="/admin/lerninhalte">Lerninhalte</AdminLink>
          <AdminLink href="/admin/challenges">Challenges</AdminLink>
          {canManageUsers(access.user.role) && <AdminLink href="/admin/lernende/neu">Konto anlegen</AdminLink>}
          {canManageTeams(access.user.role) && <AdminLink href="/admin/teams">Teams verwalten</AdminLink>}
        </div>
      </section>
    </div>
  );
}

function DashboardLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link href={href} className="group flex min-h-40 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
      <span><span className="block text-xl font-bold text-slate-950">{title}</span><span className="mt-2 block text-sm leading-6 text-slate-600">{detail}</span></span>
      <span className="mt-4 text-sm font-bold text-blue-700">Öffnen <span aria-hidden="true">→</span></span>
    </Link>
  );
}

function StatusCard({ label, value, urgent = false }: { label: string; value: number; urgent?: boolean }) {
  const style = urgent ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white";
  return <div className={"rounded-2xl border p-5 shadow-sm " + style}><dt className="text-sm font-semibold text-slate-600">{label}</dt><dd className="mt-2 text-3xl font-bold text-slate-950">{value}</dd></div>;
}

function AdminLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{children}</Link>;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(value);
}
