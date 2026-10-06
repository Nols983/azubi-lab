import type { Metadata } from "next";
import Link from "next/link";
import { AdminAccessDenied } from "../../../components/admin/admin-access-denied";
import { ChallengeForm } from "../../../components/challenges/challenge-form";
import { getTrainerPageAccess } from "../../../lib/server/admin-page-access";

export const metadata: Metadata = { title: "Challenge erstellen" };

export default async function NewChallengePage() {
  const access = await getTrainerPageAccess("/admin/challenges/neu");
  if (!access.allowed) return <AdminAccessDenied />;
  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/challenges" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zu den Challenges</Link>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Administration</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Challenge erstellen</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">Lege den wiederverwendbaren Inhalt an. Die Zuweisung an Lernende erfolgt separat nach der Veröffentlichung.</p>
      </header>
      <section aria-labelledby="challenge-form-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="challenge-form-heading" className="text-xl font-bold text-slate-950">Inhalt und Lebenszyklus</h2>
        <div className="mt-6"><ChallengeForm /></div>
      </section>
    </div>
  );
}
