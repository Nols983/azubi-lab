import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProgressBar } from "../components/progress-bar";
import {
  AuthenticationRequiredError,
  PasswordChangeRequiredError,
} from "../lib/server/current-user";
import { getCurrentProfileView } from "../lib/server/profile-service";
import { isReadOnlyPlatformPreview } from "../lib/authorization";
import { ProfileAvatar } from "../components/profile/profile-avatar";
import { BadgeCard } from "../components/profile/badge-card";
import { ProfileImageControls, RewardControls, StaffBadgeControls, StaffTitleControls } from "../components/profile/profile-customization";
import { NextMilestones } from "../components/profile/next-milestones";
import { getProfileXpRingPercentage } from "../lib/profile";

export const metadata: Metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  let profile;
  try {
    profile = await getCurrentProfileView();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/login?callbackUrl=%2Fprofil");
    }
    if (error instanceof PasswordChangeRequiredError) {
      redirect("/konto/passwort-aendern?callbackUrl=%2Fprofil");
    }
    throw error;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 sm:space-y-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Privater Kontobereich</p>
        <div className="mt-5 flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <ProfileAvatar
            displayName={profile.account.displayName}
            initials={profile.account.initials}
            src={profile.avatar.src}
            size={profile.learnerSummary ? "xlarge" : "large"}
            progressRingPercentage={profile.learnerSummary ? getProfileXpRingPercentage(profile.learnerSummary.xp) : undefined}
          />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-3xl font-bold tracking-tight text-slate-950 [overflow-wrap:anywhere] sm:text-4xl">
              {profile.account.displayName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-bold text-blue-900">
                Rolle: {profile.account.roleLabel}
              </span>
              {profile.titleState?.activeTitle && (
                <span className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-bold text-slate-800">
                  Titel: {profile.titleState.activeTitle.displayName}
                </span>
              )}
            </div>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">{profile.account.context}</p>
            {profile.learnerSummary && (
              <>
                <dl className="mt-5 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
                  <ProfileMetric label="Level" value={String(profile.learnerSummary.xp.level)} />
                  <ProfileMetric label="XP gesamt" value={formatXp(profile.learnerSummary.xp.totalXp)} />
                  <ProfileMetric label="Bis zum nächsten Level" value={`${formatXp(profile.learnerSummary.xp.xpRemainingToNextLevel)} XP`} />
                </dl>
                <div className="mt-5 max-w-2xl">
                  <ProgressBar value={profile.learnerSummary.xp.progressPercentage} label={`XP-Fortschritt zu Level ${profile.learnerSummary.xp.level + 1}`} />
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {formatXp(profile.learnerSummary.xp.xpIntoCurrentLevel)} / {formatXp(profile.learnerSummary.xp.xpRequiredForNextLevel)} XP im aktuellen Level
                  </p>
                </div>
              </>
            )}
            {profile.badgeState && profile.badgeState.pinnedBadges.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Angeheftete Abzeichen</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {profile.badgeState.pinnedBadges.map((badge) => (
                    <li key={badge.id}><BadgeCard badge={badge} variant="compact" /></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {profile.learnerSummary ? (
        profile.rewards && <NextMilestones milestones={profile.rewards.nextMilestones} />
      ) : (
        <section aria-labelledby="non-learner-context-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold text-blue-700">Arbeitsbereich</p>
          <h2 id="non-learner-context-heading" className="mt-1 text-2xl font-bold text-slate-950">{isReadOnlyPlatformPreview(profile.account.role) ? "Schreibgeschützte Plattformvorschau" : "Betreuung und Administration"}</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            {isReadOnlyPlatformPreview(profile.account.role)
              ? "Dieses Konto kann freigegebene Produktbereiche erkunden. Persönliche Lernstände, Level und XP werden nicht geführt."
              : "Dieses Konto ist für Betreuung und Verwaltung vorgesehen. Persönliche Lernlevel und XP werden für Mitarbeitendenkonten nicht geführt."}
          </p>
        </section>
      )}

      <ProfileImageControls hasImage={Boolean(profile.avatar.src)} />

      {profile.titleState?.access === "staff" && <StaffTitleControls titleState={profile.titleState} />}

      {profile.badgeState?.access === "staff" && <StaffBadgeControls badgeState={profile.badgeState} />}

      {profile.rewards && <RewardControls rewards={profile.rewards} />}

      <section aria-labelledby="quick-links-heading">
        <p className="text-sm font-semibold text-blue-700">Direkte Wege</p>
        <h2 id="quick-links-heading" className="mt-1 text-2xl font-bold text-slate-950">Schnellzugriff</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {profile.quickLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                <span className="min-w-0">
                  <span className="block font-bold text-slate-950">{link.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{link.description}</span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-lg font-bold text-blue-700">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="account-data-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-sm font-semibold text-blue-700">Nur für dich sichtbar</p>
        <h2 id="account-data-heading" className="mt-1 text-2xl font-bold text-slate-950">Kontodaten</h2>
        <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <AccountValue label="Anzeigename" value={profile.account.displayName} />
          <AccountValue label="Anmeldekennung" value={profile.account.login} breakAll />
          <AccountValue label="Rolle" value={profile.account.roleLabel} />
          <div>
            <dt className="text-sm font-bold text-slate-700">Kontostatus</dt>
            <dd className="mt-2"><span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">{profile.account.statusLabel}</span></dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-bold text-slate-700">Konto erstellt</dt>
            <dd className="mt-1 text-slate-900"><time dateTime={profile.account.createdAt.toISOString()}>{formatAccountDate(profile.account.createdAt)}</time></dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function ProfileMetric({ label, value, empty }: { label: string; value: string; empty?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-sm font-bold text-slate-700">{label}</dt>
      <dd className="mt-2 text-2xl font-bold text-slate-950">{value}</dd>
      {empty && <dd className="mt-2 text-sm leading-6 text-slate-600">{empty}</dd>}
    </div>
  );
}

function AccountValue({ label, value, breakAll = false }: { label: string; value: string; breakAll?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-bold text-slate-700">{label}</dt>
      <dd className={`mt-1 text-slate-900 ${breakAll ? "break-all" : "break-words [overflow-wrap:anywhere]"}`}>{value}</dd>
    </div>
  );
}

function formatAccountDate(value: Date) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" }).format(value);
}

function formatXp(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}
