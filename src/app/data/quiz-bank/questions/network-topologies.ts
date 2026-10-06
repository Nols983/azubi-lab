import type { QuestionBankQuestion } from "../types.ts";

export const networkTopologyQuestions = [
  {
    id: "netzwerktopologien:physical-logical", revision: 1, moduleSlug: "netzwerktopologien", lessonSlug: "was-ist-eine-netzwerktopologie", tags: ["network-topologies"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Welche Aussage unterscheidet physische und logische Topologie korrekt?",
    options: [{ id: "same", label: "Beide müssen in jedem Netz identisch aussehen." }, { id: "physical-only", label: "Nur die physische Sicht ist für Fehlersuche relevant." }, { id: "logical-cables", label: "Die logische Sicht zeigt ausschließlich Kabeltypen und Racks." }, { id: "views", label: "Physisch beschreibt Verbindungen/Medien, logisch Kommunikations- und Verkehrsstrukturen." }],
    correctOptionId: "views", explanation: "Beide Sichten ergänzen sich. VLANs oder Tunnel können logisch anders aussehen als die zugrunde liegende Verkabelung.",
  },
  {
    id: "netzwerktopologien:no-best", revision: 1, moduleSlug: "netzwerktopologien", lessonSlug: "was-ist-eine-netzwerktopologie", tags: ["network-topologies"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Kriterien sind für die Auswahl einer Topologie relevant?",
    options: [{ id: "availability", label: "Verfügbarkeits- und Ausfallanforderungen" }, { id: "alphabet", label: "alphabetische Reihenfolge der Gerätenamen" }, { id: "growth", label: "Skalierung, Bandbreite und erwartetes Wachstum" }, { id: "operations", label: "Kosten, Verkabelung und betriebliche Beherrschbarkeit" }],
    correctOptionIds: ["availability", "growth", "operations"], explanation: "Eine Topologie wird nach technischen und betrieblichen Anforderungen gewählt. Es gibt keine universell beste Grundform.",
  },
  {
    id: "netzwerktopologien:bus-failure", revision: 1, moduleSlug: "netzwerktopologien", lessonSlug: "punkt-zu-punkt-und-bus", tags: ["network-topologies"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Warum konnte eine fehlerhafte Terminierung bei historischem 10BASE2 mehrere Stationen gleichzeitig stören?",
    options: [{ id: "router", label: "Weil jeder Client einen eigenen Router verlor." }, { id: "shared", label: "Weil alle Teilnehmer dasselbe lineare Medium des Busses nutzten." }, { id: "dns", label: "Weil Terminatoren DNS-Anfragen beantworten." }, { id: "mesh", label: "Weil das Netz vollständig vermascht war." }],
    correctOptionId: "shared", explanation: "Im Koax-Bus teilten alle Stationen das Medium. Ein Fehler an Bus oder Terminierung konnte deshalb den gesamten gemeinsamen Abschnitt beeinträchtigen.",
  },
  {
    id: "netzwerktopologien:ring-resilience", revision: 1, moduleSlug: "netzwerktopologien", lessonSlug: "ring", tags: ["network-topologies"], difficulty: "hard", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Wann kann ein Ring einen einzelnen Leitungsfehler ohne vollständigen Kommunikationsausfall überstehen?",
    options: [{ id: "always", label: "Jeder Ring ist allein durch seine Form automatisch redundant." }, { id: "hub", label: "Nur wenn alle Knoten zusätzlich an einem Hub hängen." }, { id: "protection", label: "Wenn ein nutzbarer Gegenweg und ein funktionierendes Schutz-/Umschaltverfahren vorhanden sind." }, { id: "token", label: "Nur wenn IP vollständig deaktiviert wird." }],
    correctOptionId: "protection", explanation: "Redundanz entsteht aus alternativem Pfad, Steuerungsverfahren, unabhängiger Trasse und ausreichender Kapazität – nicht aus der Ringzeichnung allein.",
  },
  {
    id: "netzwerktopologien:star-cable", revision: 1, moduleSlug: "netzwerktopologien", lessonSlug: "stern", tags: ["network-topologies"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "In einem einfachen Ethernet-Stern fällt nur das Patchkabel eines Arbeitsplatzes aus. Was ist typischerweise die direkte Folge?",
    options: [{ id: "all", label: "Alle Switchports verlieren zwingend den Link." }, { id: "router", label: "Das gesamte Routing im Unternehmen wird gelöscht." }, { id: "bus", label: "Das Medium aller Arbeitsplätze wird unterbrochen." }, { id: "one", label: "Der betroffene Arbeitsplatz verliert die Verbindung; andere Äste können weiterarbeiten." }],
    correctOptionId: "one", explanation: "Jeder Endpunkt besitzt im Stern einen eigenen Ast. Ein einzelnes Endkabel ist daher meist lokal begrenzt.",
  },
  {
    id: "netzwerktopologien:star-center", revision: 1, moduleSlug: "netzwerktopologien", lessonSlug: "stern", tags: ["network-topologies"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Aussagen zum Zentrum einer Sterntopologie sind korrekt?",
    options: [{ id: "irrelevant", label: "Ein Ausfall des zentralen Switches betrifft keinen Endpunkt." }, { id: "spf", label: "Ein einzelner zentraler Switch kann ein Single Point of Failure sein." }, { id: "redundancy", label: "Redundante Komponenten und Pfade können das Risiko reduzieren, benötigen aber Design und Tests." }, { id: "cable-all", label: "Jeder einzelne Clientkabelbruch legt automatisch den zentralen Switch lahm." }],
    correctOptionIds: ["spf", "redundancy"], explanation: "Die zentrale Komponente bündelt Abhängigkeiten. Redundanz ist möglich, wirkt aber nur mit korrektem Protokoll-, Pfad- und Betriebsdesign.",
  },
  {
    id: "netzwerktopologien:tree-uplink", revision: 1, moduleSlug: "netzwerktopologien", lessonSlug: "baum", tags: ["network-topologies", "network-diagnostics"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Der einzige Uplink eines Etagen-Switches fällt aus. Clients zeigen weiterhin Link am Access-Port. Welche Deutung passt am besten?",
    options: [{ id: "client-ok", label: "Link am Client beweist Ende-zu-Ende-Erreichbarkeit." }, { id: "dns", label: "Der DNS-Server muss ausgefallen sein." }, { id: "branch", label: "Der lokale Ast hat Link, ist aber von übergeordneten Netzen und Diensten getrennt." }, { id: "fullmesh", label: "Der Baum wird dadurch automatisch zum Full Mesh." }],
    correctOptionId: "branch", explanation: "Ein lokaler Link bestätigt nur den ersten Abschnitt. In einem Baum kann der Uplink-Ausfall den gesamten nachgelagerten Ast isolieren.",
  },
  {
    id: "netzwerktopologien:full-mesh-links", revision: 1, moduleSlug: "netzwerktopologien", lessonSlug: "vermaschte-netze", tags: ["network-topologies"], difficulty: "hard", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Wie viele direkte ungerichtete Verbindungen benötigt ein Full Mesh mit vier Standorten?",
    options: [{ id: "four", label: "4" }, { id: "six", label: "6" }, { id: "eight", label: "8" }, { id: "twelve", label: "12" }],
    correctOptionId: "six", explanation: "Für n Knoten gilt n × (n − 1) / 2. Bei vier Standorten sind das 4 × 3 / 2 = 6 Links.",
  },
  {
    id: "netzwerktopologien:partial-mesh", revision: 1, moduleSlug: "netzwerktopologien", lessonSlug: "vermaschte-netze", tags: ["network-topologies", "routing"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Aussagen beschreiben ein Partial Mesh korrekt?",
    options: [{ id: "selected", label: "Ausgewählte wichtige Knoten oder Pfade erhalten zusätzliche Verbindungen." }, { id: "all", label: "Jeder Knoten ist zwingend direkt mit jedem anderen verbunden." }, { id: "routing", label: "Alternative Links benötigen eine passende Pfadauswahl und Fehlerkonvergenz." }, { id: "independent", label: "Zwei Links sind automatisch physisch und organisatorisch unabhängig." }],
    correctOptionIds: ["selected", "routing"], explanation: "Teilweise Vermaschung setzt Redundanz gezielt ein. Gemeinsame Trassen, Provider oder Geräte können trotzdem gemeinsame Fehlerursachen bilden.",
  },
  {
    id: "netzwerktopologien:hybrid", revision: 1, moduleSlug: "netzwerktopologien", lessonSlug: "hybridtopologien", tags: ["network-topologies"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Etagen nutzen Sterne, Gebäude eine Hierarchie und WAN-Standorte zusätzliche Querverbindungen. Wie wird die Gesamttopologie am besten bezeichnet?",
    options: [{ id: "bus", label: "reiner Bus" }, { id: "ring", label: "reiner Ring" }, { id: "p2p", label: "nur Punkt-zu-Punkt" }, { id: "hybrid", label: "Hybridtopologie" }],
    correctOptionId: "hybrid", explanation: "Reale Netze kombinieren häufig mehrere Grundformen. Die bewusste Kombination wird als Hybridtopologie beschrieben.",
  },
  {
    id: "netzwerktopologien:vlan-trunk", revision: 1, moduleSlug: "netzwerktopologien", lessonSlug: "physische-und-logische-topologie", tags: ["network-topologies", "network-devices"], difficulty: "hard", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Ein Trunk transportiert VLAN 10 und VLAN 20 über ein einziges Kabel. Welche Aussage ist korrekt?",
    options: [{ id: "one-logical", label: "Durch das gemeinsame Kabel werden beide VLANs automatisch eine Broadcast-Domäne." }, { id: "two-cables", label: "Für zwei VLANs müssen im Plan zwingend zwei Kabel existieren." }, { id: "shared-physical", label: "Die VLANs sind logisch getrennt, teilen aber eine physische Ausfallabhängigkeit." }, { id: "no-failure", label: "Ein Trunk kann physisch nicht ausfallen." }],
    correctOptionId: "shared-physical", explanation: "Mehrere logische Netze können dasselbe physische Medium nutzen. Der Linkausfall betrifft beide, ohne ihre logische Trennung aufzuheben.",
  },
  {
    id: "netzwerktopologien:selection", revision: 1, moduleSlug: "netzwerktopologien", lessonSlug: "topologien-praktisch-auswaehlen", tags: ["network-topologies"], difficulty: "hard", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Prüfungen machen eine geplante redundante WAN-Topologie belastbarer?",
    options: [{ id: "drawing", label: "Eine zweite Linie in der Zeichnung genügt als Nachweis." }, { id: "paths", label: "Trassen, Provider, Strom und Geräte auf gemeinsame Fehlerursachen prüfen." }, { id: "capacity", label: "Restkapazität und Routingkonvergenz im Fehlerfall testen." }, { id: "never-test", label: "Umschaltungen im Betrieb nie testen, damit nichts auffällt." }],
    correctOptionIds: ["paths", "capacity"], explanation: "Redundanz benötigt unabhängige Wege, ausreichende Kapazität und getestete Umschaltung. Eine Darstellung allein beweist keine Widerstandsfähigkeit.",
  },
] as const satisfies readonly QuestionBankQuestion[];
