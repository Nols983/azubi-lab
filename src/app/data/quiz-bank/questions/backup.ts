import type { QuestionBankQuestion } from "../types.ts";

export const backupQuestions = [
  {
    id: "backup-datensicherung:raid-not-backup", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "backup-grundlagen-und-schutzziele", tags: ["backup-strategies"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Warum ersetzt ein gespiegeltes RAID kein Backup?",
    options: [{ id: "slow", label: "Weil RAID grundsätzlich langsamer als ein einzelnes Laufwerk ist." }, { id: "same-state", label: "Weil Löschung, Ransomware oder Korruption den aktuellen Zustand auf mehrere RAID-Datenträger übertragen können." }, { id: "no-files", label: "Weil auf RAID keine Dateien gespeichert werden können." }, { id: "offsite", label: "Weil jedes RAID automatisch offsite liegt." }],
    correctOptionId: "same-state", explanation: "RAID verbessert je nach Level Verfügbarkeit bei bestimmten Laufwerksfehlern. Es liefert keine getrennte frühere Version gegen logische oder standortweite Schäden.",
  },
  {
    id: "backup-datensicherung:sync-not-backup", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "backup-grundlagen-und-schutzziele", tags: ["backup-strategies"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Ein Ordner wird ohne Versionierung sofort auf ein zweites System synchronisiert. Welches Hauptrisiko bleibt?",
    options: [{ id: "network", label: "Synchronisation funktioniert ausschließlich ohne Netzwerk." }, { id: "archive", label: "Das zweite System wird automatisch zum rechtskonformen Archiv." }, { id: "raid", label: "Beide Systeme bilden zwingend ein RAID 1." }, { id: "deletion", label: "Eine Löschung oder Verschlüsselung kann sofort auf die zweite Kopie übertragen werden." }],
    correctOptionId: "deletion", explanation: "Eine aktuelle Synchronkopie kann denselben unerwünschten Zustand übernehmen. Getrennte Versionen, Schutz und Restore-Verfahren sind erforderlich.",
  },
  {
    id: "backup-datensicherung:backup-properties", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "backup-grundlagen-und-schutzziele", tags: ["backup-strategies"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Eigenschaften gehören zu einem belastbaren Backup-Konzept?",
    options: [{ id: "scope", label: "Definierter Datenumfang und Verantwortlichkeiten" }, { id: "copy-only", label: "Nur die Aussage, dass irgendein Kopierjob läuft" }, { id: "retention", label: "Aufbewahrung, Schutz und dokumentierte Restore-Verfahren" }, { id: "never-test", label: "Verzicht auf Restore-Tests, um Sicherungen zu schonen" }],
    correctOptionIds: ["scope", "retention"], explanation: "Ein Konzept braucht Scope, Zuständigkeit, Zeitplan, Retention, Sicherheit, Monitoring und getestete Wiederherstellung – nicht nur einen Kopierjob.",
  },
  {
    id: "backup-datensicherung:incremental-definition", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "voll-inkrementell-differentiell", tags: ["backup-strategies"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Was enthält ein tägliches inkrementelles Backup in der üblichen Grunddefinition?",
    options: [{ id: "all", label: "Jeden Tag alle ausgewählten Daten." }, { id: "full-only", label: "Nur Metadaten des letzten Vollbackups." }, { id: "since-last", label: "Änderungen seit der vorherigen Sicherung in der Kette." }, { id: "since-first", label: "Immer alle Änderungen seit der Installation des Servers." }],
    correctOptionId: "since-last", explanation: "Inkremente sichern Änderungen seit dem vorherigen relevanten Sicherungslauf. Dadurch sind tägliche Mengen klein, der Restore benötigt aber die vollständige Kette.",
  },
  {
    id: "backup-datensicherung:differential-definition", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "voll-inkrementell-differentiell", tags: ["backup-strategies"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Worauf bezieht sich ein differentielles Backup?",
    options: [{ id: "full", label: "Auf alle Änderungen seit dem letzten Vollbackup." }, { id: "last-diff", label: "Nur auf Änderungen seit dem letzten Differential." }, { id: "future", label: "Auf Änderungen des folgenden Tages." }, { id: "raid", label: "Auf die Paritätsblöcke eines RAID." }],
    correctOptionId: "full", explanation: "Jedes Differential sammelt die Änderungen seit dem letzten Vollbackup und wächst daher typischerweise bis zum nächsten Vollstand.",
  },
  {
    id: "backup-datensicherung:incremental-chain", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "restore-ketten-praktisch-planen", tags: ["backup-strategies", "recovery-objectives"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Vollbackup Montag; inkrementell Dienstag, Mittwoch und Donnerstag. Welche Sätze werden für den Stand Donnerstag benötigt?",
    options: [{ id: "thursday", label: "nur Donnerstag" }, { id: "full-thursday", label: "Montag und Donnerstag" }, { id: "last-two", label: "Mittwoch und Donnerstag" }, { id: "all", label: "Montag, Dienstag, Mittwoch und Donnerstag in Reihenfolge" }],
    correctOptionId: "all", explanation: "Jedes Inkrement baut auf dem vorherigen Stand auf. Für Donnerstag werden Basis-Vollbackup und alle folgenden Inkremente benötigt.",
  },
  {
    id: "backup-datensicherung:differential-chain", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "restore-ketten-praktisch-planen", tags: ["backup-strategies", "recovery-objectives"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Vollbackup Montag; differentielle Backups Dienstag, Mittwoch und Donnerstag. Welche Sätze gehören zum Restore auf Donnerstag?",
    options: [{ id: "tuesday", label: "Differential Dienstag" }, { id: "full", label: "Vollbackup Montag" }, { id: "wednesday", label: "Differential Mittwoch" }, { id: "thursday", label: "Differential Donnerstag" }],
    correctOptionIds: ["full", "thursday"], explanation: "Das jüngste Differential enthält alle Änderungen seit dem Vollbackup. Daher genügen Montag und das Differential von Donnerstag.",
  },
  {
    id: "backup-datensicherung:snapshot", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "datei-image-und-snapshot", tags: ["backup-strategies"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Warum sind VM-Snapshots auf demselben Datastore allein kein belastbares Backup?",
    options: [{ id: "vm", label: "Weil Snapshots nur für physische Server funktionieren." }, { id: "failure-domain", label: "Weil Original und Snapshot dieselbe Storage-Fehler- und Sicherheitsdomäne teilen können." }, { id: "network", label: "Weil Snapshots immer das Netzwerk deaktivieren." }, { id: "full", label: "Weil jeder Snapshot automatisch ein Vollbackup ist." }],
    correctOptionId: "failure-domain", explanation: "Fällt oder wird der Datastore kompromittiert, können VM und Snapshots gemeinsam verloren gehen. Eine unabhängig geschützte Kopie fehlt.",
  },
  {
    id: "backup-datensicherung:levels", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "datei-image-und-snapshot", tags: ["backup-strategies"], difficulty: "hard", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Zuordnungen sind fachlich sinnvoll?",
    options: [{ id: "file", label: "Datei-Backup: gut für granulare Wiederherstellung einzelner Ordner." }, { id: "image-no-system", label: "Image-Backup: enthält grundsätzlich nie systemnahe Strukturen." }, { id: "image", label: "Image/System-Backup: kann vollständige Maschinen- oder Volume-Restores unterstützen." }, { id: "snapshot", label: "Snapshot: kann schnellen Rollback oder einen konsistenten Backup-Ausgangspunkt unterstützen." }],
    correctOptionIds: ["file", "image", "snapshot"], explanation: "Datei-, Image- und Snapshot-Techniken haben unterschiedliche Stärken. Ein Snapshot wird erst mit unabhängiger Kopie und Restore-Konzept zum Teil einer belastbaren Sicherung.",
  },
  {
    id: "backup-datensicherung:three-two-one", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "backup-strategien-321", tags: ["backup-strategies"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Welche Aussage beschreibt die 3-2-1-Regel am besten?",
    options: [{ id: "three-jobs", label: "Drei Jobs pro Tag auf demselben Volume." }, { id: "two-users", label: "Zwei Administratoren und ein Passwort." }, { id: "one-copy", label: "Eine Kopie auf drei Partitionen desselben Datenträgers." }, { id: "copies", label: "Drei Kopien insgesamt, auf zwei unabhängigen Medien/Systemen, eine davon offsite." }],
    correctOptionId: "copies", explanation: "3-2-1 verteilt Produktions- und Sicherungskopien über unterschiedliche Speicher-/Fehlerdomänen und einen externen Ort.",
  },
  {
    id: "backup-datensicherung:three-two-one-one-zero", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "backup-strategien-321", tags: ["backup-strategies"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Wofür steht die zusätzliche letzte 0 in der Heuristik 3-2-1-1-0?",
    options: [{ id: "errors", label: "Null ungeklärte Fehler nach Integritäts- und Restore-Verifikation." }, { id: "encryption", label: "Null Verschlüsselung für schnellere Restores." }, { id: "offsite", label: "Null externe Kopien." }, { id: "retention", label: "Null Tage Aufbewahrung." }],
    correctOptionId: "errors", explanation: "Die 0 betont geprüfte Integrität und Wiederherstellbarkeit ohne offene Fehler. Sie ist ein Qualitätsziel, keine magische Garantie.",
  },
  {
    id: "backup-datensicherung:gfs", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "aufbewahrung-rotation-und-gfs", tags: ["backup-strategies"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Aussagen zu Grandfather-Father-Son (GFS) sind korrekt?",
    options: [{ id: "mandatory", label: "GFS ist für jede Organisation zwingend und unveränderlich vorgeschrieben." }, { id: "generations", label: "GFS kombiniert typischerweise Tages-, Wochen- und Monatsgenerationen." }, { id: "retention", label: "Die konkrete Zahl und Aufbewahrung der Generationen muss aus Anforderungen abgeleitet werden." }, { id: "offsite", label: "GFS garantiert allein automatisch eine geschützte Offsite-Kopie." }],
    correctOptionIds: ["generations", "retention"], explanation: "GFS ist eine optionale Rotationsstrategie. Fristen, Speicherorte und Schutzmaßnahmen werden separat festgelegt.",
  },
  {
    id: "backup-datensicherung:rpo", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "rpo-und-rto", tags: ["recovery-objectives", "backup-strategies"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Was beschreibt ein RPO von vier Stunden?",
    options: [{ id: "restore", label: "Der Dienst muss exakt vier Stunden nach Start eines Backups ausfallen." }, { id: "retention", label: "Backups dürfen nur vier Stunden aufbewahrt werden." }, { id: "loss", label: "Der maximal akzeptierte Datenverlust entspricht einem Zeitraum von vier Stunden." }, { id: "duration", label: "Jeder Backupjob muss vier Stunden laufen." }],
    correctOptionId: "loss", explanation: "RPO ist die tolerierte Lücke zwischen letztem nutzbaren Recovery Point und Vorfall. Es ist eine Geschäftsanforderung, nicht bloß die Jobdauer.",
  },
  {
    id: "backup-datensicherung:rto-controls", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "rpo-und-rto", tags: ["recovery-objectives"], difficulty: "hard", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Faktoren beeinflussen, ob ein RTO von zwei Stunden erreicht wird?",
    options: [{ id: "copy-only", label: "Ausschließlich die reine Kopiergeschwindigkeit" }, { id: "detect", label: "Erkennung, Freigabe und Bereitstellung der Restore-Umgebung" }, { id: "restore", label: "Datenübertragung, Wiederherstellung und Anwendungsprüfung" }, { id: "color", label: "Die Farbe des Backup-Dashboards" }],
    correctOptionIds: ["detect", "restore"], explanation: "RTO umfasst den vollständigen Weg bis zum nutzbaren Dienst, einschließlich Organisation, Technik, Prüfung und Freigabe.",
  },
  {
    id: "backup-datensicherung:restore-test", revision: 1, moduleSlug: "backup-datensicherung", lessonSlug: "backup-sicherheit-und-restore-tests", tags: ["backup-strategies", "recovery-objectives"], difficulty: "hard", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Alle Backupjobs sind grün. Welche Maßnahme liefert die stärkste zusätzliche Evidenz für Wiederherstellbarkeit?",
    options: [{ id: "trust", label: "Den Status unverändert als vollständigen Nachweis akzeptieren." }, { id: "restore", label: "Regelmäßig isolierte Restores einschließlich Schlüssel, Anwendungstest und gemessener Dauer durchführen." }, { id: "delete", label: "Alte Sicherungen ohne Kettenprüfung löschen." }, { id: "same-admin", label: "Allen Produktionsadministratoren dauerhafte Löschrechte geben." }],
    correctOptionId: "restore", explanation: "Nur ein realitätsnaher Restore prüft Daten, Katalog, Schlüssel, Berechtigungen, Runbook, Anwendungskonsistenz und tatsächliche Dauer gemeinsam.",
  },
] as const satisfies readonly QuestionBankQuestion[];
