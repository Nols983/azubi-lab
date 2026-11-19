export const ACCOUNT_DELETION_WARNING = "Dieses Konto und seine persönlichen Daten einschließlich Lernfortschritten, Quizversuchen und Abgaben werden dauerhaft gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.";

export const ACCOUNT_DELETION_REASON_LABELS = {
  self: "Das eigene Administratorkonto darf nicht gelöscht werden.",
  "last-admin": "Der letzte aktive Administrator muss erhalten bleiben.",
  other: "Eine noch nicht unterstützte Datenabhängigkeit verhindert die sichere Löschung. Bitte lasse diese Abhängigkeit prüfen.",
} as const;
export type AccountDeletionReason = keyof typeof ACCOUNT_DELETION_REASON_LABELS;

export function accountDeletionIdentityReasons(input: { actorId: string; targetId: string; targetRole: string; targetDisabled: boolean; activeAdminCount: number }): AccountDeletionReason[] {
  const reasons: AccountDeletionReason[] = [];
  if (input.actorId === input.targetId) reasons.push("self");
  if (input.targetRole === "admin" && !input.targetDisabled && input.activeAdminCount <= 1) reasons.push("last-admin");
  return reasons;
}
export function isAccountDeletionConfirmation(confirmed: unknown, confirmationLogin: unknown, currentLogin: string) {
  // Exact match: do not normalize a destructive confirmation into a different identifier.
  return confirmed === "yes" && typeof confirmationLogin === "string" && confirmationLogin === currentLogin;
}
