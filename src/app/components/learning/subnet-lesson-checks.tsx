"use client";

import { useId, useState } from "react";

type SelectQuestion = { id: string; label: string; answer: string; options: readonly string[]; explanation: string };

function SelectExercise({ eyebrow, title, description, questions, success }: { eyebrow: string; title: string; description: string; questions: readonly SelectQuestion[]; success: string }) {
  const titleId = useId();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<"idle" | "incomplete" | "checked">("idle");
  const missing = questions.some((question) => !answers[question.id]);
  const incorrect = questions.filter((question) => answers[question.id] !== question.answer);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(missing ? "incomplete" : "checked");
  }

  function reset() {
    setAnswers({});
    setResult("idle");
  }

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">{eyebrow}</p>
      <h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">{description}</p>
      <form className="mt-5" onSubmit={submit}>
        <fieldset><legend className="sr-only">Alle Werte auswählen</legend><div className="grid gap-3 sm:grid-cols-2">
          {questions.map((question) => <label key={question.id} className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600"><span>{question.label}</span><select value={answers[question.id] ?? ""} onChange={(event) => { setAnswers((current) => ({ ...current, [question.id]: event.target.value })); setResult("idle"); }} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900"><option value="">Bitte auswählen</option>{question.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}
        </div></fieldset>
        <div className="mt-5 flex flex-wrap gap-3"><button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Antworten prüfen</button><button type="button" onClick={reset} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zurücksetzen</button></div>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {result === "incomplete" && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold text-slate-800">Beantworte zuerst alle Felder.</p>}
        {result === "checked" && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${incorrect.length === 0 ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white text-slate-800"}`}><p className="font-bold">{incorrect.length === 0 ? "Alles richtig." : "Einige Werte stimmen noch nicht."}</p>{incorrect.length === 0 ? <p className="mt-1">{success}</p> : <div className="mt-2 space-y-2">{incorrect.map((question) => <p key={question.id}><strong>{question.label}:</strong> {question.explanation} Richtig ist <code className="font-bold">{question.answer}</code>.</p>)}</div>}</div>}
      </div>
    </section>
  );
}

const numberOptions = ["4", "5", "6", "14", "16", "30", "32", "62", "64"];

export function AddressCountCheck() {
  return <SelectExercise eyebrow="Übung" title="Adresswerte für /26 und /27 bestimmen" description="Berechne Hostbits, Gesamtadressen, gewöhnliche Hostadressen und Blockgröße. Prüfe erst, wenn alle Felder ausgefüllt sind." success="Du hast beide Präfixe über Hostbits und Blockgröße konsistent berechnet." questions={[
    { id: "26-hostbits", label: "/26 · Hostbits", answer: "6", options: numberOptions, explanation: "32 − 26 ergibt 6 Hostbits." },
    { id: "26-total", label: "/26 · Adressen gesamt", answer: "64", options: numberOptions, explanation: "2^6 ergibt 64 Gesamtadressen." },
    { id: "26-hosts", label: "/26 · gewöhnliche Hosts", answer: "62", options: numberOptions, explanation: "Im traditionellen Subnetz bleiben 64 − 2 = 62 gewöhnliche Hostadressen." },
    { id: "26-block", label: "/26 · Blockgröße", answer: "64", options: numberOptions, explanation: "256 − 192 ergibt 64." },
    { id: "27-hostbits", label: "/27 · Hostbits", answer: "5", options: numberOptions, explanation: "32 − 27 ergibt 5 Hostbits." },
    { id: "27-total", label: "/27 · Adressen gesamt", answer: "32", options: numberOptions, explanation: "2^5 ergibt 32 Gesamtadressen." },
    { id: "27-hosts", label: "/27 · gewöhnliche Hosts", answer: "30", options: numberOptions, explanation: "Im traditionellen Subnetz bleiben 32 − 2 = 30 gewöhnliche Hostadressen." },
    { id: "27-block", label: "/27 · Blockgröße", answer: "32", options: numberOptions, explanation: "256 − 224 ergibt 32." },
  ]} />;
}

export function SubnetRangeCheck() {
  const addresses = ["192.168.20.64", "192.168.20.65", "192.168.20.70", "192.168.20.126", "192.168.20.127", "192.168.20.128"];
  return <SelectExercise eyebrow="Übung" title="Den Bereich von 192.168.20.70/26 bestimmen" description="Die Blockgröße beträgt 64. Ordne die Hostadresse ihrem vollständigen Subnetzbereich zu." success="70 liegt im Block 64–127; Netz- und Broadcast-Adresse begrenzen den gewöhnlichen Hostbereich 65–126." questions={[
    { id: "network", label: "Netzadresse", answer: "192.168.20.64", options: addresses, explanation: "70 liegt zwischen den Grenzen 64 und 127; der Block beginnt bei 64." },
    { id: "first", label: "Erster gewöhnlicher Host", answer: "192.168.20.65", options: addresses, explanation: "Der erste gewöhnliche Host folgt direkt auf die Netzadresse." },
    { id: "last", label: "Letzter gewöhnlicher Host", answer: "192.168.20.126", options: addresses, explanation: "Der letzte gewöhnliche Host liegt direkt vor dem Broadcast." },
    { id: "broadcast", label: "Broadcast-Adresse", answer: "192.168.20.127", options: addresses, explanation: "Die nächste Grenze ist 128; 128 − 1 ergibt 127." },
  ]} />;
}

export function PrefixPlanningCheck() {
  return <SelectExercise eyebrow="Planungsübung" title="Mindestens 45 gewöhnliche Hostadressen" description="Wähle aus /25, /26, /27 und /28 den kleinsten angebotenen Adressblock, der die genannte Anforderung erfüllt." success="In diesem Szenario ist /26 der kleinste angebotene passende Block: 62 gewöhnliche Hosts reichen aus." questions={[
    { id: "prefix", label: "Passendes Präfix", answer: "/26", options: ["/25", "/26", "/27", "/28"], explanation: "/27 bietet nur 30 Hosts. /26 bietet 62; /25 bietet 126 und funktioniert ebenfalls, reserviert hier aber deutlich mehr Adressen." },
  ]} />;
}
