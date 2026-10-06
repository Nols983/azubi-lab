import type { CurrentUser } from "./auth-types.ts";
import type { LevelProgress } from "./xp-domain.ts";
import type { CurrentXpView } from "./server/xp-service.ts";

export function selectAppShellXpProgress(
  mode: "anonymous" | "authenticated" | "preview",
  user: CurrentUser | undefined,
  xp: CurrentXpView,
): LevelProgress | undefined {
  return mode === "authenticated"
    && user?.role === "learner"
    && !user.mustChangePassword
    && xp.audience === "learner"
    ? xp.progress
    : undefined;
}
