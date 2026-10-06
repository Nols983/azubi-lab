"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { startIhkExamAction } from "../../actions/ihk-exam-actions.ts";

export function IhkExamStartButton({ label = "IHK-Simulation starten" }: { label?: string }) {
  const router = useRouter();
  const startingRef = useRef(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function startExam() {
    if (pending || startingRef.current) return;
    startingRef.current = true;
    setError("");
    startTransition(async () => {
      try {
        const result = await startIhkExamAction();
        if (result.status !== "success" || !result.attemptId) {
          setError(result.message || "Die IHK-Simulation konnte nicht gestartet werden.");
          return;
        }
        router.push(`/quiz/ihk/${result.attemptId}`);
      } catch {
        setError("Die IHK-Simulation konnte gerade nicht gestartet werden. Bitte versuche es erneut.");
      } finally {
        startingRef.current = false;
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={startExam}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Prüfung wird vorbereitet …" : label}
      </button>
      <div aria-live="assertive" className="mt-3">
        {error && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-slate-900">{error}</p>}
      </div>
    </div>
  );
}
