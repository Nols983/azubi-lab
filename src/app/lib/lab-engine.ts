import type { LabConfigurationAction, LabDeviceType, LabTerminalEntry } from "./interactive-lab.ts";

export const MAX_LAB_COMMAND_LENGTH = 160;
export const MAX_LAB_EVENTS_PER_RUN = 200;
export const MAX_LAB_TERMINAL_ENTRIES = 100;
const MAX_LAB_TERMINAL_OUTPUT_LENGTH = 8000;

export const LAB_EVIDENCE_TYPES = [
  "dns-resolution-success",
  "hostname-reachability-success",
  "local-ip-reachability-success",
  "external-ip-reachability-success",
  "dhcp-renew-success",
  "client-ip-configuration-confirmed",
  "http-service-success",
  "remote-http-service-success",
  "service-status-running",
  "permission-state-confirmed",
] as const;

export type LabEvidenceType = (typeof LAB_EVIDENCE_TYPES)[number];

export type SimulatedInterface = {
  name?: string;
  address: string | null;
  prefixLength: number | null;
  gateway: string | null;
  dnsServer: string | null;
  ipv4Mode?: "static" | "dynamic";
  /** Compatibility with active attempts created before the canonical IPv4 mode was introduced. */
  dhcpEnabled?: boolean;
};

export type SimulatedRoute = {
  destination: "default" | string;
  via: string | null;
  interfaceName: string;
};

export type SimulatedDnsHost = {
  canonicalName: string;
  address: string;
  aliases?: readonly string[];
};

export type SimulatedSwitchPort = {
  mode: "access";
  vlan: number;
  connectedDeviceId: string;
};

export type SimulatedFirewallRule = {
  sourceNetwork: "any" | string;
  destinationDeviceId: string;
  protocol: "tcp";
  destinationPort: number;
  action: "allow" | "deny";
};

export type SimulatedDeviceState = {
  hostname?: string;
  interface?: SimulatedInterface;
  additionalInterfaces?: Record<string, SimulatedInterface>;
  routes?: SimulatedRoute[];
  services?: Record<string, "running" | "stopped">;
  directories?: Record<string, string>;
  dnsRecords?: Record<string, string>;
  dhcpOptions?: Partial<Pick<SimulatedInterface, "gateway" | "dnsServer">>;
  servicePorts?: Record<string, number>;
  switchPorts?: Record<string, SimulatedSwitchPort>;
  firewallRules?: Record<string, SimulatedFirewallRule>;
  routesExternal?: boolean;
};

export type SimulatedLabState = {
  devices: Record<string, SimulatedDeviceState>;
  verificationEvidence?: LabEvidenceType[];
  terminalTranscript?: LabTerminalEntry[];
};

export function isSimulatedLabState(value: unknown): value is SimulatedLabState {
  if (!isRecord(value) || !isRecord(value.devices)) return false;
  if (value.verificationEvidence !== undefined && (!Array.isArray(value.verificationEvidence)
    || !value.verificationEvidence.every((evidence) => typeof evidence === "string" && LAB_EVIDENCE_TYPES.includes(evidence as LabEvidenceType))
    || new Set(value.verificationEvidence).size !== value.verificationEvidence.length)) return false;
  if (value.terminalTranscript !== undefined && (!Array.isArray(value.terminalTranscript)
    || value.terminalTranscript.length > MAX_LAB_TERMINAL_ENTRIES
    || !value.terminalTranscript.every((entry) => isRecord(entry)
      && typeof entry.deviceId === "string" && isSafeDeviceId(entry.deviceId)
      && typeof entry.command === "string" && entry.command.length >= 1 && entry.command.length <= MAX_LAB_COMMAND_LENGTH
      && typeof entry.output === "string" && entry.output.length <= MAX_LAB_TERMINAL_OUTPUT_LENGTH))) return false;
  const devices = value.devices;
  const devicesValid = Object.entries(devices).every(([deviceId, device]) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(deviceId) || !isRecord(device)) return false;
    if (device.hostname !== undefined && (typeof device.hostname !== "string" || !isSafeHostname(device.hostname))) return false;
    if (device.interface !== undefined && !isSimulatedInterface(device.interface)) return false;
    if (device.additionalInterfaces !== undefined && (!isRecord(device.additionalInterfaces)
      || !Object.entries(device.additionalInterfaces).every(([name, network]) => isSafeInterfaceName(name) && isSimulatedInterface(network)))) return false;
    if (device.routes !== undefined && (!Array.isArray(device.routes) || !device.routes.every((route) => (
      isRecord(route)
      && (route.destination === "default" || typeof route.destination === "string" && isIpv4Cidr(route.destination))
      && (route.via === null || typeof route.via === "string" && isIpv4(route.via))
      && typeof route.interfaceName === "string" && isSafeInterfaceName(route.interfaceName)
    )))) return false;
    if (device.services !== undefined && (!isRecord(device.services) || !Object.values(device.services).every((status) => status === "running" || status === "stopped"))) return false;
    if (device.directories !== undefined && (!isRecord(device.directories) || !Object.entries(device.directories).every(([path, mode]) => isSafePath(path) && typeof mode === "string" && /^[0-7]{4}$/u.test(mode)))) return false;
    if (device.dnsRecords !== undefined && (!isRecord(device.dnsRecords) || !Object.entries(device.dnsRecords).every(([hostname, address]) => isSafeHostname(hostname) && typeof address === "string" && isIpv4(address)))) return false;
    if (device.dhcpOptions !== undefined && (!isRecord(device.dhcpOptions) || !Object.entries(device.dhcpOptions).every(([option, address]) => ["gateway", "dnsServer"].includes(option) && (address === null || typeof address === "string" && isIpv4(address))))) return false;
    if (device.servicePorts !== undefined && (!isRecord(device.servicePorts) || !Object.entries(device.servicePorts).every(([service, port]) => /^[a-z0-9@_.-]{1,64}$/iu.test(service) && Number.isInteger(port) && Number(port) >= 1 && Number(port) <= 65535))) return false;
    if (device.switchPorts !== undefined && (!isRecord(device.switchPorts) || !Object.entries(device.switchPorts).every(([portId, port]) => (
      isSafeConfigurationId(portId) && isRecord(port) && port.mode === "access"
      && Number.isInteger(port.vlan) && Number(port.vlan) >= 1 && Number(port.vlan) <= 4094
      && typeof port.connectedDeviceId === "string" && isSafeDeviceId(port.connectedDeviceId)
    )))) return false;
    if (device.firewallRules !== undefined && (!isRecord(device.firewallRules) || !Object.entries(device.firewallRules).every(([ruleId, rule]) => (
      isSafeConfigurationId(ruleId) && isRecord(rule)
      && (rule.sourceNetwork === "any" || typeof rule.sourceNetwork === "string" && isIpv4Cidr(rule.sourceNetwork))
      && typeof rule.destinationDeviceId === "string" && isSafeDeviceId(rule.destinationDeviceId)
      && rule.protocol === "tcp"
      && Number.isInteger(rule.destinationPort) && Number(rule.destinationPort) >= 1 && Number(rule.destinationPort) <= 65535
      && (rule.action === "allow" || rule.action === "deny")
    )))) return false;
    return device.routesExternal === undefined || typeof device.routesExternal === "boolean";
  });
  if (!devicesValid) return false;
  if (value.terminalTranscript?.some((entry) => !(entry.deviceId in devices))) return false;
  const connectedDeviceIds = new Set<string>();
  for (const device of Object.values(devices)) {
    if (!isRecord(device)) return false;
    if (isRecord(device.switchPorts)) {
      for (const port of Object.values(device.switchPorts)) {
        if (!isRecord(port) || typeof port.connectedDeviceId !== "string" || !(port.connectedDeviceId in devices) || connectedDeviceIds.has(port.connectedDeviceId)) return false;
        connectedDeviceIds.add(port.connectedDeviceId);
      }
    }
    if (isRecord(device.firewallRules)) {
      for (const rule of Object.values(device.firewallRules)) {
        if (!isRecord(rule) || typeof rule.destinationDeviceId !== "string" || !(rule.destinationDeviceId in devices)) return false;
      }
    }
  }
  return true;
}

