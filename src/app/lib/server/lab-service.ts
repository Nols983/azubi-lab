import "server-only";

import { learningModules } from "../../data/learning-modules.ts";
import { quizzes } from "../../data/quizzes.ts";
import { canPreviewLabs } from "../authorization.ts";
import type { AccountRole } from "../auth-types.ts";
import {
  evaluateLabUnlock,
  projectTutorialGuidance,
  type LabAttemptMode,
  type LabAttemptView,
  type LabCatalogueCard,
  type LabCatalogueView,
  type LabConfigurationAction,
  type LabPageView,
} from "../interactive-lab.ts";
import { getModuleProgress } from "../learner-progress.ts";
import {
  appendLabTerminalEntry,
  applyLabConfiguration,
  executeLabOperation,
  getLabCommandHelp,
  isIpv4,
  LabCommandError,
  parseLabCommand,
} from "../lab-engine.ts";
import { requireAuthenticatedUser } from "./current-user.ts";
import {
  cloneInitialLabState,
  findCurrentLabDefinition,
  findVersionedLabDefinition,
  hasRequiredLabVerification,
  hydrateCompatibleLabState,
  isLabComplete,
  listCurrentLabDefinitions,
  type ServerLabDefinition,
} from "./lab-definitions.ts";
import {
  LabAttemptConflictError,
  LabAttemptHistoryLimitError,
  LabAttemptNotFoundError,
  mutateOwnedLabAttempt,
  readOwnedLabCompletionReward,
  readOwnedLabAttemptHistory,
  readLabAttemptSummaries,
  readLatestOwnedLabAttempt,
  readOwnedLabAttempt,
  resetOwnedLabAttempt,
  startOrResumeLabAttempt,
  type LabAttemptRecord,
} from "./lab-repository.ts";
import { readLearnerProgress } from "./progress-repository.ts";
import { getLearnerXpProgress } from "./xp-service.ts";

const canonicalModules = new Map(learningModules.map((module) => [module.slug, module]));
const quizModules = new Set(quizzes.map((quiz) => quiz.moduleSlug));

export class LabRequestError extends Error {
  readonly publicMessage: string;

  constructor(publicMessage = "Die Lab-Anfrage ist ungültig.") { super("The interactive lab request is invalid."); this.name = "LabRequestError"; this.publicMessage = publicMessage; }
}
export class LabLockedError extends Error {
  constructor() { super("The interactive lab is locked for this learner."); this.name = "LabLockedError"; }
}
export class LabDefinitionNotFoundError extends Error {
  constructor() { super("The interactive lab definition does not exist."); this.name = "LabDefinitionNotFoundError"; }
}

export async function getLabCatalogue(): Promise<LabCatalogueView> {
  const user = await requireAuthenticatedUser();
  const mode = modeForRole(user.role);
  const definitions = listCurrentLabDefinitions();
  const { access, summaries } = await loadAccessSnapshot(user.id, user.role);
  const summaryMap = new Map(summaries.map((summary) => [`${summary.labId}:${summary.labVersion}`, summary]));
  const cards = definitions.map((definition): LabCatalogueCard => {
    const evaluation = evaluateLabUnlock(definition.public.unlockRequirements, access);
    const summary = summaryMap.get(`${definition.public.id}:${definition.public.version}`);
    const status = mode === "preview" ? "preview"
      : summary?.hasActive ? "in-progress"
      : summary?.hasCompleted ? "completed"
      : !evaluation.unlocked ? "locked"
      : "available";
    const publicCard = {
      id: definition.public.id,
      version: definition.public.version,
      kind: definition.public.kind,
      title: definition.public.title,
      summary: definition.public.summary,
      category: definition.public.category,
      difficulty: definition.public.difficulty,
      estimatedMinutes: definition.public.estimatedMinutes,
      unlockRequirements: definition.public.unlockRequirements,
      relevantModuleIds: definition.public.relevantModuleIds,
    };
    return {
      ...publicCard,
      status,
      actionHref: `/labs/${definition.public.id}`,
      requirements: requirementView(definition, evaluation, mode),
    };
  });
  return {
    audience: mode,
    completedCount: mode === "learner" ? definitions.filter((definition) => definition.public.kind === "troubleshooting" && summaryMap.get(`${definition.public.id}:${definition.public.version}`)?.hasCompleted).length : 0,
    totalCount: cards.filter((card) => card.kind === "troubleshooting").length,
    cards,
  };
}

