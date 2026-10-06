import type { ReactNode } from "react";
import { dataCalculationExerciseDefinitions } from "../../data/learning-exercises/data-calculations";
import {
  binaryToDecimal,
  binaryToHexadecimal,
  calculateTransferDurationSeconds,
  calculateUncompressedAudioSizeBytes,
  calculateUncompressedImageSizeBytes,
  convertBinaryDataAmount,
  convertDecimalDataAmount,
  hexadecimalToBinary,
  megabitsPerSecondToMegabytesPerSecond,
  roundTo,
} from "../../lib/data-calculations";
import { CodeBlock, FundamentalsLesson, ResponsiveTable, TextFlow, type LessonSection } from "./fundamentals-lesson-elements";
import { PracticeExercise } from "./practice-exercise";

type LessonContent = {
  objectives: readonly string[];
  intro: ReactNode;
  sections: readonly LessonSection[];
  visual?: ReactNode;
  scenario: { title: string; situation: ReactNode; tasks: readonly ReactNode[]; solution: ReactNode };
  takeaway: readonly ReactNode[];
};

const oneTerabyteInGibibytes = roundTo(convertBinaryDataAmount(1_000_000_000_000, "B", "GiB"), 2);
const fullHdImageBytes = calculateUncompressedImageSizeBytes(1_920, 1_080, 24);
const audioTenSecondsBytes = calculateUncompressedAudioSizeBytes(48_000, 24, 2, 10);
const rolloutTotalBytes = convertDecimalDataAmount(18.252, "GB", "B");
const rolloutDurationSeconds = calculateTransferDurationSeconds(
  rolloutTotalBytes,
  convertDecimalDataAmount(18, "MB", "B"),
);

