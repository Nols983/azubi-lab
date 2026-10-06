import { clientInstallationExerciseDefinitions } from "../../data/learning-exercises/client-installation";
import { FundamentalsLesson, ResponsiveTable, TextFlow } from "./fundamentals-lesson-elements";
import { PracticeExercise } from "./practice-exercise";

const lessons = {
  "bios-uefi-und-post": {
    objectives: [
      "Firmware als erste Softwareebene eines Clients einordnen",
      "BIOS und UEFI praxisnah unterscheiden",
      "POST, Bootreihenfolge und einmalige Bootauswahl erklären",
      "ein bootfähiges Installationsmedium bewusst auswählen",
    ],
    intro: <><p>Beim Einschalten läuft noch kein Windows oder Linux. Zuerst übernimmt die Firmware des Mainboards: Sie initialisiert die Plattform, prüft grundlegende Hardware und sucht ein startfähiges Ziel.</p><p><strong>BIOS</strong> bezeichnet die ältere Firmwaretradition; <strong>UEFI</strong> ist die moderne Firmwareumgebung. Beide Begriffe beschreiben keine Betriebssysteme und sagen allein noch nicht, wie ein Datenträger partitioniert ist.</p></>,
    sections: [
      {
        title: "Firmware und POST",
        paragraphs: [
          <>Firmware stellt die frühe Umgebung bereit, in der CPU, Arbeitsspeicher, Controller und Eingabegeräte grundlegend initialisiert werden. Einstellungen wie Datum, aktivierte Geräte oder Bootreihenfolge liegen außerhalb des installierten Betriebssystems.</>,
          <>Der <strong>Power-On Self-Test (POST)</strong> prüft beim Start grundlegende Hardwarefunktionen. Ein Fehler kann sich etwa durch eine Meldung, Diagnose-LEDs oder Signaltöne zeigen. Ein erfolgreicher POST beweist jedoch nicht, dass jedes Gerät später unter dem Betriebssystem korrekt arbeitet.</>,
        ],
        points: ["BIOS/UEFI startet vor dem Betriebssystem.", "POST ist eine frühe Grundprüfung, kein vollständiger Hardwaretest.", "Firmwareeinstellungen gezielt dokumentieren und nicht wahllos ändern."],
        activity: <PracticeExercise exercise={clientInstallationExerciseDefinitions.firmwareClassification} />,
      },
      {
        title: "Bootreihenfolge und Installationsmedium",
        paragraphs: [
          <>Die dauerhafte Bootreihenfolge legt fest, welche startfähigen Ziele die Firmware nacheinander versucht. Für eine einmalige Installation ist das temporäre Bootmenü meist sicherer als eine dauerhafte Umstellung.</>,
          <>Ein USB-Stick ist nicht schon deshalb bootfähig, weil Installationsdateien darauf kopiert wurden. Er benötigt eine passende startfähige Struktur. Außerdem muss die richtige Variante des Mediums gewählt werden: Auf produktiven Geräten ist vor jeder Installation zweifelsfrei zu prüfen, welcher Datenträger das Ziel ist.</>,
        ],
      },
    ],
    visual: <ResponsiveTable caption="BIOS und UEFI im praktischen Vergleich" headers={["Merkmal", "BIOS-Tradition", "UEFI"]} rows={[
      ["Einordnung", "ältere Firmwarearchitektur", "moderne Firmwareumgebung"],
      ["Bootmechanismus", "klassischer Bootcode, häufig Legacy-Modus", "Firmware-Startdateien und Boot-Einträge"],
      ["Typischer Neuinstallationskontext", "ältere Hardware oder Kompatibilitätsfall", "moderner Client, meist zusammen mit GPT"],
      ["Wichtige Vorsicht", "nicht automatisch gleichbedeutend mit MBR", "technisch nicht in jedem denkbaren Fall zwingend GPT"],
    ]} />,
    scenario: {
      title: "Ein Notebook soll vom Installationsstick starten",
      situation: <p>Die interne SSD enthält wichtige Daten. Der vorbereitete USB-Stick wird im normalen Start übersprungen.</p>,
      tasks: ["Welche Ebene entscheidet zunächst über das Startziel?", "Welche sichere Auswahl ist gegenüber einer dauerhaften Änderung vorzuziehen?", "Was muss vor dem Start des Installers zusätzlich geklärt sein?"],
      solution: <p>Die UEFI-Firmware wählt das Bootziel. Für diesen einen Start wird das temporäre Bootmenü genutzt. Vorher werden Bootfähigkeit und Vertrauenswürdigkeit des Mediums, Backup, Zielgerät sowie der vorgesehene Bootmodus geprüft. Die interne SSD wird nicht allein anhand ihrer Position ausgewählt.</p>,
    },
    takeaway: ["Firmware und POST arbeiten vor dem Betriebssystem.", "UEFI ist die moderne Firmwareumgebung.", "Bootziel und Installationsziel werden bewusst und getrennt geprüft."],
  },
  "bootvorgang-und-secure-boot": {
    objectives: ["eine vereinfachte, aber belastbare Bootkette beschreiben", "Firmware-Bootauswahl und Betriebssystem-Bootloader unterscheiden", "Windows Boot Manager und GRUB als Beispiele einordnen", "Secure Boot korrekt von Datenträgerverschlüsselung abgrenzen"],
    intro: <><p>„Der Rechner bootet nicht“ kann mehrere Übergaben meinen. Eine saubere Diagnose benennt deshalb, wie weit der Start gelangt: POST, Bootziel, Bootmanager beziehungsweise Bootloader, Kernel, Dienste oder Anmeldung.</p></>,
    sections: [
      {
        title: "Die Übergaben im Systemstart",
        paragraphs: [
          <>Nach Initialisierung und POST wählt die Firmware ein startfähiges Ziel. Auf einem UEFI-System kann sie eine Startdatei aus der EFI-Systempartition aufrufen. Danach übernimmt ein <strong>Bootmanager oder Bootloader</strong>, zum Beispiel Windows Boot Manager oder GRUB, und leitet den Start des gewählten Betriebssystems ein.</>,
          <>Erst anschließend werden Kernel, Treiber und Systemdienste aktiv. Die Anmeldeoberfläche ist daher ein spätes Signal: Wer sie sieht, hat Firmware, Bootziel, Bootloader und große Teile des Betriebssystemstarts bereits erfolgreich durchlaufen.</>,
        ],
        activity: <PracticeExercise exercise={clientInstallationExerciseDefinitions.bootSequence} />,
      },
      {
        title: "Secure Boot schützt die frühe Bootkette",
        paragraphs: [
          <>Secure Boot lässt vertrauenswürdige, passend signierte Bootkomponenten zu und kann manipulierte oder unbekannte Komponenten abweisen. Das erschwert, dass Schadcode vor dem Betriebssystem startet.</>,
          <>Secure Boot <strong>verschlüsselt keine Datenträger</strong>. Eine Ablehnung wird zunächst über Medium, Signaturen, Firmwarestatus und Herstellerdokumentation untersucht. Pauschales Abschalten ist weder Diagnose noch dauerhafte Standardlösung.</>,
        ],
        activity: <PracticeExercise exercise={clientInstallationExerciseDefinitions.secureBootScenarios} />,
      },
    ],
    visual: <TextFlow caption="Vereinfachte Startkette" steps={["Einschalten", "Firmware + POST", "Bootziel", "Bootmanager / Bootloader", "Kernel + Dienste", "Anmeldung"]} />,
    scenario: {
      title: "Signaturfehler statt Installationsstart",
      situation: <p>Ein UEFI-Client erkennt einen USB-Stick, Secure Boot weist dessen Startkomponente aber als nicht vertrauenswürdig ab.</p>,
      tasks: ["Welche Phase wurde bereits erreicht?", "Was schützt Secure Boot hier?", "Warum ist das Abschalten nicht der erste Standardweg?"],
      solution: <p>Firmware, POST und Bootziel-Auswahl funktionieren bereits; die Vertrauensprüfung der Bootkomponente schlägt fehl. Zuerst werden Herkunft, Integrität, Signatur und Kompatibilität des Mediums geprüft. Secure Boot schützt nicht die Vertraulichkeit der SSD, sondern die frühe Startkette.</p>,
    },
    takeaway: ["Firmware und Bootloader erfüllen verschiedene Aufgaben.", "Windows Boot Manager und GRUB sind Beispiele, keine Firmware.", "Secure Boot ist Signatur- und Vertrauensprüfung, keine Datenträgerverschlüsselung."],
  },
  "gpt-mbr-und-partitionen": {
    objectives: ["Partitionstabellen, Partitionen und Volumes unterscheiden", "GPT und MBR praxisnah vergleichen", "Größen- und Partitionsgrenzen von MBR einordnen", "UEFI und GPT ohne falsche Gleichsetzung erklären"],
    intro: <><p>Eine SSD ist zunächst ein physischer Datenträger. Die Partitionstabelle beschreibt abgegrenzte Bereiche. Erst in oder auf diesen Bereichen entstehen nutzbare Volumes und Dateisysteme. Wer diese Ebenen vermischt, riskiert bei Installationen die falsche Auswahl.</p></>,
    sections: [
      {
        title: "GPT und MBR",
        paragraphs: [
          <><strong>MBR</strong> ist ein älteres Partitionsschema. Mit üblichen 512-Byte-Sektoren adressiert es praktisch nur rund 2 TiB und kennt klassisch höchstens vier primäre Partitionen; eine erweiterte Partition kann diese historische Grenze teilweise umgehen.</>,
          <><strong>GPT</strong> verwendet moderne Metadatenstrukturen, unterstützt sehr große Datenträger und typischerweise viele Partitionen. Für einen modernen UEFI-Client ist GPT die übliche Neuinstallationswahl.</>,
          <>Trotzdem gilt nicht „BIOS = MBR“ und „UEFI = GPT“ als Naturgesetz. Firmware kann Kompatibilitätsmodi besitzen, Betriebssysteme setzen eigene Bootregeln, und technische Sonderfälle existieren. Für Planung und Support zählt die konkrete Kombination aus Hardware, Firmwaremodus und Betriebssystem.</>,
        ],
        activity: <PracticeExercise exercise={clientInstallationExerciseDefinitions.partitionDecision} />,
      },
      {
        title: "Vom Datenträger zum nutzbaren Bereich",
        paragraphs: [
          <>Die Partitionstabelle beschreibt Start, Ende und Typ von Partitionen. Eine Partition ist ein abgegrenzter Bereich. Ein Volume ist ein vom Betriebssystem nutzbarer logischer Speicherbereich; häufig entspricht es einer Partition, kann aber durch andere Storage-Techniken anders aufgebaut sein.</>,
          <>System- und Datenpartitionen können Betriebssystemdateien und Nutzdaten organisatorisch trennen. Diese Trennung ersetzt kein Backup und schützt nicht automatisch vor einem Ausfall des gemeinsamen Datenträgers.</>,
        ],
        activity: <PracticeExercise exercise={clientInstallationExerciseDefinitions.storageLayers} />,
      },
    ],
    visual: <ResponsiveTable caption="GPT und MBR für die Clientplanung" headers={["Frage", "GPT", "MBR"]} rows={[
      ["Typischer Einsatz", "moderne Neuinstallation", "Legacy- und Kompatibilitätsfälle"],
      ["Große Datenträger", "für Größen weit über 2 TiB ausgelegt", "praktische Grenze oft rund 2 TiB"],
      ["Partitionen", "typischerweise viele Einträge", "klassisch vier primäre Einträge"],
      ["UEFI-Neuinstallation", "übliche Wahl mit EFI-Systempartition", "kein moderner Standardpfad"],
    ]} />,
    scenario: {
      title: "4-TB-SSD in einem neuen UEFI-Client",
      situation: <p>Ein neuer Arbeitsplatz soll Windows oder Linux auf einer 4-TB-SSD erhalten. Eine getrennte Datenpartition ist gewünscht.</p>,
      tasks: ["Welches Partitionsschema ist plausibel?", "Welche Ebenen müssen getrennt geplant werden?", "Welche falsche Vereinfachung sollte die Dokumentation vermeiden?"],
      solution: <p>GPT ist für diesen modernen, großen Datenträger die begründete Standardwahl. Dokumentiert werden Firmwaremodus, physischer Datenträger, GPT-Partitionen, vorgesehene Volumes und spätere Dateisysteme. Die Begründung lautet nicht „UEFI kann ausschließlich GPT“, sondern stützt sich auf den vorgesehenen modernen Installationspfad und die Datenträgergröße.</p>,
    },
    takeaway: ["GPT und MBR sind Partitionstabellen, keine Dateisysteme.", "MBR besitzt relevante Größen- und Partitionsgrenzen.", "UEFI/GPT ist der typische moderne Pfad, aber keine universelle technische Gleichung."],
  },
  "dateisysteme-und-formatierung": {
    objectives: ["Partitionierung und Formatierung unterscheiden", "NTFS, FAT32 und ext4 typischen Zwecken zuordnen", "Laufwerksbuchstaben und Mountpoints einordnen", "Zweck und Schutzbedarf der EFI-Systempartition erklären"],
    intro: <><p>Partitionieren teilt beziehungsweise beschreibt Speicherbereiche. Formatieren legt ein Dateisystem in einem vorgesehenen Bereich an. Beides kann Datenzugriff zerstören und gehört deshalb nur in einen bestätigten Installationsplan, nicht in ein Experiment am Produktivgerät.</p></>,
    sections: [
      {
        title: "Dateisysteme organisieren Dateien",
        paragraphs: [
          <><strong>NTFS</strong> ist das typische Dateisystem moderner Windows-Systemvolumes und unterstützt Windows-Metadaten und Berechtigungen. <strong>ext4</strong> ist eine verbreitete Linux-Wahl. <strong>FAT32</strong> ist breit interoperabel, besitzt aber unter anderem eine maximale Einzeldateigröße von 4 GiB und ist kein Ersatz für ein modernes Systemdateisystem.</>,
          <>Windows bindet Volumes häufig über Laufwerksbuchstaben wie <code>C:</code> ein. Linux hängt Dateisysteme an Mountpoints in einen gemeinsamen Verzeichnisbaum ein, zum Beispiel <code>/</code> für das Root-Dateisystem. Laufwerksbuchstabe und Mountpoint sind Einbindungsorte, nicht das Dateisystem selbst.</>,
        ],
        activity: <PracticeExercise exercise={clientInstallationExerciseDefinitions.filesystemMatching} />,
      },
      {
        title: "Die EFI-Systempartition",
        paragraphs: [
          <>Die <strong>EFI System Partition (ESP)</strong> enthält Startdateien, die UEFI laden kann, und verwendet typischerweise FAT32. Mehrere Betriebssysteme oder Bootmanager können dort Einträge ablegen.</>,
          <>Sie ist klein und enthält normalerweise keine gewöhnlichen Nutzdaten. Trotzdem ist sie startkritisch: Wird sie unbedacht gelöscht oder beschädigt, kann das Betriebssystem nicht mehr booten, obwohl seine große Systempartition noch vollständig vorhanden ist.</>,
        ],
      },
    ],
    visual: <ResponsiveTable caption="Dateisysteme und typische Rollen" headers={["Dateisystem", "Typischer Kontext", "Wichtige Einordnung"]} rows={[
      ["NTFS", "Windows-System- und Datenvolumes", "Windows-Berechtigungen und große Dateien; nicht die ESP"],
      ["FAT32", "EFI-Systempartition, kompatible Austauschmedien", "breit lesbar, aber 4-GiB-Einzeldateigrenze"],
      ["ext4", "Linux-System- und Datenbereiche", "verbreitet für Linux, nicht nativ das Windows-Systemdateisystem"],
    ]} />,
    scenario: {
      title: "Betriebssystempartition vorhanden, Client startet nicht",
      situation: <p>Nach einer manuellen Aufräumaktion ist die große NTFS-Partition noch sichtbar. Die kleine FAT32-Partition am Anfang der GPT-SSD wurde jedoch gelöscht.</p>,
      tasks: ["Welche Partition fehlt wahrscheinlich?", "Warum genügt die vorhandene NTFS-Partition nicht?", "Was wäre die richtige Prävention?"],
      solution: <p>Wahrscheinlich fehlt die EFI-Systempartition mit den UEFI-Startdateien. Die Betriebssystemdateien auf NTFS sind ohne den erwarteten Bootpfad nicht automatisch startbar. Partitionen werden vor Änderungen anhand von Typ, Funktion und dokumentiertem Layout identifiziert; startkritische Bereiche werden nicht „nach Größe“ gelöscht.</p>,
    },
    takeaway: ["Partitionieren und Formatieren sind verschiedene Schritte.", "Dateisysteme werden nach Zweck und Betriebssystemkontext gewählt.", "Die kleine EFI-Systempartition ist für den UEFI-Start kritisch."],
  },
  "betriebssystem-installieren": {
    objectives: ["eine Clientinstallation sicher vorbereiten", "Installationsmedium, Bootmodus und Ziel eindeutig prüfen", "gemeinsame Windows- und Linux-Installationsphasen anwenden", "riskante Datenträgerentscheidungen vor dem Schreiben erkennen"],
    intro: <><p>Eine professionelle Installation beginnt nicht am „Installieren“-Button. Anforderungen, Kompatibilität, Lizenzen, Daten- und Wiederherstellungsschutz, Netzversorgung und ein verifiziertes Installationsmedium werden vorher geklärt.</p></>,
    sections: [
      {
        title: "Vorbereitung schützt Daten und Zeit",
        paragraphs: [
          <>Dokumentiere Zielgerät, Betriebssystem und Edition beziehungsweise Distribution, Hardwareanforderungen, Firmwaremodus und gewünschtes Datenträgerlayout. Sichere benötigte Daten und prüfe die Wiederherstellbarkeit. Beziehe Installationsabbilder nur aus vertrauenswürdiger Quelle und prüfe sie, wenn der Anbieter Prüfsummen oder Signaturen bereitstellt.</>,
          <>Der Installer wird im vorgesehenen Modus gestartet. Vor Partitionierung oder Formatierung wird der Zieldatenträger anhand mehrerer Merkmale identifiziert, etwa Modell, Kapazität und dokumentierter Bestand. Besteht Unsicherheit, wird nicht fortgefahren.</>,
        ],
      },
      {
        title: "Ein gemeinsamer Ablauf mit OS-spezifischen Details",
        paragraphs: [
          <>Windows-Installer richten im typischen UEFI/GPT-Fall notwendige Systempartitionen ein, installieren Windows auf NTFS und verwenden Windows Boot Manager. Ein Linux-Installer kann etwa ext4 für <code>/</code>, weitere Mountpoints und einen Bootloader wie GRUB konfigurieren.</>,
          <>Die Oberflächen und Einzelentscheidungen unterscheiden sich, doch der Kern bleibt gleich: vorbereiten, Installer starten, Ziel und Layout prüfen, installieren, Ersteinrichtung vornehmen, aktualisieren und validieren.</>,
        ],
        activity: <PracticeExercise exercise={clientInstallationExerciseDefinitions.installationSequence} />,
      },
    ],
    visual: <TextFlow caption="Gemeinsamer Installationsablauf" steps={["Vorbereiten + sichern", "Installer booten", "Layout + Dateisystem", "OS installieren", "Ersteinrichtung", "Treiber + Updates", "Validieren + dokumentieren"]} />,
    scenario: {
      title: "Windows und Linux für zwei Schulungsclients",
      situation: <p>Beide Clients sind UEFI-Geräte mit leeren GPT-SSDs. Einer erhält Windows, der andere Linux. Die Installationsabbilder liegen vor.</p>,
      tasks: ["Welche Vorbereitung ist für beide gleich?", "Wo unterscheiden sich typische Dateisystem- und Bootbegriffe?", "Wann gilt die Aufgabe als abgeschlossen?"],
      solution: <p>Für beide werden Anforderungen, Backupbedarf, Medium, Firmwaremodus, Ziel-SSD und Layout vorab geprüft. Windows nutzt typischerweise NTFS und Windows Boot Manager; Linux kann ext4, Mountpoint <code>/</code> und GRUB verwenden. Abgeschlossen ist die Arbeit erst nach Updates, Geräte-, Netzwerk-, Konto- und Softwareprüfung sowie dokumentierter Abnahme.</p>,
    },
    takeaway: ["Vorbereitung und Backupprüfung kommen vor Datenträgeränderungen.", "Der gemeinsame Ablauf ist wichtiger als eine einzelne Installeroberfläche.", "Installation endet mit Validierung und Dokumentation, nicht mit dem ersten Desktop."],
  },
  "treiber-und-post-installation": {
    objectives: ["Treiber als Schnittstelle zwischen Betriebssystem und Hardware erklären", "Windows- und Linux-Treiberbereitstellung einordnen", "Clientnetzwerk nach der Installation prüfen", "eine vollständige Post-Installation-Checkliste anwenden"],
    intro: <><p>Nach dem ersten Start ist der Client noch nicht automatisch einsatzbereit. Betriebssystem, Geräteunterstützung, Updates, Netzwerk, Konten und benötigte Anwendungen müssen den vereinbarten Sollzustand erfüllen.</p></>,
    sections: [
      {
        title: "Treiber und Geräteunterstützung",
        paragraphs: [
          <>Treiber vermitteln zwischen Betriebssystem und Hardware. Viele Geräte funktionieren zunächst mit generischen oder mitgelieferten Treibern; besondere Funktionen oder Fehlerkorrekturen können einen passenden Hersteller- oder Plattformtreiber erfordern.</>,
          <>Unter Windows hilft der Geräte-Manager, nicht erkannte oder problematische Geräte zu finden. Unter Linux sind viele Treiber bereits im Kernel oder in Distributionspaketen enthalten; nicht jedes Gerät benötigt deshalb ein separates Hersteller-Installationsprogramm. Quellen und Aktualität werden in beiden Fällen geprüft.</>,
        ],
      },
      {
        title: "Netzwerk und Systemzustand validieren",
        paragraphs: [
          <>Der Client erhält seine IPv4-Konfiguration automatisch per DHCP oder nach dokumentierter Vorgabe statisch. Geprüft werden Adresse und Präfix, Standardgateway und DNS-Server sowie die tatsächliche lokale, entfernte und namensbasierte Erreichbarkeit. Die Theorie dazu bleibt in den Modulen IPv4, DHCP und DNS.</>,
          <>Zur Abnahme gehören außerdem wiederholter erfolgreicher Start, erwartetes Datenträgerlayout, Geräte ohne ungeklärte Fehler, Sicherheitsupdates, vorgesehene Konten und benötigte Software. Eine Checkliste dokumentiert Soll, Ist, Ergebnis, Abweichung und Bearbeiter.</>,
        ],
        activity: <PracticeExercise exercise={clientInstallationExerciseDefinitions.postInstallationChecks} />,
      },
      {
        title: "Remote-Administration nur vorbereitet",
        paragraphs: [
          <>Falls der Auftrag Remote-Administration vorsieht, wird lediglich die Bereitschaft geprüft: Ist ein ausdrücklich benötigter, sicher konfigurierter Verwaltungsdienst vorhanden, erreichbar und autorisiert? Für Linux kann SSH ein Beispiel sein.</>,
          <>VPN, RDP-Vertiefung und der Vergleich von Fernwartungsprodukten gehören nicht zu diesem Modul. Remotezugriff wird nicht ungefragt aktiviert und nie als Ersatz für lokale Sicherheits- und Netzwerkprüfung behandelt.</>,
        ],
      },
    ],
    visual: <ResponsiveTable caption="Post-Installation-Checkliste" headers={["Bereich", "Prüfung", "Beispielnachweis"]} rows={[
      ["Start + Storage", "Boot wiederholbar, Layout wie geplant", "Datenträgerübersicht und Neustart"],
      ["Geräte + Updates", "keine ungeklärten Gerätefehler, Patchstand aktuell", "Gerätestatus und Updateverlauf"],
      ["Netzwerk", "IP/Präfix, Gateway, DNS und Funktion", "Konfiguration plus gezielte Verbindungstests"],
      ["Nutzung", "Konten, Rollen und benötigte Software", "Soll-Ist-Checkliste"],
      ["Dokumentation", "Abweichungen und Entscheidungen nachvollziehbar", "Abnahmeprotokoll ohne Geheimnisse"],
    ]} />,
    scenario: {
      title: "Netzwerkadapter ohne funktionierende Verbindung",
      situation: <p>Nach einer Windows-Installation zeigt der Geräte-Manager ein unbekanntes Netzwerkgerät. Auf einem zweiten Linux-Client ist die Schnittstelle vorhanden, aber DNS-Namen funktionieren nicht.</p>,
      tasks: ["Wie unterscheiden sich die ersten Prüfungen?", "Welche Netzwerkwerte werden kontrolliert?", "Was wird für die Abnahme dokumentiert?"],
      solution: <p>Unter Windows wird das Gerät identifiziert und ein vertrauenswürdiger passender Treiber installiert; vorherige Netztests sind ohne funktionierenden Adapter wenig aussagekräftig. Unter Linux werden Schnittstelle, Adresse/Präfix, Gateway, DNS-Server sowie IP- und Namensauflösung getrennt geprüft. Dokumentiert werden Quelle und Version nötiger Treiber, Updatezustand, Messwerte, Ergebnis und offene Abweichungen.</p>,
    },
    takeaway: ["Treiberbedarf hängt von Betriebssystem, Kernel und Gerät ab.", "Netzwerkprüfung verbindet Konfigurationswerte mit Funktionstests.", "Eine nachvollziehbare Abnahme deckt Boot, Storage, Geräte, Updates, Netzwerk, Konten und Software ab."],
  },
} as const;

