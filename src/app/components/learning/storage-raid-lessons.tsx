import type { ReactNode } from "react";
import { calculateRaidUsableCapacity, type RaidLevel } from "../../lib/raid-capacity";
import { FundamentalsLesson, ResponsiveTable, TextFlow, type LessonSection } from "./fundamentals-lesson-elements";
import { SingleChoiceCheck } from "./single-choice-check";

type LessonContent = { objectives: readonly string[]; intro: ReactNode; sections: readonly LessonSection[]; visual?: ReactNode; scenario: { title: string; situation: ReactNode; tasks: readonly ReactNode[]; solution: ReactNode }; takeaway: readonly ReactNode[] };
const cap = (level: RaidLevel, drives: readonly number[]) => `${calculateRaidUsableCapacity(level, drives)} TB`;

const levelRows = [
  ["RAID 0", "2", "Striping", "n × kleinste Platte", "keine"],
  ["RAID 1", "2", "Mirroring", "kleinste Platte (ein Spiegelset)", "Spiegel bleibt nutzbar"],
  ["RAID 5", "3", "verteilte einfache Parität", "(n − 1) × kleinste Platte", "eine Platte"],
  ["RAID 6", "4", "verteilte doppelte Parität", "(n − 2) × kleinste Platte", "zwei Platten"],
  ["RAID 10", "4, gerade", "gestripe Spiegelpaare", "n ÷ 2 × kleinste Platte", "abhängig von betroffenen Spiegelpaaren"],
] as const;

