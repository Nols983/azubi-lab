import assert from "node:assert/strict";
import { evaluateLabUnlock } from "../src/app/lib/interactive-lab.ts";
import { appendLabTerminalEntry, applyLabConfiguration, executeLabOperation } from "../src/app/lib/lab-engine.ts";
import { cloneInitialLabState, findCurrentLabDefinition } from "../src/app/lib/server/lab-definitions.ts";
import {
  LabAttemptConflictError,
  LabAttemptNotFoundError,
  mutateOwnedLabAttempt,
  readOwnedLabCompletionReward,
  readOwnedLabAttemptHistory,
  readLabAttemptSummaries,
  readLatestOwnedLabAttempt,
  readOwnedLabAttempt,
  resetOwnedLabAttempt,
  startOrResumeLabAttempt,
} from "../src/app/lib/server/lab-repository.ts";
import {
  readProfilePreferences,
  saveActiveTitlePreference,
  savePinnedBadgePreferences,
} from "../src/app/lib/server/profile-preference-repository.ts";
import { readTrainerLabAggregatesForLearners } from "../src/app/lib/server/trainer-lab-reporting-repository.ts";
import { getDatabasePool } from "../src/app/lib/server/db.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = getDatabasePool();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const userIds: string[] = [];

try {
  const migration = await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations WHERE filename = '0017_interactive_labs.sql'");
  assert.equal(migration.rows[0]?.filename, "0017_interactive_labs.sql");
  const observerMigration = await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations WHERE filename = '0018_observer_role.sql'");
  assert.equal(observerMigration.rows[0]?.filename, "0018_observer_role.sql");
  const rewardMigration = await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations WHERE filename = '0019_progression_rewards_and_profile.sql'");
  assert.equal(rewardMigration.rows[0]?.filename, "0019_progression_rewards_and_profile.sql");
  const learnerId = await insertUser(`labs-${suffix}-learner`, "Lab Learner", "learner");
  const otherLearnerId = await insertUser(`labs-${suffix}-other`, "Other Learner", "learner");
  const tutorialLearnerId = await insertUser(`labs-${suffix}-tutorial`, "Tutorial Learner", "learner");
  const instructorId = await insertUser(`labs-${suffix}-instructor`, "Lab Instructor", "instructor");
  const observerId = await insertUser(`labs-${suffix}-observer`, "Lab Observer", "observer");
  const deleteUserId = await insertUser(`labs-${suffix}-delete`, "Delete Learner", "learner");
  const rewardLearnerId = await insertUser(`labs-${suffix}-rewards`, "Reward Learner", "learner");
  const definition = findCurrentLabDefinition("dns-client-001");
  assert.ok(definition);
  const initialState = cloneInitialLabState(definition);
  const before = await mutationCounts(learnerId);

  const tutorial = findCurrentLabDefinition("tutorial-lab-001");
  const firstNormalLab = findCurrentLabDefinition("subnet-client-001");
  assert.ok(tutorial);
  assert.ok(firstNormalLab);
  const tutorialInitialState = cloneInitialLabState(tutorial);
  const beforeTutorial = await readLabAttemptSummaries(tutorialLearnerId, "learner");
  assert.equal(evaluateLabUnlock(firstNormalLab.public.unlockRequirements, accessFrom(beforeTutorial)).unlocked, false);
  const tutorialAttempt = await startOrResumeLabAttempt({ userId: tutorialLearnerId, labId: tutorial.public.id, labVersion: tutorial.public.version, mode: "learner", initialState: tutorialInitialState, selectedDeviceId: tutorial.selectedDeviceId });
  assert.equal(tutorialAttempt.record.state.devices.client.hostname, "CLIENT01");
  assert.equal(tutorialAttempt.record.state.devices.client.interface?.name, "Ethernet");
  assert.equal(tutorialAttempt.record.state.devices.client.interface?.ipv4Mode, "static");
  assert.equal(tutorialAttempt.record.state.devices.client.interface?.dhcpEnabled, undefined);
  assert.equal(tutorialAttempt.record.state.devices.router.additionalInterfaces?.["GigabitEthernet0/1"]?.address, "203.0.113.1");
  const help = executeLabOperation({ state: tutorialAttempt.record.state, deviceId: "client", operation: { kind: "help" }, supportedCommands: [...tutorial.deviceRules.client.commands, "clear"] });
  const afterHelp = appendLabTerminalEntry(help.state, { deviceId: "client", command: "help", output: help.output });
  const inspected = executeLabOperation({ state: afterHelp, deviceId: "client", operation: { kind: "ipconfig" }, supportedCommands: [...tutorial.deviceRules.client.commands, "clear"] });
  const diagnosedState = appendLabTerminalEntry(inspected.state, { deviceId: "client", command: "ipconfig /all", output: inspected.output });
  const diagnosedTutorial = await mutateOwnedLabAttempt({ userId: tutorialLearnerId, attemptId: tutorialAttempt.record.id, mode: "learner", expectedRevision: 0, mutate: () => ({ state: diagnosedState, events: [{ kind: "command", deviceId: "client", command: "help", summary: help.summary }, { kind: "command", deviceId: "client", command: "ipconfig /all", summary: inspected.summary }] }) });
  assert.deepEqual((await readOwnedLabAttempt({ userId: tutorialLearnerId, attemptId: tutorialAttempt.record.id, mode: "learner" }))?.state.terminalTranscript?.map((entry) => entry.command), ["help", "ipconfig /all"]);

  const tutorialRepairedState = applyLabConfiguration({ state: diagnosedTutorial.record.state, deviceId: "client", action: { kind: "set-network-configuration", patch: { gateway: "192.168.90.1" } }, allowedControls: tutorial.deviceRules.client.controls }).state;
  const repairedTutorial = await mutateOwnedLabAttempt({ userId: tutorialLearnerId, attemptId: tutorialAttempt.record.id, mode: "learner", expectedRevision: diagnosedTutorial.record.stateRevision, mutate: () => ({ state: tutorialRepairedState, completed: false, events: [{ kind: "configuration", deviceId: "client", summary: "Standardgateway geändert" }] }) });
  assert.equal(repairedTutorial.record.status, "in_progress");
  assert.equal(repairedTutorial.record.state.devices.client.interface?.address, "192.168.90.25");
  assert.equal(repairedTutorial.record.state.devices.client.interface?.gateway, "192.168.90.1");
  assert.deepEqual(repairedTutorial.record.state.verificationEvidence, []);

  const verified = executeLabOperation({ state: repairedTutorial.record.state, deviceId: "client", operation: { kind: "ping", target: "203.0.113.20" }, supportedCommands: [...tutorial.deviceRules.client.commands, "clear"] });
  const tutorialCompletedState = appendLabTerminalEntry(verified.state, { deviceId: "client", command: "ping 203.0.113.20", output: verified.output });
  const completedTutorial = await mutateOwnedLabAttempt({ userId: tutorialLearnerId, attemptId: tutorialAttempt.record.id, mode: "learner", expectedRevision: repairedTutorial.record.stateRevision, rewardEligible: false, mutate: () => ({ state: tutorialCompletedState, completed: true, events: [{ kind: "command", deviceId: "client", command: "ping 203.0.113.20", summary: "Tutorial verifiziert" }] }) });
  assert.equal(completedTutorial.record.status, "completed");
  assert.equal(completedTutorial.record.state.terminalTranscript?.length, 3);
  assert.deepEqual(await labRewardRows(tutorialLearnerId, tutorial.public.id), { history: [], xp: [] });
  const afterTutorial = await readLabAttemptSummaries(tutorialLearnerId, "learner");
  assert.equal(evaluateLabUnlock(firstNormalLab.public.unlockRequirements, accessFrom(afterTutorial)).unlocked, true);
  const tutorialReplay = await startOrResumeLabAttempt({ userId: tutorialLearnerId, labId: tutorial.public.id, labVersion: tutorial.public.version, mode: "learner", initialState: tutorialInitialState, selectedDeviceId: tutorial.selectedDeviceId });
  assert.equal(tutorialReplay.created, true);
  const resetTutorialReplay = await resetOwnedLabAttempt({ userId: tutorialLearnerId, attemptId: tutorialReplay.record.id, mode: "learner", expectedRevision: tutorialReplay.record.stateRevision, initialState: tutorialInitialState, selectedDeviceId: tutorial.selectedDeviceId });
  assert.equal(resetTutorialReplay.runNumber, 2);
  const afterReplayReset = await readLabAttemptSummaries(tutorialLearnerId, "learner");
  const tutorialSummary = afterReplayReset.find((summary) => summary.labId === tutorial.public.id && summary.labVersion === tutorial.public.version);
  assert.deepEqual(tutorialSummary && { active: tutorialSummary.hasActive, completed: tutorialSummary.hasCompleted }, { active: true, completed: true });
  assert.equal(evaluateLabUnlock(firstNormalLab.public.unlockRequirements, accessFrom(afterReplayReset)).unlocked, true);

  const previewTutorial = await startOrResumeLabAttempt({ userId: instructorId, labId: tutorial.public.id, labVersion: tutorial.public.version, mode: "preview", initialState: tutorialInitialState, selectedDeviceId: tutorial.selectedDeviceId });
  const completedPreviewTutorial = await mutateOwnedLabAttempt({ userId: instructorId, attemptId: previewTutorial.record.id, mode: "preview", expectedRevision: 0, mutate: () => ({ state: tutorialCompletedState, completed: true, events: [{ kind: "command", deviceId: "client", command: "ping 203.0.113.20", summary: "Tutorial-Vorschau verifiziert" }] }) });
  assert.equal(completedPreviewTutorial.record.status, "completed");
  assert.equal((await readLabAttemptSummaries(instructorId, "preview")).some((summary) => summary.labId === tutorial.public.id && summary.hasCompleted), true);
  assert.deepEqual(await mutationCounts(instructorId), { xp: 0, lessons: 0, quizzes: 0, attempts: 0, completed: 0 });

  const starts = await Promise.all([
    startOrResumeLabAttempt({ userId: learnerId, labId: definition.public.id, labVersion: definition.public.version, mode: "learner", initialState, selectedDeviceId: definition.selectedDeviceId }),
    startOrResumeLabAttempt({ userId: learnerId, labId: definition.public.id, labVersion: definition.public.version, mode: "learner", initialState, selectedDeviceId: definition.selectedDeviceId }),
  ]);
  assert.equal(starts.filter((result) => result.created).length, 1);
  assert.equal(new Set(starts.map((result) => result.record.id)).size, 1);
  const attempt = starts[0].record;
  assert.equal((await readLatestOwnedLabAttempt({ userId: learnerId, labId: definition.public.id, labVersion: 1, mode: "learner" }))?.id, attempt.id);
  assert.equal(await readOwnedLabAttempt({ userId: otherLearnerId, attemptId: attempt.id, mode: "learner" }), undefined);
  await assert.rejects(
    () => mutateOwnedLabAttempt({ userId: otherLearnerId, attemptId: attempt.id, mode: "learner", expectedRevision: 0, mutate: () => ({ events: [] }) }),
    LabAttemptNotFoundError,
  );

  await assert.rejects(
    () => pool.query(
      `INSERT INTO interactive_lab_attempts
         (user_id, lab_id, lab_version, mode, state_json, selected_device_id)
       VALUES ($1, $2, 1, 'learner', $3::jsonb, 'client')`,
      [learnerId, definition.public.id, JSON.stringify(initialState)],
    ),
    (error) => postgresCode(error) === "23505",
  );

  const fixedState = cloneInitialLabState(definition);
  fixedState.devices.client.interface!.dnsServer = "192.168.10.53";
  fixedState.verificationEvidence = ["dns-resolution-success"];
  const concurrentCompletion = await Promise.all([
    mutateOwnedLabAttempt({ userId: learnerId, attemptId: attempt.id, mode: "learner", expectedRevision: 0, rewardEligible: true, mutate: () => ({ state: fixedState, completed: true, events: [{ kind: "configuration", deviceId: "client", summary: "DNS korrigiert" }] }) }),
    mutateOwnedLabAttempt({ userId: learnerId, attemptId: attempt.id, mode: "learner", expectedRevision: 0, rewardEligible: true, mutate: () => ({ state: fixedState, completed: true, events: [{ kind: "configuration", deviceId: "client", summary: "DNS korrigiert" }] }) }),
  ]);
  assert.equal(concurrentCompletion.every((result) => result.record.status === "completed"), true);
  assert.equal(new Set(concurrentCompletion.map((result) => result.record.completedAt?.toISOString())).size, 1);
  assert.equal((await readOwnedLabAttemptHistory({ userId: learnerId, attemptId: attempt.id, mode: "learner", runNumber: 1 })).filter((event) => event.kind === "completion").length, 1);
  assert.deepEqual(await labRewardRows(learnerId, definition.public.id), {
    history: [{ first_attempt_id: attempt.id, unique_hints_used: 0, xp_awarded: 75 }],
    xp: [{ xp_amount: 75 }],
  });

  const replay = await startOrResumeLabAttempt({ userId: learnerId, labId: definition.public.id, labVersion: 1, mode: "learner", initialState, selectedDeviceId: definition.selectedDeviceId });
  assert.equal(replay.created, true);
  assert.notEqual(replay.record.id, attempt.id);
  assert.equal(replay.record.status, "in_progress");
  const changed = await mutateOwnedLabAttempt({ userId: learnerId, attemptId: replay.record.id, mode: "learner", expectedRevision: 0, rewardEligible: true, mutate: (record) => ({ selectedDeviceId: "dns", revealedHintCount: 1, events: [{ kind: "device", deviceId: "dns", summary: "DNS01 ausgewählt" }, { kind: "hint", hintIndex: 1, summary: "Hinweis 1 geöffnet" }], state: record.state }) });
  const reset = await resetOwnedLabAttempt({ userId: learnerId, attemptId: replay.record.id, mode: "learner", expectedRevision: changed.record.stateRevision, initialState, selectedDeviceId: definition.selectedDeviceId });
  assert.equal(reset.runNumber, 2);
  assert.equal(reset.selectedDeviceId, "client");
  assert.equal(reset.state.devices.client.interface?.dnsServer, "192.168.10.254");
  assert.deepEqual(reset.state.verificationEvidence, []);
  assert.equal(reset.state.terminalTranscript, undefined);
  assert.equal((await readOwnedLabAttemptHistory({ userId: learnerId, attemptId: reset.id, mode: "learner", runNumber: 2 }))[0]?.kind, "reset");
  await assert.rejects(
    () => mutateOwnedLabAttempt({ userId: learnerId, attemptId: reset.id, mode: "learner", expectedRevision: 0, mutate: () => ({ events: [] }) }),
    LabAttemptConflictError,
  );
  const completedReplay = await mutateOwnedLabAttempt({ userId: learnerId, attemptId: reset.id, mode: "learner", expectedRevision: reset.stateRevision, rewardEligible: true, mutate: () => ({ state: fixedState, completed: true, events: [{ kind: "configuration", deviceId: "client", summary: "DNS im Replay korrigiert" }] }) });
  assert.deepEqual(await readOwnedLabCompletionReward({ userId: learnerId, attemptId: completedReplay.record.id, labId: definition.public.id }), { kind: "replay", earnedXp: 0 });
  assert.deepEqual(await labRewardRows(learnerId, definition.public.id), {
    history: [{ first_attempt_id: attempt.id, unique_hints_used: 0, xp_awarded: 75 }],
    xp: [{ xp_amount: 75 }],
  });

  const preview = await startOrResumeLabAttempt({ userId: instructorId, labId: definition.public.id, labVersion: 1, mode: "preview", initialState, selectedDeviceId: definition.selectedDeviceId });
  assert.equal(preview.record.mode, "preview");
  await assert.rejects(() => readOwnedLabAttempt({ userId: instructorId, attemptId: preview.record.id, mode: "learner" }));
  const completedPreview = await mutateOwnedLabAttempt({ userId: instructorId, attemptId: preview.record.id, mode: "preview", expectedRevision: 0, mutate: () => ({ state: fixedState, completed: true, events: [{ kind: "configuration", deviceId: "client", summary: "Vorschau gelöst" }] }) });
  assert.equal(completedPreview.record.status, "completed");
  assert.deepEqual(await mutationCounts(instructorId), { xp: 0, lessons: 0, quizzes: 0, attempts: 0, completed: 0 });

  const observerPreview = await startOrResumeLabAttempt({ userId: observerId, labId: definition.public.id, labVersion: 1, mode: "preview", initialState, selectedDeviceId: definition.selectedDeviceId });
  assert.equal(observerPreview.record.mode, "preview");
  const completedObserverPreview = await mutateOwnedLabAttempt({ userId: observerId, attemptId: observerPreview.record.id, mode: "preview", expectedRevision: 0, rewardEligible: true, mutate: () => ({ state: fixedState, revealedHintCount: 1, completed: true, events: [{ kind: "hint", hintIndex: 1, summary: "Hinweis 1 geöffnet" }, { kind: "configuration", deviceId: "client", summary: "Betrachtervorschau gelöst" }] }) });
  assert.equal(completedObserverPreview.record.status, "completed");
  assert.equal((await readLabAttemptSummaries(observerId, "preview")).some((summary) => summary.labId === definition.public.id && summary.hasCompleted), true);
  await assert.rejects(() => readLabAttemptSummaries(observerId, "learner"), LabAttemptNotFoundError);
  assert.deepEqual(await mutationCounts(observerId), { xp: 0, lessons: 0, quizzes: 0, attempts: 0, completed: 0 });
  assert.deepEqual(await labRewardRows(observerId, definition.public.id), { history: [], xp: [] });

  const oneHintReward = await completeRewardLab(rewardLearnerId, "gateway-client-001", [1]);
  assert.deepEqual(oneHintReward, { uniqueHintsUsed: 1, xpAwarded: 50 });
  const twoHintReward = await completeRewardLab(rewardLearnerId, "prefix-client-001", [1, 1, 2], true);
  assert.deepEqual(twoHintReward, { uniqueHintsUsed: 2, xpAwarded: 25 });
  const zeroReward = await completeRewardLab(rewardLearnerId, "firewall-http-001", [1, 2, 3]);
  assert.deepEqual(zeroReward, { uniqueHintsUsed: 3, xpAwarded: 0 });
  const zeroRewardReplay = await completeRewardLab(rewardLearnerId, "firewall-http-001", []);
  assert.deepEqual(zeroRewardReplay, { uniqueHintsUsed: 3, xpAwarded: 0 });
  const zeroRows = await labRewardRows(rewardLearnerId, "firewall-http-001");
  assert.equal(zeroRows.history.length, 1);
  assert.equal(zeroRows.xp.length, 0);

  await saveActiveTitlePreference(rewardLearnerId, "level-systemstarter");
  await savePinnedBadgePreferences(rewardLearnerId, ["badge-lab-einsteiger"]);
  assert.deepEqual(await readProfilePreferences(rewardLearnerId), {
    activeTitleId: "level-systemstarter",
    pinnedBadgeIds: ["badge-lab-einsteiger"],
  });
  await savePinnedBadgePreferences(rewardLearnerId, []);
  assert.deepEqual((await readProfilePreferences(rewardLearnerId)).pinnedBadgeIds, []);

  const multiFault = findCurrentLabDefinition("client-multifault-001");
  assert.ok(multiFault);
  const multiAttempt = await startOrResumeLabAttempt({ userId: otherLearnerId, labId: multiFault.public.id, labVersion: multiFault.public.version, mode: "learner", initialState: cloneInitialLabState(multiFault), selectedDeviceId: multiFault.selectedDeviceId });
  const multiPatchedState = applyLabConfiguration({ state: multiAttempt.record.state, deviceId: "client", action: { kind: "set-network-configuration", patch: { gateway: "192.168.73.1", dnsServer: "192.168.73.53" } }, allowedControls: multiFault.deviceRules.client.controls }).state;
  const persistedMulti = await mutateOwnedLabAttempt({ userId: otherLearnerId, attemptId: multiAttempt.record.id, mode: "learner", expectedRevision: 0, mutate: () => ({ state: multiPatchedState, events: [{ kind: "configuration", deviceId: "client", summary: "Gateway und DNS atomar geändert" }] }) });
  const resumedMulti = await readOwnedLabAttempt({ userId: otherLearnerId, attemptId: persistedMulti.record.id, mode: "learner" });
  assert.equal(resumedMulti?.state.devices.client.interface?.gateway, "192.168.73.1");
  assert.equal(resumedMulti?.state.devices.client.interface?.dnsServer, "192.168.73.53");
  assert.equal(resumedMulti?.status, "in_progress");

  const trainerLabAggregates = await readTrainerLabAggregatesForLearners([learnerId, otherLearnerId, instructorId, observerId]);
  const dnsAggregate = trainerLabAggregates.find((item) => item.learnerId === learnerId && item.labId === definition.public.id);
  assert.deepEqual(dnsAggregate && {
    runs: dnsAggregate.runCount,
    hints: dnsAggregate.hintCount,
    completed: dnsAggregate.completedAttemptCount,
    active: dnsAggregate.activeAttemptCount,
  }, { runs: 3, hints: 1, completed: 2, active: 0 });
  assert.equal(trainerLabAggregates.some((item) => item.learnerId === otherLearnerId && item.labId === multiFault.public.id), true);
  assert.equal(trainerLabAggregates.some((item) => item.learnerId === instructorId || item.learnerId === observerId), false);
  const isolatedLearnerAggregates = await readTrainerLabAggregatesForLearners([learnerId]);
  assert.equal(isolatedLearnerAggregates.every((item) => item.learnerId === learnerId), true);
  assert.deepEqual(await readTrainerLabAggregatesForLearners([]), []);

  const deleteAttempt = await startOrResumeLabAttempt({ userId: deleteUserId, labId: definition.public.id, labVersion: 1, mode: "learner", initialState, selectedDeviceId: definition.selectedDeviceId });
  await pool.query("DELETE FROM users WHERE id = $1", [deleteUserId]);
  userIds.splice(userIds.indexOf(deleteUserId), 1);
  assert.equal(Number((await pool.query("SELECT count(*) FROM interactive_lab_attempts WHERE id = $1", [deleteAttempt.record.id])).rows[0].count), 0);

  assert.deepEqual(await mutationCounts(learnerId), { ...before, xp: before.xp + 1, attempts: 2, completed: 2 });
  console.log("Interactive lab database integration: PASS");
} finally {
  if (userIds.length > 0) await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  await pool.end();
}

