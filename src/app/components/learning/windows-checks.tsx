"use client";

import { useId, useState } from "react";

type Item = { prompt: string; answer: string; explanation: string };

const toolItems: readonly Item[] = [
  { prompt: "Windows Terminal", answer: "Terminalhost", explanation: "Windows Terminal stellt Sitzungen und Profile für verschiedene Shells dar." },
  { prompt: "cmd.exe", answer: "traditioneller Befehlsinterpreter", explanation: "cmd.exe ist die traditionelle Windows-Kommando-Shell." },
  { prompt: "PowerShell", answer: "Shell und Automatisierungsumgebung", explanation: "PowerShell kombiniert interaktive Shell, Administration und Automatisierung." },
  { prompt: "dir", answer: "Verzeichnisauflistung in CMD", explanation: "dir listet in CMD Verzeichnisinhalte auf." },
  { prompt: "Get-ChildItem", answer: "PowerShell-Auflistung von Kindelementen", explanation: "Get-ChildItem liefert Elemente eines Speicherorts." },
  { prompt: "Get-Help", answer: "PowerShell-Hilfe", explanation: "Get-Help zeigt lokal verfügbare Hilfeinformationen." },
  { prompt: "whoami", answer: "aktuelle Ausführungsidentität", explanation: "whoami zeigt den Sicherheitskontext der Ausführung, nicht bloß einen Anzeigenamen." },
];
const pathItems: readonly Item[] = [
  { prompt: "C:\\Windows\\System32", answer: "absoluter lokaler Laufwerkspfad", explanation: "Laufwerk und vollständige Hierarchie sind angegeben." },
  { prompt: "Documents\\bericht.txt", answer: "relativer Pfad", explanation: "Der Pfad wird vom aktuellen Ort aus aufgelöst." },
  { prompt: "..\\Public", answer: "relativer Elternpfad", explanation: ".. bezeichnet das Elternverzeichnis." },
  { prompt: "%USERPROFILE%\\Downloads", answer: "CMD-Umgebungsvariablen-basierter Benutzerpfad", explanation: "%USERPROFILE% wird expandiert und ist kein wörtlicher Verzeichnisname." },
  { prompt: "\\\\fileserver\\azubi", answer: "UNC-Netzwerkpfad", explanation: "Der UNC-Pfad nennt Server und Freigabe direkt." },
  { prompt: "C:\\", answer: "Laufwerkswurzel", explanation: "C:\\ ist die Wurzel des Laufwerksnamensraums C:." },
];
const directoryItems: readonly Item[] = [
  { prompt: "C:\\Windows", answer: "Windows-Systemverzeichnis", explanation: "Hier liegt üblicherweise das Windows-Systemverzeichnis." },
  { prompt: "Program Files", answer: "Anwendungsprogramme und Binärdateien", explanation: "Program Files ist ein üblicher Installationsort für Anwendungsdateien." },
  { prompt: "ProgramData", answer: "gemeinsame Anwendungsdaten", explanation: "ProgramData enthält häufig profilunabhängige gemeinsame Daten und Zustand." },
  { prompt: "Users", answer: "Hierarchie der Benutzerprofile", explanation: "Unter Users liegen üblicherweise Benutzerprofile." },
  { prompt: "AppData\\Local", answer: "lokale benutzerspezifische Anwendungsdaten", explanation: "Local ist für maschinenlokale Daten im Benutzerprofil gedacht." },
];

export function WindowsToolMatchingCheck() { return <MatchingCheck title="Windows-Werkzeuge zuordnen" items={toolItems} />; }
export function WindowsPathClassificationCheck() { return <MatchingCheck title="Windows-Pfade einordnen" items={pathItems} />; }
export function WindowsDirectoryMatchingCheck() { return <MatchingCheck title="Windows-Verzeichnisse zuordnen" items={directoryItems} />; }