const relatedLinks: Record<string, readonly { href: string; label: string }[]> = {
  "bios-uefi-und-post": [
    { href: "/lernen/arbeitsplatz-hardware", label: "Arbeitsplatz & Hardware" },
    { href: "/lernen/it-sicherheit", label: "IT-Sicherheit" },
  ],
  "gpt-mbr-und-partitionen": [
    { href: "/lernen/datenmengen-zahlensysteme-uebertragungsrechnungen", label: "Datenmengen & Speicherkapazität" },
    { href: "/lernen/storage-und-raid", label: "Storage & RAID" },
  ],
  "dateisysteme-und-formatierung": [
    { href: "/lernen/windows-grundlagen/dateisystem-laufwerke-pfade", label: "Windows: Laufwerke und Pfade" },
    { href: "/lernen/linux-grundlagen/dateisystem-pfade-verzeichnisstruktur", label: "Linux: Pfade und Verzeichnisstruktur" },
  ],
  "betriebssystem-installieren": [
    { href: "/lernen/windows-grundlagen", label: "Windows Grundlagen" },
    { href: "/lernen/linux-grundlagen", label: "Linux Grundlagen" },
  ],
  "treiber-und-post-installation": [
    { href: "/lernen/ipv4-grundlagen", label: "IPv4 Grundlagen" },
    { href: "/lernen/dhcp", label: "DHCP" },
    { href: "/lernen/dns", label: "DNS" },
    { href: "/lernen/it-sicherheit/schutzmassnahmen-und-hardening", label: "IT-Sicherheit: Hardening" },
  ],
};

export function ClientInstallationLesson({ lessonSlug }: { lessonSlug: string }) {
  const lesson = lessons[lessonSlug as keyof typeof lessons];
  if (!lesson) return null;

  return (
    <FundamentalsLesson
      lessonId={`client-installation-${lessonSlug}`}
      {...lesson}
      relatedLinks={relatedLinks[lessonSlug] ?? []}
    >
      {lesson.visual}
    </FundamentalsLesson>
  );
}
