export type LabDifficulty = "Einstieg" | "Fortgeschritten";
export type LabKind = "tutorial" | "troubleshooting";
export type LabAttemptMode = "learner" | "preview";
export type LabAttemptStatus = "in_progress" | "completed";
export type LabCatalogueStatus = "locked" | "available" | "in-progress" | "completed" | "preview";
export type LabDeviceType = "windows-client" | "linux-client" | "linux-server" | "router" | "switch" | "firewall" | "dns-dhcp-server" | "internet";

export type LabUnlockRequirements = {
  minLevel?: number;
  requiredModuleIds?: readonly string[];
  requiredLabCompletions?: readonly string[];
};

export type LabUnlockContext = {
  level: number;
  completedModuleIds: ReadonlySet<string>;
  completedLabIds: ReadonlySet<string>;
  bypass: boolean;
};

export type LabUnlockEvaluation = {
  unlocked: boolean;
  level?: { required: number; current: number; satisfied: boolean };
  modules: readonly { id: string; satisfied: boolean }[];
  labCompletions: readonly { id: string; satisfied: boolean }[];
};

export type LabPublicDefinition = {
  id: string;
  version: number;
  kind: LabKind;
  title: string;
  summary: string;
  scenario: string;
  task: string;
  category: string;
  difficulty: LabDifficulty;
  estimatedMinutes: number;
  unlockRequirements: LabUnlockRequirements;
  relevantModuleIds: readonly string[];
  topology: {
    devices: readonly {
      id: string;
      label: string;
      type: LabDeviceType;
      description: string;
    }[];
    links: readonly { from: string; to: string; label?: string }[];
  };
};

export type LabCatalogueCard = Omit<LabPublicDefinition, "topology" | "scenario" | "task"> & {
  status: LabCatalogueStatus;
  actionHref: string;
  requirements: {
    bypassed?: boolean;
    level?: { required: number; current?: number; satisfied: boolean };
    modules: readonly { title: string; href: string; satisfied: boolean }[];
    labs: readonly { id: string; title: string; href: string; satisfied: boolean }[];
  };
};

export type LabCatalogueView = {
  audience: LabAttemptMode;
  completedCount: number;
  totalCount: number;
  cards: readonly LabCatalogueCard[];
};

export type LabDeviceView = LabPublicDefinition["topology"]["devices"][number] & {
  selected: boolean;
};

export type LabControlView =
  | { kind: "set-dns-server"; label: string }
  | { kind: "set-default-gateway"; label: string }
  | { kind: "set-ipv4-address"; label: string }
  | { kind: "set-prefix-length"; label: string }
  | { kind: "renew-dhcp"; label: string }
  | { kind: "set-service-state"; label: string; service: string }
  | { kind: "set-file-mode"; label: string; path: string }
  | { kind: "set-dns-record"; label: string; hostname: string }
  | { kind: "set-dhcp-option"; label: string; option: "gateway" | "dnsServer" }
  | { kind: "set-service-port"; label: string; service: string }
  | { kind: "set-access-vlan"; label: string; portId: string }
  | { kind: "set-firewall-rule-action"; label: string; ruleId: string };

export type LabTerminalEntry = {
  deviceId: string;
  command: string;
  output: string;
};

export type LabHistoryItem = {
  sequence: number;
  kind: "command" | "configuration" | "hint" | "device" | "completion" | "reset";
  deviceId?: string;
  summary: string;
  command?: string;
  createdAt: string;
};

export type LabTutorialView = {
  step: number;
  totalSteps: number;
  title: string;
  instruction: string;
  principle?: string;
  confirmation?: string;
};

export type LabCompletionReward =
  | {
      kind: "first-completion";
      baseXp: number;
      uniqueHintsUsed: number;
      hintDeduction: number;
      earnedXp: number;
    }
  | { kind: "replay"; earnedXp: 0 };

export type LabAttemptView = {
  attemptId: string;
  labId: string;
  labVersion: number;
  mode: LabAttemptMode;
  status: LabAttemptStatus;
  revision: number;
  runNumber: number;
  kind: LabKind;
  title: string;
  summary: string;
  scenario: string;
  task: string;
  topology: LabPublicDefinition["topology"];
  devices: readonly LabDeviceView[];
  selectedDeviceId: string;
  controls: readonly LabControlView[];
  supportedCommands: readonly string[];
  terminalTranscript: readonly LabTerminalEntry[];
  verificationPending: boolean;
  workflow: {
    analysisStarted: boolean;
    configurationChanged: boolean;
    repairComplete: boolean;
    verificationComplete: boolean;
  };
  revealedHints: readonly string[];
  remainingHintCount: number;
  history: readonly LabHistoryItem[];
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  reward?: LabCompletionReward;
  tutorial?: LabTutorialView;
  review?: {
    rootCause: string;
    explanation: string;
    verification: string;
    recommendedSequence: readonly string[];
    moduleLinks: readonly { title: string; href: string }[];
  };
};

export type LabPageView = {
  definition: LabPublicDefinition;
  mode: LabAttemptMode;
  locked: boolean;
  requirements: LabCatalogueCard["requirements"];
  attempt?: LabAttemptView;
};

