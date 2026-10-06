"use client";

import { useState } from "react";

export function PasswordResetLinkPanel({ resetUrl }: { resetUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-slate-900">
      <p className="font-bold">Einmaliger Passwort-Link</p>
      <p className="mt-2 text-sm leading-6">Der Link läuft nach 30 Minuten ab, funktioniert genau einmal und darf nur an die vorgesehene Person weitergegeben werden.</p>
      <code className="mt-3 block overflow-x-auto whitespace-nowrap rounded-lg border border-amber-200 bg-white p-3 text-sm text-slate-950" aria-label="Einmaliger Passwort-Link">{resetUrl}</code>
      <button type="button" onClick={copyLink} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-blue-900 bg-white px-4 py-2 text-sm font-bold text-blue-950 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Link kopieren</button>
      <p className="mt-2 min-h-6 text-sm font-semibold text-emerald-800" role="status" aria-live="polite">{copied ? "Link wurde in die Zwischenablage kopiert." : ""}</p>
    </div>
  );
}
