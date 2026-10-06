import "server-only";

import type { LabPublicDefinition } from "../interactive-lab.ts";
import { getDeviceCommandCapabilities, getIpv4Mode, type LabControlRule, type LabEvidenceType, type SimulatedDnsHost, type SimulatedInterface, type SimulatedLabState } from "../lab-engine.ts";

export type LabReviewDefinition = {
  rootCause: string;
  explanation: string;
  verification: string;
  recommendedSequence: readonly string[];
};

export type ServerLabDefinition = {
  public: LabPublicDefinition;
  initialState: SimulatedLabState;
  selectedDeviceId: string;
  deviceRules: Readonly<Record<string, {
    commands: readonly string[];
    controls: readonly LabControlRule[];
  }>>;
  dhcpLease?: SimulatedInterface;
  dnsHosts: readonly SimulatedDnsHost[];
  httpRequiredServices?: readonly string[];
  hints: readonly string[];
  validate: (state: SimulatedLabState) => boolean;
  verification: { anyOf: readonly LabEvidenceType[] };
  review: LabReviewDefinition;
};

const clientInterface = (input: Partial<SimulatedInterface> = {}): SimulatedInterface => {
  const { dhcpEnabled, ...values } = input;
  return {
    address: "192.168.10.25",
    prefixLength: 24,
    gateway: "192.168.10.1",
    dnsServer: "192.168.10.53",
    ...values,
    ipv4Mode: input.ipv4Mode ?? (dhcpEnabled ? "dynamic" : "static"),
  };
};

const isUsableOfficeClientAddress = (value: string | null | undefined) => {
  if (!value?.startsWith("192.168.10.")) return false;
  const host = Number(value.split(".")[3]);
  return Number.isInteger(host) && host >= 2 && host <= 254 && ![20, 50, 53].includes(host);
};

export const LAB_TUTORIAL_ID = "tutorial-lab-001";

const normalLabRequirements = (requirements: Omit<LabPublicDefinition["unlockRequirements"], "requiredLabCompletions"> = {}) => ({
  ...requirements,
  requiredLabCompletions: [LAB_TUTORIAL_ID],
});

const manualNetworkControls = [
  { kind: "set-ipv4-address" },
  { kind: "set-prefix-length" },
  { kind: "set-default-gateway" },
  { kind: "set-dns-server" },
] as const satisfies readonly LabControlRule[];

