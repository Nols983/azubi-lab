import type { LabDeviceView, LabPublicDefinition } from "./interactive-lab.ts";

export type LabDeviceVisual = "workstation" | "server" | "switch" | "router" | "firewall" | "internet";

export type LabTopologyNode = LabDeviceView & {
  visual: LabDeviceVisual;
  typeLabel: string;
  x: number;
  y: number;
};

export type LabTopologyConnection = {
  key: string;
  fromId: string;
  toId: string;
  fromLabel: string;
  toLabel: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
};

export function getLabDeviceVisual(type: LabDeviceView["type"]): LabDeviceVisual {
  if (type === "windows-client" || type === "linux-client") return "workstation";
  if (type === "linux-server" || type === "dns-dhcp-server") return "server";
  return type;
}

export function getLabDeviceTypeLabel(type: LabDeviceView["type"]) {
  return ({
    "windows-client": "Windows-Client",
    "linux-client": "Linux-Client",
    "linux-server": "Linux-Server",
    router: "Router",
    switch: "Switch",
    firewall: "Firewall",
    "dns-dhcp-server": "DNS/DHCP-Server",
    internet: "Externes Ziel",
  } as const)[type];
}

export function buildLabTopologyLayout(
  devices: readonly LabDeviceView[],
  links: LabPublicDefinition["topology"]["links"],
) {
  const positions = positionsFor(devices.length);
  const nodes: LabTopologyNode[] = devices.map((device, index) => ({
    ...device,
    visual: getLabDeviceVisual(device.type),
    typeLabel: getLabDeviceTypeLabel(device.type),
    ...(positions[index] ?? { x: 500, y: 180 }),
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const connections: LabTopologyConnection[] = links.map((link, index) => {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (!from || !to) throw new Error("Topology link references an unknown device.");
    return {
      key: `${link.from}-${link.to}-${index}`,
      fromId: link.from,
      toId: link.to,
      fromLabel: from.label,
      toLabel: to.label,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      label: safeConnectionLabel(link.label),
    };
  });
  return { nodes, connections };
}

function safeConnectionLabel(label: string | undefined) {
  if (!label || /(?:^|\D)(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?(?:\D|$)/u.test(label)) return undefined;
  return label;
}

function positionsFor(count: number) {
  const presets: Record<number, readonly { x: number; y: number }[]> = {
    1: [{ x: 500, y: 180 }],
    2: [{ x: 260, y: 180 }, { x: 740, y: 180 }],
    3: [{ x: 150, y: 180 }, { x: 500, y: 180 }, { x: 850, y: 180 }],
    4: [{ x: 140, y: 105 }, { x: 500, y: 105 }, { x: 860, y: 105 }, { x: 500, y: 285 }],
    5: [{ x: 120, y: 105 }, { x: 370, y: 105 }, { x: 630, y: 105 }, { x: 880, y: 105 }, { x: 500, y: 285 }],
    6: [{ x: 120, y: 95 }, { x: 380, y: 95 }, { x: 620, y: 95 }, { x: 880, y: 95 }, { x: 320, y: 285 }, { x: 680, y: 285 }],
  };
  return presets[count] ?? Array.from({ length: count }, (_, index) => ({
    x: 100 + (index % 4) * 265,
    y: 95 + Math.floor(index / 4) * 190,
  }));
}
