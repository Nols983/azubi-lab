"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  completePracticeQuizAction,
  restartPracticeQuizAction,
} from "../../actions/practice-quiz-actions.ts";
import {
  buildPracticeQuizSubmission,
  countAnsweredPracticeQuestions,
  getPracticeQuizDraftStorageKey,
  isPracticeQuizSubmissionReady,
  parsePracticeQuizDraft,
  serializePracticeQuizDraft,
  type PracticeQuizDraftAnswers,
} from "../../lib/practice-quiz-draft.ts";
import type {
  CompletedPracticeAttemptPageView,
  CompletedPracticeQuestionView,
  InProgressPracticeAttemptView,
  PracticeAttemptQuestionView,
  PracticeAttemptPageView,
} from "../../lib/practice-quiz-attempt.ts";
import {
  assessmentGroupIds,
  assessmentGroupLabels,
} from "../../data/quiz-bank/categories.ts";
import { ProgressBar } from "../progress-bar.tsx";

export function PracticeQuizAttempt({ attempt }: { attempt: PracticeAttemptPageView }) {
  return attempt.status === "completed"
    ? <CompletedQuiz attempt={attempt} />
    : <InProgressQuiz attempt={attempt} />;
}

function InProgressQuiz({ attempt }: { attempt: InProgressPracticeAttemptView }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-4xl" aria-busy="true">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Übungsquiz</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Quiz wird geladen …</h1>
        <p className="mt-3 leading-7 text-slate-600">Dein lokaler Entwurf wird sicher geprüft.</p>
      </div>
    );
  }
  return <HydratedInProgressQuiz attempt={attempt} />;
}

