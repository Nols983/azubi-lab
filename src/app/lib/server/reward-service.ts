import "server-only";

import { learningModules } from "../../data/learning-modules.ts";
import { quizzes } from "../../data/quizzes.ts";
import {
  canSelectProfileBadges,
  canSelectProfileTitle,
  deriveLearnerRewardState,
  type RewardEvidence,
} from "../progression-rewards.ts";
import type { AccountRole } from "../auth-types.ts";
import {
  countCanonicalLearningDates,
  deriveRewardUnlockDates,
  type RewardModuleCompletion,
  type RewardQuizCompletion,
} from "../reward-history.ts";
import { TIME_ACHIEVEMENT_BADGE_IDS, type LessonFirstCompletion, type TimeAchievementBadgeId } from "../time-achievements.ts";
import { listCurrentLabDefinitions } from "./lab-definitions.ts";
import { getDatabasePool } from "./db.ts";
import {
  readProfilePreferences,
  readProfilePreferencesForUsers,
  saveActiveTitlePreference,
  savePinnedBadgePreferences,
} from "./profile-preference-repository.ts";
import { readLearnerProgress, readLearnerProgressForUsers } from "./progress-repository.ts";
import { getLearnerXpProgress } from "./xp-service.ts";
import { readXpEventsForUser, readXpEventsForUsers, type XpEventRecord } from "./xp-repository.ts";

const quizModuleIds = new Set(quizzes.map((quiz) => quiz.moduleSlug));
const normalLabIds = listCurrentLabDefinitions()
  .filter((definition) => definition.public.kind === "troubleshooting")
  .map((definition) => definition.public.id);
const normalLabIdSet = new Set(normalLabIds);
const canonicalLessonIds = new Set(learningModules.flatMap((module) => (
  (module.lessons ?? [])
    .filter((lesson) => lesson.status === "available")
    .map((lesson) => `${module.slug}/${lesson.slug}`)
)));
const timeAchievementBadgeIds = Object.values(TIME_ACHIEVEMENT_BADGE_IDS);

export async function getLearnerRewardState(userId: string) {
  const [progress, xp, labHistory, preferences, xpEvents] = await Promise.all([
    readLearnerProgress(userId),
    getLearnerXpProgress(userId),
    readLearnerLabRewardHistory(userId),
    readProfilePreferences(userId),
    readXpEventsForUser(userId),
  ]);
  return deriveRewardState(progress, labHistory, preferences, xpEvents, xp.totalXp);
}

export async function getLearnerRewardStates(userIds: readonly string[]) {
  const uniqueUserIds = [...new Set(userIds)];
  const [progressByUser, labHistoryByUser, preferencesByUser, xpEventsByUser] = await Promise.all([
    readLearnerProgressForUsers(uniqueUserIds),
    readLearnerLabRewardHistoryForUsers(uniqueUserIds),
    readProfilePreferencesForUsers(uniqueUserIds),
    readXpEventsForUsers(uniqueUserIds),
  ]);
  const states = new Map<string, ReturnType<typeof deriveRewardState>>();
  for (const userId of uniqueUserIds) {
    const progress = progressByUser.get(userId);
    const labHistory = labHistoryByUser.get(userId);
    const preferences = preferencesByUser.get(userId);
    const xpEvents = xpEventsByUser.get(userId);
    if (!progress || !labHistory || !preferences || !xpEvents) throw new RewardServiceDataError();
    const totalXp = xpEvents.reduce((total, event) => total + event.xpAmount, 0);
    states.set(userId, deriveRewardState(progress, labHistory, preferences, xpEvents, totalXp));
  }
  return states;
}

