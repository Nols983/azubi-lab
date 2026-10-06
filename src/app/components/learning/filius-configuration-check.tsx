"use client";

import { useId, useState } from "react";

const options = [
  { id: "valid", label: "IP 192.168.10.70 · Maske 255.255.255.192 · Gateway 192.168.10.65", feedback: "Richtig: Die Hostadresse liegt in Subnetz B, die Maske entspricht /26 und das Gateway ist im lokalen Subnetz erreichbar." },
  { id: "mask", label: "IP 192.168.10.70 · Maske 255.255.255.0 · Gateway 192.168.10.65", feedback: "Die Maske ist falsch. Der Plan verwendet /26; das entspricht 255.255.255.192." },
  { id: "gateway", label: "IP 192.168.10.70 · Maske 255.255.255.192 · Gateway 192.168.10.1", feedback: "Das Gateway gehört zu Subnetz A. Ein Standardgateway muss aus dem lokalen Subnetz erreichbar sein; hier ist 192.168.10.65 vorgesehen." },
  { id: "network", label: "IP 192.168.10.64 · Maske 255.255.255.192 · Gateway 192.168.10.65", feedback: "192.168.10.64 ist die Netzadresse von Subnetz B und keine gewöhnliche Hostadresse." },
  { id: "broadcast", label: "IP 192.168.10.127 · Maske 255.255.255.192 · Gateway 192.168.10.65", feedback: "192.168.10.127 ist die Broadcast-Adresse von Subnetz B und keine gewöhnliche Hostadresse." },
] as const;

export function FiliusConfigurationCheck() {
  const headingId = useId();
  const [selected, setSelected] = useState<string>();
  const [result, setResult] = useState<"idle" | "unanswered" | "checked">("idle");
  const choice = options.find((option) => option.id === selected);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(selected ? "checked" : "unanswered");
  }

  function reset() {
    setSelected(undefined);
    setResult("idle");
  }

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Konfigurationscheck</p>
      <h2 id={headingId} className="mt-2 text-xl font-bold text-slate-950">Welche Konfiguration ist für PC-B1 gültig?</h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">Prüfe IP-Adresse, Maske und lokal erreichbares Gateway, bevor du die Werte in Filius einträgst.</p>
      <form className="mt-5" onSubmit={submit}>
        <fieldset>
          <legend className="sr-only">Eine Konfiguration für PC-B1 auswählen</legend>
          <div className="space-y-3">
            {options.map((option) => (
              <label key={option.id} className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 hover:border-blue-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600">
                <input type="radio" name="pc-b1-configuration" value={option.id} checked={selected === option.id} onChange={() => { setSelected(option.id); setResult("idle"); }} className="mt-1 size-5 shrink-0 accent-blue-700" />
                <span className="min-w-0 break-words font-mono">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Antwort prüfen</button>
          <button type="button" onClick={reset} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zurücksetzen</button>
        </div>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {result === "unanswered" && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold text-slate-800">Wähle zuerst eine Konfiguration aus.</p>}
        {result === "checked" && choice && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${choice.id === "valid" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white text-slate-800"}`}><p className="font-bold">{choice.id === "valid" ? "Richtig konfiguriert" : "Noch nicht richtig"}</p><p className="mt-1">{choice.feedback}</p>{choice.id !== "valid" && <p className="mt-2">Ändere die Auswahl und prüfe erneut.</p>}</div>}
      </div>
    </section>
  );
}
