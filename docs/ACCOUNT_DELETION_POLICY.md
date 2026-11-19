# Vollständige Kontolöschung

Prüfgrundlage: Release `85b4116eb683`, sämtliche Migrationen `0001` bis `0023`.
Die Korrektur ergänzt ausschließlich `0024_complete_account_erasure.sql`.
Die bisherige generelle Sperre bei Lernhistorien ist aufgehoben. Kontosperrung ist
eine andere Funktion und kein Ersatz für endgültige Löschung.

## Datenabhängigkeiten und Behandlung

| Daten / Herkunft | Löschstrategie |
| --- | --- |
| `users`, Passwort-Hash, Auth-Version / 0001, 0002, 0008, 0018 | Benutzerzeile löschen; bestehende JWTs können danach keinen aktuellen Benutzer mehr auflösen |
| `lesson_progress`, `quiz_progress`, `local_progress_imports` / 0001 | Bestehendes Benutzer-CASCADE |
| `xp_events`, `lesson_completion_history` / 0011, 0012 | Bestehendes Benutzer-CASCADE; unveränderliche Historie wird bei Kontolöschung ausdrücklich entfernt |
| `practice_quiz_attempts` und `practice_quiz_attempt_questions` / 0009, 0010 | Bestehendes Benutzer-/Versuchs-CASCADE, auch für abgeschlossene Versuche und Antworten |
| `ihk_exam_attempts` und `ihk_exam_attempt_questions` / 0013 | Bestehendes Benutzer-/Versuchs-CASCADE, auch für abgeschlossene Simulationen |
| `interactive_lab_attempts`, `interactive_lab_events` / 0017 | Bestehendes Benutzer-/Versuchs-CASCADE; sämtliche Zustände und Befehls-/Ereignishistorien entfernen |
| `learner_lab_hint_history`, `learner_lab_completion_history`, `profile_preferences` / 0019 | Bestehendes Benutzer-CASCADE, einschließlich Belohnungs- und Kosmetikdaten |
| Eigene `curriculum_assignments` / 0006 | Explizit löschen, auch archivierte Pläne und Freitextnotizen |
| Eigene `challenge_assignments` / 0003 | Nach allen Kindern explizit löschen |
| Eigene `challenge_submissions` / 0004 | Nach Bewertungen, Rubrikergebnissen und Dateimetadaten löschen |
| `challenge_reviews`, `challenge_review_criterion_results` für eigene Abgaben / 0004, 0005 | Ergebnisse und Bewertungen dieser Abgaben vollständig löschen |
| `challenge_submission_attachments` / 0005 | Interne Dateischlüssel in dauerhaften Bereinigungsauftrag übernehmen, danach Metadaten löschen; Binärdateien erst nach Commit entfernen |
| `challenge_assignment_comments` / 0005 | Eigene Beiträge sowie alle Kommentare an den gelöschten eigenen Zuweisungen löschen |
| `teams`, `challenges` / 0021, 0003 | Gemeinsam genutzte Vorlagen/Teams einschließlich Status, Inhalt und Rubrikkriterien erhalten; Verantwortungsreferenz an den löschenden Administrator übertragen |
| Fremde `challenge_assignments`, `curriculum_assignments`, die das Ziel zugewiesen hat | Erhalten; `assigned_by` an löschenden Administrator übertragen. Vom Ziel verfasste Lernplan-Notiz entfernen. Keine Rollen oder Mitgliedschaften vergeben |
| Vom Ziel verfasste `challenge_reviews` an fremden Abgaben | Entscheidung, Zeitpunkt und Rubrikpunkte erhalten; `reviewed_by` auf NULL, Feedback auf neutralen Hinweis setzen. Anzeige „Gelöschtes Konto“. Bestehendes Review bleibt fachlich ein Review |
| `team_members`, eigene `notifications`, `web_push_subscriptions` / 0021, 0007/0014/0015 | Bestehendes Benutzer-CASCADE |
| Hinweise in fremden Posteingängen zu gelöschten Lernenden/Abgaben | Gezielt anhand ihrer kanonischen Ressourcen-URLs löschen; übrige Nachrichten bleiben erhalten |
| `topic_proposals.created_by` / 0022 | Eigene Vorschläge löschen; sie publizieren keine Lernmodule. Vom Ziel bearbeitete fremde Vorschläge behalten Inhalt/Status, verlieren `reviewed_by` und persönliches `admin_feedback` |
| `password_reset_tokens.user_id` / `created_by_admin_id` / 0008 | Eigene sowie vom Ziel ausgestellte Reset-Tokens löschen; fremde Konten und Passwörter bleiben erhalten, ausgestellte Links werden ungültig |
| `avatar_moderation_events` / 0020 | Ereignis und Zeitpunkt erhalten, genau den gelöschten Teilnehmerbezug entfernen. Keine Zuordnung zu einem Ersatzkonto, keine Löschung des Ereignisses |
| `account_file_cleanup_jobs` / 0023 | UUID und Zeitstempel als technische Wiederholungsdaten ohne Benutzer-FK; 0024 ergänzt interne Nachweis-UUIDs; Auftrag nach erfolgreicher Bereinigung entfernen |
| Globale Inhalte und Rate-Limits / 0016 sowie Code-Kataloge | Lernmodule, Fragen und Lab-Definitionen sind unabhängig vom Benutzer. Globale bzw. HMAC-basierte Sicherheits-Buckets haben keinen Benutzer-FK und unterliegen weiter der bestehenden zeitlichen Bereinigung; keine Sperren anderer Benutzer aufheben |
| Neue, nicht von dieser Strategie erfasste Benutzer-FKs | Bei vorhandener Referenz vorsorglich blockieren und verständlich zur Prüfung melden; mehrspaltige unbekannte Benutzer-FKs grundsätzlich blockieren |