function deriveRewardState(
  progress: Awaited<ReturnType<typeof readLearnerProgress>>,
  labHistory: readonly LearnerLabRewardHistoryItem[],
  preferences: Awaited<ReturnType<typeof readProfilePreferences>>,
  xpEvents: readonly XpEventRecord[],
  totalXp: number,
) {
  const completedModuleIds = learningModules
    .filter((module) => {
      const availableLessons = module.lessons?.filter((lesson) => lesson.status === "available") ?? [];
      const lessonsCompleted = availableLessons.length > 0 && availableLessons.every((lesson) => (
        Boolean(progress.progression.lessonCompletions[`${module.slug}/${lesson.slug}`])
      ));
      const quizCompleted = !quizModuleIds.has(module.slug)
        || Boolean(progress.progression.moduleQuizSubmissions[module.slug]);
      return lessonsCompleted && quizCompleted;
    })
    .map((module) => module.slug);
  const lessonCompletions = deriveLessonCompletionHistory(progress, xpEvents);
  const quizCompletions = deriveQuizCompletionHistory(xpEvents);
  const moduleCompletions = deriveModuleCompletionHistory(lessonCompletions, quizCompletions);
  const unlockDates = deriveRewardUnlockDates({
    xpEvents,
    labCompletions: labHistory,
    moduleCompletions,
    quizCompletions,
    lessonCompletions,
    normalLabCount: normalLabIds.length,
  });
  const evidence: RewardEvidence = {
    completedModuleIds,
    perfectQuizModuleIds: Object.entries(progress.quizzes)
      .filter(([moduleId, quiz]) => quizModuleIds.has(moduleId) && quiz.bestPercentage === 100)
      .map(([moduleId]) => moduleId),
    completedNormalLabIds: labHistory.map((item) => item.labId),
    zeroHintNormalLabIds: labHistory
      .filter((item) => item.uniqueHintsUsed === 0)
      .map((item) => item.labId),
    normalLabCount: normalLabIds.length,
    unlockedTimeAchievementIds: timeAchievementBadgeIds.filter(
      (id): id is TimeAchievementBadgeId => Boolean(unlockDates[id]),
    ),
    canonicalLessonCompletionIds: lessonCompletions.map((completion) => completion.lessonId),
    canonicalModuleCompletionIds: moduleCompletions.map((completion) => completion.moduleId),
    canonicalQuizCompletionIds: quizCompletions.map((completion) => completion.moduleId),
    canonicalLearningDateCount: countCanonicalLearningDates(lessonCompletions),
  };
  if (!Number.isSafeInteger(totalXp) || totalXp < 0) throw new RewardServiceDataError();
  return deriveLearnerRewardState({
    totalXp,
    evidence,
    selectedTitleId: preferences.activeTitleId,
    pinnedBadgeIds: preferences.pinnedBadgeIds,
    unlockDates,
  });
}

function deriveLessonCompletionHistory(
  progress: Awaited<ReturnType<typeof readLearnerProgress>>,
  xpEvents: readonly XpEventRecord[],
): LessonFirstCompletion[] {
  const learnerLessonEvents = new Map(xpEvents
    .filter((event) => event.sourceType === "lesson")
    .map((event) => [event.sourceKey, event.awardedAt] as const));
  return Object.entries(progress.progression.lessonCompletions)
    .filter(([lessonId, completedAt]) => (
      canonicalLessonIds.has(lessonId)
      && learnerLessonEvents.get(toLessonXpSourceKey(lessonId)) === completedAt
    ))
    .map(([lessonId, completedAt]) => ({ lessonId, completedAt }));
}

function toLessonXpSourceKey(lessonId: string) {
  const separator = lessonId.indexOf("/");
  return separator < 1 ? "" : `${lessonId.slice(0, separator)}:${lessonId.slice(separator + 1)}`;
}

export async function selectProfileActiveTitle(
  user: { id: string; role: AccountRole },
  titleId?: string,
) {
  const learnerState = user.role === "learner"
    ? await getLearnerRewardState(user.id)
    : undefined;
  if (!canSelectProfileTitle(user.role, titleId, learnerState)) {
    if (user.role === "observer") throw new ProfileTitleAuthorizationError();
    throw new LockedProfileRewardError();
  }
  await saveActiveTitlePreference(user.id, titleId);
}

export async function updateProfilePinnedBadges(
  user: { id: string; role: AccountRole },
  badgeIds: readonly string[],
) {
  const learnerState = user.role === "learner"
    ? await getLearnerRewardState(user.id)
    : undefined;
  if (!canSelectProfileBadges(user.role, badgeIds, learnerState)) {
    if (user.role === "observer") throw new ProfileBadgeAuthorizationError();
    throw new LockedProfileRewardError();
  }
  await savePinnedBadgePreferences(user.id, badgeIds);
}

