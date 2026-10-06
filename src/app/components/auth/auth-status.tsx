"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { logoutAction } from "../../actions/auth-actions";
import type { CurrentUser } from "../../lib/auth-types";

export function AuthStatus({ learner, compact = false, showIdentity = true }: {
  learner?: CurrentUser;
  compact?: boolean;
  showIdentity?: boolean;
}) {
  if (!learner) {
    return <Link href="/login" className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Anmelden</Link>;
  }
  if (!showIdentity) {
    return <form action={logoutAction}><LogoutButton compact={compact} /></form>;
  }
  return (
    <div className={compact ? "flex flex-wrap items-center justify-end gap-2 text-sm" : "space-y-3"}>
      <Link href={learner.mustChangePassword ? "/konto/passwort-aendern" : "/profil"} aria-label={learner.mustChangePassword ? "Temporäres Passwort ändern" : `Profil von ${learner.displayName} öffnen`} className="inline-flex min-h-11 min-w-0 flex-col justify-center rounded-lg font-semibold text-slate-700 underline-offset-4 hover:text-blue-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        <span className={compact ? "sr-only" : "block text-xs font-medium text-slate-500"}>Angemeldet als</span>
        <span className="block max-w-40 truncate">{learner.displayName}</span>
        {learner.mustChangePassword && <span className="block text-xs font-bold text-amber-800">Passwort ändern</span>}
      </Link>
      <form action={logoutAction}><LogoutButton compact={compact} /></form>
    </div>
  );
}

function LogoutButton({ compact }: { compact: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${compact ? "px-3" : "px-0"} inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60`}>
      {pending ? "Wird abgemeldet …" : "Abmelden"}
    </button>
  );
}
