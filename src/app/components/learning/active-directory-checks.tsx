"use client";

import { useId, useState } from "react";

type Item = { prompt: string; answer: string; explanation: string };

const structureItems: readonly Item[] = [
  { prompt: "Forest", answer: "oberste AD-Struktur mit einer oder mehreren Domänen", explanation: "Ein Forest bildet die oberste AD-DS-Struktur." },
  { prompt: "Domäne", answer: "AD-Verzeichnis- und Verwaltungsbereich mit Objekten", explanation: "Eine Domäne ist kein IP-Subnetz, sondern ein logischer AD-Bereich." },
  { prompt: "OU", answer: "Container für Organisation, Delegation und GPO-Ziele", explanation: "Eine Organisationseinheit strukturiert Objekte innerhalb einer Domäne." },
  { prompt: "Gruppe", answer: "Sammlung für Berechtigungs- oder Verteilungszwecke", explanation: "Gruppen bilden Mitgliedschaften ab; Security Groups können Berechtigungen erhalten." },
  { prompt: "Subnetz", answer: "IP-Netzkonzept, keine AD-Domäne", explanation: "Subnetze gehören zur Netzwerktopologie und sind keine AD-Domänen." },
];

const objectItems: readonly Item[] = [
  { prompt: "Benutzer", answer: "Domänenbenutzer-Identität", explanation: "Ein Benutzerobjekt repräsentiert eine Identität in AD DS." },
  { prompt: "Computer", answer: "Domänencomputer-Identität", explanation: "Ein Computerobjekt besitzt eine eigene Sicherheitsidentität." },
  { prompt: "Security Group", answer: "für Autorisierung verwendbare Gruppe", explanation: "Eine Security Group kann in Zugriffssteuerungslisten verwendet werden." },
  { prompt: "Distribution Group", answer: "nicht sicherheitsfähige Verteilergruppe", explanation: "Sie dient der Verteilung, nicht der Vergabe von Windows-Zugriffsrechten." },
  { prompt: "OU", answer: "administrativer Verzeichniscontainer", explanation: "Eine OU ist keine Berechtigungsgruppe." },
  { prompt: "SID", answer: "Security Identifier", explanation: "Die SID ist die entscheidende Sicherheitskennung eines Sicherheitsprinzipals." },
];

export function AdConceptMatchingCheck() {
  return <MatchingCheck title="AD-Strukturen richtig zuordnen" items={structureItems} />;
}

export function AdObjectMatchingCheck() {
  return <MatchingCheck title="Verzeichnisobjekte und Sicherheitsbegriffe" items={objectItems} />;
}

const infrastructureItems: readonly Item[] = [
  { prompt: "Domain Controller", answer: "AD-DS-Authentifizierung und Verzeichnisdienst", explanation: "Ein beschreibbarer DC stellt Verzeichnis- und Authentifizierungsfunktionen bereit." },
  { prompt: "DNS SRV", answer: "Information zur Dienstsuche", explanation: "SRV-Records nennen Dienst, Protokoll, Zielhost und Port." },
  { prompt: "Replikation", answer: "verteilt Verzeichnisänderungen zwischen DCs", explanation: "Änderungen konvergieren über Replikationspartner, nicht zwingend im selben Augenblick." },
  { prompt: "Global Catalog", answer: "forestweite Suche und Anmeldeunterstützung", explanation: "Der GC bietet eine partielle forestweite Repräsentation und passende vollständige Domäneninformationen." },
  { prompt: "AD Site", answer: "Abbild der physischen beziehungsweise Netzwerktopologie", explanation: "Sites helfen Dienstwahl und Replikation zu optimieren; sie sind keine Domänen oder OUs." },
  { prompt: "FSMO", answer: "spezialisierte Operationen mit festem Rolleninhaber", explanation: "FSMO-Rollen sind begrenzte Ausnahmen vom allgemeinen Multi-Master-Modell." },
];

