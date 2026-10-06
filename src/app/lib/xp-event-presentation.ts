export type XpPresentationSourceType = "lesson" | "module_quiz" | "challenge" | "practice_quiz" | "lab";

export type XpEventPresentationInput = {
  id: string;
  sourceType: XpPresentationSourceType;
  xpAmount: number;
  awardedAt: string;
  canonicalTitle?: string;
  uniqueHintsUsed?: number;
  practiceCategories?: readonly string[];
};

export type XpHistoryItem = {
  id: string;
  xpAmount: number;
  xpLabel: string;
  label: string;
  detail?: string;
  awardedAt: string;
};

export function presentXpEvent(input: XpEventPresentationInput): XpHistoryItem {
  if (!Number.isSafeInteger(input.xpAmount) || input.xpAmount < 1) {
    throw new RangeError("XP history contains an invalid reward.");
  }
  const base = {
    id: input.id,
    xpAmount: input.xpAmount,
    xpLabel: `+${input.xpAmount} XP`,
    awardedAt: input.awardedAt,
  };
  if (input.sourceType === "lab") {
    return {
      ...base,
      label: `Lab: ${input.canonicalTitle ?? "Troubleshooting-Lab"}`,
      detail: input.uniqueHintsUsed && input.uniqueHintsUsed > 0
        ? formatHintUsage(input.uniqueHintsUsed)
        : undefined,
    };
  }
  if (input.sourceType === "lesson") {
    return { ...base, label: `Lektion: ${input.canonicalTitle ?? "Lektion abgeschlossen"}` };
  }
  if (input.sourceType === "module_quiz") {
    return { ...base, label: `Abschlussquiz: ${input.canonicalTitle ?? "Lernmodul"}` };
  }
  if (input.sourceType === "challenge") {
    return { ...base, label: `Challenge: ${input.canonicalTitle ?? "Praxisaufgabe"}` };
  }
  const categories = input.practiceCategories?.length ? input.practiceCategories.join(", ") : undefined;
  return { ...base, label: "Übungsquiz", detail: categories };
}

export function formatHintUsage(uniqueHintsUsed: number) {
  if (!Number.isSafeInteger(uniqueHintsUsed) || uniqueHintsUsed < 1) {
    throw new RangeError("Hint usage must be a positive integer.");
  }
  return uniqueHintsUsed === 1 ? "1 Hinweis verwendet" : `${uniqueHintsUsed} Hinweise verwendet`;
}
