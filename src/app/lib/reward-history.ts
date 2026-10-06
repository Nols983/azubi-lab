import {
  BATCH_28_2_MODULE_IDS,
  BATCH_28_2_PHASE_MODULE_IDS,
  LEVEL_TITLES,
  MULTI_FAULT_LAB_IDS,
} from "./progression-rewards.ts";
import { getXpThresholdForLevel } from "./xp-domain.ts";
import {
  deriveTimeAchievementUnlockDates,
  TIME_ACHIEVEMENT_BADGE_IDS,
  type LessonFirstCompletion,
} from "./time-achievements.ts";

export type RewardXpEvent = {
  id: string;
  xpAmount: number;
  awardedAt: string;
};

export type RewardLabCompletion = {
  labId: string;
  uniqueHintsUsed: number;
  firstCompletedAt: string;
};

export type RewardModuleCompletion = {
  moduleId: string;
  completedAt: string;
};

export type RewardQuizCompletion = {
  moduleId: string;
  completedAt: string;
};

export type RewardHistory = {
  xpEvents: readonly RewardXpEvent[];
  labCompletions: readonly RewardLabCompletion[];
  moduleCompletions: readonly RewardModuleCompletion[];
  quizCompletions: readonly RewardQuizCompletion[];
  lessonCompletions: readonly LessonFirstCompletion[];
  normalLabCount: number;
};

export function deriveRewardUnlockDates(history: RewardHistory) {
  const dates: Record<string, string> = {};
  deriveLevelTitleDates(history.xpEvents, dates);

  const labs = chronological(history.labCompletions, (item) => item.firstCompletedAt, (item) => item.labId);
  const noHintLabs = labs.filter((item) => item.uniqueHintsUsed === 0);
  assignNth(dates, "badge-lab-einsteiger", labs, 1);
  assignNth(dates, "badge-lab-erfahren", labs, 5);
  assignNth(dates, "badge-lab-profi", labs, 10);
  assignNth(dates, "achievement-lab-retter", labs, 10);
  assignNth(dates, "badge-ohne-hilfe", noHintLabs, 5);
  assignNth(dates, "badge-eigenstaendig", noHintLabs, 10);
  assignNth(dates, "badge-selbststaendig", noHintLabs, 15);
  assignNth(dates, "achievement-packet-whisperer", noHintLabs, 10);
  if (history.normalLabCount > 0) assignNth(dates, "badge-lab-meister", labs, history.normalLabCount);

  const multiFault = MULTI_FAULT_LAB_IDS.map((labId) => labs.find((item) => item.labId === labId));
  if (multiFault.every((item): item is RewardLabCompletion => Boolean(item))) {
    const completedAt = latest(multiFault.map((item) => item.firstCompletedAt));
    if (completedAt) {
      dates["achievement-fehlerjaeger"] = completedAt;
      dates["badge-multi-fault"] = completedAt;
    }
  }

  const lessons = firstCompletionMap(history.lessonCompletions, (item) => item.lessonId, (item) => item.completedAt);
  assignDistinctLessonModuleDate(dates, lessons, "badge-querbeet", 5);
  assignMapNth(dates, lessons, "badge-langstrecke", 100);
  assignLearningDate(dates, lessons, "badge-ausdauer", 30);

  const modules = firstCompletionMap(history.moduleCompletions, (item) => item.moduleId, (item) => item.completedAt);
  const firstModuleDate = earliest([...modules.values()]);
  if (firstModuleDate) dates["badge-erste-schritte"] = firstModuleDate;
  assignMapNth(dates, modules, "badge-wissenssammler", 10);
  assignMapNth(dates, modules, "badge-lernprofi", 20);
  assignMapNth(dates, modules, "badge-fuenferpack", 5);
  assignMapNth(dates, modules, "badge-halbzeit", 13);
  assignModule(dates, modules, "dns", ["achievement-dns-debugger"]);
  assignModule(dates, modules, "subnetting", ["achievement-subnetting-spezialist"]);
  assignModule(dates, modules, "backup-datensicherung", ["achievement-backup-waechter", "badge-backup-waechter"]);
  const networkDate = latest(["ipv4-grundlagen", "subnetting", "dhcp", "dns"].map((id) => modules.get(id)));
  if (networkDate) dates["badge-netzwerk-fundament"] = networkDate;
  const systemmeisterDate = latest(BATCH_28_2_MODULE_IDS.map((id) => modules.get(id)));
  if (systemmeisterDate) dates["badge-systemmeister"] = systemmeisterDate;
  const allrounderDate = latest(BATCH_28_2_PHASE_MODULE_IDS.map((phase) => (
    earliest(phase.map((moduleId) => modules.get(moduleId)))
  )));
  if (allrounderDate) dates["badge-allrounder"] = allrounderDate;

  const quizzes = firstCompletionMap(history.quizCompletions, (item) => item.moduleId, (item) => item.completedAt);
  assignMapNth(dates, quizzes, "badge-quizmarathon", 10);
  const perfektionistDate = latest(BATCH_28_2_MODULE_IDS.map((id) => quizzes.get(id)));
  if (perfektionistDate) dates["badge-perfektionist"] = perfektionistDate;

  const timeAchievementDates = deriveTimeAchievementUnlockDates(history.lessonCompletions);
  Object.assign(dates, timeAchievementDates);
  const rundUmDieUhrDate = latest(Object.values(TIME_ACHIEVEMENT_BADGE_IDS).map((id) => timeAchievementDates[id]));
  if (rundUmDieUhrDate) dates["badge-rund-um-die-uhr"] = rundUmDieUhrDate;

  return dates;
}

