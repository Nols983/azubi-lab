import type { LearningCategory } from "./learning-modules";

export type LearningAreaContent = { title: LearningCategory; description: string; abbreviation: string };
export const dashboardDailyChallenge = { question: "Ein Client erhält die Adresse 169.254.23.17. Was könnte die Ursache sein?", duration: "ca. 5 Minuten" };
export const dashboardLearningAreas: LearningAreaContent[] = [
  { title: "Netzwerke", description: "Adressierung, Routing und Netzwerkdienste", abbreviation: "NW" },
  { title: "Betriebssysteme", description: "Windows, Linux und Administration", abbreviation: "OS" },
  { title: "Server & Dienste", description: "Verzeichnis-, Datei-, Web- und Cloud-Dienste", abbreviation: "SD" },
  { title: "Troubleshooting", description: "Fehler systematisch eingrenzen und lösen", abbreviation: "TS" },
  { title: "Entwicklung & Planung", description: "Software, Modelle, Kundenaufträge und Qualität", abbreviation: "EP" },
];
