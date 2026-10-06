"use client";

import { useId, useState } from "react";

type Portion = "network" | "host";

export type OctetClassification = {
  value: string;
  correctPortion: Portion;
  explanation: string;
};

export function NetworkHostClassificationCheck({ address, mask, octets }: { address: string; mask: string; octets: readonly OctetClassification[] }) {
  const titleId = useId();
  const [answers, setAnswers] = useState<Record<number, Portion>>({});
  const [hasChecked, setHasChecked] = useState(false);
  const [isIncomplete, setIsIncomplete] = useState(false);
  const allAnswered = octets.every((_, index) => answers[index]);
  const incorrect = octets.map((octet, index) => ({ ...octet, index })).filter((octet) => answers[octet.index] !== octet.correctPortion);
  const isCorrect = allAnswered && incorrect.length === 0;

  function select(index: number, portion: Portion) {
    setAnswers((current) => ({ ...current, [index]: portion }));
    setHasChecked(false);
    setIsIncomplete(false);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsIncomplete(!allAnswered);
    setHasChecked(allAnswered);
  }

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Übung</p>
      <h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">Netzanteil oder Hostanteil?</h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">Ordne alle vier Oktette von <code className="font-bold">{address}</code> für die konkrete Maske <code className="font-bold">{mask}</code> zu. Die Einteilung gilt für diese Maske.</p>
      <form className="mt-5" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          {octets.map((octet, index) => (
            <fieldset key={`${octet.value}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
              <legend className="px-1 font-semibold text-slate-900"><code className="text-lg font-bold text-blue-950">{octet.value}</code> · {index + 1}. Oktett</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["network", "host"] as const).map((portion) => <label key={portion} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600"><input type="radio" name={`octet-${index}`} value={portion} checked={answers[index] === portion} onChange={() => select(index, portion)} className="size-5 accent-blue-700" /><span>{portion === "network" ? "Netzanteil" : "Hostanteil"}</span></label>)}
              </div>
            </fieldset>
          ))}
        </div>
        <button type="submit" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{hasChecked ? "Antworten erneut prüfen" : "Alle Antworten prüfen"}</button>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {isIncomplete && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold text-slate-800">Ordne zuerst alle vier Oktette zu. Danach kannst du deine Antworten prüfen.</p>}
        {hasChecked && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white text-slate-800"}`}><p className="font-bold">{isCorrect ? "Richtig: drei Netz-Oktette, ein Host-Oktett" : "Noch nicht richtig – prüfe die markierten Zuordnungen gedanklich erneut."}</p>{isCorrect ? <p className="mt-1">Die Maske <code>255.255.255.0</code> enthält zuerst 24 Einsen und danach 8 Nullen. Deshalb gehören hier <code>192</code>, <code>168</code> und <code>10</code> zum Netzanteil, <code>25</code> zum Hostanteil.</p> : <div className="mt-2 space-y-2">{incorrect.map((octet) => <p key={octet.index}><code className="font-bold">{octet.value}</code>: {octet.explanation}</p>)}<p>Du kannst jede Auswahl ändern und anschließend erneut prüfen.</p></div>}</div>}
      </div>
    </section>
  );
}
