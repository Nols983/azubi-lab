# Lokale Release-Prüfung – 19.11.2026

Basis der öffentlichen Historie: `bdfa4b2714604e2593112b0fdf5d3f63b42773b1`.
Release-Branch: `release/azubi-lab-20261119`. Übernahmequelle:
Entwicklungsstand `f2219fd09351d18664ccc17723821c4ac3ffb3d5`.
Nur geeignete Arbeitsdateien wurden gezielt kopiert; keine privaten Git-Objekte,
Branches oder Historien wurden importiert. `main` bleibt auf dem Ausgangscommit.
Es erfolgten kein Push, kein Pull Request, keine Veröffentlichung und kein Deployment.

## Funktionsumfang

- Aktualisierte Lernübersicht und Dashboard mit Phasen, kanonischem Fortschritt,
  XP-/Profilübersicht und korrekter Darstellung fehlender Fortschrittsdaten.
- Teamverwaltung, Mehrfachmitgliedschaften und Teamleiterrechte für Azubis
  geleiteter aktiver Teams; serverseitiger Schutz von Reporting, Zuweisungen,
  Reviews, Nachweisen und Benachrichtigungen einschließlich Rechteentzug.
- Teambezogene Themenvorschläge und administrative Status-/Feedbackbearbeitung.
- Administratives Kontenverzeichnis mit Teamnavigation, Suche, Rollen-/Statusfilter,
  stabiler Sortierung, SQL-Pagination und separaten Kontodetails.
- Vollständige Kontolöschung auch mit Lernhistorien; Erhalt fremder Lernergebnisse,
  gezielte Anonymisierung und transaktional vorgemerkte, wiederholbare Dateibereinigung.
- Additive Migrationen `0022`–`0024`, zugehörige Unit-, Integrations- und HTTP-Tests.
- Abhängigkeiten und Lockfile aus der Quelle: Next.js/ESLint-Konfiguration 16.4.6,
  Sharp 0.35.5; keine zusätzlichen direkten Abhängigkeiten.

## Abweichungen und Erhalt des öffentlichen Bestands

Anwendung, Migrationen, Testskripte und Abhängigkeitsdateien stimmen mit der Quelle
überein, mit folgenden rein redaktionellen bzw. öffentlichen Anpassungen:
`src/app/components/learning/linux-lessons.tsx` verwendet einen neutralen
Beispielbenutzer; `tests/swarm-operations.test.mts` prüft die öffentlichen
Beispielpfade und -hostnamen. Beide Dateien bleiben gegenüber der öffentlichen
Ausgangsbasis unverändert. In `src/app/lib/server/account-deletion-service.ts`
wurde eine überzählige Leerzeile am Dateiende entfernt, die erst die Indexprüfung
der neuen Dateien meldete. Keine Anwendungsfunktion wurde ausgelassen.

Beibehalten wurden die öffentlichen `.env.example`, `compose.production.yml`,
`deploy/swarm.env.example`, `deploy/swarm-stack.yml`, alle Operations-Skripte,
Screenshots und der CI-Workflow. Am Runbook wurden nur drei Absätze zu Teamleitung
und Zugriffsgrenzen ergänzt bzw. korrigiert. README und Repository-Kontext sind
aktualisiert; die Kontolöschrichtlinie wurde übernommen.

Private Entwicklungsberichte (`CODEX_ACCOUNT_*`, `CODEX_TEAM_MANAGEMENT_*`) und der
historische private Abhängigkeitsbericht wurden nicht übernommen. Die aktuellen
Prüfergebnisse stehen stattdessen in diesem Bericht und im
[Validierungsnachweis](RELEASE_VALIDATION_2026-11-19.txt).
Der öffentliche Toolkit-Selbsttest bleibt exakt erhalten; Tests wurden nicht
abgeschaltet. Next.js hat ausschließlich die generierte Überschrift in `AGENTS.md`
von Ebene 1 auf Ebene 2 normalisiert; die Arbeitsregeln bleiben inhaltlich erhalten.
Keine vorhandene öffentliche Datei wurde gelöscht oder umbenannt.
Änderungsumfang gegenüber der öffentlichen Basis: **61 geänderte und 31 neue Dateien**.
Für die lokalen Commits wird die bereits in der öffentlichen Historie verwendete
GitHub-Noreply-Adresse genutzt; die globale Git-Konfiguration bleibt unverändert.

## Tatsächlich ausgeführte Validierung

| Prüfung | Ergebnis |
| --- | --- |
| `npm ci` | PASS; 398 Pakete installiert, 399 Pakete auditiert |
| `codex:preflight -- --expected-head bdfa4b271460 --allow-dirty` | PASS; Ausgangscommit und Abhängigkeiten geprüft |
| `npm run verify:full` | PASS; Toolkit-Syntax/Selbsttest, Anwendungstests, ESLint, TypeScript, Operations-Syntax, Webpack-Produktionsbuild und Diff-Prüfung |
| `npm run verify:db` | PASS; alle 14 Standard-Suiten, Migrationen 24/24, zweiter Migrationslauf/Idempotenz, Cleanup |
| `npm run verify:db -- team-actions` | PASS; zusätzlicher isolierter HTTP-UAT für betroffene Team-/Kontenfunktionen und Server-Aktionen, Cleanup |
| `npm audit --json` | PASS; 0 bekannte Sicherheitslücken aller Abhängigkeiten, einschließlich Entwicklungsabhängigkeiten |
| `git diff --check` / abschließende Indexprüfung | PASS; einschließlich neuer Dateien vor dem Commit |

