import type { AccountRole } from "./auth-types.ts";

export const TEAM_ROLES = ["member", "manager"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const TEAM_ROLE_LABELS: Readonly<Record<TeamRole, string>> = Object.freeze({
  member: "Mitglied",
  manager: "Teamleitung",
});

export type TeamInput = {
  name: string;
  slug: string;
  description?: string;
};

export type TeamInputErrors = {
  name?: string;
  slug?: string;
  description?: string;
};

const teamSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function parseTeamRole(value: unknown): TeamRole | undefined {
  return typeof value === "string" && TEAM_ROLES.includes(value as TeamRole)
    ? value as TeamRole
    : undefined;
}

export function validateTeamInput(nameValue: unknown, descriptionValue: unknown):
  | { valid: true; value: TeamInput }
  | { valid: false; errors: TeamInputErrors } {
  const name = normalizeSpaces(nameValue);
  const description = normalizeSpaces(descriptionValue);
  const slug = slugifyTeamName(name);
  const errors: TeamInputErrors = {};

  if (name.length < 2 || name.length > 80) {
    errors.name = "Der Teamname muss 2 bis 80 Zeichen lang sein.";
  }
  if (description.length > 500) {
    errors.description = "Die Beschreibung darf höchstens 500 Zeichen lang sein.";
  }
  if (slug.length < 2 || slug.length > 96 || !teamSlugPattern.test(slug)) {
    errors.slug = "Aus diesem Namen kann keine sichere Team-Adresse gebildet werden.";
  }

  return Object.keys(errors).length > 0
    ? { valid: false, errors }
    : { valid: true, value: { name, slug, description: description || undefined } };
}

export function slugifyTeamName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("de-DE")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .replace(/-{2,}/gu, "-");
}

export function canViewTeam(input: {
  viewerCanManageTeams: boolean;
  viewerIsMember: boolean;
  teamActive: boolean;
}) {
  return input.viewerCanManageTeams || input.teamActive && input.viewerIsMember;
}

export function canViewSocialProfile(input: {
  viewerId: string;
  targetUserId: string;
  viewerCanManageTeams: boolean;
  sharesActiveTeam: boolean;
}) {
  return input.viewerId === input.targetUserId
    || input.viewerCanManageTeams
    || input.sharesActiveTeam;
}

export function compareLeaderboardMembers(
  left: { id: string; displayName: string; totalXp: number },
  right: { id: string; displayName: string; totalXp: number },
) {
  return right.totalXp - left.totalXp
    || left.displayName.localeCompare(right.displayName, "de", { sensitivity: "base" })
    || left.id.localeCompare(right.id);
}

export function isRankedTeamMember(role: AccountRole, teamActive: boolean, disabled: boolean) {
  return teamActive && !disabled && role === "learner";
}

function normalizeSpaces(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/gu, " ") : "";
}