export async function getLabPage(labId: string): Promise<LabPageView> {
  const definition = findCurrentLabDefinition(labId);
  if (!definition) throw new LabDefinitionNotFoundError();
  const user = await requireAuthenticatedUser();
  const mode = modeForRole(user.role);
  const [{ access }, record] = await Promise.all([
    loadAccessSnapshot(user.id, user.role),
    readLatestOwnedLabAttempt({ userId: user.id, labId, labVersion: definition.public.version, mode }),
  ]);
  const evaluation = evaluateLabUnlock(definition.public.unlockRequirements, access);
  if (!evaluation.unlocked && !record) return { definition: definition.public, mode, locked: true, requirements: requirementView(definition, evaluation, mode) };
  return {
    definition: definition.public,
    mode,
    locked: false,
    requirements: requirementView(definition, evaluation, mode),
    attempt: record ? await projectAttempt(record, definition) : undefined,
  };
}

export async function startLab(input: unknown) {
  const data = parseObject(input, ["labId"]);
  if (typeof data.labId !== "string") throw new LabRequestError();
  const definition = findCurrentLabDefinition(data.labId);
  if (!definition) throw new LabDefinitionNotFoundError();
  const user = await requireAuthenticatedUser();
  const mode = modeForRole(user.role);
  const existing = await readLatestOwnedLabAttempt({ userId: user.id, labId: definition.public.id, labVersion: definition.public.version, mode });
  await assertUnlocked(user.id, user.role, definition, existing?.status === "in_progress");
  const result = await startOrResumeLabAttempt({
    userId: user.id, labId: definition.public.id, labVersion: definition.public.version, mode,
    initialState: cloneInitialLabState(definition), selectedDeviceId: definition.selectedDeviceId,
  });
  return projectAttempt(result.record, definition);
}

export async function runLabCommand(input: unknown) {
  const data = parseObject(input, ["attemptId", "deviceId", "command", "revision"]);
  const request = parseMutationIdentity(data);
  const parsed = parseLabCommand(data.command);
  const context = await loadMutableAttempt(request.attemptId);
  const result = await mutateOwnedLabAttempt({
    userId: context.user.id, attemptId: request.attemptId, mode: context.mode, expectedRevision: request.revision,
    rewardEligible: context.definition.public.kind === "troubleshooting",
    mutate: (record) => {
      assertAttemptDefinition(record, context.definition);
      const rules = context.definition.deviceRules[request.deviceId];
      if (!rules) throw new LabRequestError("Dieses Gerät gehört nicht zum Lab.");
      const supportedCommands = withPresentationCommands(rules.commands);
      const compatibleState = hydrateCompatibleLabState(context.definition, record.state);
      const executed = executeLabOperation({ state: compatibleState, deviceId: request.deviceId, operation: parsed.operation, supportedCommands, dhcpLease: context.definition.dhcpLease, dnsHosts: context.definition.dnsHosts, httpRequiredServices: context.definition.httpRequiredServices });
      const state = parsed.operation.kind === "clear"
        ? executed.state
        : appendLabTerminalEntry(executed.state, { deviceId: request.deviceId, command: parsed.normalized, output: executed.output });
      return {
        state,
        completed: isLabComplete(context.definition, state),
        events: [{ kind: "command", deviceId: request.deviceId, command: parsed.normalized, summary: executed.summary }],
      };
    },
  });
  return projectAttempt(result.record, context.definition);
}

