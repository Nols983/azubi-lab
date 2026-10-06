"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  completeIhkExamAction,
  finalizeExpiredIhkExamAction,
  saveIhkExamAnswerAction,
} from "../../actions/ihk-exam-actions.ts";
import type {
  CompletedIhkExamQuestionView,
  CompletedIhkExamView,
  IhkExamAttemptView,
  InProgressIhkExamView,
} from "../../lib/ihk-exam.ts";
import {
  assessmentGroupIds,
  assessmentGroupLabels,
} from "../../data/quiz-bank/categories.ts";
import { IhkExamStartButton } from "./ihk-exam-start-button.tsx";

type AnswerState = Record<string, readonly string[]>;

export function IhkExamAttempt({ attempt }: { attempt: IhkExamAttemptView }) {
  return attempt.status === "completed"
    ? <CompletedExam attempt={attempt} />
    : <InProgressExam attempt={attempt} />;
}

function InProgressExam({ attempt }: { attempt: InProgressIhkExamView }) {
  const router = useRouter();
  const submitDialogRef = useRef<HTMLDialogElement>(null);
  const savingRef = useRef(false);
  const expiryRequestedRef = useRef(false);
  const [answers, setAnswers] = useState<AnswerState>(() => Object.fromEntries(
    attempt.questions.map((question) => [question.questionId, [...question.selectedOptionIds]]),
  ));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingAnswer, setPendingAnswer] = useState<{ questionId: string; selectedOptionIds: readonly string[] }>();
  const [remainingSeconds, setRemainingSeconds] = useState(() => initialRemainingSeconds(attempt));
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const [savePending, beginSave] = useTransition();
  const [submitPending, beginSubmit] = useTransition();
  const [timeoutPending, beginTimeout] = useTransition();

  useEffect(() => {
    const serverAnchor = Date.parse(attempt.serverNow);
    const deadline = Date.parse(attempt.deadlineAt);
    const performanceAnchor = performance.now();
    const tick = () => {
      const estimatedServerNow = serverAnchor + (performance.now() - performanceAnchor);
      const remaining = Math.max(0, Math.ceil((deadline - estimatedServerNow) / 1_000));
      setRemainingSeconds(remaining);
      if (remaining > 0 || expiryRequestedRef.current) return;
      expiryRequestedRef.current = true;
      beginTimeout(async () => {
        try {
          const result = await finalizeExpiredIhkExamAction(attempt.id);
          if (!result.ok) {
            setError(result.message);
            return;
          }
          if (result.status === "completed") router.refresh();
        } catch {
          setError("Der Zeitablauf konnte gerade nicht bestätigt werden. Die serverseitige Frist bleibt verbindlich.");
        } finally {
          expiryRequestedRef.current = false;
        }
      });
    };
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [attempt.deadlineAt, attempt.id, attempt.serverNow, router]);

  const question = attempt.questions[currentIndex];
  const answeredCount = Object.values(answers).filter((selected) => selected.length > 0).length;
  const unansweredCount = attempt.questionCount - answeredCount;
  const controlsDisabled = savePending || submitPending || timeoutPending || remainingSeconds === 0;
  const visibleSelection = pendingAnswer?.questionId === question.questionId
    ? pendingAnswer.selectedOptionIds
    : answers[question.questionId] ?? [];

  function changeAnswer(optionId: string) {
    if (controlsDisabled || savingRef.current) return;
    const current = answers[question.questionId] ?? [];
    const selectedOptionIds = question.type === "single-choice"
      ? [optionId]
      : current.includes(optionId)
        ? current.filter((value) => value !== optionId)
        : [...current, optionId];
    savingRef.current = true;
    setPendingAnswer({ questionId: question.questionId, selectedOptionIds });
    setSaveMessage("Antwort wird gespeichert …");
    setError("");
    beginSave(async () => {
      try {
        const result = await saveIhkExamAnswerAction({
          attemptId: attempt.id,
          answer: {
            position: question.position,
            questionId: question.questionId,
            selectedOptionIds,
          },
        });
        if (!result.ok) {
          setError(result.message);
          setSaveMessage("");
          return;
        }
        if (result.status === "completed") {
          router.refresh();
          return;
        }
        setAnswers((currentAnswers) => ({
          ...currentAnswers,
          [question.questionId]: [...result.selectedOptionIds],
        }));
        setSaveMessage("Antwort gespeichert.");
      } catch {
        setError("Die Antwort konnte nicht gespeichert werden. Deine letzte bestätigte Auswahl bleibt erhalten.");
        setSaveMessage("");
      } finally {
        savingRef.current = false;
        setPendingAnswer(undefined);
      }
    });
  }

  function navigate(index: number) {
    if (controlsDisabled) return;
    setCurrentIndex(index);
    setSaveMessage("");
    setError("");
  }

  function submitExam() {
    if (controlsDisabled) return;
    submitDialogRef.current?.close();
    setError("");
    beginSubmit(async () => {
      try {
        const result = await completeIhkExamAction(attempt.id);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        router.refresh();
      } catch {
        setError("Die Prüfung konnte gerade nicht abgegeben werden. Deine gespeicherten Antworten bleiben erhalten.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">IHK-Simulation · laufende Prüfung</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Frage {question.position} von {attempt.questionCount}</h1>
          <p className="font-semibold text-slate-700">{answeredCount} gespeichert beantwortet</p>
        </div>
      </header>

      <div className={`sticky top-2 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-md ${remainingSeconds <= 300 ? "border-amber-400 bg-amber-50" : "border-blue-200 bg-white"}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Verbleibende Zeit</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-950" aria-label={`Verbleibende Zeit ${formatRemainingForScreenReader(remainingSeconds)}`}>{formatRemaining(remainingSeconds)}</p>
        </div>
        <p className="max-w-md text-sm leading-6 text-slate-600">Die serverseitige Frist ist verbindlich. Es gibt keine Pause.</p>
      </div>

      <nav aria-label="Fragen der IHK-Simulation" className="mt-6">
        <p className="text-sm font-semibold text-slate-700">Direkt zu einer Frage springen</p>
        <ol className="mt-3 flex flex-wrap gap-2">
          {attempt.questions.map((item, index) => {
            const answered = (answers[item.questionId] ?? []).length > 0;
            const current = index === currentIndex;
            return (
              <li key={item.questionId}>
                <button
                  type="button"
                  disabled={controlsDisabled}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Frage ${item.position}: ${current ? "aktuell, " : ""}${answered ? "beantwortet" : "unbeantwortet"}`}
                  onClick={() => navigate(index)}
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60 ${current ? "border-blue-950 bg-blue-950 text-white" : answered ? "border-blue-300 bg-blue-50 text-blue-950" : "border-slate-300 bg-white text-slate-700"}`}
                >
                  {item.position}{answered ? <span aria-hidden="true" className="ml-1">✓</span> : null}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <section aria-labelledby={`ihk-question-${question.position}`} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-blue-700">Frage {question.position}</p>
          <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{question.type === "multiple-selection" ? "Mehrere Antworten möglich" : "Eine Antwort auswählen"}</p>
        </div>
        <h2 id={`ihk-question-${question.position}`} className="mt-4 max-w-3xl break-words text-xl font-bold leading-8 text-slate-950 sm:text-2xl">{question.prompt}</h2>
        <fieldset className="mt-6" disabled={controlsDisabled}>
          <legend className="sr-only">Antworten für Frage {question.position}</legend>
          <div className="space-y-3">
            {question.options.map((option) => {
              const selected = visibleSelection.includes(option.id);
              return (
                <label key={option.id} className="relative block cursor-pointer">
                  <input
                    type={question.type === "single-choice" ? "radio" : "checkbox"}
                    name={`ihk-question-${question.questionId}`}
                    value={option.id}
                    checked={selected}
                    onChange={() => changeAnswer(option.id)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-blue-400 peer-checked:border-blue-700 peer-checked:bg-blue-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-blue-600 peer-disabled:cursor-wait peer-disabled:opacity-65">
                    <span aria-hidden="true" className={`inline-flex size-6 shrink-0 items-center justify-center border-2 border-slate-400 text-sm font-bold text-blue-950 ${question.type === "single-choice" ? "rounded-full" : "rounded-md"} ${selected ? "border-blue-800 bg-white" : ""}`}>{selected ? "✓" : ""}</span>
                    <span className="min-w-0 flex-1 break-words leading-6 text-slate-900">{option.label}</span>
                    {selected && <span className="shrink-0 text-xs font-bold text-blue-900">Ausgewählt</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" disabled={currentIndex === 0 || controlsDisabled} onClick={() => navigate(currentIndex - 1)} className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-45"><span aria-hidden="true" className="mr-2">←</span>Zurück</button>
        <button type="button" disabled={currentIndex === attempt.questionCount - 1 || controlsDisabled} onClick={() => navigate(currentIndex + 1)} className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-45">Weiter<span aria-hidden="true" className="ml-2">→</span></button>
      </div>

      <section aria-labelledby="ihk-submit-heading" className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 sm:p-6">
        <h2 id="ihk-submit-heading" className="text-lg font-bold text-slate-950">Prüfung abgeben</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">Du kannst jederzeit abgeben. Unbeantwortete Fragen werden als nicht richtig gewertet.</p>
        <button type="button" disabled={controlsDisabled} onClick={() => submitDialogRef.current?.showModal()} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-6 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{submitPending ? "Prüfung wird ausgewertet …" : "Prüfung abgeben"}</button>
      </section>

      <div aria-live="polite" aria-atomic="true" className="mt-4 space-y-3">
        {saveMessage && <p className="text-sm font-semibold leading-6 text-slate-600">{saveMessage}</p>}
        {timeoutPending && <p className="font-semibold text-blue-900">Zeit ist abgelaufen. Die gespeicherten Antworten werden ausgewertet …</p>}
        {error && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-slate-900">{error}</p>}
      </div>

      <dialog ref={submitDialogRef} aria-labelledby="ihk-submit-dialog-heading" aria-describedby="ihk-submit-dialog-description" className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/55">
        <div className="p-6 sm:p-8">
          <h2 id="ihk-submit-dialog-heading" className="text-2xl font-bold text-slate-950">Prüfung wirklich abgeben?</h2>
          <p id="ihk-submit-dialog-description" className="mt-3 leading-7 text-slate-600">{unansweredCount > 0 ? `Du hast noch ${unansweredCount} unbeantwortete ${unansweredCount === 1 ? "Frage" : "Fragen"}. Prüfung trotzdem abgeben?` : "Alle Fragen sind beantwortet. Nach der Abgabe kannst du die vollständige Auswertung prüfen."}</p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <form method="dialog"><button type="submit" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:w-auto">Weiter bearbeiten</button></form>
            <button type="button" onClick={submitExam} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Jetzt abgeben</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function CompletedExam({ attempt }: { attempt: CompletedIhkExamView }) {
  return (
    <div className="mx-auto max-w-5xl">
      <header className={`rounded-2xl border p-6 shadow-sm sm:p-8 ${attempt.passed ? "border-emerald-300 bg-emerald-50" : "border-slate-300 bg-white"}`}>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">IHK-Simulation · Übungsergebnis</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{attempt.passed ? "Bestanden" : "Nicht bestanden"}</h1>
        <p className="mt-4 text-2xl font-bold text-slate-950">{attempt.correctCount} / {attempt.questionCount} richtig · {attempt.scorePercentage} %</p>
        <p className="mt-3 leading-7 text-slate-700">{attempt.completionReason === "timeout" ? "Zeit abgelaufen. Die bis dahin gespeicherten Antworten wurden ausgewertet." : "Die Prüfung wurde vor Ablauf der Zeit abgegeben."}</p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold text-slate-600">Bearbeitungszeit</dt><dd className="mt-1 font-bold text-slate-950">{formatDuration(attempt.timeUsedSeconds)}</dd></div>
          <div><dt className="font-semibold text-slate-600">Abgeschlossen</dt><dd className="mt-1 font-bold text-slate-950">{formatDateTime(attempt.completedAt)}</dd></div>
        </dl>
        <p className="mt-5 text-sm leading-6 text-slate-600">Dieses Übungsergebnis ist kein offizielles IHK-Prüfungsergebnis.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <IhkExamStartButton label="Neue IHK-Simulation starten" />
          <Link href="/quiz/ihk" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zur persönlichen Übersicht</Link>
        </div>
      </header>

      <IhkAssessmentBreakdown questions={attempt.questions} />

      <section aria-labelledby="ihk-review-heading" className="mt-10">
        <h2 id="ihk-review-heading" className="text-2xl font-bold text-slate-950">Vollständige Auswertung</h2>
        <p className="mt-2 leading-7 text-slate-600">Deine Auswahl, die richtige Antwortmenge und die Erklärung sind für jede Frage textlich gekennzeichnet.</p>
        <ol className="mt-6 space-y-5">
          {attempt.questions.map((question) => <ReviewQuestion key={question.questionId} question={question} />)}
        </ol>
      </section>
    </div>
  );
}

function IhkAssessmentBreakdown({ questions }: { questions: readonly CompletedIhkExamQuestionView[] }) {
  return (
    <section aria-labelledby="ihk-group-result-heading" className="mt-10">
      <h2 id="ihk-group-result-heading" className="text-2xl font-bold text-slate-950">Ergebnis nach Lernbereich</h2>
      <p className="mt-2 leading-7 text-slate-600">Die Verteilung ist ein ausgewogener Übungsmix und keine offizielle IHK-Gewichtung.</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assessmentGroupIds.map((groupId) => {
          const groupQuestions = questions.filter((question) => question.assessmentGroupId === groupId);
          const correct = groupQuestions.filter((question) => question.isCorrect).length;
          return (
            <div key={groupId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <dt className="break-words text-sm font-semibold leading-6 text-slate-700">{assessmentGroupLabels[groupId]}</dt>
              <dd className="mt-2 text-2xl font-bold text-slate-950">{correct} / {groupQuestions.length} richtig</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function ReviewQuestion({ question }: { question: CompletedIhkExamQuestionView }) {
  return (
    <li>
      <article className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-7 ${question.isCorrect ? "border-emerald-200" : "border-red-300 ring-1 ring-red-100"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-600">Frage {question.position}</p>
          <p className={`rounded-full border px-3 py-1 text-xs font-bold ${question.isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900"}`}>{question.isCorrect ? "Richtig beantwortet" : "Nicht richtig beantwortet"}</p>
        </div>
        <h3 className="mt-4 break-words text-lg font-bold leading-7 text-slate-950 sm:text-xl">{question.prompt}</h3>
        {question.selectedOptionIds.length === 0 && <p className="mt-3 text-sm font-bold text-red-800">Keine Antwort ausgewählt</p>}
        <ul className="mt-5 space-y-3">
          {question.options.map((option) => {
            const selected = question.selectedOptionIds.includes(option.id);
            const correct = question.correctOptionIds.includes(option.id);
            return (
              <li key={option.id} className={`rounded-xl border p-4 ${correct ? "border-emerald-300 bg-emerald-50" : selected ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                <p className="break-words leading-6 text-slate-900">{option.label}</p>
                {(selected || correct) && <p className="mt-2 flex flex-wrap gap-2 text-xs font-bold">{selected && <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-300">Deine Auswahl</span>}{correct && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-950">Richtige Antwort</span>}</p>}
              </li>
            );
          })}
        </ul>
        <div className="mt-5 rounded-xl bg-blue-50 p-4"><p className="font-bold text-blue-950">Erklärung</p><p className="mt-2 whitespace-pre-wrap break-words leading-7 text-slate-700">{question.explanation}</p></div>
      </article>
    </li>
  );
}

function initialRemainingSeconds(attempt: InProgressIhkExamView) {
  return Math.max(0, Math.ceil((Date.parse(attempt.deadlineAt) - Date.parse(attempt.serverNow)) / 1_000));
}

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function formatRemainingForScreenReader(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} Minuten und ${rest} Sekunden`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} Min. ${rest.toString().padStart(2, "0")} Sek.`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
