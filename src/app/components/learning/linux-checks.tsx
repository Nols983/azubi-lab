"use client";

import { useId, useState } from "react";

type Item = { prompt: string; answer: string; explanation: string };

const commandItems: readonly Item[] = [
  { prompt: "pwd", answer: "aktuelles Arbeitsverzeichnis", explanation: "pwd gibt das aktuelle Arbeitsverzeichnis aus." },
  { prompt: "ls", answer: "Verzeichnisinhalt auflisten", explanation: "ls listet Verzeichnisinhalte auf." },
  { prompt: "cd", answer: "Arbeitsverzeichnis wechseln", explanation: "cd ändert das Arbeitsverzeichnis der Shell." },
  { prompt: "whoami", answer: "aktueller/effektiver Benutzername", explanation: "whoami zeigt, als welcher Benutzer Befehle ausgeführt werden." },
  { prompt: "man", answer: "Handbuch/Dokumentation", explanation: "man öffnet verfügbare Handbuchseiten." },
  { prompt: "uname", answer: "Kernel-/Systeminformationen", explanation: "uname zeigt Kernel- und Systeminformationen, nicht zuverlässig den Distributionsnamen." },
];

const pathItems: readonly Item[] = [
  { prompt: "/etc/hosts", answer: "absoluter Pfad", explanation: "Der Pfad beginnt am Dateisystemwurzelverzeichnis /." },
  { prompt: "Dokumente/test.txt", answer: "relativer Pfad", explanation: "Der Pfad hängt vom aktuellen Arbeitsverzeichnis ab." },
  { prompt: "../Downloads", answer: "relativer Pfad über Elternverzeichnis", explanation: ".. bezeichnet das Elternverzeichnis." },
  { prompt: "~/Projekte", answer: "Home-relative Shell-Ausdruck", explanation: "Die Shell expandiert ~ üblicherweise zum Home-Verzeichnis; davor ist es kein literal gespeicherter absoluter Pfad." },
  { prompt: "/root", answer: "Home-Verzeichnis von root", explanation: "/root ist üblicherweise das Home-Verzeichnis des privilegierten Benutzers root." },
  { prompt: "/", answer: "Dateisystemwurzel", explanation: "/ ist die Wurzel des Dateisystembaums." },
];

const directoryItems: readonly Item[] = [
  { prompt: "/etc", answer: "systemweite Konfiguration", explanation: "/etc enthält typischerweise systemweite Konfiguration." },
  { prompt: "/home", answer: "Home-Verzeichnisse normaler Benutzer", explanation: "/home enthält üblicherweise die Home-Verzeichnisse normaler Benutzer." },
  { prompt: "/var", answer: "veränderliche Dienst-, Log- und Laufzeitdaten", explanation: "/var enthält je nach System unter anderem Logs, Caches, Spools und Dienstdaten." },
  { prompt: "/dev", answer: "Geräteknoten", explanation: "/dev stellt Geräteknoten beziehungsweise -schnittstellen bereit." },
  { prompt: "/proc", answer: "virtuelle Prozess-/Kernelinformationen", explanation: "/proc ist ein virtuelles Dateisystem für Prozess- und Kernelinformationen." },
  { prompt: "/usr", answer: "User-Space-Software und geteilte Daten", explanation: "/usr ist eine zentrale Hierarchie für Programme, Bibliotheken und geteilte Daten, nicht für Benutzer-Homes." },
];