const lessons: Record<string, LessonContent> = {
  "bit-byte-und-einheiten": {
    objectives: ["bit und Byte unterscheiden", "8 bit = 1 Byte sicher anwenden", "dezimale und binäre Einheitenleitern trennen", "Datenmenge und Datenrate nicht verwechseln"],
    intro: <p>Datenmengen und Datenraten verwenden ähnliche Kürzel, beschreiben aber Verschiedenes. Eine saubere Schreibweise verhindert Fehler, die sich bei großen Dateien schnell vervielfachen.</p>,
    sections: [
      {
        title: "bit, Byte und Schreibweise",
        paragraphs: [<>Ein <strong>bit</strong> ist eine binäre Informationseinheit. Ein <strong>Byte</strong> besteht aus genau <strong>8 bit</strong>. In Einheiten steht kleines <code>b</code> für bit und großes <code>B</code> für Byte.</>, <>Eine Datenmenge kann etwa <code>24 Mbit</code> groß sein. Geteilt durch 8 sind das <code>3 MB</code>, wenn beide Vorsilben dezimal gemeint sind.</>],
        points: [<><code>8 bit = 1 Byte</code></>, <><code>1 B = 8 bit</code></>, <>bit und Byte nie nur am gesprochenen Wort „Megabit/Megabyte“ erraten</>],
        activity: <PracticeExercise exercise={dataCalculationExerciseDefinitions.bitByteUnits} />,
      },
      {
        title: "Zwei Einheitenleitern",
        paragraphs: [<>Die SI-Leiter <code>kB → MB → GB → TB</code> verwendet pro Stufe den Faktor <strong>1.000</strong>. Die IEC-Leiter <code>KiB → MiB → GiB → TiB</code> verwendet pro Stufe den Faktor <strong>1.024</strong>.</>, <>Ähnliche Namen bedeuten daher keine gleichen Mengen: <code>1 MB = 1.000.000 B</code>, aber <code>1 MiB = 1.048.576 B</code>.</>],
      },
      {
        title: "Menge oder Rate?",
        paragraphs: [<>Eine Datenmenge beschreibt einen Bestand, zum Beispiel <code>800 MB</code>. Eine Datenrate enthält „pro Sekunde“, etwa <code>100 Mbit/s</code> oder <code>12,5 MB/s</code>.</>, <>Erst zusammen mit einer Zeitspanne wird aus einer Rate eine übertragene Menge. Eine Schnittstelle mit 100 Mbit/s enthält nicht „100 Megabit Speicher“.</>],
      },
    ],
    visual: <ResponsiveTable caption="Einheiten auf einen Blick" headers={["Schreibweise", "Bedeutung", "Faktor zur kleineren Stufe", "Beispiel"]} rows={[["bit", "binäre Informationseinheit", "–", "0 oder 1"], ["B", "Byte", "8 bit", "ein ASCII-Zeichen oft 1 B"], ["MB", "Megabyte (SI)", "1.000", "1 MB = 1.000.000 B"], ["MiB", "Mebibyte (IEC)", "1.024", "1 MiB = 1.048.576 B"]]} />,
    scenario: {
      title: "Downloadangabe richtig lesen",
      situation: <p>Ein Download ist 3.000 MB groß. Die gemessene Rate beträgt 100 Mbit/s.</p>,
      tasks: ["Welche Angabe ist Datenmenge, welche Datenrate?", "Wie lautet die Rate in MB/s?"],
      solution: <p><code>3.000 MB</code> ist die Datenmenge. <code>100 Mbit/s ÷ 8 = 12,5 MB/s</code> ist die Datenrate in Byte pro Sekunde. Die Dauer wird in Lektion 3 berechnet.</p>,
    },
    takeaway: ["8 bit ergeben 1 Byte.", "SI skaliert mit 1.000, IEC mit 1.024.", "Eine Datenrate braucht immer einen Zeitbezug."],
  },
  "si-iec-und-speicherkapazitaet": {
    objectives: ["innerhalb der SI- und IEC-Leiter umrechnen", "SI- und IEC-Werte über Byte vergleichen", "Hersteller- und Systemanzeigen erklären", "Ergebnisse nach einer angegebenen Regel runden"],
    intro: <p>Systematische Umrechnung beginnt mit der Frage, welche Leiter verwendet wird. Einheiten werden nicht nach Gefühl ausgetauscht, sondern über ihre festgelegten Faktoren.</p>,
    sections: [
      {
        title: "Innerhalb einer Leiter umrechnen",
        paragraphs: [<>Zu einer größeren SI-Einheit wird pro Stufe durch 1.000 geteilt; zu einer kleineren wird mit 1.000 multipliziert. So sind <code>2.500 MB = 2,5 GB</code>.</>, <>In der IEC-Leiter gilt entsprechend 1.024: <code>2.048 MiB = 2 GiB</code>. Der Rechenweg ist derselbe, der Faktor ist ein anderer.</>],
        activity: <PracticeExercise exercise={dataCalculationExerciseDefinitions.capacityConversions} />,
      },
      {
        title: "SI und IEC über Byte vergleichen",
        paragraphs: [<>Beim Wechsel der Leiter wird zuerst in Byte umgerechnet. Ein als <code>1 TB</code> beworbenes Laufwerk enthält nach SI <code>1.000.000.000.000 B</code>. Geteilt durch <code>1.073.741.824 B/GiB</code> sind das <strong>{oneTerabyteInGibibytes.toLocaleString("de-DE", { minimumFractionDigits: 2 })} GiB</strong>.</>, <>Die Zahl ist kleiner, obwohl keine Kapazität verschwunden ist. Zusätzlich können Formatierung, Dateisystem und reservierte Bereiche den nutzbaren Platz beeinflussen.</>],
        note: <>In diesem Modul wird – sofern nicht anders angegeben – erst am Ende kaufmännisch auf die geforderte Anzahl Nachkommastellen gerundet.</>,
      },
      {
        title: "Kapazität planen",
        paragraphs: [<>Addiere Daten erst in einer gemeinsamen Einheit. Plane danach nachvollziehbare Reserve für Wachstum, Metadaten und betriebliche Anforderungen ein.</>, <>Ein nominell passender Datenträger ist noch kein Backupkonzept. Verfügbarkeit, Sicherung und Wiederherstellung bleiben Aufgaben der entsprechenden Fachmodule.</>],
      },
    ],
    visual: <ResponsiveTable caption="SI- und IEC-Leiter" headers={["Stufe", "SI dezimal", "IEC binär"]} rows={[["1", "1 kB = 10³ B", "1 KiB = 2¹⁰ B"], ["2", "1 MB = 10⁶ B", "1 MiB = 2²⁰ B"], ["3", "1 GB = 10⁹ B", "1 GiB = 2³⁰ B"], ["4", "1 TB = 10¹² B", "1 TiB = 2⁴⁰ B"]]} />,
    scenario: {
      title: "SSD-Anzeige erklären",
      situation: <p>Eine SSD wird mit 500 GB beworben. Ein Werkzeug zeigt die Kapazität in GiB an.</p>,
      tasks: ["Welche Bytezahl verspricht die dezimale Angabe?", "Wie wird der GiB-Wert berechnet?", "Warum ist eine kleinere Zahl kein Beleg für fehlende Bytes?"],
      solution: <p><code>500 GB = 500.000.000.000 B</code>. Durch <code>2³⁰ B/GiB</code> geteilt sind das rund <code>465,66 GiB</code>. Beide Angaben beschreiben dieselbe Bytezahl mit verschiedenen Einheiten.</p>,
    },
    takeaway: ["Zuerst die Einheitenleiter bestimmen.", "SI/IEC-Wechsel über Byte rechnen.", "Nur nach einer ausdrücklich genannten Regel runden."],
  },
  "datenmenge-datenrate-und-uebertragungszeit": {
    objectives: ["Menge, Rate und Zeit über eine Grundbeziehung verbinden", "Formeln nach der gesuchten Größe umstellen", "Mbit/s und MB/s umrechnen", "Leitungsrate und effektive Rate unterscheiden"],
    intro: <p>Übertragungsrechnungen werden zuverlässig, wenn Datenmenge und Rate dieselbe Basiseinheit verwenden. Danach genügt eine einzige Grundbeziehung mit drei Umstellungen.</p>,
    sections: [
      {
        title: "Die drei Formeln",
        paragraphs: [<><strong>Datenmenge = Datenrate × Zeit</strong>. Daraus folgen <strong>Zeit = Datenmenge ÷ Datenrate</strong> und <strong>Datenrate = Datenmenge ÷ Zeit</strong>.</>, <>Einheiten dienen als Kontrolle: <code>MB ÷ (MB/s) = s</code>. Bleibt nach dem Kürzen nicht die gesuchte Einheit, stimmt der Ansatz noch nicht.</>],
        activity: <PracticeExercise exercise={dataCalculationExerciseDefinitions.dataRateConversions} />,
      },
      {
        title: "bit/s und B/s",
        paragraphs: [<>Bei gleicher dezimaler Vorsilbe gilt wegen <code>8 bit = 1 Byte</code>: <code>400 Mbit/s ÷ 8 = 50 MB/s</code>. Umgekehrt sind <code>100 MB/s × 8 = 800 Mbit/s</code>.</>, <>Die Vorsilbe muss wirklich gleich sein. Ein Wechsel zwischen MB und MiB benötigt zusätzlich die jeweilige SI-/IEC-Umrechnung.</>],
        activity: <PracticeExercise exercise={dataCalculationExerciseDefinitions.transferTime} />,
      },
      {
        title: "Theorie und Praxis",
        paragraphs: [<>Eine Leitung mit <code>1 Gbit/s</code> hat rechnerisch maximal <code>{megabitsPerSecondToMegabytesPerSecond(1_000).toLocaleString("de-DE")} MB/s</code>. Nutzdaten können wegen Protokolloverhead, Gegenstelle, Speichermedium, Auslastung und vielen kleinen Dateien darunter liegen.</>, <>Für Wartungsfenster ist eine gemessene oder konservativ angenommene <strong>effektive Rate</strong> belastbarer als die bloße Nennrate. Die Annahme gehört zur Rechnung.</>],
      },
    ],
    visual: <TextFlow caption="Übertragungsrechnung" steps={["Einheiten festlegen", "bit/Byte umrechnen", "Formel einsetzen", "Ergebnis und Praxisreserve prüfen"]} />,
    scenario: {
      title: "Backupfenster prüfen",
      situation: <p>20 GB entsprechen hier 20.000 MB. Das Backupziel schreibt effektiv 100 MB/s.</p>,
      tasks: ["Berechne die reine Übertragungszeit.", "Welche Rate wäre für 150 Sekunden nötig?", "Warum sollte das Wartungsfenster größer sein?"],
      solution: <p><code>20.000 MB ÷ 100 MB/s = 200 s = 3 min 20 s</code>. Für 150 s wären <code>133,33 MB/s</code> effektiv nötig, am Ende auf zwei Nachkommastellen gerundet. Vorbereitung, Metadaten und Verifikation benötigen zusätzliche Zeit.</p>,
    },
    takeaway: ["Menge = Rate × Zeit.", "Mbit/s und MB/s unterscheiden sich um Faktor 8.", "Planungen verwenden eine begründete effektive Rate."],
  },
  "binaer-dezimal-und-hexadezimal": {
    objectives: ["Stellenwerte in Binär, Dezimal und Hexadezimal erklären", "zwischen Binär und Dezimal umrechnen", "Binärzahlen in Hexadezimal gruppieren", "Hexadezimalwerte in Binär und Dezimal übertragen"],
    intro: <p>Zahlensysteme stellen denselben Wert mit unterschiedlichen Basen dar. Entscheidend ist nicht das Aussehen der Ziffern, sondern ihr Stellenwert.</p>,
    sections: [
      {
        title: "Basis und Stellenwert",
        paragraphs: [<>Das Dezimalsystem nutzt Basis 10, das Binärsystem Basis 2 und das Hexadezimalsystem Basis 16. Hexadezimal ergänzt die Ziffern 0–9 um A–F für die Werte 10–15.</>, <><code>00101111₂</code> setzt die Stellen 32, 8, 4, 2 und 1. Die Summe ist <strong>{binaryToDecimal("00101111")}₁₀</strong>.</>],
        activity: <PracticeExercise exercise={dataCalculationExerciseDefinitions.numberSystems} />,
      },
      {
        title: "Binär und Dezimal",
        paragraphs: [<>Von Binär nach Dezimal werden die gesetzten Zweierpotenzen addiert. Von Dezimal nach Binär kann wiederholt durch 2 geteilt und der Rest von unten nach oben gelesen werden.</>, <>Potenzen an Grenzen helfen beim Prüfen: <code>2⁸ = 256</code>, also reicht ein Byte ohne Vorzeichen von 0 bis 255.</>],
      },
      {
        title: "Vier Bits pro Hexadezimalstelle",
        paragraphs: [<>Weil <code>16 = 2⁴</code>, entspricht jede Hexadezimalstelle genau vier Bits. Von rechts gruppiert wird <code>0010 1111₂ = {binaryToHexadecimal("00101111")}₁₆</code>.</>, <>Umgekehrt ergibt <code>2F₁₆ = {hexadecimalToBinary("2F")}₂ = 47₁₀</code>. Diese kompakte Darstellung begegnet dir etwa bei Speicherwerten, Farbcodes und Diagnoseausgaben.</>],
      },
    ],
    visual: <ResponsiveTable caption="Stellenwerte" headers={["System", "Beispiel", "Rechnung", "Dezimalwert"]} rows={[["Binär", "00101111₂", "32 + 8 + 4 + 2 + 1", "47"], ["Dezimal", "47₁₀", "4 × 10 + 7", "47"], ["Hexadezimal", "2F₁₆", "2 × 16 + 15", "47"]]} />,
    scenario: {
      title: "Diagnosewert lesen",
      situation: <p>Ein Werkzeug meldet den Statuswert <code>0x2F</code>. Die Dokumentation beschreibt einzelne Bits.</p>,
      tasks: ["Schreibe den Wert binär mit acht Stellen.", "Bestimme den Dezimalwert.", "Warum ist Hexadezimal hier übersichtlicher?"],
      solution: <p><code>2F₁₆ = 0010 1111₂ = 47₁₀</code>. Zwei Hexadezimalstellen bilden exakt acht Bits kompakt ab. Welche Bits fachlich bedeuten, legt erst die Gerätedokumentation fest.</p>,
    },
    takeaway: ["Der Stellenwert folgt der Basis.", "Vier Bits entsprechen einer Hexadezimalstelle.", "Binärwissen unterstützt spätere Themen, ersetzt aber kein Subnetting."],
  },
  "bild-audio-und-kompression": {
    objectives: ["unkomprimierte Bildgrößen berechnen", "unkomprimierte Audiogrößen berechnen", "bit und Byte im Rechenweg korrekt behandeln", "verlustfreie und verlustbehaftete Kompression unterscheiden"],
    intro: <p>Mediengrößen lassen sich aus ihren Rohparametern abschätzen. Dateiformate enthalten zusätzlich Metadaten und nutzen häufig Kompression; deshalb ist die Rohdatenrechnung ein klar gekennzeichnetes Modell.</p>,
    sections: [
      {
        title: "Bilddaten",
        paragraphs: [<>Unkomprimierte Bildgröße in bit = Breite × Höhe × Farbtiefe. Für <code>1.920 × 1.080 Pixel × 24 bit</code> entstehen <code>49.766.400 bit</code> beziehungsweise <strong>{fullHdImageBytes.toLocaleString("de-DE")} B = 6,2208 MB</strong>.</>, <>Die Farbtiefe gilt pro Pixel. Erst nach der Multiplikation wird durch 8 in Byte umgerechnet.</>],
        activity: <PracticeExercise exercise={dataCalculationExerciseDefinitions.mediaSizing} />,
      },
      {
        title: "Audiodaten",
        paragraphs: [<>Unkomprimierte Audiogröße in bit = Abtastrate × Bittiefe × Kanäle × Dauer. Bei <code>48.000 Hz × 24 bit × 2 × 10 s</code> sind das <strong>{audioTenSecondsBytes.toLocaleString("de-DE")} B = 2,88 MB</strong>.</>, <>Doppelte Dauer oder doppelte Kanalzahl verdoppelt bei sonst gleichen Parametern die Rohdatenmenge.</>],
      },
      {
        title: "Kompression",
        paragraphs: [<>Verlustfreie Kompression ermöglicht die exakte Rekonstruktion der Ausgangsdaten. Verlustbehaftete Kompression verwirft nach einem Verfahren Informationen, um häufig kleinere Dateien zu erreichen.</>, <>Ein konkretes Verhältnis ist nicht pauschal garantiert. Ist ausdrücklich <code>4:1</code> gegeben, wird die unkomprimierte Größe für dieses Modell durch 4 geteilt.</>],
        activity: <PracticeExercise exercise={dataCalculationExerciseDefinitions.representationCompression} />,
      },
    ],
    visual: <ResponsiveTable caption="Rohdatenformeln" headers={["Medium", "Faktoren", "Ergebnis vor Umrechnung"]} rows={[["Bild", "Breite × Höhe × Farbtiefe", "bit"], ["Audio", "Abtastrate × Bittiefe × Kanäle × Dauer", "bit"], ["Kompression x:1", "Rohgröße ÷ x", "gleiche Einheit wie Rohgröße"]]} />,
    scenario: {
      title: "Schulungsaufnahme dimensionieren",
      situation: <p>Ein Betrieb plant 60 Sekunden unkomprimiertes Stereo-Audio mit 48 kHz und 16 bit sowie zehn unkomprimierte Full-HD-Bilder mit 24 bit.</p>,
      tasks: ["Berechne beide Rohdatenmengen in MB.", "Wie groß wären die Bilder bei ausdrücklich 5:1?", "Warum ist das keine Vorhersage für jedes Bildformat?"],
      solution: <p>Audio: <code>48.000 × 16 × 2 × 60 ÷ 8 = 11.520.000 B = 11,52 MB</code>. Bilder: <code>10 × 6,2208 MB = 62,208 MB</code>; bei 5:1 sind es modellhaft <code>12,4416 MB</code>. Reale Ergebnisse hängen von Inhalt, Format und Einstellungen ab.</p>,
    },
    takeaway: ["Bildgröße folgt Pixelzahl und Farbtiefe.", "Audiogröße folgt Rate, Tiefe, Kanälen und Dauer.", "Kompressionsrechnungen benötigen ein explizites Verhältnis."],
  },
  "ascii-unicode-utf-8-und-praxisfall": {
    objectives: ["Zeichen, Zeichenvorrat und Codierung trennen", "ASCII und Unicode einordnen", "variable UTF-8-Bytefolgen erklären", "mehrere Datenrechnungen in einer Rollout-Planung verbinden"],
    intro: <p>Text besteht fachlich nicht einfach aus „einem Byte pro Zeichen“. Welche Bytefolge entsteht, hängt von Codepunkten und der verwendeten Codierung ab.</p>,
    sections: [
      {
        title: "ASCII, Unicode und UTF-8",
        paragraphs: [<>Der grundlegende ASCII-Standard umfasst 128 Codes für lateinische Grundbuchstaben, Ziffern, Satz- und Steuerzeichen. Er reicht nicht für die weltweite Textdarstellung.</>, <>Unicode definiert einen großen Zeichenvorrat und weist Zeichen Codepunkte zu. UTF-8 ist eine Codierung, die diese Codepunkte als variable Folgen von ein bis vier Bytes speichert.</>],
        activity: <PracticeExercise exercise={dataCalculationExerciseDefinitions.textEncoding} />,
      },
      {
        title: "Zeichen sind nicht automatisch Bytes",
        paragraphs: [<>In UTF-8 benötigt <code>A</code> ein Byte, <code>€</code> drei Bytes und <code>🙂</code> vier Bytes. Ein sichtbares Zeichen kann außerdem aus mehreren Unicode-Codepunkten zusammengesetzt sein.</>, <>Für Speicher- oder Protokollgrenzen muss daher die codierte Bytefolge gemessen oder korrekt berechnet werden, nicht nur die sichtbare Zeichenanzahl.</>],
        activity: <CodeBlock caption="UTF-8-Beispiele">{"A    U+0041   41          1 Byte\n€    U+20AC   E2 82 AC    3 Bytes\n🙂   U+1F642  F0 9F 99 82 4 Bytes"}</CodeBlock>,
      },
      {
        title: "Integrierte Rollout-Planung",
        paragraphs: [<>Ein Standort erhält ein Systemabbild mit 18 GB, eine Anleitung mit 250 MB und Konfigurationen mit 2 MB. Zusammen sind das <strong>18.252 MB</strong>. Die Leitung ist mit 200 Mbit/s angegeben, gemessen werden effektiv 18 MB/s.</>, <>Die theoretische Rate beträgt <code>25 MB/s</code>; die effektive Übertragung dauert <strong>{roundTo(rolloutDurationSeconds, 0).toLocaleString("de-DE")} s ≈ {roundTo(rolloutDurationSeconds / 60, 1).toLocaleString("de-DE")} min</strong>. Ein 32-GB-Datenträger reicht nominell, dennoch werden Dateisystem, Reserve und Prüfschritte dokumentiert.</>],
        activity: <PracticeExercise exercise={dataCalculationExerciseDefinitions.integratedPlanning} />,
      },
    ],
    visual: <TextFlow caption="Rollout-Fall von der Anforderung zur Kontrolle" steps={["18 GB + 250 MB + 2 MB", "Kapazität und Reserve", "18 MB/s effektiv", "≈ 16,9 Minuten", "Prüfsumme und UTF-8-Dateien prüfen"]} />,
    scenario: {
      title: "Rollout-Paket freigeben",
      situation: <p>Zusätzlich zeigt eine Prüfausgabe das Byte <code>2F₁₆</code>; die UTF-8-Anleitung enthält Umlaute und Emoji.</p>,
      tasks: ["Gib 2F hexadezimal binär und dezimal an.", "Warum kann die Anleitung mehr Bytes als sichtbare Zeichen haben?", "Welche Annahmen und Prüfungen gehören in die Freigabe?"],
      solution: <p><code>2F₁₆ = 00101111₂ = 47₁₀</code>. UTF-8 codiert viele Codepunkte mit mehreren Bytes. Dokumentiert werden SI/IEC-Einheiten, Gesamtmenge, nutzbare Zielkapazität, gemessene effektive Rate, Rundung, Reserve sowie die Prüfung von Prüfsumme und korrekt decodiertem Text.</p>,
    },
    takeaway: ["Unicode und UTF-8 sind nicht dasselbe.", "Zeichenanzahl und Bytezahl können abweichen.", "Eine belastbare Planung dokumentiert Einheiten, Annahmen, Rechnung und Verifikation."],
  },
};

