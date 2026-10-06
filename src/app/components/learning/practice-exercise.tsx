"use client";

import { useId, useState } from "react";
import {
  createEmptyLearningExerciseAnswer,
  gradeLearningExercise,
  type LearningExercise,
  type LearningExerciseAnswer,
  type LearningExerciseGrade,
} from "../../lib/learning-exercise";

export function PracticeExercise({ exercise }: { exercise: LearningExercise }) {
  return <PracticeExerciseState key={exercise.id} exercise={exercise} />;
}

function PracticeExerciseState({ exercise }: { exercise: LearningExercise }) {
  const headingId = useId();
  const [answer, setAnswer] = useState<LearningExerciseAnswer>(() => createEmptyLearningExerciseAnswer(exercise));
  const [grade, setGrade] = useState<LearningExerciseGrade>();

  function update(next: LearningExerciseAnswer) {
    setAnswer(next);
    setGrade(undefined);
  }

  function reset() {
    setAnswer(createEmptyLearningExerciseAnswer(exercise));
    setGrade(undefined);
  }

  return (
    <section data-learning-exercise={exercise.id} aria-labelledby={headingId} className="rounded-2xl border border-violet-200 bg-violet-50 p-5 text-base leading-7 text-slate-700 sm:p-7">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-violet-800">Interaktive Übung</p>
      <h3 id={headingId} className="mt-2 text-xl font-bold tracking-tight text-slate-950">{exercise.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-700">{exercise.instruction}</p>
      <form className="mt-5" onSubmit={(event) => { event.preventDefault(); setGrade(gradeLearningExercise(exercise, answer)); }}>
        <ExerciseFields exercise={exercise} answer={answer} grade={grade} update={update} name={`${exercise.id}-${headingId}`} />
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" className="min-h-12 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            {grade ? "Erneut prüfen" : "Antworten prüfen"}
          </button>
          <button type="button" onClick={reset} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            Zurücksetzen
          </button>
        </div>
      </form>
      <ExerciseFeedback exercise={exercise} grade={grade} />
    </section>
  );
}

function ExerciseFields({ exercise, answer, grade, update, name }: {
  exercise: LearningExercise;
  answer: LearningExerciseAnswer;
  grade?: LearningExerciseGrade;
  update: (answer: LearningExerciseAnswer) => void;
  name: string;
}) {
  if (exercise.type === "assignment" && answer.type === "assignment") {
    const incorrect = new Set(grade?.incorrectKeys ?? []);
    return (
      <fieldset>
        <legend className="sr-only">Zuordnungen für {exercise.title}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {exercise.items.map((item) => {
            const itemChecked = Boolean(grade && grade.status !== "incomplete");
            const itemCorrect = itemChecked && !incorrect.has(item.id);
            return (
              <label key={item.id} className={`grid min-w-0 gap-2 rounded-xl border bg-white p-4 text-sm font-semibold text-slate-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600 ${itemChecked ? itemCorrect ? "border-emerald-300" : "border-amber-400" : "border-slate-200"}`}>
                <span className="break-words">{item.label}</span>
                <select value={answer.assignments[item.id] ?? ""} onChange={(event) => update({ type: "assignment", assignments: { ...answer.assignments, [item.id]: event.target.value } })} className="min-h-12 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900">
                  <option value="">Bitte zuordnen</option>
                  {exercise.targets.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}
                </select>
                {itemChecked && <span className={`text-xs font-bold ${itemCorrect ? "text-emerald-800" : "text-amber-800"}`}>{itemCorrect ? "Richtig zugeordnet" : "Noch einmal prüfen"}</span>}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (exercise.type === "sequence" && answer.type === "sequence") {
    const incorrect = new Set(grade?.incorrectKeys ?? []);
    return (
      <fieldset>
        <legend className="sr-only">Reihenfolge für {exercise.title}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {exercise.correctItemIds.map((_, index) => {
            const positionKey = `position-${index}`;
            const positionChecked = Boolean(grade && grade.status !== "incomplete");
            const positionCorrect = positionChecked && !incorrect.has(positionKey);
            return (
              <label key={positionKey} className={`grid min-w-0 gap-2 rounded-xl border bg-white p-4 text-sm font-semibold text-slate-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600 ${positionChecked ? positionCorrect ? "border-emerald-300" : "border-amber-400" : "border-slate-200"}`}>
                <span>Position {index + 1}</span>
                <select value={answer.itemIds[index] ?? ""} onChange={(event) => { const next = [...answer.itemIds]; next[index] = event.target.value; update({ type: "sequence", itemIds: next }); }} className="min-h-12 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900">
                  <option value="">Bitte auswählen</option>
                  {exercise.items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                {positionChecked && <span className={`text-xs font-bold ${positionCorrect ? "text-emerald-800" : "text-amber-800"}`}>{positionCorrect ? "Richtige Position" : "Position noch prüfen"}</span>}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (exercise.type === "single-choice" && answer.type === "single-choice") {
    const selected = answer.selectedOptionIds[0];
    return (
      <fieldset>
        <legend className="sr-only">Antwort für {exercise.title}</legend>
        <div className="space-y-3">
          {exercise.options.map((option) => {
            const isSelected = selected === option.id;
            const optionIncorrect = Boolean(grade && isSelected && grade.incorrectKeys.includes(option.id));
            const optionCorrect = Boolean(grade?.status === "correct" && isSelected);
            return (
              <label key={option.id} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 text-sm leading-6 text-slate-800 hover:border-blue-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600 ${optionCorrect ? "border-emerald-300" : optionIncorrect ? "border-amber-400" : "border-slate-200"}`}>
                <input type="radio" name={name} value={option.id} checked={isSelected} onChange={() => update({ type: "single-choice", selectedOptionIds: [option.id] })} className="mt-1 size-5 shrink-0 accent-blue-700" />
                <span className="min-w-0 break-words">{option.label}{optionCorrect && <span className="mt-1 block text-xs font-bold text-emerald-800">Richtig ausgewählt</span>}{optionIncorrect && <span className="mt-1 block text-xs font-bold text-amber-800">Noch einmal prüfen</span>}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (exercise.type === "multiple-selection" && answer.type === "multiple-selection") {
    const selected = new Set(answer.selectedOptionIds);
    const incorrect = new Set(grade?.incorrectKeys ?? []);
    return (
      <fieldset>
        <legend className="sr-only">Auswahl für {exercise.title}</legend>
        <p className="mb-3 text-sm text-slate-600">Mehrere Antworten können richtig sein.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {exercise.options.map((option) => {
            const optionChecked = Boolean(grade && grade.status !== "incomplete");
            const decisionCorrect = optionChecked && !incorrect.has(option.id);
            return (
              <label key={option.id} className={`flex min-h-14 min-w-0 cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 text-sm leading-6 text-slate-800 hover:border-blue-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600 ${optionChecked ? decisionCorrect ? "border-emerald-300" : "border-amber-400" : "border-slate-200"}`}>
                <input type="checkbox" name={name} value={option.id} checked={selected.has(option.id)} onChange={() => update({ type: "multiple-selection", selectedOptionIds: selected.has(option.id) ? answer.selectedOptionIds.filter((id) => id !== option.id) : [...answer.selectedOptionIds, option.id] })} className="mt-1 size-5 shrink-0 accent-blue-700" />
                <span className="min-w-0 break-words">{option.label}{optionChecked && <span className={`mt-1 block text-xs font-bold ${decisionCorrect ? "text-emerald-800" : "text-amber-800"}`}>{decisionCorrect ? "Entscheidung stimmt" : "Entscheidung noch prüfen"}</span>}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return null;
}

function ExerciseFeedback({ exercise, grade }: { exercise: LearningExercise; grade?: LearningExerciseGrade }) {
  if (!grade) return <div aria-live="polite" aria-atomic="true" />;
  if (grade.status === "incomplete") {
    return <div aria-live="polite" aria-atomic="true"><p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold text-slate-800">Vervollständige zuerst alle nötigen Angaben.</p></div>;
  }
  if (grade.status === "correct") {
    return <div aria-live="polite" aria-atomic="true"><div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><p className="font-bold">Richtig.</p><p className="mt-1">{exercise.successExplanation}</p></div></div>;
  }

  const hints = feedbackHints(exercise, grade.incorrectKeys);
  return (
    <div aria-live="polite" aria-atomic="true">
      <div className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm leading-6 text-slate-800">
        <p className="font-bold">Noch nicht ganz. {grade.correctCount} von {grade.totalCount} Entscheidungen stimmen.</p>
        {hints.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{hints.map((hint, index) => <li key={`${index}-${hint}`}>{hint}</li>)}</ul>}
        <p className="mt-2">{exercise.retryHint} Ändere deine Antwort und prüfe erneut.</p>
      </div>
    </div>
  );
}

function feedbackHints(exercise: LearningExercise, incorrectKeys: readonly string[]) {
  const incorrect = new Set(incorrectKeys);
  if (exercise.type === "assignment") return exercise.items.filter((item) => incorrect.has(item.id)).map((item) => item.feedback);
  if (exercise.type === "sequence") return exercise.positionHints.filter((_, index) => incorrect.has(`position-${index}`));
  return exercise.options.filter((option) => incorrect.has(option.id)).map((option) => option.feedback);
}
