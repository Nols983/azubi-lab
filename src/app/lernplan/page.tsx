import type { Metadata } from "next";
import Link from "next/link";
import { CurriculumPlanCard } from "../components/curriculum/curriculum-plan-card.tsx";
import { canViewLearnerProgress } from "../lib/authorization.ts";
import { getLearnerPageAccess } from "../lib/server/learner-page-access.ts";
import { getLearnerLearningPlan } from "../lib/server/curriculum-planning-service.ts";

export const metadata: Metadata = { title: "Lernplan" };
export const dynamic = "force-dynamic";

export default async function LearningPlanPage() {
  const access = await getLearnerPageAccess("/lernplan");
  if (!access.allowed) return <LearnerPlanAccessDenied canViewReports={canViewLearnerProgress(access.user.role)} />;
  const plan = await getLearnerLearningPlan();
  const incomplete = plan.assignments.filter((assignment) => assignment.status !== "completed");
  const completed = plan.assignments.filter((assignment) => assignment.status === "completed");

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Persönliche Planung</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Mein Lernplan</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Hier siehst du die vom Trainer priorisierten Module. Der Lernplan ist eine Orientierung: Alle Lerninhalte bleiben frei zugänglich, und nur dein echter Lektions- und Quizfortschritt bestimmt den Status.</p>
      </header>

      {plan.assignments.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-950">Keine feste Zuweisung</h2>
          <p className="mt-2 leading-7 text-slate-600">Dir sind aktuell keine Lernmodule fest zugewiesen.</p>
          <p className="mt-2 leading-7 text-slate-600">Du kannst den vollständigen Lehrplan trotzdem jederzeit selbstständig bearbeiten.</p>
          <Link href="/lernen" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Alle Lernmodule öffnen</Link>
        </section>
      ) : (
        <div className="space-y-9">
          {incomplete.length > 0 && <PlanSection id="active-learning-plan" title="Offen und in Bearbeitung" assignments={incomplete} />}
          {completed.length > 0 && <PlanSection id="completed-learning-plan" title="Erledigte Planungsmodule" assignments={completed} />}
        </div>
      )}
    </div>
  );
}

function PlanSection({ id, title, assignments }: { id: string; title: string; assignments: Awaited<ReturnType<typeof getLearnerLearningPlan>>["assignments"] }) {
  return <section aria-labelledby={id}><h2 id={id} className="text-2xl font-bold text-slate-950">{title}</h2><div className="mt-5 grid gap-5 lg:grid-cols-2">{assignments.map((assignment) => <CurriculumPlanCard key={assignment.id} assignment={assignment} showAssigner />)}</div></section>;
}

function LearnerPlanAccessDenied({ canViewReports }: { canViewReports: boolean }) {
  return <section aria-labelledby="plan-denied-heading" className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm sm:p-9"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-800">Zugriff verweigert · 403</p><h1 id="plan-denied-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Nur für Lernkonten</h1><p className="mt-4 leading-7 text-slate-700">Diese Kontorolle besitzt keinen persönlichen Lernplan.</p><Link href={canViewReports ? "/admin/lerninhalte" : "/"} className="mt-6 inline-flex min-h-11 items-center rounded-lg font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{canViewReports ? "Zu den Lerninhalte-Berichten" : "Zum Dashboard"}</Link></section>;
}