async function readLearnerLabRewardHistory(userId: string) {
  const result = await getDatabasePool().query<{
    lab_id: string;
    unique_hints_used: number;
    first_completed_at: Date;
  }>(
    `SELECT lab_id, unique_hints_used, first_completed_at
     FROM learner_lab_completion_history
     WHERE user_id = $1
     ORDER BY first_completed_at ASC, lab_id ASC`,
    [userId],
  );
  return result.rows
    .filter((row) => normalLabIdSet.has(row.lab_id))
    .map((row) => {
      if (!Number.isSafeInteger(row.unique_hints_used) || row.unique_hints_used < 0) {
        throw new RewardServiceDataError();
      }
      return { labId: row.lab_id, uniqueHintsUsed: row.unique_hints_used, firstCompletedAt: row.first_completed_at.toISOString() };
    });
}

type LearnerLabRewardHistoryItem = Awaited<ReturnType<typeof readLearnerLabRewardHistory>>[number];

async function readLearnerLabRewardHistoryForUsers(userIds: readonly string[]) {
  const history = new Map<string, LearnerLabRewardHistoryItem[]>(userIds.map((userId) => [userId, []]));
  if (userIds.length === 0) return history;
  const result = await getDatabasePool().query<{
    user_id: string;
    lab_id: string;
    unique_hints_used: number;
    first_completed_at: Date;
  }>(
    `SELECT user_id, lab_id, unique_hints_used, first_completed_at
     FROM learner_lab_completion_history
     WHERE user_id = ANY($1::uuid[])
     ORDER BY user_id ASC, first_completed_at ASC, lab_id ASC`,
    [userIds],
  );
  for (const row of result.rows) {
    if (!normalLabIdSet.has(row.lab_id)) continue;
    if (!Number.isSafeInteger(row.unique_hints_used) || row.unique_hints_used < 0) {
      throw new RewardServiceDataError();
    }
    const userHistory = history.get(row.user_id);
    if (!userHistory) throw new RewardServiceDataError();
    userHistory.push({
      labId: row.lab_id,
      uniqueHintsUsed: row.unique_hints_used,
      firstCompletedAt: row.first_completed_at.toISOString(),
    });
  }
  return history;
}
function deriveQuizCompletionHistory(
  xpEvents: readonly XpEventRecord[],
): RewardQuizCompletion[] {
  const firstByModule = new Map<string, string>();
  for (const event of xpEvents) {
    if (event.sourceType !== "module_quiz" || !quizModuleIds.has(event.sourceKey)) continue;
    const current = firstByModule.get(event.sourceKey);
    if (!current || event.awardedAt < current) firstByModule.set(event.sourceKey, event.awardedAt);
  }
  return [...firstByModule]
    .map(([moduleId, completedAt]) => ({ moduleId, completedAt }))
    .sort((left, right) => left.completedAt.localeCompare(right.completedAt) || left.moduleId.localeCompare(right.moduleId));
}

function deriveModuleCompletionHistory(
  lessonCompletions: readonly LessonFirstCompletion[],
  quizCompletions: readonly RewardQuizCompletion[],
): RewardModuleCompletion[] {
  const lessons = new Map(lessonCompletions.map((completion) => [completion.lessonId, completion.completedAt] as const));
  const completedQuizzes = new Map(quizCompletions.map((completion) => [completion.moduleId, completion.completedAt] as const));

  return learningModules.flatMap((module): RewardModuleCompletion[] => {
    if (quizModuleIds.has(module.slug)) {
      const quizCompletedAt = completedQuizzes.get(module.slug);
      return quizCompletedAt ? [{ moduleId: module.slug, completedAt: quizCompletedAt }] : [];
    }
    const availableLessons = module.lessons?.filter((lesson) => lesson.status === "available") ?? [];
    if (availableLessons.length === 0) return [];
    const completionDates = availableLessons
      .map((lesson) => lessons.get(`${module.slug}/${lesson.slug}`));
    if (completionDates.some((completedAt) => !completedAt)) return [];
    return [{ moduleId: module.slug, completedAt: completionDates.sort().at(-1)! }];
  });
}

export class LockedProfileRewardError extends Error {
  constructor() {
    super("The selected profile reward is not unlocked for this learner.");
    this.name = "LockedProfileRewardError";
  }
}

export class ProfileTitleAuthorizationError extends Error {
  constructor() {
    super("The current account cannot select profile titles.");
    this.name = "ProfileTitleAuthorizationError";
  }
}

export class ProfileBadgeAuthorizationError extends Error {
  constructor() {
    super("The current account cannot select profile badges.");
    this.name = "ProfileBadgeAuthorizationError";
  }
}

export class RewardServiceDataError extends Error {
  constructor() {
    super("Learner reward evidence violates the application contract.");
    this.name = "RewardServiceDataError";
  }
}