export async function configureLab(input: unknown) {
  const data = parseObject(input, ["attemptId", "deviceId", "action", "revision"]);
  const request = parseMutationIdentity(data);
  const action = parseConfigurationAction(data.action);
  const context = await loadMutableAttempt(request.attemptId);
  const result = await mutateOwnedLabAttempt({
    userId: context.user.id, attemptId: request.attemptId, mode: context.mode, expectedRevision: request.revision,
    rewardEligible: context.definition.public.kind === "troubleshooting",
    mutate: (record) => {
      assertAttemptDefinition(record, context.definition);
      const rules = context.definition.deviceRules[request.deviceId];
      if (!rules) throw new LabRequestError("Dieses Gerät gehört nicht zum Lab.");
      const compatibleState = hydrateCompatibleLabState(context.definition, record.state);
      const configured = applyLabConfiguration({ state: compatibleState, deviceId: request.deviceId, action, allowedControls: rules.controls, dhcpLease: context.definition.dhcpLease });
      return {
        state: configured.state,
        completed: isLabComplete(context.definition, configured.state),
        events: [{ kind: "configuration", deviceId: request.deviceId, summary: configured.summary }],
      };
    },
  });
  return projectAttempt(result.record, context.definition);
}

export async function selectLabDevice(input: unknown) {
  const data = parseObject(input, ["attemptId", "deviceId", "revision"]);
  const request = parseMutationIdentity(data);
  const context = await loadMutableAttempt(request.attemptId);
  const label = context.definition.public.topology.devices.find((device) => device.id === request.deviceId)?.label;
  if (!label) throw new LabRequestError("Dieses Gerät gehört nicht zum Lab.");
  const result = await mutateOwnedLabAttempt({
    userId: context.user.id, attemptId: request.attemptId, mode: context.mode, expectedRevision: request.revision,
    rewardEligible: context.definition.public.kind === "troubleshooting",
    mutate: () => ({ selectedDeviceId: request.deviceId, events: [{ kind: "device", deviceId: request.deviceId, summary: `${label} ausgewählt` }] }),
  });
  return projectAttempt(result.record, context.definition);
}

export async function revealLabHint(input: unknown) {
  const data = parseObject(input, ["attemptId", "revision"]);
  const request = parseMutationIdentity(data, false);
  const context = await loadMutableAttempt(request.attemptId);
  const result = await mutateOwnedLabAttempt({
    userId: context.user.id, attemptId: request.attemptId, mode: context.mode, expectedRevision: request.revision,
    rewardEligible: context.definition.public.kind === "troubleshooting",
    mutate: (record) => {
      const count = Math.min(record.revealedHintCount + 1, context.definition.hints.length);
      if (count === record.revealedHintCount) return { events: [] };
      return { revealedHintCount: count, events: [{ kind: "hint", hintIndex: count, summary: `Hinweis ${count} geöffnet` }] };
    },
  });
  return projectAttempt(result.record, context.definition);
}

export async function resetLab(input: unknown) {
  const data = parseObject(input, ["attemptId", "revision"]);
  const request = parseMutationIdentity(data, false);
  const context = await loadMutableAttempt(request.attemptId);
  const record = await resetOwnedLabAttempt({ userId: context.user.id, attemptId: request.attemptId, mode: context.mode, expectedRevision: request.revision, initialState: cloneInitialLabState(context.definition), selectedDeviceId: context.definition.selectedDeviceId });
  return projectAttempt(record, context.definition);
}

async function loadMutableAttempt(attemptId: string) {
  const user = await requireAuthenticatedUser();
  const mode = modeForRole(user.role);
  const record = await readOwnedLabAttempt({ userId: user.id, attemptId, mode });
  if (!record) throw new LabAttemptNotFoundError();
  const definition = findVersionedLabDefinition(record.labId, record.labVersion);
  if (!definition) throw new LabDefinitionNotFoundError();
  await assertUnlocked(user.id, user.role, definition, record.status === "in_progress");
  return { user, mode, record, definition };
}

