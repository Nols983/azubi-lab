import Link from "next/link";
import { AssignmentOverdueBadge, AssignmentStatusBadge } from "../challenges/challenge-badges";
import { formatChallengeDate } from "../../lib/challenge-presenters";
import type { ChallengeAssignment } from "../../lib/server/challenge-assignment-repository";

type Props = { data:
  | { audience: "anonymous" }
  | { audience: "password-change" }
  | { audience: "admin"; pendingReviews: number }
  | { audience: "preview" }
  | { audience: "unavailable" }
  | { audience: "learner"; count: number; next?: ChallengeAssignment }
};

export function DailyChallengeCard({ data }: Props) {
  if (data.audience === "preview") {
    return <DashboardCard eyebrow="Challenge-Vorschau" title="Veröffentlichte Praxisaufgaben" description="Erkunde den Challenge-Katalog ohne Zuweisungen, Abgaben oder Reviews." href="/challenges" action="Katalog ansehen" />;
  }
  if (data.audience === "unavailable") {
    return <DashboardCard eyebrow="Challenges" title="Nicht verfügbar" description="Für diese Kontorolle ist kein persönlicher Challenge-Bereich eingerichtet." href="/" action="Zum Dashboard" />;
  }
  if (data.audience === "admin") {
    return <DashboardCard eyebrow="Challenge-Verwaltung" title={`${data.pendingReviews} offene${data.pendingReviews === 1 ? "s" : ""} Review${data.pendingReviews === 1 ? "" : "s"}`} description="Abgaben prüfen, konkretes Feedback geben und Freigaben nachvollziehbar dokumentieren." href="/admin/challenges" action="Reviews verwalten" />;
  }
  if (data.audience === "anonymous" || data.audience === "password-change") {
    return <DashboardCard eyebrow="Deine Challenges" title="Persönliche Praxisaufgaben" description={data.audience === "password-change" ? "Schließe zuerst den erforderlichen Passwortwechsel ab, um deine Zuweisungen zu öffnen." : "Melde dich an, um persönliche Challenge-Zuweisungen zu sehen."} href={data.audience === "password-change" ? "/konto/passwort-aendern" : "/login?callbackUrl=%2Fchallenges"} action={data.audience === "password-change" ? "Passwort ändern" : "Anmelden"} />;
  }
  if (!data.next) {
    return <DashboardCard eyebrow="Deine Challenges" title="Keine offene Challenge" description="Aktuell sind dir keine offenen Challenges zugewiesen." href="/challenges" action="Challenges ansehen" />;
  }
  return (
    <article className="flex min-h-72 flex-col rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-amber-200 text-lg">?</span><div><p className="text-sm font-semibold text-amber-900">{data.next.status === "revision-requested" ? "Überarbeitung erforderlich" : data.next.status === "submitted" ? "Wartet auf Review" : "Nächste Challenge"}</p><p className="text-xs text-amber-800">{data.count} nicht abgeschlossen</p></div></div><div className="flex flex-wrap justify-end gap-2"><AssignmentStatusBadge status={data.next.status} />{data.next.isOverdue && <AssignmentOverdueBadge />}</div></div>
      <h3 className="mt-6 text-lg font-bold leading-7 text-slate-950 sm:text-xl">{data.next.challenge.title}</h3>
      <p className="mt-2 line-clamp-3 leading-7 text-slate-700">{data.next.status === "revision-requested" && data.next.latestSubmission?.review ? data.next.latestSubmission.review.feedback : data.next.challenge.shortDescription}</p>
      <p className="mt-4 text-sm font-semibold text-amber-950">{data.next.dueAt ? `Fällig ${formatChallengeDate(data.next.dueAt)}` : "Keine Fälligkeit"}</p>
      <div className="mt-auto pt-6"><Link href={`/challenges/${data.next.id}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-900">Challenge öffnen<span aria-hidden="true" className="ml-2">→</span></Link></div>
    </article>
  );
}

function DashboardCard({ eyebrow, title, description, href, action }: { eyebrow: string; title: string; description: string; href: string; action: string }) {
  return <article className="flex min-h-72 flex-col rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-amber-200 text-lg">?</span><p className="text-sm font-semibold text-amber-900">{eyebrow}</p></div><h3 className="mt-6 text-lg font-bold leading-7 text-slate-950 sm:text-xl">{title}</h3><p className="mt-2 leading-7 text-slate-700">{description}</p><div className="mt-auto pt-6"><Link href={href} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-900">{action}<span aria-hidden="true" className="ml-2">→</span></Link></div></article>;
}
