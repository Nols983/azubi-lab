"use client";

import { useId, useState } from "react";

type Item = { prompt: string; answer: string; explanation: string };

const conceptItems: readonly Item[] = [
  { prompt: "GET", answer: "HTTP-Methode", explanation: "GET ist die Methode der Anfrage." },
  { prompt: "/index.html", answer: "Request-Target", explanation: "Der Pfad ist hier das Ziel der Anfrage." },
  { prompt: "Host", answer: "Request-Header", explanation: "Host übermittelt den angefragten Hostnamen." },
  { prompt: "200", answer: "Response-Statuscode", explanation: "200 meldet die erfolgreiche HTTP-Verarbeitung." },
  { prompt: "Content-Type", answer: "Medientyp-Metadaten", explanation: "Content-Type beschreibt den Medientyp eines Bodys." },
  { prompt: "HTML-Body", answer: "Response-Inhalt", explanation: "Der Body kann die HTML-Repräsentation enthalten." },
];

const statusItems: readonly Item[] = [
  { prompt: "Ressource erfolgreich ausgeliefert", answer: "200", explanation: "200 OK steht für eine erfolgreiche Antwort." },
  { prompt: "Ressource nicht gefunden", answer: "404", explanation: "404 ist eine HTTP-Antwort: Die Ressource wurde nicht gefunden." },
  { prompt: "Authentifizierung fehlt oder ist ungültig", answer: "401", explanation: "401 fordert gültige Authentifizierung an." },
  { prompt: "Authentifiziert, aber Zugriff verweigert", answer: "403", explanation: "403 bedeutet, dass der Server den Zugriff verweigert." },
  { prompt: "Proxy erhält keine geeignete Upstream-Antwort", answer: "502", explanation: "502 weist auf eine ungeeignete Antwort des Upstreams hin." },
  { prompt: "Dienst vorübergehend nicht verfügbar", answer: "503", explanation: "503 beschreibt einen aktuell nicht verfügbaren Dienst." },
  { prompt: "Gateway wartet zu lange auf den Upstream", answer: "504", explanation: "504 meldet einen Upstream-Timeout am Gateway." },
];

export function HttpConceptMatchingCheck() { return <MatchingCheck title="HTTP-Bestandteile zuordnen" items={conceptItems} options={["HTTP-Methode", "Request-Target", "Request-Header", "Response-Statuscode", "Medientyp-Metadaten", "Response-Inhalt"]} />; }
export function HttpStatusMatchingCheck() { return <MatchingCheck title="Statuscodes in der Fehlersuche" items={statusItems} options={["200", "401", "403", "404", "502", "503", "504"]} />; }

function MatchingCheck({ title, items, options }: { title: string; items: readonly Item[]; options: readonly string[] }) {
  const titleId = useId();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const allAnswered = items.every((item) => answers[item.prompt]);
  const incorrect = items.filter((item) => answers[item.prompt] !== item.answer);
  function update(prompt: string, value: string) { setAnswers((current) => ({ ...current, [prompt]: value })); setChecked(false); setIncomplete(false); }
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setIncomplete(!allAnswered); setChecked(allAnswered); }
  return <section aria-labelledby={titleId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
    <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Übung</p><h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">{title}</h2>
    <form className="mt-5" onSubmit={submit}><fieldset><legend className="font-semibold text-slate-900">Ordne jedem Beispiel die passende Bedeutung zu.</legend><div className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((item) => <label key={item.prompt} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600"><span>{item.prompt}</span><select value={answers[item.prompt] ?? ""} onChange={(event) => update(item.prompt, event.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Bitte auswählen</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}</div></fieldset><button className="mt-5 min-h-12 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{checked ? "Erneut prüfen" : "Antworten prüfen"}</button></form>
    <div aria-live="polite" aria-atomic="true">{incomplete && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold">Beantworte zuerst alle Zuordnungen.</p>}{checked && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${incorrect.length === 0 ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white"}`}><p className="font-bold">{incorrect.length === 0 ? "Alle Zuordnungen sind richtig." : "Einige Zuordnungen brauchen noch eine Korrektur."}</p>{incorrect.map((item) => <p className="mt-2" key={item.prompt}><strong>{item.prompt}:</strong> {item.explanation}</p>)}{incorrect.length > 0 && <p className="mt-2">Ändere die Auswahl und prüfe erneut.</p>}</div>}</div>
  </section>;
}