const lessons: Record<string, LessonContent> = {
  "raid-grundlagen": {
    objectives: ["Zweck und Grenze von RAID erklären", "Striping, Mirroring und Parität unterscheiden", "Hardware- und Software-RAID einordnen", "Kapazität und Fehlertoleranz getrennt bewerten"],
    intro: <p>RAID fasst Laufwerke zu einem logischen Verbund zusammen. Je nach Level stehen Leistung, nutzbare Kapazität oder Weiterbetrieb bei bestimmten Plattenausfällen im Vordergrund. <strong>RAID ist kein Backup.</strong></p>,
    sections: [
      { title: "Drei Bausteine", paragraphs: [<>Striping verteilt Datenblöcke über Laufwerke. Mirroring hält gleiche Daten auf Spiegelmitgliedern. Parität speichert berechnete Zusatzinformation, aus der fehlende Blöcke innerhalb der Levelgrenzen rekonstruiert werden können.</>, <>Nutzbare Kapazität und Fehlertoleranz sind Trade-offs. Auch ein redundanter Verbund kann während eines Rebuilds langsamer und stärker belastet sein.</>] },
      { title: "Controller und Umsetzung", paragraphs: [<>Hardware-RAID nutzt einen dedizierten Controller; Software-RAID wird vom Betriebssystem verwaltet. Entscheidend sind Treiber, Monitoring, Cache-/Stromschutz, Austauschbarkeit und dokumentierte Wiederherstellung – nicht nur das Etikett.</>, <>Ein Hot Spare ist ein ungenutztes, eingebundenes Ersatzlaufwerk, das einen Rebuild automatisch starten kann. Es ist keine zusätzliche Datenkopie und verhindert den ursprünglichen Ausfall nicht.</>] },
    ],
    visual: <TextFlow caption="Vom Normalbetrieb zum Wiederaufbau" steps={["Verbund gesund", "Platte fällt aus", "degradierter Betrieb", "Ersatz/Hot Spare", "Rebuild und Prüfung"]} />,
    scenario: { title: "Controller meldet degraded", situation: <p>Ein Dateiserver arbeitet nach einem Plattenausfall weiter. Die Oberfläche zeigt „degraded“.</p>, tasks: ["Was bedeutet der Zustand?", "Welche nächsten Schritte sind angemessen?"], solution: <p>Der Verbund hat Redundanz verloren oder reduziert und ist gefährdeter. Ereignis prüfen, aktuelles Backup verifizieren, kompatibles Ersatzlaufwerk und Herstellerverfahren nutzen, Rebuild/Last überwachen und anschließend Konsistenz sowie Alarmierung prüfen.</p> },
    takeaway: ["RAID kombiniert Laufwerke mit unterschiedlichen Zielen.", "Degraded bedeutet eingeschränkte Redundanz, nicht automatisch Datenverlust.", "Monitoring und getestete Backups bleiben notwendig."],
  },
  "raid-0-und-raid-1": {
    objectives: ["RAID 0 und 1 vergleichen", "Kapazität berechnen", "Ausfallfolgen erklären", "Löschung von Plattenausfall unterscheiden"],
    intro: <p>RAID 0 und 1 zeigen den Grundkonflikt besonders klar: Striping nutzt Kapazität und parallelisiert Zugriffe, Mirroring investiert Kapazität in Redundanz.</p>,
    sections: [
      { title: "RAID 0: Leistung ohne Redundanz", paragraphs: [<>Mindestens zwei Laufwerke werden gestriped. Bei gleich großen Laufwerken ist die volle Summe nutzbar. Fällt ein Mitglied aus, fehlen verteilte Blöcke und die Array-Daten sind als Ganzes nicht mehr zuverlässig nutzbar.</>], note: <>RAID 0 trägt die Zahl „RAID“, bietet aber keine Fehlertoleranz. Es passt nur, wenn der Verlust akzeptabel ist oder Daten anderweitig reproduzierbar und gesichert sind.</> },
      { title: "RAID 1: Spiegelung", paragraphs: [<>Mindestens zwei Laufwerke halten denselben Datenstand. Im üblichen Zwei-Platten-Spiegel entspricht die nutzbare Kapazität der kleineren Platte. Lesen kann profitieren; Schreibvorgänge müssen gespiegelt werden.</>, <>RAID 1 schützt vor dem Ausfall eines Spiegelmitglieds, aber nicht vor logischen Änderungen: Eine gelöschte Datei wird auf dem Spiegel ebenfalls gelöscht.</>] },
    ],
    visual: <ResponsiveTable caption="RAID 0 und RAID 1" headers={["Level", "4 × 4 TB nutzbar", "Plattenausfall", "typischer Trade-off"]} rows={[["RAID 0", cap("0", [4,4,4,4]), "ein Ausfall zerstört Verbunddaten", "Kapazität/Tempo statt Redundanz"], ["RAID 1 (Vierfachspiegel)", cap("1", [4,4,4,4]), "weitere Spiegel können bleiben", "hohe Redundanz, geringe Kapazität"]]} />,
    scenario: { title: "Gelöschter Projektordner", situation: <p>Ein Ordner wird auf einem RAID 1 versehentlich gelöscht.</p>, tasks: ["Stellt der Spiegel den Ordner wieder her?", "Was wird stattdessen benötigt?"], solution: <p>Nein. Die Löschung gehört zum aktuellen Datenstand und wird gespiegelt. Benötigt wird eine unabhängige Sicherung mit einer passenden älteren Version und geprüftem Restore.</p> },
    takeaway: ["RAID 0 hat keine Redundanz.", "RAID 1 spiegelt den aktuellen Zustand.", "Weder Level ersetzt historische, getrennte Backups."],
  },
  "raid-5-und-raid-6": {
    objectives: ["verteilte Parität erklären", "RAID-5/6-Kapazität berechnen", "Fehlertoleranz korrekt benennen", "Rebuild-Risiken berücksichtigen"],
    intro: <p>RAID 5 und 6 verteilen Daten und Paritätsinformation über alle Mitglieder. Es gibt nicht einfach „die Paritätsplatte“; die Paritätsblöcke wechseln zwischen den Laufwerken.</p>,
    sections: [
      { title: "RAID 5", paragraphs: [<>Mindestens drei Laufwerke. Nutzbar sind <strong>(n − 1) × kleinste Laufwerkskapazität</strong>. Der Verbund toleriert einen Plattenausfall; ein zweiter Ausfall vor Abschluss des Rebuilds führt zum Verlust des Verbunds.</>, <>Schreibvorgänge verursachen Paritätsarbeit. Workload, Controller, Cache und Laufwerksanzahl bestimmen die reale Leistung.</>] },
      { title: "RAID 6", paragraphs: [<>Mindestens vier Laufwerke. Nutzbar sind <strong>(n − 2) × kleinste Laufwerkskapazität</strong>. Zwei Platten dürfen ausfallen, doch auch hier sind Rebuild, weitere Fehler und Backup entscheidend.</>, <>Doppelte Parität kostet mehr Kapazität und Schreibaufwand, kann aber bei großen Arrays oder langen Rebuild-Zeiten angemessen sein.</>] },
    ],
    visual: <ResponsiveTable caption="Paritätslevel mit 4 × 4 TB" headers={["Level", "Formel", "nutzbar", "tolerierte Plattenausfälle"]} rows={[["RAID 5", "(4 − 1) × 4 TB", cap("5", [4,4,4,4]), "1"], ["RAID 6", "(4 − 2) × 4 TB", cap("6", [4,4,4,4]), "2"]]} />,
    scenario: { title: "Große Laufwerke, langer Rebuild", situation: <p>Ein Storage mit großen Laufwerken soll auch während eines Rebuilds möglichst robust bleiben.</p>, tasks: ["Was spricht für RAID 6 gegenüber RAID 5?", "Welche Annahmen müssen geprüft werden?"], solution: <p>RAID 6 toleriert einen zweiten Plattenausfall. Zu prüfen sind Workload, Arraygröße, Rebuild-Dauer, Performance, Controller, Fehlerkorrelation, Budget und das unabhängige Backup; die Wahl ist nicht universell.</p> },
    takeaway: ["RAID 5 reserviert rechnerisch eine, RAID 6 zwei Laufwerkskapazitäten.", "Parität ist verteilt.", "Rebuild-Zeit und Workload gehören zur Risikobewertung."],
  },
  "raid-10-rebuild-und-hot-spare": {
    objectives: ["RAID 10 erklären", "Ausfalltoleranz spiegelpaarbezogen beurteilen", "Rebuild und Hot Spare einordnen", "Betriebsrisiken dokumentieren"],
    intro: <p>RAID 10 stripet über Spiegelpaare und benötigt mindestens vier sowie üblicherweise eine gerade Anzahl Laufwerke. Die nutzbare Kapazität liegt bei gleich großen Laufwerken ungefähr bei 50 Prozent.</p>,
    sections: [
      { title: "Welche Ausfälle sind möglich?", paragraphs: [<>RAID 10 kann mehrere Plattenausfälle überstehen, <strong>wenn nicht beide Mitglieder desselben Spiegelpaares ausfallen</strong>. Deshalb ist „toleriert immer zwei“ ebenso falsch wie „toleriert nur einen“.</>, <>Mit 4 × 4 TB sind typischerweise 8 TB nutzbar. Lese- und Schreibverhalten ist oft günstig, aber Layout, Queue, Controller und Workload bleiben relevant.</>] },
      { title: "Rebuild ist eine Risikophase", paragraphs: [<>Beim Rebuild werden Daten rekonstruiert oder gespiegelt. Das belastet verbleibende Mitglieder; Priorität und Dauer müssen gegen Produktionslast abgewogen werden.</>, <>Ein Hot Spare verkürzt die Zeit bis zum Rebuild-Start, ersetzt jedoch keine Überwachung, keinen geplanten Austausch und kein Backup. Ersatzmedien sollten kompatibel und mindestens ausreichend groß sein.</>] },
    ],
    visual: <ResponsiveTable caption="Vier-Platten-RAID-10: Beispiele" headers={["Ausfall", "Ergebnis", "Begründung"]} rows={[["eine Platte", "weiter nutzbar", "ihr Spiegelpartner hält Daten"], ["je eine Platte aus zwei Paaren", "kann weiter nutzbar sein", "jedes Paar besitzt noch ein Mitglied"], ["beide Platten eines Paares", "Verbund fällt aus", "ein Stripe-Anteil fehlt vollständig"]]} />,
    scenario: { title: "Hot Spare vorhanden", situation: <p>Ein RAID 10 besitzt ein zusätzliches Hot Spare. Eine aktive Platte fällt nachts aus.</p>, tasks: ["Was bewirkt das Spare?", "Warum ist der Vorfall dennoch dringend?"], solution: <p>Der Controller kann den Rebuild automatisch auf das Spare beginnen. Bis zum vollständigen und geprüften Rebuild ist die Redundanz des betroffenen Spiegelpaares eingeschränkt; weitere Fehler, Last und Backup-Status müssen überwacht werden.</p> },
    takeaway: ["RAID-10-Fehlertoleranz hängt von den Spiegelpaaren ab.", "Ein Rebuild stellt Redundanz wieder her, ist aber belastend.", "Ein Hot Spare ist Bereitschaftskapazität, kein Backup."],
  },
  "raid-kapazitaeten-berechnen": {
    objectives: ["Formeln sicher anwenden", "kleinstes Laufwerk berücksichtigen", "4 × 4-TB-Beispiele vergleichen", "Ergebnis als Rohkapazität einordnen"],
    intro: <p>Für einfache Planungsaufgaben begrenzt die kleinste Laufwerkskapazität den nutzbaren Anteil jedes Mitglieds. Dateisystem-, Metadaten-, Reserve- und Herstellerangaben reduzieren die später sichtbare Kapazität zusätzlich.</p>,
    sections: [
      { title: "Gleich große Laufwerke", paragraphs: [<>Bei 4 × 4 TB ergeben sich: RAID 0 = 16 TB, Vierfach-RAID 1 = 4 TB, RAID 5 = 12 TB, RAID 6 = 8 TB und RAID 10 = 8 TB. Ein Controller kann andere Spiegelset-Layouts anbieten; die Aufgabe muss das Layout benennen.</>] },
      { title: "Gemischte Größen", paragraphs: [<>Bei 2, 4, 4 und 8 TB rechnet das vereinfachte klassische Array mit 2 TB je Mitglied: RAID 5 = 6 TB, RAID 6 = 4 TB, RAID 10 = 4 TB. Die übrige Kapazität ist in diesem Verbund typischerweise nicht nutzbar.</>, <>Herstellerspezifische Verfahren können abweichen. Für Prüfungs- und Grundplanung gilt die angegebene klassische Formel.</>] },
    ],
    visual: <ResponsiveTable caption="Kapazitätsvergleich" headers={["Level", "4 × 4 TB", "2/4/4/8 TB", "Kapazitätsregel"]} rows={levelRows.map((row) => [row[0], row[0] === "RAID 0" ? cap("0", [4,4,4,4]) : row[0] === "RAID 1" ? cap("1", [4,4,4,4]) : row[0] === "RAID 5" ? cap("5", [4,4,4,4]) : row[0] === "RAID 6" ? cap("6", [4,4,4,4]) : cap("10", [4,4,4,4]), row[0] === "RAID 0" ? cap("0", [2,4,4,8]) : row[0] === "RAID 1" ? cap("1", [2,4,4,8]) : row[0] === "RAID 5" ? cap("5", [2,4,4,8]) : row[0] === "RAID 6" ? cap("6", [2,4,4,8]) : cap("10", [2,4,4,8]), row[3]])} />,
    scenario: { title: "Sechs Laufwerke zu 8 TB", situation: <p>Verglichen werden RAID 5, RAID 6 und RAID 10.</p>, tasks: ["Berechne die Rohkapazitäten.", "Welche Zusatzfrage entscheidet über die Auswahl?"], solution: <p>RAID 5: 40 TB; RAID 6: 32 TB; RAID 10: 24 TB. Danach zählen Fehlertoleranz, Spiegelpaarlayout, Workload, Rebuild-Zeit, Leistung, Controller und Backup-Anforderungen.</p> },
    takeaway: ["Die kleinste Platte begrenzt die einfache Arrayrechnung.", "Kapazität allein entscheidet nicht über das Level.", "Rohkapazität ist nicht identisch mit nutzbarem Dateisystemplatz."],
  },
  "raid-oder-backup-praxis": {
    objectives: ["RAID nach Anforderungen auswählen", "RAID und Backup vergleichen", "nicht abgedeckte Risiken erkennen", "zum Backup-Modul überleiten"],
    intro: <p>RAID schützt primär die Verfügbarkeit bei bestimmten Laufwerksausfällen. Backup stellt eine unabhängige, wiederherstellbare Kopie bereit. Beide können Teil eines Konzepts sein, beantworten aber andere Fragen.</p>,
    sections: [
      { title: "RAID ist kein Backup", paragraphs: [<>RAID schützt nicht zuverlässig vor versehentlichem Löschen, Ransomware, replizierter Dateisystemkorruption, Feuer, Diebstahl oder administrativen Fehlern. Diese Ereignisse können alle Mitglieder oder den aktuellen Zustand gleichzeitig betreffen.</>], activity: <SingleChoiceCheck title="Löschung im Spiegel" question="Ein Benutzer löscht einen Ordner auf RAID 1. Was stellt ihn wieder her?" inputName="raid-backup" correctOptionId="backup" successMessage="Nur eine passende unabhängige Version kann den früheren Stand liefern." options={[{ id: "mirror", label: "Der Spiegel kopiert den gelöschten Ordner zurück.", explanation: "Die Löschung wird ebenfalls gespiegelt." }, { id: "parity", label: "Parität berechnet den Ordner neu.", explanation: "Parität rekonstruiert ausgefallene Blöcke, keine ältere logische Version." }, { id: "backup", label: "Ein geprüftes Backup mit passendem Wiederherstellungspunkt.", explanation: "Richtig." }, { id: "spare", label: "Das Hot Spare enthält automatisch die alte Datei.", explanation: "Ein Hot Spare enthält keine historische Kopie." }]} /> },
      { title: "Kein Level ist universell", paragraphs: [<>Maximale Kapazität kann RAID 0 nahelegen, jedoch ohne Redundanz. Kleine Dateiserver können Spiegelung nutzen; VM-Storage kann von RAID 10 profitieren; Paritätslevel können kapazitätseffizient sein. Jede Wahl braucht konkrete I/O-, Verfügbarkeits-, Rebuild- und Budgetanforderungen.</>, <>Das bestehende Modul „Backup & Datensicherung“ behandelt Voll-/Inkrement-/Differentialsicherung, Retention, RPO/RTO, Medien, 3-2-1-1-0 und Restore-Tests; diese Inhalte werden hier bewusst nicht dupliziert.</>] },
    ],
    visual: <ResponsiveTable caption="RAID und Backup sauber trennen" headers={["Aspekt", "RAID", "Backup"]} rows={[["Hauptziel", "Verfügbarkeit/Leistung je Level", "früheren Zustand wiederherstellen"], ["Ort", "meist gleiches System", "getrennte Fehlerdomäne möglich"], ["Löschung/Ransomware", "wird oft übernommen", "Version kann helfen, wenn geschützt"], ["Standortschaden", "typisch gemeinsam betroffen", "offsite Kopie kann schützen"]]} />,
    scenario: { title: "Kleiner Datei- und VM-Server", situation: <p>Ein Betrieb verlangt kurze Ausfälle, gute VM-I/O und Wiederherstellung nach Ransomware.</p>, tasks: ["Welche RAID-Richtung ist plausibel?", "Welche zusätzliche Schutzschicht ist zwingend zu planen?"], solution: <p>RAID 10 kann wegen I/O und Spiegelpaaren plausibel sein, muss aber gegen Kapazität und Budget geprüft werden. Zusätzlich braucht es getrennte, geschützte und getestete Backups mit passenden RPO/RTO und Versionen.</p> },
    takeaway: ["RAID != Backup.", "Die passende RAID-Wahl folgt Anforderungen, nicht Gewohnheit.", "Historische, unabhängige Wiederherstellung wird im Backup-Konzept geplant."],
  },
};

export function StorageRaidLesson({ lessonSlug }: { lessonSlug: string }) {
  const lesson = lessons[lessonSlug];
  if (!lesson) return null;
  return <FundamentalsLesson lessonId={`raid-${lessonSlug}`} {...lesson} relatedLinks={[{ href: "/lernen/backup-datensicherung", label: "Backup & Datensicherung: unabhängige Wiederherstellung" }]}>{lesson.visual}</FundamentalsLesson>;
}
