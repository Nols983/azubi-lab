"use client";

import { useState } from "react";

export function TemporaryPasswordPanel({ password }: { password: string }) {
  const [copyStatus, setCopyStatus] = useState("");

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setCopyStatus("Temporäres Passwort kopiert.");
    } catch {
      setCopyStatus("Kopieren war nicht möglich. Markiere das Passwort und kopiere es manuell.");
    }
  }

  return (
    <section aria-labelledby="temporary-password-heading" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5" role="status">
      <h2 id="temporary-password-heading" className="text-lg font-bold text-slate-950">Temporäres Passwort</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">Das temporäre Passwort wird nur einmal angezeigt. Übergib es sicher an die lernende Person.</p>
      <code className="mt-4 block break-all rounded-xl border border-emerald-200 bg-white px-4 py-3 text-base font-bold text-slate-950 selection:bg-blue-200">{password}</code>
      <button type="button" onClick={copyPassword} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Passwort kopieren</button>
      <p className="mt-2 text-sm font-semibold text-slate-700" aria-live="polite">{copyStatus}</p>
    </section>
  );
}
