"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createChallengeAction,
  updateChallengeAction,
  type ChallengeActionState,
} from "../../actions/challenge-actions";
import type { ChallengeDefinition } from "../../lib/server/challenge-repository";
import {
  CHALLENGE_RUBRIC_DESCRIPTION_MAX_LENGTH,
  CHALLENGE_RUBRIC_MAX_CRITERIA,
  CHALLENGE_RUBRIC_MAX_POINTS_PER_CRITERION,
  CHALLENGE_RUBRIC_TITLE_MAX_LENGTH,
} from "../../lib/challenge-domain";

const initialState: ChallengeActionState = { status: "idle", message: "" };

export function ChallengeForm({ challenge }: { challenge?: ChallengeDefinition }) {
  const action = challenge ? updateChallengeAction.bind(null, challenge.id) : createChallengeAction;
  const [state, formAction] = useActionState(action, initialState);
  const statusRef = useRef<HTMLDivElement>(null);
  const nextCriterionKey = useRef(challenge?.rubricCriteria.length ?? 0);
  const [criteria, setCriteria] = useState(() => challenge?.rubricCriteria.map((criterion) => ({
    key: criterion.id,
    title: criterion.title,
    description: criterion.description,
    maxPoints: String(criterion.maxPoints),
  })) ?? []);

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state.status]);

  if (!challenge && state.status === "success" && state.challengeId) {
    return (
      <div ref={statusRef} tabIndex={-1} aria-live="polite" className="space-y-5 focus:outline-none">
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-slate-900">{state.message}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/admin/challenges/${state.challengeId}`} className="inline-flex min-h-11 items-center rounded-xl bg-blue-950 px-5 py-2 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Challenge öffnen</Link>
          <Link href="/admin/challenges" className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zur Übersicht</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <ChallengeTextField id="challenge-title" name="title" label="Titel" defaultValue={challenge?.title} minLength={3} maxLength={120} error={state.fieldErrors?.title} />
      <div>
        <label htmlFor="challenge-description" className="block text-sm font-bold text-slate-800">Kurzbeschreibung</label>
        <textarea id="challenge-description" name="shortDescription" required minLength={3} maxLength={300} rows={3} defaultValue={challenge?.shortDescription} aria-invalid={Boolean(state.fieldErrors?.shortDescription)} aria-describedby={state.fieldErrors?.shortDescription ? "challenge-description-error challenge-description-help" : "challenge-description-help"} className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
        <p id="challenge-description-help" className="mt-2 text-sm text-slate-600">Kurzer Überblick für Listen und Dashboard, maximal 300 Zeichen.</p>
        {state.fieldErrors?.shortDescription && <FieldError id="challenge-description-error">{state.fieldErrors.shortDescription}</FieldError>}
      </div>
      <div>
        <label htmlFor="challenge-instructions" className="block text-sm font-bold text-slate-800">Vollständige Anleitung</label>
        <textarea id="challenge-instructions" name="instructions" required maxLength={10000} rows={10} defaultValue={challenge?.instructions} aria-invalid={Boolean(state.fieldErrors?.instructions)} aria-describedby={state.fieldErrors?.instructions ? "challenge-instructions-error challenge-instructions-help" : "challenge-instructions-help"} className="mt-2 min-h-56 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
        <p id="challenge-instructions-help" className="mt-2 text-sm text-slate-600">Reiner Text mit Zeilenumbrüchen; HTML wird nicht interpretiert.</p>
        {state.fieldErrors?.instructions && <FieldError id="challenge-instructions-error">{state.fieldErrors.instructions}</FieldError>}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="challenge-difficulty" className="block text-sm font-bold text-slate-800">Schwierigkeit</label>
          <select id="challenge-difficulty" name="difficulty" defaultValue={challenge?.difficulty ?? ""} aria-invalid={Boolean(state.fieldErrors?.difficulty)} aria-describedby={state.fieldErrors?.difficulty ? "challenge-difficulty-error" : undefined} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200">
            <option value="">Keine Angabe</option><option value="easy">Einfach</option><option value="medium">Mittel</option><option value="hard">Anspruchsvoll</option>
          </select>
          {state.fieldErrors?.difficulty && <FieldError id="challenge-difficulty-error">{state.fieldErrors.difficulty}</FieldError>}
        </div>
        <ChallengeTextField id="challenge-duration" name="estimatedMinutes" label="Geschätzte Dauer in Minuten" type="number" defaultValue={challenge?.estimatedMinutes?.toString()} min={1} max={1440} error={state.fieldErrors?.estimatedMinutes} />
      </div>
      <fieldset aria-describedby={state.fieldErrors?.rubric ? "challenge-rubric-error challenge-rubric-help" : "challenge-rubric-help"} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
        <legend className="px-2 text-lg font-bold text-slate-950">Bewertungsrubrik (optional)</legend>
        <p id="challenge-rubric-help" className="mt-1 leading-7 text-slate-600">Bis zu 10 sichtbare Kriterien, je 1–20 Punkte und insgesamt maximal 100 Punkte. Reihenfolge mit den Schaltflächen ändern; keine Punktezahl entscheidet automatisch über die Freigabe.</p>
        {criteria.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">Ohne Kriterien bleibt der bisherige Review-Ablauf ohne Punktbewertung erhalten.</p> : (
          <ol className="mt-5 space-y-4">
            {criteria.map((criterion, index) => (
              <li key={criterion.key} className="rounded-xl border border-slate-300 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-900">Kriterium {index + 1}</h3>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={index === 0} onClick={() => moveCriterion(index, -1)} aria-label={`Kriterium ${index + 1} nach oben verschieben`} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-40">Nach oben</button>
                    <button type="button" disabled={index === criteria.length - 1} onClick={() => moveCriterion(index, 1)} aria-label={`Kriterium ${index + 1} nach unten verschieben`} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-40">Nach unten</button>
                    <button type="button" onClick={() => setCriteria((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Kriterium ${index + 1} entfernen`} className="inline-flex min-h-11 items-center rounded-lg border border-red-300 px-3 text-sm font-bold text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">Entfernen</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_10rem]">
                  <div>
                    <label htmlFor={`rubric-title-${criterion.key}`} className="block text-sm font-bold text-slate-800">Titel</label>
                    <input id={`rubric-title-${criterion.key}`} name="rubricTitle" required maxLength={CHALLENGE_RUBRIC_TITLE_MAX_LENGTH} value={criterion.title} onChange={(event) => updateCriterion(index, "title", event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
                  </div>
                  <div>
                    <label htmlFor={`rubric-points-${criterion.key}`} className="block text-sm font-bold text-slate-800">Maximale Punkte</label>
                    <input id={`rubric-points-${criterion.key}`} name="rubricMaxPoints" type="number" required min={1} max={CHALLENGE_RUBRIC_MAX_POINTS_PER_CRITERION} step={1} value={criterion.maxPoints} onChange={(event) => updateCriterion(index, "maxPoints", event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor={`rubric-description-${criterion.key}`} className="block text-sm font-bold text-slate-800">Beschreibung</label>
                  <textarea id={`rubric-description-${criterion.key}`} name="rubricDescription" maxLength={CHALLENGE_RUBRIC_DESCRIPTION_MAX_LENGTH} rows={3} value={criterion.description} onChange={(event) => updateCriterion(index, "description", event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
                </div>
              </li>
            ))}
          </ol>
        )}
        {state.fieldErrors?.rubric && <FieldError id="challenge-rubric-error">{state.fieldErrors.rubric}</FieldError>}
        <button type="button" disabled={criteria.length >= CHALLENGE_RUBRIC_MAX_CRITERIA} onClick={addCriterion} className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-bold text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50">Kriterium hinzufügen</button>
      </fieldset>
      <div>
        <label htmlFor="challenge-status" className="block text-sm font-bold text-slate-800">Veröffentlichungsstatus</label>
        <select id="challenge-status" name="status" required defaultValue={challenge?.status ?? "draft"} aria-invalid={Boolean(state.fieldErrors?.status)} aria-describedby={state.fieldErrors?.status ? "challenge-status-error challenge-status-help" : "challenge-status-help"} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200">
          <option value="draft">Entwurf</option><option value="published">Veröffentlicht</option><option value="archived">Archiviert</option>
        </select>
        <p id="challenge-status-help" className="mt-2 text-sm leading-6 text-slate-600">Nur veröffentlichte Challenges können neu zugewiesen werden. Archivierte Zuweisungen bleiben nutzbar.</p>
        {state.fieldErrors?.status && <FieldError id="challenge-status-error">{state.fieldErrors.status}</FieldError>}
      </div>
      <input type="hidden" name="role" value="admin" />
      <div ref={statusRef} tabIndex={-1} aria-live={state.status === "error" ? "assertive" : "polite"} className="focus:outline-none">
        {state.status !== "idle" && <p className={`rounded-xl border p-4 text-sm font-semibold text-slate-900 ${state.status === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>{state.message}</p>}
      </div>
      <ChallengeSubmitButton editing={Boolean(challenge)} />
    </form>
  );

  function addCriterion() {
    if (criteria.length >= CHALLENGE_RUBRIC_MAX_CRITERIA) return;
    const key = `new-${nextCriterionKey.current++}`;
    setCriteria((current) => [...current, { key, title: "", description: "", maxPoints: "1" }]);
  }

  function moveCriterion(index: number, offset: -1 | 1) {
    setCriteria((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function updateCriterion(index: number, field: "title" | "description" | "maxPoints", value: string) {
    setCriteria((current) => current.map((criterion, itemIndex) => itemIndex === index ? { ...criterion, [field]: value } : criterion));
  }
}

function ChallengeTextField({ id, name, label, type = "text", defaultValue, error, ...constraints }: {
  id: string;
  name: string;
  label: string;
  type?: "text" | "number";
  defaultValue?: string;
  error?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}) {
  return <div><label htmlFor={id} className="block text-sm font-bold text-slate-800">{label}</label><input id={id} name={name} type={type} defaultValue={defaultValue} required={name !== "estimatedMinutes"} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...constraints} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />{error && <FieldError id={`${id}-error`}>{error}</FieldError>}</div>;
}

function FieldError({ id, children }: { id: string; children: string }) {
  return <p id={id} className="mt-2 text-sm font-semibold text-red-700">{children}</p>;
}

function ChallengeSubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65 sm:w-auto">{pending ? "Challenge wird gespeichert …" : editing ? "Änderungen speichern" : "Challenge erstellen"}</button>;
}
