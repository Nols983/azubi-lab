import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IhkExamStartButton } from "../../components/quiz/ihk-exam-start-button.tsx";
import type { IhkExamOverview } from "../../lib/ihk-exam.ts";
import { getCurrentDatabaseUser } from "../../lib/server/current-user.ts";
import { getIhkExamOverview } from "../../lib/server/ihk-exam-service.ts";
import { canPreviewIhkExam, isReadOnlyPlatformPreview } from "../../lib/authorization.ts";
import { getIhkExamPreview } from "../../lib/server/quiz-preview-service.ts";
import { QuizApp } from "../../components/quiz/quiz-app.tsx";

export const metadata: Metadata = { title: "IHK-Simulation" };
export const dynamic = "force-dynamic";

export default async function IhkExamLandingPage() {
  let currentUser;
  try {
    currentUser = await getCurrentDatabaseUser();
  } catch (error) {
    console.error("[azubi-lab] IHK exam landing failed", error instanceof Error ? error.name : "UnknownError");
    return <IhkExamUnavailable />;
  }
  if (!currentUser) return <IhkExamLandingContent />;
  if (currentUser.mustChangePassword) {
    redirect("/konto/passwort-aendern?callbackUrl=%2Fquiz%2Fihk");
  }
  if (isReadOnlyPlatformPreview(currentUser.role) && canPreviewIhkExam(currentUser.role)) {
    return <IhkExamLandingContent preview />;
  }

  let overview: IhkExamOverview;
  try {
    overview = await getIhkExamOverview();
  } catch (error) {
    console.error("[azubi-lab] IHK exam overview failed", error instanceof Error ? error.name : "UnknownError");
    return <IhkExamUnavailable />;
  }
  return <IhkExamLandingContent overview={overview} authenticated />;
}

function IhkExamLandingContent({
  overview,
  authenticated = false,
  preview = false,
}: {
  overview?: IhkExamOverview;
  authenticated?: boolean;
  preview?: boolean;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Prüfungssituation üben</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">IHK-Simulation</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
          Bearbeite einen ausgewogenen, zeitlich begrenzten Fragenmix aus allen fünf Lernbereichen. Diese Simulation ersetzt keine offizielle IHK-Prüfung.
        </p>
      </header>

      <section aria-labelledby="ihk-format-heading" className="mt-7 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 sm:p-6">
        <h2 id="ihk-format-heading" className="font-bold text-slate-950">Prüfungsformat</h2>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-2">
          <li><strong className="text-slate-950">30 Fragen</strong><br />aus allen fünf aktuellen Lernbereichen</li>
          <li><strong className="text-slate-950">45 Minuten</strong><br />{preview ? "im regulären Prüfungsmodus; die Vorschau startet keine Frist" : "die Zeit läuft auch weiter, wenn du den Browser schließt"}</li>
          <li><strong className="text-slate-950">50 % zum Bestehen</strong><br />mindestens 15 von 30 Fragen müssen richtig sein</li>
          <li><strong className="text-slate-950">Freie Navigation</strong><br />du kannst Fragen überspringen und später zurückspringen</li>
          <li><strong className="text-slate-950">Keine Hinweise</strong><br />Lösungen und Erklärungen erscheinen erst nach der Abgabe</li>
          <li><strong className="text-slate-950">Keine XP</strong><br />die Simulation ist bewusst eine reine Prüfungsvorbereitung</li>
        </ul>
      </section>

      {preview ? (
        <section aria-labelledby="ihk-preview-heading" className="mt-8">
          <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Betrachtermodus</p>
            <h2 id="ihk-preview-heading" className="mt-2 text-2xl font-bold text-slate-950">Nicht persistente Simulation</h2>
            <p className="mt-3 leading-7 text-slate-700">Die Vorschau zeigt den vollständigen 30-Fragen-Mix und die Auswertung. Sie startet bewusst keine serverseitige Frist und erzeugt weder Versuchshistorie noch Statistik.</p>
          </div>
          <QuizApp quiz={getIhkExamPreview()} />
        </section>
      ) : <section aria-labelledby="ihk-start-heading" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 id="ihk-start-heading" className="text-xl font-bold text-slate-950">
          {overview?.activeAttempt ? "Aktive Prüfung" : "Simulation beginnen"}
        </h2>
        {overview?.activeAttempt ? (
          <>
            <p className="mt-2 leading-7 text-slate-600">Du hast bereits eine laufende Prüfung. Die ursprüngliche Frist bleibt bestehen.</p>
            <Link href={`/quiz/ihk/${overview.activeAttempt.id}`} className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Prüfung fortsetzen</Link>
          </>
        ) : authenticated ? (
          <>
            <p className="mt-2 leading-7 text-slate-600">Mit dem Start beginnt die serverseitige 45-Minuten-Frist sofort. Es gibt keine Pause.</p>
            <div className="mt-5"><IhkExamStartButton /></div>
          </>
        ) : (
          <>
            <p className="mt-2 leading-7 text-slate-600">Melde dich an, damit Antworten, Zeitlimit und persönliche Versuche sicher auf dem Server gespeichert werden.</p>
            <Link href="/login?callbackUrl=%2Fquiz%2Fihk" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Anmelden und Simulation öffnen</Link>
          </>
        )}
      </section>}

      {authenticated && !preview && <AttemptHistory history={overview?.history ?? []} />}

      <p className="mt-8"><Link href="/quiz" className="font-bold text-blue-900 underline decoration-blue-300 underline-offset-4 hover:decoration-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">← Zurück zum Übungsquiz</Link></p>
    </div>
  );
}

function AttemptHistory({ history }: { history: IhkExamOverview["history"] }) {
  return (
    <section aria-labelledby="ihk-history-heading" className="mt-10">
      <h2 id="ihk-history-heading" className="text-2xl font-bold text-slate-950">Deine letzten Simulationen</h2>
      {history.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 leading-7 text-slate-600">Noch keine abgeschlossene IHK-Simulation vorhanden.</p>
      ) : (
        <ol className="mt-5 grid gap-4 sm:grid-cols-2">
          {history.map((attempt) => (
            <li key={attempt.id}>
              <Link href={`/quiz/ihk/${attempt.id}`} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-lg text-slate-950">{attempt.correctCount}/{attempt.questionCount} richtig</strong>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${attempt.passed ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-slate-100 text-slate-700"}`}>{attempt.passed ? "Bestanden" : "Nicht bestanden"}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{attempt.scorePercentage} % · {attempt.completionReason === "timeout" ? "Zeit abgelaufen" : "Abgegeben"}</p>
                <p className="mt-1 text-sm text-slate-500">{formatDateTime(attempt.completedAt)}</p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function IhkExamUnavailable() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-950">IHK-Simulation vorübergehend nicht verfügbar</h1>
      <p className="mt-3 leading-7 text-slate-700">Konto und Prüfungsdaten konnten gerade nicht sicher geladen werden. Bitte versuche es später erneut.</p>
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
