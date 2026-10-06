import type { QuestionBankQuestion } from "../types.ts";

export const networkDeviceQuestions = [
  {
    id: "netzwerk-koppelelemente:device-information", revision: 1, moduleSlug: "netzwerk-koppelelemente", lessonSlug: "warum-netzwerke-gekoppelt-werden", tags: ["network-devices", "network-models"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Welche Zuordnung beschreibt die primäre Weiterleitungsinformation richtig?",
    options: [{ id: "hub-ip", label: "Hub – Ziel-IP-Adresse" }, { id: "router-mac", label: "Router – ausschließlich Ziel-MAC-Adresse" }, { id: "switch-mac", label: "Layer-2-Switch – Ziel-MAC-Adresse im VLAN" }, { id: "repeater-port", label: "Repeater – TCP-Zielport" }],
    correctOptionId: "switch-mac", explanation: "Ein Layer-2-Switch nutzt MAC- und VLAN-Kontext. Hub und Repeater treffen keine Adressentscheidung; Router werten für Routing die Ziel-IP aus.",
  },
  {
    id: "netzwerk-koppelelemente:multifunction", revision: 1, moduleSlug: "netzwerk-koppelelemente", lessonSlug: "warum-netzwerke-gekoppelt-werden", tags: ["network-devices"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Aussagen zu Multifunktionsgeräten sind korrekt?",
    options: [{ id: "roles", label: "Ein Gehäuse kann Switch-, Router-, Access-Point- und Firewall-Funktionen vereinen." }, { id: "name", label: "Der Produktname allein beweist den tatsächlichen Datenpfad." }, { id: "same", label: "Access Point und Router sind deshalb immer dieselbe Funktion." }, { id: "analyze", label: "Für Diagnose und Planung müssen die aktiven Rollen getrennt betrachtet werden." }],
    correctOptionIds: ["roles", "analyze"], explanation: "Kombigeräte vereinen Rollen, aber die Funktionen bleiben fachlich unterscheidbar. Konfiguration und Datenpfad sind entscheidend.",
  },
  {
    id: "netzwerk-koppelelemente:hub-behavior", revision: 1, moduleSlug: "netzwerk-koppelelemente", lessonSlug: "repeater-und-hub", tags: ["network-devices"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Wie behandelt ein klassischer Ethernet-Hub eingehende Bits?",
    options: [{ id: "route", label: "Er routet sie anhand des IP-Präfixes." }, { id: "repeat", label: "Er wiederholt sie an alle anderen Ports, ohne MAC-Adressen zu lernen." }, { id: "known", label: "Er sendet nur an den Port der bekannten Ziel-MAC." }, { id: "encrypt", label: "Er verschlüsselt sie vor der Weiterleitung." }],
    correctOptionId: "repeat", explanation: "Ein Hub ist ein Multiport-Repeater auf Layer 1. Er besitzt keine MAC-Tabelle und keine gezielte Frameweiterleitung.",
  },
  {
    id: "netzwerk-koppelelemente:hub-to-switch", revision: 1, moduleSlug: "netzwerk-koppelelemente", lessonSlug: "repeater-und-hub", tags: ["network-devices"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Ein Hub wird ohne VLAN- oder Routeränderung durch einen Switch ersetzt. Was ist korrekt?",
    options: [{ id: "broadcast-port", label: "Jeder Port wird automatisch eine eigene Broadcast-Domäne." }, { id: "subnets", label: "Der Switch erzeugt automatisch neue IP-Subnetze." }, { id: "routing", label: "Alle Ports routen ab jetzt zwischen Netzen." }, { id: "collisions", label: "Kollisionsbereiche werden portweise getrennt; das VLAN bleibt eine gemeinsame Broadcast-Domäne." }],
    correctOptionId: "collisions", explanation: "Switchlinks trennen klassische Kollisionsbereiche und bekannte Unicasts werden gezielt. Broadcasts bleiben innerhalb desselben VLANs gemeinsam.",
  },
  {
    id: "netzwerk-koppelelemente:bridge-switch", revision: 1, moduleSlug: "netzwerk-koppelelemente", lessonSlug: "bridge-und-switch", tags: ["network-devices"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Aussagen zu Bridge und Switch stimmen?",
    options: [{ id: "router", label: "Beide müssen IP-Pakete zwischen Subnetzen routen." }, { id: "l2", label: "Beide können Layer-2-Frames anhand gelernter MAC-Adressen filtern oder weiterleiten." }, { id: "multiport", label: "Ein moderner Switch lässt sich konzeptionell als leistungsfähige Multiport-Bridge verstehen." }, { id: "broadcast-stop", label: "Beide stoppen jeden Broadcast an jedem Port." }],
    correctOptionIds: ["l2", "multiport"], explanation: "Bridge und Switch teilen die MAC-basierte Layer-2-Grundlogik. Routing und vollständiges Stoppen von Broadcasts gehören nicht automatisch dazu.",
  },
  {
    id: "netzwerk-koppelelemente:switch-learning", revision: 1, moduleSlug: "netzwerk-koppelelemente", lessonSlug: "wie-ein-switch-lernt", tags: ["network-devices"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Aus welchem Feld lernt ein Layer-2-Switch normalerweise, an welchem Port ein Gerät erreichbar ist?",
    options: [{ id: "source", label: "aus der Quell-MAC-Adresse eingehender Frames" }, { id: "destination-ip", label: "aus der Ziel-IP-Adresse" }, { id: "dns", label: "aus der DNS-Antwort" }, { id: "tcp", label: "aus dem TCP-Quellport" }],
    correctOptionId: "source", explanation: "Der Switch lernt Quell-MAC, VLAN und Eingangsport. Die Ziel-MAC dient anschließend zur Suche nach dem Ausgangsport.",
  },
  {
    id: "netzwerk-koppelelemente:unknown-unicast", revision: 1, moduleSlug: "netzwerk-koppelelemente", lessonSlug: "wie-ein-switch-lernt", tags: ["network-devices"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Wie behandelt ein Switch einen Unicast zu einer im VLAN noch unbekannten Ziel-MAC?",
    options: [{ id: "drop", label: "Er verwirft jeden unbekannten Unicast zwingend." }, { id: "route", label: "Er sendet ihn an das Default Gateway, unabhängig vom Frame." }, { id: "flood", label: "Er flutet ihn an die anderen geeigneten Ports desselben VLANs." }, { id: "all-vlans", label: "Er flutet ihn durch alle VLANs und Routergrenzen." }],
    correctOptionId: "flood", explanation: "Unknown Unicast wird innerhalb der betreffenden Layer-2-Domäne geflutet. Sobald das Ziel selbst sendet, kann der Switch dessen Quell-MAC lernen.",
  },
  {
    id: "netzwerk-koppelelemente:router-subnets", revision: 1, moduleSlug: "netzwerk-koppelelemente", lessonSlug: "router", tags: ["network-devices", "routing"], difficulty: "easy", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Welches Gerät beziehungsweise welche Funktion wird benötigt, damit zwei verschiedene IP-Subnetze regulär kommunizieren?",
    options: [{ id: "hub", label: "ein Hub" }, { id: "router", label: "eine Router- oder Layer-3-Funktion mit passenden Routen" }, { id: "repeater", label: "ein Repeater" }, { id: "converter", label: "ein reiner Medienkonverter" }],
    correctOptionId: "router", explanation: "Zwischen IP-Netzen ist Layer-3-Routing erforderlich. Layer-1- und reine Layer-2-Funktionen stellen diese Route nicht bereit.",
  },
  {
    id: "netzwerk-koppelelemente:router-domains", revision: 1, moduleSlug: "netzwerk-koppelelemente", lessonSlug: "router", tags: ["network-devices", "routing"], difficulty: "hard", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Welche Aussagen über Router sind richtig?",
    options: [{ id: "ip", label: "Sie wählen Wege anhand von Ziel-IP und Routinginformationen." }, { id: "all-broadcast", label: "Sie kopieren jeden Layer-2-Broadcast automatisch in alle Netze." }, { id: "separate", label: "Geroutete Schnittstellen trennen Layer-2-Broadcast-Domänen." }, { id: "same-nat", label: "Routing und NAT sind exakt dieselbe Funktion." }],
    correctOptionIds: ["ip", "separate"], explanation: "Router treffen Layer-3-Entscheidungen und begrenzen Layer-2-Broadcasts. NAT kann zusätzlich eingesetzt werden, ist aber nicht Routing selbst.",
  },
  {
    id: "netzwerk-koppelelemente:gateway-context", revision: 1, moduleSlug: "netzwerk-koppelelemente", lessonSlug: "gateway", tags: ["network-devices", "routing"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Was ist das Default Gateway eines Clients?",
    options: [{ id: "dns", label: "immer der autoritative DNS-Server" }, { id: "switch", label: "immer der erste Layer-2-Switchport" }, { id: "protocol", label: "zwingend ein Anwendungs-Protokollkonverter" }, { id: "next-hop", label: "der konfigurierte Next Hop für Ziele ohne spezifischere passende Route" }],
    correctOptionId: "next-hop", explanation: "Das Default Gateway ist aus Sicht des Clients der nächste Layer-3-Hop für nicht lokal beziehungsweise nicht spezifischer geroutete Ziele.",
  },
  {
    id: "netzwerk-koppelelemente:access-point", revision: 1, moduleSlug: "netzwerk-koppelelemente", lessonSlug: "access-point-modem-medienkonverter", tags: ["network-devices"], difficulty: "medium", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "single-choice",
    prompt: "Mobilgeräte sollen per WLAN in ein bestehendes Client-VLAN eingebunden werden. Welche Funktion passt primär?",
    options: [{ id: "modem", label: "ein Modem zur Provider-Signalumsetzung" }, { id: "ap", label: "ein Access Point als WLAN-Zugang und Layer-2-Bridge" }, { id: "router-required", label: "zwingend ein zusätzlicher NAT-Router pro Client" }, { id: "hub", label: "ein klassischer Ethernet-Hub" }],
    correctOptionId: "ap", explanation: "Ein Access Point verbindet WLAN-Teilnehmer mit der kabelgebundenen Layer-2-Infrastruktur. Routing kann separat vorhanden sein, ist aber nicht die AP-Kernfunktion.",
  },
  {
    id: "netzwerk-koppelelemente:domains-selection", revision: 1, moduleSlug: "netzwerk-koppelelemente", lessonSlug: "collision-und-broadcast-domains", tags: ["network-devices"], difficulty: "hard", practiceEligible: true, completionEligible: true, shuffleOptions: true, type: "multiple-selection",
    prompt: "Ein 24-Port-Switch nutzt VLAN 10 und VLAN 20; alle Endgeräte arbeiten Full-Duplex. Welche Aussagen stimmen?",
    options: [{ id: "one-broadcast", label: "Alle Ports bilden trotz der VLANs genau eine Broadcast-Domäne." }, { id: "two-broadcast", label: "Es bestehen zwei Layer-2-Broadcast-Domänen, je eine pro VLAN." }, { id: "hub-collision", label: "Alle Endgeräte teilen die Kollisionsdomäne eines Hubs." }, { id: "links", label: "Die Switchlinks sind getrennte Full-Duplex-Verbindungen ohne klassische Hub-Kollisionen." }],
    correctOptionIds: ["two-broadcast", "links"], explanation: "VLANs trennen Broadcast-Domänen. Moderne Full-Duplex-Switchlinks teilen nicht den klassischen Kollisionsbereich eines Hubs.",
  },
] as const satisfies readonly QuestionBankQuestion[];
