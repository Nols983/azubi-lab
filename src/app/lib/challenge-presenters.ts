import type { AssignmentStatus, ChallengeDifficulty, ChallengeStatus } from "./challenge-domain";

export const challengeStatusLabels: Record<ChallengeStatus, string> = {
  draft: "Entwurf",
  published: "Veröffentlicht",
  archived: "Archiviert",
};

export const challengeDifficultyLabels: Record<ChallengeDifficulty, string> = {
  easy: "Einfach",
  medium: "Mittel",
  hard: "Anspruchsvoll",
};

export const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  "not-started": "Offen",
  "in-progress": "In Bearbeitung",
  submitted: "Eingereicht · Review offen",
  "revision-requested": "Überarbeitung angefordert",
  approved: "Freigegeben",
  "legacy-completed": "Früherer Abschluss",
};

export function getAssignmentStatusLabel(status: AssignmentStatus, audience: "trainer" | "learner" = "trainer") {
  if (audience === "learner" && (status === "approved" || status === "legacy-completed")) return "Abgeschlossen";
  return assignmentStatusLabels[status];
}

export function formatChallengeDate(value: Date, includeTime = true) {
  return new Intl.DateTimeFormat("de-DE", includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(value);
}
