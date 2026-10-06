import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadgeCard } from "../../components/profile/badge-card";
import { ProfileAvatar } from "../../components/profile/profile-avatar";
import { AuthenticationRequiredError, PasswordChangeRequiredError } from "../../lib/server/current-user";
import { getSocialProfileView, SocialProfileVisibilityError } from "../../lib/server/team-service";
import { TEAM_ROLE_LABELS } from "../../lib/team-domain";

export const metadata: Metadata = { title: "Showcase-Profil" };
export const dynamic = "force-dynamic";

export default async function SocialProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  let profile;
  try {
    profile = await getSocialProfileView(userId);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect(`/login?callbackUrl=${encodeURIComponent(`/community/${userId}`)}`);
    if (error instanceof PasswordChangeRequiredError) redirect(`/konto/passwort-aendern?callbackUrl=${encodeURIComponent(`/community/${userId}`)}`);
    if (error instanceof SocialProfileVisibilityError) notFound();
    throw error;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 sm:space-y-10">
      <header className="overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-white via-blue-50 to-violet-100 p-5 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Team-Showcase</p>
        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
          <ProfileAvatar displayName={profile.displayName} initials={profile.initials} src={profile.avatarSrc} size="xlarge" />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-3xl font-black tracking-tight text-slate-950 [overflow-wrap:anywhere] sm:text-4xl">{profile.displayName}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-sm font-bold text-slate-800">{profile.roleLabel}</span>
              {profile.activeTitle && <span className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-sm font-bold text-violet-900">{profile.activeTitle.displayName}</span>}
            </div>
            {profile.kind === "learner" ? (
              <dl className="mt-5 grid max-w-md grid-cols-2 gap-3">
                <Metric label="Level" value={String(profile.level)} />
                <Metric label="Gesamt-XP" value={formatNumber(profile.totalXp)} />
              </dl>
            ) : (
              <p className="mt-5 max-w-2xl leading-7 text-slate-600">Dieses Mitarbeitendenprofil zeigt soziale Identität und Teamzugehörigkeit. Lernlevel und XP werden für diese Kontorolle nicht geführt.</p>
            )}
          </div>
        </div>
      </header>

      <section aria-labelledby="visible-teams-heading">
        <h2 id="visible-teams-heading" className="text-2xl font-bold text-slate-950">Sichtbare Teams</h2>
        {profile.visibleTeams.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">Keine sichtbare Teamzuordnung.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-3">
            {profile.visibleTeams.map((team) => (
              <li key={team.id}><Link href={`/teams/${encodeURIComponent(team.slug)}`} className="inline-flex min-h-11 items-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-900 shadow-sm hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{team.name} · {TEAM_ROLE_LABELS[team.teamRole]}</Link></li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pinned-badges-heading">
        <p className="text-sm font-semibold text-blue-700">Persönliche Auswahl</p>
        <h2 id="pinned-badges-heading" className="mt-1 text-2xl font-bold text-slate-950">Angeheftete Abzeichen</h2>
        {profile.kind === "staff" && profile.badgeAccess === "staff" && <p className="mt-2 text-sm leading-6 text-slate-600">Kosmetische Showcase-Auswahl durch Staff-Berechtigung; sie stellt keine Lernfreischaltung dar.</p>}
        {profile.pinnedBadges.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">Noch keine Abzeichen angeheftet.</p>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.pinnedBadges.map((badge) => <li key={badge.id}><BadgeCard badge={badge} variant="preview" pinned /></li>)}
          </ul>
        )}
      </section>

      {profile.kind === "learner" && (
          <section aria-labelledby="unlocked-badges-heading">
            <p className="text-sm font-semibold text-blue-700">Vollständige Sammlung</p>
            <h2 id="unlocked-badges-heading" className="mt-1 text-2xl font-bold text-slate-950">Erfolge &amp; Abzeichen</h2>
            <p className="mt-2 text-sm text-slate-600">{profile.unlockedBadgeCount} {profile.unlockedBadgeCount === 1 ? "Abzeichen" : "Abzeichen"} gesammelt. Gesperrte Abzeichen und deren Fortschritt bleiben privat.</p>
            {profile.unlockedBadges.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">Noch keine Abzeichen freigeschaltet.</p>
            ) : (
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {profile.unlockedBadges.map((badge) => <li key={badge.id}><BadgeCard badge={badge} variant="collection" pinned={profile.pinnedBadges.some((pinnedBadge) => pinnedBadge.id === badge.id)} showUnlockDate /></li>)}
              </ul>
            )}
          </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/70 bg-white/75 p-4"><dt className="text-sm font-bold text-slate-600">{label}</dt><dd className="mt-1 text-2xl font-black text-slate-950">{value}</dd></div>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}
