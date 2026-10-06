"use client";

import { useId, useState } from "react";

const messages = ["Discover", "Offer", "Request", "Acknowledge"] as const;
const correct = ["Discover", "Offer", "Request", "Acknowledge"];

export function DoraOrderCheck() {
  const titleId = useId();
  const [answers, setAnswers] = useState<string[]>(["", "", "", ""]);
  const [result, setResult] = useState<"idle" | "incomplete" | "checked">("idle");
  const incorrect = answers.map((answer, index) => answer !== correct[index]);
  const allCorrect = incorrect.every((value) => !value);

  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setResult(answers.some((answer) => !answer) ? "incomplete" : "checked"); }
  function reset() { setAnswers(["", "", "", ""]); setResult("idle"); }

  return <section aria-labelledby={titleId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
    <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Reihenfolge prüfen</p>
    <h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">Bringe DORA in die richtige Reihenfolge</h2>
    <p className="mt-3 text-sm leading-6 text-slate-700">Ordne jeder Position eine Nachricht zu. Jede Nachricht wird genau einmal verwendet.</p>
    <form className="mt-5" onSubmit={submit}><fieldset><legend className="sr-only">DORA-Schritte zuordnen</legend><div className="grid gap-3 sm:grid-cols-2">{answers.map((answer, index) => <label key={index} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600"><span>Schritt {index + 1}</span><select value={answer} onChange={(event) => { const next = [...answers]; next[index] = event.target.value; setAnswers(next); setResult("idle"); }} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"><option value="">Bitte auswählen</option>{messages.map((message) => <option key={message}>{message}</option>)}</select></label>)}</div></fieldset>
      <div className="mt-5 flex flex-wrap gap-3"><button className="min-h-12 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Antworten prüfen</button><button type="button" onClick={reset} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zurücksetzen</button></div>
    </form>
    <div aria-live="polite" aria-atomic="true">{result === "incomplete" && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold">Beantworte zuerst alle vier Schritte.</p>}{result === "checked" && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${allCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white text-slate-800"}`}><p className="font-bold">{allCorrect ? "Richtig: Discover → Offer → Request → Acknowledge" : "Die Reihenfolge stimmt noch nicht."}</p>{!allCorrect && <div className="mt-2 space-y-2">{incorrect[0] && <p>Der Client beginnt mit <strong>Discover</strong>, um Server zu suchen.</p>}{(incorrect[1] || incorrect[2]) && <p>Im grundlegenden initialen Ablauf folgt erst das <strong>Offer</strong>; danach wählt der Client mit <strong>Request</strong> ein Angebot aus.</p>}{incorrect[3] && <p>Der ausgewählte Server schließt den erfolgreichen Grundablauf mit <strong>Acknowledge</strong> ab.</p>}<p>Ändere die Zuordnung und prüfe erneut.</p></div>}</div>}</div>
  </section>;
}
