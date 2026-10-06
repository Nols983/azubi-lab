export const learningCategories = ["Netzwerke", "Betriebssysteme", "Server & Dienste", "Troubleshooting", "Entwicklung & Planung"] as const;

export type LearningCategory = (typeof learningCategories)[number];
export type LessonStatus = "available" | "planned";

export type Lesson = {
  slug: string;
  title: string;
  description: string;
  order: number;
  status: LessonStatus;
};

export type LearningModule = {
  slug: string;
  title: string;
  description: string;
  category: LearningCategory;
  lessonCount: number;
  learningObjectives?: readonly string[];
  lessons?: readonly Lesson[];
};

const ipv4Lessons = [
  { slug: "was-ist-eine-ip-adresse", title: "Was ist eine IP-Adresse?", description: "Verstehe, warum IP-Adressen für die Kommunikation in IP-Netzwerken benötigt werden.", order: 1, status: "available" },
  { slug: "aufbau-einer-ipv4-adresse", title: "Aufbau einer IPv4-Adresse", description: "Lerne die grundlegende Schreibweise und den Aufbau einer IPv4-Adresse kennen.", order: 2, status: "available" },
  { slug: "subnetzmaske", title: "Die Subnetzmaske", description: "Erfahre, wie eine Subnetzmaske den Netz- und Hostanteil einer IPv4-Adresse kennzeichnet.", order: 3, status: "available" },
  { slug: "private-und-oeffentliche-adressen", title: "Private und öffentliche IPv4-Adressen", description: "Erkenne private RFC1918-Bereiche und unterscheide sie von global routbaren und besonderen IPv4-Adressen.", order: 4, status: "available" },
  { slug: "netzadresse-und-broadcast", title: "Netzadresse und Broadcast", description: "Bestimme in einfachen /24-Netzen Netzadresse, Broadcast-Adresse und den gewöhnlichen Hostbereich.", order: 5, status: "available" },
] as const satisfies readonly Lesson[];

