import { ContinueLearningCard } from "./components/dashboard/continue-learning-card";
import { DailyChallengeCard } from "./components/dashboard/daily-challenge-card";
import { LearningAreas } from "./components/dashboard/learning-areas";
import { LearningPlanSummary } from "./components/dashboard/learning-plan-summary";
import { ProgressSummary } from "./components/dashboard/progress-summary";
import { DynamicDashboardGreeting } from "./components/dashboard/dynamic-greeting";
import { NotificationSummary } from "./components/notifications/notification-summary";
import { dashboardLearningAreas } from "./data/dashboard-demo";
import { getDashboardChallengeView } from "./lib/server/challenge-service";
import { getDashboardLearningPlanView } from "./lib/server/curriculum-planning-service";
import { getNotificationDashboardSummary } from "./lib/server/notification-service";
import { getCurrentShellProfileView } from "./lib/server/profile-service";
import { DashboardXpCard } from "./components/xp/xp-summary";
import Link from "next/link";
import { isReadOnlyPlatformPreview } from "./lib/authorization";
import { getCurrentDatabaseUser } from "./lib/server/current-user";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const currentUser = process.env.AUTH_SECRET ? await getCurrentDatabaseUser() : undefined;
  if (currentUser && isReadOnlyPlatformPreview(currentUser.role)) {
    return <ObserverDashboard displayName={currentUser.displayName} />;
  }
  const [challenge, learningPlan, notifications, shellProfile] = await Promise.all([
    getDashboardChallengeView(),
    getDashboardLearningPlanView(),
    getNotificationDashboardSummary(),
    getCurrentShellProfileView(),
  ]);
  return (
    <div className="space-y-8 sm:space-y-10">
      <DynamicDashboardGreeting displayName={currentUser?.displayName} />
      <section aria-labelledby="today-heading">
        <div className="mb-4"><p className="text-sm font-medium text-blue-700">Dein nächster Schritt</p><h2 id="today-heading" className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Heute im Azubi Lab</h2></div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,1fr)]"><ContinueLearningCard /><DailyChallengeCard data={challenge} /></div>
      </section>
      {notifications.audience === "learner" && <NotificationSummary unreadCount={notifications.unreadCount} notifications={notifications.notifications} />}
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <LearningPlanSummary data={learningPlan} />
        <ProgressSummary />
      </div>
      {shellProfile?.xp && <DashboardXpCard progress={shellProfile.xp} activeTitle={shellProfile.activeTitle} milestones={shellProfile.nextMilestones} />}
      <LearningAreas areas={dashboardLearningAreas} />
    </div>
  );
}

function ObserverDashboard({ displayName }: { displayName: string }) {
  const destinations = [
    { href: "/lernen", title: "Lernen", description: "Alle Module und Lektionen ohne Lernstandsänderung ansehen." },
    { href: "/labs", title: "Labs", description: "Alle Troubleshooting-Szenarien im isolierten Vorschaumodus testen." },
    { href: "/quiz", title: "Quiz", description: "Quizfragen und IHK-Simulation ohne persönliche Historie ausprobieren." },
    { href: "/challenges", title: "Challenges", description: "Veröffentlichte Praxisaufgaben ohne Zuweisungs- oder Abgabedaten ansehen." },
  ] as const;
  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Betrachtermodus</p>
        <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Willkommen, {displayName}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">Erkunde die Lernplattform in einer sicheren, schreibgeschützten Vorschau. Es werden keine XP, Lernstände oder persönlichen Versuchshistorien erzeugt.</p>
      </header>
      <section aria-labelledby="observer-destinations-heading">
        <h2 id="observer-destinations-heading" className="text-2xl font-bold text-slate-950">Plattform erkunden</h2>
        <ul className="mt-5 grid gap-5 sm:grid-cols-2">
          {destinations.map((destination) => (
            <li key={destination.href}>
              <Link href={destination.href} className="flex min-h-40 h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:p-6">
                <span className="text-xl font-bold text-slate-950">{destination.title}</span>
                <span className="mt-2 flex-1 leading-7 text-slate-600">{destination.description}</span>
                <span className="mt-5 font-bold text-blue-800">Öffnen <span aria-hidden="true">→</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
