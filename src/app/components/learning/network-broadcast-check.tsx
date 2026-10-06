"use client";

import { useId, useState } from "react";

type NetworkAnswer = "network" | "original" | "broadcast";
type BroadcastAnswer = "network" | "last-host" | "broadcast";

const networkOptions: readonly { value: NetworkAnswer; label: string }[] = [
  { value: "network", label: "192.168.50.0" },
  { value: "original", label: "192.168.50.73" },
  { value: "broadcast", label: "192.168.50.255" },
];

const broadcastOptions: readonly { value: BroadcastAnswer; label: string }[] = [
  { value: "network", label: "192.168.50.0" },
  { value: "last-host", label: "192.168.50.254" },
  { value: "broadcast", label: "192.168.50.255" },
];

export function NetworkBroadcastCheck() {
  const titleId = useId();
  const [network, setNetwork] = useState<NetworkAnswer>();
  const [broadcast, setBroadcast] = useState<BroadcastAnswer>();
  const [hasChecked, setHasChecked] = useState(false);
  const [isIncomplete, setIsIncomplete] = useState(false);
  const isCorrect = network === "network" && broadcast === "broadcast";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const incomplete = !network || !broadcast;
    setIsIncomplete(incomplete);
    setHasChecked(!incomplete);
  }

  function networkFeedback() {
    if (network === "original") return "192.168.50.73 ist die ursprüngliche Hostadresse. Für die Netzadresse müssen die letzten 8 Hostbits auf 0 gesetzt werden.";
    if (network === "broadcast") return "192.168.50.255 hat alle Hostbits auf 1 und ist deshalb in diesem /24 die Broadcast-Adresse, nicht die Netzadresse.";
    return "Bei /24 sind die letzten 8 Bit Hostbits. Für die Netzadresse werden alle Hostbits auf 0 gesetzt.";
  }

  function broadcastFeedback() {
    if (broadcast === "network") return "192.168.50.0 ist die Netzadresse: Dort sind alle Hostbits 0. Für Broadcast müssen sie 1 sein.";
    if (broadcast === "last-host") return "192.168.50.254 ist in diesem /24 die letzte gewöhnliche Hostadresse, nicht die Broadcast-Adresse.";
    return "Für die Broadcast-Adresse werden bei diesem /24-Netz alle 8 Hostbits auf 1 gesetzt. Das ergibt im letzten Oktett 255.";
  }

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Übung</p>
      <h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">Netzadresse und Broadcast bestimmen</h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">Gegeben sind <code className="font-bold">192.168.50.73</code> und die Maske <code className="font-bold">255.255.255.0</code>, also ausdrücklich ein <code className="font-bold">/24</code>-Beispiel. Wähle beide gesuchten Adressen.</p>
      <form className="mt-5" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <AnswerGroup legend="Netzadresse" name="network-address" options={networkOptions} selected={network} onChange={(answer) => { setNetwork(answer); setHasChecked(false); setIsIncomplete(false); }} />
          <AnswerGroup legend="Broadcast-Adresse" name="broadcast-address" options={broadcastOptions} selected={broadcast} onChange={(answer) => { setBroadcast(answer); setHasChecked(false); setIsIncomplete(false); }} />
        </div>
        <button type="submit" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{hasChecked ? "Antworten erneut prüfen" : "Antworten prüfen"}</button>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {isIncomplete && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold text-slate-800">Wähle zuerst eine Netzadresse und eine Broadcast-Adresse aus.</p>}
        {hasChecked && (
          <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white text-slate-800"}`}>
            <p className="font-bold">{isCorrect ? "Beide Adressen sind richtig." : "Noch nicht vollständig richtig."}</p>
            <p className="mt-2"><strong>Netzadresse:</strong> {networkFeedback()}</p>
            <p className="mt-2"><strong>Broadcast-Adresse:</strong> {broadcastFeedback()}</p>
            {!isCorrect && <p className="mt-2">Du kannst beide Antworten ändern und anschließend erneut prüfen.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

function AnswerGroup<T extends string>({ legend, name, options, selected, onChange }: { legend: string; name: string; options: readonly { value: T; label: string }[]; selected: T | undefined; onChange: (answer: T) => void }) {
  return (
    <fieldset className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <legend className="px-1 font-bold text-slate-950">{legend}</legend>
      <div className="mt-2 space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600">
            <input type="radio" name={name} value={option.value} checked={selected === option.value} onChange={() => onChange(option.value)} className="size-5 shrink-0 accent-blue-700" />
            <code className="break-all">{option.label}</code>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
