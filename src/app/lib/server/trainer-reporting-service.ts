import "server-only";

import { buildTrainerReportingSnapshot } from "../trainer-reporting.ts";
import { listLearnerAccounts } from "./admin-repository.ts";
import { listAllAssignmentsForAdmin } from "./challenge-assignment-repository.ts";
import { listCurriculumAssignmentsForLearners } from "./curriculum-assignment-repository.ts";
import { requireCapability } from "./current-user.ts";
import { listCurrentLabDefinitions } from "./lab-definitions.ts";
import { readLearnerProgressForUsers } from "./progress-repository.ts";
import { readTrainerLabAggregatesForLearners } from "./trainer-lab-reporting-repository.ts";
import { readTrainerLearnerFactsForLearners } from "./trainer-learner-summary-repository.ts";

export async function getTrainerReportingSnapshot(now = new Date()) {
  await requireCapability("viewLearnerProgress");
  const learners = await listLearnerAccounts();
  const learnerIds = learners.map((learner) => learner.id);
  const [states, planningRecords, challengeAssignments, labAggregates, learnerFacts] = await Promise.all([
    readLearnerProgressForUsers(learnerIds),
    listCurriculumAssignmentsForLearners(learnerIds),
    listAllAssignmentsForAdmin(now),
    readTrainerLabAggregatesForLearners(learnerIds),
    readTrainerLearnerFactsForLearners(learnerIds),
  ]);
  const labDefinitions = listCurrentLabDefinitions()
    .filter(({ public: definition }) => definition.kind === "troubleshooting")
    .map(({ public: definition }) => ({
      id: definition.id,
      title: definition.title,
      category: definition.category,
    }));
  return buildTrainerReportingSnapshot({ learners, states, planningRecords, challengeAssignments, labAggregates, labDefinitions, learnerFacts, now });
}
