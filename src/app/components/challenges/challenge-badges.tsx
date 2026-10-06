import {
  challengeDifficultyLabels,
  challengeStatusLabels,
  getAssignmentStatusLabel,
} from "../../lib/challenge-presenters";
import type { AssignmentStatus, ChallengeDifficulty, ChallengeStatus } from "../../lib/challenge-domain";

export function ChallengeStatusBadge({ status }: { status: ChallengeStatus }) {
  const style = status === "published"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : status === "archived"
      ? "border-slate-300 bg-slate-100 text-slate-700"
      : "border-amber-200 bg-amber-50 text-amber-900";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${style}`}>{challengeStatusLabels[status]}</span>;
}

export function AssignmentStatusBadge({ status, audience = "trainer" }: { status: AssignmentStatus; audience?: "trainer" | "learner" }) {
  const style = status === "approved" || status === "legacy-completed"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : status === "revision-requested"
      ? "border-amber-300 bg-amber-50 text-amber-950"
      : status === "submitted"
        ? "border-violet-200 bg-violet-50 text-violet-800"
        : status === "in-progress"
        ? "border-blue-200 bg-blue-50 text-blue-800"
        : "border-slate-300 bg-white text-slate-700";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${style}`}>{getAssignmentStatusLabel(status, audience)}</span>;
}

export function AssignmentOverdueBadge() {
  return <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-800">Fälligkeit überschritten</span>;
}

export function AssignmentLateSubmissionBadge() {
  return <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-800">Nach Fälligkeit eingereicht</span>;
}

export function ChallengeDifficultyBadge({ difficulty }: { difficulty: ChallengeDifficulty | null }) {
  return <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">Schwierigkeit: {difficulty ? challengeDifficultyLabels[difficulty] : "nicht angegeben"}</span>;
}
