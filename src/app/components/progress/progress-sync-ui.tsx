"use client";

import { useRouter } from "next/navigation";
import { useProgressSource } from "../../lib/progress-store";

export function ProgressSyncNotices() {
  const router = useRouter();
  const { error, localImportAvailable, importPending, importLocalProgress, dismissLocalImport, clearError } = useProgressSource();
  if (!error && !localImportAvailable) return null;
  return (
    <div className="mb-6 space-y-4">
      {error && (
        <section aria-labelledby="progress-sync-error-heading" className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
          <h2 id="progress-sync-error-heading" className="font-bold text-slate-950">Konto-Lernstand nicht synchronisiert</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700" role="alert">{error}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={() => router.refresh()} className="inline-flex min-h-11 items-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Erneut laden</button>
            <button type="button" onClick={clearError} className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-bold text-slate-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Hinweis schließen</button>
          </div>
        </section>
      )}
      {localImportAvailable && (
        <section aria-labelledby="local-import-heading" className="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
          <p className="text-sm font-semibold text-blue-700">Einmalige Übernahme</p>
          <h2 id="local-import-heading" className="mt-1 text-lg font-bold text-slate-950">Lokalen Lernstand übernehmen?</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">In diesem Browser ist anonymer Lernstand vorhanden. Du kannst ihn kontrolliert mit deinem Konto zusammenführen oder vorerst nur den Server-Lernstand verwenden.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={importPending} onClick={() => void importLocalProgress()} className="inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-65">{importPending ? "Wird übernommen …" : "Lokalen Lernstand übernehmen"}</button>
            <button type="button" disabled={importPending} onClick={dismissLocalImport} className="inline-flex min-h-12 items-center rounded-xl border border-blue-300 bg-white px-5 py-3 text-sm font-bold text-blue-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Server-Lernstand verwenden</button>
          </div>
        </section>
      )}
    </div>
  );
}

export function ProgressStorageIndicator() {
  const { mode } = useProgressSource();
  return <p className="inline-flex min-h-8 items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{mode === "authenticated" ? "Mit deinem Konto gespeichert" : "Nur in diesem Browser gespeichert"}</p>;
}
