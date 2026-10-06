"use client";

import { useState } from "react";

const answers = [
  { id: "interface", text: "Sie dient dazu, Kommunikation in einem IP-Netzwerk an eine Netzwerkschnittstelle zu adressieren.", correct: true },
  { id: "name", text: "Sie ist der dauerhaft unveränderliche Name eines Computers.", correct: false },
  { id: "position", text: "Sie beschreibt ausschließlich die physische Position eines Geräts.", correct: false },
  { id: "mac", text: "Sie ersetzt die MAC-Adresse auf allen Netzwerkschichten.", correct: false },
] as const;

export function KnowledgeCheck() {
  const [selected, setSelected] = useState<string>();
  const [checked, setChecked] = useState(false);
  const isCorrect = answers.find((answer) => answer.id === selected)?.correct;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected) setChecked(true);
  }

  return (
    <section aria-labelledby="knowledge-check-heading" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Wissenscheck</p>
      <h2 id="knowledge-check-heading" className="mt-2 text-xl font-bold text-slate-950">Welche Aussage beschreibt die Aufgabe einer IP-Adresse am besten?</h2>
      <form className="mt-5" onSubmit={submit}>
        <fieldset>
          <legend className="sr-only">Wähle eine Antwort aus</legend>
          <div className="space-y-3">
            {answers.map((answer) => (
              <label key={answer.id} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 transition-colors hover:border-blue-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600">
                <input type="radio" name="knowledge-check" value={answer.id} checked={selected === answer.id} onChange={() => { setSelected(answer.id); setChecked(false); }} className="mt-1 size-4 accent-blue-700" />
                <span>{answer.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={!selected} className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-400">Antwort prüfen</button>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {checked && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white text-slate-800"}`}><p className="font-bold">{isCorrect ? "Richtig beantwortet" : "Noch nicht richtig"}</p><p className="mt-1">{isCorrect ? "IP-Adressen adressieren Kommunikation an eine Netzwerkschnittstelle innerhalb eines IP-Netzwerks. Sie sind weder ein dauerhafter Gerätename noch eine physische Ortsangabe." : "Eine IP-Adresse ist kein dauerhaft unveränderlicher Gerätename, keine reine Ortsangabe und ersetzt auch keine MAC-Adresse. Sie adressiert Kommunikation innerhalb eines IP-Netzwerks an eine Netzwerkschnittstelle. Wähle eine andere Antwort und versuche es erneut."}</p></div>}
      </div>
    </section>
  );
}
