import {
  getAchievementTimeParts,
  getLogicalTimeWindow,
  type TimeOfDayPeriod,
} from "./time-of-day.ts";

export const TIME_ACHIEVEMENT_BADGE_IDS = Object.freeze({
  MORNING: "badge-fruehstarter",
  DAY: "badge-tagesform",
  EVENING: "badge-feierabend-fokus",
  NIGHT: "badge-nachteule",
} satisfies Readonly<Record<TimeOfDayPeriod, string>>);

export type TimeAchievementBadgeId = (typeof TIME_ACHIEVEMENT_BADGE_IDS)[TimeOfDayPeriod];

export type LessonFirstCompletion = {
  lessonId: string;
  completedAt: string;
};

type CanonicalCompletion = LessonFirstCompletion & { instant: number };

export function deriveTimeAchievementUnlockDates(
  completions: readonly LessonFirstCompletion[],
): Readonly<Partial<Record<TimeAchievementBadgeId, string>>> {
  const firstByLesson = new Map<string, CanonicalCompletion>();
  for (const completion of completions) {
    const lessonId = completion.lessonId.trim();
    const instant = new Date(completion.completedAt).getTime();
    if (!lessonId || Number.isNaN(instant)) continue;
    const current = firstByLesson.get(lessonId);
    if (!current || instant < current.instant) {
      firstByLesson.set(lessonId, {
        lessonId,
        completedAt: new Date(instant).toISOString(),
        instant,
      });
    }
  }

  const ordered = [...firstByLesson.values()].sort(compareCompletions);
  const windows = new Map<string, CanonicalCompletion[]>();
  for (const completion of ordered) {
    const parts = getAchievementTimeParts(completion.completedAt);
    if (!parts) continue;
    const window = getLogicalTimeWindow(parts);
    const items = windows.get(window.key) ?? [];
    items.push(completion);
    windows.set(window.key, items);
  }

  const dates: Partial<Record<TimeAchievementBadgeId, string>> = {};
  for (const [windowKey, items] of windows) {
    if (items.length < 3) continue;
    const period = windowKey.slice(0, windowKey.indexOf(":")) as TimeOfDayPeriod;
    const rewardId = TIME_ACHIEVEMENT_BADGE_IDS[period];
    const third = [...items].sort(compareCompletions)[2];
    const current = dates[rewardId];
    if (third && (!current || third.completedAt < current)) dates[rewardId] = third.completedAt;
  }
  return dates;
}

function compareCompletions(left: CanonicalCompletion, right: CanonicalCompletion) {
  return left.instant - right.instant || left.lessonId.localeCompare(right.lessonId);
}