const rawDefinitions: readonly ServerLabDefinition[] = [
  {
    public: {
      id: LAB_TUTORIAL_ID, version: 1, kind: "tutorial", title: "Einführung: So funktionieren die Troubleshooting-Labs",
      summary: "Ein geführter Rundgang durch Auftrag, Topologie, Diagnose, kontrollierte Reparatur und Funktionsnachweis.", category: "Einführung",
      difficulty: "Einstieg", estimatedMinutes: 10,
      scenario: "Die BioPC GmbH stellt Ihnen einen Übungsarbeitsplatz bereit. Der Trainingsserver ist vom Arbeitsplatz aus nicht erreichbar. In diesem Einführungslab lernen Sie die Bedienung der Lab-Umgebung anhand eines bewusst einfachen Fehlers kennen.",
      task: "Folgen Sie den angezeigten Schritten, korrigieren Sie die Netzwerkkonfiguration von CLIENT01 und weisen Sie anschließend die Erreichbarkeit des Trainingsservers nach.",
      unlockRequirements: {}, relevantModuleIds: [],
      topology: {
        devices: [
          { id: "client", label: "CLIENT01", type: "windows-client", description: "Übungsarbeitsplatz" },
          { id: "router", label: "RTR-TRAINING", type: "router", description: "Gateway des Trainingsnetzes" },
          { id: "training", label: "TRAINING01", type: "linux-server", description: "Simulierter Trainingsserver" },
        ],
        links: [{ from: "client", to: "router", label: "192.168.90.0/24" }, { from: "router", to: "training", label: "simulierter externer Pfad" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ address: "192.168.90.25", gateway: "192.168.90.254", dnsServer: null }) },
      router: { interface: clientInterface({ address: "192.168.90.1", gateway: null, dnsServer: null }), routesExternal: true },
      training: { interface: clientInterface({ address: "203.0.113.20", gateway: null, dnsServer: null }) },
    } }, selectedDeviceId: "training",
    deviceRules: {
      client: { commands: ["help", "ipconfig", "ping", "trace"], controls: manualNetworkControls },
      router: { commands: ["help"], controls: [] },
      training: { commands: ["help", "ip-a"], controls: [] },
    },
    dnsHosts: [], hints: ["Die Anleitung über dem Arbeitsbereich nennt den nächsten Bedienungsschritt; Geräte und Kabel wählen Sie direkt in der visuellen Topologie.", "Wählen Sie CLIENT01 und verwenden Sie help sowie ipconfig /all. clear leert bei Bedarf nur die sichtbare Terminalanzeige.", "Tragen Sie im leeren Netzwerkformular ausschließlich das diagnostizierte Gateway ein. Erst ping 203.0.113.20 beweist danach die wiederhergestellte Funktion."],
    validate: (state) => state.devices.client.interface?.gateway === "192.168.90.1",
    verification: { anyOf: ["external-ip-reachability-success"] },
    review: { rootCause: "Das Standardgateway des Übungsclients zeigte nicht auf RTR-TRAINING.", explanation: "Sie haben Topologie und Gerätekonfiguration untersucht und im leeren Netzwerkformular anschließend ausschließlich das diagnostizierte Gateway geändert.", verification: "Der erfolgreiche Ping zum Trainingsserver nach der Änderung belegt den vollständigen simulierten Netzpfad. Die Konfigurationsänderung allein hätte diesen Nachweis nicht erbracht.", recommendedSequence: ["Ausgangssituation und Aufgabe lesen", "CLIENT01 auswählen", "Werkzeuge mit help entdecken", "Konfiguration mit ipconfig /all untersuchen", "Gateway kontrolliert korrigieren", "Erreichbarkeit mit ping nachweisen"] },
  },
  {
    public: {
      id: "dns-client-001", version: 1, kind: "troubleshooting", title: "Webseiten lassen sich nicht öffnen",
      summary: "Ein Client erreicht Ziele per IP, aber Namen und Webseiten schlagen fehl.", category: "DNS",
      difficulty: "Einstieg", estimatedMinutes: 15,
      scenario: "Die BioPC GmbH meldet, dass an einem Arbeitsplatz Webseiten und externe Dienste nicht mehr über Namen erreichbar sind. Verbindungen zu bekannten IP-Adressen funktionieren weiterhin; andere Arbeitsplätze zeigen keine Auffälligkeiten.",
      task: "Untersuchen Sie die Netzwerkkonfiguration des Clients, stellen Sie die Namensauflösung wieder her und überprüfen Sie die Funktion mit einem geeigneten Test.",
      unlockRequirements: normalLabRequirements(), relevantModuleIds: ["ipv4-grundlagen", "dns"],
      topology: {
        devices: [
          { id: "client", label: "PC-CLIENT", type: "windows-client", description: "Windows-Client im internen Netz" },
          { id: "switch", label: "SW01", type: "switch", description: "Lokale Netzverbindung" },
          { id: "router", label: "GW01", type: "router", description: "Gateway zum externen Netz" },
          { id: "dns", label: "DNS01", type: "dns-dhcp-server", description: "Interner DNS-Resolver" },
          { id: "internet", label: "EXT-SRV01", type: "linux-server", description: "Externer Linux-Testserver" },
        ],
        links: [
          { from: "client", to: "switch" }, { from: "switch", to: "router" },
          { from: "switch", to: "dns" }, { from: "router", to: "internet" },
        ],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ dnsServer: "192.168.10.254" }) }, switch: {},
      router: { interface: clientInterface({ address: "192.168.10.1", gateway: null, dnsServer: null }), routesExternal: true },
      dns: { interface: clientInterface({ address: "192.168.10.53", gateway: null, dnsServer: null }), services: { dns: "running" } },
      internet: { interface: clientInterface({ address: "203.0.113.10", prefixLength: 24, gateway: null, dnsServer: null }) },
    } },
    selectedDeviceId: "client",
    deviceRules: { client: { commands: ["help", "ipconfig", "ping", "nslookup", "dig", "trace"], controls: manualNetworkControls }, switch: { commands: ["help"], controls: [] }, router: { commands: ["help"], controls: [] }, dns: { commands: ["help"], controls: [] }, internet: { commands: ["help"], controls: [] } },
    dnsHosts: [
      { canonicalName: "example.org", address: "203.0.113.10", aliases: ["www.example.org"] },
      { canonicalName: "google.com", address: "203.0.113.10", aliases: ["www.google.com"] },
    ],
    hints: ["Prüfe zuerst die vollständige IP-Konfiguration des Clients.", "Vergleiche Standardgateway und DNS-Server: Beide erfüllen unterschiedliche Aufgaben.", "Der Client erreicht externe IP-Adressen. Untersuche jetzt die Namensauflösung und den eingetragenen Resolver."],
    validate: (state) => state.devices.client.interface?.dnsServer === "192.168.10.53",
    verification: { anyOf: ["dns-resolution-success", "hostname-reachability-success"] },
    review: { rootCause: "Auf dem Client war ein falscher DNS-Server eingetragen.", explanation: "IPv4 und Standardgateway waren funktionsfähig. Erst die DNS-Anfrage scheiterte, weil der konfigurierte Resolver nicht erreichbar beziehungsweise kein geeigneter DNS-Dienst war.", verification: "Eine erfolgreiche Abfrage oder ein erfolgreicher Ping zu einem bekannten Hostnamen belegt, dass der Client den Namen über den geeigneten Resolver auflösen kann. Ein Ping nur zu einer IP-Adresse beweist das nicht.", recommendedSequence: ["IP-Konfiguration lesen", "Gateway per IP prüfen", "Externes Ziel per IP prüfen", "DNS gezielt abfragen", "Nur die belegte DNS-Konfiguration korrigieren"] },
  },
  {
    public: {
      id: "gateway-client-001", version: 1, kind: "troubleshooting", title: "Nur das lokale Netzwerk funktioniert",
      summary: "Lokale Systeme antworten, externe Ziele bleiben jedoch unerreichbar.", category: "IPv4 und Routing",
      difficulty: "Einstieg", estimatedMinutes: 15,
      scenario: "Die BioPC GmbH hat einen Arbeitsplatz in Betrieb genommen. Der lokale Dateiserver ist erreichbar, Verbindungen zu Zielen außerhalb des Büronetzes schlagen jedoch fehl. Andere Geräte können diese Ziele verwenden.",
      task: "Untersuchen Sie den Übergang vom lokalen zum externen Netz, korrigieren Sie die Clientkonfiguration und weisen Sie die externe Erreichbarkeit nach.",
      unlockRequirements: normalLabRequirements({ minLevel: 2 }), relevantModuleIds: ["ipv4-grundlagen", "subnetting"],
      topology: {
        devices: [
          { id: "client", label: "PC-CLIENT", type: "windows-client", description: "Windows-Client" },
          { id: "local", label: "FILE01", type: "linux-server", description: "Server im lokalen Subnetz" },
          { id: "router", label: "GW01", type: "router", description: "Router zum externen Netz" },
          { id: "internet", label: "EXT-SRV01", type: "linux-server", description: "Externer Linux-Testserver" },
        ],
        links: [{ from: "client", to: "local", label: "192.168.10.0/24" }, { from: "client", to: "router" }, { from: "router", to: "internet" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ gateway: "192.168.10.254" }) },
      local: { interface: clientInterface({ address: "192.168.10.50", gateway: "192.168.10.1" }) },
      router: { interface: clientInterface({ address: "192.168.10.1", gateway: null, dnsServer: null }), routesExternal: true },
      internet: { interface: clientInterface({ address: "203.0.113.10", prefixLength: 24, gateway: null, dnsServer: null }) },
    } }, selectedDeviceId: "client",
    deviceRules: { client: { commands: ["help", "ipconfig", "ping", "trace"], controls: manualNetworkControls }, local: { commands: ["help", "ip-a"], controls: [] }, router: { commands: ["help"], controls: [] }, internet: { commands: ["help"], controls: [] } },
    dnsHosts: [], hints: ["Vergleiche ein Ziel im eigenen Subnetz mit einem externen Ziel.", "Lokaler Verkehr benötigt kein Standardgateway.", "Prüfe, ob die konfigurierte Gateway-Adresse tatsächlich zum Router gehört."],
    validate: (state) => state.devices.client.interface?.gateway === "192.168.10.1",
    verification: { anyOf: ["external-ip-reachability-success"] },
    review: { rootCause: "Das Standardgateway des Clients zeigte auf die falsche Adresse.", explanation: "Ziele im lokalen /24-Netz waren direkt erreichbar. Für andere Netze fehlte jedoch ein erreichbarer nächster Router.", verification: "Erst ein erfolgreicher Test zu einem externen Ziel belegt, dass Verkehr das lokale Subnetz über die reparierte Standardroute verlassen kann. Ein lokaler Ping reicht dafür nicht.", recommendedSequence: ["IP und Präfix prüfen", "Lokalen Host testen", "Gateway-Adresse prüfen", "Gateway testen", "Externes Ziel erneut testen"] },
  },
  {
    public: {
      id: "dhcp-client-001", version: 1, kind: "troubleshooting", title: "Client erhält keine IPv4-Adresse",
      summary: "Ein DHCP-Client bleibt mit einer Fallback-Adresse ohne nutzbare Netzkonfiguration.", category: "DHCP",
      difficulty: "Fortgeschritten", estimatedMinutes: 20,
      scenario: "Die BioPC GmbH meldet, dass ein automatisch konfigurierter Arbeitsplatz nach dem Start keine regulären Netzwerkdienste erreicht. Am Client wird lediglich eine selbst vergebene IPv4-Adresse angezeigt.",
      task: "Untersuchen Sie Client und zuständigen Netzwerkdienst, stellen Sie die automatische Konfiguration wieder her und überprüfen Sie die erhaltene Lease.",
      unlockRequirements: normalLabRequirements({ requiredModuleIds: ["dhcp"] }), relevantModuleIds: ["dhcp", "ipv4-grundlagen"],
      topology: {
        devices: [
          { id: "client", label: "PC-DHCP", type: "windows-client", description: "Client mit automatischer Konfiguration" },
          { id: "switch", label: "SW01", type: "switch", description: "Lokales Netz" },
          { id: "dhcp", label: "DHCP01", type: "dns-dhcp-server", description: "DHCP-Server" },
          { id: "router", label: "GW01", type: "router", description: "Standardgateway" },
        ],
        links: [{ from: "client", to: "switch" }, { from: "switch", to: "dhcp" }, { from: "switch", to: "router" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ address: "169.254.42.10", prefixLength: 16, gateway: null, dnsServer: null, dhcpEnabled: true }) }, switch: {},
      dhcp: { interface: clientInterface({ address: "192.168.10.20", gateway: null, dnsServer: null }), services: { dhcp: "stopped" } },
      router: { interface: clientInterface({ address: "192.168.10.1", gateway: null, dnsServer: null }), routesExternal: true },
    } }, selectedDeviceId: "client",
    deviceRules: { client: { commands: ["help", "ipconfig", "renew-dhcp", "ping"], controls: [{ kind: "renew-dhcp" }] }, switch: { commands: ["help"], controls: [] }, dhcp: { commands: ["help", "ip-a", "systemctl-status", "systemctl-start", "systemctl-stop", "systemctl-restart"], controls: [{ kind: "set-service-state", service: "dhcp" }] }, router: { commands: ["help"], controls: [] } },
    dhcpLease: clientInterface({ address: "192.168.10.100", dhcpEnabled: true }), dnsHosts: [],
    hints: ["Ermittle, ob der Client DHCP verwendet und welche Adresse er aktuell hat.", "Prüfe den Zustand des DHCP-Dienstes auf DHCP01.", "Nach dem Start des Dienstes benötigt der Client noch eine neue Lease."],
    validate: (state) => state.devices.dhcp.services?.dhcp === "running" && state.devices.client.interface?.address === "192.168.10.100",
    verification: { anyOf: ["dhcp-renew-success", "client-ip-configuration-confirmed"] },
    review: { rootCause: "Der DHCP-Dienst war gestoppt; der Client hatte deshalb nur eine Fallback-Adresse.", explanation: "Der Dienst musste zuerst wieder laufen. Erst danach konnte eine erneute DHCP-Anfrage die vorgesehene Lease liefern.", verification: "Die erfolgreiche Lease-Erneuerung ist hier selbst der Funktionsnachweis: Der Client erreicht den laufenden DHCP-Dienst und erhält die vorgesehene vollständige Konfiguration. Eine reine Dienststatusanzeige würde das nicht belegen.", recommendedSequence: ["Clientkonfiguration prüfen", "DHCP-Automatik bestätigen", "DHCP-Dienststatus prüfen", "Dienst gezielt starten", "Lease erneuern und Ergebnis verifizieren"] },
  },
  {
    public: {
      id: "web-service-001", version: 1, kind: "troubleshooting", title: "Webserver ist nicht erreichbar",
      summary: "Der Linux-Server antwortet im Netz, liefert aber keine Webseite.", category: "Serverdienste",
      difficulty: "Fortgeschritten", estimatedMinutes: 20,
      scenario: "Mitarbeitende der BioPC GmbH können die interne Webseite nicht öffnen. Der zuständige Linux-Server antwortet weiterhin auf Netzwerkprüfungen, die Anwendung liefert jedoch keine HTTP-Antwort.",
      task: "Grenzen Sie Netzwerk- und Dienstebene voneinander ab, stellen Sie die Webanwendung wieder her und überprüfen Sie den Zugriff aus Clientsicht.",
      unlockRequirements: normalLabRequirements({ minLevel: 4, requiredModuleIds: ["webserver-grundlagen"] }), relevantModuleIds: ["webserver-grundlagen", "linux-grundlagen"],
      topology: {
        devices: [
          { id: "client", label: "PC-CLIENT", type: "linux-client", description: "Testclient" },
          { id: "switch", label: "SW01", type: "switch", description: "Servernetz" },
          { id: "web", label: "WEB01", type: "linux-server", description: "Linux-Webserver" },
          { id: "dns", label: "DNS01", type: "dns-dhcp-server", description: "Interner DNS-Resolver" },
        ], links: [{ from: "client", to: "switch" }, { from: "switch", to: "web" }, { from: "switch", to: "dns" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ address: "192.168.30.25", gateway: null, dnsServer: "192.168.30.53" }) }, switch: {},
      web: { interface: clientInterface({ address: "192.168.30.20", gateway: null, dnsServer: null }), services: { nginx: "stopped" } },
      dns: { interface: clientInterface({ address: "192.168.30.53", gateway: null, dnsServer: null }), services: { dns: "running" } },
    } }, selectedDeviceId: "client",
    deviceRules: { client: { commands: ["help", "ip-a", "ping", "http"], controls: [] }, switch: { commands: ["help"], controls: [] }, web: { commands: ["help", "ip-a", "ip-route", "http", "systemctl-status", "systemctl-start", "systemctl-stop", "systemctl-restart"], controls: [{ kind: "set-service-state", service: "nginx" }] }, dns: { commands: ["help"], controls: [] } },
    dnsHosts: [{ canonicalName: "web01.firma.test", address: "192.168.30.20", aliases: ["intranet.firma.test"] }], hints: ["Prüfe zunächst, ob WEB01 per IP erreichbar ist.", "Ein erreichbarer Host garantiert noch keinen laufenden Anwendungsdienst.", "Untersuche den Status von nginx direkt auf WEB01."],
    validate: (state) => state.devices.web.services?.nginx === "running",
    verification: { anyOf: ["http-service-success"] },
    review: { rootCause: "Der Webdienst nginx war gestoppt.", explanation: "Die IP-Erreichbarkeit des Servers war intakt. Der Fehler lag eine Ebene höher beim Anwendungsdienst.", verification: "Nur eine erfolgreiche HTTP-Antwort beweist, dass der Anwendungsdienst Anfragen verarbeitet. Ein Ping bestätigt lediglich die Netzwerkerreichbarkeit des Hosts.", recommendedSequence: ["IP-Konfiguration prüfen", "Server per IP erreichen", "HTTP-Aufruf testen", "Dienststatus auf dem Server prüfen", "Dienst starten und HTTP erneut testen"] },
  },
  {
    public: {
      id: "linux-permissions-001", version: 1, kind: "troubleshooting", title: "Zugriff auf Freigabeverzeichnis funktioniert nicht",
      summary: "Netz und Dienst funktionieren, aber die Supportgruppe kann nicht schreiben.", category: "Linux-Berechtigungen",
      difficulty: "Fortgeschritten", estimatedMinutes: 20,
      scenario: "Das Support-Team der BioPC GmbH erreicht eine Linux-Freigabe und kann sich anmelden, darf im vorgesehenen Verzeichnis jedoch keine Dateien ablegen. Netzwerk und Freigabedienst arbeiten unauffällig.",
      task: "Prüfen Sie die Berechtigung des Freigabeverzeichnisses, ermöglichen Sie Besitzer und Supportgruppe den vollständigen Zugriff, erhalten Sie die Gruppenzuordnung für neu angelegte Inhalte und kontrollieren Sie das gespeicherte Ergebnis.",
      unlockRequirements: normalLabRequirements({ minLevel: 5, requiredModuleIds: ["linux-grundlagen"] }), relevantModuleIds: ["linux-grundlagen"],
      topology: {
        devices: [
          { id: "client", label: "CLIENT01", type: "linux-client", description: "Support-Client" },
          { id: "files", label: "FILE01", type: "linux-server", description: "Linux-Dateiserver" },
        ], links: [{ from: "client", to: "files", label: "192.168.40.0/24" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ address: "192.168.40.25", gateway: null, dnsServer: null }) },
      files: { interface: clientInterface({ address: "192.168.40.20", gateway: null, dnsServer: null }), services: { smb: "running" }, directories: { "/srv/freigabe": "0750" } },
    } }, selectedDeviceId: "files",
    deviceRules: { client: { commands: ["help", "ip-a", "ping"], controls: [] }, files: { commands: ["help", "ip-a", "systemctl-status", "ls", "stat", "chmod"], controls: [{ kind: "set-file-mode", path: "/srv/freigabe" }] } },
    dnsHosts: [], hints: ["Netz und Freigabedienst funktionieren. Prüfe die Autorisierungsebene.", "Untersuche den Modus von /srv/freigabe mit ls -ld oder stat.", "Die Supportgruppe benötigt Schreiben und Betreten; das Setgid-Bit hält die Gruppenzuordnung konsistent."],
    validate: (state) => state.devices.files.directories?.["/srv/freigabe"] === "2770",
    verification: { anyOf: ["permission-state-confirmed"] },
    review: { rootCause: "Das Freigabeverzeichnis hatte den Modus 0750 statt 2770.", explanation: "Der Dienst und das Netz waren erreichbar, aber die Gruppe durfte nicht schreiben. Der gezielte Modus 2770 gibt Besitzer und Gruppe rwx und vererbt die Verzeichnisgruppe.", verification: "Die erneute read-only Rechteinspektion zeigt den tatsächlich gespeicherten Modus einschließlich Setgid-Bit. Das bloße Absenden von chmod wäre noch kein Nachweis des resultierenden Zustands.", recommendedSequence: ["Authentifizierung von Autorisierung trennen", "Host und Dienst prüfen", "Verzeichnisrechte mit ls -ld oder stat lesen", "benötigte Gruppenrechte bestimmen", "gezielt chmod 2770 anwenden und erneut prüfen"] },
  },
  {
    public: {
      id: "subnet-client-001", version: 1, kind: "troubleshooting", title: "Neuer Arbeitsplatz erreicht keine internen Dienste",
      summary: "Nach der Neueinrichtung eines PCs bleiben interne Systeme unerreichbar.", category: "IPv4 und Subnetting",
      difficulty: "Einstieg", estimatedMinutes: 15,
      scenario: "Die BioPC GmbH hat einen neuen Büroarbeitsplatz eingerichtet. Der PC kann weder den internen Dateiserver noch das vorgesehene Gateway erreichen, während bestehende Arbeitsplätze ohne Störung arbeiten.",
      task: "Untersuchen Sie die statische IPv4-Konfiguration, stellen Sie die Verbindung zu den internen Diensten her und weisen Sie die lokale Erreichbarkeit nach.",
      unlockRequirements: normalLabRequirements(), relevantModuleIds: ["ipv4-grundlagen", "subnetting", "netzwerkfehler-systematisch-analysieren"],
      topology: {
        devices: [
          { id: "client", label: "PC-NEU", type: "windows-client", description: "Neu eingerichteter Arbeitsplatz" },
          { id: "switch", label: "SW01", type: "switch", description: "Zugangs-Switch im Büronetz" },
          { id: "file", label: "FILE01", type: "linux-server", description: "Interner Dateiserver" },
          { id: "router", label: "GW01", type: "router", description: "Gateway des Büronetzes" },
        ],
        links: [{ from: "client", to: "switch" }, { from: "switch", to: "file", label: "192.168.10.0/24" }, { from: "switch", to: "router" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ address: "192.168.20.25" }) }, switch: {},
      file: { interface: clientInterface({ address: "192.168.10.50", gateway: "192.168.10.1", dnsServer: null }) },
      router: { interface: clientInterface({ address: "192.168.10.1", gateway: null, dnsServer: null }), routesExternal: true },
    } }, selectedDeviceId: "client",
    deviceRules: { client: { commands: ["help", "ipconfig", "ping", "trace"], controls: manualNetworkControls }, switch: { commands: ["help"], controls: [] }, file: { commands: ["help", "ip-a", "ping"], controls: [] }, router: { commands: ["help"], controls: [] } },
    dnsHosts: [], hints: ["Vergleiche die vollständige Clientkonfiguration mit dem Netz der internen Ziele.", "Prüfe, ob Clientadresse und Gateway bei der eingetragenen Präfixlänge im selben Subnetz liegen.", "Der Arbeitsplatz soll zum Netz 192.168.10.0/24 gehören; wähle eine dort gültige, freie Hostadresse."],
    validate: (state) => isUsableOfficeClientAddress(state.devices.client.interface?.address),
    verification: { anyOf: ["local-ip-reachability-success"] },
    review: { rootCause: "Der Client hatte eine Adresse aus 192.168.20.0/24, obwohl er am Netz 192.168.10.0/24 angeschlossen war.", explanation: "Mit der falschen Quelladresse betrachtete der Client weder das vorgesehene Gateway noch die internen Systeme als direkt erreichbar. Die passende Hostadresse ordnet ihn dem richtigen Subnetz zu.", verification: "Ein erfolgreicher Ping zu FILE01 nach der Änderung belegt, dass die lokale IPv4-Kommunikation im vorgesehenen Netz funktioniert. Das Eintragen einer plausiblen Adresse allein wäre noch kein Funktionsnachweis.", recommendedSequence: ["IP-Konfiguration lesen", "Adressnetz von Client, Ziel und Gateway vergleichen", "lokale Erreichbarkeit testen", "Clientadresse gezielt korrigieren", "internes Ziel erneut testen"] },
  },
  {
    public: {
      id: "prefix-client-001", version: 1, kind: "troubleshooting", title: "Gateway trotz plausibler Adressen unerreichbar",
      summary: "Clientadresse und Gateway sehen passend aus, doch lokale Ressourcen antworten nicht.", category: "IPv4 und Subnetting",
      difficulty: "Fortgeschritten", estimatedMinutes: 20,
      scenario: "An einem Arbeitsplatz der BioPC GmbH wirken IPv4-Adresse und Gateway auf den ersten Blick passend. Trotzdem antworten weder das Gateway noch der interne Server; vergleichbare Clients im selben Bereich funktionieren.",
      task: "Analysieren Sie die Netzgrenzen des Clients, korrigieren Sie die fehlerhafte Netzwerkkonfiguration und überprüfen Sie anschließend die lokale Kommunikation.",
      unlockRequirements: normalLabRequirements({ requiredModuleIds: ["subnetting"] }), relevantModuleIds: ["subnetting", "ipv4-grundlagen"],
      topology: {
        devices: [
          { id: "client", label: "PC-VERW-01", type: "windows-client", description: "Arbeitsplatz der Verwaltung" },
          { id: "switch", label: "SW01", type: "switch", description: "Gemeinsames Layer-2-Netz" },
          { id: "file", label: "FILE01", type: "linux-server", description: "Interner Server" },
          { id: "router", label: "GW01", type: "router", description: "Standardgateway" },
        ], links: [{ from: "client", to: "switch", label: "192.168.10.0/24" }, { from: "switch", to: "file" }, { from: "switch", to: "router" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ prefixLength: 28 }) }, switch: {},
      file: { interface: clientInterface({ address: "192.168.10.50", gateway: "192.168.10.1", dnsServer: null }) },
      router: { interface: clientInterface({ address: "192.168.10.1", gateway: null, dnsServer: null }), routesExternal: true },
    } }, selectedDeviceId: "client",
    deviceRules: { client: { commands: ["help", "ipconfig", "ping", "trace"], controls: manualNetworkControls }, switch: { commands: ["help"], controls: [] }, file: { commands: ["help", "ip-a"], controls: [] }, router: { commands: ["help"], controls: [] } },
    dnsHosts: [], hints: ["Plausible IPv4-Adressen allein reichen nicht; die Präfixlänge bestimmt die lokale Netzgrenze.", "Berechne bei der aktuellen Präfixlänge das Netz der Clientadresse und vergleiche es mit dem Gateway.", "Vergleiche die Clientpräfixlänge mit dem dokumentierten gemeinsamen Netz in der Topologie."],
    validate: (state) => state.devices.client.interface?.prefixLength === 24,
    verification: { anyOf: ["local-ip-reachability-success"] },
    review: { rootCause: "Die Präfixlänge /28 teilte Client, Gateway und Server in unterschiedliche logische Netze.", explanation: "Obwohl alle Adressen mit 192.168.10 begannen, lag 192.168.10.25/28 nicht im selben berechneten Subnetz wie 192.168.10.1 und 192.168.10.50. /24 bildet die dokumentierte gemeinsame Netzgrenze ab.", verification: "Ein erfolgreicher Test zu Gateway oder FILE01 nach der Korrektur belegt, dass die neue Netzmaske die lokale Kommunikation tatsächlich ermöglicht.", recommendedSequence: ["Adressen und Präfix lesen", "Netzgrenzen berechnen", "lokales Ziel testen", "Präfix gezielt korrigieren", "lokale Erreichbarkeit erneut prüfen"] },
  },
  {
    public: {
      id: "dns-record-001", version: 1, kind: "troubleshooting", title: "Intranet zeigt auf das falsche System",
      summary: "Namensauflösung antwortet, aber der angefragte Dienst landet nicht beim vorgesehenen Server.", category: "DNS",
      difficulty: "Fortgeschritten", estimatedMinutes: 20,
      scenario: "Nach einer Systemumstellung öffnet der Intranetname der BioPC GmbH weiterhin ein altes System. Die Namensabfrage liefert reproduzierbar eine Antwort, der neue Webserver ist über seine Adresse erreichbar.",
      task: "Ermitteln Sie die Ursache der falschen Zielzuordnung, stellen Sie den vorgesehenen Namenszugriff her und überprüfen Sie das Ergebnis aus Clientsicht.",
      unlockRequirements: normalLabRequirements({ minLevel: 3, requiredModuleIds: ["dns"] }), relevantModuleIds: ["dns", "webserver-grundlagen"],
      topology: {
        devices: [
          { id: "client", label: "PC-SUPPORT", type: "windows-client", description: "Support-Arbeitsplatz" },
          { id: "dns", label: "DNS01", type: "dns-dhcp-server", description: "Interner DNS-Resolver" },
          { id: "web", label: "WEB01", type: "linux-server", description: "Aktueller Intranetserver" },
          { id: "old", label: "ALT01", type: "linux-server", description: "Außer Betrieb genommener Altserver" },
        ], links: [{ from: "client", to: "dns" }, { from: "client", to: "web" }, { from: "client", to: "old" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface() },
      dns: { interface: clientInterface({ address: "192.168.10.53", gateway: null, dnsServer: null }), services: { dns: "running" }, dnsRecords: { "portal.firma.test": "192.168.10.99" } },
      web: { interface: clientInterface({ address: "192.168.10.80", gateway: "192.168.10.1", dnsServer: null }), services: { nginx: "running" } },
      old: { interface: clientInterface({ address: "192.168.10.99", gateway: "192.168.10.1", dnsServer: null }), services: { nginx: "stopped" } },
    } }, selectedDeviceId: "client",
    deviceRules: { client: { commands: ["help", "ipconfig", "ping", "nslookup", "dig", "http"], controls: [] }, dns: { commands: ["help", "ip-a"], controls: [{ kind: "set-dns-record", hostname: "portal.firma.test" }] }, web: { commands: ["help", "ip-a", "systemctl-status", "http"], controls: [] }, old: { commands: ["help", "ip-a", "systemctl-status"], controls: [] } },
    dnsHosts: [{ canonicalName: "portal.firma.test", address: "192.168.10.80", aliases: ["intranet.firma.test"] }],
    hints: ["Eine DNS-Antwort beweist noch nicht, dass die zurückgegebene Adresse fachlich richtig ist.", "Vergleiche die aufgelöste Adresse mit der Adresse von WEB01.", "Prüfe den A-Eintrag für portal.firma.test auf DNS01."],
    validate: (state) => state.devices.dns.dnsRecords?.["portal.firma.test"] === "192.168.10.80",
    verification: { anyOf: ["dns-resolution-success", "hostname-reachability-success", "http-service-success"] },
    review: { rootCause: "Der DNS-A-Eintrag für portal.firma.test zeigte noch auf ALT01 statt auf WEB01.", explanation: "Der Resolver arbeitete korrekt und lieferte deshalb reproduzierbar die gespeicherte, aber veraltete Adresse. Erst die Korrektur der DNS-Daten führt Clients zum vorgesehenen Dienst.", verification: "Eine erneute Namensabfrage zeigt die korrigierte Zieladresse; ein erfolgreicher Hostnamen-Ping oder HTTP-Aufruf belegt zusätzlich die Nutzung des richtigen Ziels. Die Änderung des Eintrags allein wäre noch kein Nachweis aus Clientsicht.", recommendedSequence: ["Client- und Resolverkonfiguration prüfen", "Hostnamen gezielt auflösen", "Antwort mit dem vorgesehenen Server vergleichen", "A-Eintrag korrigieren", "Auflösung oder Anwendung erneut testen"] },
  },
  {
    public: {
      id: "dhcp-options-001", version: 1, kind: "troubleshooting", title: "DHCP-Lease vorhanden, Namen bleiben unauflösbar",
      summary: "Ein Client erhält automatisch eine Adresse, kann interne Namen aber nicht verwenden.", category: "DHCP und DNS",
      difficulty: "Fortgeschritten", estimatedMinutes: 20,
      scenario: "Ein neuer Client der BioPC GmbH erhält automatisch eine IPv4-Adresse und erreicht lokale Ziele per IP. Interne Hostnamen können jedoch nicht aufgelöst werden; manuell konfigurierte Geräte sind nicht betroffen.",
      task: "Prüfen Sie die automatisch bereitgestellten Netzwerkeinstellungen, korrigieren Sie die Ursache und weisen Sie die funktionierende Namensauflösung nach einer neuen Lease nach.",
      unlockRequirements: normalLabRequirements({ minLevel: 4, requiredModuleIds: ["dhcp", "dns"] }), relevantModuleIds: ["dhcp", "dns", "ipv4-grundlagen"],
      topology: {
        devices: [
          { id: "client", label: "PC-DHCP-02", type: "windows-client", description: "Automatisch konfigurierter Client" },
          { id: "dhcp", label: "DHCP01", type: "dns-dhcp-server", description: "DHCP-Server mit Bereichsoptionen" },
          { id: "dns", label: "DNS01", type: "dns-dhcp-server", description: "Interner DNS-Resolver" },
          { id: "router", label: "GW01", type: "router", description: "Standardgateway" },
          { id: "files", label: "FILE01", type: "linux-server", description: "Interner Dateiserver" },
        ], links: [{ from: "client", to: "dhcp" }, { from: "client", to: "dns" }, { from: "client", to: "router" }, { from: "client", to: "files" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ address: "192.168.10.110", dnsServer: "192.168.10.254", dhcpEnabled: true }) },
      dhcp: { interface: clientInterface({ address: "192.168.10.20", gateway: null, dnsServer: null }), services: { dhcp: "running" }, dhcpOptions: { gateway: "192.168.10.1", dnsServer: "192.168.10.254" } },
      dns: { interface: clientInterface({ address: "192.168.10.53", gateway: null, dnsServer: null }), services: { dns: "running" } },
      router: { interface: clientInterface({ address: "192.168.10.1", gateway: null, dnsServer: null }), routesExternal: true },
      files: { interface: clientInterface({ address: "192.168.10.60", gateway: "192.168.10.1", dnsServer: "192.168.10.53" }), services: { smb: "running" } },
    } }, selectedDeviceId: "client",
    deviceRules: { client: { commands: ["help", "ipconfig", "renew-dhcp", "ping", "nslookup", "dig"], controls: [{ kind: "renew-dhcp" }] }, dhcp: { commands: ["help", "ip-a", "systemctl-status"], controls: [{ kind: "set-dhcp-option", option: "dnsServer" }] }, dns: { commands: ["help", "ip-a", "systemctl-status"], controls: [] }, router: { commands: ["help"], controls: [] }, files: { commands: ["help", "ip-a", "systemctl-status"], controls: [] } },
    dhcpLease: clientInterface({ address: "192.168.10.110", dhcpEnabled: true }),
    dnsHosts: [{ canonicalName: "files.firma.test", address: "192.168.10.60", aliases: ["dateien.firma.test"] }],
    hints: ["Eine erfolgreiche Lease kann trotzdem einzelne unbrauchbare Optionen enthalten.", "Vergleiche Gateway und DNS-Server der Client-Lease mit den vorhandenen Servern.", "Korrigiere die DNS-Server-Option auf DHCP01 und fordere danach eine neue Lease an."],
    validate: (state) => state.devices.dhcp.dhcpOptions?.dnsServer === "192.168.10.53" && state.devices.client.interface?.dnsServer === "192.168.10.53",
    verification: { anyOf: ["dns-resolution-success", "hostname-reachability-success"] },
    review: { rootCause: "DHCP01 verteilte als DNS-Server die unbrauchbare Adresse 192.168.10.254.", explanation: "DHCP selbst funktionierte und lieferte eine Lease. Der Fehler lag in einer einzelnen gelieferten Option; erst Korrektur und Lease-Erneuerung übertragen den geeigneten Resolver an den Client.", verification: "Die neue Lease belegt nur die Übernahme der Option. Erst eine danach erfolgreiche Namensauflösung zeigt, dass die ausgelieferte DNS-Konfiguration praktisch funktioniert.", recommendedSequence: ["Client-Lease vollständig lesen", "DHCP-Erreichbarkeit von Optionswerten trennen", "DNS-Option am DHCP-Server prüfen", "Option korrigieren und Lease erneuern", "bekannten internen Namen auflösen"] },
  },
  {
    public: {
      id: "application-backend-001", version: 1, kind: "troubleshooting", title: "Webserver erreichbar, Anwendung antwortet nicht",
      summary: "Host und Web-Frontend sind aktiv, dennoch liefert die interne Anwendung keine Antwort.", category: "Serverdienste",
      difficulty: "Fortgeschritten", estimatedMinutes: 20,
      scenario: "Die interne Anwendung der BioPC GmbH liefert keine vollständige Antwort. Der Server ist erreichbar und das Web-Frontend läuft, dennoch wird die Anwendung für die Mitarbeitenden nicht vollständig bereitgestellt.",
      task: "Grenzen Sie Netzwerk, Web-Frontend und Anwendungsabhängigkeiten voneinander ab, stellen Sie die Anwendung wieder her und verifizieren Sie HTTP Ende-zu-Ende.",
      unlockRequirements: normalLabRequirements({ minLevel: 5, requiredModuleIds: ["webserver-grundlagen", "linux-grundlagen"] }), relevantModuleIds: ["webserver-grundlagen", "linux-grundlagen", "netzwerkfehler-systematisch-analysieren"],
      topology: {
        devices: [
          { id: "client", label: "PC-CLIENT", type: "linux-client", description: "Anwendungsclient" },
          { id: "web", label: "APP01", type: "linux-server", description: "Web-Frontend und Anwendungsdienst" },
          { id: "dns", label: "DNS01", type: "dns-dhcp-server", description: "Interner DNS-Resolver" },
        ], links: [{ from: "client", to: "web", label: "192.168.30.0/24" }, { from: "client", to: "dns" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ address: "192.168.30.25", gateway: null, dnsServer: "192.168.30.53" }) },
      web: { interface: clientInterface({ address: "192.168.30.20", gateway: null, dnsServer: null }), services: { nginx: "running", "azubi-api": "stopped" } },
      dns: { interface: clientInterface({ address: "192.168.30.53", gateway: null, dnsServer: null }), services: { dns: "running" } },
    } }, selectedDeviceId: "client",
    deviceRules: { client: { commands: ["help", "ip-a", "ping", "http"], controls: [] }, web: { commands: ["help", "ip-a", "http", "systemctl-status", "systemctl-start", "systemctl-stop", "systemctl-restart"], controls: [{ kind: "set-service-state", service: "azubi-api" }] }, dns: { commands: ["help"], controls: [] } },
    dnsHosts: [{ canonicalName: "app.firma.test", address: "192.168.30.20" }], httpRequiredServices: ["nginx", "azubi-api"],
    hints: ["Trenne die Erreichbarkeit des Hosts von der Antwort der Anwendung.", "Prüfe auf APP01 nicht nur nginx, sondern auch den abhängigen Anwendungsdienst.", "Das Frontend läuft; untersuche den Status von azubi-api."],
    validate: (state) => state.devices.web.services?.nginx === "running" && state.devices.web.services?.["azubi-api"] === "running",
    verification: { anyOf: ["http-service-success"] },
    review: { rootCause: "Der Backenddienst azubi-api war gestoppt, während nginx und das Netzwerk funktionierten.", explanation: "Ping und ein laufendes Frontend beweisen nicht, dass alle für die Anwendung benötigten Komponenten arbeiten. nginx konnte ohne Backend keine vollständige Anwendungsantwort liefern.", verification: "Nur der erfolgreiche HTTP-Aufruf nach dem Start des Backends prüft Frontend, Backend und Netzpfad gemeinsam. Ein Ping oder ein einzelner Dienststatus reicht nicht.", recommendedSequence: ["Host per IP prüfen", "HTTP-Fehler reproduzieren", "Frontendstatus prüfen", "abhängigen Backenddienst prüfen und starten", "HTTP Ende-zu-Ende erneut testen"] },
  },
  {
    public: {
      id: "linux-routing-001", version: 1, kind: "troubleshooting", title: "Linux-Server erreicht keine externen Netze",
      summary: "Lokale Systeme antworten, Paketquellen und andere externe Ziele bleiben vom Server aus unerreichbar.", category: "Linux und Routing",
      difficulty: "Fortgeschritten", estimatedMinutes: 20,
      scenario: "Ein Linux-Server der BioPC GmbH erreicht Systeme im eigenen Netz, kann jedoch keine Paketquellen oder anderen externen Ziele kontaktieren. Andere Geräte nutzen denselben Netzübergang erfolgreich.",
      task: "Untersuchen Sie die Linux-Netzkonfiguration, stellen Sie den externen Netzpfad wieder her und belegen Sie die Erreichbarkeit eines externen Ziels.",
      unlockRequirements: normalLabRequirements({ minLevel: 5, requiredModuleIds: ["linux-grundlagen", "subnetting"] }), relevantModuleIds: ["linux-grundlagen", "subnetting", "ipv4-grundlagen"],
      topology: {
        devices: [
          { id: "server", label: "LINUX01", type: "linux-server", description: "Interner Linux-Server" },
          { id: "local", label: "MON01", type: "linux-client", description: "Lokales Monitoring-System" },
          { id: "router", label: "GW01", type: "router", description: "Router zum externen Netz" },
          { id: "internet", label: "EXT-SRV01", type: "linux-server", description: "Externer Linux-Testserver" },
        ], links: [{ from: "server", to: "local", label: "192.168.50.0/24" }, { from: "server", to: "router" }, { from: "router", to: "internet" }],
      },
    },
    initialState: { devices: {
      server: { interface: clientInterface({ address: "192.168.50.20", gateway: "192.168.50.254", dnsServer: null }) },
      local: { interface: clientInterface({ address: "192.168.50.10", gateway: "192.168.50.1", dnsServer: null }) },
      router: { interface: clientInterface({ address: "192.168.50.1", gateway: null, dnsServer: null }), routesExternal: true },
      internet: { interface: clientInterface({ address: "203.0.113.10", gateway: null, dnsServer: null }) },
    } }, selectedDeviceId: "server",
    deviceRules: { server: { commands: ["help", "ip-a", "ip-route", "ping", "trace"], controls: manualNetworkControls }, local: { commands: ["help", "ip-a", "ping"], controls: [] }, router: { commands: ["help"], controls: [] }, internet: { commands: ["help"], controls: [] } },
    dnsHosts: [], hints: ["Vergleiche lokale und externe Erreichbarkeit.", "Lies mit ip route den nächsten Hop für Ziele außerhalb des lokalen Netzes.", "Vergleiche den eingetragenen nächsten Hop mit der tatsächlichen Adresse von GW01."],
    validate: (state) => state.devices.server.interface?.gateway === "192.168.50.1",
    verification: { anyOf: ["external-ip-reachability-success"] },
    review: { rootCause: "Die Linux-Standardroute zeigte auf 192.168.50.254 statt auf den Router 192.168.50.1.", explanation: "Lokale Ziele lagen direkt im verbundenen Netz und blieben erreichbar. Für externe Ziele benötigte der Server dagegen einen gültigen nächsten Hop.", verification: "Ein erfolgreicher Ping oder Traceroute zu einem externen Ziel nach der Korrektur belegt die funktionsfähige Standardroute; ein lokaler Ping kann das nicht.", recommendedSequence: ["Adresse mit ip a lesen", "lokales Ziel testen", "Standardroute mit ip route prüfen", "Gateway gezielt korrigieren", "externes Ziel erneut testen"] },
  },
  {
    public: {
      id: "web-port-001", version: 1, kind: "troubleshooting", title: "Webdienst läuft, ist aber am Standardport nicht erreichbar",
      summary: "Der Server und nginx sind aktiv, Clients erhalten am erwarteten HTTP-Endpunkt trotzdem keine Antwort.", category: "Serverdienste",
      difficulty: "Fortgeschritten", estimatedMinutes: 20,
      scenario: "Das interne Portal der BioPC GmbH ist unter der üblichen Adresse nicht erreichbar. Der Server antwortet und nginx wird als aktiv gemeldet, dennoch erhalten Clients am erwarteten HTTP-Endpunkt keine Antwort.",
      task: "Prüfen Sie den tatsächlich angebotenen Webendpunkt, stellen Sie den regulären Clientzugriff wieder her und verifizieren Sie die Anwendung ohne Sonderkonfiguration.",
      unlockRequirements: normalLabRequirements({ minLevel: 5, requiredModuleIds: ["webserver-grundlagen"] }), relevantModuleIds: ["webserver-grundlagen", "linux-grundlagen"],
      topology: {
        devices: [
          { id: "client", label: "PC-CLIENT", type: "linux-client", description: "Client mit erwartetem HTTP-Zugriff" },
          { id: "web", label: "PORTAL01", type: "linux-server", description: "Linux-Webserver" },
          { id: "dns", label: "DNS01", type: "dns-dhcp-server", description: "Interner DNS-Resolver" },
        ], links: [{ from: "client", to: "web", label: "192.168.60.0/24" }, { from: "client", to: "dns" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ address: "192.168.60.25", gateway: null, dnsServer: "192.168.60.53" }) },
      web: { interface: clientInterface({ address: "192.168.60.20", gateway: null, dnsServer: null }), services: { nginx: "running" }, servicePorts: { nginx: 8080 } },
      dns: { interface: clientInterface({ address: "192.168.60.53", gateway: null, dnsServer: null }), services: { dns: "running" } },
    } }, selectedDeviceId: "client",
    deviceRules: { client: { commands: ["help", "ip-a", "ping", "http"], controls: [] }, web: { commands: ["help", "ip-a", "http", "systemctl-status"], controls: [{ kind: "set-service-port", service: "nginx" }] }, dns: { commands: ["help"], controls: [] } },
    dnsHosts: [{ canonicalName: "portal.firma.test", address: "192.168.60.20" }],
    hints: ["Ein aktiver Dienst muss nicht am erwarteten Port lauschen.", "Vergleiche den HTTP-Aufruf ohne Portangabe mit dem auf PORTAL01 angezeigten Listener.", "Client und Dienst müssen denselben erwarteten HTTP-Endpunkt verwenden."],
    validate: (state) => state.devices.web.services?.nginx === "running" && state.devices.web.servicePorts?.nginx === 80,
    verification: { anyOf: ["http-service-success"] },
    review: { rootCause: "nginx lief auf Port 8080, während die Clients den HTTP-Standardport 80 verwendeten.", explanation: "Ein laufender Prozess und ein erreichbarer Host sagen noch nichts darüber aus, ob der Dienst am erwarteten Endpunkt lauscht. Die Portkorrektur bringt Dienst und Clienterwartung zusammen.", verification: "Der erfolgreiche HTTP-Aufruf ohne besondere Portangabe belegt, dass der Dienst nun am erwarteten Port 80 antwortet. Dienststatus und Ping allein prüfen das nicht.", recommendedSequence: ["Host erreichen", "HTTP am erwarteten Endpunkt testen", "Dienststatus prüfen", "tatsächlichen Listener-Port mit dem Soll vergleichen", "Port korrigieren und HTTP erneut testen"] },
  },
  {
    public: {
      id: "vlan-access-001", version: 1, kind: "troubleshooting", title: "Arbeitsplatz nach Portwechsel ohne Serverzugriff",
      summary: "Nach dem Umstecken eines Arbeitsplatzes bleiben interne Server trotz plausibler IP-Konfiguration unerreichbar.", category: "VLAN und Switching",
      difficulty: "Fortgeschritten", estimatedMinutes: 20,
      scenario: "Die BioPC GmbH hat einen Arbeitsplatz auf einen anderen Switchport umgesteckt. Seitdem sind interne Server nicht erreichbar, obwohl die angezeigte IPv4-Konfiguration weiterhin zum dokumentierten Netz passt.",
      task: "Untersuchen Sie Client und Zugangsnetz, stellen Sie die interne Kommunikation wieder her und weisen Sie anschließend die Erreichbarkeit des Servers nach.",
      unlockRequirements: normalLabRequirements({ minLevel: 5, requiredModuleIds: ["subnetting", "netzwerkfehler-systematisch-analysieren"] }), relevantModuleIds: ["subnetting", "ipv4-grundlagen", "netzwerkfehler-systematisch-analysieren"],
      topology: {
        devices: [
          { id: "client", label: "CLIENT01", type: "windows-client", description: "Umgezogener Arbeitsplatz" },
          { id: "switch", label: "SW1", type: "switch", description: "Managed Access-Switch" },
          { id: "server", label: "SERVER01", type: "linux-server", description: "Interner Webserver" },
          { id: "router", label: "RTR1", type: "router", description: "Gateway des Clientnetzes" },
        ], links: [{ from: "client", to: "switch", label: "Gi0/1" }, { from: "server", to: "switch", label: "Gi0/2" }, { from: "router", to: "switch", label: "Gi0/24" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ address: "192.168.70.10", gateway: "192.168.70.1", dnsServer: null }) },
      switch: { switchPorts: {
        "gi0/1": { mode: "access", vlan: 20, connectedDeviceId: "client" },
        "gi0/2": { mode: "access", vlan: 10, connectedDeviceId: "server" },
        "gi0/24": { mode: "access", vlan: 10, connectedDeviceId: "router" },
      } },
      server: { interface: clientInterface({ address: "192.168.70.20", gateway: "192.168.70.1", dnsServer: null }), services: { nginx: "running" } },
      router: { interface: clientInterface({ address: "192.168.70.1", gateway: null, dnsServer: null }), routesExternal: true },
    } }, selectedDeviceId: "client",
    deviceRules: {
      client: { commands: ["help", "ipconfig", "ping", "http"], controls: [] },
      switch: { commands: ["help", "show-vlan", "show-switchport"], controls: [{ kind: "set-access-vlan", portId: "gi0/1" }] },
      server: { commands: ["help", "ip-a", "systemctl-status", "http"], controls: [] },
      router: { commands: ["help"], controls: [] },
    },
    dnsHosts: [], hints: ["Wenn Adressen und Präfix plausibel sind, untersuche die logische Verbindungsebene.", "Vergleiche die Access-VLAN-Zuordnung der Ports von CLIENT01 und SERVER01.", "Kommunizierende Endgeräte im selben IP-Subnetz benötigen hier eine kompatible Access-VLAN-Zugehörigkeit."],
    validate: (state) => state.devices.switch.switchPorts?.["gi0/1"]?.vlan === 10,
    verification: { anyOf: ["local-ip-reachability-success", "remote-http-service-success"] },
    review: { rootCause: "Der neue Access-Port Gi0/1 war VLAN 20 zugeordnet, während SERVER01 und das Gateway in VLAN 10 lagen.", explanation: "Gleiche IPv4-Subnetze ersetzen keine gemeinsame Layer-2-Broadcast-Domain. Der Switch trennte CLIENT01 deshalb logisch von SERVER01 und RTR1.", verification: "Ein erfolgreicher Ping oder entfernter HTTP-Aufruf nach der Portkorrektur belegt, dass Client und Server wieder über dieselbe logische Layer-2-Domäne kommunizieren. Das Setzen der VLAN-ID allein wäre noch kein Funktionsnachweis.", recommendedSequence: ["Client-IP-Konfiguration prüfen", "lokale Erreichbarkeit testen", "Switchport- und VLAN-Zuordnung lesen", "betroffenen Access-Port gezielt korrigieren", "Server erneut erreichen"] },
  },
  {
    public: {
      id: "firewall-http-001", version: 1, kind: "troubleshooting", title: "Server antwortet, Webanwendung bleibt unerreichbar",
      summary: "Der Anwendungsserver reagiert auf Ping und sein Webdienst läuft, doch Clients erhalten keine HTTP-Antwort.", category: "Firewall und Dienste",
      difficulty: "Fortgeschritten", estimatedMinutes: 20,
      scenario: "Mitarbeitende der BioPC GmbH können eine interne Webanwendung nicht öffnen. Der Zielserver antwortet auf Ping und der Webdienst wird als aktiv angezeigt, HTTP-Anfragen vom Client schlagen dennoch fehl.",
      task: "Grenzen Sie Host-, Dienst- und Filterebene voneinander ab, stellen Sie den HTTP-Zugriff wieder her und überprüfen Sie die Anwendung aus Clientsicht.",
      unlockRequirements: normalLabRequirements({ minLevel: 6, requiredModuleIds: ["webserver-grundlagen", "netzwerkfehler-systematisch-analysieren"] }), relevantModuleIds: ["webserver-grundlagen", "linux-grundlagen", "netzwerkfehler-systematisch-analysieren"],
      topology: {
        devices: [
          { id: "client", label: "CLIENT01", type: "windows-client", description: "Arbeitsplatz im Clientnetz" },
          { id: "firewall", label: "FW1", type: "firewall", description: "Simulierter TCP-Filter" },
          { id: "web", label: "WEB01", type: "linux-server", description: "Interner Webserver" },
          { id: "dns", label: "DNS01", type: "dns-dhcp-server", description: "Interner DNS-Resolver" },
        ], links: [{ from: "client", to: "firewall", label: "TCP-Filterpfad" }, { from: "firewall", to: "web" }, { from: "client", to: "dns" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ address: "192.168.72.10", gateway: null, dnsServer: "192.168.72.53" }) },
      firewall: { firewallRules: {
        "client-http": { sourceNetwork: "192.168.72.0/24", destinationDeviceId: "web", protocol: "tcp", destinationPort: 80, action: "deny" },
        "admin-ssh": { sourceNetwork: "any", destinationDeviceId: "web", protocol: "tcp", destinationPort: 22, action: "deny" },
      } },
      web: { interface: clientInterface({ address: "192.168.72.20", gateway: null, dnsServer: null }), services: { nginx: "running" }, servicePorts: { nginx: 80 } },
      dns: { interface: clientInterface({ address: "192.168.72.53", gateway: null, dnsServer: null }), services: { dns: "running" } },
    } }, selectedDeviceId: "client",
    deviceRules: {
      client: { commands: ["help", "ipconfig", "ping", "nslookup", "http"], controls: [] },
      firewall: { commands: ["help", "show-firewall"], controls: [{ kind: "set-firewall-rule-action", ruleId: "client-http" }, { kind: "set-firewall-rule-action", ruleId: "admin-ssh" }] },
      web: { commands: ["help", "ip-a", "systemctl-status", "http"], controls: [] },
      dns: { commands: ["help"], controls: [] },
    },
    dnsHosts: [{ canonicalName: "web.firma.test", address: "192.168.72.20" }],
    hints: ["Ping und HTTP prüfen unterschiedliche Protokolle und damit unterschiedliche Fehlerbereiche.", "Wenn Host und Dienst aktiv sind, untersuche den TCP-Pfad zum erwarteten Port.", "Vergleiche auf FW1 die Regeln für HTTP und für davon unabhängige Dienste."],
    validate: (state) => state.devices.firewall.firewallRules?.["client-http"]?.action === "allow",
    verification: { anyOf: ["remote-http-service-success"] },
    review: { rootCause: "FW1 blockierte TCP/80 aus dem Clientnetz zu WEB01, obwohl Host, DNS und nginx funktionierten.", explanation: "ICMP für Ping war nicht Teil der TCP-Filterregel. Darum bewies der erfolgreiche Ping nur Host-Erreichbarkeit, nicht den Zugriff auf den Webdienst.", verification: "Der erfolgreiche entfernte HTTP-Aufruf prüft Netzpfad, TCP/80, Firewallregel, Listener und Webdienst gemeinsam. Ping oder ein laufender Dienst allein reichen dafür nicht.", recommendedSequence: ["DNS und Host-Erreichbarkeit prüfen", "HTTP-Fehler reproduzieren", "Webdienst und Listener prüfen", "Firewallregeln lesen und die relevante Regel korrigieren", "HTTP vom Client erneut testen"] },
  },
  {
    public: {
      id: "client-multifault-001", version: 1, kind: "troubleshooting", title: "Neu eingerichteter Client erreicht nicht alle Ziele",
      summary: "Ein neuer Arbeitsplatz erreicht lokale Systeme, aber externe Anwendungen funktionieren nur teilweise oder gar nicht.", category: "Systematische Fehleranalyse",
      difficulty: "Fortgeschritten", estimatedMinutes: 25,
      scenario: "Die BioPC GmbH hat einen neuen Arbeitsplatz eingerichtet. Lokale Systeme sind erreichbar, externe Anwendungen funktionieren jedoch nicht zuverlässig und Aufrufe über Hostnamen schlagen fehl.",
      task: "Analysieren Sie die unterschiedlichen Symptome, korrigieren Sie alle belegten Clientabweichungen und weisen Sie den vollständigen Anwendungszugriff nach.",
      unlockRequirements: normalLabRequirements({ minLevel: 6, requiredModuleIds: ["dns", "netzwerkfehler-systematisch-analysieren"] }), relevantModuleIds: ["dns", "dhcp", "ipv4-grundlagen", "netzwerkfehler-systematisch-analysieren"],
      topology: {
        devices: [
          { id: "client", label: "CLIENT-NEU", type: "windows-client", description: "Neu eingerichteter Arbeitsplatz" },
          { id: "local", label: "FILE01", type: "linux-server", description: "Lokaler Dateiserver" },
          { id: "dns", label: "DNS01", type: "dns-dhcp-server", description: "Interner DNS-Resolver" },
          { id: "router", label: "RTR1", type: "router", description: "Gateway zum externen Netz" },
          { id: "web", label: "PARTNER-WEB", type: "linux-server", description: "Simulierte externe Webanwendung" },
        ], links: [{ from: "client", to: "local", label: "192.168.73.0/24" }, { from: "client", to: "dns" }, { from: "client", to: "router" }, { from: "router", to: "web" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ address: "192.168.73.10", gateway: "192.168.73.254", dnsServer: "192.168.73.254" }) },
      local: { interface: clientInterface({ address: "192.168.73.50", gateway: "192.168.73.1", dnsServer: null }) },
      dns: { interface: clientInterface({ address: "192.168.73.53", gateway: null, dnsServer: null }), services: { dns: "running" } },
      router: { interface: clientInterface({ address: "192.168.73.1", gateway: null, dnsServer: null }), routesExternal: true },
      web: { interface: clientInterface({ address: "203.0.113.90", gateway: null, dnsServer: null }), services: { nginx: "running" } },
    } }, selectedDeviceId: "client",
    deviceRules: {
      client: { commands: ["help", "ipconfig", "ping", "trace", "nslookup", "dig", "http"], controls: manualNetworkControls },
      local: { commands: ["help", "ip-a", "ping"], controls: [] },
      dns: { commands: ["help", "ip-a", "systemctl-status"], controls: [] },
      router: { commands: ["help"], controls: [] },
      web: { commands: ["help", "ip-a", "systemctl-status", "http"], controls: [] },
    },
    dnsHosts: [{ canonicalName: "portal.partner.test", address: "203.0.113.90", aliases: ["www.portal.partner.test"] }],
    hints: ["Prüfe lokale, externe und namensbasierte Ziele getrennt; ein einzelner Erfolg erklärt nicht alle Symptome.", "Vergleiche die Clientwerte mit den tatsächlichen Adressen von RTR1 und DNS01.", "Nach einer ersten Korrektur solltest du erneut prüfen, ob wirklich alle Symptome verschwunden sind."],
    validate: (state) => state.devices.client.interface?.gateway === "192.168.73.1" && state.devices.client.interface?.dnsServer === "192.168.73.53",
    verification: { anyOf: ["remote-http-service-success"] },
    review: { rootCause: "Auf CLIENT-NEU waren sowohl das Standardgateway als auch der DNS-Resolver falsch eingetragen.", explanation: "Lokale Kommunikation funktionierte ohne Gateway. Die falsche Standardroute blockierte externe IP-Ziele, während der falsche Resolver zusätzlich namensbasierte Zugriffe verhinderte. Die Reparatur nur eines Werts beseitigte deshalb nicht den gesamten Vorfall.", verification: "Der erfolgreiche HTTP-Aufruf per Hostname zu portal.partner.test benötigt funktionierende DNS-Auflösung, die korrekte Standardroute, den externen Netzpfad und den Webdienst. Damit beweist er den Ende-zu-Ende-Erfolg beider Reparaturen.", recommendedSequence: ["vollständige Clientkonfiguration lesen", "lokales Ziel testen", "externes Ziel per IP testen", "Namensauflösung getrennt prüfen", "belegte Abweichungen in beliebiger Reihenfolge korrigieren", "Anwendung per Hostname Ende-zu-Ende testen"] },
  },
  {
    public: {
      id: "vlan-firewall-multifault-001", version: 1, kind: "troubleshooting", title: "Portal nach Netzwerkänderung nicht erreichbar",
      summary: "Nach einer Umverkabelung erreicht ein Werkstatt-PC das interne Portal nicht mehr, obwohl der Serverdienst aktiv ist.", category: "Mehrschichtige Fehleranalyse",
      difficulty: "Fortgeschritten", estimatedMinutes: 30,
      scenario: "Nach einer Netzwerkänderung erreicht ein Werkstatt-PC der BioPC GmbH das interne Portal nicht mehr. Der Portalserver ist eingeschaltet und der Dienst läuft; der Vorfall betrifft den geänderten Zugangsweg.",
      task: "Untersuchen Sie den Vorfall über Zugangs-, Host- und Dienstebene hinweg, beheben Sie alle nachgewiesenen Ursachen und verifizieren Sie den vollständigen HTTP-Pfad.",
      unlockRequirements: normalLabRequirements({ minLevel: 7, requiredModuleIds: ["subnetting", "webserver-grundlagen", "netzwerkfehler-systematisch-analysieren"] }), relevantModuleIds: ["subnetting", "webserver-grundlagen", "linux-grundlagen", "netzwerkfehler-systematisch-analysieren"],
      topology: {
        devices: [
          { id: "client", label: "WERKSTATT-PC", type: "linux-client", description: "Client nach Umverkabelung" },
          { id: "switch", label: "SW-WERK1", type: "switch", description: "Managed Access-Switch" },
          { id: "firewall", label: "FW-INTERN", type: "firewall", description: "TCP-Filter vor dem Portal" },
          { id: "web", label: "PORTAL01", type: "linux-server", description: "Interner Portalserver" },
        ], links: [{ from: "client", to: "switch", label: "Gi0/5" }, { from: "web", to: "switch", label: "Gi0/10" }, { from: "switch", to: "firewall", label: "logischer Dienstpfad" }, { from: "firewall", to: "web" }],
      },
    },
    initialState: { devices: {
      client: { interface: clientInterface({ address: "192.168.80.10", gateway: null, dnsServer: null }) },
      switch: { switchPorts: {
        "gi0/5": { mode: "access", vlan: 20, connectedDeviceId: "client" },
        "gi0/10": { mode: "access", vlan: 10, connectedDeviceId: "web" },
      } },
      firewall: { firewallRules: {
        "workshop-http": { sourceNetwork: "192.168.80.0/24", destinationDeviceId: "web", protocol: "tcp", destinationPort: 80, action: "deny" },
        "monitoring-https": { sourceNetwork: "any", destinationDeviceId: "web", protocol: "tcp", destinationPort: 443, action: "allow" },
      } },
      web: { interface: clientInterface({ address: "192.168.80.20", gateway: null, dnsServer: null }), services: { nginx: "running" }, servicePorts: { nginx: 80 } },
    } }, selectedDeviceId: "client",
    deviceRules: {
      client: { commands: ["help", "ip-a", "ping", "http"], controls: [] },
      switch: { commands: ["help", "show-vlan", "show-switchport"], controls: [{ kind: "set-access-vlan", portId: "gi0/5" }] },
      firewall: { commands: ["help", "show-firewall"], controls: [{ kind: "set-firewall-rule-action", ruleId: "workshop-http" }] },
      web: { commands: ["help", "ip-a", "systemctl-status", "http"], controls: [] },
    },
    dnsHosts: [], hints: ["Prüfe den Pfad schichtweise: IP-Konfiguration, lokale Erreichbarkeit und anschließend den Anwendungsport.", "Vergleiche die Access-Zuordnung der beteiligten Switchports und die TCP-Regel für das Portal.", "Nach einer ersten Korrektur solltest du erneut testen und verbleibende Symptome als neuen Befund behandeln."],
    validate: (state) => state.devices.switch.switchPorts?.["gi0/5"]?.vlan === 10 && state.devices.firewall.firewallRules?.["workshop-http"]?.action === "allow",
    verification: { anyOf: ["remote-http-service-success"] },
    review: { rootCause: "Der Clientport Gi0/5 lag im falschen Access-VLAN und FW-INTERN blockierte zusätzlich TCP/80 zum Portal.", explanation: "Die VLAN-Abweichung verhinderte zunächst jede lokale Hostkommunikation. Nach ihrer Korrektur wurde PORTAL01 pingbar, HTTP blieb aber wegen der unabhängigen Filterregel blockiert. Die umgekehrte Reparaturreihenfolge ist ebenso gültig, verändert das anfängliche Symptom jedoch noch nicht sichtbar.", verification: "Nur der erfolgreiche entfernte HTTP-Aufruf von WERKSTATT-PC zu PORTAL01 prüft nach beiden Korrekturen Layer-2-Zugehörigkeit, IP-Pfad, TCP-Filter, Listener und Webdienst gemeinsam. Ein behobener Fehler bedeutet nicht automatisch, dass der gesamte Vorfall gelöst ist.", recommendedSequence: ["Client-IP und lokale Erreichbarkeit prüfen", "Access-Ports und VLAN-Zuordnung untersuchen", "nach jeder Änderung erneut testen", "Dienststatus und TCP-Filterregel prüfen", "HTTP vom ursprünglichen Client Ende-zu-Ende verifizieren"] },
  },
];

