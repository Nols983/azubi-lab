import Link from "next/link";
import { ProfileAvatar } from "../profile/profile-avatar";
import { BadgeCard } from "../profile/badge-card";
import { TEAM_ROLE_LABELS, type TeamRole } from "../../lib/team-domain";
import type { RewardCollectionItem } from "../../lib/progression-rewards";

export function TeamMemberCard({ member, current = false }: {
  member: {
    id: string;
    displayName: string;
    initials: string;
    avatarSrc?: string;
    roleLabel: string;
    teamRole: TeamRole;
    activeTitle?: { displayName: string };
    pinnedBadges: readonly RewardCollectionItem[];
    level?: number;
  };
  current?: boolean;
}) {
  return (
    <article className={`h-full rounded-2xl border bg-white p-4 shadow-sm ${current ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
      <Link href={`/community/${encodeURIComponent(member.id)}`} className="group flex min-h-14 items-start gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" aria-label={`Showcase-Profil von ${member.displayName} öffnen`}>
        <ProfileAvatar displayName={member.displayName} initials={member.initials} src={member.avatarSrc} size="small" decorative />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="break-words font-bold text-slate-950 group-hover:text-blue-800">{member.displayName}</span>
            {current && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-900">Du</span>}
          </span>
          <span className="mt-1 block text-sm text-slate-600">{TEAM_ROLE_LABELS[member.teamRole]} · {member.roleLabel}</span>
          {member.activeTitle && <span className="mt-1 block text-sm font-semibold text-slate-700">{member.activeTitle.displayName}</span>}
          {member.level !== undefined && <span className="mt-1 block text-sm font-bold text-blue-800">Level {member.level}</span>}
        </span>
      </Link>
      <div className="mt-3">
        {member.pinnedBadges.length > 0 ? (
          <ul aria-label={`Angeheftete Abzeichen von ${member.displayName}`} className="flex flex-wrap gap-2">
            {member.pinnedBadges.map((badge) => <li key={badge.id} className="min-w-0"><BadgeCard badge={badge} variant="compact" /></li>)}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Keine angehefteten Abzeichen</p>
        )}
      </div>
    </article>
  );
}
