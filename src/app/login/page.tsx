import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "../components/auth/login-form";
import { getCurrentDatabaseUser } from "../lib/server/current-user";
import { getSafeInternalNavigationTarget } from "../lib/internal-navigation";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string | string[]; passwordChanged?: string | string[] }> }) {
  const values = await searchParams;
  const value = values.callbackUrl;
  const callbackUrl = getSafeInternalNavigationTarget(value, "/");
  let currentUser;
  try {
    currentUser = await getCurrentDatabaseUser();
  } catch {
    // The public login UI remains available while configuration or the database is unavailable.
  }
  if (currentUser?.mustChangePassword) redirect(`/konto/passwort-aendern?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (currentUser) redirect(callbackUrl);
  const passwordChanged = values.passwordChanged === "1";
  return (
    <div className="mx-auto max-w-lg py-4 sm:py-10">
      <Link href="/" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zum Dashboard</Link>
      <section aria-labelledby="login-heading" className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Azubi Lab Konto</p>
        <h1 id="login-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Anmelden</h1>
        <p className="mt-3 leading-7 text-slate-600">Mit einem bereitgestellten Konto nutzt du den für deine Rolle freigegebenen Bereich. Lernkonten speichern ihren Lernstand serverseitig; eine öffentliche Registrierung gibt es nicht.</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">Passwort vergessen? Wende dich an die Administration, um einen einmaligen Reset-Link zu erhalten.</p>
        {passwordChanged && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-slate-900" role="status">Passwort geändert. Melde dich jetzt mit deinem neuen Passwort an.</p>}
        <LoginForm redirectTo={callbackUrl} />
      </section>
    </div>
  );
}
