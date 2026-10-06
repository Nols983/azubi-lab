import "server-only";

import type { PoolClient } from "pg";
import { isUuid } from "../account-security.ts";
import type { LabAttemptMode, LabAttemptStatus, LabHistoryItem } from "../interactive-lab.ts";
import { isSimulatedLabState, MAX_LAB_EVENTS_PER_RUN, type SimulatedLabState } from "../lab-engine.ts";
import { calculateLabXpReward } from "../progression-rewards.ts";
import { withTransaction } from "./db.ts";
import { awardCanonicalXpEventWithClient } from "./xp-repository.ts";

type AttemptRow = {
  id: string;
  user_id: string;
  lab_id: string;
  lab_version: number;
  mode: string;
  status: string;
  state_json: unknown;
  state_revision: number;
  selected_device_id: string;
  revealed_hint_count: number;
  run_number: number;
  last_event_sequence: number;
  started_at: Date | string;
  updated_at: Date | string;
  completed_at: Date | string | null;
};

type EventRow = {
  sequence: number;
  kind: LabHistoryItem["kind"];
  device_id: string | null;
  command_text: string | null;
  summary: string;
  created_at: Date | string;
};

export type LabAttemptRecord = {
  id: string;
  userId: string;
  labId: string;
  labVersion: number;
  mode: LabAttemptMode;
  status: LabAttemptStatus;
  state: SimulatedLabState;
  stateRevision: number;
  selectedDeviceId: string;
  revealedHintCount: number;
  runNumber: number;
  lastEventSequence: number;
  startedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export type LabAttemptSummary = {
  labId: string;
  labVersion: number;
  hasActive: boolean;
  hasCompleted: boolean;
};

export type LabMutationEvent = {
  kind: LabHistoryItem["kind"];
  deviceId?: string;
  command?: string;
  hintIndex?: number;
  summary: string;
};

export class LabAttemptNotFoundError extends Error {
  constructor() { super("The owned interactive lab attempt does not exist."); this.name = "LabAttemptNotFoundError"; }
}
export class LabAttemptConflictError extends Error {
  constructor() { super("The interactive lab attempt changed in another request."); this.name = "LabAttemptConflictError"; }
}
export class LabAttemptHistoryLimitError extends Error {
  constructor() { super("The interactive lab history limit was reached."); this.name = "LabAttemptHistoryLimitError"; }
}
export class LabRepositoryDataError extends Error {
  constructor() { super("Stored interactive lab data violates the application contract."); this.name = "LabRepositoryDataError"; }
}

export function startOrResumeLabAttempt(input: {
  userId: string;
  labId: string;
  labVersion: number;
  mode: LabAttemptMode;
  initialState: SimulatedLabState;
  selectedDeviceId: string;
}) {
  assertBaseInput(input);
  return withTransaction(async (client) => {
    await requireEligibleOwner(client, input.userId, input.mode, "UPDATE");
    const existing = await client.query<AttemptRow>(
      `SELECT ${attemptColumns} FROM interactive_lab_attempts
       WHERE user_id = $1 AND lab_id = $2 AND lab_version = $3 AND mode = $4 AND status = 'in_progress'
       FOR UPDATE`,
      [input.userId, input.labId, input.labVersion, input.mode],
    );
    if (existing.rows[0]) return { record: mapAttempt(existing.rows[0]), created: false };
    const created = await client.query<AttemptRow>(
      `INSERT INTO interactive_lab_attempts
         (user_id, lab_id, lab_version, mode, state_json, selected_device_id)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING ${attemptColumns}`,
      [input.userId, input.labId, input.labVersion, input.mode, JSON.stringify(input.initialState), input.selectedDeviceId],
    );
    const row = created.rows[0];
    if (!row) throw new LabRepositoryDataError();
    return { record: mapAttempt(row), created: true };
  });
}

export async function readLabAttemptSummaries(userId: string, mode: LabAttemptMode) {
  if (!isUuid(userId)) throw new LabRepositoryDataError();
  return withTransaction(async (client) => {
    await requireEligibleOwner(client, userId, mode, "SHARE");
    const result = await client.query<{
      lab_id: string; lab_version: number; has_active: boolean; has_completed: boolean;
    }>(
      `SELECT lab_id, lab_version,
              bool_or(status = 'in_progress') AS has_active,
              bool_or(status = 'completed') AS has_completed
       FROM interactive_lab_attempts
       WHERE user_id = $1 AND mode = $2
       GROUP BY lab_id, lab_version`,
      [userId, mode],
    );
    return result.rows.map((row): LabAttemptSummary => ({ labId: row.lab_id, labVersion: row.lab_version, hasActive: row.has_active, hasCompleted: row.has_completed }));
  });
}

export function readLatestOwnedLabAttempt(input: { userId: string; labId: string; labVersion: number; mode: LabAttemptMode }) {
  assertBaseInput(input);
  return withTransaction(async (client) => {
    await requireEligibleOwner(client, input.userId, input.mode, "SHARE");
    const result = await client.query<AttemptRow>(
      `SELECT ${attemptColumns} FROM interactive_lab_attempts
       WHERE user_id = $1 AND lab_id = $2 AND lab_version = $3 AND mode = $4
       ORDER BY (status = 'in_progress') DESC, updated_at DESC, id DESC
       LIMIT 1`,
      [input.userId, input.labId, input.labVersion, input.mode],
    );
    return result.rows[0] ? mapAttempt(result.rows[0]) : undefined;
  });
}

export function readOwnedLabAttempt(input: { userId: string; attemptId: string; mode: LabAttemptMode }) {
  if (!isUuid(input.userId) || !isUuid(input.attemptId)) throw new LabRepositoryDataError();
  return withTransaction(async (client) => {
    await requireEligibleOwner(client, input.userId, input.mode, "SHARE");
    const row = await findOwnedAttempt(client, input.attemptId, input.userId, input.mode, false);
    return row ? mapAttempt(row) : undefined;
  });
}

export async function readOwnedLabAttemptHistory(input: { userId: string; attemptId: string; mode: LabAttemptMode; runNumber: number }) {
  if (!isUuid(input.userId) || !isUuid(input.attemptId) || !Number.isSafeInteger(input.runNumber) || input.runNumber < 1) throw new LabRepositoryDataError();
  return withTransaction(async (client) => {
    await requireEligibleOwner(client, input.userId, input.mode, "SHARE");
    const result = await client.query<EventRow>(
      `SELECT event.sequence, event.kind, event.device_id, event.command_text, event.summary, event.created_at
       FROM interactive_lab_events event
       JOIN interactive_lab_attempts attempt ON attempt.id = event.attempt_id
       WHERE event.attempt_id = $1 AND event.run_number = $2
         AND attempt.user_id = $3 AND attempt.mode = $4
       ORDER BY event.sequence ASC`,
      [input.attemptId, input.runNumber, input.userId, input.mode],
    );
    return result.rows.map(mapEvent);
  });
}

export function mutateOwnedLabAttempt(input: {
  userId: string;
  attemptId: string;
  mode: LabAttemptMode;
  expectedRevision: number;
  rewardEligible?: boolean;
  mutate: (record: LabAttemptRecord, eventCount: number) => {
    state?: SimulatedLabState;
    selectedDeviceId?: string;
    revealedHintCount?: number;
    completed?: boolean;
    terminalOutput?: string;
    events: readonly LabMutationEvent[];
  };
}) {
  if (!isUuid(input.userId) || !isUuid(input.attemptId) || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) throw new LabRepositoryDataError();
  return withTransaction(async (client) => {
    await requireEligibleOwner(client, input.userId, input.mode, "SHARE");
    const row = await findOwnedAttempt(client, input.attemptId, input.userId, input.mode, true);
    if (!row) throw new LabAttemptNotFoundError();
    const record = mapAttempt(row);
    if (record.status === "completed") return { record, terminalOutput: undefined, unchanged: true as const };
    if (record.stateRevision !== input.expectedRevision) throw new LabAttemptConflictError();
    const eventCount = await countRunEvents(client, record.id, record.runNumber);
    const mutation = input.mutate(record, eventCount);
    if (eventCount + mutation.events.length > MAX_LAB_EVENTS_PER_RUN) throw new LabAttemptHistoryLimitError();
    const completed = Boolean(mutation.completed);
    const now = await readServerNow(client);
    let sequence = record.lastEventSequence;
    for (const event of mutation.events) {
      sequence += 1;
      await insertEvent(client, record, sequence, event, now);
      if (record.mode === "learner" && event.kind === "hint" && event.hintIndex !== undefined) {
        await recordLearnerLabHint(client, record, event.hintIndex, now);
      }
    }
    if (completed && !mutation.events.some((event) => event.kind === "completion")) {
      sequence += 1;
      await insertEvent(client, record, sequence, { kind: "completion", summary: "Lab serverseitig als gelöst validiert" }, now);
    }
    const updated = await client.query<AttemptRow>(
      `UPDATE interactive_lab_attempts
       SET state_json = $3::jsonb,
           selected_device_id = $4,
           revealed_hint_count = $5,
           state_revision = state_revision + 1,
           last_event_sequence = $6,
           status = CASE WHEN $7 THEN 'completed' ELSE status END,
           completed_at = CASE WHEN $7 THEN $8::timestamptz ELSE completed_at END,
           updated_at = $8::timestamptz
       WHERE id = $1 AND user_id = $2 AND status = 'in_progress' AND state_revision = $9
       RETURNING ${attemptColumns}`,
      [record.id, record.userId, JSON.stringify(mutation.state ?? record.state), mutation.selectedDeviceId ?? record.selectedDeviceId, mutation.revealedHintCount ?? record.revealedHintCount, sequence, completed, now, input.expectedRevision],
    );
    const updatedRow = updated.rows[0];
    if (!updatedRow) throw new LabAttemptConflictError();
    if (completed && record.mode === "learner" && input.rewardEligible === true) {
      await recordFirstLabCompletionAndReward(client, record, now);
    }
    return { record: mapAttempt(updatedRow), terminalOutput: mutation.terminalOutput, unchanged: false as const };
  });
}

export async function readOwnedLabCompletionReward(input: {
  userId: string;
  attemptId: string;
  labId: string;
}) {
  if (!isUuid(input.userId) || !isUuid(input.attemptId) || !isLabId(input.labId)) throw new LabRepositoryDataError();
  const result = await withTransaction((client) => client.query<{
    first_attempt_id: string;
    unique_hints_used: number;
    base_xp: number;
    xp_awarded: number;
  }>(
    `SELECT first_attempt_id, unique_hints_used, base_xp, xp_awarded
     FROM learner_lab_completion_history
     WHERE user_id = $1 AND lab_id = $2`,
    [input.userId, input.labId],
  ));
  const row = result.rows[0];
  if (!row || !isUuid(row.first_attempt_id)
    || !Number.isSafeInteger(row.unique_hints_used) || row.unique_hints_used < 0
    || row.base_xp !== 75 || ![0, 25, 50, 75].includes(row.xp_awarded)) throw new LabRepositoryDataError();
  if (row.first_attempt_id !== input.attemptId) return { kind: "replay" as const, earnedXp: 0 as const };
  const calculated = calculateLabXpReward(row.unique_hints_used);
  if (calculated.baseXp !== row.base_xp || calculated.earnedXp !== row.xp_awarded) throw new LabRepositoryDataError();
  return { kind: "first-completion" as const, ...calculated };
}

export function resetOwnedLabAttempt(input: {
  userId: string; attemptId: string; mode: LabAttemptMode; expectedRevision: number;
  initialState: SimulatedLabState; selectedDeviceId: string;
}) {
  if (!isUuid(input.userId) || !isUuid(input.attemptId) || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) throw new LabRepositoryDataError();
  return withTransaction(async (client) => {
    await requireEligibleOwner(client, input.userId, input.mode, "SHARE");
    const row = await findOwnedAttempt(client, input.attemptId, input.userId, input.mode, true);
    if (!row) throw new LabAttemptNotFoundError();
    const record = mapAttempt(row);
    if (record.status !== "in_progress" || record.stateRevision !== input.expectedRevision) throw new LabAttemptConflictError();
    const now = await readServerNow(client);
    const sequence = record.lastEventSequence + 1;
    const nextRun = record.runNumber + 1;
    const updated = await client.query<AttemptRow>(
      `UPDATE interactive_lab_attempts
       SET state_json = $3::jsonb, selected_device_id = $4, revealed_hint_count = 0,
           run_number = $5, state_revision = state_revision + 1,
           last_event_sequence = $6, updated_at = $7
       WHERE id = $1 AND user_id = $2 AND status = 'in_progress' AND state_revision = $8
       RETURNING ${attemptColumns}`,
      [record.id, record.userId, JSON.stringify(input.initialState), input.selectedDeviceId, nextRun, sequence, now, input.expectedRevision],
    );
    const updatedRow = updated.rows[0];
    if (!updatedRow) throw new LabAttemptConflictError();
    await client.query(
      `INSERT INTO interactive_lab_events
         (attempt_id, sequence, run_number, kind, summary, created_at)
       VALUES ($1, $2, $3, 'reset', 'Lab bewusst auf den Ausgangszustand zurückgesetzt', $4)`,
      [record.id, sequence, nextRun, now],
    );
    return mapAttempt(updatedRow);
  });
}

async function requireEligibleOwner(client: PoolClient, userId: string, mode: LabAttemptMode, lock: "UPDATE" | "SHARE") {
  const result = await client.query<{ role: string }>(
    `SELECT role FROM users
     WHERE id = $1 AND disabled_at IS NULL
       AND (($2 = 'learner' AND role = 'learner') OR ($2 = 'preview' AND role IN ('observer', 'instructor', 'admin')))
     FOR ${lock}`,
    [userId, mode],
  );
  if (!result.rowCount) throw new LabAttemptNotFoundError();
}

async function findOwnedAttempt(client: PoolClient, attemptId: string, userId: string, mode: LabAttemptMode, lock: boolean) {
  const result = await client.query<AttemptRow>(
    `SELECT ${attemptColumns} FROM interactive_lab_attempts
     WHERE id = $1 AND user_id = $2 AND mode = $3${lock ? " FOR UPDATE" : ""}`,
    [attemptId, userId, mode],
  );
  return result.rows[0];
}

async function countRunEvents(client: PoolClient, attemptId: string, runNumber: number) {
  const result = await client.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM interactive_lab_events WHERE attempt_id = $1 AND run_number = $2",
    [attemptId, runNumber],
  );
  const count = Number(result.rows[0]?.count ?? "0");
  if (!Number.isSafeInteger(count)) throw new LabRepositoryDataError();
  return count;
}

