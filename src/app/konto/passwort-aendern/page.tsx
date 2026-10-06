import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PasswordChangeForm } from "../../components/auth/password-change-form";
import { getCurrentDatabaseUser, getSessionUserIdentity } from "../../lib/server/current-user";
import { getSafeInternalNavigationTarget } from "../../lib/internal-navigation";

export const metadata: Metadata = { title: "Passwort ändern" };
export const dynamic = "force-dynamic";

export default async function PasswordChangePage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string | string[] }> }) {
  const rawCallback = (await searchParams).callbackUrl;
  const callbackUrl = safeCallback(rawCallback);
  const session = await getSessionUserIdentity();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent("/konto/passwort-aendern")}`);
  const user = await getCurrentDatabaseUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent("/konto/passwort-aendern")}`);
  if (!user.mustChangePassword) redirect(callbackUrl);

  return (
    <div className="mx-auto max-w-lg py-4 sm:py-10">
      <section aria-labelledby="password-change-heading" className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-800">Erste Anmeldung</p>
        <h1 id="password-change-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Temporäres Passwort ändern</h1>
        <p className="mt-3 leading-7 text-slate-600">Bevor kontogebundener Lernfortschritt gespeichert werden kann, brauchst du ein neues, nur dir bekanntes Passwort. Danach wirst du abgemeldet und meldest dich mit dem neuen Passwort erneut an.</p>
        <PasswordChangeForm callbackUrl={callbackUrl} />
      </section>
    </div>
  );
}

function safeCallback(value: string | string[] | undefined) {
  const target = getSafeInternalNavigationTarget(value, "/konto");
  return target.startsWith("/konto/passwort-aendern") ? "/konto" : target;
}