function HydratedInProgressQuiz({ attempt }: { attempt: InProgressPracticeAttemptView }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submittingRef = useRef(false);
  const storageKey = getPracticeQuizDraftStorageKey(attempt.id);
  const [initialDraft] = useState(() => restoreInitialDraft(attempt, storageKey));
  const [answers, setAnswers] = useState<PracticeQuizDraftAnswers>(initialDraft.answers);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialDraft.currentQuestionIndex);
  const [draftMessage, setDraftMessage] = useState(initialDraft.message);
  const [error, setError] = useState("");
  const [completedAttempt, setCompletedAttempt] = useState<CompletedPracticeAttemptPageView>();
  const [submissionPending, beginSubmission] = useTransition();

  if (completedAttempt) return <CompletedQuiz attempt={completedAttempt} />;

  const question = attempt.questions[currentQuestionIndex];
  const answeredCount = countAnsweredPracticeQuestions(attempt, answers);
  const readyToSubmit = isPracticeQuizSubmissionReady(attempt, answers);
  const answeredPercentage = Math.round((answeredCount / attempt.questionCount) * 100);

  function updateAnswer(questionValue: PracticeAttemptQuestionView, optionId: string) {
    setError("");
    const next = { ...answers };
    if (questionValue.type === "single-choice") {
      next[questionValue.questionId] = [optionId];
    } else {
      const selected = answers[questionValue.questionId] ?? [];
      const updated = selected.includes(optionId)
        ? selected.filter((value) => value !== optionId)
        : [...selected, optionId];
      if (updated.length === 0) delete next[questionValue.questionId];
      else next[questionValue.questionId] = updated;
    }
    setAnswers(next);
    persistDraft(attempt, storageKey, next, currentQuestionIndex, setDraftMessage);
  }

  function navigateToQuestion(index: number) {
    setCurrentQuestionIndex(index);
    persistDraft(attempt, storageKey, answers, index, setDraftMessage);
  }

  function requestSubmission() {
    if (!readyToSubmit || submissionPending || submittingRef.current) return;
    dialogRef.current?.showModal();
  }

  function submitQuiz() {
    if (submissionPending || submittingRef.current) return;
    const submission = buildPracticeQuizSubmission(attempt, answers);
    if (!submission) {
      setError("Beantworte zuerst alle 15 Fragen.");
      dialogRef.current?.close();
      return;
    }

    submittingRef.current = true;
    setError("");
    dialogRef.current?.close();
    beginSubmission(async () => {
      try {
        const result = await completePracticeQuizAction({
          attemptId: attempt.id,
          answers: submission,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        removeDraft(storageKey);
        setCompletedAttempt(result.attempt);
      } catch {
        setError("Das Quiz konnte gerade nicht abgegeben werden. Dein lokaler Entwurf bleibt erhalten.");
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Übungsquiz</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Frage {currentQuestionIndex + 1} von {attempt.questionCount}</h1>
          <p className="font-semibold text-slate-700">{answeredCount} von {attempt.questionCount} beantwortet</p>
        </div>
        <div className="mt-5"><ProgressBar value={answeredPercentage} label="Beantwortete Fragen" /></div>
      </header>

      <nav aria-label="Fragen im Übungsquiz" className="mt-6">
        <ol className="flex flex-wrap gap-2">
          {attempt.questions.map((item, index) => {
            const answered = Boolean(answers[item.questionId]?.length);
            const current = index === currentQuestionIndex;
            return (
              <li key={item.questionId}>
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  aria-label={`Frage ${index + 1}: ${current ? "aktuell, " : ""}${answered ? "beantwortet" : "unbeantwortet"}`}
                  onClick={() => navigateToQuestion(index)}
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blue-600 ${current ? "border-blue-950 bg-blue-950 text-white" : answered ? "border-blue-300 bg-blue-50 text-blue-950" : "border-slate-300 bg-white text-slate-700"}`}
                >
                  {index + 1}{answered ? <span aria-hidden="true" className="ml-1">✓</span> : null}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <section aria-labelledby={`question-${question.position}-heading`} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-blue-700">Frage {question.position}</p>
          <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {question.type === "multiple-selection" ? "Mehrere Antworten möglich" : "Eine Antwort auswählen"}
          </p>
        </div>
        <h2 id={`question-${question.position}-heading`} className="mt-4 max-w-3xl break-words text-xl font-bold leading-8 text-slate-950 sm:text-2xl">{question.prompt}</h2>

        <fieldset className="mt-6">
          <legend className="sr-only">Antworten für Frage {question.position}</legend>
          <div className="space-y-3">
            {question.options.map((option) => {
              const selected = Boolean(answers[question.questionId]?.includes(option.id));
              return (
                <label key={option.id} className="relative block cursor-pointer">
                  <input
                    type={question.type === "single-choice" ? "radio" : "checkbox"}
                    name={`question-${question.questionId}`}
                    value={option.id}
                    checked={selected}
                    onChange={() => updateAnswer(question, option.id)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-blue-400 peer-checked:border-blue-700 peer-checked:bg-blue-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-blue-600">
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
        <button
          type="button"
          disabled={currentQuestionIndex === 0 || submissionPending}
          onClick={() => navigateToQuestion(Math.max(0, currentQuestionIndex - 1))}
          className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span aria-hidden="true" className="mr-2">←</span>Zurück
        </button>
        <button
          type="button"
          disabled={currentQuestionIndex === attempt.questionCount - 1 || submissionPending}
          onClick={() => navigateToQuestion(Math.min(attempt.questionCount - 1, currentQuestionIndex + 1))}
          className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Weiter<span aria-hidden="true" className="ml-2">→</span>
        </button>
      </div>

      <section aria-labelledby="quiz-submit-heading" className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 sm:p-6">
        <h2 id="quiz-submit-heading" className="text-lg font-bold text-slate-950">Quiz abschließen</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">Die Auswertung ist verfügbar, sobald alle 15 Fragen beantwortet sind.</p>
        <button
          type="button"
          disabled={!readyToSubmit || submissionPending}
          onClick={requestSubmission}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-6 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {submissionPending ? "Quiz wird ausgewertet …" : "Quiz abgeben"}
        </button>
      </section>

      <div aria-live="polite" aria-atomic="true" className="mt-4 space-y-3">
        {draftMessage && <p className="text-sm leading-6 text-slate-600">{draftMessage}</p>}
        {submissionPending && <p className="font-semibold text-blue-900">Deine Antworten werden sicher ausgewertet …</p>}
        {error && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-slate-900">{error}</p>}
      </div>

      <dialog ref={dialogRef} aria-labelledby="submit-dialog-heading" aria-describedby="submit-dialog-description" className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/55">
        <div className="p-6 sm:p-8">
          <h2 id="submit-dialog-heading" className="text-2xl font-bold text-slate-950">Quiz wirklich abgeben?</h2>
          <p id="submit-dialog-description" className="mt-3 leading-7 text-slate-600">Alle 15 Antworten werden jetzt serverseitig ausgewertet. Danach kannst du deine Antworten, die vollständigen Lösungen und Erklärungen prüfen.</p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <form method="dialog">
              <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:w-auto">Abbrechen</button>
            </form>
            <button type="button" onClick={submitQuiz} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Quiz abgeben</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function CompletedQuiz({ attempt }: { attempt: CompletedPracticeAttemptPageView }) {
  const router = useRouter();
  const restartingRef = useRef(false);
  const [restartPending, beginRestart] = useTransition();
  const [error, setError] = useState("");
  const storageKey = getPracticeQuizDraftStorageKey(attempt.id);

  useEffect(() => removeDraft(storageKey), [storageKey]);

  function restartQuiz() {
    if (restartPending || restartingRef.current) return;
    restartingRef.current = true;
    setError("");
    beginRestart(async () => {
      try {
        const result = await restartPracticeQuizAction(attempt.id);
        if (result.status !== "success" || !result.attemptId) {
          setError(result.message || "Das neue Quiz konnte nicht erstellt werden.");
          return;
        }
        router.push(`/quiz/${result.attemptId}`);
      } catch {
        setError("Das neue Quiz konnte gerade nicht erstellt werden. Bitte versuche es erneut.");
      } finally {
        restartingRef.current = false;
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Übungsquiz ausgewertet</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{attempt.correctCount} / {attempt.questionCount} richtig</h1>
        <p className="mt-2 text-2xl font-bold text-blue-900">{attempt.scorePercentage} %</p>
        {attempt.xpReward.status === "awarded" && (
          <p className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-950">
            +{attempt.xpReward.xpAmount} XP
          </p>
        )}
        {attempt.xpReward.status === "daily-limit" && (
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold leading-6 text-slate-800">
            Heutiges XP-Limit für Übungsquizze erreicht. Das Ergebnis zählt weiterhin für deine Statistik.
          </p>
        )}
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">Prüfe alle Fragen in Ruhe. Die Auswertung dient zum Üben und ist keine Bestehensprüfung.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" disabled={restartPending} onClick={restartQuiz} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60">{restartPending ? "Neues Quiz wird erstellt …" : "Neues Quiz mit gleicher Auswahl"}</button>
          <Link href="/quiz" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Andere Lernbereiche wählen</Link>
        </div>
        <div aria-live="assertive" className="mt-4">{error && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-slate-900">{error}</p>}</div>
      </header>

      <AssessmentBreakdown questions={attempt.questions} />

      <section aria-labelledby="review-heading" className="mt-9">
        <h2 id="review-heading" className="text-2xl font-bold text-slate-950">Alle Fragen im Überblick</h2>
        <p className="mt-2 leading-7 text-slate-600">Deine Auswahl und die vollständige richtige Antwortmenge sind jeweils textlich gekennzeichnet.</p>
        <ol className="mt-6 space-y-5">
          {attempt.questions.map((question) => <ResultQuestion key={question.questionId} question={question} />)}
        </ol>
      </section>
    </div>
  );
}

function AssessmentBreakdown({ questions }: { questions: readonly CompletedPracticeQuestionView[] }) {
  const groups = assessmentGroupIds.flatMap((groupId) => {
    const groupQuestions = questions.filter((question) => question.assessmentGroupId === groupId);
    return groupQuestions.length > 0 ? [{
      groupId,
      total: groupQuestions.length,
      correct: groupQuestions.filter((question) => question.isCorrect).length,
    }] : [];
  });
  return (
    <section aria-labelledby="practice-group-result-heading" className="mt-9">
      <h2 id="practice-group-result-heading" className="text-2xl font-bold text-slate-950">Ergebnis nach Lernbereich</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.groupId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="break-words text-sm font-semibold leading-6 text-slate-700">{assessmentGroupLabels[group.groupId]}</dt>
            <dd className="mt-2 text-2xl font-bold text-slate-950">{group.correct} / {group.total} richtig</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ResultQuestion({ question }: { question: CompletedPracticeQuestionView }) {
  return (
    <li>
      <article className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-7 ${question.isCorrect ? "border-emerald-200" : "border-red-300 ring-1 ring-red-100"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-600">Frage {question.position}</p>
          <p className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${question.isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900"}`}>
            <span aria-hidden="true" className="mr-1">{question.isCorrect ? "✓" : "✕"}</span>
            {question.isCorrect ? "Richtig beantwortet" : "Nicht richtig beantwortet"}
          </p>
        </div>
        <h3 className="mt-4 break-words text-lg font-bold leading-7 text-slate-950 sm:text-xl">{question.prompt}</h3>
        <p className="mt-2 text-sm font-semibold text-slate-600">{question.type === "multiple-selection" ? "Mehrere Antworten waren möglich." : "Eine Antwort war möglich."}</p>
        <ul className="mt-5 space-y-3">
          {question.options.map((option) => {
            const selected = question.selectedOptionIds.includes(option.id);
            const correct = question.correctOptionIds.includes(option.id);
            return (
              <li key={option.id} className={`rounded-xl border p-4 ${correct ? "border-emerald-300 bg-emerald-50" : selected ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-0.5 font-bold">{correct ? "✓" : selected ? "✕" : "○"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words leading-6 text-slate-900">{option.label}</p>
                    {(selected || correct) && (
                      <p className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                        {selected && <span className={`rounded-full px-2.5 py-1 ${correct ? "bg-emerald-100 text-emerald-950" : "bg-red-100 text-red-950"}`}>Deine Auswahl</span>}
                        {correct && <span className="rounded-full bg-white px-2.5 py-1 text-emerald-950 ring-1 ring-emerald-300">Richtige Antwort</span>}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 rounded-xl bg-blue-50 p-4">
          <p className="font-bold text-blue-950">Erklärung</p>
          <p className="mt-2 whitespace-pre-wrap break-words leading-7 text-slate-700">{question.explanation}</p>
        </div>
      </article>
    </li>
  );
}

function removeDraft(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Storage can be unavailable; completion remains server-authoritative.
  }
}

function restoreInitialDraft(
  attempt: InProgressPracticeAttemptView,
  storageKey: string,
) {
  try {
    const draft = parsePracticeQuizDraft(window.localStorage.getItem(storageKey), attempt);
    return {
      ...draft,
      message: Object.keys(draft.answers).length > 0
        ? "Dein lokaler Entwurf wurde wiederhergestellt."
        : "",
    };
  } catch {
    return {
      answers: {},
      currentQuestionIndex: 0,
      message: "Lokales Zwischenspeichern ist nicht verfügbar. Das Quiz funktioniert für diese Sitzung weiter.",
    };
  }
}

function persistDraft(
  attempt: InProgressPracticeAttemptView,
  storageKey: string,
  answers: PracticeQuizDraftAnswers,
  currentQuestionIndex: number,
  reportMessage: (message: string) => void,
) {
  try {
    window.localStorage.setItem(
      storageKey,
      serializePracticeQuizDraft(attempt, answers, currentQuestionIndex),
    );
  } catch {
    reportMessage("Lokales Zwischenspeichern ist nicht verfügbar. Das Quiz funktioniert für diese Sitzung weiter.");
  }
}

function subscribeToHydration() {
  return () => undefined;
}