async function assertUnlocked(userId: string, role: AccountRole, definition: ServerLabDefinition, allowExistingAttempt = false) {
  const { access } = await loadAccessSnapshot(userId, role);
  const requirements = allowExistingAttempt
    ? { ...definition.public.unlockRequirements, requiredLabCompletions: [] }
    : definition.public.unlockRequirements;
  const evaluation = evaluateLabUnlock(requirements, access);
  if (!evaluation.unlocked) throw new LabLockedError();
}

async function loadAccessSnapshot(userId: string, role: AccountRole) {
  const mode = modeForRole(role);
  if (canPreviewLabs(role)) {
    const summaries = await readLabAttemptSummaries(userId, mode);
    return { access: { level: 0, completedModuleIds: new Set<string>(), completedLabIds: new Set<string>(), bypass: true }, summaries };
  }
  const [progress, xp, summaries] = await Promise.all([readLearnerProgress(userId), getLearnerXpProgress(userId), readLabAttemptSummaries(userId, mode)]);
  const completedModuleIds = new Set(learningModules.filter((module) => getModuleProgress(progress, module, quizModules.has(module.slug)).status === "completed").map((module) => module.slug));
  const completedLabIds = new Set(summaries.filter((summary) => summary.hasCompleted).map((summary) => summary.labId));
  return { access: { level: xp.level, completedModuleIds, completedLabIds, bypass: false }, summaries };
}

function requirementView(definition: ServerLabDefinition, evaluation: ReturnType<typeof evaluateLabUnlock>, mode: LabAttemptMode): LabCatalogueCard["requirements"] {
  return {
    bypassed: mode === "preview",
    level: evaluation.level && { required: evaluation.level.required, current: mode === "learner" ? evaluation.level.current : undefined, satisfied: evaluation.level.satisfied },
    modules: evaluation.modules.map((item) => {
      const learningModule = canonicalModules.get(item.id);
      if (!learningModule) throw new LabDefinitionNotFoundError();
      return { title: learningModule.title, href: `/lernen/${learningModule.slug}`, satisfied: item.satisfied };
    }),
    labs: evaluation.labCompletions.map((item) => {
      const requiredLab = findCurrentLabDefinition(item.id);
      if (!requiredLab) throw new LabDefinitionNotFoundError();
      return { id: item.id, title: requiredLab.public.title, href: `/labs/${item.id}`, satisfied: item.satisfied };
    }),
  };
}