const relatedLinks: Record<string, readonly { href: string; label: string }[]> = {
  "bit-byte-und-einheiten": [
    { href: "/lernen/arbeitsplatz-hardware", label: "Arbeitsplatz & Hardware" },
    { href: "/lernen/storage-und-raid", label: "Storage & RAID" },
  ],
  "si-iec-und-speicherkapazitaet": [
    { href: "/lernen/arbeitsplatz-hardware", label: "Kapazität im Hardware-Kontext" },
    { href: "/lernen/storage-und-raid", label: "Nutzbare RAID-Kapazität" },
  ],
  "datenmenge-datenrate-und-uebertragungszeit": [
    { href: "/lernen/arbeitsplatz-hardware", label: "Transfer im Hardware-Kontext" },
    { href: "/lernen/storage-und-raid", label: "Storage & RAID" },
  ],
  "binaer-dezimal-und-hexadezimal": [
    { href: "/lernen/ipv4-grundlagen", label: "IPv4 Grundlagen" },
    { href: "/lernen/subnetting", label: "Subnetting" },
  ],
};

export function DataCalculationLesson({ lessonSlug }: { lessonSlug: string }) {
  const lesson = lessons[lessonSlug];
  if (!lesson) return null;
  return (
    <FundamentalsLesson
      lessonId={`data-calculation-${lessonSlug}`}
      {...lesson}
      relatedLinks={relatedLinks[lessonSlug] ?? []}
    >
      {lesson.visual}
    </FundamentalsLesson>
  );
}
