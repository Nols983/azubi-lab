import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LAB_TUTORIAL_TOTAL_STEPS, evaluateLabUnlock, projectTutorialGuidance, type LabConfigurationAction, type LabHistoryItem } from "../src/app/lib/interactive-lab.ts";
import {
  appendLabTerminalEntry,
  applyLabConfiguration,
  canReachAddress,
  executeLabOperation,
  getDeviceCommandCapabilities,
  getIpv4Mode,
  getSimulatedDeviceInterfaces,
  isSimulatedLabState,
  LabCommandError,
  MAX_LAB_COMMAND_LENGTH,
  parseLabCommand,
  type SimulatedLabState,
} from "../src/app/lib/lab-engine.ts";
import { buildLabTopologyLayout, getLabDeviceTypeLabel, getLabDeviceVisual } from "../src/app/lib/lab-workspace-model.ts";
import {
  cloneInitialLabState,
  findCurrentLabDefinition,
  hydrateCompatibleLabState,
  isLabComplete,
  listCurrentLabDefinitions,
  type ServerLabDefinition,
} from "../src/app/lib/server/lab-definitions.ts";

test("unlock rules support level, modules, completed labs, and explicit staff bypass", () => {
  const base = { level: 1, completedModuleIds: new Set<string>(), completedLabIds: new Set<string>(), bypass: false };
  assert.equal(evaluateLabUnlock({}, base).unlocked, true);
  assert.equal(evaluateLabUnlock({ minLevel: 2 }, base).unlocked, false);
  assert.equal(evaluateLabUnlock({ minLevel: 2 }, { ...base, level: 2 }).unlocked, true);
  assert.equal(evaluateLabUnlock({ requiredModuleIds: ["dhcp"] }, base).unlocked, false);
  assert.equal(evaluateLabUnlock({ requiredModuleIds: ["dhcp"] }, { ...base, completedModuleIds: new Set(["dhcp"]) }).unlocked, true);
  assert.equal(evaluateLabUnlock({ minLevel: 4, requiredModuleIds: ["webserver-grundlagen"] }, { ...base, level: 4 }).unlocked, false);
  assert.equal(evaluateLabUnlock({ minLevel: 4, requiredModuleIds: ["webserver-grundlagen"] }, { ...base, level: 4, completedModuleIds: new Set(["webserver-grundlagen"]) }).unlocked, true);
  assert.equal(evaluateLabUnlock({ requiredLabCompletions: ["tutorial-lab-001"] }, base).unlocked, false);
  assert.equal(evaluateLabUnlock({ requiredLabCompletions: ["tutorial-lab-001"] }, { ...base, completedLabIds: new Set(["tutorial-lab-001"]) }).unlocked, true);
  assert.equal(evaluateLabUnlock({ minLevel: 99, requiredModuleIds: ["dns"] }, { ...base, bypass: true }).unlocked, true);
});

test("generic access VLAN membership gates same-subnet reachability", () => {
  const state: SimulatedLabState = { devices: {
    client: { interface: { address: "192.168.70.10", prefixLength: 24, gateway: null, dnsServer: null, dhcpEnabled: false } },
    server: { interface: { address: "192.168.70.20", prefixLength: 24, gateway: null, dnsServer: null, dhcpEnabled: false } },
    switch: { switchPorts: {
      "gi0/1": { mode: "access", vlan: 20, connectedDeviceId: "client" },
      "gi0/2": { mode: "access", vlan: 10, connectedDeviceId: "server" },
    } },
  }, verificationEvidence: [] };
  assert.equal(isSimulatedLabState(state), true);
  assert.equal(canReachAddress(state, state.devices.client, "192.168.70.20"), false);
  const repaired = applyLabConfiguration({ state, deviceId: "switch", action: { kind: "set-access-vlan", portId: "gi0/1", vlan: 10 }, allowedControls: [{ kind: "set-access-vlan", portId: "gi0/1" }] }).state;
  assert.equal(canReachAddress(repaired, repaired.devices.client, "192.168.70.20"), true);
  assert.throws(() => applyLabConfiguration({ state, deviceId: "switch", action: { kind: "set-access-vlan", portId: "gi0/2", vlan: 20 }, allowedControls: [{ kind: "set-access-vlan", portId: "gi0/1" }] }), LabCommandError);
});

test("generic firewall rules filter TCP without changing ping reachability", () => {
  let state: SimulatedLabState = { devices: {
    client: { interface: { address: "192.168.71.10", prefixLength: 24, gateway: null, dnsServer: null, dhcpEnabled: false } },
    web: { interface: { address: "192.168.71.20", prefixLength: 24, gateway: null, dnsServer: null, dhcpEnabled: false }, services: { nginx: "running" }, servicePorts: { nginx: 80 } },
    firewall: { firewallRules: {
      "client-http": { sourceNetwork: "192.168.71.0/24", destinationDeviceId: "web", protocol: "tcp", destinationPort: 80, action: "deny" },
    } },
  }, verificationEvidence: [] };
  assert.equal(isSimulatedLabState(state), true);
  const ping = executeLabOperation({ state, deviceId: "client", operation: { kind: "ping", target: "192.168.71.20" }, supportedCommands: ["ping"] });
  assert.match(ping.output, /Antwort/);
  const blocked = executeLabOperation({ state, deviceId: "client", operation: { kind: "http", target: "http://192.168.71.20" }, supportedCommands: ["http"] });
  assert.match(blocked.output, /fehlgeschlagen/);
  assert.deepEqual(blocked.evidence, []);
  state = applyLabConfiguration({ state, deviceId: "firewall", action: { kind: "set-firewall-rule-action", ruleId: "client-http", action: "allow" }, allowedControls: [{ kind: "set-firewall-rule-action", ruleId: "client-http" }] }).state;
  const allowed = executeLabOperation({ state, deviceId: "client", operation: { kind: "http", target: "http://192.168.71.20" }, supportedCommands: ["http"] });
  assert.match(allowed.output, /200 OK/);
  assert.ok(allowed.evidence.includes("remote-http-service-success"));
});