Alle DB-Tests verwendeten eigens erzeugte PostgreSQL-17-Wegwerfcontainer über
lokales rootless Podman mit zufälligen Zugangsdaten und Loopback-Port. Kein
bestehendes `DATABASE_URL`, keine Produktionsdaten und keine produktive Migration.
Die Container wurden nach den Tests entfernt. Der HTTP-UAT startete ausschließlich
seinen temporären Server unter `http://localhost:3000` und beendete ihn anschließend.
Es handelt sich um automatisierten HTTP-UAT, keinen manuellen visuellen Browsertest.

Der erste Preflight konnte vor Installation keine Abhängigkeiten finden.
Ein Sandbox-Installationsversuch wurde wegen fehlenden Registry-Zugriffs beendet;
die anschließend separat abgeschlossene saubere Installation und alle oben
aufgeführten Prüfungen waren erfolgreich. Die Indexprüfung wurde nach der
Leerzeilenkorrektur wiederholt; anschließend wurde `verify:full` erneut ausgeführt. Docker war lokal nicht direkt nutzbar;
das vorhandene rootless Podman wurde verwendet. Keine Tests wurden dafür geändert.

## Sicherheitsnachweis des Release-Dateibestands

Geprüft wurden sämtliche versionierten und neuen, zur Veröffentlichung geeigneten
Dateien, einschließlich versteckter Konfigurationen, Dokumentation, Beispielwerten,
Shell-Skripten, Tests, Docker-Dateien und GitHub-Workflow. `.git`, Abhängigkeiten und
generierte Build-/Cachedateien sind keine Release-Dateien. Zusätzlich wurden die
lokalen Dateinamen auf Umgebungsdateien, Dumps, Archive, Backups und Schlüssel geprüft.

Vorgehen: vollständige Dateiliste über
`git ls-files --cached --others --exclude-standard -z`, Inhaltsprüfung auf
Schlüssel-/Tokenformate, Credential-Zuweisungen, URL-/IP-/Host-/Pfadangaben und bekannte
private Infrastrukturmerkmale. Alle Credential-Kandidaten sowie IP-/URL-Gruppen
wurden ihrem Kontext zugeordnet. Die drei bestehenden Screenshots wurden visuell
geprüft; Metadaten aller 36 Bilddateien enthalten keine erkennbaren Zugangsdaten,
Benutzerpfade oder Standortdaten. Screenshot-Metadaten enthalten nur Werkzeug und
historischen Aufnahmezeitpunkt; sichtbare Kontobezeichnung ist generisch.

Ergebnis: keine produktiven Secrets, privaten Schlüssel, produktiven `.env`-Dateien,
Dumps, Backups, persönlichen Benutzerbestände, internen SSH-Konfigurationen oder
konkreten privaten Infrastrukturangaben im geprüften Release-Bestand gefunden.

Bewusst beibehaltene harmlose Beispiele:

- RFC1918-Adressen in deterministischen Netzwerk-Labs, Unterricht und Regressionstests;
  sie beschreiben simulierte Szenarien, keine private Live-Infrastruktur.
- Loopback-Adressen, reservierte Dokumentationsnetze, Subnetzmasken und absichtlich
  ungültige IP-Eingaben in Lern-/Validierungstests.
- `.test`-/`.example`-/`.invalid`-Domains, öffentliche npm-/GitHub-/Push-Provider und
  neutrale Deployment-Pfade; der öffentliche Repository-Eigentümer ist bereits Teil
  der öffentlichen Basis.
- Eindeutig synthetische Testpasswörter, kurzlebige UAT-Konten und Laufzeit-generierte
  Testschlüssel. In produktiven Beispielen werden Secrets als Variablen verlangt.

Der folgende Inhaltsfingerabdruck bindet den geprüften Release-Bestand. Ausgenommen
sind nur dieser Bericht und der Validierungsnachweis, um Selbstreferenzen und
maschinenabhängige Laufzeiten nicht einzubeziehen. Berechnung: sortierte relative
UTF-8-Pfade, je `Pfad + NUL + SHA256(Datei) + LF`, anschließend SHA-256 der Gesamtheit.

Geprüfter Bestand: **566 Dateien** (einschließlich beider Nachweisdateien).
Fingerabdruck über 564 Dateien: `0e751a40769f00f453201951d2e01142e3aa10cbedfd1e9a9813fa519af2713e`.

Die Prüfung ist eine gezielte Bestandskontrolle und ein Registry-Snapshot,
keine Garantie gegen sämtliche unbekannten Schwachstellen. Die bestehende
öffentliche Historie wurde erhalten und nicht neu geschrieben.

## Verbleibender Betriebsnachweis

Ein produktives Deployment dieses Entwicklungsstands ist nicht bestätigt.
Die lokale Release-Vorbereitung ersetzt keinen später separat freizugebenden
Deployment-, Migrations-, Healthcheck- und Backup-Nachweis. Externe Backups werden
auch durch die implementierte Kontolöschung nicht verändert.
