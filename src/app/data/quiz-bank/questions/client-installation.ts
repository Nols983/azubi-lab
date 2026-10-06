import type { QuestionBankQuestion } from "../types.ts";

const moduleSlug = "clientinstallation-boot-datentraeger";
const base = { revision: 1, moduleSlug, practiceEligible: true, completionEligible: true, shuffleOptions: true } as const;

export const clientInstallationQuestions = [
  {
    ...base, id: `${moduleSlug}:firmware-post`, lessonSlug: "bios-uefi-und-post", tags: ["firmware-boot"], difficulty: "easy", type: "single-choice",
    prompt: "Welche Aussage beschreibt Firmware und POST korrekt?",
    options: [{ id: "correct", label: "BIOS beziehungsweise UEFI startet vor dem Betriebssystem; der POST prüft grundlegende Hardware." }, { id: "windows", label: "Der POST wird erst nach der Windows-Anmeldung ausgeführt." }, { id: "filesystem", label: "UEFI ist ein Dateisystem für Linux-Partitionen." }, { id: "complete", label: "Ein erfolgreicher POST garantiert, dass jeder Treiber fehlerfrei arbeitet." }],
    correctOptionId: "correct", explanation: "Firmware initialisiert die Plattform vor dem Betriebssystem. Der POST ist eine frühe Grundprüfung, aber kein vollständiger Treiber- oder Belastungstest.",
  },
  {
    ...base, id: `${moduleSlug}:boot-media-selection`, lessonSlug: "bios-uefi-und-post", tags: ["firmware-boot", "client-installation"], difficulty: "medium", type: "multiple-selection",
    prompt: "Ein Client soll einmalig von einem Installationsstick starten. Welche Schritte sind sachgerecht?",
    options: [{ id: "temporary", label: "Das temporäre Bootmenü verwenden, wenn verfügbar." }, { id: "verify", label: "Bootfähigkeit und vertrauenswürdige Herkunft des Mediums prüfen." }, { id: "guess", label: "Das Installationsziel allein anhand der Reihenfolge in der Liste erraten." }, { id: "document", label: "Den vorgesehenen Firmware-/Bootmodus dokumentieren." }],
    correctOptionIds: ["temporary", "verify", "document"], explanation: "Eine einmalige Auswahl, ein geprüftes Medium und ein dokumentierter Modus verringern Risiken; das Ziel wird eindeutig identifiziert.",
  },
  {
    ...base, id: `${moduleSlug}:boot-chain`, lessonSlug: "bootvorgang-und-secure-boot", tags: ["firmware-boot"], difficulty: "medium", type: "single-choice",
    prompt: "Welche vereinfachte Startreihenfolge ist korrekt?",
    options: [{ id: "reverse", label: "Anmeldung → Kernel → POST → Firmware" }, { id: "correct", label: "Firmware/POST → Bootziel → Bootmanager oder Bootloader → Kernel/Dienste → Anmeldung" }, { id: "loader-first", label: "Bootloader → Einschalten → Firmware → POST" }, { id: "login-first", label: "Firmware → Anmeldung → Bootziel → Kernel" }],
    correctOptionId: "correct", explanation: "Firmware und POST arbeiten vor der Bootziel-Auswahl; Bootloader beziehungsweise Bootmanager übergeben an den Betriebssystemstart.",
  },
  {
    ...base, id: `${moduleSlug}:boot-manager-role`, lessonSlug: "bootvorgang-und-secure-boot", tags: ["firmware-boot"], difficulty: "easy", type: "multiple-selection",
    prompt: "Welche Zuordnungen sind korrekt?",
    options: [{ id: "windows", label: "Windows Boot Manager ist ein Beispiel aus dem Windows-Startpfad." }, { id: "grub", label: "GRUB ist ein verbreitetes Bootloader-/Bootmanager-Beispiel im Linux-Kontext." }, { id: "post", label: "Ein Bootloader führt als Mainboard-Firmware den POST aus." }, { id: "handoff", label: "Bootmanager beziehungsweise Bootloader leitet den Start des gewählten Betriebssystems ein." }],
    correctOptionIds: ["windows", "grub", "handoff"], explanation: "POST und Firmwareauswahl kommen vorher; Bootmanager oder Bootloader startet anschließend die passenden OS-Komponenten.",
  },
  {
    ...base, id: `${moduleSlug}:secure-boot`, lessonSlug: "bootvorgang-und-secure-boot", tags: ["firmware-boot", "it-security"], difficulty: "medium", type: "single-choice",
    prompt: "Ein UEFI-System weist eine unbekannte Bootkomponente bei aktivem Secure Boot ab. Welche Bewertung ist richtig?",
    options: [{ id: "encryption", label: "Secure Boot hat die Nutzdaten der SSD verschlüsselt." }, { id: "disable", label: "Dauerhaftes Abschalten ist bei jedem Bootproblem die vorgeschriebene erste Maßnahme." }, { id: "trust", label: "Die Vertrauenskette beziehungsweise Signatur wird geprüft; Medium und Ursache sollten untersucht werden." }, { id: "format", label: "Secure Boot formatiert automatisch die Systempartition." }],
    correctOptionId: "trust", explanation: "Secure Boot prüft vertrauenswürdige Bootkomponenten. Es ist weder Datenträgerverschlüsselung noch ein Grund, Schutz pauschal abzuschalten.",
  },
  {
    ...base, id: `${moduleSlug}:gpt-mbr`, lessonSlug: "gpt-mbr-und-partitionen", tags: ["storage-layout"], difficulty: "medium", type: "multiple-selection",
    prompt: "Welche Aussagen zu GPT und MBR sind korrekt?",
    options: [{ id: "gpt", label: "GPT ist für moderne Neuinstallationen und große Datenträger die übliche Wahl." }, { id: "mbr-limit", label: "MBR besitzt mit üblichen 512-Byte-Sektoren praktisch eine Grenze von rund 2 TiB." }, { id: "equation", label: "BIOS bedeutet technisch ausnahmslos MBR und UEFI ausnahmslos GPT." }, { id: "primary", label: "MBR kennt klassisch höchstens vier primäre Partitionseinträge." }],
    correctOptionIds: ["gpt", "mbr-limit", "primary"], explanation: "GPT vermeidet wesentliche MBR-Grenzen. Firmwaremodus und Partitionsschema hängen praktisch zusammen, sind aber keine universelle Gleichung.",
  },
  {
    ...base, id: `${moduleSlug}:storage-levels`, lessonSlug: "gpt-mbr-und-partitionen", tags: ["storage-layout", "filesystems"], difficulty: "easy", type: "single-choice",
    prompt: "Welche Kette ordnet die Speicherbegriffe sinnvoll vom Gerät zur Dateiorganisation?",
    options: [{ id: "wrong-one", label: "Dateisystem → Firmware → Datenträger → POST" }, { id: "correct", label: "physischer Datenträger → Partitionstabelle → Partition/Volume → Dateisystem" }, { id: "wrong-two", label: "Partition → SSD → GPT → Betriebssystem" }, { id: "same", label: "Partition und Dateisystem sind identische Begriffe." }],
    correctOptionId: "correct", explanation: "Die Ebenen bauen aufeinander auf, bleiben aber fachlich getrennt.",
  },
  {
    ...base, id: `${moduleSlug}:modern-disk-scenario`, lessonSlug: "gpt-mbr-und-partitionen", tags: ["storage-layout", "client-installation"], difficulty: "hard", type: "single-choice",
    prompt: "Ein neuer UEFI-Client mit 4-TB-SSD wird frisch installiert. Welche Planung ist am plausibelsten?",
    options: [{ id: "no-table", label: "Auf eine Partitionstabelle verzichten und nur einen Laufwerksbuchstaben vergeben." }, { id: "mbr", label: "MBR wählen, weil nur MBR mehr als 2 TiB adressieren kann." }, { id: "legacy", label: "Legacy-BIOS erzwingen, weil UEFI keine großen Datenträger starten kann." }, { id: "gpt", label: "GPT und eine passende EFI-Systempartition für den UEFI-Start vorsehen." }],
    correctOptionId: "gpt", explanation: "GPT ist der übliche moderne Pfad und unterstützt große Datenträger; die ESP stellt UEFI-Startdateien bereit.",
  },
  {
    ...base, id: `${moduleSlug}:partition-format`, lessonSlug: "dateisysteme-und-formatierung", tags: ["storage-layout", "filesystems"], difficulty: "easy", type: "single-choice",
    prompt: "Was unterscheidet Partitionierung von Formatierung?",
    options: [{ id: "same", label: "Beide Begriffe bezeichnen immer denselben Schritt." }, { id: "correct", label: "Partitionierung grenzt Bereiche ab; Formatierung legt ein Dateisystem in einem vorgesehenen Bereich an." }, { id: "boot", label: "Formatierung ändert nur die Bootreihenfolge der Firmware." }, { id: "permissions", label: "Partitionierung vergibt ausschließlich Benutzerrechte." }],
    correctOptionId: "correct", explanation: "Partitionstabelle und Dateisystem erfüllen getrennte Aufgaben; beide Schritte können vorhandene Daten gefährden.",
  },
  {
    ...base, id: `${moduleSlug}:filesystem-use`, lessonSlug: "dateisysteme-und-formatierung", tags: ["filesystems", "storage-layout"], difficulty: "medium", type: "multiple-selection",
    prompt: "Welche typischen Zuordnungen sind korrekt?",
    options: [{ id: "ntfs", label: "NTFS für ein modernes Windows-Systemvolume" }, { id: "ext4", label: "ext4 für eine typische Linux-Root-Partition" }, { id: "fat32", label: "FAT32 für die EFI-Systempartition" }, { id: "fat-large", label: "FAT32 für eine 20-GiB-Einzeldatei ohne Aufteilung" }],
    correctOptionIds: ["ntfs", "ext4", "fat32"], explanation: "NTFS, ext4 und FAT32 haben unterschiedliche typische Rollen; FAT32 besitzt eine 4-GiB-Einzeldateigrenze.",
  },
  {
    ...base, id: `${moduleSlug}:efi-system-partition`, lessonSlug: "dateisysteme-und-formatierung", tags: ["firmware-boot", "storage-layout", "filesystems"], difficulty: "hard", type: "single-choice",
    prompt: "Die Betriebssystempartition ist intakt, aber die EFI-Systempartition wurde gelöscht. Welche Folge ist plausibel?",
    options: [{ id: "no-effect", label: "Die ESP enthält nie Startdateien und ihre Löschung hat keine Wirkung." }, { id: "encrypted", label: "Alle Nutzdaten werden dadurch automatisch verschlüsselt." }, { id: "boot-fails", label: "Der UEFI-Bootpfad kann fehlen, obwohl die Betriebssystemdateien noch vorhanden sind." }, { id: "post", label: "Der POST wird dauerhaft durch NTFS ersetzt." }],
    correctOptionId: "boot-fails", explanation: "Die ESP enthält startkritische UEFI-Dateien. Ihre kleine Größe macht sie nicht entbehrlich.",
  },
  {
    ...base, id: `${moduleSlug}:installation-preparation`, lessonSlug: "betriebssystem-installieren", tags: ["client-installation"], difficulty: "medium", type: "multiple-selection",
    prompt: "Welche Schritte gehören vor eine potenziell destruktive Clientinstallation?",
    options: [{ id: "requirements", label: "Anforderungen und Hardwarekompatibilität prüfen" }, { id: "backup", label: "Benötigte Daten sichern und Wiederherstellbarkeit klären" }, { id: "medium", label: "Installationsquelle und Medium verifizieren" }, { id: "guess", label: "Den Zieldatenträger ohne Identitätsprüfung auswählen" }],
    correctOptionIds: ["requirements", "backup", "medium"], explanation: "Vor dem Schreiben auf Datenträger werden Anforderungen, Schutz der Daten, Medium, Modus und Ziel eindeutig geklärt.",
  },
  {
    ...base, id: `${moduleSlug}:installation-order`, lessonSlug: "betriebssystem-installieren", tags: ["client-installation", "storage-layout"], difficulty: "hard", type: "single-choice",
    prompt: "Welche Reihenfolge bildet den gemeinsamen sicheren Installationsablauf am besten ab?",
    options: [{ id: "validate-first", label: "validieren → formatieren → Anforderungen erheben → Installer suchen" }, { id: "format-first", label: "sofort formatieren → danach Backupbedarf prüfen → installieren" }, { id: "drivers-first", label: "Herstellertreiber installieren → erst danach das Betriebssystem auswählen" }, { id: "correct", label: "vorbereiten/sichern → Installer booten → Layout wählen → installieren/erste Einrichtung → Treiber/Updates → validieren" }],
    correctOptionId: "correct", explanation: "Schutz und Planung stehen vor Datenträgeränderungen; Validierung und Dokumentation schließen den Ablauf ab.",
  },
  {
    ...base, id: `${moduleSlug}:driver-context`, lessonSlug: "treiber-und-post-installation", tags: ["client-installation", "system-administration"], difficulty: "medium", type: "single-choice",
    prompt: "Welche Aussage zu Treibern ist korrekt?",
    options: [{ id: "linux", label: "Jedes Linux-Gerät benötigt zwingend ein heruntergeladenes Herstellerprogramm." }, { id: "correct", label: "Windows kann generische Treiber nutzen; bei Linux stammen viele Treiber aus Kernel und Paketen, sodass nicht jedes Gerät einen separaten Herstellerinstaller benötigt." }, { id: "firmware", label: "Treiber ersetzen BIOS beziehungsweise UEFI vollständig." }, { id: "never", label: "Ein scheinbar funktionierendes Gerät braucht nie eine Zustands- oder Updateprüfung." }],
    correctOptionId: "correct", explanation: "Treiberbereitstellung unterscheidet sich nach Gerät und Betriebssystem; Quellen, Funktion und Aktualität werden geprüft.",
  },
  {
    ...base, id: `${moduleSlug}:post-installation-validation`, lessonSlug: "treiber-und-post-installation", tags: ["client-installation", "network-diagnostics"], difficulty: "hard", type: "multiple-selection",
    prompt: "Welche Punkte gehören zu einer belastbaren Post-Installation-Validierung?",
    options: [{ id: "boot", label: "erfolgreicher Neustart und erwartetes Datenträgerlayout" }, { id: "devices", label: "Gerätestatus und installierte Sicherheitsupdates" }, { id: "network", label: "IP/Präfix, Gateway, DNS und getrennte Funktionstests" }, { id: "accounts", label: "erwartete Konten, benötigte Software und dokumentierte Abweichungen" }, { id: "ping", label: "nur ein Ping; er ersetzt alle übrigen Prüfungen" }],
    correctOptionIds: ["boot", "devices", "network", "accounts"], explanation: "Die Abnahme verbindet mehrere unabhängige Nachweise und dokumentiert den Soll-Ist-Zustand.",
  },
] as const satisfies readonly QuestionBankQuestion[];
