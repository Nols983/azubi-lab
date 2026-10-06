import {
  getLogicalTimeWindow,
  getTimeOfDayPeriod,
  type LocalTimeParts,
  type TimeOfDayPeriod,
} from "./time-of-day.ts";

export type DashboardGreeting = {
  heading: string;
  emoji: string;
  subtitle: string;
  period?: TimeOfDayPeriod;
  variant?: number;
};

type GreetingCopy = (displayName?: string) => Omit<DashboardGreeting, "period" | "variant">;

const GREETING_COPY: Readonly<Record<TimeOfDayPeriod, readonly GreetingCopy[]>> = Object.freeze({
  MORNING: [
    (name) => ({ heading: withName("Guten Morgen", name), emoji: "☀️", subtitle: "Bereit für die nächste Runde?" }),
    (name) => ({ heading: withName("Guten Morgen", name), emoji: "☕", subtitle: "Was steht heute auf deinem Lernplan?" }),
    (name) => ({ heading: withName("Früh dran", name), emoji: "☀️", subtitle: "Schnapp dir die nächste Lektion." }),
  ],
  DAY: [
    (name) => ({ heading: withName("Guten Tag", name), emoji: "👋", subtitle: "Was möchtest du heute lernen?" }),
    (name) => ({ heading: withName("Schön, dass du da bist", name), emoji: "🚀", subtitle: "Weiter mit deinem nächsten Lernziel." }),
    (name) => ({ heading: withName("Weiter geht's", name), emoji: "👋", subtitle: "Such dir dein nächstes Thema aus." }),
  ],
  EVENING: [
    (name) => ({ heading: withName("Guten Abend", name), emoji: "🌆", subtitle: "Lust auf eine kurze Lerneinheit?" }),
    (name) => ({ heading: withName("Feierabend-Fokus", name), emoji: "🌆", subtitle: "Ein bisschen Fortschritt geht noch." }),
    (name) => ({ heading: withName("Noch eine Runde", name, "?"), emoji: "✨", subtitle: "Vielleicht passt noch eine kurze Lektion." }),
  ],
  NIGHT: [
    (name) => ({ heading: withName("Noch wach", name, "?"), emoji: "🌙", subtitle: "Dann holen wir noch etwas Fortschritt raus." }),
    (name) => ({ heading: withName("Nachtschicht", name, "?"), emoji: "🌙", subtitle: "Eine Lektion geht noch." }),
    (name) => ({ heading: withName("Späte Lernrunde", name), emoji: "🌙", subtitle: "Mach's dir gemütlich und leg los." }),
  ],
});

export function getNeutralDashboardGreeting(displayName?: string): DashboardGreeting {
  return {
    heading: withName("Willkommen zurück", displayName),
    emoji: "👋",
    subtitle: "Bereit für die nächste Lerneinheit?",
  };
}

export function getDashboardGreeting(date: Date, displayName?: string): DashboardGreeting {
  if (Number.isNaN(date.getTime())) throw new RangeError("Dashboard greeting requires a valid date.");
  const parts = browserLocalTimeParts(date);
  const window = getLogicalTimeWindow(parts);
  const variant = stableVariant(`${window.key}`, GREETING_COPY[window.period].length);
  return {
    ...GREETING_COPY[window.period][variant](normalizeName(displayName)),
    period: window.period,
    variant,
  };
}

export function getMillisecondsUntilNextGreetingBoundary(date: Date) {
  if (Number.isNaN(date.getTime())) throw new RangeError("Greeting scheduling requires a valid date.");
  const hour = date.getHours();
  const nextHour = hour < 5 ? 5 : hour < 10 ? 10 : hour < 18 ? 18 : hour < 23 ? 23 : 5;
  const next = new Date(date);
  if (hour >= 23) next.setDate(next.getDate() + 1);
  next.setHours(nextHour, 0, 0, 0);
  return Math.max(25, next.getTime() - date.getTime() + 25);
}

export function getBrowserGreetingPeriod(date: Date) {
  return getTimeOfDayPeriod(date.getHours());
}

function browserLocalTimeParts(date: Date): LocalTimeParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

function stableVariant(key: string, count: number) {
  let hash = 2166136261;
  for (const character of key) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % count;
}

function withName(prefix: string, displayName?: string, suffix = "") {
  const name = normalizeName(displayName);
  return `${prefix}${name ? `, ${name}` : ""}${suffix}`;
}

function normalizeName(displayName?: string) {
  const name = displayName?.trim();
  return name || undefined;
}
