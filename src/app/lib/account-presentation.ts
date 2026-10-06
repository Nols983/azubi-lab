export function getAccountInitials(displayName: unknown) {
  if (typeof displayName !== "string") return "?";
  const words = displayName.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return "?";
  const selectedWords = words.length === 1 ? words : [words[0], words.at(-1)!];
  const initials = selectedWords.map(firstUppercaseCodePoint).join("");
  return initials || "?";
}

function firstUppercaseCodePoint(word: string) {
  const first = Array.from(word)[0] ?? "";
  return Array.from(first.toLocaleUpperCase("de-DE"))[0] ?? "";
}