export function LinuxCommandMatchingCheck() { return <MatchingCheck title="Befehle zuordnen" items={commandItems} options={commandItems.map((item) => item.answer)} />; }
export function LinuxPathClassificationCheck() { return <MatchingCheck title="Pfade richtig einordnen" items={pathItems} options={pathItems.map((item) => item.answer)} />; }
export function LinuxDirectoryMatchingCheck() { return <MatchingCheck title="Wichtige Verzeichnisse" items={directoryItems} options={directoryItems.map((item) => item.answer)} />; }
export function LinuxFileOperationMatchingCheck() { return <MatchingCheck title="Dateioperationen zuordnen" items={[
  { prompt: "mkdir", answer: "Verzeichnis erstellen", explanation: "mkdir erstellt ein Verzeichnis; -p kann fehlende Elternverzeichnisse mit anlegen." },
  { prompt: "cp", answer: "kopieren", explanation: "cp kopiert Dateien; Verzeichnisbäume benötigen eine rekursive Option wie -r." },
  { prompt: "mv", answer: "verschieben oder umbenennen", explanation: "mv verschiebt einen Eintrag oder benennt ihn am selben Ort um." },
  { prompt: "rm", answer: "Datei entfernen", explanation: "rm entfernt Dateien normalerweise ohne Desktop-Papierkorb." },
  { prompt: "rmdir", answer: "leeres Verzeichnis entfernen", explanation: "rmdir entfernt nur leere Verzeichnisse." },
  { prompt: "file", answer: "Dateityp heuristisch untersuchen", explanation: "file untersucht den Inhalt heuristisch; die Endung allein bestimmt den Typ nicht." },
  { prompt: "stat", answer: "Metadaten untersuchen", explanation: "stat zeigt Metadaten wie Größe, Rechte und Zeitstempel." },
]} options={["Verzeichnis erstellen", "kopieren", "verschieben oder umbenennen", "Datei entfernen", "leeres Verzeichnis entfernen", "Dateityp heuristisch untersuchen", "Metadaten untersuchen"]} />; }

export function LinuxPermissionMatchingCheck() { return <MatchingCheck title="Berechtigungen und Werkzeuge" items={[
  { prompt: "644", answer: "rw-r--r--", explanation: "6 = 4 + 2 = rw-, danach zweimal 4 = r--." },
  { prompt: "755", answer: "rwxr-xr-x", explanation: "7 = rwx und 5 = r-x." },
  { prompt: "750", answer: "rwxr-x---", explanation: "Owner erhält 7, Gruppe 5, Others 0." },
  { prompt: "whoami", answer: "aktueller Benutzer", explanation: "whoami zeigt den effektiven Benutzernamen." },
  { prompt: "id", answer: "UID, GID und Gruppen", explanation: "id zeigt numerische und lesbare Benutzer- und Gruppeninformationen." },
  { prompt: "chmod", answer: "Berechtigungsbits ändern", explanation: "chmod verändert die Modus- beziehungsweise Berechtigungsbits." },
]} options={["rw-r--r--", "rwxr-xr-x", "rwxr-x---", "aktueller Benutzer", "UID, GID und Gruppen", "Berechtigungsbits ändern"]} />; }

export function LinuxAdministrationMatchingCheck() { return <MatchingCheck title="Administration einordnen" items={[
  { prompt: "PID", answer: "Prozesskennung", explanation: "Eine PID identifiziert einen laufenden Prozess." },
  { prompt: "ps", answer: "Prozesse untersuchen", explanation: "ps liefert eine Momentaufnahme von Prozessen." },
  { prompt: "systemctl status", answer: "systemd-Dienststatus untersuchen", explanation: "systemctl status liest den Zustand einer Unit auf systemd-Systemen." },
  { prompt: "journalctl", answer: "systemd-Journal untersuchen", explanation: "journalctl liest das Journal, soweit Berechtigungen und Konfiguration dies erlauben." },
  { prompt: "apt / dnf / pacman", answer: "Paketverwaltungsökosysteme", explanation: "Diese Werkzeuge gehören zu unterschiedlichen Distributionsfamilien und sind nicht austauschbar." },
  { prompt: "Repository", answer: "Quelle verwalteter Paketdaten", explanation: "Repositories stellen Paketmetadaten und Paketinhalte bereit." },
]} options={["Prozesskennung", "Prozesse untersuchen", "systemd-Dienststatus untersuchen", "systemd-Journal untersuchen", "Paketverwaltungsökosysteme", "Quelle verwalteter Paketdaten"]} />; }

