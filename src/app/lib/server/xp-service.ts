import "server-only";

import { learningModules } from "../../data/learning-modules.ts";
import { getQuizCategoryLabel, isQuizCategoryId } from "../../data/quiz-bank/categories.ts";
import { presentXpEvent, type XpHistoryItem } from "../xp-event-presentation.ts";
import { deriveLevelProgress, type LevelProgress } from "../xp-domain.ts";
import { getCurrentDatabaseUser } from "./current-user.ts";
import { readRecentXpEventsForUser, readTotalXpForUser, type RecentXpEventRecord } from "./xp-repository.ts";
import { findCurrentLabDefinition } from "./lab-definitions.ts";

export type CurrentXpView =
  | { audience: "anonymous" }
  | { audience: "password-change" }
  | { audience: "other-role" }
  | { audience: "learner"; progress: LevelProgress };

export async function getCurrentXpView(): Promise<CurrentXpView> {
  if (!process.env.AUTH_SECRET) return { audience: "anonymous" };
  const user = await getCurrentDatabaseUser();
  if (!user) return { audience: "anonymous" };
  if (user.mustChangePassword) return { audience: "password-change" };
  if (user.role !== "learner") return { audience: "other-role" };
  return {
    audience: "learner",
    progress: await getLearnerXpProgress(user.id),
  };
}
export type CurrentXpHistoryView =
  | { audience: "anonymous" | "password-change" | "other-role"; items: readonly [] }
  | { audience: "learner"; items: readonly XpHistoryItem[] };

export async function getCurrentXpHistoryView(): Promise<CurrentXpHistoryView> {
  if (!process.env.AUTH_SECRET) return { audience: "anonymous", items: [] };
  const user = await getCurrentDatabaseUser();
  if (!user) return { audience: "anonymous", items: [] };
  if (user.mustChangePassword) return { audience: "password-change", items: [] };
  if (user.role !== "learner") return { audience: "other-role", items: [] };
  const events = await readRecentXpEventsForUser(user.id);
  return { audience: "learner", items: events.map(presentCanonicalXpEvent) };
}

function presentCanonicalXpEvent(event: RecentXpEventRecord) {
  return presentXpEvent({
    id: event.id,
    sourceType: event.sourceType,
    xpAmount: event.xpAmount,
    awardedAt: event.awardedAt,
    canonicalTitle: resolveCanonicalTitle(event),
    uniqueHintsUsed: event.uniqueHintsUsed,
    practiceCategories: event.practiceCategoryIds
      .filter(isQuizCategoryId)
      .map(getQuizCategoryLabel),
  });
}

function resolveCanonicalTitle(event: RecentXpEventRecord) {
  if (event.sourceType === "lab") return findCurrentLabDefinition(event.sourceKey)?.public.title;
  if (event.sourceType === "challenge") return event.challengeTitle;
  if (event.sourceType === "module_quiz") {
    return learningModules.find((module) => module.slug === event.sourceKey)?.title;
  }
  if (event.sourceType !== "lesson") return undefined;
  const separator = event.sourceKey.indexOf(":");
  if (separator < 1) return undefined;
  const moduleSlug = event.sourceKey.slice(0, separator);
  const lessonSlug = event.sourceKey.slice(separator + 1);
  const learningModule = learningModules.find((module) => module.slug === moduleSlug);
  const lesson = learningModule?.lessons?.find((item) => item.slug === lessonSlug);
  return learningModule && lesson ? `${learningModule.title} · ${lesson.title}` : undefined;
}

export async function getLearnerXpProgress(userId: string) {
  return deriveLevelProgress(parseTotalXp(await readTotalXpForUser(userId)));
}

function parseTotalXp(value: string) {
  if (!/^(0|[1-9]\d*)$/.test(value)) throw new XpServiceDataError();
  const totalXp = Number(value);
  if (!Number.isSafeInteger(totalXp)) throw new XpServiceDataError();
  return totalXp;
}

export class XpServiceDataError extends Error {
  constructor() {
    super("XP summary data is invalid.");
    this.name = "XpServiceDataError";
  }
}