const definitions = rawDefinitions.map(completeDeviceModel);

function completeDeviceModel(definition: ServerLabDefinition): ServerLabDefinition {
  const publicDefinition = structuredClone(definition.public);
  const initialState = hydrateCompatibleLabState(definition, definition.initialState);
  const deviceRules = structuredClone(definition.deviceRules) as Record<string, { commands: string[]; controls: LabControlRule[] }>;

  for (const publicDevice of publicDefinition.topology.devices) {
    const state = initialState.devices[publicDevice.id];
    const rules = deviceRules[publicDevice.id];
    if (!state || !rules) throw new TypeError(`Incomplete Lab device definition: ${definition.public.id}:${publicDevice.id}`);
    rules.commands = getDeviceCommandCapabilities(publicDevice.type, state, rules.commands);
  }

  return {
    ...definition,
    public: publicDefinition,
    initialState,
    deviceRules,
    dhcpLease: definition.dhcpLease ? normalizeCanonicalInterface(definition.dhcpLease, "windows-client", true) : undefined,
  };
}

export function hydrateCompatibleLabState(definition: Pick<ServerLabDefinition, "public"> & Partial<Pick<ServerLabDefinition, "initialState">>, state: SimulatedLabState) {
  const hydrated = structuredClone(state);
  for (const publicDevice of definition.public.topology.devices) {
    let device = hydrated.devices[publicDevice.id];
    if (!device && definition.initialState?.devices[publicDevice.id]) {
      device = structuredClone(definition.initialState.devices[publicDevice.id]);
      hydrated.devices[publicDevice.id] = device;
    }
    if (!device) continue;
    device.hostname ??= publicDevice.label;
    if (device.interface) device.interface = normalizeCanonicalInterface(device.interface, publicDevice.type, true);
    if (device.additionalInterfaces) {
      device.additionalInterfaces = Object.fromEntries(Object.entries(device.additionalInterfaces).map(([name, network]) => [name, normalizeCanonicalInterface({ ...network, name }, publicDevice.type, false)]));
    }
    if (publicDevice.type === "router" && device.routesExternal) {
      device.additionalInterfaces = {
        ...(device.additionalInterfaces ?? {}),
        "GigabitEthernet0/1": clientInterface({ name: "GigabitEthernet0/1", address: "203.0.113.1", prefixLength: 24, gateway: null, dnsServer: null }),
      };
      delete device.routesExternal;
    }
    if (publicDevice.type === "firewall" && !device.interface) device.interface = firewallManagementInterface(device);
    if (publicDevice.type === "switch" && !device.switchPorts) device.switchPorts = inferredSwitchPorts(definition.public, publicDevice.id);
    if (device.services) {
      const defaultPorts = Object.fromEntries(Object.keys(device.services).flatMap((service) => {
        const port = defaultServicePort(service);
        return port === undefined ? [] : [[service, port]];
      }));
      device.servicePorts = {
        ...defaultPorts,
        ...(device.servicePorts ?? {}),
      };
    }
  }
  return hydrated;
}

