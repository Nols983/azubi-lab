"use client";

import { useId, useState } from "react";

export type MultipleSelectionOption = {
  id: string;
  label: string;
  explanation: string;
};

type Props = {
  title?: string;
  question: string;
  options: readonly MultipleSelectionOption[];
  correctOptionIds: readonly string[];
  successMessage?: string;
  missedCorrectMessage?: string;
  inputName?: string;
};

export function MultipleSelectionCheck({ title = "IPv4-Schreibweise prüfen", question, options, correctOptionIds, successMessage = "Alle drei ausgewählten Angaben bestehen aus genau vier Dezimalwerten zwischen 0 und 255. Damit sind sie syntaktisch gültig.", missedCorrectMessage, inputName = "ipv4-notation" }: Props) {
  const titleId = useId();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [submittedWithoutSelection, setSubmittedWithoutSelection] = useState(false);
  const correctIds = new Set(correctOptionIds);
  const selected = new Set(selectedIds);
  const isCorrect = selectedIds.length === correctOptionIds.length && correctOptionIds.every((id) => selected.has(id));
  const incorrectSelections = options.filter((option) => selected.has(option.id) && !correctIds.has(option.id));
  const missedCorrect = options.filter((option) => !selected.has(option.id) && correctIds.has(option.id));

  function toggleOption(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setHasChecked(false);
    setSubmittedWithoutSelection(false);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedIds.length === 0) {
      setSubmittedWithoutSelection(true);
      setHasChecked(false);
      return;
    }
    setSubmittedWithoutSelection(false);
    setHasChecked(true);
  }

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Wissenscheck</p>
      <h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">{title}</h2>
      <form className="mt-5" onSubmit={submit}>
        <fieldset>
          <legend className="text-base font-semibold leading-7 text-slate-900">{question}</legend>
          <p className="mt-1 text-sm text-slate-600">Mehrere Antworten können richtig sein.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {options.map((option) => (
              <label key={option.id} className="flex min-h-14 min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm text-slate-800 transition-colors hover:border-blue-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600">
                <input type="checkbox" name={inputName} value={option.id} checked={selected.has(option.id)} onChange={() => toggleOption(option.id)} className="size-5 shrink-0 accent-blue-700" />
                <span className="min-w-0 break-words">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{hasChecked ? "Erneut prüfen" : "Auswahl prüfen"}</button>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {submittedWithoutSelection && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold text-slate-800">Wähle mindestens eine Angabe aus, bevor du die Auswahl prüfst.</p>}
        {hasChecked && (
          <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white text-slate-800"}`}>
            <p className="font-bold">{isCorrect ? "Richtig ausgewählt" : "Noch nicht vollständig richtig"}</p>
            {isCorrect ? (
              <p className="mt-1">{successMessage}</p>
            ) : (
              <div className="mt-2 space-y-2">
                {incorrectSelections.map((option) => <p key={option.id}><code className="font-semibold">{option.label}</code>: {option.explanation}</p>)}
                {missedCorrect.length > 0 && <p>{missedCorrectMessage ? <>{missedCorrect.length === 1 ? "Eine sinnvolle Antwort fehlt noch." : `${missedCorrect.length} sinnvolle Antworten fehlen noch.`} {missedCorrectMessage}</> : <>Es {missedCorrect.length === 1 ? "fehlt noch eine gültige Angabe" : `fehlen noch ${missedCorrect.length} gültige Angaben`}. Prüfe Anzahl und Werte der Oktette erneut.</>}</p>}
                <p>Du kannst die Auswahl direkt ändern und noch einmal prüfen.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
