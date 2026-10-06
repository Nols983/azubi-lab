import { learningModules, type LearningModule } from "./learning-modules.ts";
import { learningPathPhases, type LearningPathPhase } from "./learning-path-phases.ts";

export { learningPathPhases, type LearningPathPhase } from "./learning-path-phases.ts";

export type LearningPathGroup = Omit<LearningPathPhase, "moduleSlugs"> & {
  modules: LearningModule[];
};

export function buildLearningPathGroups(modules: readonly LearningModule[] = learningModules): LearningPathGroup[] {
  const modulesBySlug = new Map(modules.map((learningModule) => [learningModule.slug, learningModule]));
  return learningPathPhases.map(({ moduleSlugs, ...phase }) => ({
    ...phase,
    modules: moduleSlugs.flatMap((slug) => {
      const learningModule = modulesBySlug.get(slug);
      return learningModule ? [learningModule] : [];
    }),
  }));
}