function normalizeCanonicalInterface(network: SimulatedInterface, type: LabPublicDefinition["topology"]["devices"][number]["type"], primary: boolean): SimulatedInterface {
  const values = structuredClone(network);
  delete values.dhcpEnabled;
  const defaultName = type === "windows-client" ? "Ethernet"
    : type === "router" ? primary ? "GigabitEthernet0/0" : "GigabitEthernet0/1"
    : type === "firewall" ? "management0"
    : "eth0";
  const externalGateway = (type === "linux-server" || type === "internet") && values.address?.startsWith("203.0.113.") && values.address !== "203.0.113.1" && values.gateway === null
    ? "203.0.113.1"
    : values.gateway;
  return {
    ...values,
    name: values.name ?? defaultName,
    gateway: externalGateway,
    ipv4Mode: getIpv4Mode(network),
  };
}

function firewallManagementInterface(state: SimulatedLabState["devices"][string]): SimulatedInterface {
  const sourceNetwork = Object.values(state.firewallRules ?? {}).map((rule) => rule.sourceNetwork).find((value) => value !== "any");
  const [network = "192.0.2.0", prefix = "24"] = sourceNetwork?.split("/") ?? [];
  const octets = network.split(".");
  octets[3] = "254";
  return clientInterface({ name: "management0", address: octets.join("."), prefixLength: Number(prefix), gateway: null, dnsServer: null });
}

