"use client";

import { useId, useState } from "react";

type MatchingItem = { prompt: string; answer: string; explanation: string };

const prefixToMask: readonly MatchingItem[] = [
  { prompt: "/24", answer: "255.255.255.0", explanation: "/24 hat 24 führende 1-Bits; drei volle 1-Oktette ergeben 255.255.255, danach folgen 0-Bits." },
  { prompt: "/25", answer: "255.255.255.128", explanation: "Das 25. Netzbit ist 10000000 im vierten Oktett. Dieser Binärwert entspricht 128." },
  { prompt: "/26", answer: "255.255.255.192", explanation: "Für /26 beginnt das vierte Oktett mit 11000000. Die Gewichte 128 + 64 ergeben 192; 128 allein wären erst /25." },
  { prompt: "/27", answer: "255.255.255.224", explanation: "Für /27 lautet das vierte Oktett 11100000. 128 + 64 + 32 ergeben 224." },
];

const maskToPrefix: readonly MatchingItem[] = [
  { prompt: "255.255.255.0", answer: "/24", explanation: "Drei Oktette mit 255 enthalten zusammen 24 führende 1-Bits." },
  { prompt: "255.255.255.192", answer: "/26", explanation: "Die ersten drei Oktette liefern 24 Netzbits; 192 ist 11000000 und ergänzt zwei weitere." },
  { prompt: "255.255.255.240", answer: "/28", explanation: "240 ist 11110000. Zu den ersten 24 Netzbits kommen vier hinzu: /28." },
];

const maskOptions = ["", "255.255.255.0", "255.255.255.128", "255.255.255.192", "255.255.255.224"];
const prefixOptions = ["", "/24", "/25", "/26", "/27", "/28"];

export function PrefixMaskMatchingCheck() {
  const titleId = useId();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hasChecked, setHasChecked] = useState(false);
  const [isIncomplete, setIsIncomplete] = useState(false);
  const items = [...prefixToMask.map((item) => ({ ...item, direction: "prefix" as const })), ...maskToPrefix.map((item) => ({ ...item, direction: "mask" as const }))];
  const allAnswered = items.every((item) => answers[`${item.direction}-${item.prompt}`]);
  const incorrect = items.filter((item) => answers[`${item.direction}-${item.prompt}`] !== item.answer);
  const isCorrect = allAnswered && incorrect.length === 0;

  function update(key: string, value: string) { setAnswers((current) => ({ ...current, [key]: value })); setHasChecked(false); setIsIncomplete(false); }
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setIsIncomplete(!allAnswered); setHasChecked(allAnswered); }

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Übung</p>
      <h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">Präfix und Maske übersetzen</h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">Ordne jede Angabe zu. Alle Felder müssen beantwortet sein, bevor du prüfst.</p>
      <form className="mt-5 space-y-6" onSubmit={submit}>
        <MatchingGroup legend="Präfix → Subnetzmaske" items={prefixToMask} direction="prefix" options={maskOptions} answers={answers} update={update} />
        <MatchingGroup legend="Subnetzmaske → Präfix" items={maskToPrefix} direction="mask" options={prefixOptions} answers={answers} update={update} />
        <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{hasChecked ? "Antworten erneut prüfen" : "Alle Antworten prüfen"}</button>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {isIncomplete && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold text-slate-800">Beantworte zuerst alle sieben Zuordnungen.</p>}
        {hasChecked && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white text-slate-800"}`}><p className="font-bold">{isCorrect ? "Alle Zuordnungen sind richtig." : "Einige Zuordnungen brauchen noch eine Korrektur."}</p>{isCorrect ? <p className="mt-1">Du hast Präfixlängen und punktierte Subnetzmasken in beide Richtungen korrekt übersetzt.</p> : <div className="mt-2 space-y-2">{incorrect.map((item) => <p key={`${item.direction}-${item.prompt}`}><code className="font-bold">{item.prompt}</code>: {item.explanation} Richtig ist <code className="font-bold">{item.answer}</code>.</p>)}<p>Ändere die Auswahl und prüfe sie erneut.</p></div>}</div>}
      </div>
    </section>
  );
}

function MatchingGroup({ legend, items, direction, options, answers, update }: { legend: string; items: readonly MatchingItem[]; direction: "prefix" | "mask"; options: readonly string[]; answers: Record<string, string>; update: (key: string, value: string) => void }) {
  return <fieldset><legend className="font-bold text-slate-950">{legend}</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{items.map((item) => { const key = `${direction}-${item.prompt}`; return <label key={key} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600"><span><code>{item.prompt}</code> entspricht</span><select value={answers[key] ?? ""} onChange={(event) => update(key, event.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900"><option value="">Bitte auswählen</option>{options.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; })}</div></fieldset>;
}