async function completeRewardLab(
  userId: string,
  labId: string,
  hintIndices: readonly number[],
  resetAfterFirstHint = false,
) {
  const definition = findCurrentLabDefinition(labId);
  assert.ok(definition);
  const initialState = cloneInitialLabState(definition);
  const started = await startOrResumeLabAttempt({
    userId,
    labId,
    labVersion: definition.public.version,
    mode: "learner",
    initialState,
    selectedDeviceId: definition.selectedDeviceId,
  });
  let record = started.record;
  for (let position = 0; position < hintIndices.length; position += 1) {
    const hintIndex = hintIndices[position];
    const revealed = await mutateOwnedLabAttempt({
      userId,
      attemptId: record.id,
      mode: "learner",
      expectedRevision: record.stateRevision,
      rewardEligible: true,
      mutate: () => ({
        revealedHintCount: Math.max(record.revealedHintCount, hintIndex),
        events: [{ kind: "hint", hintIndex, summary: `Hinweis ${hintIndex} geöffnet` }],
      }),
    });
    record = revealed.record;
    if (resetAfterFirstHint && position === 0) {
      record = await resetOwnedLabAttempt({
        userId,
        attemptId: record.id,
        mode: "learner",
        expectedRevision: record.stateRevision,
        initialState,
        selectedDeviceId: definition.selectedDeviceId,
      });
    }
  }
  const completed = await mutateOwnedLabAttempt({
    userId,
    attemptId: record.id,
    mode: "learner",
    expectedRevision: record.stateRevision,
    rewardEligible: true,
    mutate: () => ({ completed: true, events: [] }),
  });
  const reward = await readOwnedLabCompletionReward({ userId, attemptId: completed.record.id, labId });
  const rows = await labRewardRows(userId, labId);
  const history = rows.history[0];
  assert.ok(history);
  assert.equal(rows.history.length, 1);
  assert.equal(rows.xp.length, history.xp_awarded > 0 ? 1 : 0);
  if (reward.kind === "first-completion") {
    assert.equal(reward.uniqueHintsUsed, history.unique_hints_used);
    assert.equal(reward.earnedXp, history.xp_awarded);
  } else {
    assert.equal(reward.earnedXp, 0);
  }
  return { uniqueHintsUsed: history.unique_hints_used, xpAwarded: history.xp_awarded };
}

