"use client";

import { useEffect, useRef, useState } from "react";
import type { Quiz, QuizQuestion } from "../../data/quizzes";
import { prepareModuleQuizAttempt } from "../../lib/module-quiz-attempt";
import { getCorrectOptionIds, gradeQuiz, isQuestionAnswered, type QuizAnswers } from "../../lib/quiz-grading";
import { useLearnerProgressActions, useProgressSource } from "../../lib/progress-store";

type QuizPhase = "intro" | "questions" | "result";

export function QuizApp({ quiz }: { quiz: Quiz }) {
  const [phase, setPhase] = useState<QuizPhase>("intro");
  const [attemptQuiz, setAttemptQuiz] = useState(quiz);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [validationMessage, setValidationMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const focusTarget = useRef<HTMLElement>(null);
  const attemptRecorded = useRef(false);
  const { saveQuizAttempt } = useLearnerProgressActions();

  useEffect(() => {
    focusTarget.current?.focus();
  }, [phase, currentIndex]);

  function startQuiz() {
    setAttemptQuiz(createAttemptQuiz(quiz));
    setPhase("questions");
    setAnswers({});
    setCurrentIndex(0);
    setValidationMessage("");
    attemptRecorded.current = false;
  }

  function selectSingle(questionId: string, optionId: string) {
    setAnswers((current) => ({ ...current, [questionId]: [optionId] }));
    setValidationMessage("");
  }

  function toggleMultiple(questionId: string, optionId: string) {
    setAnswers((current) => {
      const selected = current[questionId] ?? [];
      return {
        ...current,
        [questionId]: selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId],
      };
    });
    setValidationMessage("");
  }

  async function submitQuiz() {
    const firstUnansweredIndex = attemptQuiz.questions.findIndex(
      (question) => !isQuestionAnswered(question, answers[question.id]),
    );
    if (firstUnansweredIndex >= 0) {
      setCurrentIndex(firstUnansweredIndex);
      setValidationMessage(`Beantworte zuerst alle Fragen. Frage ${firstUnansweredIndex + 1} ist noch offen.`);
      return;
    }
    if (attemptRecorded.current) return;
    const grade = gradeQuiz(attemptQuiz, answers);
    attemptRecorded.current = true;
    setSubmitting(true);
    const saved = await saveQuizAttempt(quiz.moduleSlug, answers, grade.correctCount, grade.totalCount);
    setSubmitting(false);
    if (!saved) {
      attemptRecorded.current = false;
      setValidationMessage("Der Versuch konnte nicht gespeichert werden. Bitte versuche die Abgabe erneut.");
      return;
    }
    setValidationMessage("");
    setPhase("result");
  }

  function retryQuiz() {
    setAttemptQuiz(createAttemptQuiz(quiz));
    setAnswers({});
    setCurrentIndex(0);
    setValidationMessage("");
    attemptRecorded.current = false;
    setPhase("questions");
  }

  if (phase === "intro") {
    return (
      <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="quiz-intro-heading">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">Wissen prüfen</p>
        <h2 ref={(node) => { focusTarget.current = node; }} tabIndex={-1} id="quiz-intro-heading" className="mt-2 text-2xl font-bold tracking-tight text-slate-950 focus:outline-none">{quiz.title}</h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">{quiz.description}</p>
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <p><strong>{quiz.questions.length} Fragen</strong> · Jede vollständig richtige Antwort zählt einen Punkt.</p>
          <p className="mt-1">Bei Mehrfachauswahl müssen alle richtigen und keine falschen Antworten ausgewählt sein.</p>
        </div>
        <button type="button" onClick={startQuiz} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Quiz starten</button>
      </section>
    );
  }

  if (phase === "result") {
    return <QuizResult quiz={attemptQuiz} answers={answers} onRetry={retryQuiz} focusRef={focusTarget} />;
  }

  const question = attemptQuiz.questions[currentIndex];
  const selectedIds = answers[question.id] ?? [];
  const isLast = currentIndex === attemptQuiz.questions.length - 1;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="current-question-heading">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-bold text-blue-700">Frage {currentIndex + 1} von {attemptQuiz.questions.length}</p>
        <p className="text-slate-500">{question.lesson}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><div className="h-full rounded-full bg-blue-700 transition-[width]" style={{ width: `${((currentIndex + 1) / attemptQuiz.questions.length) * 100}%` }} /></div>
      <form className="mt-7" onSubmit={(event) => { event.preventDefault(); if (isLast) void submitQuiz(); else setCurrentIndex((index) => index + 1); }}>
        <fieldset>
          <legend ref={(node) => { focusTarget.current = node; }} tabIndex={-1} id="current-question-heading" className="text-xl font-bold leading-8 text-slate-950 focus:outline-none sm:text-2xl">{question.prompt}</legend>
          {question.type === "multiple-selection" && <p className="mt-2 text-sm text-slate-600">Mehrere Antworten können richtig sein.</p>}
          <div className="mt-5 space-y-3">
            {question.options.map((option) => {
              const checked = selectedIds.includes(option.id);
              return (
                <label key={option.id} className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-800 transition-colors hover:border-blue-300 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600 sm:text-base">
                  <input
                    type={question.type === "single-choice" ? "radio" : "checkbox"}
                    name={`question-${question.id}`}
                    checked={checked}
                    onChange={() => question.type === "single-choice" ? selectSingle(question.id, option.id) : toggleMultiple(question.id, option.id)}
                    className="mt-1 size-5 shrink-0 accent-blue-700"
                  />
                  <span className="min-w-0 break-words">{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div aria-live="assertive" aria-atomic="true">
          {validationMessage && <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-slate-900">{validationMessage}</p>}
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          {currentIndex > 0 && <button type="button" onClick={() => { setCurrentIndex((index) => index - 1); setValidationMessage(""); }} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zurück</button>}
          <button type="submit" disabled={submitting} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65">{submitting ? "Wird gespeichert …" : isLast ? "Quiz abgeben" : "Weiter"}</button>
        </div>
      </form>
    </section>
  );
}

function createAttemptQuiz(quiz: Quiz) {
  const seed = new Uint32Array(1);
  globalThis.crypto.getRandomValues(seed);
  return prepareModuleQuizAttempt(quiz, seed[0] ?? 0);
}

function QuizResult({ quiz, answers, onRetry, focusRef }: { quiz: Quiz; answers: QuizAnswers; onRetry: () => void; focusRef: React.RefObject<HTMLElement | null> }) {
  const grade = gradeQuiz(quiz, answers);
  const assessment = getAssessment(grade.percentage);
  const { mode } = useProgressSource();

  return (
    <div className="space-y-8">
      <section aria-labelledby="quiz-result-heading" aria-live="polite" className="rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">Dein Ergebnis</p>
        <h2 ref={(node) => { focusRef.current = node; }} tabIndex={-1} id="quiz-result-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-950 focus:outline-none">{grade.correctCount} von {grade.totalCount} richtig</h2>
        <p className="mt-3 text-4xl font-bold text-blue-950">{grade.percentage} %</p>
        <p className="mt-3 font-semibold text-slate-800">{assessment}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{mode === "preview" ? "Dieser Vorschauversuch wurde nicht gespeichert." : `Der Versuch wurde ${mode === "authenticated" ? "mit deinem Konto" : "anonym in diesem Browser"} gespeichert. Deine einzelnen Antworten werden nicht gespeichert.`}</p>
        <button type="button" onClick={onRetry} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Quiz erneut versuchen</button>
      </section>
      <section aria-labelledby="answer-review-heading">
        <h2 id="answer-review-heading" className="text-2xl font-bold tracking-tight text-slate-950">Antworten überprüfen</h2>
        <ol className="mt-5 space-y-5">
          {grade.results.map((result, index) => <ReviewItem key={result.question.id} index={index} result={result} />)}
        </ol>
      </section>
    </div>
  );
}

function ReviewItem({ index, result }: { index: number; result: ReturnType<typeof gradeQuiz>["results"][number] }) {
  const selectedLabels = getOptionLabels(result.question, result.selectedOptionIds);
  const correctLabels = getOptionLabels(result.question, getCorrectOptionIds(result.question));
  return (
    <li className={`rounded-2xl border p-5 sm:p-6 ${result.isCorrect ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
      <p className="text-sm font-bold text-slate-700">Frage {index + 1} · {result.isCorrect ? "Richtig" : "Nicht richtig"}</p>
      <h3 className="mt-2 font-bold leading-7 text-slate-950">{result.question.prompt}</h3>
      <dl className="mt-4 space-y-3 text-sm leading-6 text-slate-800">
        <div><dt className="font-bold">Deine Antwort</dt><dd className="mt-1 break-words">{selectedLabels.join(", ") || "Keine Antwort"}</dd></div>
        <div><dt className="font-bold">Richtige Antwort</dt><dd className="mt-1 break-words">{correctLabels.join(", ")}</dd></div>
        <div><dt className="font-bold">Erklärung</dt><dd className="mt-1">{result.question.explanation}</dd></div>
      </dl>
    </li>
  );
}

function getOptionLabels(question: QuizQuestion, optionIds: readonly string[]) {
  const ids = new Set(optionIds);
  return question.options.filter((option) => ids.has(option.id)).map((option) => option.label);
}

function getAssessment(percentage: number) {
  if (percentage >= 90) return "Sehr sicher";
  if (percentage >= 75) return "Gute Grundlage";
  if (percentage >= 50) return "Einige Themen solltest du noch wiederholen";
  return "Wiederhole die Grundlagen und versuche es anschließend erneut";
}
