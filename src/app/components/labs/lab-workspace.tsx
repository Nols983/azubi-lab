"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  configureLabAction,
  resetLabAction,
  revealLabHintAction,
  runLabCommandAction,
  selectLabDeviceAction,
  startLabAction,
  type LabActionResult,
} from "../../actions/lab-actions.ts";
import type { LabAttemptView, LabPageView } from "../../lib/interactive-lab.ts";
import { Requirements } from "./lab-catalogue.tsx";
import { LabConfiguration } from "./lab-configuration.tsx";
import { LabTerminal } from "./lab-terminal.tsx";
import { LabTopology } from "./lab-topology.tsx";

export function LabWorkspace({ initial }: { initial: LabPageView }) {
  const [attempt, setAttempt] = useState(initial.attempt);
  const [message, setMessage] = useState("");
  const [resetArmed, setResetArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (operation: () => Promise<LabActionResult>, onSuccess?: () => void) => {
    setMessage("");
    startTransition(async () => {
      const result = await operation();
      if (result.ok) {
        onSuccess?.();
        setAttempt(result.attempt);
      }
      else setMessage(result.message);
    });
  };
  const missingLabRequirement = initial.requirements.labs.find((lab) => !lab.satisfied);

  if (initial.locked) return (
    <div className="space-y-6"><LabBriefing kind={initial.definition.kind} scenario={initial.definition.scenario} task={initial.definition.task} /><section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Gesperrt</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">Dieses Lab ist noch nicht freigeschaltet</h2>
      <p className="mt-3 leading-7 text-slate-700">Die Voraussetzungen werden bei jedem Start und jeder Aktion serverseitig geprüft.</p>
      <Requirements requirements={initial.requirements} locked />
      <Link href={missingLabRequirement?.href ?? "/lernen"} className="inline-flex min-h-12 items-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{missingLabRequirement ? "Zum Einführungslab" : "Zu den Lernmodulen"}</Link>
    </section></div>
  );

  if (!attempt && initial.definition.kind === "tutorial") return (
    <section className="overflow-hidden rounded-3xl border border-violet-300 bg-gradient-to-br from-violet-50 via-white to-blue-50 shadow-sm">
      <div className="p-6 sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-violet-800">Einführung · etwa {initial.definition.estimatedMinutes} Minuten</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Willkommen im Lab-Tutorial</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">Du arbeitest direkt mit der echten Lab-Oberfläche. Eine violette Anleitung bleibt sichtbar und führt dich Schritt für Schritt durch Topologie, Terminal, Hinweis, Konfiguration und Funktionsprüfung.</p>
        <h3 className="mt-6 text-lg font-bold text-slate-950">Danach kannst du</h3>
        <ul className="mt-3 grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-3">
          <li className="rounded-xl border border-violet-200 bg-white p-4">ein Gerät auswählen und Diagnosebefehle ausführen,</li>
          <li className="rounded-xl border border-violet-200 bg-white p-4">einen Befund kontrolliert korrigieren,</li>
          <li className="rounded-xl border border-violet-200 bg-white p-4">eine Reparatur mit einem Funktionstest bestätigen.</li>
        </ul>
        <details className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-3"><summary className="min-h-11 cursor-pointer py-2 font-bold text-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Ausgangssituation und Auftrag ansehen</summary><div className="pb-2"><LabBriefing kind={initial.definition.kind} scenario={initial.definition.scenario} task={initial.definition.task} /></div></details>
        {initial.mode === "preview" && <p className="mt-5 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950"><strong>Vorschau:</strong> Dieser Versuch erzeugt keine XP und keinen Lernendenfortschritt.</p>}
        <button type="button" disabled={pending} onClick={() => run(() => startLabAction({ labId: initial.definition.id }))} className="mt-6 min-h-12 rounded-xl bg-violet-800 px-6 py-3 text-base font-bold text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 disabled:opacity-60">{pending ? "Tutorial wird vorbereitet …" : "Tutorial starten"}</button>
        <LiveMessage message={message} />
      </div>
    </section>
  );
  if (!attempt) return (
    <div className="space-y-6">
      <LabBriefing kind={initial.definition.kind} scenario={initial.definition.scenario} task={initial.definition.task} />
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold text-slate-950">{initial.mode === "preview" ? "Vorschau starten" : "Lab starten"}</h2>
      <p className="mt-3 leading-7 text-slate-600">Der Zustand wird serverseitig gespeichert. Du kannst später an derselben Stelle fortfahren.</p>
      {initial.mode === "preview" && <p className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950"><strong>Vorschau:</strong> Dieser Versuch erzeugt keine XP und keinen Lernendenfortschritt.</p>}
      <button type="button" disabled={pending} onClick={() => run(() => startLabAction({ labId: initial.definition.id }))} className="mt-5 min-h-12 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60">{pending ? "Lab wird vorbereitet …" : "Lab starten"}</button>
      <LiveMessage message={message} />
    </section>
    </div>
  );

  if (attempt.status === "completed") return <CompletedLab attempt={attempt} pending={pending} message={message} replay={() => run(() => startLabAction({ labId: attempt.labId }))} />;

  const workArea = (
    <>
      {attempt.workflow.configurationChanged && !attempt.workflow.repairComplete && <section aria-live="polite" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:p-6"><h2 className="text-xl font-bold text-amber-950">Konfiguration geändert – Vorfall noch nicht gelöst</h2><p className="mt-2 leading-7 text-amber-950">Prüfe die Auswirkungen deiner Änderung erneut. Wenn die Funktionsprüfung weiterhin fehlschlägt, sammle weitere Befunde, bevor du die nächste gezielte Korrektur vornimmst.</p></section>}
      {attempt.verificationPending && <section aria-live="polite" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:p-6"><h2 className="text-xl font-bold text-amber-950">Konfiguration korrigiert – Funktionsprüfung noch offen</h2><p className="mt-2 leading-7 text-amber-950">Die Konfiguration wurde geändert und entspricht dem erwarteten Zustand. Überprüfe jetzt mit einem passenden Diagnosebefehl, ob das ursprüngliche Problem tatsächlich behoben ist. Erst ein erfolgreicher Funktionsnachweis schließt das Lab ab.</p></section>}
      <LabTopology attempt={attempt} pending={pending} select={(deviceId) => run(() => selectLabDeviceAction({ attemptId: attempt.attemptId, deviceId, revision: attempt.revision }))} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <LabTerminal attempt={attempt} pending={pending} submit={(command) => run(() => runLabCommandAction({ attemptId: attempt.attemptId, deviceId: attempt.selectedDeviceId, command, revision: attempt.revision }))} />
        <LabConfiguration key={attempt.selectedDeviceId} attempt={attempt} pending={pending} submit={(action, onSuccess) => run(() => configureLabAction({ attemptId: attempt.attemptId, deviceId: attempt.selectedDeviceId, action, revision: attempt.revision }), onSuccess)} />
      </div>
      <Hints attempt={attempt} pending={pending} reveal={() => run(() => revealLabHintAction({ attemptId: attempt.attemptId, revision: attempt.revision }))} />
      <History attempt={attempt} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-xl font-bold text-slate-950">Durchlauf verwalten</h2><p className="mt-2 text-sm leading-6 text-slate-600">Zurücksetzen stellt den ursprünglichen Fehler bewusst wieder her. Der aktuelle Durchlauf beginnt neu.</p>{resetArmed ? <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="text-sm font-semibold text-slate-900">Aktuellen Zustand wirklich verwerfen und neu beginnen?</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => { setResetArmed(false); run(() => resetLabAction({ attemptId: attempt.attemptId, revision: attempt.revision })); }} className="min-h-11 rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60">Zurücksetzen bestätigen</button><button type="button" disabled={pending} onClick={() => setResetArmed(false)} className={secondaryButton}>Abbrechen</button></div></div> : <button type="button" disabled={pending} onClick={() => setResetArmed(true)} className="mt-4 min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60">Lab zurücksetzen</button>}</section>
      <LiveMessage message={message} />
    </>
  );

  return (
    <div className="space-y-6">
      {attempt.mode === "preview" && <p className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm font-semibold text-violet-950">Vorschau-Modus · keine XP, kein Lernendenfortschritt</p>}
      <LabBriefing kind={attempt.kind} scenario={attempt.scenario} task={attempt.task} />
      {attempt.tutorial ? (
        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,2.2fr)]">
          <TutorialGuide tutorial={attempt.tutorial} />
          <div className="min-w-0 space-y-6">{workArea}</div>
        </div>
      ) : workArea}
    </div>
  );
}

function LabBriefing({ kind, scenario, task }: { kind: LabPageView["definition"]["kind"]; scenario: string; task: string }) {
  return kind === "tutorial" ? <ScenarioTask scenario={scenario} task={task} /> : <NormalLabBriefing scenario={scenario} task={task} />;
}

function NormalLabBriefing({ scenario, task }: { scenario: string; task: string }) {
  return (
    <div className="space-y-3">
      <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="min-h-12 cursor-pointer px-5 py-4 text-slate-700 marker:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-6">
          <h2 className="inline text-sm font-bold text-slate-950">Ausgangssituation</h2>
        </summary>
        <p className="border-t border-slate-100 px-5 py-4 leading-7 text-slate-700 sm:px-6">{scenario}</p>
      </details>
      <details open className="rounded-2xl border border-blue-300 bg-blue-50 shadow-sm">
        <summary className="min-h-12 cursor-pointer px-5 py-4 text-blue-900 marker:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-6">
          <h2 className="inline text-sm font-bold text-blue-950">Aufgabe</h2>
        </summary>
        <p className="border-t border-blue-200 px-5 py-4 font-semibold leading-7 text-blue-950 sm:px-6">{task}</p>
      </details>
    </div>
  );
}

function ScenarioTask({ scenario, task }: { scenario: string; task: string }) {
  return <div className="space-y-4"><section aria-labelledby="scenario-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 id="scenario-heading" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Ausgangssituation</h2><p className="mt-2 max-w-4xl leading-7 text-slate-700">{scenario}</p></section><section aria-labelledby="task-heading" className="rounded-2xl border border-blue-300 bg-blue-50 p-4 shadow-sm sm:px-6 sm:py-5"><h2 id="task-heading" className="text-xs font-bold uppercase tracking-[0.14em] text-blue-800">Aufgabe</h2><p className="mt-2 max-w-4xl font-semibold leading-7 text-blue-950">{task}</p></section></div>;
}

function TutorialGuide({ tutorial }: { tutorial: NonNullable<LabAttemptView["tutorial"]> }) {
  const previousStep = useRef(tutorial.step);
  const [updated, setUpdated] = useState(false);
  useEffect(() => {
    if (previousStep.current === tutorial.step) return;
    previousStep.current = tutorial.step;
    setUpdated(true);
    const timeout = window.setTimeout(() => setUpdated(false), 1_500);
    return () => window.clearTimeout(timeout);
  }, [tutorial.step]);
  return <section aria-labelledby="tutorial-step-heading" aria-live="polite" aria-atomic="true" className="sticky top-2 z-20 max-h-[34svh] overflow-y-auto rounded-2xl border border-violet-400 bg-violet-50/95 p-5 shadow-lg backdrop-blur-sm transition-colors duration-300 motion-reduce:transition-none sm:p-6 lg:top-6 lg:max-h-[calc(100svh-3rem)]">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-800">Tutorial · Schritt {tutorial.step} von {tutorial.totalSteps}</p>{updated && <span className="rounded-full bg-violet-800 px-3 py-1 text-xs font-bold text-white">Aktualisiert</span>}</div>
    <h2 id="tutorial-step-heading" className="mt-1 text-xl font-bold text-slate-950">{tutorial.title}</h2>
    {tutorial.confirmation && <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">✓ {tutorial.confirmation}</p>}
    <p className="mt-3 leading-7 text-slate-700">{tutorial.instruction}</p>
    {tutorial.principle && <p className="mt-4 rounded-xl border border-violet-300 bg-white p-4 text-center text-lg font-black text-violet-950">{tutorial.principle}</p>}
  </section>;
}


function Hints({ attempt, pending, reveal }: { attempt: LabAttemptView; pending: boolean; reveal: () => void }) { return <section aria-labelledby="hints-heading" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6"><h2 id="hints-heading" className="text-xl font-bold text-slate-950">Progressive Hinweise</h2><p className="mt-2 text-sm leading-6 text-slate-700">{attempt.kind === "tutorial" ? "Öffne Hinweise bewusst und vergleiche sie mit deinen eigenen Befunden. Im Tutorial entstehen dadurch keine XP-Abzüge." : "Hinweise sind legitime Lernunterstützung. Beim ersten Abschluss eines normalen Lernenden-Labs verringert jeder unterschiedliche geöffnete Hinweis die Belohnung um 25 XP; ein Neustart setzt diese Zählung nicht zurück."}</p>{attempt.revealedHints.length > 0 && <ol className="mt-4 space-y-2">{attempt.revealedHints.map((hint, index) => <li key={hint} className="rounded-xl bg-white p-4 text-sm leading-6"><strong>Hinweis {index + 1}:</strong> {hint}</li>)}</ol>}{attempt.remainingHintCount > 0 && <button type="button" disabled={pending} onClick={reveal} className={`mt-4 ${secondaryButton}`}>Nächsten Hinweis öffnen ({attempt.remainingHintCount} übrig)</button>}</section>; }

function History({ attempt }: { attempt: LabAttemptView }) { return <section aria-labelledby="history-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 id="history-heading" className="text-xl font-bold text-slate-950">Diagnoseprotokoll · Durchlauf {attempt.runNumber}</h2>{attempt.history.length === 0 ? <p className="mt-3 text-sm text-slate-600">Noch keine Aktionen in diesem Durchlauf.</p> : <ol className="mt-4 space-y-3">{attempt.history.map((item) => <li key={item.sequence} className="border-l-2 border-blue-200 pl-4"><p className="text-sm font-semibold text-slate-900">{item.summary}</p>{item.command && <code className="mt-1 block break-all text-xs text-slate-600">{item.command}</code>}</li>)}</ol>}</section>; }

function CompletedLab({ attempt, pending, message, replay }: { attempt: LabAttemptView; pending: boolean; message: string; replay: () => void }) {
  const review = attempt.review!;
  const tutorial = attempt.kind === "tutorial";
  return <div className="space-y-6">
    <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-800">{tutorial ? "Schritt 8 von 8" : attempt.mode === "preview" ? "Vorschau gelöst" : "Lab abgeschlossen"}</p>
      <h2 className="mt-2 text-3xl font-bold text-slate-950">{tutorial ? "Tutorial abgeschlossen" : "Fehler erfolgreich behoben"}</h2>
      <p className="mt-3 leading-7 text-slate-700">{attempt.mode === "preview" ? "Der Vorschauversuch erzeugt keinen Lernendenfortschritt und keine XP." : tutorial ? "Du hast den vollständigen Ablauf selbst ausgeführt: analysieren, gezielt ändern und die Funktion prüfen. Normale Labs nutzen dieselben Werkzeuge, geben dir aber deutlich weniger Schritt-für-Schritt-Anleitung. Das Tutorial vergibt keine XP." : attempt.reward?.kind === "replay" ? "Du hast das Lab erneut erfolgreich gelöst. XP werden nur beim ersten erfolgreichen Abschluss vergeben." : "Der Abschluss und die Belohnung wurden serverseitig validiert."}</p>
      {tutorial && <Link href="/labs" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-emerald-900 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">Normale Labs ansehen <span aria-hidden="true" className="ml-2">→</span></Link>}
    </section>
    {attempt.reward && <LabRewardSummary reward={attempt.reward} />}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-2xl font-bold text-slate-950">Auswertung</h2>
      <h3 className="mt-5 font-bold text-slate-950">Ursache</h3><p className="mt-2 leading-7 text-slate-600">{review.rootCause}</p>
      <h3 className="mt-5 font-bold text-slate-950">Warum die Lösung funktioniert</h3><p className="mt-2 leading-7 text-slate-600">{review.explanation}</p>
      <h3 className="mt-5 font-bold text-slate-950">Warum die Funktionsprüfung aussagekräftig ist</h3><p className="mt-2 leading-7 text-slate-600">{review.verification}</p>
      <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">Eine geänderte Konfiguration allein beweist noch keine wiederhergestellte Funktion. Erst der erfolgreiche Nachweis nach der Reparatur schließt das Lab ab.</p>
      <h3 className="mt-5 font-bold text-slate-950">Eine mögliche strukturierte Diagnosefolge</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700">{review.recommendedSequence.map((step) => <li key={step}>{step}</li>)}</ol><p className="mt-3 text-sm text-slate-600">Andere nachvollziehbare Diagnosewege können genauso gültig sein.</p>
      {review.moduleLinks.length > 0 && <><h3 className="mt-5 font-bold text-slate-950">Passende Lernmodule</h3><ul className="mt-2 space-y-2">{review.moduleLinks.map((link) => <li key={link.href}><Link href={link.href} className="font-bold text-blue-900 underline decoration-blue-300 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{link.title}</Link></li>)}</ul></>}
    </section>
    <History attempt={attempt} />
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-xl font-bold text-slate-950">Noch einmal üben</h2><p className="mt-2 text-sm leading-6 text-slate-600">Wiederholen erzeugt einen neuen Versuch im ursprünglichen Fehlerzustand. Der abgeschlossene Versuch bleibt unverändert.</p><button type="button" disabled={pending} onClick={replay} className="mt-4 min-h-12 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60">{tutorial ? "Tutorial erneut starten" : "Neuen Versuch starten"}</button></section>
    <LiveMessage message={message} />
  </div>;
}

function LabRewardSummary({ reward }: { reward: NonNullable<LabAttemptView["reward"]> }) {
  if (reward.kind === "replay") return <section aria-live="polite" aria-labelledby="lab-reward-heading" className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6"><p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-800">Belohnung</p><h2 id="lab-reward-heading" className="mt-1 text-2xl font-bold text-slate-950">Wiederholung abgeschlossen</h2><p className="mt-3 leading-7 text-slate-700">Der unveränderliche Erstabschluss wurde bereits gewertet. Diese Wiederholung bringt 0 zusätzliche XP.</p></section>;
  const hintLabel = reward.uniqueHintsUsed === 1 ? "1 Hinweis verwendet" : `${reward.uniqueHintsUsed} Hinweise verwendet`;
  return <section aria-live="polite" aria-labelledby="lab-reward-heading" className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6"><p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-800">Belohnung</p><h2 id="lab-reward-heading" className="mt-1 text-2xl font-bold text-slate-950">XP für deinen Erstabschluss</h2><dl className="mt-5 max-w-md space-y-3 text-sm"><div className="flex items-center justify-between gap-4"><dt className="font-semibold text-slate-700">Basis-XP</dt><dd className="font-bold text-slate-950">{reward.baseXp}</dd></div><div className="flex items-center justify-between gap-4"><dt className="font-semibold text-slate-700">{hintLabel}</dt><dd className="font-bold text-slate-950">−{reward.hintDeduction}</dd></div><div className="flex items-center justify-between gap-4 border-t border-blue-200 pt-3 text-lg"><dt className="font-bold text-slate-950">Verdient</dt><dd className="font-black text-blue-950">{reward.earnedXp} XP</dd></div></dl><p className="mt-4 text-sm leading-6 text-slate-600">Hinweise bleiben eine sinnvolle Lernhilfe. Die Aufschlüsselung dient nur der transparenten XP-Berechnung.</p><Link href="/profil" className="mt-4 inline-flex min-h-11 items-center font-bold text-blue-900 underline decoration-blue-300 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Titel und Abzeichen im Profil ansehen</Link></section>;
}

function LiveMessage({ message }: { message: string }) { return message ? <p role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-900">{message}</p> : null; }
const secondaryButton = "min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60";