function isSimulatedInterface(value: unknown): value is SimulatedInterface {
  if (!isRecord(value)
    || !(value.name === undefined || typeof value.name === "string" && isSafeInterfaceName(value.name))
    || !(value.address === null || typeof value.address === "string" && isIpv4(value.address))
    || !(value.prefixLength === null || Number.isInteger(value.prefixLength) && Number(value.prefixLength) >= 0 && Number(value.prefixLength) <= 32)
    || !(value.gateway === null || typeof value.gateway === "string" && isIpv4(value.gateway))
    || !(value.dnsServer === null || typeof value.dnsServer === "string" && isIpv4(value.dnsServer))) return false;
  const modern = value.ipv4Mode === "static" || value.ipv4Mode === "dynamic";
  const legacy = typeof value.dhcpEnabled === "boolean";
  return modern !== legacy;
}

export type LabControlRule =
  | { kind: "set-dns-server" }
  | { kind: "set-default-gateway" }
  | { kind: "set-ipv4-address" }
  | { kind: "set-prefix-length" }
  | { kind: "renew-dhcp" }
  | { kind: "set-service-state"; service: string }
  | { kind: "set-file-mode"; path: string }
  | { kind: "set-dns-record"; hostname: string }
  | { kind: "set-dhcp-option"; option: "gateway" | "dnsServer" }
  | { kind: "set-service-port"; service: string }
  | { kind: "set-access-vlan"; portId: string }
  | { kind: "set-firewall-rule-action"; ruleId: string };

export type LabOperation =
  | { kind: "help" }
  | { kind: "clear" }
  | { kind: "hostname"; addressesOnly: boolean }
  | { kind: "ipconfig" }
  | { kind: "route-print" }
  | { kind: "renew-dhcp" }
  | { kind: "ip-address" }
  | { kind: "ip-route" }
  | { kind: "show-vlan" }
  | { kind: "show-interfaces" }
  | { kind: "show-switchport" }
  | { kind: "show-mac-address-table" }
  | { kind: "show-ip-interface-brief" }
  | { kind: "show-ip-route" }
  | { kind: "show-firewall" }
  | { kind: "show-dns" }
  | { kind: "show-dhcp" }
  | { kind: "resolver"; tool: "resolvectl" | "resolv-conf" }
  | { kind: "ping"; target: string }
  | { kind: "dns-query"; target: string; tool: "nslookup" | "dig" }
  | { kind: "trace"; target: string; tool: "tracert" | "traceroute" | "tracepath" }
  | { kind: "http"; target: string }
  | { kind: "service-list" }
  | { kind: "service"; verb: "status" | "start" | "stop" | "restart"; service: string }
  | { kind: "show-shares" }
  | { kind: "list-directory"; path: string; tool: "ls" | "stat" }
  | { kind: "chmod"; mode: string; path: string };

export type LabCommandResult = {
  state: SimulatedLabState;
  output: string;
  summary: string;
  mutated: boolean;
  evidence: readonly LabEvidenceType[];
};

export class LabCommandError extends Error {
  readonly code: "unsupported" | "invalid" | "too-long";

  constructor(code: "unsupported" | "invalid" | "too-long") {
    super(code === "too-long" ? "Der Befehl ist zu lang." : code === "invalid" ? "Der Befehl enthält nicht erlaubte Zeichen oder Argumente." : "Befehl wird in diesem Lab nicht unterstützt.");
    this.name = "LabCommandError";
    this.code = code;
  }
}

const commonCommandMatrix: Record<LabDeviceType, readonly string[]> = {
  "windows-client": ["help", "ipconfig", "route-print", "ping", "tracert", "nslookup"],
  "linux-client": ["help", "hostname", "ip-a", "ip-route", "ping", "trace-linux", "resolvectl", "resolv-conf"],
  "linux-server": ["help", "hostname", "ip-a", "ip-route", "ping", "trace-linux", "resolvectl", "resolv-conf"],
  "dns-dhcp-server": ["help", "hostname", "ip-a", "ip-route", "ping", "trace-linux", "resolvectl", "resolv-conf", "systemctl-list"],
  router: ["help", "show-ip-interface-brief", "show-ip-route", "show-interfaces", "ping"],
  switch: ["help", "show-vlan", "show-interfaces", "show-switchport", "show-mac-address-table"],
  firewall: ["help", "show-ip-interface-brief", "show-ip-route", "show-interfaces", "show-firewall", "ping"],
  internet: ["help", "hostname", "ip-a", "ip-route", "ping", "trace-linux"],
};

export function getDeviceCommandCapabilities(
  type: LabDeviceType,
  state: SimulatedDeviceState,
  explicitCommands: readonly string[] = [],
) {
  const conditional = [
    ...(state.services ? ["systemctl-list", "systemctl-status"] : []),
    ...(state.dnsRecords || state.services?.dns ? ["show-dns"] : []),
    ...(state.dhcpOptions || state.services?.dhcp ? ["show-dhcp"] : []),
    ...(state.directories ? ["show-shares"] : []),
  ];
  const normalizedExplicit = explicitCommands.map((command) => command === "trace"
    ? type === "windows-client" ? "tracert" : "trace-linux"
    : command);
  return [...new Set([...commonCommandMatrix[type], ...conditional, ...normalizedExplicit.filter((command) => commandIsCompatible(type, command))])];
}

function commandIsCompatible(type: LabDeviceType, command: string) {
  const windowsOnly = new Set(["ipconfig", "renew-dhcp", "route-print", "nslookup", "tracert"]);
  const linuxOnly = new Set(["hostname", "ip-a", "ip-route", "trace-linux", "resolvectl", "resolv-conf", "dig", "systemctl-list", "systemctl-status", "systemctl-start", "systemctl-stop", "systemctl-restart", "ls", "stat", "chmod", "show-shares", "show-dns", "show-dhcp"]);
  const applianceOnly = new Set(["show-vlan", "show-switchport", "show-mac-address-table", "show-ip-interface-brief", "show-ip-route", "show-interfaces", "show-firewall"]);
  if (type === "windows-client") return !linuxOnly.has(command) && !applianceOnly.has(command);
  if (["linux-client", "linux-server", "dns-dhcp-server", "internet"].includes(type)) return !windowsOnly.has(command) && !applianceOnly.has(command);
  if (type === "router") return ["help", "show-ip-interface-brief", "show-ip-route", "show-interfaces", "ping"].includes(command);
  if (type === "switch") return ["help", "show-vlan", "show-switchport", "show-mac-address-table", "show-interfaces"].includes(command);
  return ["help", "show-ip-interface-brief", "show-ip-route", "show-interfaces", "show-firewall", "ping"].includes(command);
}