async function projectAttempt(record: LabAttemptRecord, definition: ServerLabDefinition): Promise<LabAttemptView> {
  const state = hydrateCompatibleLabState(definition, record.state);
  const selected = state.devices[record.selectedDeviceId];
  const rules = definition.deviceRules[record.selectedDeviceId];
  if (!selected || !rules) throw new LabDefinitionNotFoundError();
  const history = await readOwnedLabAttemptHistory({ userId: record.userId, attemptId: record.id, mode: record.mode, runNumber: record.runNumber });
  const repairComplete = definition.validate(state);
  const verificationComplete = hasRequiredLabVerification(definition, state);
  const configurationChanged = history.some((item) => item.kind === "configuration");
  const review = record.status === "completed" ? {
    ...definition.review,
    moduleLinks: definition.public.relevantModuleIds.map((id) => {
      const learningModule = canonicalModules.get(id);
      if (!learningModule) throw new LabDefinitionNotFoundError();
      return { title: learningModule.title, href: `/lernen/${learningModule.slug}` };
    }),
  } : undefined;
  const reward = record.status === "completed"
    && record.mode === "learner"
    && definition.public.kind === "troubleshooting"
    ? await readOwnedLabCompletionReward({ userId: record.userId, attemptId: record.id, labId: record.labId })
    : undefined;
  return {
    attemptId: record.id, labId: record.labId, labVersion: record.labVersion, mode: record.mode,
    status: record.status, revision: record.stateRevision, runNumber: record.runNumber,
    kind: definition.public.kind, title: definition.public.title, summary: definition.public.summary,
    scenario: definition.public.scenario, task: definition.public.task,
    topology: definition.public.topology,
    devices: definition.public.topology.devices.map((device) => ({ ...device, selected: device.id === record.selectedDeviceId })),
    selectedDeviceId: record.selectedDeviceId,
    controls: controlsFor(rules.controls), supportedCommands: withPresentationCommands(rules.commands).map(getLabCommandHelp),
    terminalTranscript: state.terminalTranscript ?? [],
    verificationPending: record.status === "in_progress" && repairComplete,
    workflow: {
      analysisStarted: history.some((item) => item.kind === "command"),
      configurationChanged,
      repairComplete,
      verificationComplete,
    },
    revealedHints: definition.hints.slice(0, record.revealedHintCount), remainingHintCount: Math.max(0, definition.hints.length - record.revealedHintCount),
    history, tutorial: definition.public.kind === "tutorial" ? projectTutorialGuidance({ selectedDeviceId: record.selectedDeviceId, status: record.status, history, repairComplete }) : undefined,
    startedAt: record.startedAt.toISOString(), updatedAt: record.updatedAt.toISOString(), completedAt: record.completedAt?.toISOString(), reward, review,
  };
}

function controlsFor(controls: ServerLabDefinition["deviceRules"][string]["controls"]) {
  return controls.map((control) => {
    const { kind } = control;
    if (kind === "set-dns-server") return { kind, label: "Bevorzugter DNS-Server" } as const;
    if (kind === "set-default-gateway") return { kind, label: "Standardgateway" } as const;
    if (kind === "set-ipv4-address") return { kind, label: "IPv4-Adresse" } as const;
    if (kind === "set-prefix-length") return { kind, label: "Präfixlänge" } as const;
    if (kind === "renew-dhcp") return { kind, label: "DHCP-Lease erneuern" } as const;
    if (kind === "set-service-state") return { kind, label: `${control.service}-Dienst steuern`, service: control.service } as const;
    if (kind === "set-file-mode") return { kind, label: "Verzeichnismodus setzen", path: control.path } as const;
    if (kind === "set-dns-record") {
      const hostname = control.hostname.toLowerCase();
      return { kind, label: `A-Eintrag ${hostname} setzen`, hostname } as const;
    }
    if (kind === "set-dhcp-option") return { kind, label: `DHCP-Option ${control.option === "gateway" ? "Gateway" : "DNS-Server"} setzen`, option: control.option } as const;
    if (kind === "set-service-port") return { kind, label: `${control.service}-Port setzen`, service: control.service } as const;
    if (kind === "set-access-vlan") return { kind, label: `Access-VLAN für ${control.portId} setzen`, portId: control.portId } as const;
    if (kind === "set-firewall-rule-action") return { kind, label: `Firewall-Regel ${control.ruleId}`, ruleId: control.ruleId } as const;
    throw new LabDefinitionNotFoundError();
  });
}

function withPresentationCommands(commands: readonly string[]) {
  return commands.includes("clear") ? commands : [...commands, "clear"];
}