export function countCanonicalLearningDates(completions: readonly LessonFirstCompletion[]) {
  const lessons = firstCompletionMap(completions, (item) => item.lessonId, (item) => item.completedAt);
  return new Set([...lessons.values()].flatMap((completedAt) => {
    const date = berlinCalendarDate(completedAt);
    return date ? [date] : [];
  })).size;
}

export function formatRewardUnlockDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(date);
}

function deriveLevelTitleDates(events: readonly RewardXpEvent[], dates: Record<string, string>) {
  const ordered = chronological(
    events.filter((event) => Number.isSafeInteger(event.xpAmount) && event.xpAmount > 0),
    (event) => event.awardedAt,
    (event) => event.id,
  );
  const pending = LEVEL_TITLES
    .filter((title) => title.requiredLevel > 1)
    .map((title) => ({ ...title, threshold: getXpThresholdForLevel(title.requiredLevel) }))
    .sort((left, right) => left.threshold - right.threshold || left.id.localeCompare(right.id));
  let totalXp = 0;
  for (const event of ordered) {
    totalXp += event.xpAmount;
    for (const title of pending) {
      if (!dates[title.id] && totalXp >= title.threshold) dates[title.id] = event.awardedAt;
    }
  }
}

function assignNth(
  dates: Record<string, string>,
  rewardId: string,
  items: readonly RewardLabCompletion[],
  target: number,
) {
  const item = items[target - 1];
  const completedAt = item ? normalizeDate(item.firstCompletedAt) : undefined;
  if (completedAt) dates[rewardId] = completedAt;
}

function assignModule(
  dates: Record<string, string>,
  modules: ReadonlyMap<string, string>,
  moduleId: string,
  rewardIds: readonly string[],
) {
  const completedAt = modules.get(moduleId);
  if (!completedAt) return;
  for (const rewardId of rewardIds) dates[rewardId] = completedAt;
}

function assignMapNth(
  dates: Record<string, string>,
  values: ReadonlyMap<string, string>,
  rewardId: string,
  target: number,
) {
  const completedAt = [...values.values()].sort()[target - 1];
  if (completedAt) dates[rewardId] = completedAt;
}

function assignDistinctLessonModuleDate(
  dates: Record<string, string>,
  lessons: ReadonlyMap<string, string>,
  rewardId: string,
  target: number,
) {
  const modules = new Set<string>();
  for (const [lessonId, completedAt] of [...lessons].sort((left, right) => left[1].localeCompare(right[1]) || left[0].localeCompare(right[0]))) {
    const separator = lessonId.indexOf("/");
    if (separator < 1) continue;
    modules.add(lessonId.slice(0, separator));
    if (modules.size === target) {
      dates[rewardId] = completedAt;
      return;
    }
  }
}

function assignLearningDate(
  dates: Record<string, string>,
  lessons: ReadonlyMap<string, string>,
  rewardId: string,
  target: number,
) {
  const calendarDates = new Set<string>();
  for (const [, completedAt] of [...lessons].sort((left, right) => left[1].localeCompare(right[1]) || left[0].localeCompare(right[0]))) {
    const calendarDate = berlinCalendarDate(completedAt);
    if (!calendarDate || calendarDates.has(calendarDate)) continue;
    calendarDates.add(calendarDate);
    if (calendarDates.size === target) {
      dates[rewardId] = completedAt;
      return;
    }
  }
}

function firstCompletionMap<T>(
  items: readonly T[],
  idOf: (item: T) => string,
  dateOf: (item: T) => string,
) {
  const result = new Map<string, string>();
  for (const item of items) {
    const id = idOf(item).trim();
    const completedAt = normalizeDate(dateOf(item));
    if (!id || !completedAt) continue;
    const current = result.get(id);
    if (!current || completedAt < current) result.set(id, completedAt);
  }
  return result;
}

function berlinCalendarDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year && values.month && values.day
    ? `${values.year}-${values.month}-${values.day}`
    : undefined;
}

function chronological<T>(
  items: readonly T[],
  dateOf: (item: T) => string,
  tieBreakOf: (item: T) => string,
) {
  return items
    .filter((item) => Boolean(normalizeDate(dateOf(item))))
    .sort((left, right) => {
      const leftDate = normalizeDate(dateOf(left))!;
      const rightDate = normalizeDate(dateOf(right))!;
      return leftDate.localeCompare(rightDate) || tieBreakOf(left).localeCompare(tieBreakOf(right));
    });
}

function earliest(values: readonly (string | undefined)[]) {
  return validDates(values).sort()[0];
}

function latest(values: readonly (string | undefined)[]) {
  const normalized = validDates(values);
  return normalized.length === values.length ? normalized.sort().at(-1) : undefined;
}

function validDates(values: readonly (string | undefined)[]) {
  return values.map((value) => value ? normalizeDate(value) : undefined).filter((value): value is string => Boolean(value));
}

function normalizeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
