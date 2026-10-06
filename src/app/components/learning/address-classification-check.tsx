"use client";

import { useId, useState } from "react";

export type AddressCategory = "private" | "special" | "not-private";

export type AddressClassification = {
  address: string;
  correctCategory: AddressCategory;
  explanation: string;
};

const categories: readonly { value: AddressCategory; label: string }[] = [
  { value: "private", label: "Privat (RFC1918)" },
  { value: "special", label: "Sonderbereich" },
  { value: "not-private", label: "Nicht privat / möglicherweise global routbar" },
];

export function AddressClassificationCheck({ addresses }: { addresses: readonly AddressClassification[] }) {
  const titleId = useId();
  const [answers, setAnswers] = useState<Record<number, AddressCategory>>({});
  const [hasChecked, setHasChecked] = useState(false);
  const [isIncomplete, setIsIncomplete] = useState(false);
  const allAnswered = addresses.every((_, index) => answers[index]);
  const incorrect = addresses.map((address, index) => ({ ...address, index })).filter((address) => answers[address.index] !== address.correctCategory);
  const isCorrect = allAnswered && incorrect.length === 0;

  function select(index: number, category: AddressCategory) {
    setAnswers((current) => ({ ...current, [index]: category }));
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
      <h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">Wie würdest du diese IPv4-Adressen einordnen?</h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">Ordne jeder Adresse genau eine Kategorie zu. „Nicht privat“ bedeutet dabei nicht automatisch, dass die Adresse gewöhnlich öffentlich nutzbar ist.</p>
      <form className="mt-5" onSubmit={submit}>
        <div className="grid gap-4 lg:grid-cols-2">
          {addresses.map((item, index) => (
            <fieldset key={item.address} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
              <legend className="max-w-full px-1"><code className="break-all text-lg font-bold text-blue-950">{item.address}</code></legend>
              <div className="mt-2 space-y-2">
                {categories.map((category) => (
                  <label key={category.value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold leading-5 text-slate-800 transition-colors hover:border-blue-300 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600">
                    <input type="radio" name={`address-${index}`} value={category.value} checked={answers[index] === category.value} onChange={() => select(index, category.value)} className="size-5 shrink-0 accent-blue-700" />
                    <span>{category.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <button type="submit" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{hasChecked ? "Antworten erneut prüfen" : "Alle Antworten prüfen"}</button>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {isIncomplete && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold text-slate-800">Ordne zuerst alle Adressen zu. Danach kannst du die Antworten prüfen.</p>}
        {hasChecked && (
          <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white text-slate-800"}`}>
            <p className="font-bold">{isCorrect ? "Alle Adressen sind richtig eingeordnet." : "Noch nicht vollständig richtig."}</p>
            {isCorrect ? <div className="mt-2 space-y-2">{addresses.map((item) => <p key={item.address}><code className="font-bold">{item.address}</code>: {item.explanation}</p>)}</div> : <div className="mt-2 space-y-2">{incorrect.map((item) => <p key={item.address}><code className="font-bold">{item.address}</code>: {item.explanation}</p>)}<p>Du kannst jede Auswahl ändern und anschließend erneut prüfen.</p></div>}
          </div>
        )}
      </div>
    </section>
  );
}