function parseConfigurationAction(value: unknown): LabConfigurationAction {
  if (!isRecord(value) || typeof value.kind !== "string") throw new LabRequestError();
  if (value.kind === "set-network-configuration") {
    if (!hasOnlyKeys(value, ["kind", "patch"]) || !isRecord(value.patch)) throw new LabRequestError();
    const patch = value.patch;
    const allowedFields = new Set(["ipv4Address", "prefixLength", "gateway", "dnsServer"]);
    const keys = Object.keys(patch);
    if (keys.length === 0 || !keys.every((key) => allowedFields.has(key))) throw new LabRequestError("Gib mindestens einen unterstützten Netzwerkwert ein.");
    if (patch.ipv4Address !== undefined && (typeof patch.ipv4Address !== "string" || !isIpv4(patch.ipv4Address))) throw new LabRequestError("Bitte gib eine gültige IPv4-Adresse ein.");
    if (patch.gateway !== undefined && (typeof patch.gateway !== "string" || !isIpv4(patch.gateway))) throw new LabRequestError("Bitte gib ein gültiges Standardgateway ein.");
    if (patch.dnsServer !== undefined && (typeof patch.dnsServer !== "string" || !isIpv4(patch.dnsServer))) throw new LabRequestError("Bitte gib einen gültigen DNS-Server ein.");
    if (patch.prefixLength !== undefined && (!Number.isInteger(patch.prefixLength) || Number(patch.prefixLength) < 0 || Number(patch.prefixLength) > 32)) throw new LabRequestError("Bitte gib eine gültige Präfixlänge zwischen 0 und 32 ein.");
    return {
      kind: value.kind,
      patch: {
        ...(patch.ipv4Address !== undefined ? { ipv4Address: patch.ipv4Address } : {}),
        ...(patch.prefixLength !== undefined ? { prefixLength: Number(patch.prefixLength) } : {}),
        ...(patch.gateway !== undefined ? { gateway: patch.gateway } : {}),
        ...(patch.dnsServer !== undefined ? { dnsServer: patch.dnsServer } : {}),
      },
    };
  }
  if (value.kind === "set-dns-server" || value.kind === "set-default-gateway" || value.kind === "set-ipv4-address") {
    if (!hasOnlyKeys(value, ["kind", "value"]) || typeof value.value !== "string" || !isIpv4(value.value)) throw new LabRequestError("Bitte gib eine gültige IPv4-Adresse ein.");
    return { kind: value.kind, value: value.value };
  }
  if (value.kind === "set-prefix-length") {
    if (!hasOnlyKeys(value, ["kind", "value"]) || !Number.isInteger(value.value) || Number(value.value) < 0 || Number(value.value) > 32) throw new LabRequestError("Bitte gib eine gültige Präfixlänge zwischen 0 und 32 ein.");
    return { kind: value.kind, value: Number(value.value) };
  }
  if (value.kind === "renew-dhcp" && hasOnlyKeys(value, ["kind"])) return { kind: value.kind };
  if (value.kind === "set-service-state") {
    if (!hasOnlyKeys(value, ["kind", "service", "state"]) || typeof value.service !== "string" || !/^[a-z0-9@_.-]{1,64}$/iu.test(value.service) || (value.state !== "running" && value.state !== "stopped")) throw new LabRequestError();
    return { kind: value.kind, service: value.service, state: value.state };
  }
  if (value.kind === "set-file-mode") {
    if (!hasOnlyKeys(value, ["kind", "path", "mode"]) || typeof value.path !== "string" || typeof value.mode !== "string" || !/^\/(?:[a-z0-9._-]+\/)*[a-z0-9._-]+$/iu.test(value.path) || !/^[0-7]{4}$/u.test(value.mode)) throw new LabRequestError();
    return { kind: value.kind, path: value.path, mode: value.mode };
  }
  if (value.kind === "set-dns-record") {
    if (!hasOnlyKeys(value, ["kind", "hostname", "address"]) || typeof value.hostname !== "string" || typeof value.address !== "string" || !/^[a-z0-9.-]{1,253}$/iu.test(value.hostname) || !isIpv4(value.address)) throw new LabRequestError();
    return { kind: value.kind, hostname: value.hostname.toLowerCase(), address: value.address };
  }
  if (value.kind === "set-dhcp-option") {
    if (!hasOnlyKeys(value, ["kind", "option", "value"]) || (value.option !== "gateway" && value.option !== "dnsServer") || typeof value.value !== "string" || !isIpv4(value.value)) throw new LabRequestError();
    return { kind: value.kind, option: value.option, value: value.value };
  }
  if (value.kind === "set-service-port") {
    if (!hasOnlyKeys(value, ["kind", "service", "port"]) || typeof value.service !== "string" || !/^[a-z0-9@_.-]{1,64}$/iu.test(value.service) || !Number.isInteger(value.port) || Number(value.port) < 1 || Number(value.port) > 65535) throw new LabRequestError("Bitte gib einen gültigen TCP-Port zwischen 1 und 65535 ein.");
    return { kind: value.kind, service: value.service, port: Number(value.port) };
  }
  if (value.kind === "set-access-vlan") {
    if (!hasOnlyKeys(value, ["kind", "portId", "vlan"]) || typeof value.portId !== "string" || !/^[a-z0-9][a-z0-9/_.-]{0,63}$/iu.test(value.portId) || !Number.isInteger(value.vlan) || Number(value.vlan) < 1 || Number(value.vlan) > 4094) throw new LabRequestError("Bitte gib eine gültige VLAN-ID zwischen 1 und 4094 ein.");
    return { kind: value.kind, portId: value.portId, vlan: Number(value.vlan) };
  }
  if (value.kind === "set-firewall-rule-action") {
    if (!hasOnlyKeys(value, ["kind", "ruleId", "action"]) || typeof value.ruleId !== "string" || !/^[a-z0-9][a-z0-9/_.-]{0,63}$/iu.test(value.ruleId) || (value.action !== "allow" && value.action !== "deny")) throw new LabRequestError();
    return { kind: value.kind, ruleId: value.ruleId, action: value.action };
  }
  throw new LabRequestError();
}