export function parseLabCommand(raw: unknown): { normalized: string; operation: LabOperation } {
  if (typeof raw !== "string") throw new LabCommandError("invalid");
  if (raw.length > MAX_LAB_COMMAND_LENGTH) throw new LabCommandError("too-long");
  if (/[\r\n\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(raw) || /[;&|><`$()]/u.test(raw)) throw new LabCommandError("invalid");
  const normalized = raw.trim().replace(/[\t ]+/gu, " ");
  if (!normalized) throw new LabCommandError("invalid");
  const parts = normalized.split(" ");
  const command = parts[0].toLowerCase();
  const option = parts[1]?.toLowerCase();
  if (command === "help" && parts.length === 1) return { normalized: "help", operation: { kind: "help" } };
  if (command === "clear" && parts.length === 1) return { normalized: "clear", operation: { kind: "clear" } };
  if (command === "hostname" && (parts.length === 1 || parts.length === 2 && option === "-i")) return { normalized, operation: { kind: "hostname", addressesOnly: option === "-i" } };
  if (command === "ipconfig" && (parts.length === 1 || parts.length === 2 && option === "/all")) return { normalized, operation: { kind: "ipconfig" } };
  if (command === "ipconfig" && parts.length === 2 && option === "/renew") return { normalized, operation: { kind: "renew-dhcp" } };
  if (command === "route" && parts.length === 2 && option === "print") return { normalized, operation: { kind: "route-print" } };
  if (command === "ip") {
    const ipArguments = parts.slice(1).map((part) => part.toLowerCase());
    const withoutFamily = ipArguments[0] === "-4" ? ipArguments.slice(1) : ipArguments;
    if (["a", "addr", "address"].includes(withoutFamily[0]) && (withoutFamily.length === 1 || withoutFamily.length === 2 && withoutFamily[1] === "show")) {
      return { normalized, operation: { kind: "ip-address" } };
    }
  }
  if (command === "ip" && (parts.length === 2 && option === "route" || parts.length === 3 && option === "route" && parts[2].toLowerCase() === "show")) return { normalized, operation: { kind: "ip-route" } };
  if (command === "show" && parts.length === 2 && option === "vlan") return { normalized, operation: { kind: "show-vlan" } };
  if (command === "show" && parts.length === 2 && option === "interfaces") return { normalized, operation: { kind: "show-interfaces" } };
  if (command === "show" && parts.length === 3 && option === "interfaces" && parts[2].toLowerCase() === "switchport") return { normalized, operation: { kind: "show-switchport" } };
  if (command === "show" && parts.length === 4 && option === "ip" && parts[2].toLowerCase() === "interface" && parts[3].toLowerCase() === "brief") return { normalized, operation: { kind: "show-ip-interface-brief" } };
  if (command === "show" && parts.length === 3 && option === "ip" && parts[2].toLowerCase() === "route") return { normalized, operation: { kind: "show-ip-route" } };
  if (command === "show" && (parts.length === 3 && option === "mac" && parts[2].toLowerCase() === "address-table" || parts.length === 2 && option === "mac-address-table")) return { normalized, operation: { kind: "show-mac-address-table" } };
  if (command === "show" && parts.length === 2 && option === "firewall") return { normalized, operation: { kind: "show-firewall" } };
  if (command === "show" && (parts.length === 2 && option === "dns" || parts.length === 3 && option === "dns" && parts[2].toLowerCase() === "records")) return { normalized, operation: { kind: "show-dns" } };
  if (command === "show" && (parts.length === 2 && option === "dhcp" || parts.length === 3 && option === "dhcp" && parts[2].toLowerCase() === "options")) return { normalized, operation: { kind: "show-dhcp" } };
  if (command === "resolvectl" && (parts.length === 1 || parts.length === 2 && option === "status")) return { normalized, operation: { kind: "resolver", tool: "resolvectl" } };
  if (command === "cat" && parts.length === 2 && parts[1] === "/etc/resolv.conf") return { normalized, operation: { kind: "resolver", tool: "resolv-conf" } };
  if (command === "ping") {
    const targetPart = parts.length === 2 ? parts[1] : parts.length === 4 && ["-n", "-c"].includes(option) && /^[1-9]\d?$/u.test(parts[2]) ? parts[3] : undefined;
    const target = targetPart && normalizeSafeTarget(targetPart);
    if (target) return { normalized, operation: { kind: "ping", target } };
  }
  if ((command === "tracert" || command === "traceroute" || command === "tracepath") && parts.length === 2) {
    const target = normalizeSafeTarget(parts[1]);
    if (target) return { normalized, operation: { kind: "trace", target, tool: command } };
  }
  if ((command === "nslookup" || command === "dig") && (parts.length === 2 || command === "dig" && parts.length === 3 && parts[2].toUpperCase() === "A")) {
    const target = normalizeHostname(parts[1]);
    if (target && isSafeHostname(target)) return { normalized, operation: { kind: "dns-query", target, tool: command } };
  }
  if (command === "curl") {
    const targetPart = parts.length === 2 ? parts[1] : parts.length === 3 && option === "-i" ? parts[2] : undefined;
    if (targetPart && isSafeHttpTarget(targetPart)) return { normalized, operation: { kind: "http", target: targetPart } };
  }
  if (command === "systemctl" && parts.length === 3 && ["status", "is-active", "start", "stop", "restart"].includes(option) && /^[a-z0-9@_.-]{1,72}$/iu.test(parts[2])) {
    const verb = option === "is-active" ? "status" : option as "status" | "start" | "stop" | "restart";
    const service = parts[2].replace(/\.service$/iu, "").toLowerCase();
    if (/^[a-z0-9@_.-]{1,64}$/u.test(service)) return { normalized, operation: { kind: "service", verb, service } };
  }
  if (command === "systemctl" && parts.length >= 2 && option === "list-units" && parts.slice(2).every((part) => ["--type=service", "--all", "--state=running,failed"].includes(part.toLowerCase()))) {
    return { normalized, operation: { kind: "service-list" } };
  }
  if (command === "smbstatus" && parts.length === 2 && option === "--shares") return { normalized, operation: { kind: "show-shares" } };
  if (command === "ls" && option === "-ld" && parts.length === 3 && isSafePath(parts[2])) {
    return { normalized, operation: { kind: "list-directory", path: parts[2], tool: "ls" } };
  }
  if (command === "stat" && parts.length === 2 && isSafePath(parts[1])) {
    return { normalized, operation: { kind: "list-directory", path: parts[1], tool: "stat" } };
  }
  if (command === "chmod" && parts.length === 3 && /^[0-7]{3,4}$/u.test(parts[1]) && isSafePath(parts[2])) {
    return { normalized, operation: { kind: "chmod", mode: normalizeMode(parts[1]), path: parts[2] } };
  }
  throw new LabCommandError("unsupported");
}

export function executeLabOperation(input: {
  state: SimulatedLabState;
  deviceId: string;
  operation: LabOperation;
  supportedCommands: readonly string[];
  dhcpLease?: SimulatedInterface;
  dnsHosts?: readonly SimulatedDnsHost[];
  httpRequiredServices?: readonly string[];
}): LabCommandResult {
  const device = input.state.devices[input.deviceId];
  if (!device) throw new LabCommandError("invalid");
  const operationKey = operationKeyFor(input.operation);
  if (!input.supportedCommands.includes(operationKey)) throw new LabCommandError("unsupported");
  const state = structuredClone(input.state);
  const current = state.devices[input.deviceId];
  if (input.operation.kind === "clear") {
    state.terminalTranscript = [];
    return result(state, "", "Terminalanzeige geleert", false);
  }
  if (input.operation.kind === "help") {
    return result(state, `Unterstützte Befehle:\n${input.supportedCommands.map(getLabCommandHelp).join("\n")}`, "Hilfe angezeigt", false);
  }
  if (input.operation.kind === "hostname") {
    const addresses = deviceInterfaces(current).map((network) => network.address).filter(Boolean).join(" ");
    return result(state, input.operation.addressesOnly ? addresses || "keine IPv4-Adresse" : current.hostname ?? input.deviceId, "Hostname geprüft", false);
  }
  if (input.operation.kind === "ipconfig" || input.operation.kind === "ip-address") {
    const evidence = hasUsableClientConfiguration(current.interface) ? ["client-ip-configuration-confirmed" as const] : [];
    return result(state, formatDeviceInterfaces(current, input.operation.kind === "ipconfig"), "IP-Konfiguration geprüft", false, evidence);
  }
  if (input.operation.kind === "ip-route" || input.operation.kind === "route-print" || input.operation.kind === "show-ip-route") {
    const output = input.operation.kind === "route-print" ? formatWindowsRoutes(current)
      : input.operation.kind === "show-ip-route" ? formatApplianceRoutes(current)
      : formatLinuxRoutes(current);
    return result(state, output, "Routingtabelle geprüft", false);
  }
  if (input.operation.kind === "show-ip-interface-brief") {
    return result(state, formatApplianceInterfaces(current, true), "Schnittstellenübersicht geprüft", false);
  }
  if (input.operation.kind === "show-interfaces" && !current.switchPorts) {
    return result(state, formatApplianceInterfaces(current, false), "Schnittstellen geprüft", false);
  }
  if (input.operation.kind === "show-vlan" || input.operation.kind === "show-switchport" || input.operation.kind === "show-interfaces") {
    if (!current.switchPorts) throw new LabCommandError("unsupported");
    const lines = Object.entries(current.switchPorts).map(([portId, port]) => input.operation.kind === "show-vlan"
      ? `VLAN ${port.vlan}\t${portId}\t${port.connectedDeviceId}`
      : input.operation.kind === "show-switchport"
        ? `${portId}\tMode: access\tAccess VLAN: ${port.vlan}\tVerbunden: ${port.connectedDeviceId}`
        : `${portId} is up, line protocol is up\n  Access-Port, VLAN ${port.vlan}, verbunden mit ${port.connectedDeviceId}`);
    return result(state, lines.join("\n"), input.operation.kind === "show-vlan" ? "VLAN-Zuordnung geprüft" : "Switchports geprüft", false);
  }
  if (input.operation.kind === "show-mac-address-table") {
    if (!current.switchPorts) throw new LabCommandError("unsupported");
    const lines = Object.entries(current.switchPorts).map(([portId, port]) => `${port.vlan}\t${stableMacAddress(port.connectedDeviceId)}\tDYNAMIC\t${portId}`);
    return result(state, `VLAN\tMAC-Adresse\tTyp\tPort\n${lines.join("\n")}`, "MAC-Adresstabelle geprüft", false);
  }
  if (input.operation.kind === "show-firewall") {
    if (!current.firewallRules) throw new LabCommandError("unsupported");
    const lines = Object.entries(current.firewallRules).map(([ruleId, rule]) => (
      `${ruleId}\tQuelle: ${rule.sourceNetwork}\tZiel: ${rule.destinationDeviceId} (${state.devices[rule.destinationDeviceId]?.interface?.address ?? "keine IPv4-Adresse"})\t${rule.protocol.toUpperCase()}/${rule.destinationPort}\t${rule.action.toUpperCase()}`
    ));
    return result(state, lines.join("\n"), "Firewall-Regeln geprüft", false);
  }
  if (input.operation.kind === "show-dns") {
    if (!current.services?.dns && !current.dnsRecords) throw new LabCommandError("unsupported");
    const records = new Map((input.dnsHosts ?? []).map((host) => [normalizeHostname(host.canonicalName), host.address]));
    for (const [hostname, address] of Object.entries(current.dnsRecords ?? {})) records.set(normalizeHostname(hostname), address);
    const lines = [...records].map(([hostname, address]) => `${hostname}.\tA\t${address}`);
    return result(state, `DNS-Dienst: ${current.services?.dns === "running" ? "aktiv" : "inaktiv"}\n${lines.join("\n") || "Keine simulierten A-Einträge."}`, "DNS-Zoneninformationen geprüft", false);
  }
  if (input.operation.kind === "show-dhcp") {
    if (!current.services?.dhcp && !current.dhcpOptions) throw new LabCommandError("unsupported");
    return result(state, [
      `DHCP-Dienst: ${current.services?.dhcp === "running" ? "aktiv" : "inaktiv"}`,
      `Option Router: ${current.dhcpOptions?.gateway ?? "nicht gesetzt"}`,
      `Option DNS-Server: ${current.dhcpOptions?.dnsServer ?? "nicht gesetzt"}`,
    ].join("\n"), "DHCP-Dienst und Optionen geprüft", false);
  }
  if (input.operation.kind === "resolver") {
    const dnsServer = current.interface?.dnsServer;
    const output = input.operation.tool === "resolv-conf"
      ? `# simulated /etc/resolv.conf\n${dnsServer ? `nameserver ${dnsServer}` : "# kein Nameserver konfiguriert"}`
      : `Link ${current.interface?.name ?? "eth0"}\n    Current DNS Server: ${dnsServer ?? "nicht konfiguriert"}`;
    return result(state, output, "Resolverkonfiguration geprüft", false);
  }
  if (input.operation.kind === "renew-dhcp") {
    if (getIpv4Mode(current.interface) !== "dynamic" || !input.dhcpLease) return result(state, "Dynamische IPv4-Konfiguration ist auf diesem Gerät nicht verfügbar.", "DHCP-Erneuerung ohne Erfolg", false);
    const server = Object.values(state.devices).find((candidate) => candidate.services?.dhcp);
    if (server?.services?.dhcp !== "running") return result(state, "DHCP-Anfrage ohne Antwort. Die vorhandene Konfiguration bleibt bestehen.", "DHCP-Erneuerung ohne Antwort", false);
    invalidateEvidence(state);
    current.interface = { ...structuredClone(input.dhcpLease), ...(server.dhcpOptions ?? {}) };
    return result(state, `DHCP-Lease erhalten: ${current.interface.address}/${current.interface.prefixLength}`, "DHCP-Lease erneuert", true, ["dhcp-renew-success", "client-ip-configuration-confirmed"]);
  }
  if (input.operation.kind === "ping") {
    const target = resolveTarget(state, current, input.operation.target, input.dnsHosts ?? []);
    if (!target) return result(state, `Ping-Anforderung konnte Host ${input.operation.target} nicht finden.`, `Ping zu ${input.operation.target} fehlgeschlagen`, false);
    const reachable = canReachAddress(state, current, target, input.dnsHosts?.map((host) => host.address));
    const hostname = !isIpv4(input.operation.target);
    const evidence: LabEvidenceType[] = reachable
      ? [
          ...(hostname ? ["dns-resolution-success", "hostname-reachability-success"] as const : []),
          ...(isPrivateIpv4(target) && target !== current.interface?.address ? ["local-ip-reachability-success"] as const : []),
          ...(!isPrivateIpv4(target) ? ["external-ip-reachability-success"] as const : []),
        ]
      : [];
    const output = reachable
      ? `Antwort von ${target}: Zeit<1ms`
      : hostname
        ? `${input.operation.target} wurde als ${target} aufgelöst.\nZeitüberschreitung der Anforderung für ${target}.`
        : `Zeitüberschreitung der Anforderung für ${target}.`;
    return result(state, output, `Ping zu ${input.operation.target}: ${reachable ? "erreichbar" : "nicht erreichbar"}`, false, evidence);
  }
  if (input.operation.kind === "trace") {
    const target = resolveTarget(state, current, input.operation.target, input.dnsHosts ?? []);
    const gateway = current.interface?.gateway;
    const reachable = Boolean(target && canReachAddress(state, current, target, input.dnsHosts?.map((host) => host.address)));
    const evidence: LabEvidenceType[] = reachable && target && !isPrivateIpv4(target)
      ? ["external-ip-reachability-success", ...(!isIpv4(input.operation.target) ? ["dns-resolution-success", "hostname-reachability-success"] as const : [])]
      : [];
    return result(state, reachable ? `1  ${gateway ?? target}\n2  ${target}` : target && !isIpv4(input.operation.target) ? `${input.operation.target} wurde als ${target} aufgelöst.\n1  ${gateway ?? "*"}\n2  *  Zeitüberschreitung` : `1  ${gateway ?? "*"}\n2  *  Zeitüberschreitung`, `Route zu ${input.operation.target} untersucht`, false, evidence);
  }
  if (input.operation.kind === "dns-query") {
    const answer = resolveDns(state, current, input.operation.target, input.dnsHosts ?? []);
    return result(state, answer ? `Server: ${current.interface?.dnsServer}\nName: ${input.operation.target}\nAddress: ${answer}` : `Server: ${current.interface?.dnsServer ?? "nicht konfiguriert"}\nZeitüberschreitung bei der DNS-Anfrage.`, `DNS-Auflösung für ${input.operation.target}: ${answer ? "erfolgreich" : "fehlgeschlagen"}`, false, answer ? ["dns-resolution-success"] : []);
  }
  if (input.operation.kind === "service") {
    if (!current.services || !(input.operation.service in current.services)) throw new LabCommandError("unsupported");
    if (input.operation.verb !== "status") {
      invalidateEvidence(state);
      current.services[input.operation.service] = input.operation.verb === "stop" ? "stopped" : "running";
    }
    const status = current.services[input.operation.service];
    const listener = current.servicePorts?.[input.operation.service];
    return result(state, `● ${input.operation.service}.service - simulated service\n   Active: ${status === "running" ? "active (running)" : "inactive (dead)"}${listener ? `\n   Listener: ${formatServiceListener(input.operation.service, listener)}` : ""}`, `${input.operation.service}: ${status}`, input.operation.verb !== "status", status === "running" ? ["service-status-running"] : []);
  }
  if (input.operation.kind === "service-list") {
    if (!current.services) throw new LabCommandError("unsupported");
    const lines = Object.entries(current.services).map(([service, status]) => `${service}.service\t${status === "running" ? "loaded active running" : "loaded inactive dead"}${current.servicePorts?.[service] ? `\t${formatServiceListener(service, current.servicePorts[service])}` : ""}`);
    return result(state, `UNIT\tLOAD ACTIVE SUB\n${lines.join("\n")}`, "Dienste aufgelistet", false);
  }
  if (input.operation.kind === "http") {
    const url = new URL(input.operation.target);
    const normalizedHostname = normalizeHostname(url.hostname);
    const target = normalizedHostname === "localhost" ? current.interface?.address : resolveTarget(state, current, normalizedHostname, input.dnsHosts ?? []);
    const targetDevice = target ? findDeviceByAddress(state, target) : undefined;
    const reachable = deviceInterfaces(current).some((network) => network.address === target) || Boolean(target && canReachAddress(state, current, target, input.dnsHosts?.map((host) => host.address)));
    const requiredServices = input.httpRequiredServices ?? ["nginx"];
    const running = Boolean(targetDevice && requiredServices.every((service) => targetDevice.services?.[service] === "running"));
    const frontendService = requiredServices.includes("nginx") ? "nginx" : requiredServices[0];
    const expectedPort = frontendService && targetDevice?.servicePorts?.[frontendService] || 80;
    const requestedPort = url.port ? Number(url.port) : 80;
    const sourceDeviceId = findDeviceId(state, current);
    const targetDeviceId = targetDevice && findDeviceId(state, targetDevice);
    const firewallAllows = Boolean(sourceDeviceId && targetDeviceId && isTcpAllowed(state, sourceDeviceId, targetDeviceId, requestedPort));
    const success = reachable && running && requestedPort === expectedPort && firewallAllows;
    const hostname = normalizedHostname !== "localhost" && !isIpv4(normalizedHostname);
    const remoteSuccess = success && sourceDeviceId !== targetDeviceId;
    return result(state, success ? "HTTP/1.1 200 OK\n\nDer Webserver funktioniert." : target && hostname ? `${url.hostname} wurde als ${target} aufgelöst.\ncurl: (7) Verbindung zum Webserver fehlgeschlagen.` : "curl: (7) Verbindung zum Webserver fehlgeschlagen.", `HTTP-Test: ${success ? "erfolgreich" : "fehlgeschlagen"}`, false, success ? ["http-service-success", ...(remoteSuccess ? ["remote-http-service-success"] as const : []), ...(hostname ? ["dns-resolution-success"] as const : [])] : []);
  }
  if (input.operation.kind === "show-shares") {
    if (!current.directories) throw new LabCommandError("unsupported");
    const lines = Object.entries(current.directories).map(([path, mode]) => `support\t${path}\tModus ${mode}`);
    return result(state, `Freigabe\tPfad\tAktueller Zustand\n${lines.join("\n")}`, "Freigabepfade geprüft", false);
  }
  if (input.operation.kind === "list-directory") {
    const mode = current.directories?.[input.operation.path];
    if (!mode) throw new LabCommandError("unsupported");
    const output = input.operation.tool === "stat"
      ? `  File: ${input.operation.path}\n  Size: 4096\tAccess: (${mode}/${modeToPermissions(mode)})\tUid: (0/root)\tGid: (1001/support)`
      : `${modeToPermissions(mode)} 2 root support 4096 Sep 17 10:00 ${input.operation.path}`;
    return result(state, output, `Rechte für ${input.operation.path} geprüft`, false, ["permission-state-confirmed"]);
  }
  if (input.operation.kind === "chmod") {
    if (!current.directories || !(input.operation.path in current.directories)) throw new LabCommandError("unsupported");
    invalidateEvidence(state);
    current.directories[input.operation.path] = input.operation.mode;
    return result(state, `Modus für ${input.operation.path} auf ${input.operation.mode} gesetzt.`, `Verzeichnismodus auf ${input.operation.mode} gesetzt`, true);
  }
  throw new LabCommandError("unsupported");
}

export function appendLabTerminalEntry(state: SimulatedLabState, entry: LabTerminalEntry) {
  if (!isSafeDeviceId(entry.deviceId) || !(entry.deviceId in state.devices)
    || entry.command.length < 1 || entry.command.length > MAX_LAB_COMMAND_LENGTH
    || entry.output.length > MAX_LAB_TERMINAL_OUTPUT_LENGTH) throw new LabCommandError("invalid");
  const next = structuredClone(state);
  next.terminalTranscript = [...(next.terminalTranscript ?? []), structuredClone(entry)].slice(-MAX_LAB_TERMINAL_ENTRIES);
  return next;
}

export function applyLabConfiguration(input: {
  state: SimulatedLabState;
  deviceId: string;
  action: LabConfigurationAction;
  allowedControls: readonly LabControlRule[];
  dhcpLease?: SimulatedInterface;
}) {
  if (input.action.kind === "set-network-configuration") validateNetworkPatch(input.action.patch, input.allowedControls);
  else if (!input.allowedControls.some((control) => controlAllowsAction(control, input.action))) throw new LabCommandError("unsupported");
  const state = structuredClone(input.state);
  const device = state.devices[input.deviceId];
  if (!device) throw new LabCommandError("invalid");
  const action = input.action;
  if (action.kind === "set-network-configuration") {
    if (!device.interface) throw new LabCommandError("invalid");
    invalidateEvidence(state);
    const changed: string[] = [];
    if (action.patch.ipv4Address !== undefined) { device.interface.address = action.patch.ipv4Address; changed.push("IPv4-Adresse"); }
    if (action.patch.prefixLength !== undefined) { device.interface.prefixLength = action.patch.prefixLength; changed.push("Präfixlänge"); }
    if (action.patch.gateway !== undefined) { device.interface.gateway = action.patch.gateway; changed.push("Standardgateway"); }
    if (action.patch.dnsServer !== undefined) { device.interface.dnsServer = action.patch.dnsServer; changed.push("DNS-Server"); }
    return { state, summary: `Netzwerkkonfiguration geändert: ${changed.join(", ")}` };
  }
  if (action.kind === "set-dns-server" || action.kind === "set-default-gateway" || action.kind === "set-ipv4-address") {
    if (!device.interface || !isIpv4(action.value)) throw new LabCommandError("invalid");
    invalidateEvidence(state);
    if (action.kind === "set-dns-server") device.interface.dnsServer = action.value;
    else if (action.kind === "set-default-gateway") device.interface.gateway = action.value;
    else device.interface.address = action.value;
    const label = action.kind === "set-dns-server" ? "DNS-Server" : action.kind === "set-default-gateway" ? "Standardgateway" : "IPv4-Adresse";
    return { state, summary: `${label} auf ${action.value} gesetzt` };
  }
  if (action.kind === "set-prefix-length") {
    if (!device.interface || !Number.isInteger(action.value) || action.value < 0 || action.value > 32) throw new LabCommandError("invalid");
    invalidateEvidence(state);
    device.interface.prefixLength = action.value;
    return { state, summary: `Präfixlänge auf /${action.value} gesetzt` };
  }
  if (action.kind === "renew-dhcp") {
    return executeLabOperation({ state, deviceId: input.deviceId, operation: { kind: "renew-dhcp" }, supportedCommands: ["renew-dhcp"], dhcpLease: input.dhcpLease });
  }
  if (action.kind === "set-service-state") {
    if (!device.services || !(action.service in device.services)) throw new LabCommandError("invalid");
    invalidateEvidence(state);
    device.services[action.service] = action.state;
    return { state, summary: `${action.service}: ${action.state}` };
  }
  if (action.kind === "set-file-mode") {
    if (!device.directories || !(action.path in device.directories) || !/^[0-7]{4}$/u.test(action.mode)) throw new LabCommandError("invalid");
    invalidateEvidence(state);
    device.directories[action.path] = action.mode;
    return { state, summary: `Verzeichnismodus auf ${action.mode} gesetzt` };
  }
  if (action.kind === "set-dns-record") {
    const hostname = normalizeHostname(action.hostname);
    if (!hostname || !device.dnsRecords || !(hostname in device.dnsRecords) || !isIpv4(action.address)) throw new LabCommandError("invalid");
    invalidateEvidence(state);
    device.dnsRecords[hostname] = action.address;
    return { state, summary: `DNS-Eintrag ${hostname} auf ${action.address} gesetzt` };
  }
  if (action.kind === "set-dhcp-option") {
    if (!device.dhcpOptions || !(action.option in device.dhcpOptions) || !isIpv4(action.value)) throw new LabCommandError("invalid");
    invalidateEvidence(state);
    device.dhcpOptions[action.option] = action.value;
    return { state, summary: `DHCP-Option ${action.option === "gateway" ? "Gateway" : "DNS-Server"} auf ${action.value} gesetzt` };
  }
  if (action.kind === "set-service-port") {
    if (!device.servicePorts || !(action.service in device.servicePorts) || !Number.isInteger(action.port) || action.port < 1 || action.port > 65535) throw new LabCommandError("invalid");
    invalidateEvidence(state);
    device.servicePorts[action.service] = action.port;
    return { state, summary: `${action.service}-Port auf ${action.port} gesetzt` };
  }
  if (action.kind === "set-access-vlan") {
    if (!device.switchPorts || !(action.portId in device.switchPorts) || !Number.isInteger(action.vlan) || action.vlan < 1 || action.vlan > 4094) throw new LabCommandError("invalid");
    invalidateEvidence(state);
    device.switchPorts[action.portId].vlan = action.vlan;
    return { state, summary: `${action.portId} auf Access-VLAN ${action.vlan} gesetzt` };
  }
  if (action.kind === "set-firewall-rule-action") {
    if (!device.firewallRules || !(action.ruleId in device.firewallRules) || (action.action !== "allow" && action.action !== "deny")) throw new LabCommandError("invalid");
    invalidateEvidence(state);
    device.firewallRules[action.ruleId].action = action.action;
    return { state, summary: `Firewall-Regel ${action.ruleId} auf ${action.action.toUpperCase()} gesetzt` };
  }
  throw new LabCommandError("invalid");
}

export function canReachAddress(state: SimulatedLabState, source: SimulatedDeviceState, target: string, modeledEndpointAddresses: readonly string[] = []) {
  if (!isIpv4(target)) return false;
  const targetDevice = findDeviceByAddress(state, target);
  const targetIsModeled = Boolean(targetDevice || modeledEndpointAddresses.includes(target));
  if (!targetIsModeled) return false;
  const sourceInterface = deviceInterfaces(source).find((network) => network.address && network.prefixLength !== null && sameSubnet(network.address, target, network.prefixLength));
  if (sourceInterface) return targetDevice ? hasCompatibleAccessVlan(state, source, targetDevice) : true;
  const gatewayInterface = deviceInterfaces(source).find((network) => network.address && network.prefixLength !== null && network.gateway && sameSubnet(network.address, network.gateway, network.prefixLength));
  if (!gatewayInterface?.gateway) return false;
  const gateway = findDeviceByAddress(state, gatewayInterface.gateway);
  return Boolean(gateway && hasCompatibleAccessVlan(state, source, gateway) && canDeviceRouteTo(gateway, target));
}

function canDeviceRouteTo(device: SimulatedDeviceState, target: string) {
  if (deviceInterfaces(device).some((network) => network.address && network.prefixLength !== null && sameSubnet(network.address, target, network.prefixLength))) return true;
  if (device.routes?.some((route) => route.destination === "default" || isAddressInCidr(target, route.destination))) return true;
  // Active attempts created with the previous state shape retain the original routing marker.
  return device.routesExternal === true && !isPrivateIpv4(target);
}

export function isIpv4(value: string) {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^(0|[1-9]\d{0,2})$/u.test(part) && Number(part) <= 255);
}

function isIpv4Cidr(value: string) {
  const [address, prefix, ...rest] = value.split("/");
  return rest.length === 0 && isIpv4(address) && /^\d{1,2}$/u.test(prefix) && Number(prefix) >= 0 && Number(prefix) <= 32;
}

function isAddressInCidr(address: string, cidr: string) {
  const [network, prefixText] = cidr.split("/");
  const prefix = Number(prefixText);
  return isIpv4(address) && isIpv4(network) && Number.isInteger(prefix) && prefix >= 0 && prefix <= 32
    && (ipv4Number(address) & prefixMask(prefix)) === (ipv4Number(network) & prefixMask(prefix));
}

function resolveDns(state: SimulatedLabState, source: SimulatedDeviceState, hostname: string, hosts: readonly SimulatedDnsHost[]) {
  const resolver = source.interface?.dnsServer;
  if (!resolver || !canReachAddress(state, source, resolver)) return undefined;
  const resolverDevice = findDeviceByAddress(state, resolver);
  if (resolverDevice?.services?.dns !== "running") return undefined;
  const normalized = normalizeHostname(hostname);
  const host = hosts.find((candidate) => (
    normalizeHostname(candidate.canonicalName) === normalized
      || candidate.aliases?.some((alias) => normalizeHostname(alias) === normalized)
  ));
  if (!host) return undefined;
  return resolverDevice.dnsRecords?.[normalizeHostname(host.canonicalName)] ?? host.address;
}

function resolveTarget(state: SimulatedLabState, source: SimulatedDeviceState, target: string, hosts: readonly SimulatedDnsHost[]) {
  return isIpv4(target) ? target : resolveDns(state, source, target, hosts);
}

function findDeviceByAddress(state: SimulatedLabState, address: string) {
  return Object.values(state.devices).find((device) => deviceInterfaces(device).some((network) => network.address === address));
}

function findDeviceId(state: SimulatedLabState, device: SimulatedDeviceState) {
  return Object.entries(state.devices).find(([, candidate]) => candidate === device)?.[0];
}

function hasCompatibleAccessVlan(state: SimulatedLabState, source: SimulatedDeviceState, target: SimulatedDeviceState) {
  if (source === target) return true;
  const sourceId = findDeviceId(state, source);
  const targetId = findDeviceId(state, target);
  if (!sourceId || !targetId) return false;
  const sourceMembership = findAccessMembership(state, sourceId);
  const targetMembership = findAccessMembership(state, targetId);
  if (!sourceMembership && !targetMembership) return true;
  return Boolean(sourceMembership && targetMembership
    && sourceMembership.switchId === targetMembership.switchId
    && sourceMembership.vlan === targetMembership.vlan);
}

function findAccessMembership(state: SimulatedLabState, deviceId: string) {
  for (const [switchId, device] of Object.entries(state.devices)) {
    for (const port of Object.values(device.switchPorts ?? {})) {
      if (port.connectedDeviceId === deviceId) return { switchId, vlan: port.vlan };
    }
  }
  return undefined;
}

function isTcpAllowed(state: SimulatedLabState, sourceDeviceId: string, destinationDeviceId: string, destinationPort: number) {
  if (sourceDeviceId === destinationDeviceId) return true;
  const sourceAddress = state.devices[sourceDeviceId]?.interface?.address;
  const matchingRules = Object.values(state.devices)
    .flatMap((device) => Object.values(device.firewallRules ?? {}))
    .filter((rule) => (
      rule.destinationDeviceId === destinationDeviceId
      && rule.protocol === "tcp"
      && rule.destinationPort === destinationPort
      && (rule.sourceNetwork === "any" || Boolean(sourceAddress && isAddressInCidr(sourceAddress, rule.sourceNetwork)))
    ));
  return matchingRules.length === 0 || matchingRules.every((rule) => rule.action === "allow");
}

function sameSubnet(left: string, right: string, prefix: number) {
  if (!isIpv4(left) || !isIpv4(right) || prefix < 0 || prefix > 32) return false;
  const mask = prefixMask(prefix);
  return (ipv4Number(left) & mask) === (ipv4Number(right) & mask);
}

function prefixMask(prefix: number) {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

function ipv4Number(value: string) {
  return value.split(".").reduce((total, part) => ((total << 8) | Number(part)) >>> 0, 0);
}

function isPrivateIpv4(value: string) {
  const [first, second] = value.split(".").map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168) || first === 169 || first === 127;
}

function normalizeSafeTarget(value: string) {
  if (isIpv4(value)) return value;
  const hostname = normalizeHostname(value);
  return isSafeHostname(hostname) ? hostname : undefined;
}

function isSafeHostname(value: string) {
  const normalized = normalizeHostname(value);
  return normalized.length <= 253 && normalized.split(".").every((label) => label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/iu.test(label));
}

export function normalizeHostname(value: string) {
  const trimmed = value.trim();
  return (trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed).toLowerCase();
}

function isSafeHttpTarget(value: string) {
  if (!/^http:\/\//iu.test(value) || /[?#]/u.test(value)) return false;
  try {
    const url = new URL(value);
    const hostname = normalizeHostname(url.hostname);
    return url.protocol === "http:"
      && !url.username && !url.password
      && Boolean(isIpv4(hostname) || isSafeHostname(hostname))
      && (!url.port || Number(url.port) >= 1 && Number(url.port) <= 65535)
      && /^\/[a-z0-9._~/-]*$/iu.test(url.pathname);
  } catch {
    return false;
  }
}

function isSafePath(value: string) {
  return /^\/(?:[a-z0-9._-]+\/)*[a-z0-9._-]+$/iu.test(value) && !value.includes("..");
}

function isSafeDeviceId(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
}

function isSafeConfigurationId(value: string) {
  return /^[a-z0-9][a-z0-9/_.-]{0,63}$/iu.test(value);
}

function isSafeInterfaceName(value: string) {
  return /^[a-z0-9][a-z0-9/_.-]{0,63}$/iu.test(value);
}

function normalizeMode(value: string) {
  return value.padStart(4, "0");
}

function operationKeyFor(operation: LabOperation) {
  if (operation.kind === "dns-query") return operation.tool;
  if (operation.kind === "trace") return operation.tool === "tracert" ? "tracert" : "trace-linux";
  if (operation.kind === "resolver") return operation.tool;
  if (operation.kind === "service-list") return "systemctl-list";
  if (operation.kind === "service") return `systemctl-${operation.verb}`;
  if (operation.kind === "list-directory") return operation.tool;
  if (operation.kind === "ip-address") return "ip-a";
  if (operation.kind === "ip-route") return "ip-route";
  return operation.kind;
}

export function getLabCommandHelp(command: string) {
  const labels: Record<string, string> = {
    help: "help – verfügbare simulierte Werkzeuge anzeigen",
    clear: "clear – nur die sichtbare Terminalanzeige leeren",
    hostname: "hostname | hostname -I – Gerätenamen oder IPv4-Adressen anzeigen",
    ipconfig: "ipconfig [/all] – Windows-IP-Konfiguration prüfen",
    "route-print": "route print – Windows-IPv4-Routingtabelle prüfen",
    "renew-dhcp": "ipconfig /renew – DHCP-Lease erneut anfordern",
    "ip-a": "ip a – Linux-IP-Adressen prüfen",
    "ip-route": "ip route – Linux-Routingtabelle prüfen",
    resolvectl: "resolvectl [status] – Linux-Resolverkonfiguration prüfen",
    "resolv-conf": "cat /etc/resolv.conf – simulierte Resolverdatei lesen",
    "show-vlan": "show vlan – simulierte Access-VLAN-Zuordnungen prüfen",
    "show-interfaces": "show interfaces – Schnittstellenzustand prüfen",
    "show-switchport": "show interfaces switchport – simulierte Access-Ports prüfen",
    "show-mac-address-table": "show mac address-table – gelernte MAC-/Port-Zuordnungen prüfen",
    "show-ip-interface-brief": "show ip interface brief – IPv4-Schnittstellenübersicht prüfen",
    "show-ip-route": "show ip route – Routingtabelle des Netzwerkgeräts prüfen",
    "show-firewall": "show firewall – simulierte TCP-Filterregeln prüfen",
    "show-dns": "show dns [records] – DNS-Dienst und simulierte A-Einträge prüfen",
    "show-dhcp": "show dhcp [options] – DHCP-Dienst und Bereichsoptionen prüfen",
    ping: "ping <Ziel> – Erreichbarkeit prüfen",
    nslookup: "nslookup <Name> – DNS-Auflösung prüfen",
    dig: "dig <Name> [A] – DNS-Antwort prüfen",
    tracert: "tracert <Ziel> – simulierten Windows-Pfad prüfen",
    "trace-linux": "traceroute|tracepath <Ziel> – simulierten Linux-Pfad prüfen",
    http: "curl [-I] http://<Ziel> – HTTP-Dienst prüfen",
    "systemctl-list": "systemctl list-units --type=service – bekannte Dienste auflisten",
    "systemctl-status": "systemctl status <Dienst> – Dienststatus prüfen",
    "systemctl-start": "systemctl start <Dienst> – Dienst starten",
    "systemctl-stop": "systemctl stop <Dienst> – Dienst stoppen",
    "systemctl-restart": "systemctl restart <Dienst> – Dienst neu starten",
    "show-shares": "smbstatus --shares – simulierte Freigaben und Pfade anzeigen",
    ls: "ls -ld <Pfad> – Verzeichnisrechte prüfen",
    stat: "stat <Pfad> – Dateistatus und Modus prüfen",
    chmod: "chmod <Modus> <Pfad> – Verzeichnismodus ändern",
  };
  return labels[command] ?? command;
}

export function getIpv4Mode(network: SimulatedInterface | undefined): "static" | "dynamic" {
  return network?.ipv4Mode ?? (network?.dhcpEnabled ? "dynamic" : "static");
}

export function getSimulatedDeviceInterfaces(device: SimulatedDeviceState) {
  const interfaces: SimulatedInterface[] = [];
  if (device.interface) interfaces.push(device.interface);
  for (const [name, network] of Object.entries(device.additionalInterfaces ?? {})) interfaces.push(network.name ? network : { ...network, name });
  return interfaces;
}

function deviceInterfaces(device: SimulatedDeviceState) {
  return getSimulatedDeviceInterfaces(device);
}

function formatDeviceInterfaces(device: SimulatedDeviceState, windows: boolean) {
  const interfaces = deviceInterfaces(device);
  if (interfaces.length === 0) return "Keine Netzwerkschnittstelle vorhanden.";
  if (windows) return [
    `Windows-IP-Konfiguration\n   Hostname  . . . . . . . . . . : ${device.hostname ?? "nicht gesetzt"}`,
    ...interfaces.map((network) => [
      `Ethernet-Adapter ${network.name ?? "Ethernet"}:`,
      `   IPv4-Konfiguration  . . . . : ${getIpv4Mode(network) === "dynamic" ? "dynamisch" : "statisch"}`,
      `   IPv4-Adresse  . . . . . . . : ${network.address ?? "nicht konfiguriert"}`,
      `   Subnetzmaske  . . . . . . . : ${network.prefixLength === null ? "-" : prefixToNetmask(network.prefixLength)}`,
      `   Präfixlänge . . . . . . . . : ${network.prefixLength ?? "-"}`,
      `   Standardgateway . . . . . . : ${network.gateway ?? "nicht konfiguriert"}`,
      `   DNS-Server  . . . . . . . . : ${network.dnsServer ?? "nicht konfiguriert"}`,
    ].join("\n")),
  ].join("\n\n");
  return interfaces.map((network, index) => [
    `${index + 2}: ${network.name ?? "eth0"}: <BROADCAST,MULTICAST,UP,LOWER_UP>`,
    `    inet ${network.address ?? "nicht konfiguriert"}${network.prefixLength === null ? "" : `/${network.prefixLength}`} scope global${getIpv4Mode(network) === "dynamic" ? " dynamic" : ""} ${network.name ?? "eth0"}`,
    `    IPv4-Konfiguration: ${getIpv4Mode(network) === "dynamic" ? "dynamisch" : "statisch"}`,
  ].join("\n")).join("\n");
}

function formatLinuxRoutes(device: SimulatedDeviceState) {
  const lines = routeLines(device, "linux");
  return lines.length > 0 ? lines.join("\n") : "Keine IPv4-Routen konfiguriert.";
}

function formatWindowsRoutes(device: SimulatedDeviceState) {
  const primary = device.interface;
  const connected = primary?.address && primary.prefixLength !== null
    ? `${subnetText(primary)}\t${prefixToNetmask(primary.prefixLength)}\tAuf Verbindung\t${primary.address}`
    : "";
  const defaultRoute = primary?.gateway && primary.address
    ? `0.0.0.0/0\t0.0.0.0\t${primary.gateway}\t${primary.address}`
    : "";
  return `IPv4-Routentabelle\nNetzwerkziel\tNetzmaske\tGateway\tSchnittstelle\n${[defaultRoute, connected].filter(Boolean).join("\n") || "Keine IPv4-Routen konfiguriert."}`;
}

function formatApplianceRoutes(device: SimulatedDeviceState) {
  const lines = routeLines(device, "appliance");
  return `${device.hostname ?? "Netzwerkgerät"} · IPv4-Routingtabelle\n${lines.join("\n") || "Keine IPv4-Routen konfiguriert."}`;
}

function routeLines(device: SimulatedDeviceState, format: "linux" | "appliance") {
  const connected = deviceInterfaces(device).flatMap((network) => network.address && network.prefixLength !== null
    ? [format === "linux" ? `${subnetText(network)} dev ${network.name ?? "eth0"} proto kernel scope link src ${network.address}` : `C ${subnetText(network)} is directly connected, ${network.name ?? "interface"}`]
    : []);
  const primaryDefault = device.interface?.gateway
    ? [format === "linux" ? `default via ${device.interface.gateway} dev ${device.interface.name ?? "eth0"}` : `S* 0.0.0.0/0 via ${device.interface.gateway}, ${device.interface.name ?? "interface"}`]
    : [];
  const explicit = (device.routes ?? []).map((route) => format === "linux"
    ? `${route.destination === "default" ? "default" : route.destination}${route.via ? ` via ${route.via}` : ""} dev ${route.interfaceName}`
    : `S${route.destination === "default" ? "* 0.0.0.0/0" : ` ${route.destination}`}${route.via ? ` via ${route.via}` : ""}, ${route.interfaceName}`);
  return [...primaryDefault, ...connected, ...explicit];
}

function formatApplianceInterfaces(device: SimulatedDeviceState, brief: boolean) {
  const lines = deviceInterfaces(device).map((network) => brief
    ? `${network.name ?? "interface"}\t${network.address ?? "unassigned"}${network.prefixLength === null ? "" : `/${network.prefixLength}`}\tup\tup`
    : `${network.name ?? "interface"} is up, line protocol is up\n  IPv4 address ${network.address ?? "unassigned"}${network.prefixLength === null ? "" : `/${network.prefixLength}`}\n  IPv4-Konfiguration: ${getIpv4Mode(network) === "dynamic" ? "dynamisch" : "statisch"}`);
  return `${device.hostname ?? "Netzwerkgerät"}\n${brief ? "Interface\tIPv4-Adresse\tStatus\tProtocol\n" : ""}${lines.join("\n") || "Keine Schnittstellen konfiguriert."}`;
}

function prefixToNetmask(prefix: number) {
  const mask = prefixMask(prefix);
  return [24, 16, 8, 0].map((shift) => (mask >>> shift) & 255).join(".");
}

function stableMacAddress(deviceId: string) {
  let hash = 0;
  for (const character of deviceId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const bytes = [0x02, 0x00, (hash >>> 24) & 255, (hash >>> 16) & 255, (hash >>> 8) & 255, hash & 255];
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(":").toUpperCase();
}

function formatServiceListener(service: string, port: number) {
  if (service === "dns") return `UDP/TCP ${port}`;
  if (service === "dhcp") return `UDP/${port}`;
  return `TCP/${port}`;
}

function subnetText(network: SimulatedInterface | undefined) {
  if (!network?.address || network.prefixLength === null) return "kein verbundenes IPv4-Netz";
  const networkNumber = (ipv4Number(network.address) & prefixMask(network.prefixLength)) >>> 0;
  const address = [24, 16, 8, 0].map((shift) => (networkNumber >>> shift) & 255).join(".");
  return `${address}/${network.prefixLength}`;
}

function modeToPermissions(mode: string) {
  const normalized = normalizeMode(mode);
  const special = Number(normalized[0]);
  const triples = normalized.slice(1).split("").map((digit) => {
    const value = Number(digit);
    return `${value & 4 ? "r" : "-"}${value & 2 ? "w" : "-"}${value & 1 ? "x" : "-"}`;
  });
  if (special & 2) triples[1] = `${triples[1].slice(0, 2)}${triples[1][2] === "x" ? "s" : "S"}`;
  return `d${triples.join("")}`;
}

function controlAllowsAction(control: LabControlRule, action: LabConfigurationAction) {
  if (control.kind !== action.kind) return false;
  if (control.kind === "set-service-state" && action.kind === "set-service-state") return control.service === action.service;
  if (control.kind === "set-file-mode" && action.kind === "set-file-mode") return control.path === action.path;
  if (control.kind === "set-dns-record" && action.kind === "set-dns-record") return normalizeHostname(control.hostname) === normalizeHostname(action.hostname);
  if (control.kind === "set-dhcp-option" && action.kind === "set-dhcp-option") return control.option === action.option;
  if (control.kind === "set-service-port" && action.kind === "set-service-port") return control.service === action.service;
  if (control.kind === "set-access-vlan" && action.kind === "set-access-vlan") return control.portId === action.portId;
  if (control.kind === "set-firewall-rule-action" && action.kind === "set-firewall-rule-action") return control.ruleId === action.ruleId;
  return true;
}

function validateNetworkPatch(patch: Extract<LabConfigurationAction, { kind: "set-network-configuration" }>["patch"], controls: readonly LabControlRule[]) {
  if (!isRecord(patch)) throw new LabCommandError("invalid");
  const entries = Object.entries(patch);
  if (entries.length === 0) throw new LabCommandError("invalid");
  const requiredControl: Record<string, LabControlRule["kind"]> = {
    ipv4Address: "set-ipv4-address",
    prefixLength: "set-prefix-length",
    gateway: "set-default-gateway",
    dnsServer: "set-dns-server",
  };
  for (const [field, value] of entries) {
    const controlKind = requiredControl[field];
    if (!controlKind || !controls.some((control) => control.kind === controlKind)) throw new LabCommandError("unsupported");
    if (field === "prefixLength") {
      if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 32) throw new LabCommandError("invalid");
    } else if (typeof value !== "string" || !isIpv4(value)) throw new LabCommandError("invalid");
  }
}

function result(state: SimulatedLabState, output: string, summary: string, mutated: boolean, evidence: readonly LabEvidenceType[] = []): LabCommandResult {
  if (evidence.length > 0) state.verificationEvidence = [...new Set([...(state.verificationEvidence ?? []), ...evidence])];
  return { state, output, summary, mutated, evidence };
}

function invalidateEvidence(state: SimulatedLabState) {
  state.verificationEvidence = [];
}

function hasUsableClientConfiguration(network: SimulatedInterface | undefined) {
  return Boolean(network?.address && !network.address.startsWith("169.254.") && network.prefixLength !== null && network.gateway && network.dnsServer);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