async function insertEvent(client: PoolClient, record: LabAttemptRecord, sequence: number, event: LabMutationEvent, now: Date) {
  if (!event.summary || event.summary.length > 1000 || (event.command && event.command.length > 160)
    || (event.hintIndex !== undefined && (!Number.isSafeInteger(event.hintIndex) || event.hintIndex < 1 || event.hintIndex > 20))) throw new LabRepositoryDataError();
  await client.query(
    `INSERT INTO interactive_lab_events
       (attempt_id, sequence, run_number, kind, device_id, command_text, summary, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [record.id, sequence, record.runNumber, event.kind, event.deviceId ?? null, event.command ?? null, event.summary, now],
  );
}

async function recordLearnerLabHint(
  client: PoolClient,
  record: LabAttemptRecord,
  hintIndex: number,
  revealedAt: Date,
) {
  await client.query(
    `INSERT INTO learner_lab_hint_history
       (user_id, lab_id, hint_index, first_revealed_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, lab_id, hint_index) DO NOTHING`,
    [record.userId, record.labId, hintIndex, revealedAt],
  );
}

async function recordFirstLabCompletionAndReward(
  client: PoolClient,
  record: LabAttemptRecord,
  completedAt: Date,
) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    `xp-lab:${record.userId}:${record.labId}`,
  ]);
  const hintCountResult = await client.query<{ unique_hints_used: string }>(
    `SELECT count(*)::text AS unique_hints_used
     FROM learner_lab_hint_history
     WHERE user_id = $1 AND lab_id = $2 AND first_revealed_at <= $3`,
    [record.userId, record.labId, completedAt],
  );
  const uniqueHintsUsed = Number(hintCountResult.rows[0]?.unique_hints_used ?? "0");
  const reward = calculateLabXpReward(uniqueHintsUsed);
  const history = await client.query(
    `INSERT INTO learner_lab_completion_history
       (user_id, lab_id, first_attempt_id, first_completed_at,
        unique_hints_used, xp_awarded)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, lab_id) DO NOTHING
     RETURNING lab_id`,
    [record.userId, record.labId, record.id, completedAt, uniqueHintsUsed, reward.earnedXp],
  );
  if (!history.rowCount || reward.earnedXp === 0) return;
  await awardCanonicalXpEventWithClient(client, {
    userId: record.userId,
    sourceType: "lab",
    sourceKey: record.labId,
    xpAmount: reward.earnedXp,
    awardedAt: completedAt,
  });
}

async function readServerNow(client: PoolClient) {
  const result = await client.query<{ server_now: Date }>("SELECT clock_timestamp() AS server_now");
  const now = result.rows[0]?.server_now;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new LabRepositoryDataError();
  return now;
}

function mapAttempt(row: AttemptRow): LabAttemptRecord {
  if (!isUuid(row.id) || !isUuid(row.user_id) || !isLabId(row.lab_id) || !Number.isSafeInteger(row.lab_version) || row.lab_version < 1
    || (row.mode !== "learner" && row.mode !== "preview") || (row.status !== "in_progress" && row.status !== "completed")
    || !isSimulatedLabState(row.state_json) || !Number.isSafeInteger(row.state_revision) || row.state_revision < 0
    || !isDeviceId(row.selected_device_id) || !Number.isSafeInteger(row.revealed_hint_count) || row.revealed_hint_count < 0
    || !Number.isSafeInteger(row.run_number) || row.run_number < 1 || !Number.isSafeInteger(row.last_event_sequence) || row.last_event_sequence < 0) throw new LabRepositoryDataError();
  return {
    id: row.id, userId: row.user_id, labId: row.lab_id, labVersion: row.lab_version,
    mode: row.mode, status: row.status, state: row.state_json, stateRevision: row.state_revision,
    selectedDeviceId: row.selected_device_id, revealedHintCount: row.revealed_hint_count,
    runNumber: row.run_number, lastEventSequence: row.last_event_sequence,
    startedAt: toDate(row.started_at), updatedAt: toDate(row.updated_at), completedAt: row.completed_at ? toDate(row.completed_at) : null,
  };
}

function mapEvent(row: EventRow): LabHistoryItem {
  return { sequence: row.sequence, kind: row.kind, deviceId: row.device_id ?? undefined, summary: row.summary, command: row.command_text ?? undefined, createdAt: toDate(row.created_at).toISOString() };
}

function assertBaseInput(input: { userId: string; labId: string; labVersion: number; mode: LabAttemptMode; selectedDeviceId?: string; initialState?: SimulatedLabState }) {
  if (!isUuid(input.userId) || !isLabId(input.labId) || !Number.isSafeInteger(input.labVersion) || input.labVersion < 1
    || (input.mode !== "learner" && input.mode !== "preview") || (input.selectedDeviceId !== undefined && !isDeviceId(input.selectedDeviceId))
    || (input.initialState !== undefined && !isSimulatedLabState(input.initialState))) throw new LabRepositoryDataError();
}

function isLabId(value: string) { return value.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value); }
function isDeviceId(value: string) { return value.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value); }
function toDate(value: Date | string) { const date = value instanceof Date ? value : new Date(value); if (Number.isNaN(date.getTime())) throw new LabRepositoryDataError(); return date; }

const attemptColumns = `id, user_id, lab_id, lab_version, mode, status, state_json,
  state_revision, selected_device_id, revealed_hint_count, run_number,
  last_event_sequence, started_at, updated_at, completed_at`;