function inferredSwitchPorts(definition: LabPublicDefinition, switchId: string) {
  const connected = definition.topology.links.flatMap((link) => link.from === switchId ? [link.to] : link.to === switchId ? [link.from] : []);
  return Object.fromEntries(connected.map((connectedDeviceId, index) => [`gi0/${index + 1}`, { mode: "access" as const, vlan: 10, connectedDeviceId }]));
}

function defaultServicePort(service: string) {
  return ({ nginx: 80, "azubi-api": 3000, dns: 53, dhcp: 67, smb: 445 } as const)[service as "nginx" | "azubi-api" | "dns" | "dhcp" | "smb"];
}

const byVersion = new Map(definitions.map((definition) => [`${definition.public.id}:${definition.public.version}`, definition]));
const latest = new Map(definitions.map((definition) => [definition.public.id, definition]));
const catalogueOrder = [
  LAB_TUTORIAL_ID,
  "subnet-client-001",
  "gateway-client-001",
  "prefix-client-001",
  "dns-client-001",
  "dns-record-001",
  "dhcp-client-001",
  "dhcp-options-001",
  "web-service-001",
  "application-backend-001",
  "web-port-001",
  "linux-routing-001",
  "linux-permissions-001",
  "vlan-access-001",
  "firewall-http-001",
  "client-multifault-001",
  "vlan-firewall-multifault-001",
] as const;

export function listCurrentLabDefinitions() {
  return catalogueOrder.map((id) => latest.get(id)!);
}

export function findCurrentLabDefinition(id: string) {
  return latest.get(id);
}

export function findVersionedLabDefinition(id: string, version: number) {
  return byVersion.get(`${id}:${version}`);
}

export function cloneInitialLabState(definition: ServerLabDefinition) {
  const state = structuredClone(definition.initialState);
  state.verificationEvidence = [];
  return state;
}

export function hasRequiredLabVerification(definition: ServerLabDefinition, state: SimulatedLabState) {
  const evidence = new Set(state.verificationEvidence ?? []);
  return definition.verification.anyOf.some((type) => evidence.has(type));
}

export function isLabComplete(definition: ServerLabDefinition, state: SimulatedLabState) {
  return definition.validate(state) && hasRequiredLabVerification(definition, state);
}
