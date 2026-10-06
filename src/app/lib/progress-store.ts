"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { importLocalProgressAction, openLessonAction, setLessonCompletionAction, submitQuizAction } from "../actions/progress-actions";
import { EMPTY_LEARNER_PROGRESS_STATE, markLessonOpened as transitionLessonOpened, recordQuizAttempt as transitionQuizAttempt, setLessonCompleted as transitionLessonCompleted, type LearnerProgressState } from "./learner-progress";
import { decodeLearnerProgress, LEARNER_PROGRESS_STORAGE_KEY, LocalStorageProgressPersistence, parseLearnerProgress } from "./progress-persistence";
import type { QuizAnswers } from "./quiz-grading";

export type ProgressMode = "anonymous" | "authenticated" | "preview";

type ProgressStoreValue = {
  state: LearnerProgressState;
  mode: ProgressMode;
  ready: boolean;
  bypassProgression: boolean;
  learnerId?: string;
  error: string;
  localImportAvailable: boolean;
  importPending: boolean;
  startLesson(moduleSlug: string, lessonSlug: string, available: boolean): Promise<boolean>;
  updateLessonCompletion(moduleSlug: string, lessonSlug: string, completed: boolean, available: boolean): Promise<boolean>;
  saveQuizAttempt(moduleSlug: string, answers: QuizAnswers, correctCount: number, total: number): Promise<boolean>;
  importLocalProgress(): Promise<boolean>;
  dismissLocalImport(): void;
  clearError(): void;
};

const ProgressStoreContext = createContext<ProgressStoreValue | undefined>(undefined);
const persistence = new LocalStorageProgressPersistence();