export function LinuxInventoryClassificationCheck() { return <MatchingCheck title="Read-only-Bestandsaufnahme" items={[
  { prompt: "uname -a", answer: "geeignet: System/Kerneldaten lesen", explanation: "uname -a verändert das System nicht." },
  { prompt: "cat /etc/os-release", answer: "geeignet: Distribution lesen", explanation: "cat liest hier eine übliche Metadatendatei." },
  { prompt: "whoami", answer: "geeignet: Benutzername lesen", explanation: "whoami liest den effektiven Benutzernamen." },
  { prompt: "id", answer: "geeignet: Benutzer- und Gruppenkennungen lesen", explanation: "id zeigt UID, GID und Gruppen ohne sie zu verändern." },
  { prompt: "df -h", answer: "geeignet: Dateisystembelegung lesen", explanation: "df -h zeigt die Belegung eingebundener Dateisysteme." },
  { prompt: "free -h", answer: "geeignet: Speicherstatistik lesen", explanation: "free -h zeigt Arbeitsspeicherstatistiken." },
  { prompt: "ps aux", answer: "geeignet: Prozesse lesen", explanation: "ps aux liefert eine Prozessmomentaufnahme und beendet nichts." },
  { prompt: "ip addr", answer: "geeignet: Schnittstellen und Adressen lesen", explanation: "ip addr zeigt Schnittstellen- und Adressinformationen." },
  { prompt: "ip route", answer: "geeignet: Routingtabelle lesen", explanation: "ip route zeigt die Routingtabelle ohne sie zu ändern." },
  { prompt: "chmod 777 DATEI", answer: "ungeeignet: verändert Rechte", explanation: "chmod verändert Berechtigungen; 777 ist keine pauschale Problemlösung." },
  { prompt: "apt upgrade", answer: "ungeeignet: verändert Pakete", explanation: "Ein Upgrade verändert das System und gehört nicht in eine read-only Bestandsaufnahme." },
]} options={["geeignet: System/Kerneldaten lesen", "geeignet: Distribution lesen", "geeignet: Benutzername lesen", "geeignet: Benutzer- und Gruppenkennungen lesen", "geeignet: Dateisystembelegung lesen", "geeignet: Speicherstatistik lesen", "geeignet: Prozesse lesen", "geeignet: Schnittstellen und Adressen lesen", "geeignet: Routingtabelle lesen", "ungeeignet: verändert Rechte", "ungeeignet: verändert Pakete"]} />; }

function MatchingCheck({ title, items, options }: { title: string; items: readonly Item[]; options: readonly string[] }) {
  const titleId = useId();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const incorrect = items.filter((item) => answers[item.prompt] !== item.answer);
  function update(prompt: string, answer: string) { setAnswers((current) => ({ ...current, [prompt]: answer })); setChecked(false); setIncomplete(false); }
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const complete = items.every((item) => answers[item.prompt]); setIncomplete(!complete); setChecked(complete); }
  return <section aria-labelledby={titleId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
    <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Übung</p><h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">{title}</h2>
    <form className="mt-5" onSubmit={submit}><fieldset><legend className="font-semibold text-slate-900">Ordne jedem Eintrag die passende Bedeutung zu.</legend><div className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((item) => <label key={item.prompt} className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600"><code className="break-all">{item.prompt}</code><select value={answers[item.prompt] ?? ""} onChange={(event) => update(item.prompt, event.target.value)} className="min-h-12 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Bitte auswählen</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}</div></fieldset><button className="mt-5 min-h-12 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{checked ? "Erneut prüfen" : "Antworten prüfen"}</button></form>
    <div aria-live="polite" aria-atomic="true">{incomplete && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold">Beantworte zuerst alle Zuordnungen.</p>}{checked && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${incorrect.length === 0 ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white"}`}><p className="font-bold">{incorrect.length === 0 ? "Alle Zuordnungen sind richtig." : "Einige Zuordnungen brauchen noch eine Korrektur."}</p>{incorrect.map((item) => <p className="mt-2" key={item.prompt}><strong>{item.prompt}:</strong> {item.explanation}</p>)}{incorrect.length > 0 && <p className="mt-2">Ändere die Auswahl und prüfe erneut.</p>}</div>}</div>
  </section>;
}
