import type { QuestionBankQuestion } from "../types.ts";

export const osiTcpIpQuestions = [
  {
    id: "osi-tcp-ip-modell:models-purpose", revision: 1, moduleSlug: "osi-tcp-ip-modell", lessonSlug: "warum-schichtenmodelle", tags: ["network-models"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Warum sind Schichtenmodelle für Administration und Fehlersuche nützlich?",
    options: [{ id: "literal", label: "Sie schreiben die interne Softwarearchitektur jedes Geräts exakt vor." }, { id: "structure", label: "Sie trennen Aufgaben und schaffen eine gemeinsame Sprache für Abhängigkeiten und Tests." }, { id: "replace", label: "Sie ersetzen Paketmitschnitte und Messungen vollständig." }, { id: "vendor", label: "Sie gelten nur für Geräte eines Herstellers." }],
    correctOptionId: "structure", explanation: "Schichtenmodelle strukturieren Aufgaben und Schnittstellen. Sie sind Denk- und Kommunikationsmodelle, keine exakte Implementierungsvorschrift und kein Ersatz für Evidenz.",
  },
  {
    id: "osi-tcp-ip-modell:models-limits", revision: 1, moduleSlug: "osi-tcp-ip-modell", lessonSlug: "warum-schichtenmodelle", tags: ["network-models"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Aussagen beschreiben den fachlich richtigen Umgang mit OSI?",
    options: [{ id: "tool", label: "OSI ist ein konzeptionelles Werkzeug zur Einordnung." }, { id: "implementation", label: "Jede reale Anwendung besitzt zwingend sieben getrennte Softwaremodule." }, { id: "cross", label: "Reale Protokolle können je nach Betrachtung Aufgaben mehrerer Schichten berühren." }, { id: "proof", label: "Eine erfolgreiche Prüfung auf einer Schicht beweist automatisch alle höheren Schichten." }],
    correctOptionIds: ["tool", "cross"], explanation: "OSI hilft beim Einordnen, darf aber nicht als wörtlicher Bauplan behandelt werden. Reale Protokolle passen nicht immer perfekt in genau ein Kästchen.",
  },
  {
    id: "osi-tcp-ip-modell:seven-pdu", revision: 1, moduleSlug: "osi-tcp-ip-modell", lessonSlug: "die-sieben-osi-schichten", tags: ["network-models"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Welche Zuordnung einer Protokolldateneinheit ist korrekt?",
    options: [{ id: "ip-frame", label: "IP-Paket = Layer-2-Frame" }, { id: "bits-l7", label: "Bits = Anwendungsschicht" }, { id: "tcp-packet", label: "TCP-Segment = Vermittlungsschicht" }, { id: "ethernet-frame", label: "Ethernet-Frame = Sicherungsschicht" }],
    correctOptionId: "ethernet-frame", explanation: "Ethernet transportiert Frames auf Layer 2. Darin kann ein IP-Paket liegen, das wiederum ein TCP-Segment enthalten kann.",
  },
  {
    id: "osi-tcp-ip-modell:l2-address", revision: 1, moduleSlug: "osi-tcp-ip-modell", lessonSlug: "osi-schichten-1-bis-3", tags: ["network-models", "network-devices"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Welche Information wertet ein gewöhnlicher Layer-2-Switch primär für die Weiterleitung eines Ethernet-Frames aus?",
    options: [{ id: "url", label: "die URL" }, { id: "mac", label: "die Ziel-MAC-Adresse im jeweiligen VLAN" }, { id: "tcp", label: "den TCP-Zielport" }, { id: "route", label: "die Internet-Routingtabelle" }],
    correctOptionId: "mac", explanation: "Ein Layer-2-Switch trifft seine normale Forwarding-Entscheidung anhand von MAC-Tabelle, Ziel-MAC und VLAN-Kontext.",
  },
  {
    id: "osi-tcp-ip-modell:routing-layer", revision: 1, moduleSlug: "osi-tcp-ip-modell", lessonSlug: "osi-schichten-1-bis-3", tags: ["network-models", "routing"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Zwei verschiedene IPv4-Subnetze sollen kommunizieren. Welche OSI-Ebene stellt die notwendige Kernfunktion bereit?",
    options: [{ id: "presentation", label: "Schicht 6 – Darstellung" }, { id: "physical", label: "Schicht 1 – Bitübertragung" }, { id: "network", label: "Schicht 3 – Vermittlung" }, { id: "session", label: "Schicht 5 – Sitzung" }],
    correctOptionId: "network", explanation: "Routing zwischen IP-Netzen ist eine Layer-3-Aufgabe. Kabel und Frames sind Voraussetzungen, verbinden aber allein keine unterschiedlichen IP-Subnetze.",
  },
  {
    id: "osi-tcp-ip-modell:transport-tcp", revision: 1, moduleSlug: "osi-tcp-ip-modell", lessonSlug: "osi-schichten-4-bis-7", tags: ["network-models", "transport-ports"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Wo wird TCP im OSI-Modell typischerweise eingeordnet?",
    options: [{ id: "l2", label: "Schicht 2 – Sicherung" }, { id: "l7", label: "Schicht 7 – Anwendung" }, { id: "l4", label: "Schicht 4 – Transport" }, { id: "l1", label: "Schicht 1 – Bitübertragung" }],
    correctOptionId: "l4", explanation: "TCP löst Ende-zu-Ende-Transportaufgaben wie Sequenzierung, Bestätigung und Flusssteuerung und gehört typischerweise zu Layer 4.",
  },
  {
    id: "osi-tcp-ip-modell:udp-properties", revision: 1, moduleSlug: "osi-tcp-ip-modell", lessonSlug: "osi-schichten-4-bis-7", tags: ["network-models", "transport-ports"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Aussagen über UDP sind korrekt?",
    options: [{ id: "ordered", label: "UDP garantiert selbst eine geordnete Zustellung aller Datagramme." }, { id: "connectionless", label: "UDP ist im Basisprotokoll verbindungslos." }, { id: "no-ports", label: "UDP verwendet keine Portnummern." }, { id: "app", label: "Eine Anwendung kann bei Bedarf eigene Zuverlässigkeitsmechanismen ergänzen." }],
    correctOptionIds: ["connectionless", "app"], explanation: "UDP ist datagrammorientiert und verbindungslos, verwendet aber Ports. Zustell- oder Reihenfolgegarantien müssten bei Bedarf auf einer anderen Ebene ergänzt werden.",
  },
  {
    id: "osi-tcp-ip-modell:tcpip-application", revision: 1, moduleSlug: "osi-tcp-ip-modell", lessonSlug: "tcp-ip-modell", tags: ["network-models"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Welche OSI-Bereiche fasst die Anwendungsschicht des vierstufigen TCP/IP-Modells grob zusammen?",
    options: [{ id: "upper", label: "OSI 5 bis 7" }, { id: "lower", label: "OSI 1 bis 3" }, { id: "transport", label: "nur OSI 4" }, { id: "physical", label: "nur OSI 1" }],
    correctOptionId: "upper", explanation: "Die TCP/IP-Anwendungsschicht bündelt grob Sitzungs-, Darstellungs- und Anwendungsaufgaben der OSI-Schichten 5 bis 7.",
  },
  {
    id: "osi-tcp-ip-modell:mapping", revision: 1, moduleSlug: "osi-tcp-ip-modell", lessonSlug: "osi-und-tcp-ip-vergleichen", tags: ["network-models"], difficulty: "hard", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche groben Zuordnungen zwischen TCP/IP und OSI sind fachlich sinnvoll?",
    options: [{ id: "access", label: "TCP/IP-Netzzugang ↔ OSI 1 und 2" }, { id: "internet-l7", label: "TCP/IP-Internet ↔ OSI 7" }, { id: "internet-l3", label: "TCP/IP-Internet ↔ OSI 3" }, { id: "transport-l4", label: "TCP/IP-Transport ↔ OSI 4" }],
    correctOptionIds: ["access", "internet-l3", "transport-l4"], explanation: "Netzzugang bündelt grob OSI 1/2, Internet entspricht funktional OSI 3 und Transport OSI 4. Die Abbildung bleibt ein Modell und ist nicht überall eins zu eins.",
  },
  {
    id: "osi-tcp-ip-modell:encapsulation-order", revision: 1, moduleSlug: "osi-tcp-ip-modell", lessonSlug: "kapselung-und-datenfluss", tags: ["network-models", "http"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Welche Reihenfolge beschreibt die Kapselung einer klassischen HTTP-Kommunikation über TCP, IP und Ethernet?",
    options: [{ id: "wrong-a", label: "Frame → HTTP → Paket → Segment" }, { id: "wrong-b", label: "Paket → Bits → HTTP → Frame" }, { id: "correct", label: "HTTP-Daten → TCP-Segment → IP-Paket → Ethernet-Frame → Bits" }, { id: "wrong-c", label: "Bits → TCP-Segment → DNS-Zone → Frame" }],
    correctOptionId: "correct", explanation: "Jede untere Ebene kapselt die PDU der oberen Ebene: Anwendungsdaten werden Transportnutzlast, dann IP-Nutzlast und schließlich Frame-Nutzlast.",
  },
  {
    id: "osi-tcp-ip-modell:router-frame", revision: 1, moduleSlug: "osi-tcp-ip-modell", lessonSlug: "kapselung-und-datenfluss", tags: ["network-models", "routing"], difficulty: "hard", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Was geschieht beim normalen Weiterleiten eines IP-Pakets über einen Router zum nächsten Ethernet-Link?",
    options: [{ id: "same-frame", label: "Der ursprüngliche Ethernet-Frame bleibt unverändert bis zum Zielhost bestehen." }, { id: "dns", label: "Der Router ersetzt die Ziel-IP durch den DNS-Namen." }, { id: "tcp", label: "Der Router vergibt einen neuen TCP-Port." }, { id: "new-frame", label: "Der Router entfernt den eingehenden Layer-2-Frame und kapselt das Paket passend für den nächsten Link neu." }],
    correctOptionId: "new-frame", explanation: "Layer-2-Frames gelten für einen lokalen Abschnitt. Der Router trifft die IP-Entscheidung und erzeugt für den nächsten Link einen neuen passenden Frame.",
  },
  {
    id: "osi-tcp-ip-modell:troubleshoot-https", revision: 1, moduleSlug: "osi-tcp-ip-modell", lessonSlug: "fehlersuche-mit-schichtenmodell", tags: ["network-models", "network-diagnostics"], difficulty: "hard", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Ping zur Server-IP funktioniert, HTTPS auf TCP 443 läuft jedoch in einen Timeout. Was ist die stärkste nächste Untersuchung?",
    options: [{ id: "cable", label: "Ohne weitere Messung alle Patchkabel ersetzen." }, { id: "service", label: "TCP-Pfad/Port 443, Filter und Webdienst gezielt prüfen." }, { id: "ip-proven", label: "Den Vorfall schließen, weil IP und damit jede höhere Schicht bewiesen ist." }, { id: "dhcp", label: "Zwingend den DHCP-Server neu installieren." }],
    correctOptionId: "service", explanation: "Ping liefert begrenzte ICMP-/IP-Evidenz. TCP 443, TLS und Webdienst sind getrennt zu testen; der Erfolg einer unteren Ebene beweist sie nicht.",
  },
] as const satisfies readonly QuestionBankQuestion[];
