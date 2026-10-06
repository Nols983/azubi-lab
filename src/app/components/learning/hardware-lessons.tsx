import type { ReactNode } from "react";
import { FundamentalsLesson, ResponsiveTable, TextFlow, type LessonSection } from "./fundamentals-lesson-elements";
import { SingleChoiceCheck } from "./single-choice-check";

type LessonContent = { objectives: readonly string[]; intro: ReactNode; sections: readonly LessonSection[]; visual?: ReactNode; scenario: { title: string; situation: ReactNode; tasks: readonly ReactNode[]; solution: ReactNode }; takeaway: readonly ReactNode[] };

const lessons: Record<string, LessonContent> = {
  "cpu-und-von-neumann": {
    objectives: ["Aufgabe von CPU und ALU erklären", "Kerne, Threads und Takt einordnen", "Von-Neumann-Komponenten zuordnen", "Leistung nicht an einer Einzelzahl festmachen"],
    intro: <p>Die CPU führt Maschinenbefehle aus und koordiniert die Verarbeitung. Die ALU übernimmt grundlegende arithmetische und logische Operationen; Register und Steuerwerk arbeiten eng mit ihr zusammen.</p>,
    sections: [
      { title: "Kerne, Threads und Takt", paragraphs: [<>Mehr Kerne erlauben mehr parallele Arbeit, wenn Software sie nutzen kann. Hardware-Threads verbessern die Auslastung eines Kerns, sind aber keine zusätzlichen vollständigen Kerne.</>, <>Die Taktfrequenz gibt Zyklen pro Sekunde an. Architektur, Cache, Energie- und Temperaturgrenzen sowie die konkrete Aufgabe entscheiden mit – 4 GHz sind nicht automatisch schneller als jede CPU mit 3 GHz.</>] },
      { title: "Von-Neumann-Grundidee", paragraphs: [<>Programme und Daten liegen im Speicher. Die CPU holt Befehle und Daten, verarbeitet sie und schreibt Ergebnisse zurück; Ein-/Ausgabe verbindet Tastatur, Netzwerk, Datenträger oder Anzeige.</>], points: ["CPU: steuert und verarbeitet", "Speicher: hält Programme und Daten", "Ein-/Ausgabe: verbindet das System mit Geräten und Umwelt", "Stored Program: Befehle sind wie Daten im Speicher abgelegt"] },
    ],
    visual: <TextFlow caption="Vereinfachter Befehlszyklus" steps={["Befehl aus Speicher holen", "Befehl dekodieren", "Daten verarbeiten", "Ergebnis speichern"]} />,
    scenario: { title: "Zwei Prozessoren vergleichen", situation: <p>CPU A hat acht Kerne mit niedrigerem Takt, CPU B vier Kerne mit höherem Takt. Der Arbeitsplatz nutzt Browser, Office und gelegentlich stark parallelisierte Berechnungen.</p>, tasks: ["Welche Messwerte fehlen für eine belastbare Entscheidung?", "Warum genügt der Taktvergleich nicht?"], solution: <p>Benchmarks der tatsächlichen Anwendungen, Energiebedarf, Kühlung, Plattformkosten und Reaktionszeit unter Last sind relevant. Parallelisierte Arbeit kann von mehr Kernen profitieren; einzelne kurze Aufgaben von hoher Single-Core-Leistung.</p> },
    takeaway: ["CPU-Leistung hängt von Aufgabe und Gesamtarchitektur ab.", "Threads sind keine vollständigen Kerne.", "Das Von-Neumann-Modell verbindet CPU, Speicher und Ein-/Ausgabe."],
  },
  "ram-mainboard-und-netzteil": {
    objectives: ["RAM und Massenspeicher unterscheiden", "DDR, Kapazität, Geschwindigkeit und Dual Channel einordnen", "Mainboard-Kompatibilität prüfen", "Netzteile sicher dimensionieren"],
    intro: <p>RAM hält aktive Programme und Daten schnell, aber flüchtig. Nach dem Ausschalten ist sein Inhalt weg; SSD oder HDD speichern Daten dauerhaft.</p>,
    sections: [
      { title: "RAM passend planen", paragraphs: [<>Zu wenig Kapazität führt zu Auslagerung und spürbaren Wartezeiten. Höhere Datenrate kann helfen, ist aber von CPU und Mainboard abhängig. DDR-Generationen sind elektrisch und mechanisch nicht beliebig austauschbar.</>, <>Dual Channel verteilt Zugriffe auf zwei passende Speicherkanäle und erhöht die mögliche Bandbreite. Kapazität und stabile Kompatibilität sind für Office-Arbeit oft wichtiger als Spitzenwerte.</>] },
      { title: "Mainboard und Netzteil", paragraphs: [<>Das Mainboard verbindet CPU-Sockel, RAM-Steckplätze, PCIe, Massenspeicher und externe Anschlüsse. Sockel, Chipsatz, Firmware, Formfaktor und unterstützte Komponenten müssen zusammenpassen.</>, <>Das Netzteil stellt geregelte Spannungen bereit. Dimensioniert wird mit realistischer Spitzenlast, Reserve, Anschlüssen und Effizienz – nicht allein mit maximaler Wattzahl.</>], note: <><strong>Sicherheit:</strong> Netzteile nicht öffnen. Im Inneren können auch nach dem Trennen gefährliche Spannungen anliegen; Arbeiten daran gehören zu qualifizierten Fachkräften.</> },
    ],
    visual: <ResponsiveTable caption="Kompatibilitätscheck" headers={["Bauteil", "prüfen", "typischer Fehler"]} rows={[["CPU", "Sockel, Chipsatz, Firmware", "passender Sockel, aber alte Firmware"], ["RAM", "DDR-Generation, Kapazität, Taktprofile", "DDR4 in DDR5-Slot geplant"], ["Netzteil", "Leistung, Anschlüsse, Formfaktor, Effizienz", "GPU-Anschluss oder Reserve fehlt"]]} />,
    scenario: { title: "RAM-Upgrade", situation: <p>Ein PC besitzt einen einzelnen 8-GB-DDR4-Riegel. Viele Browser-Tabs und Videokonferenzen verursachen Auslagerung.</p>, tasks: ["Welcher Engpass ist wahrscheinlich?", "Was muss vor dem Kauf geprüft werden?"], solution: <p>Die Kapazität ist der naheliegende Engpass. Unterstützte DDR-Generation, Modulgröße, freie Slots, maximale Kapazität und sinnvolle Paarbestückung müssen geprüft werden; ein DDR5-Modul passt nicht.</p> },
    takeaway: ["RAM ist flüchtiger Arbeitsspeicher, nicht dauerhafter Speicher.", "Sockel, DDR-Generation und Anschlüsse sind echte Kompatibilitätsgrenzen.", "Netzteile werden mit Last, Reserve und Effizienz geplant und nicht geöffnet."],
  },
  "gpu-speicher-und-schnittstellen": {
    objectives: ["integrierte und dedizierte GPU unterscheiden", "HDD, SATA-SSD und NVMe-SSD vergleichen", "SATA, PCIe, NVMe und M.2 trennen", "USB, HDMI und DisplayPort passend einordnen"],
    intro: <p>Eine integrierte GPU teilt meist Ressourcen mit dem System und genügt für Office und Medienwiedergabe. Eine dedizierte GPU besitzt eigene Rechenressourcen und meist eigenen Grafikspeicher – sinnvoll etwa für 3D, CAD oder GPU-Computing.</p>,
    sections: [
      { title: "Massenspeicher nach Bedarf", paragraphs: [<>HDDs bieten viel Kapazität günstig, sind mechanisch und bei zufälligen Zugriffen langsam. SATA-SSDs reagieren deutlich schneller; NVMe-SSDs sprechen über PCIe mit geringer Protokoll- und Zugriffs­latenz.</>, <>Für große Archive kann HDD passen, für Office-Systemlaufwerke eine SATA-SSD und für hohe I/O-Last eine geeignete NVMe-SSD. Haltbarkeit, Backup und Workload gehören zur Entscheidung.</>] },
      { title: "Form, Bus und Protokoll", paragraphs: [<>M.2 beschreibt vor allem Bauform und Anschlussfamilie. Ein M.2-Modul kann je nach Slot und Modul SATA oder PCIe/NVMe verwenden. <strong>M.2 bedeutet daher nicht automatisch NVMe.</strong></>, <>NVMe ist ein Speicherprotokoll, das üblicherweise PCIe nutzt; SATA ist eine eigene Schnittstellen-/Protokollfamilie. USB transportiert viele Gerätetypen, HDMI und DisplayPort vor allem Bild und Ton.</>], activity: <SingleChoiceCheck title="Schnittstellen sauber trennen" question="Welche Aussage ist korrekt?" inputName="hardware-interface" correctOptionId="form" successMessage="M.2 allein sagt noch nicht, ob SATA oder PCIe/NVMe genutzt wird." options={[{ id: "same", label: "M.2 und NVMe sind immer dasselbe.", explanation: "M.2 ist die Bauform-/Anschlussfamilie, NVMe das Speicherprotokoll." }, { id: "sata", label: "Jede SATA-SSD verwendet NVMe.", explanation: "SATA-SSDs verwenden die SATA-Protokollfamilie." }, { id: "form", label: "Ein M.2-Laufwerk kann je nach Ausführung SATA oder PCIe/NVMe nutzen.", explanation: "Richtig." }, { id: "video", label: "DisplayPort ist ein Massenspeicherprotokoll.", explanation: "DisplayPort transportiert hauptsächlich Bild und Ton." }]} /> },
    ],
    visual: <ResponsiveTable caption="Speichertypen im Vergleich" headers={["Typ", "Stärke", "Grenze", "typischer Einsatz"]} rows={[["HDD", "günstige große Kapazität", "Mechanik, Latenz", "Archiv/Massendaten"], ["SATA-SSD", "schnell, breit kompatibel", "SATA-Durchsatz", "Office/Systemlaufwerk"], ["NVMe-SSD", "hohe IOPS und Bandbreite", "Kosten, Wärme, PCIe-Lanes", "VMs, Build, Datenbanken"]]} />,
    scenario: { title: "Speicher für drei Rollen", situation: <p>Ein Team beschafft einen Office-PC, eine Videoworkstation und einen günstigen Archivspeicher.</p>, tasks: ["Ordne geeignete Speicher zu.", "Welche GPU ist jeweils plausibel?"], solution: <p>Office: SATA- oder NVMe-SSD und integrierte GPU. Video: leistungsfähige NVMe-SSD plus dedizierte GPU nach Softwareanforderung. Archiv: kapazitätsstarke HDDs in einem Konzept mit eigenständigem Backup.</p> },
    takeaway: ["Der Workload entscheidet über HDD, SATA-SSD oder NVMe-SSD.", "M.2 ist nicht automatisch NVMe.", "Eine dedizierte GPU ist für Office nicht pauschal nötig."],
  },
  "peripherie-und-clienttypen": {
    objectives: ["Peripherie bedarfsgerecht auswählen", "Desktop, Notebook und Tablet vergleichen", "Thin und Fat Client unterscheiden", "Ergonomie und Barrierefreiheit berücksichtigen"],
    intro: <p>Ein Arbeitsplatz besteht nicht nur aus dem Rechner. Monitor, Tastatur, Maus, Drucker, Scanner und Dockingstation beeinflussen Produktivität, Wartbarkeit und Zugänglichkeit.</p>,
    sections: [
      { title: "Clienttypen", paragraphs: [<>Desktops sind gut erweiterbar und stationär. Notebooks verbinden Mobilität mit eigenständiger Rechenleistung; Tablets eignen sich für touch-orientierte mobile Abläufe.</>, <>Thin Clients verlagern Anwendungen und Daten weitgehend auf zentrale Dienste und hängen stark von Netzwerk und Backend ab. Fat Clients arbeiten lokal umfangreicher, brauchen aber lokale Pflege, Ressourcen und Schutz.</>] },
      { title: "Peripherie als Anforderung", paragraphs: [<>Monitorgröße, Höhenverstellung, kontrastreiche Darstellung, alternative Eingabegeräte und Bedienhilfen gehören zu Ergonomie und Barrierefreiheit. Eine Dockingstation kann Strom, Netzwerk und Bildschirme bündeln, muss aber Bandbreite und Anschlüsse unterstützen.</>, <>Gemeinsam genutzte Drucker/Scanner reduzieren Gerätezahl, brauchen jedoch ein Betriebs-, Berechtigungs- und Datenschutzkonzept.</>] },
    ],
    visual: <ResponsiveTable caption="Clienttypen vergleichen" headers={["Typ", "Stärke", "Abhängigkeit", "Beispiel"]} rows={[["Desktop", "Wartung/Erweiterung", "fester Ort", "Technikarbeitsplatz"], ["Notebook", "mobil und eigenständig", "Akku/Dock", "hybrides Arbeiten"], ["Tablet", "Touch/Mobilität", "App-/Eingabegrenzen", "Lagererfassung"], ["Thin Client", "zentral administrierbar", "Netz/Backend", "standardisierter VDI-Platz"], ["Fat Client", "lokale Leistung", "lokale Pflege", "CAD-Workstation"]]} />,
    scenario: { title: "Service, Büro und CAD", situation: <p>Außendienst, Buchhaltung und Konstruktion benötigen neue Geräte.</p>, tasks: ["Wähle je einen Clienttyp.", "Nenne relevante Peripherie und Barrierefreiheitsfragen."], solution: <p>Außendienst: Notebook/Tablet je Anwendung; Buchhaltung: Desktop, Notebook-Dock oder Thin Client je Backend; CAD: leistungsfähiger Fat Client. Für alle sind Monitor, Eingabe, Ergonomie, Docking und individuelle Bedienhilfen zu klären.</p> },
    takeaway: ["Clienttypen werden nach Arbeitsablauf und Betriebsmodell gewählt.", "Thin Clients benötigen ein belastbares zentrales Backend.", "Ergonomie und Barrierefreiheit sind Beschaffungskriterien."],
  },
  "arbeitsplatz-auswaehlen": {
    objectives: ["Anforderungen gewichten", "Kosten über den Lebenszyklus betrachten", "Bottlenecks erkennen", "eine Beschaffung nachvollziehbar begründen"],
    intro: <p>Gute Beschaffung übersetzt Arbeitslast, Verfügbarkeit und Nutzerbedürfnisse in prüfbare Kriterien. Das teuerste Bauteil ist nicht automatisch die beste Wahl.</p>,
    sections: [
      { title: "Kriterien statt Wunschliste", paragraphs: [<>Leistung umfasst Antwortzeiten im realen Workload. Anschaffungskosten sind nur ein Teil: Energie, Garantie, Ausfall, Support, Ersatzteile und Administration bilden die Gesamtkosten.</>], points: ["Wartbarkeit und standardisierte Ersatzteile", "Energiebedarf und passende Leistungsprofile", "Ergonomie, Lärm und Barrierefreiheit", "Aufrüstbarkeit nur, wenn sie realistisch genutzt wird"] },
      { title: "Bottlenecks evidenzbasiert finden", paragraphs: [<>Viele Programme plus ständige Auslagerung deuten auf RAM-Mangel; langsame zufällige Zugriffe auf eine HDD auf Storage; hohe CPU-Auslastung auf CPU-/Softwarebedarf. Erst messen, dann zielgerichtet ändern.</>, <>Kompatible Einzelteile sind noch kein ausgewogenes System: Eine überdimensionierte GPU bringt einer Office-Anwendung kaum Nutzen, bindet aber Budget und Energie.</>] },
    ],
    visual: <TextFlow caption="Beschaffung nachvollziehbar machen" steps={["Workload erheben", "Muss/Soll-Kriterien", "Varianten vergleichen", "Pilotieren", "Betrieb bewerten"]} />,
    scenario: { title: "15 Office-Arbeitsplätze", situation: <p>Browser, Office, Videokonferenzen und eine webbasierte Fachanwendung laufen parallel. Budget, Stromverbrauch und drei Jahre Vor-Ort-Service sind wichtig.</p>, tasks: ["Skizziere eine ausgewogene Ausstattung.", "Welche Kriterien prüfst du in einem Pilot?"], solution: <p>Eine moderne Mittelklasse-CPU mit integrierter Grafik, ausreichend RAM (typisch 16 GB nach Messung), SSD, effizientes Netzteil beziehungsweise Business-Notebook mit Dock und ergonomische Displays sind plausibel. Pilotiert werden Last, RAM-Reserve, Kompatibilität, Geräusch, Energie, Bedienhilfen und Supportprozess.</p> },
    takeaway: ["Bedarf, Messwerte und Lebenszyklus schlagen Datenblatt-Maxima.", "Ein Pilot reduziert Beschaffungsrisiken.", "Bottlenecks werden gemessen, nicht erraten."],
  },
  "leistung-energie-und-kapazitaet": {
    objectives: ["P = U × I anwenden", "E = P × t anwenden", "GB und GiB unterscheiden", "Übertragungszeiten abschätzen"],
    intro: <p>Grundrechnungen helfen, Netzteile, Energiebedarf, Speicher und Wartungsfenster plausibel zu planen. Ergebnisse bleiben Näherungen, wenn Last oder Protokoll-Overhead schwanken.</p>,
    sections: [
      { title: "Leistung und Energie", paragraphs: [<>Elektrische Leistung: <strong>P = U × I</strong>. Bei 20 V und 3 A sind das 60 W. Energie: <strong>E = P × t</strong>. 60 W über 5 h ergeben 300 Wh = 0,3 kWh.</>, <>Ein Netzteil mit 90 W Nennleistung verbraucht nicht ständig 90 W. Effizienz beschreibt, welcher Eingangsaufwand für die abgegebene Leistung nötig ist.</>] },
      { title: "Kapazität und Transfer", paragraphs: [<>Hersteller verwenden meist 1 GB = 1.000.000.000 Byte; binär gilt 1 GiB = 1.073.741.824 Byte. Deshalb kann die Betriebssystemanzeige numerisch kleiner wirken.</>, <>Übertragungszeit ≈ Datenmenge ÷ effektive Rate. 100 GB bei realen 100 MB/s benötigen idealisiert 1.000 Sekunden, also rund 16,7 Minuten; Overhead und kleine Dateien verlängern das.</>] },
    ],
    visual: <ResponsiveTable caption="Rechenbeispiele" headers={["Aufgabe", "Rechnung", "Ergebnis"]} rows={[["Notebook", "20 V × 3 A", "60 W"], ["Arbeitstag", "60 W × 5 h", "300 Wh = 0,3 kWh"], ["Transfer", "100.000 MB ÷ 100 MB/s", "1.000 s ≈ 16,7 min"], ["1 TB dezimal", "1.000.000.000.000 B ÷ 2³⁰", "≈ 931 GiB"]]} />,
    scenario: { title: "Rollout-Zeit abschätzen", situation: <p>15 Images zu je 40 GB werden nacheinander mit effektiv 200 MB/s übertragen.</p>, tasks: ["Wie lange dauert die reine Übertragung idealisiert?", "Warum ist die Praxis länger?"], solution: <p>600 GB = 600.000 MB; geteilt durch 200 MB/s sind 3.000 s, also 50 Minuten. Startvorgänge, Prüfungen, Protokoll-Overhead, parallele Last und kleine Dateien kommen hinzu.</p> },
    takeaway: ["P = U × I und E = P × t verwenden passende Einheiten.", "GB und GiB nutzen unterschiedliche Faktoren.", "Transferrechnungen brauchen eine realistische effektive Rate."],
  },
};

export function HardwareLesson({ lessonSlug }: { lessonSlug: string }) {
  const lesson = lessons[lessonSlug];
  if (!lesson) return null;
  return <FundamentalsLesson lessonId={`hardware-${lessonSlug}`} {...lesson}>{lesson.visual}</FundamentalsLesson>;
}