export function LearnerProgressProvider({
  children,
  mode,
  learnerId,
  initialState,
  initialError = "",
  bypassProgression = false,
}: {
  children: ReactNode;
  mode: ProgressMode;
  learnerId?: string;
  initialState: LearnerProgressState;
  initialError?: string;
  bypassProgression?: boolean;
}) {
  const [state, setState] = useState(initialState);
  const [error, setError] = useState(initialError);
  const [localImportPayload, setLocalImportPayload] = useState<string | null>(null);
  const [importPending, setImportPending] = useState(false);
  const [ready, setReady] = useState(mode !== "anonymous");
  const anonymousStateLoaded = useRef(mode !== "anonymous");

  useEffect(() => {
    if (mode !== "anonymous") return;
    let active = true;
    queueMicrotask(() => {
      if (active) {
        anonymousStateLoaded.current = true;
        setState(persistence.load());
        setReady(true);
      }
    });
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LEARNER_PROGRESS_STORAGE_KEY) {
        anonymousStateLoaded.current = true;
        setState(parseLearnerProgress(event.newValue));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      active = false;
      window.removeEventListener("storage", handleStorage);
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "authenticated") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const rawPayload = window.localStorage.getItem(LEARNER_PROGRESS_STORAGE_KEY);
        const decoded = decodeLearnerProgress(rawPayload);
        const hasActivity = Object.keys(decoded.state.lessons).length > 0 || Object.keys(decoded.state.quizzes).length > 0;
        setLocalImportPayload(rawPayload && decoded.valid && hasActivity ? rawPayload : null);
      } catch {
        setLocalImportPayload(null);
      }
    });
    return () => {
      active = false;
    };
  }, [mode, learnerId]);

  const updateAnonymousState = useCallback((transition: (current: LearnerProgressState) => LearnerProgressState) => {
    setState((current) => {
      const base = anonymousStateLoaded.current ? current : persistence.load();
      anonymousStateLoaded.current = true;
      const next = transition(base);
      if (next !== current) persistence.save(next);
      return next;
    });
  }, []);

  const applyServerResult = useCallback((result: Awaited<ReturnType<typeof openLessonAction>>) => {
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setState(result.state);
    setError("");
    return true;
  }, []);

  const runServerAction = useCallback(async (action: () => Promise<Awaited<ReturnType<typeof openLessonAction>>>) => {
    try {
      return applyServerResult(await action());
    } catch {
      setError("Der Konto-Lernstand konnte nicht gespeichert werden. Bitte versuche es erneut.");
      return false;
    }
  }, [applyServerResult]);

  const startLesson = useCallback(async (moduleSlug: string, lessonSlug: string, available: boolean) => {
    if (!available) return false;
    if (mode === "preview") return true;
    if (mode === "anonymous") {
      updateAnonymousState((current) => transitionLessonOpened(current, moduleSlug, lessonSlug, true, new Date().toISOString()));
      return true;
    }
    return runServerAction(() => openLessonAction(moduleSlug, lessonSlug));
  }, [mode, runServerAction, updateAnonymousState]);

  const updateLessonCompletion = useCallback(async (moduleSlug: string, lessonSlug: string, completed: boolean, available: boolean) => {
    if (!available) return false;
    if (mode === "preview") return true;
    if (mode === "anonymous") {
      updateAnonymousState((current) => transitionLessonCompleted(current, moduleSlug, lessonSlug, completed, true, new Date().toISOString()));
      return true;
    }
    return runServerAction(() => setLessonCompletionAction(moduleSlug, lessonSlug, completed));
  }, [mode, runServerAction, updateAnonymousState]);

  const saveQuizAttempt = useCallback(async (moduleSlug: string, answers: QuizAnswers, correctCount: number, total: number) => {
    if (mode === "preview") return true;
    if (mode === "anonymous") {
      updateAnonymousState((current) => transitionQuizAttempt(current, moduleSlug, correctCount, total, new Date().toISOString()));
      return true;
    }
    return runServerAction(() => submitQuizAction(moduleSlug, answers));
  }, [mode, runServerAction, updateAnonymousState]);

  const importLocalProgress = useCallback(async () => {
    if (mode !== "authenticated" || !localImportPayload || importPending) return false;
    setImportPending(true);
    const imported = await runServerAction(() => importLocalProgressAction(localImportPayload));
    setImportPending(false);
    if (!imported) return false;
    try {
      window.localStorage.removeItem(LEARNER_PROGRESS_STORAGE_KEY);
    } catch {
      // The server import is authoritative even when browser storage is unavailable.
    }
    setLocalImportPayload(null);
    return true;
  }, [importPending, localImportPayload, mode, runServerAction]);

  const value = useMemo<ProgressStoreValue>(() => ({
    state,
    mode,
    ready,
    bypassProgression,
    learnerId,
    error,
    localImportAvailable: Boolean(localImportPayload),
    importPending,
    startLesson,
    updateLessonCompletion,
    saveQuizAttempt,
    importLocalProgress,
    dismissLocalImport: () => setLocalImportPayload(null),
    clearError: () => setError(""),
  }), [bypassProgression, error, importLocalProgress, importPending, learnerId, localImportPayload, mode, ready, saveQuizAttempt, startLesson, state, updateLessonCompletion]);

  return createElement(ProgressStoreContext.Provider, { value }, children);
}

export function useLearnerProgress() {
  return useProgressStore().state;
}

export function useLearnerProgressActions() {
  const { startLesson, updateLessonCompletion, saveQuizAttempt } = useProgressStore();
  return { startLesson, updateLessonCompletion, saveQuizAttempt };
}

export function useProgressSource() {
  const { mode, ready, bypassProgression, error, localImportAvailable, importPending, importLocalProgress, dismissLocalImport, clearError } = useProgressStore();
  return { mode, ready, bypassProgression, error, localImportAvailable, importPending, importLocalProgress, dismissLocalImport, clearError };
}

function useProgressStore(): ProgressStoreValue {
  return useContext(ProgressStoreContext) ?? {
    state: EMPTY_LEARNER_PROGRESS_STATE,
    mode: "anonymous",
    ready: false,
    bypassProgression: false,
    error: "",
    localImportAvailable: false,
    importPending: false,
    startLesson: async () => false,
    updateLessonCompletion: async () => false,
    saveQuizAttempt: async () => false,
    importLocalProgress: async () => false,
    dismissLocalImport: () => undefined,
    clearError: () => undefined,
  };
}
