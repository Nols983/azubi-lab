import "server-only";

import { createEmptyLearnerProgressState, type LearnerProgressState } from "../learner-progress";
import { readLearnerProgress } from "./progress-repository";
import type { CurrentUser } from "../auth-types";
import { getCurrentDatabaseUser, getSessionUserIdentity } from "./current-user";
import { isReadOnlyPlatformPreview } from "../authorization";

export type LearnerBootstrap = {
  mode: "anonymous" | "authenticated" | "preview";
  learner?: CurrentUser;
  initialState: LearnerProgressState;
  loadError?: string;
};

export async function getLearnerBootstrap(): Promise<LearnerBootstrap> {
  if (!process.env.AUTH_SECRET) return anonymousBootstrap();
  try {
    const sessionIdentity = await getSessionUserIdentity();
    if (!sessionIdentity) return anonymousBootstrap();
    try {
      const databaseUser = await getCurrentDatabaseUser();
      if (!databaseUser) {
        return {
          mode: "anonymous",
          initialState: createEmptyLearnerProgressState(),
          loadError: "Diese Kontositzung ist nicht mehr aktiv. Bitte melde dich ab und erneut an.",
        };
      }
      const learner: CurrentUser = {
        id: databaseUser.id,
        login: databaseUser.login,
        displayName: databaseUser.displayName,
        role: databaseUser.role,
        mustChangePassword: databaseUser.mustChangePassword,
      };
      if (learner.mustChangePassword) {
        return {
          mode: "anonymous",
          learner,
          initialState: createEmptyLearnerProgressState(),
          loadError: "Ändere zuerst dein temporäres Passwort. Kontogebundene Lernstandsänderungen sind bis dahin gesperrt.",
        };
      }
      if (isReadOnlyPlatformPreview(learner.role)) {
        return {
          mode: "preview",
          learner,
          initialState: createEmptyLearnerProgressState(),
        };
      }
      return { mode: "authenticated", learner, initialState: await readLearnerProgress(learner.id) };
    } catch (error) {
      logServerError("progress bootstrap", error);
      return {
        mode: "anonymous",
        initialState: createEmptyLearnerProgressState(),
        loadError: "Dein Konto-Lernstand konnte gerade nicht geladen werden.",
      };
    }
  } catch (error) {
    logServerError("session bootstrap", error);
    return anonymousBootstrap();
  }
}

function anonymousBootstrap(): LearnerBootstrap {
  return { mode: "anonymous", initialState: createEmptyLearnerProgressState() };
}

function logServerError(area: string, error: unknown) {
  console.error(`[azubi-lab] ${area} failed`, error instanceof Error ? error.name : "UnknownError");
}
