import type { Metadata } from "next";
import Link from "next/link";
import { PasswordResetForm } from "../components/auth/password-reset-form";

export const metadata: Metadata = {
  title: "Passwort zurücksetzen",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

export default async function PasswordResetPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string | string[] }>;
}) {
  const values = await searchParams;
  const success = values.success === "1";

  return (
    <div className="mx-auto max-w-lg py-4 sm:py-10">
      <Link href="/login" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zur Anmeldung</Link>
      <section aria-labelledby="password-reset-heading" className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Kontowiederherstellung</p>
        <h1 id="password-reset-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Passwort zurücksetzen</h1>
        {success ? (
          <div className="mt-5">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold leading-7 text-slate-900" role="status">Dein Passwort wurde geändert. Alle zuvor ausgestellten Kontositzungen sind nicht mehr gültig.</p>
            <Link href="/login?passwordChanged=1" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Jetzt anmelden</Link>
          </div>
        ) : (
          <>
            <p className="mt-3 leading-7 text-slate-600">Lege ein neues Passwort fest. Der Link kann nur einmal verwendet werden und ist höchstens 30 Minuten gültig.</p>
            <PasswordResetForm />
          </>
        )}
      </section>
    </div>
  );
}