test("network configuration patches are partial, atomic, allowlisted and invalidate stale evidence", () => {
  const state: SimulatedLabState = {
    devices: { client: { interface: { address: "192.168.10.25", prefixLength: 24, gateway: "192.168.10.254", dnsServer: "192.168.10.253", dhcpEnabled: false } } },
    verificationEvidence: ["external-ip-reachability-success"],
  };
  const allNetworkControls = [
    { kind: "set-ipv4-address" },
    { kind: "set-prefix-length" },
    { kind: "set-default-gateway" },
    { kind: "set-dns-server" },
  ] as const;

  const gatewayOnly = applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-network-configuration", patch: { gateway: "192.168.10.1" } }, allowedControls: allNetworkControls }).state;
  assert.deepEqual(gatewayOnly.devices.client.interface, { address: "192.168.10.25", prefixLength: 24, gateway: "192.168.10.1", dnsServer: "192.168.10.253", dhcpEnabled: false });
  assert.deepEqual(gatewayOnly.verificationEvidence, []);
  assert.equal(state.devices.client.interface?.gateway, "192.168.10.254", "the input state remains untouched");

  const dnsOnly = applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-network-configuration", patch: { dnsServer: "192.168.10.53" } }, allowedControls: allNetworkControls }).state;
  assert.equal(dnsOnly.devices.client.interface?.dnsServer, "192.168.10.53");
  assert.equal(dnsOnly.devices.client.interface?.gateway, "192.168.10.254");

  const addressAndPrefix = applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-network-configuration", patch: { ipv4Address: "192.168.20.25", prefixLength: 25 } }, allowedControls: allNetworkControls }).state;
  assert.equal(addressAndPrefix.devices.client.interface?.address, "192.168.20.25");
  assert.equal(addressAndPrefix.devices.client.interface?.prefixLength, 25);
  assert.equal(addressAndPrefix.devices.client.interface?.gateway, "192.168.10.254");

  const full = applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-network-configuration", patch: { ipv4Address: "10.0.0.20", prefixLength: 24, gateway: "10.0.0.1", dnsServer: "10.0.0.53" } }, allowedControls: allNetworkControls }).state;
  assert.deepEqual(full.devices.client.interface, { address: "10.0.0.20", prefixLength: 24, gateway: "10.0.0.1", dnsServer: "10.0.0.53", dhcpEnabled: false });

  assert.throws(() => applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-network-configuration", patch: {} }, allowedControls: allNetworkControls }), LabCommandError);
  assert.throws(() => applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-network-configuration", patch: { gateway: "999.1.1.1" } }, allowedControls: allNetworkControls }), LabCommandError);
  assert.throws(() => applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-network-configuration", patch: { prefixLength: 33 } }, allowedControls: allNetworkControls }), LabCommandError);
  assert.throws(() => applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-network-configuration", patch: { dnsServer: "192.168.10.53" } }, allowedControls: [{ kind: "set-default-gateway" }] }), LabCommandError);
  assert.throws(() => applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-network-configuration", patch: { gateway: "192.168.10.1", unexpected: "value" } } as never, allowedControls: allNetworkControls }), LabCommandError);
  assert.deepEqual(state.devices.client.interface, { address: "192.168.10.25", prefixLength: 24, gateway: "192.168.10.254", dnsServer: "192.168.10.253", dhcpEnabled: false }, "rejected patches apply no partial mutation");
});

test("manually configurable interfaces expose a coherent field set rather than the faulty field", () => {
  const networkKinds = new Set(["set-ipv4-address", "set-prefix-length", "set-default-gateway", "set-dns-server"]);
  for (const definition of listCurrentLabDefinitions()) {
    for (const [deviceId, rules] of Object.entries(definition.deviceRules)) {
      const present = rules.controls.filter((control) => networkKinds.has(control.kind)).map((control) => control.kind);
      if (present.length > 0) assert.deepEqual(new Set(present), networkKinds, `${definition.public.id}:${deviceId}`);
    }
  }
});

test("catalogue starts with the tutorial and retains 16 canonical troubleshooting labs", () => {
  const definitions = listCurrentLabDefinitions();
  assert.equal(definitions.length, 17);
  assert.deepEqual(definitions.map((definition) => definition.public.id), [
    "tutorial-lab-001",
    "subnet-client-001", "gateway-client-001", "prefix-client-001", "dns-client-001",
    "dns-record-001", "dhcp-client-001", "dhcp-options-001", "web-service-001",
    "application-backend-001", "web-port-001", "linux-routing-001", "linux-permissions-001",
    "vlan-access-001", "firewall-http-001", "client-multifault-001", "vlan-firewall-multifault-001",
  ]);
  const requirements = definitions.map((definition) => definition.public.unlockRequirements);
  assert.ok(requirements.some((value) => value.minLevel === undefined && (value.requiredModuleIds?.length ?? 0) === 0));
  assert.ok(requirements.some((value) => value.minLevel !== undefined && (value.requiredModuleIds?.length ?? 0) === 0));
  assert.ok(requirements.some((value) => value.minLevel === undefined && (value.requiredModuleIds?.length ?? 0) > 0));
  assert.ok(requirements.some((value) => value.minLevel !== undefined && (value.requiredModuleIds?.length ?? 0) > 0));
  const canonical = new Set(["ipv4-grundlagen", "subnetting", "dhcp", "dns", "webserver-grundlagen", "linux-grundlagen", "windows-grundlagen", "active-directory-grundlagen", "netzwerkfehler-systematisch-analysieren"]);
  for (const definition of definitions) {
    assert.equal(isSimulatedLabState(definition.initialState), true, definition.public.id);
    assert.equal(definition.hints.length, 3, definition.public.id);
    assert.ok(definition.public.topology.devices.some((device) => device.id === definition.selectedDeviceId), definition.public.id);
    assert.deepEqual(
      new Set(Object.keys(definition.initialState.devices)),
      new Set(definition.public.topology.devices.map((device) => device.id)),
      definition.public.id,
    );
    assert.deepEqual(new Set(Object.keys(definition.deviceRules)), new Set(Object.keys(definition.initialState.devices)), definition.public.id);
    for (const id of [...(definition.public.unlockRequirements.requiredModuleIds ?? []), ...definition.public.relevantModuleIds]) assert.ok(canonical.has(id), id);
  }
});

test("every Lab device has coherent canonical state and every modeled target is inspectable", () => {
  const layer3Types = new Set(["windows-client", "linux-client", "linux-server", "dns-dhcp-server", "router", "firewall", "internet"]);
  for (const definition of listCurrentLabDefinitions()) {
    const deviceIds = new Set(definition.public.topology.devices.map((device) => device.id));
    const addresses = new Set<string>();
    for (const link of definition.public.topology.links) {
      assert.ok(deviceIds.has(link.from), `${definition.public.id}: missing link source ${link.from}`);
      assert.ok(deviceIds.has(link.to), `${definition.public.id}: missing link target ${link.to}`);
    }
    for (const publicDevice of definition.public.topology.devices) {
      const device = definition.initialState.devices[publicDevice.id];
      assert.ok(device, `${definition.public.id}:${publicDevice.id} has state`);
      assert.equal(device.hostname, publicDevice.label, `${definition.public.id}:${publicDevice.id} hostname`);
      if (layer3Types.has(publicDevice.type)) {
        assert.ok(device.interface, `${definition.public.id}:${publicDevice.id} has an interface`);
        const interfaces = getSimulatedDeviceInterfaces(device);
        assert.ok(interfaces.length >= 1, `${definition.public.id}:${publicDevice.id} has inspectable L3 state`);
        for (const network of interfaces) {
          assert.ok(network.name, `${definition.public.id}:${publicDevice.id} interface name`);
          assert.ok(network.address, `${definition.public.id}:${publicDevice.id} IPv4 address`);
          assert.notEqual(network.prefixLength, null, `${definition.public.id}:${publicDevice.id} prefix`);
          assert.ok(network.ipv4Mode === "static" || network.ipv4Mode === "dynamic", `${definition.public.id}:${publicDevice.id} IPv4 mode`);
          assert.equal("dhcpEnabled" in network, false, `${definition.public.id}:${publicDevice.id} has no duplicate legacy mode`);
          assert.equal(addresses.has(network.address!), false, `${definition.public.id}: duplicate ${network.address}`);
          addresses.add(network.address!);
        }
      } else {
        assert.equal(publicDevice.type, "switch", `${definition.public.id}:${publicDevice.id} known non-L3 type`);
        assert.equal(device.interface, undefined, `${definition.public.id}:${publicDevice.id} has no artificial L3 address`);
        assert.ok(Object.keys(device.switchPorts ?? {}).length > 0, `${definition.public.id}:${publicDevice.id} switching state`);
      }
      for (const rule of Object.values(device.firewallRules ?? {})) {
        assert.ok(deviceIds.has(rule.destinationDeviceId), `${definition.public.id}: firewall target ${rule.destinationDeviceId}`);
        assert.ok(definition.initialState.devices[rule.destinationDeviceId]?.interface?.address, `${definition.public.id}: firewall target address`);
      }
    }
    for (const host of definition.dnsHosts ?? []) {
      assert.ok(addresses.has(host.address), `${definition.public.id}: DNS target ${host.address} belongs to an inspectable device`);
    }
  }
});

test("device types receive a consistent diagnostic command family without OS mixing", () => {
  const requiredByType = {
    "windows-client": ["help", "ipconfig", "route-print", "ping", "tracert", "nslookup"],
    "linux-client": ["help", "hostname", "ip-a", "ip-route", "ping", "trace-linux", "resolvectl", "resolv-conf"],
    "linux-server": ["help", "hostname", "ip-a", "ip-route", "ping", "trace-linux", "resolvectl", "resolv-conf"],
    "dns-dhcp-server": ["help", "hostname", "ip-a", "ip-route", "ping", "trace-linux", "resolvectl", "resolv-conf", "systemctl-list", "systemctl-status"],
    router: ["help", "show-ip-interface-brief", "show-ip-route", "show-interfaces", "ping"],
    switch: ["help", "show-vlan", "show-interfaces", "show-switchport", "show-mac-address-table"],
    firewall: ["help", "show-ip-interface-brief", "show-ip-route", "show-interfaces", "show-firewall", "ping"],
    internet: ["help", "hostname", "ip-a", "ip-route", "ping", "trace-linux"],
  } as const;
  for (const definition of listCurrentLabDefinitions()) {
    for (const publicDevice of definition.public.topology.devices) {
      const commands = definition.deviceRules[publicDevice.id].commands;
      for (const command of requiredByType[publicDevice.type]) assert.ok(commands.includes(command), `${definition.public.id}:${publicDevice.id}:${command}`);
      if (publicDevice.type === "windows-client") {
        assert.equal(commands.includes("ip-a"), false, `${definition.public.id}:${publicDevice.id} no Linux ip command`);
        assert.equal(commands.includes("dig"), false, `${definition.public.id}:${publicDevice.id} no Linux dig command`);
        assert.equal(commands.includes("trace-linux"), false, `${definition.public.id}:${publicDevice.id} no Linux trace command`);
      }
      if (["linux-client", "linux-server", "dns-dhcp-server", "internet"].includes(publicDevice.type)) {
        assert.equal(commands.includes("ipconfig"), false, `${definition.public.id}:${publicDevice.id} no Windows ipconfig`);
        assert.equal(commands.includes("tracert"), false, `${definition.public.id}:${publicDevice.id} no Windows tracert`);
      }
      assert.deepEqual(
        commands,
        getDeviceCommandCapabilities(publicDevice.type, definition.initialState.devices[publicDevice.id], commands),
        `${definition.public.id}:${publicDevice.id} capability expansion is stable`,
      );
      const help = run(definition, definition.initialState, publicDevice.id, "help").output;
      assert.match(help, /Unterstützte Befehle/);
      assert.ok(help.split("\n").length >= commands.length + 1, `${definition.public.id}:${publicDevice.id} help lists capabilities`);
      if (publicDevice.type === "windows-client") {
        assert.match(help, /tracert <Ziel>/);
        assert.doesNotMatch(help, /traceroute|tracepath/);
        assert.throws(() => run(definition, definition.initialState, publicDevice.id, "tracepath 203.0.113.10"), LabCommandError);
      }
      if (["linux-client", "linux-server", "dns-dhcp-server", "internet"].includes(publicDevice.type)) {
        assert.match(help, /traceroute\|tracepath <Ziel>/);
        assert.doesNotMatch(help, /tracert <Ziel>/);
        assert.throws(() => run(definition, definition.initialState, publicDevice.id, "tracert 203.0.113.10"), LabCommandError);
      }
    }
  }
});

test("canonical mutations immediately change subsequent diagnostic output", () => {
  const tutorial = requiredDefinition("tutorial-lab-001");
  let windows = cloneInitialLabState(tutorial);
  windows = configure(tutorial, windows, "client", { kind: "set-network-configuration", patch: { ipv4Address: "192.168.90.26", gateway: "192.168.90.1" } });
  assert.match(run(tutorial, windows, "client", "ipconfig /all").output, /IPv4-Konfiguration[\s\S]*statisch[\s\S]*192\.168\.90\.26/);
  assert.match(run(tutorial, windows, "client", "route print").output, /0\.0\.0\.0\/0[\s\S]*192\.168\.90\.1/);

  const routing = requiredDefinition("linux-routing-001");
  let linux = cloneInitialLabState(routing);
  linux = configure(routing, linux, "server", { kind: "set-network-configuration", patch: { ipv4Address: "192.168.50.21", gateway: "192.168.50.1" } });
  assert.match(run(routing, linux, "server", "ip a").output, /192\.168\.50\.21\/24[\s\S]*IPv4-Konfiguration: statisch/);
  assert.match(run(routing, linux, "server", "ip route").output, /default via 192\.168\.50\.1/);

  const dhcp = requiredDefinition("dhcp-client-001");
  let dynamic = cloneInitialLabState(dhcp);
  assert.equal(getIpv4Mode(dynamic.devices.client.interface), "dynamic");
  assert.match(run(dhcp, dynamic, "client", "ipconfig /all").output, /IPv4-Konfiguration[\s\S]*dynamisch[\s\S]*169\.254\.42\.10/);
  dynamic = run(dhcp, dynamic, "dhcp", "systemctl start dhcp").state;
  dynamic = run(dhcp, dynamic, "client", "ipconfig /renew").state;
  assert.match(run(dhcp, dynamic, "client", "ipconfig /all").output, /192\.168\.10\.100[\s\S]*192\.168\.10\.1[\s\S]*192\.168\.10\.53/);

  const vlan = requiredDefinition("vlan-access-001");
  const switched = configure(vlan, cloneInitialLabState(vlan), "switch", { kind: "set-access-vlan", portId: "gi0/1", vlan: 10 });
  assert.match(run(vlan, switched, "switch", "show interfaces switchport").output, /gi0\/1[\s\S]*Access VLAN: 10/);

  const firewall = requiredDefinition("firewall-http-001");
  const filtered = configure(firewall, cloneInitialLabState(firewall), "firewall", { kind: "set-firewall-rule-action", ruleId: "client-http", action: "allow" });
  assert.match(run(firewall, filtered, "firewall", "show firewall").output, /client-http[\s\S]*web \(192\.168\.72\.20\)[\s\S]*TCP\/80[\s\S]*ALLOW/);
});

test("network appliances and role servers expose state needed for diagnosis", () => {
  const gateway = requiredDefinition("gateway-client-001");
  assert.match(run(gateway, gateway.initialState, "router", "show ip interface brief").output, /GigabitEthernet0\/0[\s\S]*192\.168\.10\.1\/24[\s\S]*GigabitEthernet0\/1[\s\S]*203\.0\.113\.1\/24/);
  assert.match(run(gateway, gateway.initialState, "router", "show ip route").output, /192\.168\.10\.0\/24[\s\S]*203\.0\.113\.0\/24/);
  assert.match(run(gateway, gateway.initialState, "internet", "ip a").output, /203\.0\.113\.10\/24/);

  const dns = requiredDefinition("dns-record-001");
  assert.match(run(dns, dns.initialState, "dns", "show dns records").output, /portal\.firma\.test\.[\s\S]*192\.168\.10\.99/);
  assert.match(run(dns, dns.initialState, "web", "systemctl list-units --type=service").output, /nginx\.service[\s\S]*TCP\/80/);

  const dhcp = requiredDefinition("dhcp-options-001");
  assert.match(run(dhcp, dhcp.initialState, "dhcp", "show dhcp options").output, /DHCP-Dienst: aktiv[\s\S]*Option DNS-Server: 192\.168\.10\.254/);
  assert.match(run(dhcp, dhcp.initialState, "files", "ip a").output, /192\.168\.10\.60\/24/);

  const permissions = requiredDefinition("linux-permissions-001");
  assert.match(run(permissions, permissions.initialState, "files", "smbstatus --shares").output, /support[\s\S]*\/srv\/freigabe[\s\S]*0750/);
});

test("legacy active-attempt state hydrates to the canonical model without changing Lab version", () => {
  const gateway = requiredDefinition("gateway-client-001");
  const legacy = structuredClone(gateway.initialState);
  for (const device of Object.values(legacy.devices)) {
    if (!device.interface) continue;
    const dynamic = device.interface.ipv4Mode === "dynamic";
    delete device.interface.ipv4Mode;
    delete device.interface.name;
    device.interface.dhcpEnabled = dynamic;
    delete device.hostname;
  }
  legacy.devices.router.routesExternal = true;
  delete legacy.devices.router.additionalInterfaces;
  const hydrated = hydrateCompatibleLabState(gateway, legacy);
  assert.equal(gateway.public.version, 1);
  assert.equal(hydrated.devices.client.hostname, "PC-CLIENT");
  assert.equal(hydrated.devices.client.interface?.ipv4Mode, "static");
  assert.equal(hydrated.devices.client.interface?.dhcpEnabled, undefined);
  assert.equal(hydrated.devices.router.additionalInterfaces?.["GigabitEthernet0/1"]?.address, "203.0.113.1");
  assert.equal(hydrated.devices.router.routesExternal, undefined);

  const dhcpOptions = requiredDefinition("dhcp-options-001");
  const withoutNewServer = structuredClone(dhcpOptions.initialState);
  delete withoutNewServer.devices.files;
  const compatible = hydrateCompatibleLabState(dhcpOptions, withoutNewServer);
  assert.equal(compatible.devices.files.interface?.address, "192.168.10.60");
});

test("all 17 Labs can be diagnosed and completed without hints or hidden-state parameters", () => {
  type LearnerCommand = { deviceId: string; command: string };
  type Playthrough = {
    id: string;
    diagnostics: LearnerCommand[];
    exposed: RegExp[];
    repair: (definition: ServerLabDefinition, state: SimulatedLabState, transcript: string) => SimulatedLabState;
    verification: LearnerCommand[];
  };
  const playthroughs: Playthrough[] = [
    {
      id: "tutorial-lab-001",
      diagnostics: [
        { deviceId: "client", command: "ipconfig /all" },
        { deviceId: "router", command: "show ip interface brief" },
        { deviceId: "training", command: "ip a" },
      ],
      exposed: [/192\.168\.90\.254/, /192\.168\.90\.1/, /203\.0\.113\.20\/24/],
      repair: (definition, state) => configure(definition, state, "client", { kind: "set-default-gateway", value: "192.168.90.1" }),
      verification: [{ deviceId: "client", command: "ping 203.0.113.20" }],
    },
    {
      id: "subnet-client-001",
      diagnostics: [
        { deviceId: "client", command: "ipconfig /all" },
        { deviceId: "file", command: "ip a" },
        { deviceId: "router", command: "show ip interface brief" },
      ],
      exposed: [/192\.168\.20\.25/, /192\.168\.10\.50\/24/, /192\.168\.10\.1\/24/],
      repair: (definition, state, transcript) => {
        const currentHost = transcript.match(/192\.168\.20\.(\d+)/)?.[1];
        const targetNetwork = transcript.match(/(192\.168\.10)\.50\/24/)?.[1];
        assert.ok(currentHost && targetNetwork, "replacement address can be derived from current host ID and inspected target network");
        return configure(definition, state, "client", { kind: "set-ipv4-address", value: `${targetNetwork}.${currentHost}` });
      },
      verification: [{ deviceId: "client", command: "ping 192.168.10.50" }],
    },
    {
      id: "gateway-client-001",
      diagnostics: [
        { deviceId: "client", command: "ipconfig /all" },
        { deviceId: "client", command: "route print" },
        { deviceId: "local", command: "ip a" },
        { deviceId: "router", command: "show ip interface brief" },
        { deviceId: "router", command: "show ip route" },
        { deviceId: "internet", command: "ip a" },
      ],
      exposed: [/192\.168\.10\.254/, /192\.168\.10\.1\/24/, /203\.0\.113\.1\/24/, /203\.0\.113\.10\/24/],
      repair: (definition, state) => configure(definition, state, "client", { kind: "set-default-gateway", value: "192.168.10.1" }),
      verification: [
        { deviceId: "client", command: "ping 192.168.10.50" },
        { deviceId: "client", command: "tracert 203.0.113.10" },
      ],
    },
    {
      id: "prefix-client-001",
      diagnostics: [
        { deviceId: "client", command: "ipconfig /all" },
        { deviceId: "file", command: "ip a" },
        { deviceId: "router", command: "show ip interface brief" },
      ],
      exposed: [/192\.168\.10\.25[\s\S]*Präfixlänge[\s\S]*28/, /192\.168\.10\.50\/24/, /192\.168\.10\.1\/24/],
      repair: (definition, state) => configure(definition, state, "client", { kind: "set-prefix-length", value: 24 }),
      verification: [{ deviceId: "client", command: "ping 192.168.10.50" }],
    },
    {
      id: "dns-client-001",
      diagnostics: [
        { deviceId: "client", command: "ipconfig /all" },
        { deviceId: "dns", command: "ip a" },
        { deviceId: "dns", command: "show dns records" },
        { deviceId: "internet", command: "ip a" },
      ],
      exposed: [/DNS-Server[\s\S]*192\.168\.10\.254/, /192\.168\.10\.53\/24/, /example\.org\.[\s\S]*203\.0\.113\.10/, /203\.0\.113\.10\/24/],
      repair: (definition, state) => configure(definition, state, "client", { kind: "set-dns-server", value: "192.168.10.53" }),
      verification: [{ deviceId: "client", command: "nslookup example.org" }],
    },
    {
      id: "dns-record-001",
      diagnostics: [
        { deviceId: "client", command: "nslookup portal.firma.test" },
        { deviceId: "dns", command: "show dns records" },
        { deviceId: "web", command: "ip a" },
        { deviceId: "old", command: "ip a" },
      ],
      exposed: [/portal\.firma\.test[\s\S]*192\.168\.10\.99/, /192\.168\.10\.80\/24/, /192\.168\.10\.99\/24/],
      repair: (definition, state) => configure(definition, state, "dns", { kind: "set-dns-record", hostname: "portal.firma.test", address: "192.168.10.80" }),
      verification: [{ deviceId: "client", command: "nslookup portal.firma.test" }],
    },
    {
      id: "dhcp-client-001",
      diagnostics: [
        { deviceId: "client", command: "ipconfig /all" },
        { deviceId: "dhcp", command: "ip a" },
        { deviceId: "dhcp", command: "systemctl list-units --type=service" },
        { deviceId: "router", command: "show ip interface brief" },
      ],
      exposed: [/IPv4-Konfiguration[\s\S]*dynamisch/, /169\.254\.42\.10/, /dhcp\.service[\s\S]*inactive[\s\S]*UDP\/67/, /192\.168\.10\.1\/24/],
      repair: (definition, state) => {
        const serviceStarted = run(definition, state, "dhcp", "systemctl start dhcp").state;
        return run(definition, serviceStarted, "client", "ipconfig /renew").state;
      },
      verification: [{ deviceId: "client", command: "ipconfig /all" }],
    },
    {
      id: "dhcp-options-001",
      diagnostics: [
        { deviceId: "client", command: "ipconfig /all" },
        { deviceId: "dhcp", command: "show dhcp options" },
        { deviceId: "dns", command: "ip a" },
        { deviceId: "dns", command: "show dns records" },
        { deviceId: "files", command: "ip a" },
      ],
      exposed: [/IPv4-Konfiguration[\s\S]*dynamisch/, /Option DNS-Server: 192\.168\.10\.254/, /192\.168\.10\.53\/24/, /files\.firma\.test\.[\s\S]*192\.168\.10\.60/, /192\.168\.10\.60\/24/],
      repair: (definition, state) => {
        const corrected = configure(definition, state, "dhcp", { kind: "set-dhcp-option", option: "dnsServer", value: "192.168.10.53" });
        return run(definition, corrected, "client", "ipconfig /renew").state;
      },
      verification: [{ deviceId: "client", command: "nslookup files.firma.test" }],
    },
    {
      id: "web-service-001",
      diagnostics: [
        { deviceId: "client", command: "ip a" },
        { deviceId: "web", command: "ip a" },
        { deviceId: "web", command: "systemctl list-units --type=service" },
      ],
      exposed: [/192\.168\.30\.20\/24/, /nginx\.service[\s\S]*inactive[\s\S]*TCP\/80/],
      repair: (definition, state) => configure(definition, state, "web", { kind: "set-service-state", service: "nginx", state: "running" }),
      verification: [{ deviceId: "client", command: "curl http://192.168.30.20" }],
    },
    {
      id: "application-backend-001",
      diagnostics: [
        { deviceId: "web", command: "ip a" },
        { deviceId: "web", command: "systemctl list-units --type=service --all" },
        { deviceId: "client", command: "curl http://app.firma.test" },
      ],
      exposed: [/192\.168\.30\.20\/24/, /nginx\.service[\s\S]*active[\s\S]*azubi-api\.service[\s\S]*inactive[\s\S]*TCP\/3000/],
      repair: (definition, state) => configure(definition, state, "web", { kind: "set-service-state", service: "azubi-api", state: "running" }),
      verification: [{ deviceId: "client", command: "curl http://app.firma.test" }],
    },
    {
      id: "web-port-001",
      diagnostics: [
        { deviceId: "web", command: "ip a" },
        { deviceId: "web", command: "systemctl status nginx" },
        { deviceId: "client", command: "curl http://portal.firma.test" },
        { deviceId: "client", command: "curl http://portal.firma.test:8080" },
      ],
      exposed: [/192\.168\.60\.20\/24/, /Listener: TCP\/8080/, /curl http:\/\/portal\.firma\.test:8080[\s\S]*200 OK/],
      repair: (definition, state, transcript) => {
        assert.match(definition.public.task, /regulären Clientzugriff/);
        assert.match(transcript, /curl http:\/\/portal\.firma\.test[\s\S]*Verbindung zum Webserver fehlgeschlagen/);
        return configure(definition, state, "web", { kind: "set-service-port", service: "nginx", port: 80 });
      },
      verification: [{ deviceId: "client", command: "curl http://portal.firma.test" }],
    },
    {
      id: "linux-routing-001",
      diagnostics: [
        { deviceId: "server", command: "ip a" },
        { deviceId: "server", command: "ip route" },
        { deviceId: "router", command: "show ip interface brief" },
        { deviceId: "internet", command: "ip a" },
      ],
      exposed: [/default via 192\.168\.50\.254/, /192\.168\.50\.1\/24/, /203\.0\.113\.10\/24/],
      repair: (definition, state) => configure(definition, state, "server", { kind: "set-default-gateway", value: "192.168.50.1" }),
      verification: [{ deviceId: "server", command: "tracepath 203.0.113.10" }],
    },
    {
      id: "linux-permissions-001",
      diagnostics: [
        { deviceId: "files", command: "smbstatus --shares" },
        { deviceId: "files", command: "stat /srv/freigabe" },
        { deviceId: "files", command: "systemctl status smb" },
      ],
      exposed: [/\/srv\/freigabe[\s\S]*0750/, /Gid: \(1001\/support\)/, /smb\.service[\s\S]*active[\s\S]*TCP\/445/],
      repair: (definition, state) => {
        assert.match(definition.public.task, /Besitzer und Supportgruppe[\s\S]*vollständigen Zugriff[\s\S]*Gruppenzuordnung für neu angelegte Inhalte/);
        return configure(definition, state, "files", { kind: "set-file-mode", path: "/srv/freigabe", mode: "2770" });
      },
      verification: [{ deviceId: "files", command: "stat /srv/freigabe" }],
    },
    {
      id: "vlan-access-001",
      diagnostics: [
        { deviceId: "client", command: "ipconfig /all" },
        { deviceId: "server", command: "ip a" },
        { deviceId: "switch", command: "show interfaces switchport" },
        { deviceId: "switch", command: "show mac address-table" },
      ],
      exposed: [/gi0\/1[\s\S]*Access VLAN: 20/, /gi0\/2[\s\S]*Access VLAN: 10/, /192\.168\.70\.20\/24/],
      repair: (definition, state) => configure(definition, state, "switch", { kind: "set-access-vlan", portId: "gi0/1", vlan: 10 }),
      verification: [{ deviceId: "client", command: "ping 192.168.70.20" }],
    },
    {
      id: "firewall-http-001",
      diagnostics: [
        { deviceId: "client", command: "ipconfig /all" },
        { deviceId: "web", command: "ip a" },
        { deviceId: "web", command: "systemctl status nginx" },
        { deviceId: "firewall", command: "show interfaces" },
        { deviceId: "firewall", command: "show ip route" },
        { deviceId: "firewall", command: "show firewall" },
      ],
      exposed: [/192\.168\.72\.10/, /192\.168\.72\.20\/24/, /Listener: TCP\/80/, /client-http[\s\S]*192\.168\.72\.20[\s\S]*TCP\/80[\s\S]*DENY/],
      repair: (definition, state) => configure(definition, state, "firewall", { kind: "set-firewall-rule-action", ruleId: "client-http", action: "allow" }),
      verification: [{ deviceId: "client", command: "curl http://web.firma.test" }],
    },
    {
      id: "client-multifault-001",
      diagnostics: [
        { deviceId: "client", command: "ipconfig /all" },
        { deviceId: "local", command: "ip a" },
        { deviceId: "dns", command: "ip a" },
        { deviceId: "dns", command: "show dns records" },
        { deviceId: "router", command: "show ip interface brief" },
        { deviceId: "web", command: "ip a" },
      ],
      exposed: [/192\.168\.73\.254/, /192\.168\.73\.53\/24/, /192\.168\.73\.1\/24/, /portal\.partner\.test\.[\s\S]*203\.0\.113\.90/, /203\.0\.113\.90\/24/],
      repair: (definition, state) => {
        let repaired = configure(definition, state, "client", { kind: "set-default-gateway", value: "192.168.73.1" });
        repaired = configure(definition, repaired, "client", { kind: "set-dns-server", value: "192.168.73.53" });
        return repaired;
      },
      verification: [{ deviceId: "client", command: "curl http://portal.partner.test" }],
    },
    {
      id: "vlan-firewall-multifault-001",
      diagnostics: [
        { deviceId: "client", command: "ip a" },
        { deviceId: "web", command: "ip a" },
        { deviceId: "web", command: "systemctl status nginx" },
        { deviceId: "switch", command: "show interfaces switchport" },
        { deviceId: "firewall", command: "show interfaces" },
        { deviceId: "firewall", command: "show firewall" },
      ],
      exposed: [/gi0\/5[\s\S]*Access VLAN: 20/, /gi0\/10[\s\S]*Access VLAN: 10/, /workshop-http[\s\S]*192\.168\.80\.20[\s\S]*TCP\/80[\s\S]*DENY/, /Listener: TCP\/80/],
      repair: (definition, state) => {
        let repaired = configure(definition, state, "firewall", { kind: "set-firewall-rule-action", ruleId: "workshop-http", action: "allow" });
        repaired = configure(definition, repaired, "switch", { kind: "set-access-vlan", portId: "gi0/5", vlan: 10 });
        return repaired;
      },
      verification: [{ deviceId: "client", command: "curl http://192.168.80.20" }],
    },
  ];

  assert.deepEqual(playthroughs.map((item) => item.id), listCurrentLabDefinitions().map((definition) => definition.public.id));
  for (const playthrough of playthroughs) {
    const definition = requiredDefinition(playthrough.id);
    let state = cloneInitialLabState(definition);
    assert.equal(definition.validate(state), false, `${playthrough.id}: starts faulty`);
    assert.equal(isLabComplete(definition, state), false, `${playthrough.id}: starts incomplete`);
    let transcript = "";
    for (const diagnostic of playthrough.diagnostics) {
      const executed = run(definition, state, diagnostic.deviceId, diagnostic.command);
      state = executed.state;
      transcript += `\n${diagnostic.deviceId}> ${diagnostic.command}\n${executed.output}`;
    }
    for (const requiredInformation of playthrough.exposed) assert.match(transcript, requiredInformation, `${playthrough.id}: required information is inspectable`);
    state = playthrough.repair(definition, state, transcript);
    assert.equal(definition.validate(state), true, `${playthrough.id}: inspected repair is valid`);
    for (const verification of playthrough.verification) state = run(definition, state, verification.deviceId, verification.command).state;
    assert.equal(isLabComplete(definition, state), true, `${playthrough.id}: learner verification completes Lab`);
  }
});

test("visual topology maps device types and derives every cable from canonical links", () => {
  assert.equal(getLabDeviceVisual("windows-client"), "workstation");
  assert.equal(getLabDeviceVisual("linux-client"), "workstation");
  assert.equal(getLabDeviceVisual("linux-server"), "server");
  assert.equal(getLabDeviceVisual("dns-dhcp-server"), "server");
  assert.equal(getLabDeviceVisual("switch"), "switch");
  assert.equal(getLabDeviceVisual("router"), "router");
  assert.equal(getLabDeviceVisual("firewall"), "firewall");
  assert.equal(getLabDeviceVisual("internet"), "internet");
  assert.equal(getLabDeviceTypeLabel("windows-client"), "Windows-Client");

  for (const definition of listCurrentLabDefinitions()) {
    const devices = definition.public.topology.devices.map((device) => ({ ...device, selected: device.id === definition.selectedDeviceId }));
    const layout = buildLabTopologyLayout(devices, definition.public.topology.links);
    assert.equal(layout.nodes.length, definition.public.topology.devices.length, definition.public.id);
    assert.equal(layout.connections.length, definition.public.topology.links.length, definition.public.id);
    assert.deepEqual(layout.connections.map((connection) => [connection.fromId, connection.toId]), definition.public.topology.links.map((link) => [link.from, link.to]), definition.public.id);
    assert.equal(layout.nodes.filter((node) => node.selected).length, 1, definition.public.id);
    assert.equal(layout.connections.some((connection) => /(?:\d{1,3}\.){3}\d{1,3}/u.test(connection.label ?? "")), false, definition.public.id);
  }
});

test("all normal labs have distinct IHK-style scenario and task content", () => {
  const definitions = listCurrentLabDefinitions();
  const tutorial = definitions[0];
  const normalLabs = definitions.filter((definition) => definition.public.kind === "troubleshooting");
  assert.equal(tutorial.public.kind, "tutorial");
  assert.deepEqual(tutorial.public.unlockRequirements, {});
  assert.equal(normalLabs.length, 16);
  for (const definition of normalLabs) {
    assert.match(definition.public.scenario, /BioPC GmbH/, definition.public.id);
    assert.ok(definition.public.scenario.length >= 120, definition.public.id);
    assert.match(definition.public.task, /^(Untersuchen|Analysieren|Ermitteln|Prüfen|Grenzen) Sie/, definition.public.id);
    assert.ok(definition.public.task.length >= 90, definition.public.id);
    assert.notEqual(definition.public.task, definition.review.rootCause, definition.public.id);
    assert.deepEqual(definition.public.unlockRequirements.requiredLabCompletions, ["tutorial-lab-001"], definition.public.id);
  }
});

test("guided tutorial advances deterministically through real actions and requires post-repair verification", () => {
  const definition = requiredDefinition("tutorial-lab-001");
  let state = cloneInitialLabState(definition);
  const history: LabHistoryItem[] = [];
  const at = (kind: LabHistoryItem["kind"], input: Partial<LabHistoryItem>): LabHistoryItem => ({ sequence: history.length + 1, kind, summary: "Tutorialschritt", createdAt: "2026-09-18T10:00:00.000Z", ...input });
  const guidance = (repairComplete = false) => projectTutorialGuidance({ selectedDeviceId: history.some((item) => item.kind === "device" && item.deviceId === "client") ? "client" : "training", status: "in_progress", history, repairComplete });

  assert.equal(guidance()?.step, 1);
  assert.equal(guidance()?.totalSteps, LAB_TUTORIAL_TOTAL_STEPS);
  history.push(at("command", { deviceId: "training", command: "ip a" }));
  assert.equal(guidance()?.step, 1, "an unrelated command does not advance orientation");

  history.push(at("device", { deviceId: "client" }));
  assert.equal(guidance()?.step, 2);
  history.push(at("command", { deviceId: "client", command: "help" }));
  assert.equal(guidance()?.step, 3);
  history.push(at("command", { deviceId: "client", command: "ping 192.168.90.1" }));
  assert.equal(guidance()?.step, 3, "an unrelated client command does not replace the requested inspection");

  history.push(at("command", { deviceId: "client", command: "ipconfig /all" }));
  assert.equal(guidance()?.step, 4);
  assert.match(run(definition, state, "client", "ipconfig /all").output, /192\.168\.90\.254/);
  history.push(at("hint", {}));
  assert.equal(guidance()?.step, 5);

  state = configure(definition, state, "client", { kind: "set-network-configuration", patch: { gateway: "192.168.90.1" } });
  history.push(at("configuration", { deviceId: "client" }));
  assert.equal(definition.validate(state), true);
  assert.equal(isLabComplete(definition, state), false);
  assert.equal(guidance(true)?.step, 6);
  history.push(at("command", { deviceId: "client", command: "help" }));
  assert.equal(guidance(true)?.step, 6, "help does not replace post-change inspection");

  history.push(at("command", { deviceId: "client", command: "ipconfig /all" }));
  const verificationStep = guidance(true);
  assert.equal(verificationStep?.step, 7);
  assert.equal(verificationStep?.principle, "Änderung ≠ Funktionsnachweis");
  state = run(definition, state, "client", "ping 203.0.113.20").state;
  assert.equal(isLabComplete(definition, state), true);
  assert.equal(projectTutorialGuidance({ selectedDeviceId: "client", status: "completed", history, repairComplete: true }), undefined);
  const reset = cloneInitialLabState(definition);
  assert.equal(reset.devices.client.interface?.gateway, "192.168.90.254");
  assert.equal(isLabComplete(definition, reset), false);
});

test("tutorial completion gates normal learners while staff bypass and original requirements remain intact", () => {
  const tutorial = requiredDefinition("tutorial-lab-001");
  const normal = requiredDefinition("firewall-http-001");
  const modules = new Set(["webserver-grundlagen", "netzwerkfehler-systematisch-analysieren"]);
  const before = { level: 10, completedModuleIds: modules, completedLabIds: new Set<string>(), bypass: false };
  assert.equal(evaluateLabUnlock(tutorial.public.unlockRequirements, before).unlocked, true);
  assert.equal(evaluateLabUnlock(normal.public.unlockRequirements, before).unlocked, false);
  const after = { ...before, completedLabIds: new Set(["tutorial-lab-001"]) };
  assert.equal(evaluateLabUnlock(normal.public.unlockRequirements, after).unlocked, true);
  assert.equal(evaluateLabUnlock(normal.public.unlockRequirements, { ...after, level: 1 }).unlocked, false);
  assert.equal(evaluateLabUnlock(normal.public.unlockRequirements, { ...before, bypass: true }).unlocked, true);
  assert.equal(evaluateLabUnlock(normal.public.unlockRequirements, after).unlocked, true, "a replay must not remove the immutable prior completion");
});

test("DNS diagnostics are state-dependent and succeed after the controlled fix", () => {
  const definition = requiredDefinition("dns-client-001");
  let state = cloneInitialLabState(definition);
  assert.match(run(definition, state, "client", "ping 192.168.10.1").output, /Antwort/);
  assert.match(run(definition, state, "client", "ping 203.0.113.10").output, /Antwort/);
  assert.match(run(definition, state, "client", "nslookup example.org").output, /Zeitüberschreitung/);
  state = applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-dns-server", value: "192.168.10.53" }, allowedControls: definition.deviceRules.client.controls }).state;
  assert.equal(isLabComplete(definition, state), false);
  assert.match(run(definition, state, "client", "nslookup example.org").output, /203\.0\.113\.10/);
  assert.equal(definition.validate(state), true);
});

test("DNS completion accepts semantic checks, aliases, case and a trailing dot", () => {
  const definition = requiredDefinition("dns-client-001");
  for (const command of [
    "nslookup example.org", "nslookup WWW.EXAMPLE.ORG.", "nslookup google.com", "nslookup WWW.GOOGLE.COM.",
    "ping google.com", "ping www.google.com", "ping -n 2 WWW.GOOGLE.COM.",
  ]) {
    let state = cloneInitialLabState(definition);
    state = applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-dns-server", value: "192.168.10.53" }, allowedControls: definition.deviceRules.client.controls }).state;
    assert.equal(isLabComplete(definition, state), false, command);
    state = run(definition, state, "client", command).state;
    assert.equal(isLabComplete(definition, state), true, command);
  }
});

test("IP-only, failed, unrelated and stale evidence cannot complete the DNS lab", () => {
  const definition = requiredDefinition("dns-client-001");
  let state = cloneInitialLabState(definition);
  const brokenHostname = run(definition, state, "client", "ping google.com");
  assert.match(brokenHostname.output, /nicht finden/);
  assert.deepEqual(brokenHostname.evidence, []);
  state = run(definition, state, "client", "ping 203.0.113.10").state;
  assert.equal(isLabComplete(definition, state), false);
  state = applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-dns-server", value: "192.168.10.53" }, allowedControls: definition.deviceRules.client.controls }).state;
  assert.deepEqual(state.verificationEvidence, []);
  state = run(definition, state, "client", "ping 203.0.113.10").state;
  assert.equal(isLabComplete(definition, state), false);
  state = run(definition, state, "client", "nslookup google.com").state;
  assert.equal(isLabComplete(definition, state), true);
  state = applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-dns-server", value: "192.168.10.254" }, allowedControls: definition.deviceRules.client.controls }).state;
  assert.deepEqual(state.verificationEvidence, []);
  state = applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-dns-server", value: "192.168.10.53" }, allowedControls: definition.deviceRules.client.controls }).state;
  assert.equal(isLabComplete(definition, state), false);
  assert.deepEqual(cloneInitialLabState(definition).verificationEvidence, []);
});

test("hostname ping distinguishes successful DNS resolution from failed routing", () => {
  const definition = requiredDefinition("dns-client-001");
  let state = cloneInitialLabState(definition);
  state = applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-dns-server", value: "192.168.10.53" }, allowedControls: definition.deviceRules.client.controls }).state;
  state = applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-default-gateway", value: "192.168.10.254" }, allowedControls: [{ kind: "set-default-gateway" }] }).state;
  const ping = run(definition, state, "client", "ping google.com");
  assert.match(ping.output, /wurde als 203\.0\.113\.10 aufgelöst/);
  assert.match(ping.output, /Zeitüberschreitung/);
  assert.deepEqual(ping.evidence, []);
  assert.equal(isLabComplete(definition, ping.state), false);
});

test("wrong gateway blocks external reachability and the correct gateway restores it", () => {
  const definition = requiredDefinition("gateway-client-001");
  let state = cloneInitialLabState(definition);
  const localPing = run(definition, state, "client", "ping 192.168.10.50");
  assert.match(localPing.output, /Antwort/);
  assert.ok(localPing.evidence.includes("local-ip-reachability-success"));
  assert.ok(!localPing.evidence.includes("external-ip-reachability-success"));
  assert.match(run(definition, state, "client", "ping 203.0.113.10").output, /Zeitüberschreitung/);
  state = applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-default-gateway", value: "192.168.10.1" }, allowedControls: definition.deviceRules.client.controls }).state;
  assert.equal(isLabComplete(definition, state), false);
  assert.equal(isLabComplete(definition, run(definition, state, "client", "ping 192.168.10.50").state), false);
  assert.match(run(definition, state, "client", "ping 203.0.113.10").output, /Antwort/);
  state = run(definition, state, "client", "tracert 203.0.113.10").state;
  assert.equal(isLabComplete(definition, state), true);
});

test("DHCP requires a running service and a subsequent lease renewal", () => {
  const definition = requiredDefinition("dhcp-client-001");
  let state = cloneInitialLabState(definition);
  const firstRenew = run(definition, state, "client", "ipconfig /renew");
  assert.match(firstRenew.output, /ohne Antwort/);
  assert.equal(definition.validate(firstRenew.state), false);
  state = run(definition, state, "dhcp", "systemctl start dhcp").state;
  assert.equal(definition.validate(state), false);
  state = run(definition, state, "client", "ipconfig /renew").state;
  assert.equal(state.devices.client.interface?.address, "192.168.10.100");
  assert.equal(definition.validate(state), true);
  assert.equal(isLabComplete(definition, state), true);
});

test("web and Linux permission validators react only to the intended state changes", () => {
  const web = requiredDefinition("web-service-001");
  let webState = cloneInitialLabState(web);
  const failedHttp = run(web, webState, "client", "curl http://192.168.30.20");
  assert.match(failedHttp.output, /fehlgeschlagen/);
  assert.deepEqual(failedHttp.evidence, []);
  webState = run(web, webState, "web", "systemctl start nginx").state;
  assert.equal(web.validate(webState), true);
  assert.equal(isLabComplete(web, webState), false);
  assert.equal(isLabComplete(web, run(web, webState, "client", "ping 192.168.30.20").state), false);
  const http = run(web, webState, "client", "curl http://192.168.30.20");
  assert.match(http.output, /200 OK/);
  assert.equal(isLabComplete(web, http.state), true);
  const httpByName = run(web, webState, "client", "curl http://web01.firma.test");
  assert.match(httpByName.output, /200 OK/);
  assert.equal(isLabComplete(web, httpByName.state), true);

  const permissions = requiredDefinition("linux-permissions-001");
  let permissionState = cloneInitialLabState(permissions);
  assert.equal(permissions.validate(permissionState), false);
  assert.match(run(permissions, permissionState, "files", "ls -ld /srv/freigabe").output, /drwxr-x---/);
  permissionState = run(permissions, permissionState, "files", "chmod 2770 /srv/freigabe").state;
  assert.equal(permissions.validate(permissionState), true);
  assert.equal(isLabComplete(permissions, permissionState), false);
  const inspected = run(permissions, permissionState, "files", "ls -ld /srv/freigabe");
  assert.match(inspected.output, /drwxrws---/);
  assert.equal(isLabComplete(permissions, inspected.state), true);
});

test("all original labs discard stale verification evidence and reset to a broken state", () => {
  const dns = requiredDefinition("dns-client-001");
  let dnsState = configure(dns, cloneInitialLabState(dns), "client", { kind: "set-dns-server", value: "192.168.10.53" });
  dnsState = run(dns, dnsState, "client", "ping www.google.com").state;
  assert.equal(isLabComplete(dns, dnsState), true);
  dnsState = configure(dns, dnsState, "client", { kind: "set-dns-server", value: "192.168.10.254" });
  dnsState = configure(dns, dnsState, "client", { kind: "set-dns-server", value: "192.168.10.53" });
  assert.equal(isLabComplete(dns, dnsState), false);

  const gateway = requiredDefinition("gateway-client-001");
  let gatewayState = configure(gateway, cloneInitialLabState(gateway), "client", { kind: "set-default-gateway", value: "192.168.10.1" });
  gatewayState = run(gateway, gatewayState, "client", "ping 203.0.113.10").state;
  gatewayState = configure(gateway, gatewayState, "client", { kind: "set-default-gateway", value: "192.168.10.254" });
  gatewayState = configure(gateway, gatewayState, "client", { kind: "set-default-gateway", value: "192.168.10.1" });
  assert.equal(isLabComplete(gateway, gatewayState), false);

  const dhcp = requiredDefinition("dhcp-client-001");
  let dhcpState = run(dhcp, cloneInitialLabState(dhcp), "dhcp", "systemctl start dhcp.service").state;
  dhcpState = run(dhcp, dhcpState, "client", "ipconfig /renew").state;
  assert.equal(isLabComplete(dhcp, dhcpState), true);
  dhcpState = run(dhcp, dhcpState, "dhcp", "systemctl stop dhcp").state;
  dhcpState = run(dhcp, dhcpState, "dhcp", "systemctl start dhcp").state;
  assert.equal(isLabComplete(dhcp, dhcpState), false);

  const web = requiredDefinition("web-service-001");
  let webState = run(web, cloneInitialLabState(web), "web", "systemctl start nginx.service").state;
  webState = run(web, webState, "web", "curl http://localhost").state;
  assert.equal(isLabComplete(web, webState), true);
  webState = run(web, webState, "web", "systemctl stop nginx").state;
  webState = run(web, webState, "web", "systemctl restart nginx").state;
  assert.equal(isLabComplete(web, webState), false);

  const permissions = requiredDefinition("linux-permissions-001");
  let permissionState = run(permissions, cloneInitialLabState(permissions), "files", "chmod 2770 /srv/freigabe").state;
  permissionState = run(permissions, permissionState, "files", "stat /srv/freigabe").state;
  assert.equal(isLabComplete(permissions, permissionState), true);
  permissionState = run(permissions, permissionState, "files", "chmod 0750 /srv/freigabe").state;
  permissionState = run(permissions, permissionState, "files", "chmod 2770 /srv/freigabe").state;
  assert.equal(isLabComplete(permissions, permissionState), false);

  for (const definition of [dns, gateway, dhcp, web, permissions]) {
    const reset = cloneInitialLabState(definition);
    assert.deepEqual(reset.verificationEvidence, []);
    assert.equal(definition.validate(reset), false, definition.public.id);
    assert.equal(isLabComplete(definition, reset), false, definition.public.id);
  }
});

test("wrong-subnet lab requires a repaired address plus successful local reachability", () => {
  const definition = requiredDefinition("subnet-client-001");
  let state = cloneInitialLabState(definition);
  assert.match(run(definition, state, "client", "ipconfig /all").output, /192\.168\.20\.25/);
  assert.match(run(definition, state, "client", "ping 192.168.10.50").output, /Zeitüberschreitung/);
  state = configure(definition, state, "client", { kind: "set-ipv4-address", value: "192.168.10.25" });
  assert.equal(definition.validate(state), true);
  assert.equal(isLabComplete(definition, state), false);
  state = run(definition, state, "client", "ping 192.168.10.50").state;
  assert.equal(isLabComplete(definition, state), true);
  state = configure(definition, state, "client", { kind: "set-ipv4-address", value: "192.168.20.25" });
  state = configure(definition, state, "client", { kind: "set-ipv4-address", value: "192.168.10.30" });
  assert.equal(isLabComplete(definition, state), false);
  assert.equal(isLabComplete(definition, run(definition, state, "client", "ping 192.168.10.1").state), true);
  assert.deepEqual(cloneInitialLabState(definition).verificationEvidence, []);
});

test("wrong-prefix lab derives reachability from the configured prefix", () => {
  const definition = requiredDefinition("prefix-client-001");
  let state = cloneInitialLabState(definition);
  assert.match(run(definition, state, "client", "ipconfig").output, /Präfixlänge .*: 28/);
  assert.match(run(definition, state, "client", "ping 192.168.10.1").output, /Zeitüberschreitung/);
  state = configure(definition, state, "client", { kind: "set-prefix-length", value: 24 });
  assert.equal(definition.validate(state), true);
  assert.equal(isLabComplete(definition, state), false);
  state = run(definition, state, "client", "ping 192.168.10.50").state;
  assert.equal(isLabComplete(definition, state), true);
  state = configure(definition, state, "client", { kind: "set-prefix-length", value: 28 });
  state = configure(definition, state, "client", { kind: "set-prefix-length", value: 24 });
  assert.equal(isLabComplete(definition, state), false);
  assert.equal(isLabComplete(definition, run(definition, state, "client", "ping -n 2 192.168.10.1").state), true);
  assert.equal(isLabComplete(definition, cloneInitialLabState(definition)), false);
});

test("wrong DNS record lab distinguishes resolver health from authoritative data", () => {
  const definition = requiredDefinition("dns-record-001");
  let state = cloneInitialLabState(definition);
  const wrong = run(definition, state, "client", "nslookup portal.firma.test");
  assert.match(wrong.output, /192\.168\.10\.99/);
  assert.equal(definition.validate(wrong.state), false);
  assert.equal(isLabComplete(definition, wrong.state), false);
  state = configure(definition, wrong.state, "dns", { kind: "set-dns-record", hostname: "portal.firma.test", address: "192.168.10.80" });
  assert.deepEqual(state.verificationEvidence, []);
  assert.equal(isLabComplete(definition, state), false);
  state = run(definition, state, "client", "nslookup INTRANET.FIRMA.TEST.").state;
  assert.equal(isLabComplete(definition, state), true);
  state = configure(definition, state, "dns", { kind: "set-dns-record", hostname: "portal.firma.test", address: "192.168.10.99" });
  state = configure(definition, state, "dns", { kind: "set-dns-record", hostname: "portal.firma.test", address: "192.168.10.80" });
  assert.equal(isLabComplete(definition, state), false);
  assert.equal(isLabComplete(definition, run(definition, state, "client", "curl -I http://portal.firma.test").state), true);
  assert.equal(isLabComplete(definition, cloneInitialLabState(definition)), false);
});

test("bad DHCP option lab needs server correction, lease renewal and DNS proof", () => {
  const definition = requiredDefinition("dhcp-options-001");
  let state = cloneInitialLabState(definition);
  assert.match(run(definition, state, "client", "ipconfig /all").output, /192\.168\.10\.254/);
  assert.match(run(definition, state, "client", "nslookup files.firma.test").output, /Zeitüberschreitung/);
  state = configure(definition, state, "dhcp", { kind: "set-dhcp-option", option: "dnsServer", value: "192.168.10.53" });
  assert.equal(definition.validate(state), false);
  state = run(definition, state, "client", "ipconfig /renew").state;
  assert.equal(definition.validate(state), true);
  assert.equal(isLabComplete(definition, state), false);
  state = run(definition, state, "client", "nslookup dateien.firma.test").state;
  assert.equal(isLabComplete(definition, state), true);
  state = configure(definition, state, "dhcp", { kind: "set-dhcp-option", option: "dnsServer", value: "192.168.10.254" });
  state = configure(definition, state, "dhcp", { kind: "set-dhcp-option", option: "dnsServer", value: "192.168.10.53" });
  state = run(definition, state, "client", "ipconfig /renew").state;
  assert.equal(isLabComplete(definition, state), false);
  assert.equal(isLabComplete(definition, run(definition, state, "client", "nslookup files.firma.test").state), true);
  assert.equal(isLabComplete(definition, cloneInitialLabState(definition)), false);
});

test("backend lab does not confuse ping or frontend status with application health", () => {
  const definition = requiredDefinition("application-backend-001");
  let state = cloneInitialLabState(definition);
  assert.match(run(definition, state, "client", "ping 192.168.30.20").output, /Antwort/);
  assert.match(run(definition, state, "web", "systemctl is-active nginx").output, /active \(running\)/);
  assert.match(run(definition, state, "client", "curl http://app.firma.test").output, /fehlgeschlagen/);
  state = configure(definition, state, "web", { kind: "set-service-state", service: "azubi-api", state: "running" });
  assert.equal(definition.validate(state), true);
  assert.equal(isLabComplete(definition, state), false);
  state = run(definition, state, "client", "curl -I http://app.firma.test").state;
  assert.equal(isLabComplete(definition, state), true);
  state = configure(definition, state, "web", { kind: "set-service-state", service: "azubi-api", state: "stopped" });
  state = configure(definition, state, "web", { kind: "set-service-state", service: "azubi-api", state: "running" });
  assert.equal(isLabComplete(definition, state), false);
  assert.equal(isLabComplete(definition, run(definition, state, "web", "curl http://localhost").state), true);
  assert.equal(isLabComplete(definition, cloneInitialLabState(definition)), false);
});

test("Linux route lab accepts Linux command variants but requires external proof", () => {
  const definition = requiredDefinition("linux-routing-001");
  let state = cloneInitialLabState(definition);
  assert.match(run(definition, state, "server", "ip -4 address show").output, /192\.168\.50\.20\/24/);
  const routeOutput = run(definition, state, "server", "ip route show").output;
  assert.match(routeOutput, /default via 192\.168\.50\.254/);
  assert.match(routeOutput, /192\.168\.50\.0\/24 dev eth0/);
  assert.match(run(definition, state, "server", "ping 192.168.50.10").output, /Antwort/);
  assert.equal(isLabComplete(definition, state), false);
  assert.match(run(definition, state, "server", "ping 203.0.113.10").output, /Zeitüberschreitung/);
  state = configure(definition, state, "server", { kind: "set-default-gateway", value: "192.168.50.1" });
  assert.equal(isLabComplete(definition, state), false);
  state = run(definition, state, "server", "traceroute 203.0.113.10").state;
  assert.equal(isLabComplete(definition, state), true);
  state = configure(definition, state, "server", { kind: "set-default-gateway", value: "192.168.50.254" });
  state = configure(definition, state, "server", { kind: "set-default-gateway", value: "192.168.50.1" });
  assert.equal(isLabComplete(definition, state), false);
  assert.equal(isLabComplete(definition, run(definition, state, "server", "ping -c 2 203.0.113.10").state), true);
  assert.equal(isLabComplete(definition, cloneInitialLabState(definition)), false);
});

test("wrong-port lab treats service status and alternate port as clues, not completion", () => {
  const definition = requiredDefinition("web-port-001");
  let state = cloneInitialLabState(definition);
  assert.match(run(definition, state, "web", "systemctl status nginx").output, /active \(running\)/);
  assert.match(run(definition, state, "client", "curl http://portal.firma.test").output, /fehlgeschlagen/);
  const alternatePort = run(definition, state, "client", "curl http://portal.firma.test:8080");
  assert.match(alternatePort.output, /200 OK/);
  assert.equal(isLabComplete(definition, alternatePort.state), false);
  state = configure(definition, alternatePort.state, "web", { kind: "set-service-port", service: "nginx", port: 80 });
  assert.deepEqual(state.verificationEvidence, []);
  assert.equal(isLabComplete(definition, state), false);
  state = run(definition, state, "client", "curl http://192.168.60.20").state;
  assert.equal(isLabComplete(definition, state), true);
  state = configure(definition, state, "web", { kind: "set-service-port", service: "nginx", port: 8080 });
  state = configure(definition, state, "web", { kind: "set-service-port", service: "nginx", port: 80 });
  assert.equal(isLabComplete(definition, state), false);
  assert.equal(isLabComplete(definition, run(definition, state, "client", "curl -I http://portal.firma.test").state), true);
  assert.equal(isLabComplete(definition, cloneInitialLabState(definition)), false);
});

test("VLAN access lab requires compatible membership and post-repair reachability", () => {
  const definition = requiredDefinition("vlan-access-001");
  let state = cloneInitialLabState(definition);
  assert.match(run(definition, state, "client", "ipconfig /all").output, /192\.168\.70\.10/);
  assert.match(run(definition, state, "client", "ping 192.168.70.20").output, /Zeitüberschreitung/);
  assert.match(run(definition, state, "switch", "show vlan").output, /VLAN 20\s+gi0\/1\s+client/);
  assert.match(run(definition, state, "switch", "show interfaces switchport").output, /gi0\/2\s+Mode: access\s+Access VLAN: 10/);
  assert.throws(() => configure(definition, state, "switch", { kind: "set-access-vlan", portId: "gi0/2", vlan: 20 }), LabCommandError);
  state = configure(definition, state, "switch", { kind: "set-access-vlan", portId: "gi0/1", vlan: 10 });
  assert.equal(definition.validate(state), true);
  assert.equal(isLabComplete(definition, state), false);
  state = run(definition, state, "client", "ping 192.168.70.20").state;
  assert.equal(isLabComplete(definition, state), true);

  state = configure(definition, state, "switch", { kind: "set-access-vlan", portId: "gi0/1", vlan: 20 });
  state = configure(definition, state, "switch", { kind: "set-access-vlan", portId: "gi0/1", vlan: 10 });
  assert.equal(isLabComplete(definition, state), false);
  assert.equal(isLabComplete(definition, run(definition, state, "client", "curl http://192.168.70.20").state), true);
  const reset = cloneInitialLabState(definition);
  assert.equal(reset.devices.switch.switchPorts?.["gi0/1"]?.vlan, 20);
  assert.deepEqual(reset.verificationEvidence, []);
});

test("firewall lab keeps ICMP separate from blocked HTTP and scopes rule mutations", () => {
  const definition = requiredDefinition("firewall-http-001");
  let state = cloneInitialLabState(definition);
  assert.match(run(definition, state, "client", "ping 192.168.72.20").output, /Antwort/);
  assert.match(run(definition, state, "web", "systemctl status nginx").output, /active \(running\)/);
  assert.match(run(definition, state, "client", "curl http://web.firma.test").output, /fehlgeschlagen/);
  assert.match(run(definition, state, "firewall", "show firewall").output, /client-http.*TCP\/80.*DENY/);
  state = configure(definition, state, "firewall", { kind: "set-firewall-rule-action", ruleId: "admin-ssh", action: "allow" });
  assert.equal(definition.validate(state), false);
  assert.match(run(definition, state, "client", "curl http://192.168.72.20").output, /fehlgeschlagen/);
  state = configure(definition, state, "firewall", { kind: "set-firewall-rule-action", ruleId: "client-http", action: "allow" });
  assert.equal(definition.validate(state), true);
  assert.equal(isLabComplete(definition, state), false);
  state = run(definition, state, "client", "curl -I http://web.firma.test").state;
  assert.equal(isLabComplete(definition, state), true);
  assert.ok(state.verificationEvidence?.includes("remote-http-service-success"));

  state = configure(definition, state, "firewall", { kind: "set-firewall-rule-action", ruleId: "client-http", action: "deny" });
  state = configure(definition, state, "firewall", { kind: "set-firewall-rule-action", ruleId: "client-http", action: "allow" });
  assert.equal(isLabComplete(definition, state), false);
  assert.throws(() => configure(definition, state, "firewall", { kind: "set-firewall-rule-action", ruleId: "unknown-rule", action: "allow" }), LabCommandError);
  const reset = cloneInitialLabState(definition);
  assert.equal(reset.devices.firewall.firewallRules?.["client-http"]?.action, "deny");
  assert.equal(isLabComplete(definition, reset), false);
});

test("two-fault client lab supports either repair order and requires final end-to-end proof", () => {
  const definition = requiredDefinition("client-multifault-001");
  const initial = cloneInitialLabState(definition);
  assert.match(run(definition, initial, "client", "ping 192.168.73.50").output, /Antwort/);
  assert.match(run(definition, initial, "client", "ping 203.0.113.90").output, /Zeitüberschreitung/);
  assert.match(run(definition, initial, "client", "nslookup portal.partner.test").output, /Zeitüberschreitung/);
  assert.equal(definition.validate(initial), false);

  let gatewayFirst = configure(definition, initial, "client", { kind: "set-default-gateway", value: "192.168.73.1" });
  assert.equal(definition.validate(gatewayFirst), false);
  assert.match(run(definition, gatewayFirst, "client", "ping 203.0.113.90").output, /Antwort/);
  assert.match(run(definition, gatewayFirst, "client", "curl http://portal.partner.test").output, /fehlgeschlagen/);
  gatewayFirst = configure(definition, gatewayFirst, "client", { kind: "set-dns-server", value: "192.168.73.53" });
  assert.equal(definition.validate(gatewayFirst), true);
  assert.equal(isLabComplete(definition, gatewayFirst), false);
  gatewayFirst = run(definition, gatewayFirst, "client", "curl http://www.portal.partner.test").state;
  assert.equal(isLabComplete(definition, gatewayFirst), true);

  let dnsFirst = configure(definition, cloneInitialLabState(definition), "client", { kind: "set-dns-server", value: "192.168.73.53" });
  assert.match(run(definition, dnsFirst, "client", "nslookup portal.partner.test").output, /203\.0\.113\.90/);
  assert.match(run(definition, dnsFirst, "client", "curl http://portal.partner.test").output, /fehlgeschlagen/);
  dnsFirst = configure(definition, dnsFirst, "client", { kind: "set-default-gateway", value: "192.168.73.1" });
  assert.equal(definition.validate(dnsFirst), true);
  assert.equal(isLabComplete(definition, dnsFirst), false);
  dnsFirst = run(definition, dnsFirst, "client", "curl -I http://portal.partner.test").state;
  assert.equal(isLabComplete(definition, dnsFirst), true);

  dnsFirst = configure(definition, dnsFirst, "client", { kind: "set-default-gateway", value: "192.168.73.254" });
  dnsFirst = configure(definition, dnsFirst, "client", { kind: "set-default-gateway", value: "192.168.73.1" });
  assert.equal(isLabComplete(definition, dnsFirst), false);
  const reset = cloneInitialLabState(definition);
  assert.equal(reset.devices.client.interface?.gateway, "192.168.73.254");
  assert.equal(reset.devices.client.interface?.dnsServer, "192.168.73.254");
});

test("advanced VLAN and firewall lab keeps both faults independent in either order", () => {
  const definition = requiredDefinition("vlan-firewall-multifault-001");
  const initial = cloneInitialLabState(definition);
  assert.match(run(definition, initial, "client", "ping 192.168.80.20").output, /Zeitüberschreitung/);
  assert.match(run(definition, initial, "client", "curl http://192.168.80.20").output, /fehlgeschlagen/);

  let vlanFirst = configure(definition, initial, "switch", { kind: "set-access-vlan", portId: "gi0/5", vlan: 10 });
  assert.equal(definition.validate(vlanFirst), false);
  assert.match(run(definition, vlanFirst, "client", "ping 192.168.80.20").output, /Antwort/);
  assert.match(run(definition, vlanFirst, "client", "curl http://192.168.80.20").output, /fehlgeschlagen/);
  vlanFirst = configure(definition, vlanFirst, "firewall", { kind: "set-firewall-rule-action", ruleId: "workshop-http", action: "allow" });
  assert.equal(definition.validate(vlanFirst), true);
  assert.equal(isLabComplete(definition, vlanFirst), false);
  vlanFirst = run(definition, vlanFirst, "client", "curl http://192.168.80.20").state;
  assert.equal(isLabComplete(definition, vlanFirst), true);

  let firewallFirst = configure(definition, cloneInitialLabState(definition), "firewall", { kind: "set-firewall-rule-action", ruleId: "workshop-http", action: "allow" });
  assert.equal(definition.validate(firewallFirst), false);
  assert.match(run(definition, firewallFirst, "client", "ping 192.168.80.20").output, /Zeitüberschreitung/);
  assert.match(run(definition, firewallFirst, "client", "curl http://192.168.80.20").output, /fehlgeschlagen/);
  firewallFirst = configure(definition, firewallFirst, "switch", { kind: "set-access-vlan", portId: "gi0/5", vlan: 10 });
  assert.equal(definition.validate(firewallFirst), true);
  assert.equal(isLabComplete(definition, firewallFirst), false);
  firewallFirst = run(definition, firewallFirst, "client", "curl -I http://192.168.80.20").state;
  assert.equal(isLabComplete(definition, firewallFirst), true);

  firewallFirst = configure(definition, firewallFirst, "firewall", { kind: "set-firewall-rule-action", ruleId: "workshop-http", action: "deny" });
  firewallFirst = configure(definition, firewallFirst, "firewall", { kind: "set-firewall-rule-action", ruleId: "workshop-http", action: "allow" });
  assert.equal(isLabComplete(definition, firewallFirst), false);
  assert.throws(() => configure(definition, firewallFirst, "switch", { kind: "set-access-vlan", portId: "gi0/10", vlan: 20 }), LabCommandError);
  assert.throws(() => configure(definition, firewallFirst, "firewall", { kind: "set-firewall-rule-action", ruleId: "monitoring-https", action: "deny" }), LabCommandError);
  const reset = cloneInitialLabState(definition);
  assert.equal(reset.devices.switch.switchPorts?.["gi0/5"]?.vlan, 20);
  assert.equal(reset.devices.firewall.firewallRules?.["workshop-http"]?.action, "deny");
  assert.deepEqual(reset.verificationEvidence, []);
});

test("terminal transcript preserves commands and output while clear only resets presentation", () => {
  const definition = requiredDefinition("tutorial-lab-001");
  let state = cloneInitialLabState(definition);
  state.verificationEvidence = ["client-ip-configuration-confirmed"];
  state = appendLabTerminalEntry(state, { deviceId: "client", command: "help", output: "Unterstützte Befehle" });
  state = appendLabTerminalEntry(state, { deviceId: "client", command: "ipconfig /all", output: "Ethernet-Adapter Ethernet" });
  assert.deepEqual(state.terminalTranscript?.map((entry) => entry.command), ["help", "ipconfig /all"]);
  assert.match(state.terminalTranscript?.[1]?.output ?? "", /Ethernet-Adapter/);
  assert.equal(isSimulatedLabState(state), true);

  const beforeDevices = structuredClone(state.devices);
  const beforeEvidence = structuredClone(state.verificationEvidence);
  const cleared = executeLabOperation({ state, deviceId: "client", operation: { kind: "clear" }, supportedCommands: ["clear"] });
  assert.deepEqual(cleared.state.terminalTranscript, []);
  assert.deepEqual(cleared.state.devices, beforeDevices);
  assert.deepEqual(cleared.state.verificationEvidence, beforeEvidence);
  assert.equal(cleared.mutated, false);
  assert.equal(isLabComplete(definition, cleared.state), false);
  assert.equal(state.terminalTranscript?.length, 2, "clear does not mutate the caller's state");

  const help = executeLabOperation({ state, deviceId: "client", operation: { kind: "help" }, supportedCommands: ["help", "clear"] });
  assert.match(help.output, /clear – nur die sichtbare Terminalanzeige leeren/);
});

test("terminal parser accepts supported grammar and rejects unsafe shell syntax", () => {
  assert.deepEqual(parseLabCommand("clear").operation, { kind: "clear" });
  assert.deepEqual(parseLabCommand("  ipconfig   /all  ").operation, { kind: "ipconfig" });
  assert.deepEqual(parseLabCommand("route print").operation, { kind: "route-print" });
  assert.deepEqual(parseLabCommand("hostname -I").operation, { kind: "hostname", addressesOnly: true });
  assert.deepEqual(parseLabCommand("ip -4 addr show").operation, { kind: "ip-address" });
  assert.deepEqual(parseLabCommand("ip route show").operation, { kind: "ip-route" });
  assert.deepEqual(parseLabCommand("PING -n 2 WWW.GOOGLE.COM.").operation, { kind: "ping", target: "www.google.com" });
  assert.deepEqual(parseLabCommand("dig Portal.Firma.Test. A").operation, { kind: "dns-query", target: "portal.firma.test", tool: "dig" });
  assert.deepEqual(parseLabCommand("curl -I http://portal.firma.test").operation, { kind: "http", target: "http://portal.firma.test" });
  assert.deepEqual(parseLabCommand("systemctl is-active nginx.service").operation, { kind: "service", verb: "status", service: "nginx" });
  assert.deepEqual(parseLabCommand("systemctl list-units --type=service --all").operation, { kind: "service-list" });
  assert.deepEqual(parseLabCommand("tracepath 203.0.113.10").operation, { kind: "trace", target: "203.0.113.10", tool: "tracepath" });
  assert.deepEqual(parseLabCommand("resolvectl status").operation, { kind: "resolver", tool: "resolvectl" });
  assert.deepEqual(parseLabCommand("cat /etc/resolv.conf").operation, { kind: "resolver", tool: "resolv-conf" });
  assert.deepEqual(parseLabCommand("smbstatus --shares").operation, { kind: "show-shares" });
  assert.deepEqual(parseLabCommand("stat /srv/freigabe").operation, { kind: "list-directory", path: "/srv/freigabe", tool: "stat" });
  assert.deepEqual(parseLabCommand("SHOW VLAN").operation, { kind: "show-vlan" });
  assert.deepEqual(parseLabCommand("show interfaces").operation, { kind: "show-interfaces" });
  assert.deepEqual(parseLabCommand("show interfaces switchport").operation, { kind: "show-switchport" });
  assert.deepEqual(parseLabCommand("show mac address-table").operation, { kind: "show-mac-address-table" });
  assert.deepEqual(parseLabCommand("show ip interface brief").operation, { kind: "show-ip-interface-brief" });
  assert.deepEqual(parseLabCommand("show ip route").operation, { kind: "show-ip-route" });
  assert.deepEqual(parseLabCommand("show firewall").operation, { kind: "show-firewall" });
  assert.deepEqual(parseLabCommand("show dns records").operation, { kind: "show-dns" });
  assert.deepEqual(parseLabCommand("show dhcp options").operation, { kind: "show-dhcp" });
  assert.throws(() => parseLabCommand("whoami"), (error) => error instanceof LabCommandError && error.code === "unsupported");
  assert.throws(() => parseLabCommand("a".repeat(MAX_LAB_COMMAND_LENGTH + 1)), (error) => error instanceof LabCommandError && error.code === "too-long");
  for (const command of ["ping 8.8.8.8; whoami", "ping 8.8.8.8 | more", "ip a > /tmp/x", "echo $(whoami)", "echo `whoami`", "ip a\nwhoami"]) {
    assert.throws(() => parseLabCommand(command), LabCommandError, command);
  }
  const state = cloneInitialLabState(requiredDefinition("dns-client-001"));
  const before = structuredClone(state);
  assert.throws(() => parseLabCommand("whoami"), LabCommandError);
  assert.deepEqual(state, before);
});

test("arbitrary devices and configuration action types fail closed", () => {
  const definition = requiredDefinition("dns-client-001");
  const state = cloneInitialLabState(definition);
  assert.throws(() => executeLabOperation({ state, deviceId: "unknown", operation: { kind: "help" }, supportedCommands: ["help"] }), LabCommandError);
  assert.throws(() => applyLabConfiguration({ state, deviceId: "client", action: { kind: "set-service-state", service: "dns", state: "running" }, allowedControls: definition.deviceRules.client.controls }), LabCommandError);

  const backend = requiredDefinition("application-backend-001");
  assert.throws(() => configure(backend, cloneInitialLabState(backend), "web", { kind: "set-service-state", service: "nginx", state: "running" }), LabCommandError);
  const dnsRecord = requiredDefinition("dns-record-001");
  assert.throws(() => configure(dnsRecord, cloneInitialLabState(dnsRecord), "dns", { kind: "set-dns-record", hostname: "other.firma.test", address: "192.168.10.80" }), LabCommandError);
  const dhcpOptions = requiredDefinition("dhcp-options-001");
  assert.throws(() => configure(dhcpOptions, cloneInitialLabState(dhcpOptions), "dhcp", { kind: "set-dhcp-option", option: "gateway", value: "192.168.10.1" }), LabCommandError);
  const webPort = requiredDefinition("web-port-001");
  assert.throws(() => configure(webPort, cloneInitialLabState(webPort), "web", { kind: "set-service-port", service: "ssh", port: 22 }), LabCommandError);
});

test("learner-visible definitions do not serialize solution internals", () => {
  for (const definition of listCurrentLabDefinitions()) {
    const payload = JSON.stringify(definition.public);
    assert.doesNotMatch(payload, /rootCause|expectedFix|validator|wrong-dns|0750 statt 2770/);
    assert.ok(definition.review.rootCause.length > 0);
  }
});

test("simulation sources contain no real execution, filesystem or outbound-network primitive", async () => {
  const sources = await Promise.all([
    readFile(new URL("../src/app/lib/lab-engine.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/lib/server/lab-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/lib/server/lab-definitions.ts", import.meta.url), "utf8"),
  ]);
  const combined = sources.join("\n");
  assert.doesNotMatch(combined, /node:child_process|\bexecSync\b|\bspawnSync\b|Docker|docker\.sock|\beval\s*\(|\bfetch\s*\(|node:fs/);
  assert.match(combined, /record\.status === "completed" \? \{/);
  assert.match(combined, /\} : undefined/);
});

test("server action architecture rechecks unlocks and never accepts completion proof", async () => {
  const source = await readFile(new URL("../src/app/lib/server/lab-service.ts", import.meta.url), "utf8");
  assert.match(source, /await assertUnlocked\(user\.id, user\.role, definition/);
  assert.match(source, /record\.status === "in_progress"/);
  assert.match(source, /requiredLabCompletions: \[\]/);
  assert.match(source, /completedLabIds/);
  assert.match(source, /completed: isLabComplete\(context\.definition/);
  assert.doesNotMatch(source, /completed\s*=\s*data\./);
  assert.doesNotMatch(source, /awardCanonicalXp|recordQuizProgress|setLessonProgressCompleted/);
});

test("0017 schema and repository enforce ownership, active uniqueness, locking and immutable completion", async () => {
  const [migration, repository] = await Promise.all([
    readFile(new URL("../db/migrations/0017_interactive_labs.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/app/lib/server/lab-repository.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(migration, /CREATE UNIQUE INDEX interactive_lab_attempts_one_active[\s\S]*WHERE status = 'in_progress'/);
  assert.match(migration, /mode IN \('learner', 'preview'\)/);
  assert.match(migration, /completed interactive lab attempt is immutable/);
  assert.match(migration, /CREATE TABLE interactive_lab_events/);
  assert.match(repository, /WHERE id = \$1 AND user_id = \$2 AND mode = \$3/);
  assert.match(repository, /FOR UPDATE/);
  assert.match(repository, /state_revision = \$9/);
  assert.doesNotMatch(`${migration}\n${repository}`, /INSERT INTO xp_events|INSERT INTO lesson_progress|INSERT INTO quiz_progress/);
});

test("Labs are a first-class destination in shared desktop and mobile navigation", async () => {
  const nav = await readFile(new URL("../src/app/components/navigation/navigation-model.ts", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../src/app/components/navigation/mobile-navigation.tsx", import.meta.url), "utf8");
  const learning = await readFile(new URL("../src/app/lernen/page.tsx", import.meta.url), "utf8");
  assert.match(nav, /href: "\/labs"/);
  assert.match(nav, /href: "\/labs"[\s\S]*section: "primary"[\s\S]*surfaces: bothSurfaces/);
  assert.match(mobile, /getNavigationItems\("mobile", learner\)/);
  assert.match(learning, /href="\/labs"/);
});

test("normal Lab entry uses shared non-persistent disclosures while preserving tutorial and catalogue guidance", async () => {
  const [page, workspace, catalogue, definitions] = await Promise.all([
    readFile(new URL("../src/app/labs/[labId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/components/labs/lab-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/components/labs/lab-catalogue.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/lib/server/lab-definitions.ts", import.meta.url), "utf8"),
  ]);

  assert.equal(page.match(/view\.definition\.summary/g)?.length, 1);
  assert.match(page, /view\.definition\.kind === "tutorial" \? \([\s\S]*view\.definition\.summary[\s\S]*\) : null/);
  assert.match(catalogue, /\{card\.summary\}/);
  assert.match(workspace, /function LabBriefing[\s\S]*kind === "tutorial" \? <ScenarioTask[\s\S]*: <NormalLabBriefing/);
  assert.equal(workspace.match(/<LabBriefing\b/g)?.length, 4);
  assert.match(workspace, /<details className="rounded-2xl border border-slate-200 bg-white shadow-sm">/);
  assert.doesNotMatch(workspace, /<details open className="rounded-2xl border border-slate-200 bg-white shadow-sm">/);
  assert.match(workspace, /<h2 className="inline text-sm font-bold text-slate-950">Ausgangssituation<\/h2>/);
  assert.match(workspace, />\{scenario\}<\/p>/);
  assert.match(workspace, /<details open className="rounded-2xl border border-blue-300 bg-blue-50 shadow-sm">/);
  assert.match(workspace, /<h2 className="inline text-sm font-bold text-blue-950">Aufgabe<\/h2>/);
  assert.match(workspace, />\{task\}<\/p>/);
  assert.doesNotMatch(workspace, /WorkflowDisclosure|CompactWorkflow|Orientierung:|Analysieren → Beheben → Überprüfen/);
  assert.doesNotMatch(workspace, /localStorage|sessionStorage|document\.cookie|useSearchParams/);
  assert.match(workspace, /Vorschau-Modus · keine XP, kein Lernendenfortschritt/);
  assert.match(workspace, /Willkommen im Lab-Tutorial/);
  assert.match(workspace, /function TutorialGuide/);
  assert.match(workspace, /<LabTopology attempt=\{attempt\}/);
  assert.equal(definitions.match(/kind: "troubleshooting"/g)?.length, 16);
});

test("workspace uses visual topology, persistent terminal transcript and blank configuration forms without passive diagnostics", async () => {
  const [workspace, catalogue, service, topology, terminal, configuration] = await Promise.all([
    readFile(new URL("../src/app/components/labs/lab-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/components/labs/lab-catalogue.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/lib/server/lab-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/components/labs/lab-topology.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/components/labs/lab-terminal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/components/labs/lab-configuration.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(workspace, /Orientierung:|Analysieren → Beheben → Überprüfen/);
  assert.match(workspace, /Ausgangssituation/);
  assert.match(workspace, /Aufgabe/);
  assert.doesNotMatch(workspace, /function LabWorkflowGuide/);
  assert.match(workspace, /Willkommen im Lab-Tutorial/);
  assert.match(workspace, /Schritt 8 von 8/);
  assert.match(workspace, /sticky top-2/);
  assert.match(workspace, /lg:grid-cols-\[minmax\(16rem,0\.8fr\)_minmax\(0,2\.2fr\)\]/);
  assert.match(workspace, /aria-live="polite"/);
  assert.match(workspace, /aria-atomic="true"/);
  assert.match(workspace, /motion-reduce:transition-none/);
  assert.match(workspace, /Aktualisiert/);
  assert.match(workspace, /Tutorial abgeschlossen/);
  assert.match(workspace, /Normale Labs nutzen dieselben Werkzeuge/);
  assert.match(workspace, /Normale Labs ansehen/);
  assert.match(workspace, /Tutorial erneut starten/);
  assert.match(workspace, /Konfiguration korrigiert – Funktionsprüfung noch offen/);
  assert.match(workspace, /Konfiguration geändert – Vorfall noch nicht gelöst/);
  assert.match(workspace, /Eine geänderte Konfiguration allein/);
  assert.doesNotMatch(workspace, /Ausgewähltes Gerät|selectedDeviceDetails|statusText/);
  assert.match(topology, /buildLabTopologyLayout\(attempt\.devices, attempt\.topology\.links\)/);
  assert.match(topology, /<line x1=/);
  assert.match(topology, /aria-pressed=\{node\.selected\}/);
  assert.match(topology, /✓ <\/span>Aktiv/);
  assert.doesNotMatch(topology, /Erreichbar|IPv4|Gateway|DNS-Server|statusText/);
  assert.match(terminal, /role="log"/);
  assert.match(terminal, /entry\.command/);
  assert.match(terminal, /entry\.output/);
  assert.match(terminal, /scrollHeight - target\.scrollTop/);
  assert.match(configuration, /ipv4Address: "", prefixLength: "", gateway: "", dnsServer: ""/);
  assert.match(configuration, /Leer = unverändert/);
  assert.match(configuration, /kind: "set-network-configuration"/);
  assert.doesNotMatch(configuration, /currentValue|Aktuell:/);
  assert.doesNotMatch(service, /selectedDeviceDetails|statusText|currentValue|deviceDetails\(|deviceStatus\(/);
  assert.match(service, /withPresentationCommands/);
  assert.match(catalogue, /Einführung/);
  assert.match(catalogue, /Troubleshooting-Labs/);
  assert.match(catalogue, /Schließe zuerst das Einführungslab ab/);
  assert.match(service, /repairComplete = definition\.validate\(state\)/);
  assert.match(service, /verificationComplete = hasRequiredLabVerification/);
});

function requiredDefinition(id: string) {
  const definition = findCurrentLabDefinition(id);
  assert.ok(definition);
  return definition;
}

function run(definition: ServerLabDefinition, state: SimulatedLabState, deviceId: string, command: string) {
  const parsed = parseLabCommand(command);
  return executeLabOperation({ state, deviceId, operation: parsed.operation, supportedCommands: definition.deviceRules[deviceId].commands, dhcpLease: definition.dhcpLease, dnsHosts: definition.dnsHosts, httpRequiredServices: definition.httpRequiredServices });
}

function configure(definition: ServerLabDefinition, state: SimulatedLabState, deviceId: string, action: LabConfigurationAction) {
  return applyLabConfiguration({ state, deviceId, action, allowedControls: definition.deviceRules[deviceId].controls, dhcpLease: definition.dhcpLease }).state;
}
