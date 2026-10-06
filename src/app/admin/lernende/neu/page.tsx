import type { Metadata } from "next";
import Link from "next/link";
import { AdminAccessDenied } from "../../../components/admin/admin-access-denied";
import { LearnerCreateForm } from "../../../components/admin/learner-create-form";
import { getUserManagementPageAccess } from "../../../lib/server/admin-page-access";

export const metadata: Metadata = { title: "Konto anlegen" };
export const dynamic = "force-dynamic";

export default async function CreateLearnerPage() {
  const access = await getUserManagementPageAccess("/admin/lernende/neu");
  if (!access.allowed) return <AdminAccessDenied />;
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zur Administration</Link>
      <header className="mt-5"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Provisionierung</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Konto anlegen</h1><p className="mt-3 leading-7 text-slate-600">Lege ein Lern- oder Betrachterkonto an. Ein starkes temporäres Passwort wird serverseitig erzeugt und nur einmal angezeigt.</p></header>
      <section aria-labelledby="create-account-heading" className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="create-account-heading" className="text-xl font-bold text-slate-950">Kontodaten</h2>
        <div className="mt-5"><LearnerCreateForm /></div>
      </section>
    </div>
  );
}