export type LabConfigurationAction =
  | {
      kind: "set-network-configuration";
      patch: {
        ipv4Address?: string;
        prefixLength?: number;
        gateway?: string;
        dnsServer?: string;
      };
    }
  | { kind: "set-dns-server"; value: string }
  | { kind: "set-default-gateway"; value: string }
  | { kind: "set-ipv4-address"; value: string }
  | { kind: "set-prefix-length"; value: number }
  | { kind: "renew-dhcp" }
  | { kind: "set-service-state"; service: string; state: "running" | "stopped" }
  | { kind: "set-file-mode"; path: string; mode: string }
  | { kind: "set-dns-record"; hostname: string; address: string }
  | { kind: "set-dhcp-option"; option: "gateway" | "dnsServer"; value: string }
  | { kind: "set-service-port"; service: string; port: number }
  | { kind: "set-access-vlan"; portId: string; vlan: number }
  | { kind: "set-firewall-rule-action"; ruleId: string; action: "allow" | "deny" };

export function evaluateLabUnlock(
  requirements: LabUnlockRequirements,
  context: LabUnlockContext,
): LabUnlockEvaluation {
  const modules = (requirements.requiredModuleIds ?? []).map((id) => ({
    id,
    satisfied: context.completedModuleIds.has(id),
  }));
  const labCompletions = (requirements.requiredLabCompletions ?? []).map((id) => ({
    id,
    satisfied: context.completedLabIds.has(id),
  }));
  const level = requirements.minLevel === undefined ? undefined : {
    required: requirements.minLevel,
    current: context.level,
    satisfied: context.level >= requirements.minLevel,
  };
  return {
    unlocked: context.bypass || ((!level || level.satisfied) && modules.every((module) => module.satisfied) && labCompletions.every((lab) => lab.satisfied)),
    level,
    modules,
    labCompletions,
  };
}

export const LAB_TUTORIAL_TOTAL_STEPS = 8;

export function projectTutorialGuidance(input: {
  selectedDeviceId: string;
  status: LabAttemptStatus;
  history: readonly LabHistoryItem[];
  repairComplete: boolean;
}): LabTutorialView | undefined {
  if (input.status === "completed") return undefined;
  const selectedClient = input.selectedDeviceId === "client" || input.history.some((item) => item.kind === "device" && item.deviceId === "client");
  const usedHelp = input.history.some((item) => item.kind === "command" && item.deviceId === "client" && item.command === "help");
  const firstInspection = input.history.find((item) => item.kind === "command" && item.deviceId === "client" && item.command === "ipconfig /all");
  const openedHint = input.history.some((item) => item.kind === "hint");
  const configurationChange = input.history.findLast((item) => item.kind === "configuration" && item.deviceId === "client");
  const inspectedRepair = Boolean(configurationChange && input.history.some((item) => item.kind === "command" && item.deviceId === "client" && item.command === "ipconfig /all" && item.sequence > configurationChange.sequence));
  if (!selectedClient) return { step: 1, totalSteps: LAB_TUTORIAL_TOTAL_STEPS, title: "Arbeitsplatz auswählen", instruction: "Lies die Ausgangssituation und Aufgabe. Wähle danach in der Topologie den PC CLIENT01 aus. Die sichtbare Markierung zeigt dir das aktive Gerät." };
  if (!usedHelp) return { step: 2, totalSteps: LAB_TUTORIAL_TOTAL_STEPS, title: "Werkzeuge kennenlernen", instruction: "CLIENT01 ist ausgewählt. Gib im Terminal help ein und verschaffe dir einen Überblick über die verfügbaren Diagnosebefehle.", confirmation: "CLIENT01 ist jetzt aktiv." };
  if (!firstInspection) return { step: 3, totalSteps: LAB_TUTORIAL_TOTAL_STEPS, title: "Ist-Zustand untersuchen", instruction: "Führe ipconfig /all aus. Suche in der Ausgabe nach IPv4-Adresse, Präfix, Standardgateway und DNS-Server.", confirmation: "Die Werkzeughilfe wurde geöffnet." };
  if (!openedHint) return { step: 4, totalSteps: LAB_TUTORIAL_TOTAL_STEPS, title: "Hinweise gezielt nutzen", instruction: "Öffne im Bereich „Progressive Hinweise“ den nächsten Hinweis. Vergleiche ihn mit deinem Befund aus ipconfig /all.", confirmation: "Der Ist-Zustand ist im Diagnoseprotokoll festgehalten." };
  if (!configurationChange || !input.repairComplete) return { step: 5, totalSteps: LAB_TUTORIAL_TOTAL_STEPS, title: "Kontrolliert reparieren", instruction: configurationChange ? "Die letzte Änderung löst die Ursache noch nicht. Setze ausschließlich das Standardgateway von CLIENT01 auf 192.168.90.1." : "Öffne die Netzwerkkonfiguration von CLIENT01. Trage ausschließlich beim Standardgateway 192.168.90.1 ein und wende die Änderung an.", confirmation: "Der Hinweis grenzt die Ursache ein." };
  if (!inspectedRepair) return { step: 6, totalSteps: LAB_TUTORIAL_TOTAL_STEPS, title: "Änderung kontrollieren", instruction: "Führe erneut ipconfig /all aus. Prüfe, ob jetzt das Standardgateway 192.168.90.1 angezeigt wird.", confirmation: "Die Sollkonfiguration wurde übernommen." };
  return {
    step: 7,
    totalSteps: LAB_TUTORIAL_TOTAL_STEPS,
    title: "Reparatur verifizieren",
    instruction: "Prüfe die tatsächliche Funktion mit ping 203.0.113.20. Erst der erfolgreiche Test schließt das Tutorial ab.",
    principle: "Änderung ≠ Funktionsnachweis",
    confirmation: "Die korrigierte Konfiguration wurde erneut geprüft.",
  };
}