function parseMutationIdentity(data: Record<string, unknown>, device = true) {
  if (typeof data.attemptId !== "string" || !/^[0-9a-f-]{36}$/iu.test(data.attemptId)
    || !Number.isSafeInteger(data.revision) || Number(data.revision) < 0
    || (device && (typeof data.deviceId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(data.deviceId)))) throw new LabRequestError();
  return { attemptId: data.attemptId, revision: Number(data.revision), deviceId: device ? String(data.deviceId) : "" };
}

function assertAttemptDefinition(record: LabAttemptRecord, definition: ServerLabDefinition) {
  if (record.labId !== definition.public.id || record.labVersion !== definition.public.version) throw new LabDefinitionNotFoundError();
}

function modeForRole(role: AccountRole): LabAttemptMode {
  return canPreviewLabs(role) ? "preview" : "learner";
}

function parseObject(value: unknown, keys: readonly string[]) {
  if (!isRecord(value) || !hasOnlyKeys(value, keys)) throw new LabRequestError();
  return value;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => allowed.has(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getLabActionErrorMessage(error: unknown) {
  if (error instanceof LabLockedError) return "Dieses Lab ist noch gesperrt. Erfülle zuerst die angezeigten Voraussetzungen.";
  if (error instanceof LabAttemptConflictError) return "Das Lab wurde in einem anderen Tab geändert. Lade den aktuellen Stand neu.";
  if (error instanceof LabAttemptHistoryLimitError) return "Für diesen Durchlauf wurde das Diagnoseprotokoll-Limit erreicht. Setze das Lab zurück, um neu zu beginnen.";
  if (error instanceof LabCommandError || error instanceof LabRequestError) return error instanceof LabRequestError ? error.publicMessage : error.message;
  if (error instanceof LabAttemptNotFoundError || error instanceof LabDefinitionNotFoundError) return "Dieses Lab oder der Versuch ist nicht mehr verfügbar.";
  return "Die Lab-Aktion konnte nicht ausgeführt werden. Bitte versuche es erneut.";
}
