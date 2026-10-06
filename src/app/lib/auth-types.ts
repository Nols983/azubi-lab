export const ACCOUNT_ROLES = ["learner", "observer", "instructor", "admin"] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const ACCOUNT_ROLE_LABELS: Record<AccountRole, string> = {
  learner: "Lernender",
  observer: "Betrachter",
  instructor: "Werkstattleiter",
  admin: "Administrator",
};

export const ACCOUNT_CREATION_ROLES = ["learner", "observer"] as const satisfies readonly AccountRole[];

export type AccountCreationRole = (typeof ACCOUNT_CREATION_ROLES)[number];

export type LearnerIdentity = {
  id: string;
  login: string;
  displayName: string;
};

export type CurrentUser = LearnerIdentity & {
  role: AccountRole;
  mustChangePassword: boolean;
};

export type SessionUserIdentity = LearnerIdentity & {
  authVersion: number;
};
