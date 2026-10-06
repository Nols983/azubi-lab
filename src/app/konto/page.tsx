import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthStatus } from "../components/auth/auth-status";
import type { CurrentUser } from "../lib/auth-types";
import { ACCOUNT_ROLE_LABELS } from "../lib/auth-types";
import { getCurrentDatabaseUser } from "../lib/server/current-user";
import { isReadOnlyPlatformPreview } from "../lib/authorization";

export const metadata: Metadata = { title: "Konto" };

export default async function AccountPage() {
  let learner;
  try {
    learner = await getCurrentDatabaseUser();
  } catch {
    redirect("/login?callbackUrl=/konto");
  }
  if (!learner) redirect("/login?callbackUrl=/konto");
  if (learner.mustChangePassword) redirect("/konto/passwort-aendern?callbackUrl=/konto");
  const currentUser: CurrentUser = {
    id: learner.id,
    login: learner.login,
    displayName: learner.displayName,
    role: learner.role,
    mustChangePassword: learner.mustChangePassword,
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header><p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Kontobereich</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Dein Konto</h1></header>
      <section aria-labelledby="account-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="account-heading" className="text-xl font-bold text-slate-950">{learner.displayName}</h2>
        <dl className="mt-4 space-y-3 text-sm text-slate-700"><div><dt className="font-bold">Anmeldekennung</dt><dd className="mt-1 break-all">{learner.login}</dd></div><div><dt className="font-bold">Kontotyp</dt><dd className="mt-1">{ACCOUNT_ROLE_LABELS[learner.role]}</dd></div><div><dt className="font-bold">Lernstand</dt><dd className="mt-1">{isReadOnlyPlatformPreview(learner.role) ? "Betrachtervorschau ohne Lernfortschritt" : "Serverseitig mit diesem Konto gespeichert"}</dd></div></dl>
        <div className="mt-6"><AuthStatus learner={currentUser} /></div>
      </section>
    </div>
  );
}