async function labRewardRows(userId: string, labId: string) {
  const [history, xp] = await Promise.all([
    pool.query<{ first_attempt_id: string; unique_hints_used: number; xp_awarded: number }>(
      `SELECT first_attempt_id, unique_hints_used, xp_awarded
       FROM learner_lab_completion_history WHERE user_id = $1 AND lab_id = $2`,
      [userId, labId],
    ),
    pool.query<{ xp_amount: number }>(
      `SELECT xp_amount FROM xp_events
       WHERE user_id = $1 AND source_type = 'lab' AND source_key = $2`,
      [userId, labId],
    ),
  ]);
  return { history: history.rows, xp: xp.rows };
}

async function insertUser(login: string, displayName: string, role: "learner" | "observer" | "instructor" | "admin") {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (login_identifier, display_name, password_hash, role)
     VALUES ($1, $2, 'interactive-lab-integration-test-hash', $3)
     RETURNING id`,
    [login, displayName, role],
  );
  const id = result.rows[0].id;
  userIds.push(id);
  return id;
}

async function mutationCounts(userId: string) {
  const result = await pool.query<{ xp: string; lessons: string; quizzes: string; attempts: string; completed: string }>(
    `SELECT
       (SELECT count(*) FROM xp_events WHERE user_id = $1) AS xp,
       (SELECT count(*) FROM lesson_progress WHERE user_id = $1) AS lessons,
       (SELECT count(*) FROM quiz_progress WHERE user_id = $1) AS quizzes,
       (SELECT count(*) FROM interactive_lab_attempts WHERE user_id = $1 AND mode = 'learner') AS attempts,
       (SELECT count(*) FROM interactive_lab_attempts WHERE user_id = $1 AND mode = 'learner' AND status = 'completed') AS completed`,
    [userId],
  );
  const row = result.rows[0];
  return { xp: Number(row.xp), lessons: Number(row.lessons), quizzes: Number(row.quizzes), attempts: Number(row.attempts), completed: Number(row.completed) };
}

function postgresCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
}

function accessFrom(summaries: Awaited<ReturnType<typeof readLabAttemptSummaries>>) {
  return {
    level: 1,
    completedModuleIds: new Set<string>(),
    completedLabIds: new Set(summaries.filter((summary) => summary.hasCompleted).map((summary) => summary.labId)),
    bypass: false,
  };
}