const subnettingLessons = [
  { slug: "warum-subnetten-wir", title: "Warum subnetten wir?", description: "Verstehe, warum größere IPv4-Netze in kleinere, sinnvoll strukturierte Netze aufgeteilt werden.", order: 1, status: "available" },
  { slug: "praefixlaenge-und-subnetzmaske", title: "Präfixlänge und Subnetzmaske", description: "Übersetze häufige Präfixlängen in Subnetzmasken und unterscheide Netzbits von Hostbits.", order: 2, status: "available" },
  { slug: "blockgroesse-adressen-und-hosts", title: "Blockgröße, Adressen und Hosts", description: "Bestimme die Anzahl der Adressen und gewöhnlich nutzbaren Hostadressen eines Subnetzes.", order: 3, status: "available" },
  { slug: "netzbereiche-bestimmen", title: "Netzbereiche bestimmen", description: "Ermittle Netzadresse, Broadcast-Adresse und Hostbereich für unterschiedliche Präfixlängen.", order: 4, status: "available" },
  { slug: "subnetze-planen-und-pruefen", title: "Subnetze planen und prüfen", description: "Teile Adressblöcke nach Anforderungen auf und überprüfe die berechneten Bereiche.", order: 5, status: "available" },
  { slug: "subnetting-mit-filius", title: "Praxis: Subnetting mit Filius", description: "Setze eine einfache Subnetzstruktur in Filius um und untersuche die Kommunikation.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const dhcpLessons = [
  { slug: "was-ist-dhcp", title: "Was ist DHCP?", description: "Verstehe, wie DHCP Clients automatisch mit grundlegender IPv4-Netzwerkkonfiguration versorgt.", order: 1, status: "available" },
  { slug: "dhcp-ablauf-dora", title: "Der DHCP-Ablauf: DORA", description: "Lerne Discover, Offer, Request und Acknowledge als grundlegenden Ablauf der initialen Adressvergabe kennen.", order: 2, status: "available" },
  { slug: "leases-adresspool-und-optionen", title: "Leases, Adresspool und DHCP-Optionen", description: "Plane dynamische Adressbereiche und verstehe Leases, Reservierungen sowie wichtige DHCP-Optionen.", order: 3, status: "available" },
  { slug: "dhcp-relay", title: "DHCP über mehrere Subnetze und Relay", description: "Verstehe, wie DHCP-Anfragen geroutete Netzgrenzen mithilfe eines Relays überwinden.", order: 4, status: "available" },
  { slug: "dhcp-fehleranalyse", title: "DHCP-Fehleranalyse", description: "Grenze typische Fehler bei automatischer Netzwerkkonfiguration systematisch ein.", order: 5, status: "available" },
  { slug: "dhcp-mit-filius", title: "Praxis: DHCP mit Filius", description: "Konfiguriere und teste eine einfache DHCP-Umgebung in Filius.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const dnsLessons = [
  { slug: "was-ist-dns", title: "Was ist DNS?", description: "Verstehe DNS als verteiltes Namenssystem und unterscheide Namen, Adressen, Resolver und DHCP.", order: 1, status: "available" },
  { slug: "dns-aufloesung", title: "So funktioniert eine DNS-Auflösung", description: "Verfolge eine typische Anfrage über Resolver, Cache, Root-, TLD- und autoritative Server.", order: 2, status: "available" },
  { slug: "dns-records", title: "DNS-Records verstehen", description: "Unterscheide wichtige Resource Records und wähle sie für typische Administrationsaufgaben aus.", order: 3, status: "available" },
  { slug: "dns-zonen-und-delegation", title: "DNS-Zonen, autoritative Server und Delegation", description: "Lerne Zonen, Autorität und die Delegation von Namensräumen kennen.", order: 4, status: "available" },
  { slug: "dns-fehleranalyse", title: "DNS-Fehleranalyse", description: "Grenze typische Fehler der Namensauflösung systematisch ein.", order: 5, status: "available" },
  { slug: "dns-mit-filius", title: "Praxis: DNS mit Filius", description: "Erstelle und teste eine einfache DNS-Umgebung in Filius.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const webserverLessons = [
  { slug: "was-ist-ein-webserver", title: "Was ist ein Webserver?", description: "Unterscheide HTTP-Client, Serverhost, Webserver-Software und bereitgestellte Inhalte.", order: 1, status: "available" },
  { slug: "http-anfrage-und-antwort", title: "HTTP-Anfrage und HTTP-Antwort", description: "Lerne Aufbau und Zusammenspiel von HTTP-Requests und HTTP-Responses kennen.", order: 2, status: "available" },
  { slug: "urls-methoden-header-statuscodes", title: "URLs, Methoden, Header und Statuscodes", description: "Lies URLs und ordne HTTP-Methoden, Header sowie wichtige Statuscodes ein.", order: 3, status: "available" },
  { slug: "https-und-tls", title: "HTTPS und TLS-Grundlagen", description: "Verstehe Transportverschlüsselung, Zertifikate und die Grundlagen von HTTPS.", order: 4, status: "available" },
  { slug: "webserver-fehleranalyse", title: "Webserver-Fehleranalyse", description: "Grenze typische Fehler eines Webdienstes systematisch ein.", order: 5, status: "available" },
  { slug: "webserver-mit-filius", title: "Praxis: Webserver mit Filius", description: "Konfiguriere und teste ein einfaches Webserver-Szenario in Filius.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const linuxLessons = [
  { slug: "linux-kernel-distributionen-shell", title: "Linux verstehen: Kernel, Distributionen und Shell", description: "Ordne Kernel, Distribution, User Space, Shell, Terminal und Desktop richtig ein.", order: 1, status: "available" },
  { slug: "terminal-und-befehle", title: "Terminal und grundlegende Befehle", description: "Orientiere dich sicher in einer Kommandozeilensitzung und nutze grundlegende Befehle.", order: 2, status: "available" },
  { slug: "dateisystem-pfade-verzeichnisstruktur", title: "Dateisystem, Pfade und Verzeichnisstruktur", description: "Verstehe den Linux-Verzeichnisbaum, Pfadarten und wichtige Systemverzeichnisse.", order: 3, status: "available" },
  { slug: "dateien-und-verzeichnisse", title: "Dateien und Verzeichnisse verwalten", description: "Erstelle, untersuche, kopiere, verschiebe und entferne Dateien und Verzeichnisse sicher.", order: 4, status: "available" },
  { slug: "benutzer-gruppen-berechtigungen", title: "Benutzer, Gruppen und Berechtigungen", description: "Lerne Eigentümerschaft, Gruppen und grundlegende Linux-Berechtigungen kennen.", order: 5, status: "available" },
  { slug: "prozesse-dienste-paketverwaltung", title: "Prozesse, Dienste und Paketverwaltung", description: "Untersuche Prozesse und verstehe Dienste, Repositories und Paketverwaltung konzeptionell.", order: 6, status: "available" },
  { slug: "linux-system-untersuchen", title: "Praxis: Linux-System untersuchen", description: "Untersuche und dokumentiere einen Linux-Systemzustand mit sicheren Diagnosebefehlen.", order: 7, status: "available" },
] as const satisfies readonly Lesson[];

const windowsLessons = [
  { slug: "windows-verstehen", title: "Windows verstehen: Editionen, Architektur und Oberfläche", description: "Ordne Betriebssystem, Editionen, Systemschichten, Benutzeroberfläche und Rechteerhöhung richtig ein.", order: 1, status: "available" },
  { slug: "cmd-powershell-terminal", title: "CMD, PowerShell und Windows Terminal", description: "Unterscheide Terminalhost und Shells und untersuche Windows mit sicheren Befehlen.", order: 2, status: "available" },
  { slug: "dateisystem-laufwerke-pfade", title: "Dateisystem, Laufwerke und Pfade", description: "Verstehe Laufwerksbuchstaben, lokale und relative Pfade, Benutzerverzeichnisse und UNC-Pfade.", order: 3, status: "available" },
  { slug: "benutzer-gruppen-ntfs", title: "Benutzer, Gruppen und NTFS-Berechtigungen", description: "Lerne lokale Identitäten, Gruppen, Rechte, Vererbung und effektiven Zugriff kennen.", order: 4, status: "available" },
  { slug: "prozesse-dienste-software-updates", title: "Prozesse, Dienste, Software und Updates", description: "Ordne Prozesse, Dienste, Softwareinstallation und Windows Update konzeptionell ein.", order: 5, status: "available" },
  { slug: "windows-system-untersuchen", title: "Praxis: Windows-System untersuchen", description: "Führe eine strukturierte, nur lesende Bestandsaufnahme eines Windows-Systems durch.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const activeDirectoryLessons = [
  { slug: "was-ist-active-directory", title: "Was ist Active Directory?", description: "Verstehe AD DS als zentralen Verzeichnisdienst und unterscheide lokale von domänenweiten Identitäten.", order: 1, status: "available" },
  { slug: "domaenen-forests-und-ous", title: "Domänen, Gesamtstrukturen und Organisationseinheiten", description: "Ordne Forest, Domäne, Organisationseinheit und Verzeichnisobjekte in die logische AD-Struktur ein.", order: 2, status: "available" },
  { slug: "benutzer-computer-gruppen", title: "Benutzer, Computer und Gruppen", description: "Verstehe Sicherheitsprinzipale, SIDs und eine wartbare gruppenbasierte Berechtigungsvergabe.", order: 3, status: "available" },
  { slug: "domaenencontroller-dns-replikation", title: "Domänencontroller, DNS und Replikation", description: "Lerne das Zusammenspiel von Domain Controllern, DNS, Dienstsuche und Replikation kennen.", order: 4, status: "available" },
  { slug: "gruppenrichtlinien", title: "Gruppenrichtlinien und zentrale Verwaltung", description: "Verstehe Grundlagen von Gruppenrichtlinien und zentraler Konfigurationsverwaltung.", order: 5, status: "available" },
  { slug: "active-directory-fehleranalyse", title: "Active-Directory-Fehleranalyse", description: "Grenze grundlegende Anmelde-, DNS- und Erreichbarkeitsprobleme systematisch ein.", order: 6, status: "available" },
  { slug: "active-directory-praxis", title: "Praxis: Active Directory planen und untersuchen", description: "Plane und dokumentiere eine einfache Active-Directory-Struktur und untersuche sie sicher.", order: 7, status: "available" },
] as const satisfies readonly Lesson[];

const networkTroubleshootingLessons = [
  { slug: "troubleshooting-methode", title: "Systematisch statt raten: Die Troubleshooting-Methode", description: "Definiere Fehlerbilder präzise, sammle Evidenz und prüfe testbare Hypothesen kontrolliert.", order: 1, status: "available" },
  { slug: "client-ip-lokales-netz", title: "Schicht für Schicht: Client, IP und lokales Netzwerk", description: "Untersuche Link, Schnittstelle, IPv4-Konfiguration, Subnetz und lokale Nachbarschaft.", order: 2, status: "available" },
  { slug: "gateway-routing-erreichbarkeit", title: "Gateway, Routing und Erreichbarkeit", description: "Verstehe Gateway- und Routenentscheidungen und grenze lokale von entfernten Pfadproblemen ab.", order: 3, status: "available" },
  { slug: "dhcp-dns-fehleranalyse", title: "DHCP- und DNS-Fehler eingrenzen", description: "Unterscheide automatische Adresskonfiguration von Namensauflösung und ihren Fehlersymptomen.", order: 4, status: "available" },
  { slug: "ports-dienste-fehlersymptome", title: "Ports, Dienste und typische Fehlersymptome", description: "Ordne TCP-/UDP-Endpunkte, Timeouts, Ablehnungen und Anwendungsantworten diagnostisch ein.", order: 5, status: "available" },
  { slug: "netzwerkfehler-praxis", title: "Praxis: Netzwerkfehler vollständig analysieren", description: "Führe einen vollständigen, dokumentierten Diagnoseablauf an einem fiktiven Netzwerkvorfall durch.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const osiTcpIpLessons = [
  { slug: "warum-schichtenmodelle", title: "Warum Schichtenmodelle?", description: "Verstehe, wie Schichten komplexe Kommunikation strukturieren und die Fehlersuche unterstützen.", order: 1, status: "available" },
  { slug: "die-sieben-osi-schichten", title: "Die sieben OSI-Schichten", description: "Ordne Aufgaben, Protokolle und Protokolldateneinheiten den sieben OSI-Schichten zu.", order: 2, status: "available" },
  { slug: "osi-schichten-1-bis-3", title: "OSI-Schichten 1–3", description: "Unterscheide Übertragungsmedium, Ethernet-/WLAN-Kommunikation und IP-Routing.", order: 3, status: "available" },
  { slug: "osi-schichten-4-bis-7", title: "OSI-Schichten 4–7", description: "Verstehe Transport-, Sitzungs-, Darstellungs- und Anwendungsaufgaben mit realen Beispielen.", order: 4, status: "available" },
  { slug: "tcp-ip-modell", title: "Das TCP/IP-Modell", description: "Lerne das praxisnahe TCP/IP-Modell und seine vier Schichten kennen.", order: 5, status: "available" },
  { slug: "osi-und-tcp-ip-vergleichen", title: "OSI und TCP/IP vergleichen", description: "Ordne beide Modelle ein, ohne reale Protokolle in unpassende Schubladen zu zwingen.", order: 6, status: "available" },
  { slug: "kapselung-und-datenfluss", title: "Kapselung und Datenfluss", description: "Verfolge Nutzdaten vom Browser über Segmente, Pakete und Frames bis zum Signal und zurück.", order: 7, status: "available" },
  { slug: "fehlersuche-mit-schichtenmodell", title: "Fehlersuche mit dem Schichtenmodell", description: "Grenze Netzwerkfehler systematisch nach beobachtbaren Schichten und Abhängigkeiten ein.", order: 8, status: "available" },
] as const satisfies readonly Lesson[];

const networkDeviceLessons = [
  { slug: "warum-netzwerke-gekoppelt-werden", title: "Warum Netzwerke gekoppelt werden", description: "Ordne Koppelelemente nach Zweck, Reichweite, Segmentierung und Weiterleitungsentscheidung ein.", order: 1, status: "available" },
  { slug: "repeater-und-hub", title: "Repeater und Hub", description: "Verstehe Signalregeneration, gemeinsam genutzte Medien und die historische Rolle von Hubs.", order: 2, status: "available" },
  { slug: "bridge-und-switch", title: "Bridge und Switch", description: "Unterscheide klassische Bridges und moderne Multiport-Switches auf Layer 2.", order: 3, status: "available" },
  { slug: "wie-ein-switch-lernt", title: "Wie ein Switch lernt", description: "Verfolge MAC-Lernen, gezielte Weiterleitung, Flooding und Alterung der MAC-Tabelle.", order: 4, status: "available" },
  { slug: "router", title: "Router", description: "Verstehe Layer-3-Weiterleitung, Routingtabellen und die Trennung von Broadcast-Domänen.", order: 5, status: "available" },
  { slug: "gateway", title: "Gateway", description: "Unterscheide Default Gateway, Routerfunktion und Protokoll-Gateways anhand praktischer Fälle.", order: 6, status: "available" },
  { slug: "access-point-modem-medienkonverter", title: "Access Point, Modem und Medienkonverter", description: "Ordne drahtlose Anbindung, Zugangsübertragung und Medienumsetzung korrekt ein.", order: 7, status: "available" },
  { slug: "collision-und-broadcast-domains", title: "Collision- und Broadcast-Domains", description: "Bestimme, welche Geräte Kollisions- und Broadcast-Bereiche trennen oder erweitern.", order: 8, status: "available" },
  { slug: "welches-geraet-fuer-welchen-zweck", title: "Welches Gerät für welchen Zweck?", description: "Wähle Koppelelemente für realistische LAN-, WLAN-, WAN- und Medien-Szenarien aus.", order: 9, status: "available" },
] as const satisfies readonly Lesson[];

const networkTopologyLessons = [
  { slug: "was-ist-eine-netzwerktopologie", title: "Was ist eine Netzwerktopologie?", description: "Unterscheide Struktur, Verkehrsfluss sowie physische und logische Sicht auf ein Netzwerk.", order: 1, status: "available" },
  { slug: "punkt-zu-punkt-und-bus", title: "Punkt-zu-Punkt und Bus", description: "Vergleiche direkte Verbindungen mit einem gemeinsam genutzten linearen Medium.", order: 2, status: "available" },
  { slug: "ring", title: "Ring", description: "Verstehe Ringstrukturen, gerichtete Verkehrswege und mögliche Redundanzmechanismen.", order: 3, status: "available" },
  { slug: "stern", title: "Stern", description: "Analysiere die typische LAN-Sterntopologie und ihre unterschiedlichen Ausfallfolgen.", order: 4, status: "available" },
  { slug: "baum", title: "Baum", description: "Ordne hierarchische Sternstrukturen in Gebäuden und Campusnetzen ein.", order: 5, status: "available" },
  { slug: "vermaschte-netze", title: "Vermaschte Netze", description: "Unterscheide vollständige und teilweise Vermaschung sowie Nutzen und Kosten redundanter Pfade.", order: 6, status: "available" },
  { slug: "hybridtopologien", title: "Hybridtopologien", description: "Erkenne, wie reale Netze mehrere Grundtopologien zu einem passenden Entwurf kombinieren.", order: 7, status: "available" },
  { slug: "physische-und-logische-topologie", title: "Physische und logische Topologie", description: "Trenne Verkabelung und Funkzellen vom tatsächlichen logischen Kommunikationsweg.", order: 8, status: "available" },
  { slug: "topologien-praktisch-auswaehlen", title: "Topologien praktisch auswählen", description: "Bewerte Topologien nach Verfügbarkeit, Kosten, Erweiterbarkeit und Betriebsanforderungen.", order: 9, status: "available" },
] as const satisfies readonly Lesson[];

const backupLessons = [
  { slug: "backup-grundlagen-und-schutzziele", title: "Backup-Grundlagen und Schutzziele", description: "Unterscheide Backup, Verfügbarkeit, Archivierung und Synchronisation anhand konkreter Risiken.", order: 1, status: "available" },
  { slug: "voll-inkrementell-differentiell", title: "Voll, inkrementell und differentiell", description: "Vergleiche Datenmenge, Laufzeit und Abhängigkeiten der drei grundlegenden Backup-Arten.", order: 2, status: "available" },
  { slug: "restore-ketten-praktisch-planen", title: "Restore-Ketten praktisch planen", description: "Bestimme mit einer Wochenzeitleiste genau die für einen Restore benötigten Sicherungen.", order: 3, status: "available" },
  { slug: "datei-image-und-snapshot", title: "Datei-Backup, Image und Snapshot", description: "Wähle die passende Sicherungsebene und erkenne, warum ein Snapshot allein kein Backup ist.", order: 4, status: "available" },
  { slug: "backup-strategien-321", title: "3-2-1 und 3-2-1-1-0", description: "Plane getrennte, externe, offline oder unveränderbare Kopien mit geprüfter Integrität.", order: 5, status: "available" },
  { slug: "aufbewahrung-rotation-und-gfs", title: "Aufbewahrung, Rotation und GFS", description: "Verstehe Retention, Versionierung und Grandfather-Father-Son als mögliche Rotationsstrategie.", order: 6, status: "available" },
  { slug: "rpo-und-rto", title: "RPO und RTO", description: "Übersetze akzeptablen Datenverlust und Wiederanlaufzeit in messbare Anforderungen.", order: 7, status: "available" },
  { slug: "backup-sicherheit-und-restore-tests", title: "Backup-Sicherheit und Restore-Tests", description: "Schütze Sicherungen vor Ransomware, Fehlberechtigungen und unbemerkter Unbrauchbarkeit.", order: 8, status: "available" },
  { slug: "backup-praxis", title: "Praxis: Backup-Konzept planen", description: "Entwirf und begründe ein prüfbares Backup-Konzept für ein kleines Unternehmen.", order: 9, status: "available" },
] as const satisfies readonly Lesson[];

const hardwareLessons = [
  { slug: "cpu-und-von-neumann", title: "CPU und Von-Neumann-Modell", description: "Ordne CPU, ALU, Speicher und Ein-/Ausgabe ein und bewerte Kerne, Threads und Takt vorsichtig.", order: 1, status: "available" },
  { slug: "ram-mainboard-und-netzteil", title: "RAM, Mainboard und Netzteil", description: "Verstehe Arbeitsspeicher, Plattformkompatibilität und eine sichere, bedarfsgerechte Stromversorgung.", order: 2, status: "available" },
  { slug: "gpu-speicher-und-schnittstellen", title: "GPU, Massenspeicher und Schnittstellen", description: "Vergleiche Grafiklösungen, HDD, SATA-SSD und NVMe-SSD und trenne Formfaktoren von Protokollen.", order: 3, status: "available" },
  { slug: "peripherie-und-clienttypen", title: "Peripherie und Clienttypen", description: "Wähle Desktop, Notebook, Tablet, Thin oder Fat Client samt passender Peripherie aus.", order: 4, status: "available" },
  { slug: "arbeitsplatz-auswaehlen", title: "Arbeitsplätze bedarfsgerecht auswählen", description: "Bewerte Kosten, Leistung, Wartbarkeit, Energie, Ergonomie und Barrierefreiheit in einer Beschaffung.", order: 5, status: "available" },
  { slug: "leistung-energie-und-kapazitaet", title: "Leistung, Energie und Kapazität berechnen", description: "Rechne mit P = U × I, E = P × t sowie Speichergrößen und Übertragungsraten.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const dataCalculationLessons = [
  { slug: "bit-byte-und-einheiten", title: "Bit, Byte & Einheiten", description: "Unterscheide bit und Byte, SI- und IEC-Einheiten sowie Datenmenge und Datenrate.", order: 1, status: "available" },
  { slug: "si-iec-und-speicherkapazitaet", title: "SI, IEC & Speicherkapazität", description: "Rechne dezimale und binäre Dateneinheiten systematisch um und erkläre Kapazitätsanzeigen.", order: 2, status: "available" },
  { slug: "datenmenge-datenrate-und-uebertragungszeit", title: "Datenmenge, Datenrate & Übertragungszeit", description: "Berechne Menge, Rate und Zeit mit eindeutigen Einheiten und realistischen Annahmen.", order: 3, status: "available" },
  { slug: "binaer-dezimal-und-hexadezimal", title: "Binär, Dezimal & Hexadezimal", description: "Verstehe Stellenwerte und wandle grundlegende Zahlen zwischen Basis 2, 10 und 16 um.", order: 4, status: "available" },
  { slug: "bild-audio-und-kompression", title: "Bild, Audio & Kompression", description: "Schätze unkomprimierte Bild- und Audiogrößen ab und ordne Kompressionsarten ein.", order: 5, status: "available" },
  { slug: "ascii-unicode-utf-8-und-praxisfall", title: "ASCII, Unicode, UTF-8 & Praxisfall", description: "Trenne Zeichen und Bytes und verbinde die Modulkenntnisse in einer Rollout-Planung.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const clientInstallationLessons = [
  { slug: "bios-uefi-und-post", title: "BIOS, UEFI & POST", description: "Ordne Firmware, POST, Bootreihenfolge und bootfähige Installationsmedien im Systemstart ein.", order: 1, status: "available" },
  { slug: "bootvorgang-und-secure-boot", title: "Bootvorgang & Secure Boot", description: "Verfolge den Start vom Einschalten bis zur Anmeldung und unterscheide Firmware, Bootmanager, Bootloader und Secure Boot.", order: 2, status: "available" },
  { slug: "gpt-mbr-und-partitionen", title: "GPT, MBR & Partitionen", description: "Unterscheide Datenträger, Partitionstabellen, Partitionen und Volumes und wähle GPT oder MBR begründet aus.", order: 3, status: "available" },
  { slug: "dateisysteme-und-formatierung", title: "Dateisysteme & Formatierung", description: "Trenne Partitionierung von Formatierung und ordne NTFS, FAT32, ext4, Laufwerksbuchstaben, Mountpoints und die EFI-Systempartition ein.", order: 4, status: "available" },
  { slug: "betriebssystem-installieren", title: "Betriebssystem installieren", description: "Plane eine sichere, gemeinsame Clientinstallation und übertrage den Ablauf auf Windows- und Linux-Installer.", order: 5, status: "available" },
  { slug: "treiber-und-post-installation", title: "Treiber & Post-Installation", description: "Prüfe Geräte, Updates, Netzwerk, Konten und Software nach der Installation und dokumentiere den erreichten Zustand.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const storageRaidLessons = [
  { slug: "raid-grundlagen", title: "RAID-Grundlagen", description: "Verstehe Striping, Mirroring, Parität, Controller und die Grenzen von RAID.", order: 1, status: "available" },
  { slug: "raid-0-und-raid-1", title: "RAID 0 und RAID 1", description: "Vergleiche maximale Kapazität mit Spiegelung und erkenne die unterschiedlichen Ausfallfolgen.", order: 2, status: "available" },
  { slug: "raid-5-und-raid-6", title: "RAID 5 und RAID 6", description: "Berechne verteilte Parität und ordne Ein- beziehungsweise Zwei-Platten-Fehlertoleranz ein.", order: 3, status: "available" },
  { slug: "raid-10-rebuild-und-hot-spare", title: "RAID 10, Rebuild und Hot Spare", description: "Bewerte Spiegelpaare, degradierten Betrieb, Rebuild-Risiken und Hot Spares.", order: 4, status: "available" },
  { slug: "raid-kapazitaeten-berechnen", title: "RAID-Kapazitäten berechnen", description: "Wende Kapazitätsformeln auf gleich große und gemischte Laufwerke an.", order: 5, status: "available" },
  { slug: "raid-oder-backup-praxis", title: "RAID auswählen – Backup einplanen", description: "Triff begründete Storage-Entscheidungen und halte RAID und Backup klar getrennt.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const securityLessons = [
  { slug: "begriffe-und-schutzziele", title: "Sicherheitsbegriffe und Schutzziele", description: "Unterscheide Informationssicherheit, IT-Sicherheit, Datenschutz und Datensicherung.", order: 1, status: "available" },
  { slug: "schadsoftware-erkennen", title: "Schadsoftware erkennen und reagieren", description: "Ordne Viren, Würmer, Trojaner, Ransomware, Spyware, Keylogger, Rootkits und Botnetze ein.", order: 2, status: "available" },
  { slug: "angriffe-und-social-engineering", title: "Angriffe und Social Engineering", description: "Erkenne Phishing, Spoofing, Sniffing, MITM, DoS/DDoS, Exploits und Zero-Days.", order: 3, status: "available" },
  { slug: "schutzmassnahmen-und-hardening", title: "Schutzmaßnahmen und Hardening", description: "Reduziere Angriffsflächen mit Patches, Least Privilege, MFA, Segmentierung und sicheren Diensten.", order: 4, status: "available" },
  { slug: "kryptografie-und-hashing", title: "Kryptografie und Hashing", description: "Unterscheide symmetrische und asymmetrische Verschlüsselung, Hashes und Signaturen.", order: 5, status: "available" },
  { slug: "zertifikate-tls-und-sichere-administration", title: "Zertifikate, TLS und sichere Administration", description: "Ordne CAs, Zertifikate, HTTPS, SSH und sichere Administrationswege korrekt ein.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const privacyLessons = [
  { slug: "personenbezogene-daten-und-rechtsrahmen", title: "Personenbezogene Daten und Rechtsrahmen", description: "Erkenne personenbezogene und besonders schützenswerte Daten und ordne DSGVO und BDSG ein.", order: 1, status: "available" },
  { slug: "datenschutzgrundsaetze", title: "Datenschutzgrundsätze", description: "Wende Rechtmäßigkeit, Zweckbindung, Datenminimierung, Richtigkeit und Speicherbegrenzung an.", order: 2, status: "available" },
  { slug: "betroffenenrechte", title: "Betroffenenrechte", description: "Ordne Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Übertragbarkeit ein.", order: 3, status: "available" },
  { slug: "anonymisierung-und-pseudonymisierung", title: "Anonymisierung und Pseudonymisierung", description: "Unterscheide dauerhaft nicht zuordenbare Daten von weiterhin re-identifizierbaren Pseudonymen.", order: 4, status: "available" },
  { slug: "datenschutz-und-datensicherheit", title: "Datenschutz und Datensicherheit", description: "Trenne den Schutz von Menschen vom technischen und organisatorischen Schutz von Informationen.", order: 5, status: "available" },
  { slug: "datenschutzfaelle-praxis", title: "Datenschutzfälle in der Praxis", description: "Analysiere Fehlversand, Gerätediebstahl, Altzugänge und überlange Aufbewahrung strukturiert.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const programmingLessons = [
  { slug: "algorithmen-und-pseudocode", title: "Algorithmen und Pseudocode lesen", description: "Lies eindeutige Schrittfolgen, Zuweisungen und Ausgaben und führe einen Schreibtischtest durch.", order: 1, status: "available" },
  { slug: "variablen-datentypen-und-operatoren", title: "Variablen, Datentypen und Operatoren", description: "Ordne Werte, Datentypen, Zuweisungen, Vergleiche und boolesche Verknüpfungen ein.", order: 2, status: "available" },
  { slug: "bedingungen-und-verzweigungen", title: "Bedingungen und Verzweigungen", description: "Verfolge if/else- und switch-Entscheidungen und erkenne logische Fehler.", order: 3, status: "available" },
  { slug: "schleifen-und-schreibtischtest", title: "Schleifen und Schreibtischtest", description: "Berechne Iterationen und Ausgaben von for-, while- und do-while-Abläufen.", order: 4, status: "available" },
  { slug: "funktionen-und-listen", title: "Funktionen, Parameter und Listen", description: "Verstehe Parameter, Rückgabewerte sowie einfache Arrays und Listen.", order: 5, status: "available" },
  { slug: "oop-grundlagen-und-fehlersuche", title: "OOP-Grundlagen und Fehlersuche", description: "Unterscheide Klasse und Objekt, Attribute und Methoden und finde einfache Pseudocodefehler.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const modelingLessons = [
  { slug: "uml-und-modelle-einordnen", title: "UML und Modelle einordnen", description: "Verstehe Modelle als zweckgebundene, vereinfachte Sichten auf Systeme.", order: 1, status: "available" },
  { slug: "use-case-diagramme", title: "Use-Case-Diagramme lesen", description: "Ordne Akteure, Anwendungsfälle und Systemgrenzen in einfachen Szenarien ein.", order: 2, status: "available" },
  { slug: "klassendiagramme", title: "Klassendiagramme verstehen", description: "Lies Klassen, Attribute, Methoden, Sichtbarkeit und einfache Beziehungen.", order: 3, status: "available" },
  { slug: "aktivitaetsdiagramme", title: "Aktivitätsdiagramme verfolgen", description: "Verfolge Start, Aktionen, Entscheidungen, Zweige und Ende eines Ablaufs.", order: 4, status: "available" },
  { slug: "er-modell-und-kardinalitaeten", title: "ER-Modell und Kardinalitäten", description: "Bestimme Entitäten, Attribute, Beziehungen und einfache Kardinalitäten.", order: 5, status: "available" },
  { slug: "relationale-tabellen-und-schluessel", title: "Relationale Tabellen und Schlüssel", description: "Überführe ein einfaches Modell in Tabellen und erkenne Primärschlüssel und Redundanz.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const projectManagementLessons = [
  { slug: "projektmerkmale-und-smart-ziele", title: "Projektmerkmale und SMART-Ziele", description: "Unterscheide Projekt und Routine und formuliere überprüfbare Ziele.", order: 1, status: "available" },
  { slug: "magisches-dreieck-und-stakeholder", title: "Magisches Dreieck und Stakeholder", description: "Bewerte Zielkonflikte zwischen Zeit, Kosten und Leistung beziehungsweise Qualität.", order: 2, status: "available" },
  { slug: "phasen-arbeitspakete-und-anforderungen", title: "Phasen, Arbeitspakete und Anforderungen", description: "Ordne Projektphasen, PSP, Meilensteine, Lastenheft und Pflichtenheft ein.", order: 3, status: "available" },
  { slug: "gantt-und-projektcontrolling", title: "Gantt und Projektcontrolling", description: "Lies Termine, Abhängigkeiten und Meilensteine und führe Soll-Ist-Vergleiche durch.", order: 4, status: "available" },
  { slug: "netzplan-und-kritischer-pfad", title: "Netzplan und kritischer Pfad", description: "Berechne früheste und späteste Zeiten, Gesamtpuffer und kritischen Pfad.", order: 5, status: "available" },
  { slug: "wasserfall-scrum-und-kanban", title: "Wasserfall, Scrum und Kanban", description: "Wähle Vorgehensweisen anhand des Projektkontexts statt nach einem Universalrezept.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const economicsLessons = [
  { slug: "kosten-erloes-und-wirtschaftlichkeit", title: "Kosten, Erlös und Wirtschaftlichkeit", description: "Unterscheide fixe und variable Kosten und berechne Gewinn, Deckungsbeitrag und Rentabilität grundlegend.", order: 1, status: "available" },
  { slug: "rabatt-skonto-netto-und-brutto", title: "Rabatt, Skonto, Netto und Brutto", description: "Wende Preisnachlässe und Umsatzsteuer in eindeutiger Reihenfolge mit klarer Rundung an.", order: 2, status: "available" },
  { slug: "tco-und-amortisation", title: "TCO und Amortisation", description: "Vergleiche Anschaffung und laufende Kosten und ermittle eine einfache Amortisationsdauer.", order: 3, status: "available" },
  { slug: "beschaffung-und-angebotsvergleich", title: "Beschaffung und Angebotsvergleich", description: "Bewerte Angebote mit Muss-/Kann-Kriterien, Kosten, Service, Nachhaltigkeit und Zugänglichkeit.", order: 4, status: "available" },
  { slug: "nutzwertanalyse", title: "Nutzwertanalyse", description: "Berechne gewichtete Bewertungen und ordne ihre Annahmen und Grenzen ein.", order: 5, status: "available" },
  { slug: "kauf-miete-leasing-und-make-or-buy", title: "Kauf, Miete, Leasing und Make-or-Buy", description: "Vergleiche Beschaffungs- und Bezugsmodelle anhand von Bedarf, Risiko und Lebenszyklus.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const softwareLicensingLessons = [
  { slug: "softwarearten-und-geschaeftsanwendungen", title: "Softwarearten und Geschäftsanwendungen", description: "Unterscheide System-, Anwendungs-, Standard-, Individual- und Branchensoftware sowie ERP, CRM, CMS und DMS nach ihrem Zweck.", order: 1, status: "available" },
  { slug: "software-auswaehlen", title: "Software anhand von Anforderungen auswählen", description: "Bewerte funktionale Passung, Kompatibilität, Integration, Betrieb, Sicherheit, Datenschutz und Lebenszyklus.", order: 2, status: "available" },
  { slug: "open-source-und-proprietaer", title: "Open Source und proprietäre Software", description: "Ordne Quelloffenheit, Urheberrecht, Lizenzbedingungen, Kosten und Support ohne pauschale Wertung ein.", order: 3, status: "available" },
  { slug: "lizenzmodelle-und-nutzungsrechte", title: "Lizenzmodelle und Nutzungsrechte", description: "Unterscheide Nutzungsrecht, EULA, OEM-, Nutzer-, Geräte-, Abonnement- und dauerhafte Lizenzmodelle.", order: 4, status: "available" },
  { slug: "lizenzszenarien-pruefen", title: "Lizenzszenarien praktisch prüfen", description: "Wähle passende Lizenzmodelle, erkenne Fehlzuordnungen und trenne Eigentum am Datenträger vom Nutzungsrecht.", order: 5, status: "available" },
  { slug: "ki-gestuetzte-software", title: "KI-gestützte Software verantwortungsvoll nutzen", description: "Ordne generative und nicht-generative Funktionen ein und berücksichtige Prüfung, Datenschutz, Geheimhaltung und Rechte.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const virtualizationCloudLessons = [
  { slug: "virtualisierung-host-gast-hypervisor", title: "Virtualisierung: Host, Gast und Hypervisor", description: "Unterscheide physische Systeme, virtuelle Maschinen sowie Typ-1- und Typ-2-Hypervisoren.", order: 1, status: "available" },
  { slug: "vm-ressourcen-und-betriebsgrenzen", title: "VM-Ressourcen und Betriebsgrenzen", description: "Ordne vCPU, virtuellen RAM, Datenträger, Netzwerkkarten und Ressourcenverteilung realistisch ein.", order: 2, status: "available" },
  { slug: "vm-und-container-unterscheiden", title: "Virtuelle Maschinen und Container unterscheiden", description: "Vergleiche Gastbetriebssystem, gemeinsamen Kernel, Isolation, Startverhalten und Ressourcenbedarf.", order: 3, status: "available" },
  { slug: "container-grundlagen", title: "Container-Grundlagen", description: "Verstehe Image, Container, Registry, Ports, Konfiguration und persistente Daten herstellerneutral.", order: 4, status: "available" },
  { slug: "cloud-service-und-bereitstellungsmodelle", title: "Cloud-Service- und Bereitstellungsmodelle", description: "Unterscheide IaaS, PaaS, SaaS sowie Public, Private und Hybrid Cloud.", order: 5, status: "available" },
  { slug: "cloud-entscheidung-und-verantwortung", title: "Cloud-Entscheidung und geteilte Verantwortung", description: "Bewerte Skalierbarkeit, Elastizität, Verfügbarkeit, Kosten, Abhängigkeit, Sicherheit und Datenschutz.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const customerContractLessons = [
  { slug: "kundenbedarf-und-anforderungen", title: "Kundenbedarf und Anforderungen ermitteln", description: "Nutze offene, geschlossene und klärende Fragen und unterscheide funktionale von nicht-funktionalen Anforderungen.", order: 1, status: "available" },
  { slug: "anforderungen-priorisieren", title: "Anforderungen priorisieren und Lösungen trennen", description: "Ordne Muss-, Soll- und Kann-Anforderungen ein und trenne Bedarf, Anforderung und vorgeschlagene Umsetzung.", order: 2, status: "available" },
  { slug: "kundenkommunikation-und-fachinformationen", title: "Kundenkommunikation und Fachinformationen", description: "Erkläre Technik zielgruppengerecht, sichere Verständnis ab und entnimm technischen Beschreibungen relevante Fakten.", order: 3, status: "available" },
  { slug: "angebot-und-vertragsgrundlagen", title: "Angebot und Vertragsgrundlagen", description: "Ordne Angebot, Annahme, Kauf, Miete, Leasing, Lizenzierung und Servicevereinbarungen grundlegend ein.", order: 4, status: "available" },
  { slug: "dienstvertrag-werkvertrag-und-maengel", title: "Dienstvertrag, Werkvertrag und Mängel", description: "Unterscheide versprochene Tätigkeit und geschuldeten Erfolg sowie Mängelrechte, Garantie und Abnahme konzeptionell.", order: 5, status: "available" },
  { slug: "sla-support-und-kundeneinweisung", title: "SLA, Support und Kundeneinweisung", description: "Interpretiere Servicezeiten, Reaktionsziele, Eskalation und führe eine sichere, dokumentierte Einweisung durch.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

const qualityHandoverLessons = [
  { slug: "qualitaet-qa-qm-und-pdca", title: "Qualität, QA, QM und PDCA", description: "Beziehe Qualität auf Anforderungen, unterscheide Qualitätssicherung und Qualitätsmanagement und wende PDCA an.", order: 1, status: "available" },
  { slug: "testfaelle-und-soll-ist", title: "Testfälle und Soll-Ist-Vergleich", description: "Formuliere Vorbedingungen, Schritte und erwartete Ergebnisse und dokumentiere tatsächliche Ergebnisse nachvollziehbar.", order: 2, status: "available" },
  { slug: "testarten-und-abnahmetest", title: "Testarten und Abnahmetest", description: "Ordne Funktions-, Integrations-, System- und Abnahmetests sowie Black- und White-Box-Sichten ein.", order: 3, status: "available" },
  { slug: "fehlerdokumentation-und-serviceprozess", title: "Fehlerdokumentation und Serviceprozess", description: "Dokumentiere reproduzierbare Fehler und ordne Service Request, Ticket, Incident, Problem, Supportlevel und Eskalation ein.", order: 4, status: "available" },
  { slug: "abnahme-uebergabe-und-einweisung", title: "Abnahme, Übergabe und Einweisung", description: "Prüfe Umfang und Abweichungen, dokumentiere den Status und trenne technischen Test von formaler Abnahme.", order: 5, status: "available" },
  { slug: "technische-dokumentation-und-lessons-learned", title: "Technische Dokumentation und Lessons Learned", description: "Dokumentiere den umgesetzten Zustand sicher und leite Verbesserungen aus Aufwand, Abweichungen und Erfahrungen ab.", order: 6, status: "available" },
] as const satisfies readonly Lesson[];

export const learningModules: LearningModule[] = [
  {
    slug: "ipv4-grundlagen",
    title: "IPv4 Grundlagen",
    description: "Lerne, wie IPv4-Adressen aufgebaut sind und welche Rolle sie bei der Kommunikation in Netzwerken spielen.",
    category: "Netzwerke",
    lessonCount: ipv4Lessons.length,
    learningObjectives: [
      "den Zweck einer IPv4-Adresse erklären",
      "den grundlegenden Aufbau einer IPv4-Adresse beschreiben",
      "den Zweck einer Subnetzmaske erklären",
      "private und öffentliche IPv4-Adressbereiche unterscheiden",
      "die Begriffe Netzadresse und Broadcast-Adresse erklären",
    ],
    lessons: ipv4Lessons,
  },
  {
    slug: "subnetting",
    title: "Subnetting",
    description: "Verstehe, warum IPv4-Netze unterteilt werden, und lerne, Subnetze strukturiert zu planen und zu prüfen.",
    category: "Netzwerke",
    lessonCount: subnettingLessons.length,
    learningObjectives: [
      "erklären, warum IPv4-Netze in Subnetze aufgeteilt werden",
      "Präfixlängen und ihren Zusammenhang mit Subnetzmasken verstehen",
      "bestimmen, wie viele Adressen ein Subnetz enthält",
      "gewöhnlich nutzbare Hostbereiche in IPv4-Subnetzen identifizieren",
      "Netz- und Broadcast-Adressen für verschiedene Präfixlängen bestimmen",
      "einen IPv4-Adressblock in kleinere Subnetze aufteilen",
      "einfache Subnetzstrukturen nach Anforderungen planen",
      "berechnete Subnetzbereiche überprüfen",
      "einfache Subnetz-Szenarien in Filius umsetzen",
    ],
    lessons: subnettingLessons,
  },
  {
    slug: "dhcp",
    title: "DHCP",
    description: "Verstehe automatische IPv4-Netzwerkkonfiguration, den DHCP-Ablauf und die Planung eines zuverlässigen DHCP-Dienstes.",
    category: "Netzwerke",
    lessonCount: dhcpLessons.length,
    learningObjectives: [
      "den Zweck von DHCP erklären",
      "begründen, warum automatische IP-Konfiguration nützlich ist",
      "den grundlegenden DHCP-Nachrichtenaustausch beschreiben",
      "Discover, Offer, Request und Acknowledge erklären",
      "dynamische und manuelle beziehungsweise statische Konfiguration unterscheiden",
      "Adresspools beziehungsweise Scopes und Leases erklären",
      "wichtige über DHCP verteilte Konfigurationsinformationen erklären",
      "verstehen, warum DHCP-Broadcasts über geroutete Netze eine Herausforderung darstellen",
      "den Zweck eines DHCP-Relays erklären",
      "häufige DHCP-Fehler systematisch diagnostizieren",
      "eine einfache DHCP-Umgebung in Filius konfigurieren und testen",
    ],
    lessons: dhcpLessons,
  },
  {
    slug: "dns",
    title: "DNS",
    description: "Verstehe Namensauflösung, DNS-Hierarchie und wichtige Records und lerne, DNS-Dienste systematisch zu prüfen.",
    category: "Netzwerke",
    lessonCount: dnsLessons.length,
    learningObjectives: [
      "den Zweck von DNS erklären",
      "Namen von IP-Adressen unterscheiden",
      "die Rolle von DNS-Resolvern erklären",
      "einen typischen rekursiven DNS-Auflösungsprozess beschreiben",
      "die Rollen von Root-, TLD- und autoritativen Nameservern erklären",
      "DNS-Caching und TTL konzeptionell erklären",
      "wichtige DNS-Record-Typen identifizieren",
      "Forward- und Reverse-Lookup unterscheiden",
      "DNS-Zonen und Delegation erklären",
      "rekursive und autoritative DNS-Dienste unterscheiden",
      "häufige DNS-Fehler systematisch diagnostizieren",
      "DNS-Informationen mit geeigneten Werkzeugen untersuchen",
      "eine einfache DNS-Umgebung in Filius erstellen und testen",
    ],
    lessons: dnsLessons,
  },
  {
    slug: "osi-tcp-ip-modell",
    title: "OSI- & TCP/IP-Modell",
    description: "Verstehe Netzwerkkommunikation in Schichten, ordne Protokolle und Geräte ein und nutze die Modelle zur Fehlersuche.",
    category: "Netzwerke",
    lessonCount: osiTcpIpLessons.length,
    learningObjectives: [
      "den Nutzen von Schichtenmodellen für Entwurf, Kommunikation und Fehlersuche erklären",
      "die Aufgaben der sieben OSI-Schichten unterscheiden",
      "wichtige Protokolle, Adressen und Geräte passenden Schichten zuordnen",
      "MAC- und IP-Adressierung sowie Switch- und Routerentscheidungen unterscheiden",
      "TCP und UDP auf der Transportschicht vergleichen",
      "das vierstufige TCP/IP-Modell beschreiben",
      "OSI- und TCP/IP-Schichten fachlich vorsichtig aufeinander abbilden",
      "Kapselung und Entkapselung an einem Webaufruf nachvollziehen",
      "Netzwerkprobleme schichtorientiert eingrenzen, ohne das Modell als starre Implementierung zu behandeln",
    ],
    lessons: osiTcpIpLessons,
  },
  {
    slug: "netzwerk-koppelelemente",
    title: "Netzwerk-Koppelelemente",
    description: "Lerne Repeater, Hub, Bridge, Switch, Router, Gateway und weitere Koppelelemente praxisnah zu unterscheiden.",
    category: "Netzwerke",
    lessonCount: networkDeviceLessons.length,
    learningObjectives: [
      "Koppelelemente nach Zweck und typischer OSI-Schicht einordnen",
      "Repeater und Hub von Bridge und Switch unterscheiden",
      "MAC-Lernen und Weiterleitung eines Layer-2-Switches erklären",
      "Unknown Unicast, Broadcast und gezielte Weiterleitung unterscheiden",
      "Router als Layer-3-Koppelelement und Grenze von Broadcast-Domänen erklären",
      "Default Gateway, Router und Protokoll-Gateway unterscheiden",
      "Access Point, Modem und Medienkonverter passend einordnen",
      "Collision- und Broadcast-Domains in einfachen Netzen bestimmen",
      "für ein gegebenes Szenario ein geeignetes Koppelelement auswählen",
    ],
    lessons: networkDeviceLessons,
  },
  {
    slug: "netzwerktopologien",
    title: "Netzwerktopologien",
    description: "Vergleiche physische und logische Netzstrukturen und bewerte deren Ausfallverhalten, Kosten und Einsatzgebiete.",
    category: "Netzwerke",
    lessonCount: networkTopologyLessons.length,
    learningObjectives: [
      "physische und logische Topologie unterscheiden",
      "Punkt-zu-Punkt-, Bus-, Ring-, Stern-, Baum- und vermaschte Topologien erklären",
      "vollständige und teilweise Vermaschung unterscheiden",
      "Hybridtopologien in realen Netzen erkennen",
      "Vor- und Nachteile typischer Topologien abwägen",
      "Ausfallfolgen von Leitungen und zentralen Komponenten beurteilen",
      "moderne Ethernet-, WLAN- und WAN-Beispiele topologisch einordnen",
      "eine Topologie anhand konkreter Anforderungen begründet auswählen",
    ],
    lessons: networkTopologyLessons,
  },
  {
    slug: "linux-grundlagen",
    title: "Linux Grundlagen",
    description: "Verstehe Linux-Systeme und lerne, sie über die Kommandozeile sicher zu untersuchen und zu verwalten.",
    category: "Betriebssysteme",
    lessonCount: linuxLessons.length,
    learningObjectives: [
      "erklären, was Linux ist, und Kernel von Distribution unterscheiden",
      "den Zweck einer Shell und eines Terminals erklären",
      "mit der Kommandozeile durch ein Linux-System navigieren",
      "absolute und relative Dateisystempfade unterscheiden",
      "wichtige Verzeichnisse der Linux-Dateisystemhierarchie erkennen",
      "Dateien und Verzeichnisse sicher erstellen, kopieren, verschieben, untersuchen und entfernen",
      "Benutzer, Gruppen und Dateieigentümerschaft erklären",
      "grundlegende Linux-Berechtigungen interpretieren",
      "root und Rechteerhöhung konzeptionell verstehen",
      "laufende Prozesse untersuchen",
      "Dienste und Dienstverwaltung konzeptionell verstehen",
      "Paketverwaltung und Repositories erklären",
      "grundlegende System- und Netzwerkinformationen untersuchen",
      "einfache Linux-Probleme systematisch eingrenzen",
      "beobachteten Systemzustand mit sicheren, nur lesenden Befehlen dokumentieren",
    ],
    lessons: linuxLessons,
  },
  {
    slug: "arbeitsplatz-hardware", title: "Arbeitsplatz & Hardware", description: "Plane FISI-Arbeitsplätze von CPU und RAM bis zu Clienttyp, Peripherie, Energie und Beschaffung.", category: "Betriebssysteme", lessonCount: hardwareLessons.length,
    learningObjectives: ["CPU, ALU, Kerne, Threads und Takt einordnen", "das Von-Neumann-Modell erklären", "RAM von Massenspeicher unterscheiden", "Mainboard- und Plattformkompatibilität prüfen", "Netzteile sicher und bedarfsgerecht dimensionieren", "integrierte und dedizierte GPUs auswählen", "HDD, SATA-SSD und NVMe-SSD vergleichen", "M.2, NVMe, PCIe und SATA korrekt unterscheiden", "Clienttypen und Peripherie passend auswählen", "Arbeitsplätze nach Leistung, Kosten, Wartbarkeit, Energie, Ergonomie und Barrierefreiheit bewerten", "Leistung, Energie, Kapazität und Übertragungszeit berechnen"],
    lessons: hardwareLessons,
  },
  {
    slug: "datenmengen-zahlensysteme-uebertragungsrechnungen",
    title: "Datenmengen, Zahlensysteme & Übertragungsrechnungen",
    description: "Rechne Dateneinheiten, Übertragungszeiten und Zahlensysteme sicher um und schätze Medien- und Textdaten realistisch ab.",
    category: "Betriebssysteme",
    lessonCount: dataCalculationLessons.length,
    learningObjectives: [
      "bit und Byte sicher unterscheiden",
      "dezimale SI- und binäre IEC-Dateneinheiten systematisch umrechnen",
      "Speicherkapazitäten mit expliziten Annahmen vergleichen",
      "Mbit/s und MB/s korrekt ineinander umrechnen",
      "Datenmenge, Datenrate und Übertragungszeit berechnen",
      "theoretische und effektive Datenraten unterscheiden",
      "Binär-, Dezimal- und Hexadezimalwerte ineinander umwandeln",
      "unkomprimierte Bild- und Audiogrößen berechnen",
      "verlustfreie und verlustbehaftete Kompression unterscheiden",
      "ASCII, Unicode und UTF-8 einordnen",
      "Zeichenanzahl und codierte Bytezahl unterscheiden",
      "eine integrierte Speicher- und Transferplanung nachvollziehbar dokumentieren",
    ],
    lessons: dataCalculationLessons,
  },
  {
    slug: "clientinstallation-boot-datentraeger",
    title: "Clientinstallation, Boot & Datenträger",
    description: "Verstehe Firmware, Bootkette, Datenträgeraufbau und Dateisysteme und führe eine Clientinstallation strukturiert bis zur Abnahme durch.",
    category: "Betriebssysteme",
    lessonCount: clientInstallationLessons.length,
    learningObjectives: [
      "BIOS, UEFI, POST, Bootziel und Bootreihenfolge einordnen",
      "Firmware-Auswahl, Bootmanager beziehungsweise Bootloader und Betriebssystemstart unterscheiden",
      "Zweck und Grenzen von Secure Boot erklären",
      "GPT und MBR anhand moderner Anforderungen begründet vergleichen",
      "Datenträger, Partitionstabelle, Partition, Volume und Dateisystem unterscheiden",
      "Partitionierung und Formatierung voneinander abgrenzen",
      "NTFS, FAT32 und ext4 für typische Einsatzzwecke einordnen",
      "die EFI-Systempartition schützen und ihre Rolle im UEFI-Start erklären",
      "eine Windows- oder Linux-Clientinstallation sicher vorbereiten und durchführen",
      "Treiber, Updates, Netzwerk, Konten und benötigte Software nach der Installation prüfen",
      "den installierten Zustand nachvollziehbar dokumentieren",
    ],
    lessons: clientInstallationLessons,
  },
  {
    slug: "windows-grundlagen", title: "Windows Grundlagen", description: "Verstehe Windows-Systeme und lerne, sie mit grafischen Werkzeugen und sicheren Befehlen zu untersuchen.", category: "Betriebssysteme", lessonCount: windowsLessons.length,
    learningObjectives: [
      "die Rolle von Windows als Betriebssystem erklären", "Windows-Editionen ohne volatile Preisangaben konzeptionell unterscheiden", "wichtige Windows-Systemkomponenten und Verwaltungsoberflächen identifizieren", "Windows Terminal, Eingabeaufforderung und PowerShell unterscheiden", "sichere, nur lesende Befehle zur Systemuntersuchung verwenden", "durch Windows-Pfade und Laufwerksbuchstaben navigieren", "absolute, relative und UNC-Pfade verstehen", "wichtige Windows-Verzeichnisse identifizieren", "Benutzerprofile und AppData konzeptionell verstehen", "lokale Benutzer, Gruppen und administrative Rechte erklären", "NTFS-Berechtigungen konzeptionell verstehen", "Prozesse und Dienste untersuchen", "Softwareinstallation und Windows Update konzeptionell verstehen", "System-, Speicher- und Netzwerkkonfiguration sicher untersuchen", "eine strukturierte, nur lesende Windows-Bestandsaufnahme und Fehlersuche durchführen",
    ],
    lessons: windowsLessons,
  },
  {
    slug: "webserver-grundlagen",
    title: "Webserver Grundlagen",
    description: "Verstehe Webserver, HTTP-Kommunikation und die Grundlagen für Betrieb und Fehlersuche von Webdiensten.",
    category: "Server & Dienste",
    lessonCount: webserverLessons.length,
    learningObjectives: [
      "den Zweck eines Webservers erklären",
      "Webserver, Browser beziehungsweise Client und Webanwendung beziehungsweise Inhalt unterscheiden",
      "das Client-Server-Modell für Webverkehr erklären",
      "den Zusammenhang zwischen DNS, IP, TCP und HTTP verstehen",
      "eine HTTP-Anfrage und HTTP-Antwort beschreiben",
      "gängige HTTP-Methoden identifizieren",
      "wichtige HTTP-Header konzeptionell erklären",
      "gängige HTTP-Statuscodes interpretieren",
      "den Aufbau einer URL verstehen",
      "HTTP und HTTPS unterscheiden",
      "die Rolle von TLS und Zertifikaten konzeptionell erklären",
      "häufige Webdienst-Fehler systematisch diagnostizieren",
      "ein einfaches Webserver-Szenario in Filius konfigurieren und testen",
    ],
    lessons: webserverLessons,
  },
  {
    slug: "active-directory-grundlagen", title: "Active Directory Grundlagen", description: "Verstehe Identitäten, logische Verzeichnisstrukturen und zentrale Verwaltung mit Active Directory Domain Services.", category: "Server & Dienste", lessonCount: activeDirectoryLessons.length,
    learningObjectives: [
      "den Zweck von Active Directory Domain Services erklären", "Active Directory von einer einfachen Benutzerdatenbank unterscheiden", "Domäne, Forest und Organisationseinheit erklären", "die logische AD-Struktur von der physischen Netzwerktopologie unterscheiden", "Benutzer, Computer und Gruppen als Verzeichnisobjekte beziehungsweise Sicherheitsprinzipale einordnen", "Security Identifier (SIDs) konzeptionell erklären", "Security Groups von Distribution Groups unterscheiden", "Gruppenbereiche konzeptionell verstehen", "die Rolle von Domain Controllern erklären", "begründen, warum DNS für den normalen Active-Directory-Betrieb wesentlich ist", "Replikation konzeptionell verstehen", "Grundlagen von Gruppenrichtlinien erklären", "zentrale Authentifizierung und Autorisierung verstehen", "lokale Windows-Konten von Domänenkonten unterscheiden", "grundlegende Domänenanmelde-, DNS- und DC-Erreichbarkeitsprobleme untersuchen", "eine einfache Active-Directory-Struktur planen und dokumentieren",
    ],
    lessons: activeDirectoryLessons,
  },
  {
    slug: "backup-datensicherung",
    title: "Backup & Datensicherung",
    description: "Plane Sicherungen, Wiederherstellungen, Aufbewahrung und Schutzmaßnahmen anhand belastbarer RPO-/RTO-Anforderungen.",
    category: "Server & Dienste",
    lessonCount: backupLessons.length,
    learningObjectives: [
      "Backup von Synchronisation, Archivierung, Snapshot und Hochverfügbarkeit unterscheiden",
      "Vollbackup, inkrementelles und differentielles Backup vergleichen",
      "benötigte Sicherungen einer Restore-Kette bestimmen",
      "Datei-, Image-/System-Backup und Snapshot passend auswählen",
      "erklären, warum Snapshot und RAID kein Backup ersetzen",
      "3-2-1 und die Erweiterung 3-2-1-1-0 anwenden",
      "Offsite-, Offline-, Air-Gap- und immutable Kopien einordnen",
      "Retention, Versionierung, Rotation und GFS erklären",
      "RPO und RTO aus Geschäftsanforderungen ableiten",
      "Backups gegen Ransomware und unberechtigten Zugriff schützen",
      "Monitoring, Integritätsprüfung und Restore-Tests in ein Backup-Konzept aufnehmen",
      "ein begründetes Backup-Konzept für ein kleines Unternehmen dokumentieren",
    ],
    lessons: backupLessons,
  },
  {
    slug: "storage-und-raid", title: "Storage & RAID", description: "Plane RAID-Verbundsysteme, berechne nutzbare Kapazität und grenze Verfügbarkeit sauber von Backup ab.", category: "Server & Dienste", lessonCount: storageRaidLessons.length,
    learningObjectives: ["Striping, Mirroring und Parität unterscheiden", "RAID 0, 1, 5, 6 und 10 vergleichen", "Mindestanzahl und nutzbare Kapazität berechnen", "gemischte Laufwerksgrößen bewerten", "degradierten Betrieb, Rebuild und Hot Spare erklären", "Hardware- und Software-RAID einordnen", "RAID-10-Ausfälle spiegelpaarbezogen beurteilen", "ein RAID für Anforderungen begründet auswählen", "erklären, warum RAID kein Backup ist", "zum bestehenden Backup-Modul überleiten"],
    lessons: storageRaidLessons,
  },
  {
    slug: "it-sicherheit", title: "IT-Sicherheit", description: "Erkenne Bedrohungen, wähle angemessene Schutzmaßnahmen und ordne Kryptografie, Zertifikate und Hardening ein.", category: "Server & Dienste", lessonCount: securityLessons.length,
    learningObjectives: ["Informationssicherheit, IT-Sicherheit, Datenschutz und Datensicherung unterscheiden", "Vertraulichkeit, Integrität, Verfügbarkeit und Authentizität anwenden", "Schadsoftware und Angriffsarten defensiv einordnen", "Phishing und Social Engineering erkennen", "präventive und reaktive Maßnahmen auswählen", "Least Privilege, MFA, Segmentierung und Hardening anwenden", "symmetrische und asymmetrische Verschlüsselung vergleichen", "Hashing von Verschlüsselung unterscheiden", "Signaturen, Zertifikate und CAs erklären", "HTTPS und SSH ohne falsche Sicherheitsversprechen einordnen"],
    lessons: securityLessons,
  },
  {
    slug: "datenschutz", title: "Datenschutz", description: "Verstehe den Schutz personenbezogener Daten, zentrale DSGVO-Grundsätze und praktische Betroffenenrechte.", category: "Server & Dienste", lessonCount: privacyLessons.length,
    learningObjectives: ["personenbezogene Daten erkennen", "besondere Sensibilität angemessen einordnen", "Zweck und grundlegenden Anwendungsbereich von DSGVO und BDSG erklären", "Datenschutzgrundsätze auf Praxisfälle anwenden", "Betroffenenrechte mit ihrem rechtlichen Kontext einordnen", "Anonymisierung und Pseudonymisierung korrekt unterscheiden", "Datenschutz von Datensicherheit unterscheiden", "Fehlversand, Gerätediebstahl und Altzugänge bewerten", "geeignete technische und organisatorische Maßnahmen auswählen", "Fälle dokumentieren und zuständige Stellen einbeziehen"],
    lessons: privacyLessons,
  },
  {
    slug: "netzwerkfehler-systematisch-analysieren",
    title: "Netzwerkfehler systematisch analysieren",
    description: "Netzwerkprobleme mit Beobachtungen und testbaren Hypothesen strukturiert eingrenzen, prüfen und dokumentieren.",
    category: "Troubleshooting",
    lessonCount: networkTroubleshootingLessons.length,
    learningObjectives: [
      "ein Netzwerkproblem vor jeder Änderung präzise definieren",
      "Evidenz systematisch sammeln und Symptome von Grundursachen unterscheiden",
      "Client-, IP-, Subnetz-, Gateway-, Routing-, DHCP-, DNS- und Dienstprobleme voneinander abgrenzen",
      "IPv4-Konfigurationen interpretieren und ungültige Adressen, Masken oder Gateways erkennen",
      "lokale und entfernte Erreichbarkeit mit geeigneten Werkzeugen vorsichtig prüfen",
      "Ping-Ergebnisse einordnen, ohne sie als universellen Diensttest zu behandeln",
      "Routingtabellen lesen und Routenentscheidungen nachvollziehen",
      "DHCP und DNS getrennt diagnostizieren",
      "DNS-Auflösung von Dienstverfügbarkeit unterscheiden",
      "TCP-/UDP-Dienstendpunkte konzeptionell untersuchen",
      "Timeouts, Ablehnungen, DNS-Fehler und Anwendungsfehler unterscheiden",
      "für jede Diagnoseschicht geeignete Werkzeuge auswählen",
      "zufällige Konfigurationsänderungen und Neustart-first-Troubleshooting vermeiden",
      "Beobachtungen, Hypothesen, Änderungen und Verifikation dokumentieren",
      "einen vollständigen Diagnoseablauf für einen fiktiven Netzwerkvorfall durchführen",
    ],
    lessons: networkTroubleshootingLessons,
  },
  {
    slug: "programmierung-und-pseudocode", title: "Programmierung & Pseudocode", description: "Lies und prüfe kleine Algorithmen, Kontrollstrukturen, Funktionen und objektorientierte Grundmodelle.", category: "Entwicklung & Planung", lessonCount: programmingLessons.length,
    learningObjectives: ["Algorithmen und eindeutigen Pseudocode erklären", "Variablen, Datentypen und Zuweisungen auswerten", "arithmetische, vergleichende und boolesche Operatoren anwenden", "if/else- und switch-Verzweigungen verfolgen", "for-, while- und do-while-Schleifen per Schreibtischtest prüfen", "Funktionen, Parameter und Rückgabewerte einordnen", "Arrays und Listen grundlegend verarbeiten", "Ausgaben kleiner Programme vorhersagen", "einfache logische und Ablauf-Fehler finden", "Klasse, Objekt, Attribut, Methode sowie public/private unterscheiden"],
    lessons: programmingLessons,
  },
  {
    slug: "uml-und-datenmodellierung", title: "UML & Datenmodellierung", description: "Interpretiere Use-Case-, Klassen- und Aktivitätsmodelle sowie einfache ER- und relationale Modelle.", category: "Entwicklung & Planung", lessonCount: modelingLessons.length,
    learningObjectives: ["Zweck und Grenzen eines Modells erklären", "Akteur, Anwendungsfall und Systemgrenze identifizieren", "Klasse und Objekt unterscheiden", "Attribute, Methoden und Sichtbarkeit in Klassendiagrammen lesen", "einfache Beziehungen interpretieren", "Aktivitäten, Entscheidungen und Pfade verfolgen", "Entitäten, Attribute und Beziehungen bestimmen", "1:1-, 1:n- und n:m-Kardinalitäten unterscheiden", "geeignete Primärschlüssel erkennen", "Redundanz und ihre Nachteile erklären", "ein einfaches ER-Modell in Tabellen überführen"],
    lessons: modelingLessons,
  },
  {
    slug: "projektmanagement", title: "Projektmanagement", description: "Plane und steuere kleine IT-Projekte mit klaren Zielen, Ablaufmodellen, Gantt und Netzplan.", category: "Entwicklung & Planung", lessonCount: projectManagementLessons.length,
    learningObjectives: ["Projekte von Routineaufgaben unterscheiden", "SMART-Ziele formulieren und prüfen", "Zeit, Kosten und Leistung beziehungsweise Qualität abwägen", "Stakeholder und Projektrollen einordnen", "Phasen, Arbeitspakete, Meilensteine und PSP erklären", "Lastenheft und Pflichtenheft unterscheiden", "Risiken bewerten und Maßnahmen planen", "Gantt-Diagramme interpretieren", "früheste und späteste Netzplanzeiten berechnen", "Gesamtpuffer und kritischen Pfad bestimmen", "Soll-Ist-Vergleiche für Projektcontrolling nutzen", "Wasserfall, Scrum und Kanban kontextbezogen vergleichen"],
    lessons: projectManagementLessons,
  },
  {
    slug: "wirtschaftlichkeit-und-beschaffung", title: "Wirtschaftlichkeit & Beschaffung", description: "Vergleiche IT-Angebote und Bezugsmodelle mit Kosten-, Nutzen- und Lebenszyklusrechnungen.", category: "Entwicklung & Planung", lessonCount: economicsLessons.length,
    learningObjectives: ["Anschaffungs-, laufende, fixe und variable Kosten unterscheiden", "Erlös, Gewinn und Deckungsbeitrag grundlegend berechnen", "Rentabilität und Amortisation einordnen", "Rabatt, Skonto, Netto, Brutto und Umsatzsteuer korrekt berechnen", "TCO für einen definierten Zeitraum vergleichen", "Muss- und Kann-Kriterien in Beschaffungen anwenden", "qualitative und quantitative Angebotskriterien bewerten", "eine Nutzwertanalyse mit Gewichtung und Bewertungen berechnen", "Kauf, Miete und Leasing kontextbezogen vergleichen", "Make-or-Buy-Entscheidungen begründen", "Service, Garantie, Gewährleistung, Skalierbarkeit, Barrierefreiheit und Nachhaltigkeit berücksichtigen"],
    lessons: economicsLessons,
  },
  {
    slug: "software-und-lizenzierung", title: "Software & Lizenzierung", description: "Ordne Softwarearten ein, wähle Lösungen anforderungsbasiert aus und prüfe Lizenzmodelle und Nutzungsrechte.", category: "Entwicklung & Planung", lessonCount: softwareLicensingLessons.length,
    learningObjectives: ["System- und Anwendungssoftware unterscheiden", "Standard-, Individual- und Branchensoftware einordnen", "ERP, CRM, CMS und DMS nach ihrem Zweck unterscheiden", "Software anhand funktionaler und nicht-funktionaler Anforderungen auswählen", "Kompatibilität und Interoperabilität unterscheiden", "Open Source und proprietäre Software neutral vergleichen", "Lizenz und Eigentum unterscheiden", "Nutzer-, Geräte-, Concurrent-, Abonnement- und dauerhafte Modelle anwenden", "GPL, LGPL und MIT grundlegend einordnen", "Lizenzszenarien auf Plausibilität prüfen", "KI-Ausgaben verifizieren und vertrauliche Daten schützen"],
    lessons: softwareLicensingLessons,
  },
  {
    slug: "virtualisierung-und-cloud", title: "Virtualisierung & Cloud", description: "Verstehe virtuelle Maschinen, Container und Cloud-Modelle und bewerte ihre Architektur- und Betriebsgrenzen.", category: "Server & Dienste", lessonCount: virtualizationCloudLessons.length,
    learningObjectives: ["Host, Gast, VM und Hypervisor erklären", "Typ-1- und Typ-2-Hypervisoren unterscheiden", "virtuelle Ressourcen und Überbelegung konzeptionell einordnen", "VM und Container architektonisch unterscheiden", "Image, Container, Registry, Ports, Konfiguration und Persistenz erklären", "Snapshot und Backup klar unterscheiden", "IaaS, PaaS und SaaS anwenden", "Public, Private und Hybrid Cloud unterscheiden", "Skalierbarkeit und Elastizität trennen", "Cloud- und On-Premises-Entscheidungen abwägen", "geteilte Sicherheitsverantwortung und Verfügbarkeitsgrenzen erklären"],
    lessons: virtualizationCloudLessons,
  },
  {
    slug: "kundenauftrag-kommunikation-und-vertraege", title: "Kundenauftrag, Kommunikation & Verträge", description: "Ermittle Anforderungen, kommuniziere zielgruppengerecht und ordne grundlegende Vertrags- und Servicekonzepte ein.", category: "Entwicklung & Planung", lessonCount: customerContractLessons.length,
    learningObjectives: ["Kundenwunsch, Bedarf, Anforderung und Lösung unterscheiden", "offene, geschlossene und klärende Fragen einsetzen", "funktionale und nicht-funktionale Anforderungen trennen", "Muss-, Soll- und Kann-Anforderungen priorisieren", "technische Informationen zielgruppengerecht erklären", "technische Fakten aus deutsch- und englischsprachigen Kurztexten entnehmen", "Angebot und Annahme konzeptionell einordnen", "Kauf, Miete, Leasing, Lizenz- und Servicevereinbarung unterscheiden", "Dienst- und Werkvertrag grundlegend trennen", "Gewährleistung und Garantie unterscheiden", "SLA-Reaktionsziel und Lösungsziel trennen", "eine sichere Kundeneinweisung strukturieren"],
    lessons: customerContractLessons,
  },
  {
    slug: "qualitaetssicherung-und-uebergabe", title: "Qualitätssicherung & Übergabe", description: "Plane prüfbare Qualität, dokumentiere Tests und Fehler und führe Abnahme, Übergabe und technische Dokumentation strukturiert durch.", category: "Entwicklung & Planung", lessonCount: qualityHandoverLessons.length,
    learningObjectives: ["Qualität an definierten Anforderungen messen", "Qualitätssicherung und Qualitätsmanagement unterscheiden", "PDCA auf IT-Prozesse anwenden", "vollständige Testfälle formulieren", "Soll, Ist und Abweichung dokumentieren", "Funktions-, Integrations-, System- und Abnahmetests unterscheiden", "Black- und White-Box-Sichten einordnen", "reproduzierbare Fehlerberichte erstellen", "Service Request, Incident und Problem unterscheiden", "Supportlevel und Eskalation organisatorisch einordnen", "technischen Test und formale Abnahme trennen", "Abnahmeprotokoll, Übergabe und Einweisung strukturieren", "sichere technische Dokumentation und Lessons Learned erstellen"],
    lessons: qualityHandoverLessons,
  },
];

export function getLearningModule(slug: string) {
  return learningModules.find((module) => module.slug === slug);
}

export function getLesson(moduleSlug: string, lessonSlug: string) {
  return getLearningModule(moduleSlug)?.lessons?.find((lesson) => lesson.slug === lessonSlug);
}

export function getOrderedLessons(learningModule: LearningModule) {
  return [...(learningModule.lessons ?? [])].sort((a, b) => a.order - b.order);
}