Die Migrationen `0002`, `0008`, `0018` ändern Rollen/Authentifizierung; `0010`,
`0015`, `0019` erweitern die oben aufgeführten Tabellen. Keine weitere Migration
aus `0001`–`0023` enthält zusätzliche Benutzerbezüge oder private Dateispeicher.
Es werden keine allgemeinen CASCADE-Regeln nachgerüstet. Die einzigen geänderten
FK-Löschregeln betreffen die zwei Teilnehmerverweise der Moderationsereignisse.

## Transaktion, Rechte und konkurrierende Änderungen

1. Action und Service verlangen die bestehende Administrator-Capability `manageUsers`.
2. Die Transaktion sperrt aktive Administratoren in derselben UUID-Reihenfolge wie Rollen-/Statuswechsel. Rolle, Sperrstatus, Passwortwechselpflicht und Auth-Version des Akteurs werden erneut geprüft.
3. Zielkonto mit `FOR UPDATE` sperren; Selbstlöschung, letzten aktiven Administrator, exakte aktuelle Anmeldekennung und ausdrückliche Checkbox innerhalb der Transaktion prüfen.
4. Unbekannte Benutzerreferenzen prüfen. Bekannte persönliche Abhängigkeiten sind kein Sperrgrund.
5. Eigene Challenge-Zuweisungen, Abgaben und Reviews in fester Reihenfolge sperren. Neue Benutzer-FKs sowie neue Abgaben-/Nachweis-/Rubrik-Kinder müssen diese Sperren respektieren. Während des Wartens bereits committed hinzugekommene Kinder werden mit erfasst.
6. Dateischlüssel in den bestehenden Bereinigungsauftrag schreiben, persönliche RESTRICT-Abhängigkeiten von unten nach oben löschen und gemeinsame Referenzen wie oben behandeln.
7. Benutzer löschen: vorhandene CASCADEs entfernen die übrigen eigenen Daten; die Moderations-FKs anonymisieren den Teilnehmerbezug. Anschließend Commit.

Jeder SQL-Fehler rollt auch Transfers, Anonymisierung, Löschung und Bereinigungsauftrag
zurück. Keine Trigger werden deaktiviert, keine Sitzungs-Replikationsrolle oder
allgemeinen Lösch-Ausnahmen gesetzt. Unerwartete FK-Verletzungen scheitern sicher.

Profilbild- und Nachweisuploads sperren und revalidieren das aktuelle Konto vor dem
Schreiben. Nachweisdateien und Abgabemetadaten werden während derselben Kontosperre
angelegt, damit ein veralteter Request nach einer Löschung nicht weiter schreiben
kann. Trainer-Benachrichtigungen sperren beim Einfügen ihre zugehörige Lernenden-
oder Zuweisungszeile; dadurch können alte Generator-Snapshots keine personenbezogenen
Hinweise nach der Löschtransaktion wieder einfügen.

## Audit-Anonymisierung in 0024

`avatar_moderation_events` speichert ausschließlich Teilnehmer-UUIDs, Ereignisart,
Ereignis-ID und Zeitstempel. Die Teilnehmerfelder werden nullable und erhalten
`ON DELETE SET NULL`. Der Trigger erlaubt die Änderung ausschließlich als
verschachtelte FK-Aktion, wenn die bisher referenzierte Benutzerzeile tatsächlich
nicht mehr existiert und ID, Ereignisart, Zeitpunkt sowie alle anderen Teilnehmer
unverändert bleiben. Manuelles Nullsetzen, Umhängen, Ändern und Löschen bleiben
verboten. Neue Ereignisse benötigen beide realen Teilnehmer.

Dies erhält die technische Ereignishistorie ohne einen Link zum gelöschten Konto.
Im Repository sind keine zusätzlichen gesetzlichen Aufbewahrungsfristen modelliert;
die Anwendung behauptet mit dieser technischen Regel keine rechtliche Bewertung
externer Archivierungs- oder Backup-Pflichten.

## Private Dateien nach dem Commit

Die Infrastruktur aus `0023` bleibt erhalten. `0024` ergänzt ausschließlich
`evidence_storage_keys uuid[]`; frei wählbare Dateipfade, Namen, Logins und Dateiinhalte
werden nicht in den Auftrag kopiert. Profilbildpfade werden weiterhin aus der
validierten Konto-UUID abgeleitet; Nachweise werden über die validierten UUID-Schlüssel
und den vorhandenen privaten Evidence-Storage gelöscht.

Die Bereinigung verarbeitet höchstens 50 Aufträge pro Aufruf mit
`FOR UPDATE SKIP LOCKED`, nur wenn das Benutzerkonto fehlt. Fehlende Dateien gelten
als erfolgreich bereinigt. Ein weiterhin referenzierter Evidence-Schlüssel wird
nicht gelöscht. Bei Dateisystemfehlern bleibt der gesamte Auftrag erhalten; bereits
entfernte Dateien sind beim erneuten Versuch unproblematisch. DB-Fehler rollen die
Auftragsänderung zurück. Administratoren sehen offene Aufträge und können die
Bereinigung erneut starten. Dateien ohne Metadaten sind über die Anwendung nicht
mehr abrufbar. Externe Backups werden durch diese lokale Anwendungsfunktion nicht
verändert.