const groupPolicyItems: readonly Item[] = [
  { prompt: "GPO", answer: "Sammlung von Gruppenrichtlinieneinstellungen", explanation: "Ein GPO wird separat verwaltet und an unterstützte Bereiche verlinkt." },
  { prompt: "Computer Configuration", answer: "im Computerkontext verarbeitete Einstellungen", explanation: "Dieser Teil richtet sich an den Computerkontext." },
  { prompt: "User Configuration", answer: "im Benutzerkontext verarbeitete Einstellungen", explanation: "Dieser Teil richtet sich an den Benutzerkontext." },
  { prompt: "OU", answer: "häufiger Container für GPO-Ziel und Link", explanation: "OUs unterstützen Verwaltung, Delegation und Richtlinien-Targeting." },
  { prompt: "gpresult", answer: "resultierende Richtlinieninformationen untersuchen", explanation: "gpresult /r ist eine lesende erste Diagnose." },
  { prompt: "gpupdate", answer: "Richtlinienaktualisierung anfordern", explanation: "gpupdate stößt Verarbeitung an und ist keine rein lesende Diagnose." },
];

const practiceItems: readonly Item[] = [
  { prompt: "Domain", answer: "firma.test", explanation: "Das Szenario benötigt nur eine Domäne in einem Forest." },
  { prompt: "OU", answer: "administrative und GPO-bezogene Struktur", explanation: "Eine OU strukturiert Objekte für Verwaltung, Delegation und Targeting." },
  { prompt: "GG_Support", answer: "Rollengruppe", explanation: "Die globale Gruppe bündelt Support-Konten." },
  { prompt: "DL_Share_Support_Modify", answer: "Ressourcen-Berechtigungsgruppe", explanation: "Die domänenlokale Gruppe erhält Modify an der Support-Ressource." },
  { prompt: "DNS", answer: "AD-Dienstsuche", explanation: "Geeignete DNS-Auflösung liefert unter anderem SRV-Informationen." },
  { prompt: "Site", answer: "Zuordnung zur Netzwerktopologie", explanation: "Sites können IP-Subnetze abbilden, unabhängig von OUs und Domänen." },
  { prompt: "gpresult", answer: "GPO-Diagnose", explanation: "Der Befehl zeigt resultierende Richtlinieninformationen." },
];

export function AdInfrastructureMatchingCheck() { return <MatchingCheck title="AD-Infrastruktur zuordnen" items={infrastructureItems} />; }
export function AdGroupPolicyMatchingCheck() { return <MatchingCheck title="Gruppenrichtlinien zuordnen" items={groupPolicyItems} />; }
export function AdPracticeMatchingCheck() { return <MatchingCheck title="Planungsbegriffe zuordnen" items={practiceItems} />; }

function MatchingCheck({ title, items }: { title: string; items: readonly Item[] }) {
  const titleId = useId();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const options = items.map((item) => item.answer);
  const incorrect = items.filter((item) => answers[item.prompt] !== item.answer);

  function update(prompt: string, answer: string) {
    setAnswers((current) => ({ ...current, [prompt]: answer }));
    setChecked(false);
    setIncomplete(false);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const complete = items.every((item) => answers[item.prompt]);
    setIncomplete(!complete);
    setChecked(complete);
  }

  function reset() {
    setAnswers({});
    setChecked(false);
    setIncomplete(false);
  }

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Übung</p>
      <h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">{title}</h2>
      <form className="mt-5" onSubmit={submit}>
        <fieldset>
          <legend className="font-semibold text-slate-900">Ordne jedem Begriff die passende Bedeutung zu.</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <label key={item.prompt} className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600">
                <span>{item.prompt}</span>
                <select value={answers[item.prompt] ?? ""} onChange={(event) => update(item.prompt, event.target.value)} className="min-h-12 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm">
                  <option value="">Bitte auswählen</option>
                  {options.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="min-h-12 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Antworten prüfen</button>
          <button type="button" onClick={reset} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zurücksetzen</button>
        </div>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {incomplete && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold">Beantworte zuerst alle Zuordnungen.</p>}
        {checked && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${incorrect.length === 0 ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white"}`}><p className="font-bold">{incorrect.length === 0 ? "Alle Zuordnungen sind richtig." : "Einige Zuordnungen brauchen noch eine Korrektur."}</p>{incorrect.map((item) => <p className="mt-2" key={item.prompt}><strong>{item.prompt}:</strong> {item.explanation}</p>)}</div>}
      </div>
    </section>
  );
}
