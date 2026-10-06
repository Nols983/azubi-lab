import Link from "next/link";
import { assessmentGroupLabels } from "../../data/quiz-bank/categories.ts";
import type { PersonalPracticeQuizStatistics } from "../../lib/practice-quiz-statistics.ts";
import type { PracticeQuizStatisticsPageData } from "../../lib/server/practice-quiz-statistics-service.ts";

export type PracticeQuizStatisticsDisplayData = PracticeQuizStatisticsPageData
  | { audience: "unavailable" };

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

export function PracticeQuizStatistics({ data }: { data: PracticeQuizStatisticsDisplayData }) {
  return (
    <section aria-labelledby="practice-statistics-heading">
      <div>
        <p className="text-sm font-medium text-blue-700">Persönliche Übungsquizze</p>
        <h2 id="practice-statistics-heading" className="mt-1 text-2xl font-bold text-slate-950">Quiz-Statistik</h2>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
          Die Auswertung berücksichtigt ausschließlich deine vollständig abgegebenen Übungsquizze.
        </p>
      </div>
      <div className="mt-5">
        {data.audience === "anonymous" && <SignInState />}
        {data.audience === "password-change" && <PasswordChangeState />}
        {data.audience === "unavailable" && <UnavailableState />}
        {data.audience === "authenticated" && <AuthenticatedStatistics statistics={data.statistics} />}
      </div>
    </section>
  );
}

function AuthenticatedStatistics({ statistics }: { statistics: PersonalPracticeQuizStatistics }) {
  if (statistics.completedQuizCount === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-xl font-bold text-slate-950">Noch keine abgeschlossenen Übungsquizze</h3>
        <p className="mt-2 leading-7 text-slate-600">Starte ein Quiz und gib alle 15 Antworten ab, um hier deine persönliche Entwicklung zu sehen.</p>
        <Link href="/quiz" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Übungsquiz starten</Link>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <dl className="grid gap-4 sm:grid-cols-3">
        <StatisticCard label="Abgeschlossene Quizze" value={statistics.completedQuizCount.toLocaleString("de-DE")} />
        <StatisticCard label="Beantwortete Fragen" value={statistics.answeredQuestionCount.toLocaleString("de-DE")} />
        <StatisticCard label="Gesamtquote" value={`${statistics.overallAccuracyPercentage} %`} supporting={`${statistics.correctQuestionCount.toLocaleString("de-DE")} richtig beantwortet`} />
      </dl>
      <RecentHistory statistics={statistics} />
      <div>
        <h3 className="text-xl font-bold text-slate-950">Ergebnisse nach Lernbereich</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {statistics.categories.map((category) => (
            <article key={category.categoryId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-semibold text-blue-700">Lernbereich</p>
              <h4 className="mt-1 break-words text-xl font-bold text-slate-950">{assessmentGroupLabels[category.categoryId]}</h4>
              {category.accuracyPercentage === null ? (
                <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">Noch keine beantworteten Fragen in diesem Lernbereich.</p>
              ) : (
                <>
                  <p className="mt-5 text-3xl font-bold text-slate-950">{category.accuracyPercentage} % <span className="text-base font-semibold text-slate-600">richtig</span></p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{category.correctQuestionCount} von {category.answeredQuestionCount} Fragen richtig beantwortet</p>
                  <Trend trend={category.trend} answeredQuestionCount={category.answeredQuestionCount} />
                </>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecentHistory({ statistics }: { statistics: PersonalPracticeQuizStatistics }) {
  return (
    <section aria-labelledby="recent-quiz-history-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h3 id="recent-quiz-history-heading" className="text-xl font-bold text-slate-950">Letzte Quiz-Ergebnisse</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">Chronologisch von älter nach neuer, maximal zehn abgeschlossene Quizze.</p>
      <ol className="mt-6 flex min-h-48 items-end gap-2 overflow-x-auto pb-2 sm:gap-3" aria-label="Ergebnisverlauf der letzten abgeschlossenen Quizze">
        {statistics.recentHistory.map((item, index) => (
          <li key={item.attemptId} className="flex min-w-16 flex-1 flex-col items-center justify-end gap-2">
            <p className="text-xs font-bold text-slate-800">{item.accuracyPercentage} %</p>
            <div className="flex h-28 w-full items-end rounded-lg bg-slate-100 p-1" aria-hidden="true">
              <div className="w-full rounded-md bg-blue-700" style={{ height: `${item.accuracyPercentage}%` }} />
            </div>
            <p className="text-center text-xs leading-5 text-slate-600">
              <span className="font-bold text-slate-800">{item.correctCount}/{item.questionCount}</span><br />
              <time dateTime={item.completedAt}>{dateFormatter.format(new Date(item.completedAt))}</time>
              <span className="sr-only">, Ergebnis {index + 1} von {statistics.recentHistory.length}</span>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Trend({
  trend,
  answeredQuestionCount,
}: {
  trend: PersonalPracticeQuizStatistics["categories"][number]["trend"];
  answeredQuestionCount: number;
}) {
  if (!trend) {
    return <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">Trend: Noch nicht genügend Daten ({answeredQuestionCount} von mindestens 20 Fragen).</p>;
  }
  const change = trend.changePercentagePoints;
  const formattedChange = change > 0 ? `+${change}` : change < 0 ? `−${Math.abs(change)}` : "0";
  return (
    <div className="mt-5 rounded-xl bg-blue-50 p-4">
      <p className="text-sm font-bold text-blue-950">Trend: {formattedChange} Prozentpunkte</p>
      <p className="mt-1 text-xs leading-5 text-slate-700">
        Letzte {trend.windowSize} Fragen: {trend.recentAccuracyPercentage} % · Vorherige {trend.windowSize}: {trend.previousAccuracyPercentage} %
      </p>
    </div>
  );
}

function StatisticCard({ label, value, supporting }: { label: string; value: string; supporting?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <dt className="text-sm font-semibold text-slate-600">{label}</dt>
      <dd className="mt-2 text-3xl font-bold text-slate-950">{value}</dd>
      {supporting && <dd className="mt-1 text-xs leading-5 text-slate-600">{supporting}</dd>}
    </div>
  );
}

function SignInState() {
  return <Notice title="Für persönliche Statistik anmelden" text="Dein anonymer Lernfortschritt bleibt weiterhin in diesem Browser verfügbar. Melde dich an, um persistierte Übungsquiz-Ergebnisse zu sehen." href="/login?callbackUrl=%2Ffortschritt" action="Anmelden" />;
}

function PasswordChangeState() {
  return <Notice title="Temporäres Passwort ändern" text="Ändere zuerst dein temporäres Passwort. Die übrige Fortschrittsseite bleibt verfügbar." href="/konto/passwort-aendern?callbackUrl=%2Ffortschritt" action="Passwort ändern" />;
}

function UnavailableState() {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:p-6">
      <h3 className="text-lg font-bold text-slate-950">Quiz-Statistik vorübergehend nicht verfügbar</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">Die persönlichen Quizdaten konnten gerade nicht sicher geladen werden. Der übrige Lernfortschritt bleibt nutzbar.</p>
    </div>
  );
}

function Notice({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{text}</p>
      <Link href={href} className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{action}</Link>
    </div>
  );
}