const permissionItems: readonly Item[] = [
  { prompt: "Authentifizierung", answer: "Identität prüfen", explanation: "Authentifizierung beantwortet: Wer bist du?" },
  { prompt: "Autorisierung", answer: "Zugriff entscheiden", explanation: "Autorisierung beantwortet: Was darf diese Identität?" },
  { prompt: "SID", answer: "Kennung eines Sicherheitsprinzipals", explanation: "Windows identifiziert Benutzer und Gruppen intern über Security Identifier." },
  { prompt: "Vererbung", answer: "Berechtigungen vom übergeordneten Objekt", explanation: "Geerbte Einträge stammen aus der übergeordneten ACL." },
  { prompt: "Modify", answer: "Lesen, Ausführen, Ändern und Löschen", explanation: "Modify bündelt typische Inhaltsänderungen, ist aber nicht Full Control." },
  { prompt: "Full Control", answer: "umfassend inklusive Berechtigungsverwaltung", explanation: "Full Control enthält weitergehende Rechte und ist kein Standard-Fix." },
];
const administrationItems: readonly Item[] = [
  { prompt: "PID", answer: "Prozesskennung", explanation: "Eine PID identifiziert eine laufende Prozessinstanz." },
  { prompt: "Get-Process", answer: "laufende Prozesse untersuchen", explanation: "Get-Process liest Prozessinformationen." },
  { prompt: "Get-Service", answer: "Dienste untersuchen", explanation: "Get-Service liest Dienstzustände." },
  { prompt: "Event Viewer", answer: "Windows-Ereignisse untersuchen", explanation: "Die Ereignisanzeige erschließt Windows-Protokolle und weitere Kanäle." },
  { prompt: "winget list", answer: "Paketbestand, falls winget verfügbar", explanation: "winget ist nicht in jeder Umgebung vorhanden." },
  { prompt: "Windows Update", answer: "Windows-Wartung und Aktualisierung", explanation: "Erkennung, Download, Installation und möglicher Neustart sind getrennte Phasen." },
];
export function WindowsPermissionMatchingCheck() { return <MatchingCheck title="Sicherheitsbegriffe zuordnen" items={permissionItems} />; }
export function WindowsAdministrationMatchingCheck() { return <MatchingCheck title="Administration zuordnen" items={administrationItems} />; }

const inventoryOptions = ["read-only Bestandsaufnahme", "systemändernde Aktion"] as const;
const inventoryItems = [
  ["systeminfo", inventoryOptions[0]], ["whoami", inventoryOptions[0]], ["Get-Process", inventoryOptions[0]], ["Get-Service", inventoryOptions[0]], ["Get-Volume", inventoryOptions[0]], ["ipconfig /all", inventoryOptions[0]], ["route print", inventoryOptions[0]], ["netstat -ano", inventoryOptions[0]], ["Get-WinEvent", inventoryOptions[0]],
  ["Stop-Service", inventoryOptions[1]], ["Remove-Item", inventoryOptions[1]], ["winget upgrade --all", inventoryOptions[1]], ["net user … /delete", inventoryOptions[1]], ["shutdown /r", inventoryOptions[1]], ["Set-NetIPAddress", inventoryOptions[1]],
] as const;
export function WindowsInventoryClassificationCheck() { return <MatchingCheck title="Read-only oder systemändernd?" items={inventoryItems.map(([prompt, answer]) => ({ prompt, answer, explanation: answer === inventoryOptions[0] ? `${prompt} dient hier der Beobachtung.` : `${prompt} verändert potenziell den Systemzustand und gehört nicht zur Bestandsaufnahme.` }))} />; }

function MatchingCheck({ title, items }: { title: string; items: readonly Item[] }) {
  const titleId = useId(); const [answers, setAnswers] = useState<Record<string, string>>({}); const [checked, setChecked] = useState(false); const [incomplete, setIncomplete] = useState(false);
  const options = items.map((item) => item.answer); const incorrect = items.filter((item) => answers[item.prompt] !== item.answer);
  function update(prompt: string, answer: string) { setAnswers((current) => ({ ...current, [prompt]: answer })); setChecked(false); setIncomplete(false); }
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const complete = items.every((item) => answers[item.prompt]); setIncomplete(!complete); setChecked(complete); }
  function reset() { setAnswers({}); setChecked(false); setIncomplete(false); }
  return <section aria-labelledby={titleId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7"><p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-800">Übung</p><h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">{title}</h2><form className="mt-5" onSubmit={submit}><fieldset><legend className="font-semibold text-slate-900">Ordne jedem Eintrag die passende Bedeutung zu.</legend><div className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((item) => <label key={item.prompt} className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600"><code className="break-all">{item.prompt}</code><select value={answers[item.prompt] ?? ""} onChange={(event) => update(item.prompt, event.target.value)} className="min-h-12 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Bitte auswählen</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}</div></fieldset><div className="mt-5 flex flex-wrap gap-3"><button className="min-h-12 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Antworten prüfen</button><button type="button" onClick={reset} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zurücksetzen</button></div></form><div aria-live="polite" aria-atomic="true">{incomplete && <p className="mt-5 rounded-xl border border-amber-300 bg-white p-4 text-sm font-semibold">Beantworte zuerst alle Zuordnungen.</p>}{checked && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${incorrect.length === 0 ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-white"}`}><p className="font-bold">{incorrect.length === 0 ? "Alle Zuordnungen sind richtig." : "Einige Zuordnungen brauchen noch eine Korrektur."}</p>{incorrect.map((item) => <p className="mt-2" key={item.prompt}><strong>{item.prompt}:</strong> {item.explanation}</p>)}</div>}</div></section>;
}
