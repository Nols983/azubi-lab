"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPracticeQuizAction,
  type CreatePracticeQuizActionState,
} from "../../actions/practice-quiz-actions.ts";
import type { AssessmentGroupId } from "../../data/quiz-bank/categories.ts";

const initialState: CreatePracticeQuizActionState = {
  status: "idle",
  message: "",
};

export function PracticeCategorySelector({
  categories,
}: {
  categories: readonly { id: AssessmentGroupId; label: string; questionCount: number }[];
}) {
  const router = useRouter();
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [selected, setSelected] = useState<readonly AssessmentGroupId[]>([]);
  const [state, action, pending] = useActionState(createPracticeQuizAction, initialState);
  const allSelected = selected.length === categories.length;

  useEffect(() => {
    if (state.status === "success" && state.attemptId) {
      router.push(`/quiz/${state.attemptId}`);
    } else if (state.status === "error") {
      errorRef.current?.focus();
    }
  }, [router, state]);

  function toggleCategory(categoryId: AssessmentGroupId) {
    setSelected((current) => current.includes(categoryId)
      ? current.filter((value) => value !== categoryId)
      : [...current, categoryId]);
  }

  return (
    <form action={action} className="mt-8">
      <fieldset disabled={pending}>
        <legend className="text-xl font-bold text-slate-950">Lernbereiche auswählen</legend>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Du kannst einen, mehrere oder alle Lernbereiche kombinieren. Aktuell ausgewählt: {selected.length} von {categories.length}.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={allSelected || pending}
            onClick={() => setSelected(categories.map((category) => category.id))}
            className="inline-flex min-h-11 items-center rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:border-blue-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Alle auswählen
          </button>
          <button
            type="button"
            disabled={selected.length === 0 || pending}
            onClick={() => setSelected([])}
            className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-bold text-slate-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Auswahl löschen
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {categories.map((category) => {
            const isSelected = selected.includes(category.id);
            return (
              <label key={category.id} className="relative cursor-pointer">
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={category.id}
                  checked={isSelected}
                  onChange={() => toggleCategory(category.id)}
                  className="peer sr-only"
                />
                <span className="flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm transition-colors hover:border-blue-400 peer-checked:border-blue-700 peer-checked:bg-blue-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-blue-600">
                  <span className="min-w-0">
                    <span className="block text-lg font-bold text-slate-950">{category.label}</span>
                    <span className="mt-1 block text-sm text-slate-600">{category.questionCount} geeignete Fragen</span>
                  </span>
                  <span className={`inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 py-1 text-xs font-bold ${isSelected ? "border-blue-800 bg-blue-950 text-white" : "border-slate-300 bg-slate-50 text-slate-600"}`}>
                    <span aria-hidden="true" className="mr-1">{isSelected ? "✓" : "○"}</span>
                    {isSelected ? "Ausgewählt" : "Auswählen"}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div aria-live="assertive" aria-atomic="true" className="mt-5">
        {state.status === "error" && (
          <p
            ref={errorRef}
            tabIndex={-1}
            className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-slate-900 focus:outline-none"
          >
            {state.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={selected.length === 0 || pending}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-6 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Quiz wird erstellt …" : "Quiz starten"}
      </button>
    </form>
  );
}
