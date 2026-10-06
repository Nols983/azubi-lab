"use client";

import { useId, useState } from "react";

type MatchItem = {
  prompt: string;
  answer: string;
  explanation: string;
};

const addressItems: readonly MatchItem[] = [
  { prompt: "192.168.10.50/24 ↔ 192.168.10.80/24", answer: "gleiches Subnetz", explanation: "Beide liegen in 192.168.10.0/24." },
  { prompt: "192.168.10.50/24 ↔ 192.168.20.80/24", answer: "verschiedene Subnetze", explanation: "Die /24-Netze 192.168.10.0 und 192.168.20.0 sind verschieden." },
  { prompt: "127.0.0.1", answer: "Loopback", explanation: "127.0.0.0/8 ist der IPv4-Loopbackbereich." },
  { prompt: "169.254.10.20", answer: "IPv4 Link-Local", explanation: "169.254.0.0/16 ist IPv4 Link-Local und bei Windows häufig APIPA-bezogen." },
];

export function NetworkAddressClassificationCheck() {
  const titleId = useId();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const options = addressItems.map((item) => item.answer);
  const incorrect = addressItems.filter((item) => answers[item.prompt] !== item.answer);

  function reset() {
    setAnswers({});
    setChecked(false);
    setIncomplete(false);
  }

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Übung</p>
      <h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">Adressen und Netzbeziehungen einordnen</h2>
      <form className="mt-5" onSubmit={(event) => {
        event.preventDefault();
        const complete = addressItems.every((item) => answers[item.prompt]);
        setIncomplete(!complete);
        setChecked(complete);
      }}>
        <fieldset>
          <legend className="font-semibold text-slate-900">Ordne jeder Angabe die passende Bedeutung zu.</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {addressItems.map((item) => (
              <label key={item.prompt} className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600">
                <code className="break-words">{item.prompt}</code>
                <select className="min-h-12 min-w-0 rounded-lg border border-slate-300 bg-white px-3" value={answers[item.prompt] ?? ""} onChange={(event) => { setAnswers((current) => ({ ...current, [item.prompt]: event.target.value })); setChecked(false); setIncomplete(false); }}>
                  <option value="">Bitte auswählen</option>
                  {options.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="min-h-12 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Antworten prüfen</button>
          <button type="button" onClick={reset} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zurücksetzen</button>
        </div>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {incomplete && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold">Beantworte zuerst alle Zuordnungen.</p>}
        {checked && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${incorrect.length === 0 ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white"}`}><p className="font-bold">{incorrect.length === 0 ? "Alle Zuordnungen sind richtig." : "Einige Zuordnungen brauchen noch eine Korrektur."}</p>{incorrect.map((item) => <p key={item.prompt} className="mt-2"><strong>{item.prompt}:</strong> {item.explanation}</p>)}</div>}
      </div>
    </section>
  );
}

const symptomItems: readonly MatchItem[] = [
  { prompt: "169.254.x.x", answer: "DHCP / lokale Konfiguration", explanation: "Link-Local lenkt die Untersuchung auf lokale Konfiguration und den DHCP-Bezugspfad." },
  { prompt: "NXDOMAIN", answer: "DNS", explanation: "Der DNS-Namespace beziehungsweise seine Daten sind der nächste Untersuchungsbereich." },
  { prompt: "Gateway erreichbar, Remotenetz nicht", answer: "Routing / Pfad", explanation: "Der lokale erste Hop funktioniert; weiterführender Hin- und Rückweg sind zu untersuchen." },
  { prompt: "TCP connection refused", answer: "Listener / Dienst / Port", explanation: "Der TCP-Endpunkt wurde aktiv abgelehnt; Listener, Dienst, Port und ablehnende Policy sind relevant." },
  { prompt: "HTTP 404", answer: "Ressource / Anwendungsrouting", explanation: "HTTP hat geantwortet; die angeforderte Ressource oder das Anwendungsrouting ist der nächste Bereich." },
  { prompt: "HTTP 503", answer: "Dienst / Backend", explanation: "Der Frontend-Dienst hat geantwortet und meldet fehlende Verfügbarkeit; Dienst und Backend sind zu untersuchen." },
];

export function TroubleshootingSymptomClassificationCheck() {
  const titleId = useId();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const options = symptomItems.map((item) => item.answer);
  const incorrect = symptomItems.filter((item) => answers[item.prompt] !== item.answer);

  function reset() {
    setAnswers({});
    setChecked(false);
    setIncomplete(false);
  }

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Übung</p>
      <h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">Symptom zur nächsten Untersuchungsschicht zuordnen</h2>
      <form className="mt-5" onSubmit={(event) => {
        event.preventDefault();
        const complete = symptomItems.every((item) => answers[item.prompt]);
        setIncomplete(!complete);
        setChecked(complete);
      }}>
        <fieldset>
          <legend className="font-semibold text-slate-900">Wähle den stärksten nächsten Untersuchungsbereich – nicht eine vorschnelle Grundursache.</legend>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {symptomItems.map((item) => (
              <label key={item.prompt} className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600">
                <code className="break-words">{item.prompt}</code>
                <select aria-label={`Untersuchungsbereich für ${item.prompt}`} className="min-h-12 min-w-0 rounded-lg border border-slate-300 bg-white px-3" value={answers[item.prompt] ?? ""} onChange={(event) => { setAnswers((current) => ({ ...current, [item.prompt]: event.target.value })); setChecked(false); setIncomplete(false); }}>
                  <option value="">Bitte auswählen</option>
                  {options.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="min-h-12 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Antworten prüfen</button>
          <button type="button" onClick={reset} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zurücksetzen</button>
        </div>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {incomplete && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold">Beantworte zuerst alle Zuordnungen.</p>}
        {checked && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${incorrect.length === 0 ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white"}`}><p className="font-bold">{incorrect.length === 0 ? "Alle Zuordnungen sind richtig." : "Einige Zuordnungen brauchen noch eine Korrektur."}</p>{incorrect.map((item) => <p key={item.prompt} className="mt-2"><strong>{item.prompt}:</strong> {item.explanation}</p>)}</div>}
      </div>
    </section>
  );
}
