import "server-only";

import { getLearningModule, getLesson } from "../../data/learning-modules.ts";
import { canBypassLearningProgression } from "../authorization.ts";
import { createEmptyLearnerProgressState } from "../learner-progress.ts";
import {
  getLessonProgression,
  getModuleLearningProgression,
  type ModuleProgressionView,
} from "../learning-progression.ts";
import { getCurrentDatabaseUser, getSessionUserIdentity } from "./current-user.ts";
import { readLearnerProgress } from "./progress-repository.ts";
import type { DatabaseUser } from "./user-repository.ts";

export type CurrentLearningProgression =
  | { audience: "anonymous" }
  | { audience: "unavailable" }
  | { audience: "learner"; progression: ModuleProgressionView }
  | { audience: "staff"; progression: ModuleProgressionView };

export class LearningProgressionAccessError extends Error {
  constructor(readonly target: "lesson" | "quiz") {
    super(`The requested ${target} is locked by canonical learning progression.`);
    this.name = "LearningProgressionAccessError";
  }
}

export async function getCurrentLearningProgression(moduleSlug: string): Promise<CurrentLearningProgression> {
  if (!getLearningModule(moduleSlug)) throw new LearningProgressionAccessError("lesson");
  if (!process.env.AUTH_SECRET) return { audience: "anonymous" };
  const identity = await getSessionUserIdentity();
  if (!identity) return { audience: "anonymous" };
  const user = await getCurrentDatabaseUser();
  if (!user) return { audience: "unavailable" };
  if (canBypassLearningProgression(user.role)) {
    return {
      audience: "staff",
      progression: getModuleLearningProgression(createEmptyLearnerProgressState(), moduleSlug, { bypass: true }),
    };
  }
  return {
    audience: "learner",
    progression: getModuleLearningProgression(await readLearnerProgress(user.id), moduleSlug),
  };
}

export async function assertLessonUnlockedForUser(user: DatabaseUser, moduleSlug: string, lessonSlug: string) {
  if (!getLearningModule(moduleSlug) || !getLesson(moduleSlug, lessonSlug)) throw new LearningProgressionAccessError("lesson");
  if (canBypassLearningProgression(user.role)) return;
  const progression = getModuleLearningProgression(await readLearnerProgress(user.id), moduleSlug);
  if (!getLessonProgression(progression, lessonSlug).unlocked) throw new LearningProgressionAccessError("lesson");
}

export async function assertQuizUnlockedForUser(user: DatabaseUser, moduleSlug: string) {
  if (!getLearningModule(moduleSlug)) throw new LearningProgressionAccessError("quiz");
  if (canBypassLearningProgression(user.role)) return;
  const progression = getModuleLearningProgression(await readLearnerProgress(user.id), moduleSlug);
  if (!progression.quiz.unlocked) throw new LearningProgressionAccessError("quiz");
}
