"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { LabAttemptView } from "../../lib/interactive-lab.ts";
import { getLabDeviceTypeLabel } from "../../lib/lab-workspace-model.ts";

export function LabTerminal({ attempt, pending, submit }: {
  attempt: LabAttemptView;
  pending: boolean;
  submit: (command: string) => void;
}) {
  const [command, setCommand] = useState("");
  const scrollbackRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const selected = attempt.devices.find((device) => device.id === attempt.selectedDeviceId)!;
  const latest = attempt.terminalTranscript.at(-1);

  useEffect(() => {
    const scrollback = scrollbackRef.current;
    if (!scrollback) return;
    if (attempt.terminalTranscript.length === 0) scrollback.scrollTop = 0;
    else if (followLatestRef.current) scrollback.scrollTop = scrollback.scrollHeight;
  }, [attempt.terminalTranscript]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!command.trim()) return;
    followLatestRef.current = true;
    submit(command);
    setCommand("");
  };

  return <section aria-labelledby="terminal-heading" className="flex min-w-0 flex-col rounded-2xl border border-slate-700 bg-slate-950 p-4 text-slate-100 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-300">Aktives Gerät · {getLabDeviceTypeLabel(selected.type)}</p><h2 id="terminal-heading" className="mt-1 text-xl font-bold">Terminal — {selected.label}</h2></div>
      <span className="rounded-full border border-emerald-700 bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-200">Simulation</span>
    </div>
    <p className="mt-2 text-sm leading-6 text-slate-300">Befehle laufen ausschließlich in der deterministischen Lab-Simulation.</p>
    <details className="mt-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-blue-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">Befehlshilfe für {selected.label}</summary>
      <ul className="mt-2 space-y-2 pb-2 text-xs leading-5 text-slate-300">{attempt.supportedCommands.map((description) => <li key={description}>{description}</li>)}</ul>
    </details>
    <div
      ref={scrollbackRef}
      role="log"
      aria-live="off"
      aria-label={`Terminalverlauf für ${selected.label}`}
      tabIndex={0}
      onScroll={(event) => {
        const target = event.currentTarget;
        followLatestRef.current = target.scrollHeight - target.scrollTop - target.clientHeight < 72;
      }}
      className="mt-4 h-72 max-w-full overflow-auto rounded-xl border border-slate-800 bg-black/50 p-4 font-mono text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:h-80"
    >
      {attempt.terminalTranscript.length === 0
        ? <p className="font-sans text-sm text-slate-400">Noch keine sichtbare Terminalausgabe. Starte mit <code className="font-mono text-blue-200">help</code>.</p>
        : attempt.terminalTranscript.map((entry, index) => {
          const device = attempt.devices.find((candidate) => candidate.id === entry.deviceId);
          return <div key={`${index}-${entry.deviceId}-${entry.command}`} className="mb-5 last:mb-0">
            <p className="break-words"><span className="font-bold text-emerald-300">{device?.label ?? entry.deviceId}&gt;</span> <span className="text-white">{entry.command}</span></p>
            {entry.output && <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-slate-200">{entry.output}</pre>}
          </div>;
        })}
      <p aria-hidden="true" className="mt-4 text-emerald-300">{selected.label}&gt; <span className="animate-pulse">▌</span></p>
    </div>
    <p className="sr-only" aria-live="polite">{latest ? `${latest.command} ausgeführt. Neue Ausgabe im Terminalverlauf.` : "Die sichtbare Terminalanzeige ist leer."}</p>
    <form onSubmit={handleSubmit} className="mt-4">
      <label htmlFor="lab-command" className="block text-sm font-bold">Befehl für {selected.label}</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <span aria-hidden="true" className="pt-3 font-mono text-emerald-300">{selected.label}&gt;</span>
        <input id="lab-command" value={command} onChange={(event) => setCommand(event.target.value)} maxLength={160} autoComplete="off" spellCheck={false} placeholder="help" className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 font-mono text-base text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400" />
        <button disabled={pending} className="min-h-12 rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60">Ausführen</button>
      </div>
    </form>
  </section>;
}
