import "server-only";

import { isUuid } from "../account-security.ts";
import { canManageAssignments } from "../authorization.ts";
import { buildCurriculumAssignmentViews } from "../curriculum-planning.ts";
import { curriculumAssignmentNotificationCandidate } from "../notification-domain.ts";
import { learningModules } from "../../data/learning-modules.ts";
import {
  archiveCurriculumAssignment,
  assignCurriculumModulesWithClient,
  listCurriculumAssignmentsForLearner,
  updateCurriculumAssignment,
} from "./curriculum-assignment-repository.ts";
import { getCurrentDatabaseUser, requireCapability, requireLearnerUser } from "./current-user.ts";
import { withTransaction } from "./db.ts";
import { insertNotificationCandidatesWithClient } from "./notification-repository.ts";
import { dispatchPersistedNotificationPushBestEffort } from "./notification-push-service.ts";
import { readLearnerProgress } from "./progress-repository.ts";

const curriculumModuleTitles = new Map(learningModules.map((module) => [module.slug, module.title]));

export async function assignCurriculumModulesAsAdmin(input: {
  learnerId: string;
  moduleSlugs: readonly string[];
  targetAt: Date | null;
  note: string | null;
}) {
  const admin = await requireCapability("manageAssignments");
  if (!isUuid(input.learnerId)) throw new CurriculumPlanningTargetError();
  const result = await withTransaction(async (client) => {
    const assignments = await assignCurriculumModulesWithClient(client, { ...input, assignedBy: admin.id });
    const inserted = await insertNotificationCandidatesWithClient(
      client,
      assignments.map((assignment) => curriculumAssignmentNotificationCandidate({
        assignmentId: assignment.id,
        learnerId: assignment.learnerId,
        moduleTitle: curriculumModuleTitles.get(assignment.moduleSlug) ?? assignment.moduleSlug,
        assignedAt: assignment.assignedAt,
        eventVersion: assignment.eventVersion,
      })),
    );
    return { assignmentIds: assignments.map((assignment) => assignment.id), notifications: inserted.notifications };
  });
  await dispatchPersistedNotificationPushBestEffort(result.notifications);
  return result.assignmentIds;
}

export async function updateCurriculumAssignmentAsAdmin(input: {
  assignmentId: string;
  targetAt: Date | null;
  note: string | null;
}) {
  await requireCapability("manageAssignments");
  if (!isUuid(input.assignmentId)) throw new CurriculumPlanningTargetError();
  return updateCurriculumAssignment(input);
}

export async function archiveCurriculumAssignmentAsAdmin(assignmentId: string) {
  await requireCapability("manageAssignments");
  if (!isUuid(assignmentId)) throw new CurriculumPlanningTargetError();
  return archiveCurriculumAssignment(assignmentId);
}

export async function getLearnerLearningPlan() {
  const learner = await requireLearnerUser();
  const [assignments, state] = await Promise.all([
    listCurriculumAssignmentsForLearner(learner.id),
    readLearnerProgress(learner.id),
  ]);
  return { learner, assignments: buildCurriculumAssignmentViews(assignments, state) };
}

export async function getDashboardLearningPlanView() {
  if (!process.env.AUTH_SECRET) return { audience: "anonymous" as const };
  const user = await getCurrentDatabaseUser();
  if (!user) return { audience: "anonymous" as const };
  if (user.mustChangePassword) return { audience: "password-change" as const };
  if (canManageAssignments(user.role)) return { audience: "admin" as const };
  if (user.role !== "learner") return { audience: "unavailable" as const };
  const [assignments, state] = await Promise.all([
    listCurriculumAssignmentsForLearner(user.id),
    readLearnerProgress(user.id),
  ]);
  const views = buildCurriculumAssignmentViews(assignments, state);
  const incomplete = views.filter((assignment) => assignment.status !== "completed");
  return {
    audience: "learner" as const,
    assignedCount: views.length,
    activeCount: incomplete.length,
    completedCount: views.length - incomplete.length,
    overdueCount: incomplete.filter((assignment) => assignment.isOverdue).length,
    next: incomplete[0],
  };
}

export class CurriculumPlanningTargetError extends Error {
  constructor() {
    super("The curriculum planning target is invalid.");
    this.name = "CurriculumPlanningTargetError";
  }
}
