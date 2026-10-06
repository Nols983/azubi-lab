export const ACHIEVEMENT_TIME_ZONE = "Europe/Berlin";

export const TIME_OF_DAY_PERIODS = ["MORNING", "DAY", "EVENING", "NIGHT"] as const;
export type TimeOfDayPeriod = (typeof TIME_OF_DAY_PERIODS)[number];

export type LocalTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const zonedFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ACHIEVEMENT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function getTimeOfDayPeriod(hour: number): TimeOfDayPeriod {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError("Time-of-day classification requires an hour from 0 through 23.");
  }
  if (hour >= 5 && hour < 10) return "MORNING";
  if (hour >= 10 && hour < 18) return "DAY";
  if (hour >= 18 && hour < 23) return "EVENING";
  return "NIGHT";
}

export function getAchievementTimeParts(value: Date | string): LocalTimeParts | undefined {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const values = Object.fromEntries(
    zonedFormatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const parts = {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
  return Object.values(parts).every(Number.isInteger) ? parts : undefined;
}

export function getLogicalTimeWindow(parts: LocalTimeParts) {
  assertLocalTimeParts(parts);
  const period = getTimeOfDayPeriod(parts.hour);
  const anchorDate = period === "NIGHT" && parts.hour < 5
    ? previousCalendarDate(parts)
    : formatCalendarDate(parts);
  return { period, anchorDate, key: `${period}:${anchorDate}` } as const;
}

function previousCalendarDate(parts: LocalTimeParts) {
  const calendarDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  calendarDate.setUTCDate(calendarDate.getUTCDate() - 1);
  return formatCalendarDate({
    year: calendarDate.getUTCFullYear(),
    month: calendarDate.getUTCMonth() + 1,
    day: calendarDate.getUTCDate(),
  });
}

function formatCalendarDate(parts: Pick<LocalTimeParts, "year" | "month" | "day">) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function assertLocalTimeParts(parts: LocalTimeParts) {
  const values = [parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second];
  if (!values.every(Number.isInteger)
    || parts.month < 1 || parts.month > 12
    || parts.day < 1 || parts.day > 31
    || parts.hour < 0 || parts.hour > 23
    || parts.minute < 0 || parts.minute > 59
    || parts.second < 0 || parts.second > 59) {
    throw new RangeError("Invalid local time parts.");
  }
}
