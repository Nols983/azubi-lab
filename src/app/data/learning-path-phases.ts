export const learningPathPhases = [
  {
    id: "it-grundlagen-arbeitsplatz",
    order: 1,
    title: "IT-Grundlagen & Arbeitsplatz",
    description: "Hardware, Clients und Betriebssysteme sicher einordnen und bedienen.",
    moduleSlugs: ["arbeitsplatz-hardware", "datenmengen-zahlensysteme-uebertragungsrechnungen", "clientinstallation-boot-datentraeger", "windows-grundlagen", "linux-grundlagen"],
  },
  {
    id: "netzwerke",
    order: 2,
    title: "Netzwerke",
    description: "Kommunikationsmodelle, Netzstrukturen, Adressierung und zentrale Netzwerkdienste.",
    moduleSlugs: ["osi-tcp-ip-modell", "netzwerk-koppelelemente", "netzwerktopologien", "ipv4-grundlagen", "subnetting", "dhcp", "dns"],
  },
  {
    id: "systeme-storage-betrieb",
    order: 3,
    title: "Systeme, Storage & Betrieb",
    description: "Dienste betreiben, Daten verfügbar halten und Störungen systematisch eingrenzen.",
    moduleSlugs: ["webserver-grundlagen", "active-directory-grundlagen", "virtualisierung-und-cloud", "storage-und-raid", "backup-datensicherung", "netzwerkfehler-systematisch-analysieren"],
  },
  {
    id: "sicherheit-datenschutz",
    order: 4,
    title: "Sicherheit & Datenschutz",
    description: "Systeme schützen und personenbezogene Daten verantwortungsvoll verarbeiten.",
    moduleSlugs: ["it-sicherheit", "datenschutz"],
  },
  {
    id: "entwicklung-planung-wirtschaft",
    order: 5,
    title: "Entwicklung, Planung & Wirtschaft",
    description: "Algorithmen und Modelle verstehen, Projekte planen und Entscheidungen wirtschaftlich begründen.",
    moduleSlugs: ["programmierung-und-pseudocode", "uml-und-datenmodellierung", "projektmanagement", "wirtschaftlichkeit-und-beschaffung", "software-und-lizenzierung", "kundenauftrag-kommunikation-und-vertraege", "qualitaetssicherung-und-uebergabe"],
  },
] as const;

export type LearningPathPhase = (typeof learningPathPhases)[number];
