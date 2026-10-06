"use client";

import type { LabAttemptView } from "../../lib/interactive-lab.ts";
import { buildLabTopologyLayout, type LabDeviceVisual, type LabTopologyNode } from "../../lib/lab-workspace-model.ts";

export function LabTopology({ attempt, pending, select }: {
  attempt: LabAttemptView;
  pending: boolean;
  select: (deviceId: string) => void;
}) {
  const layout = buildLabTopologyLayout(attempt.devices, attempt.topology.links);
  return (
    <section aria-labelledby="topology-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 id="topology-heading" className="text-xl font-bold text-slate-950">Netzwerktopologie</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Die Abbildungen zeigen Geräte und Kabel, aber keine Diagnosewerte. Wähle ein Gerät mit Klick oder Tastatur aus.</p>

      <div className="relative mt-5 hidden h-[23rem] rounded-2xl border border-slate-200 bg-slate-50/80 md:block">
        <svg aria-hidden="true" viewBox="0 0 1000 380" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {layout.connections.map((connection) => <g key={connection.key}>
            <line x1={connection.x1} y1={connection.y1} x2={connection.x2} y2={connection.y2} className="stroke-slate-400" strokeWidth="4" vectorEffect="non-scaling-stroke" />
            <circle cx={connection.x1} cy={connection.y1} r="6" className="fill-slate-500" vectorEffect="non-scaling-stroke" />
            <circle cx={connection.x2} cy={connection.y2} r="6" className="fill-slate-500" vectorEffect="non-scaling-stroke" />
            {connection.label && <text x={(connection.x1 + connection.x2) / 2} y={(connection.y1 + connection.y2) / 2 - 10} textAnchor="middle" className="fill-slate-600 text-[20px] font-semibold">{connection.label}</text>}
          </g>)}
        </svg>
        <ul className="absolute inset-0">
          {layout.nodes.map((node) => <li key={node.id} className="absolute w-40 -translate-x-1/2 -translate-y-1/2" style={{ left: `${node.x / 10}%`, top: `${node.y / 3.8}%` }}><DeviceNode node={node} pending={pending} select={select} /></li>)}
        </ul>
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3 md:hidden">
        {layout.nodes.map((node) => <li key={node.id}><DeviceNode node={node} pending={pending} select={select} /></li>)}
      </ul>

      <section aria-labelledby="connections-heading" className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 md:sr-only">
        <h3 id="connections-heading" className="text-sm font-bold text-slate-900">Kabelverbindungen</h3>
        <ul className="mt-3 space-y-3">
          {layout.connections.map((connection) => <li key={connection.key} className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="min-w-0 max-w-[35%] truncate">{connection.fromLabel}</span>
            <span aria-hidden="true" className="h-0.5 min-w-6 flex-1 bg-slate-400" />
            {connection.label && <span className="shrink-0 text-[0.68rem] text-slate-500">{connection.label}</span>}
            <span aria-hidden="true" className="h-0.5 min-w-6 flex-1 bg-slate-400" />
            <span className="min-w-0 max-w-[35%] truncate text-right">{connection.toLabel}</span>
          </li>)}
        </ul>
      </section>
    </section>
  );
}

function DeviceNode({ node, pending, select }: { node: LabTopologyNode; pending: boolean; select: (deviceId: string) => void }) {
  return <button
    type="button"
    disabled={pending}
    aria-pressed={node.selected}
    aria-label={`${node.label}, ${node.typeLabel}${node.selected ? ", ausgewählt" : ""}`}
    onClick={() => select(node.id)}
    className={`relative flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 px-3 py-4 text-center shadow-sm transition focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60 ${node.selected ? "border-blue-700 bg-blue-50 ring-4 ring-blue-200" : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40"}`}
  >
    {node.selected && <span className="absolute right-2 top-2 rounded-full bg-blue-800 px-2 py-1 text-[0.65rem] font-black uppercase tracking-wide text-white"><span aria-hidden="true">✓ </span>Aktiv</span>}
    <DeviceIllustration visual={node.visual} />
    <strong className="mt-2 block max-w-full truncate text-sm text-slate-950">{node.label}</strong>
    <span className="mt-0.5 block text-xs text-slate-600">{node.typeLabel}</span>
  </button>;
}

function DeviceIllustration({ visual }: { visual: LabDeviceVisual }) {
  const common = "h-14 w-16 text-blue-950";
  if (visual === "workstation") return <svg aria-hidden="true" viewBox="0 0 64 56" className={common}><rect x="7" y="5" width="50" height="34" rx="4" fill="currentColor" /><rect x="11" y="9" width="42" height="25" rx="2" className="fill-blue-100" /><path d="M26 39h12v7h9v5H17v-5h9z" fill="currentColor" /></svg>;
  if (visual === "server") return <svg aria-hidden="true" viewBox="0 0 64 56" className={common}><rect x="13" y="3" width="38" height="50" rx="5" fill="currentColor" /><rect x="18" y="9" width="28" height="9" rx="2" className="fill-blue-100" /><rect x="18" y="23" width="28" height="9" rx="2" className="fill-blue-100" /><rect x="18" y="37" width="28" height="9" rx="2" className="fill-blue-100" /><circle cx="22" cy="13.5" r="1.5" className="fill-emerald-500" /><circle cx="22" cy="27.5" r="1.5" className="fill-emerald-500" /><circle cx="22" cy="41.5" r="1.5" className="fill-emerald-500" /></svg>;
  if (visual === "switch") return <svg aria-hidden="true" viewBox="0 0 64 56" className={common}><rect x="4" y="17" width="56" height="25" rx="5" fill="currentColor" /><g className="fill-blue-100">{[10, 19, 28, 37, 46].map((x) => <rect key={x} x={x} y="25" width="6" height="6" rx="1" />)}</g><path d="M17 12h30l-5-6M47 12l-5 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (visual === "router") return <svg aria-hidden="true" viewBox="0 0 64 56" className={common}><path d="M17 20L10 7M47 20l7-13" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /><rect x="8" y="19" width="48" height="27" rx="7" fill="currentColor" /><path d="M19 32h26M19 32l6-6M19 32l6 6M45 32l-6-6M45 32l-6 6" className="stroke-blue-100" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (visual === "firewall") return <svg aria-hidden="true" viewBox="0 0 64 56" className={common}><path d="M32 3l22 8v15c0 14-9 23-22 28C19 49 10 40 10 26V11z" fill="currentColor" /><path d="M18 20h28M18 29h28M18 38h28M25 13v7M39 13v7M25 29v9M39 20v9" className="stroke-blue-100" fill="none" strokeWidth="4" /></svg>;
  if (visual === "internet") return <svg aria-hidden="true" viewBox="0 0 64 56" className={common}><path d="M18 44h31a11 11 0 000-22h-1A17 17 0 0016 18a13 13 0 002 26z" fill="currentColor" /><path d="M19 32h30" className="stroke-blue-100" strokeWidth="3" strokeLinecap="round" /></svg>;
  return null;
}
