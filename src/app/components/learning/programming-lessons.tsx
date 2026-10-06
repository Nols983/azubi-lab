import type { ReactNode } from "react";
import { CodeBlock, FundamentalsLesson, ResponsiveTable, type LessonSection } from "./fundamentals-lesson-elements";
import { SingleChoiceCheck } from "./single-choice-check";

type LessonContent = { objectives: readonly string[]; intro: ReactNode; sections: readonly LessonSection[]; visual?: ReactNode; scenario: { title: string; situation: ReactNode; tasks: readonly ReactNode[]; solution: ReactNode }; takeaway: readonly ReactNode[] };

const lessons: Record<string, LessonContent> = {
  "algorithmen-und-pseudocode": {
    objectives: ["Algorithmus erklären", "Pseudocode zeilenweise lesen", "Zuweisung von Vergleich unterscheiden", "Ausgaben per Schreibtischtest bestimmen"],
    intro: <p>Ein Algorithmus ist eine endliche, eindeutige Folge ausführbarer Schritte zur Lösung einer Aufgabe. Pseudocode beschreibt diese Logik lesbar, ohne an eine konkrete Programmiersprache gebunden zu sein.</p>,
    sections: [
      { title: "Eingabe, Verarbeitung, Ausgabe", paragraphs: [<>Ein Ablauf nimmt Werte entgegen, verarbeitet sie in festgelegter Reihenfolge und liefert ein Ergebnis. Eine Zuweisung wie <code>summe ← 3</code> speichert einen Wert; sie ist keine Gleichheitsaussage.</>, <>Beim Schreibtischtest notierst du nach jeder relevanten Zeile die aktuellen Variablenwerte. So werden Reihenfolge und Seiteneffekte sichtbar.</>], activity: <SingleChoiceCheck title="Ausgabe vorhersagen" question="x startet mit 4; danach x ← x + 3. Was wird ausgegeben?" inputName="programming-algorithm-output" correctOptionId="seven" successMessage="Die zweite Zuweisung verwendet den bisherigen Wert 4." options={[{id:"four",label:"4",explanation:"Die Zuweisung verändert x."},{id:"seven",label:"7",explanation:"4 + 3 ergibt 7."},{id:"twelve",label:"12",explanation:"Es wird addiert, nicht multipliziert."},{id:"error",label:"Immer ein Fehler",explanation:"Der Ablauf ist eindeutig."}]} /> },
      { title: "Eindeutigkeit statt Syntaxdetails", paragraphs: [<>Pseudocode darf deutsche Schlüsselwörter verwenden, muss aber Einrückung, Bedingungen und Grenzen klar zeigen. Unklare Formulierungen wie „wiederhole einige Male“ sind nicht prüfbar.</>, <>Ein Algorithmus braucht für den vorgesehenen Eingabebereich ein Ende. Ein endloser Ablauf kann technisch beabsichtigt sein, löst aber nicht automatisch eine endliche Prüfungsaufgabe.</>] },
    ],
    visual: <CodeBlock caption="Schreibtischtest: zwei Zuweisungen">{"x ← 4\nx ← x + 3\nAUSGABE x"}</CodeBlock>,
    scenario: { title: "Ticketnummer normalisieren", situation: <p>Ein Ablauf liest <code>nummer = 17</code>, addiert 1000 und gibt den Wert aus.</p>, tasks: ["Notiere den Wert vor und nach der Zuweisung.", "Welche Ausgabe entsteht?"], solution: <p>Vorher 17, danach 1017; ausgegeben wird 1017. Der ursprüngliche Wert wird durch die neue Zuweisung ersetzt.</p> },
    takeaway: ["Pseudocode beschreibt Logik statt Sprachsyntax.", "Zuweisungen ändern den gespeicherten Zustand.", "Ein Schreibtischtest macht jeden Schritt nachvollziehbar."],
  },
  "variablen-datentypen-und-operatoren": {
    objectives: ["grundlegende Datentypen unterscheiden", "arithmetische Operatoren anwenden", "Vergleiche auswerten", "UND, ODER und NICHT korrekt verknüpfen"],
    intro: <p>Variablen besitzen Namen und halten Werte. Der Datentyp bestimmt, welche Werte und Operationen sinnvoll sind, etwa Ganzzahl, Kommazahl, Text oder Wahrheitswert.</p>,
    sections: [
      { title: "Werte und Operationen", paragraphs: [<>Mit Zahlen sind Addition, Subtraktion, Multiplikation und Division möglich. Textverkettung ist etwas anderes: <code>{'"4" + "3"'}</code> kann den Text <code>{'"43"'}</code> ergeben, während <code>4 + 3</code> die Zahl 7 ergibt.</>, <>Vergleiche wie <code>&gt;</code>, <code>&lt;</code> oder <code>=</code> liefern WAHR oder FALSCH. Zuweisung und Gleichheitsvergleich müssen im jeweiligen Pseudocode klar unterscheidbar sein.</>] },
      { title: "Boolesche Logik", paragraphs: [<><code>A UND B</code> ist nur wahr, wenn beide Teilaussagen wahr sind. <code>A ODER B</code> ist im üblichen inklusiven Sinn wahr, wenn mindestens eine wahr ist. <code>NICHT A</code> kehrt den Wahrheitswert um.</>], activity: <SingleChoiceCheck title="Bedingung prüfen" question="angemeldet ist WAHR, gesperrt ist FALSCH. Was ergibt angemeldet UND NICHT gesperrt?" inputName="programming-boolean" correctOptionId="true" successMessage="NICHT FALSCH ist WAHR; beide UND-Teile sind wahr." options={[{id:"false",label:"FALSCH",explanation:"Die Sperre wird negiert."},{id:"true",label:"WAHR",explanation:"Beide Teilaussagen sind wahr."},{id:"text",label:"den Text WAHRFALSCH",explanation:"Boolesche Werte werden logisch verknüpft."},{id:"unknown",label:"nicht bestimmbar",explanation:"Beide Eingabewerte sind gegeben."}]} /> },
    ],
    visual: <ResponsiveTable caption="Grundtypen im Pseudocode" headers={["Typ", "Beispiel", "typische Operation"]} rows={[["Ganzzahl", "42", "+, −, ×, ganzzahlig vergleichen"],["Kommazahl", "19,5", "rechnen, Rundung beachten"],["Text", "\"Server01\"", "vergleichen, verketten"],["Boolesch", "WAHR", "UND, ODER, NICHT"]]} />,
    scenario: { title: "Wartungszugang", situation: <p>Zugang gilt, wenn eine Person autorisiert ist und das Wartungsfenster aktiv ist.</p>, tasks: ["Formuliere die boolesche Bedingung.", "Bewerte autorisiert = WAHR und Wartungsfenster = FALSCH."], solution: <p><code>autorisiert UND wartungsfenster</code>; das Ergebnis ist FALSCH, weil beim UND beide Werte wahr sein müssen.</p> },
    takeaway: ["Datentypen verhindern sinnlose Operationen.", "Vergleiche liefern Wahrheitswerte.", "UND, ODER und NICHT werden Teil für Teil ausgewertet."],
  },
  "bedingungen-und-verzweigungen": {
    objectives: ["if/else verfolgen", "mehrteilige Bedingungen auswerten", "switch konzeptionell einordnen", "unerreichbare oder falsche Zweige erkennen"],
    intro: <p>Verzweigungen wählen abhängig von Bedingungen genau den passenden Ablaufpfad. Die Reihenfolge mehrerer Bedingungen ist relevant.</p>,
    sections: [
      { title: "if, else if und else", paragraphs: [<>Bei einer Kette wird von oben geprüft. Sobald eine Bedingung wahr ist, läuft ihr Zweig; spätere Alternativen werden übersprungen.</>, <>Grenzen müssen eindeutig sein. <code>punkte &gt; 50</code> schließt genau 50 aus, <code>punkte ≥ 50</code> schließt es ein.</>], activity: <SingleChoiceCheck title="Grenzwert lesen" question="Welche Ausgabe entsteht bei punkte = 50 und der Bedingung punkte ≥ 50?" inputName="programming-condition" correctOptionId="passed" successMessage="Der Vergleich ≥ schließt 50 ein." options={[{id:"failed",label:"nicht bestanden",explanation:"Das wäre bei > 50 möglich, nicht bei ≥ 50."},{id:"passed",label:"bestanden",explanation:"50 erfüllt ≥ 50."},{id:"both",label:"beide Zweige",explanation:"if/else wählt einen Zweig."},{id:"none",label:"keine Ausgabe",explanation:"Ein Zweig wird ausgeführt."}]} /> },
      { title: "switch für diskrete Fälle", paragraphs: [<>Ein switch-ähnlicher Ablauf ordnet einen einzelnen Ausdruck mehreren klaren Fällen zu, etwa Rollen oder Statuscodes. Ein Standardfall fängt nicht aufgeführte Werte ab.</>, <>Bereichsprüfungen und komplexe kombinierte Bedingungen sind häufig mit if/else verständlicher. switch ist kein automatisch besseres if.</>] },
    ],
    visual: <CodeBlock caption="Verzweigung mit eindeutiger Grenze">{"WENN punkte ≥ 50 DANN\n  AUSGABE \"bestanden\"\nSONST\n  AUSGABE \"nicht bestanden\"\nENDE WENN"}</CodeBlock>,
    scenario: { title: "Priorität eines Tickets", situation: <p>Ein Ticket ist kritisch, wenn Dienst ausgefallen UND viele Nutzer betroffen sind; sonst hoch, wenn nur der Dienst ausgefallen ist.</p>, tasks: ["Welche Reihenfolge brauchen die Bedingungen?", "Was gilt bei Ausfall und einem betroffenen Nutzer?"], solution: <p>Zuerst die spezifische kombinierte Bedingung, danach nur Ausfall. Bei einem Nutzer ist „viele Nutzer“ falsch; die zweite Bedingung ergibt hoch.</p> },
    takeaway: ["Grenzoperatoren entscheiden über Randwerte.", "Spezifische Bedingungen stehen vor allgemeineren.", "switch passt zu klaren diskreten Fällen."],
  },
  "schleifen-und-schreibtischtest": {
    objectives: ["for-Schleifen zählen", "while und do-while unterscheiden", "off-by-one-Fehler erkennen", "Variablenwerte tabellarisch verfolgen"],
    intro: <p>Schleifen wiederholen Anweisungen. Startwert, Bedingung und Änderung bestimmen, wie oft der Körper läuft und ob der Ablauf endet.</p>,
    sections: [
      { title: "for und while", paragraphs: [<>Eine Zählschleife <code>FÜR i VON 1 BIS 4</code> führt den Körper bei inklusiver Obergrenze viermal aus. Pseudocode muss ausdrücklich sagen, ob Grenzen inklusive sind.</>, <>Eine while-Schleife prüft vor dem ersten Durchlauf; eine do-while-Schleife danach und läuft deshalb mindestens einmal. Ohne Zustandsänderung kann eine Bedingung dauerhaft wahr bleiben.</>], activity: <SingleChoiceCheck title="Iterationen zählen" question="Wie oft läuft FÜR i VON 0 BIS 3 (beide Grenzen inklusive)?" inputName="programming-loop-count" correctOptionId="four" successMessage="Die Werte 0, 1, 2 und 3 ergeben vier Durchläufe." options={[{id:"three",label:"3-mal",explanation:"Der Startwert 0 zählt mit."},{id:"four",label:"4-mal",explanation:"0 bis 3 inklusive sind vier Werte."},{id:"five",label:"5-mal",explanation:"Nach 3 endet die Schleife."},{id:"infinite",label:"unendlich",explanation:"Die Zählvariable wird fortgeschrieben."}]} /> },
      { title: "Schreibtischtest gegen Off-by-one", paragraphs: [<>Eine Wertetabelle enthält je Durchlauf Zähler, wichtige Variablen und Ausgabe. Prüfe besonders ersten und letzten erlaubten Wert.</>, <>„Solange i ≤ 3“ und Start bei 0 führt ohne weitere Sprünge zu vier Durchläufen. Wer nur 3 − 0 rechnet, vergisst die inklusive Grenze.</>] },
    ],
    visual: <CodeBlock caption="Summe per Zählschleife">{"summe ← 0\nFÜR i VON 1 BIS 3\n  summe ← summe + i\nENDE FÜR\nAUSGABE summe"}</CodeBlock>,
    scenario: { title: "Summe nachvollziehen", situation: <p>Der gezeigte Ablauf addiert 1, 2 und 3.</p>, tasks: ["Notiere summe nach jedem Durchlauf.", "Welche Ausgabe entsteht?"], solution: <p>Nach i=1: 1; nach i=2: 3; nach i=3: 6. Ausgegeben wird 6.</p> },
    takeaway: ["Inklusive Grenzen müssen mitgezählt werden.", "while kann nullmal, do-while mindestens einmal laufen.", "Wertetabellen decken Ablauf- und Grenzfehler auf."],
  },
  "funktionen-und-listen": {
    objectives: ["Funktionen und Prozeduren einordnen", "Parameter und Rückgabewert unterscheiden", "Listenindizes vorsichtig verwenden", "kleine Aggregationen nachvollziehen"],
    intro: <p>Funktionen bündeln wiederverwendbare Logik. Parameter liefern Eingaben; ein Rückgabewert liefert ein Ergebnis an die aufrufende Stelle zurück.</p>,
    sections: [
      { title: "Klare Schnittstellen", paragraphs: [<>Eine Funktion <code>max(a, b)</code> kann den größeren Wert zurückgeben. Lokale Variablen gehören zum Funktionsaufruf und sollen nicht unbemerkt beliebigen globalen Zustand verändern.</>, <>Eine Prozedur wird häufig als Ablauf ohne fachlichen Rückgabewert beschrieben. Die Begriffe variieren zwischen Sprachen; entscheidend ist die dokumentierte Schnittstelle.</>] },
      { title: "Arrays und Listen", paragraphs: [<>Eine Liste hält mehrere Werte in definierter Reihenfolge. Viele Programmiersprachen beginnen bei Index 0, Pseudocode kann aber andere Grenzen festlegen – sie müssen angegeben sein.</>, <>Bei einer Liste mit vier Elementen und Startindex 0 sind 0 bis 3 gültig. Zugriff auf Index 4 ist ein typischer Grenzfehler.</>], activity: <SingleChoiceCheck title="Listenindex" question="Eine Liste hat vier Elemente und beginnt bei Index 0. Welcher letzte Index ist gültig?" inputName="programming-list-index" correctOptionId="three" successMessage="Vier Positionen sind 0, 1, 2 und 3." options={[{id:"zero",label:"0",explanation:"Das ist der erste Index."},{id:"three",label:"3",explanation:"Das ist der vierte und letzte Index."},{id:"four",label:"4",explanation:"Index 4 läge hinter der Liste."},{id:"five",label:"5",explanation:"Dieser Index ist ebenfalls außerhalb."}]} /> },
    ],
    visual: <CodeBlock caption="Funktion mit Rückgabewert">{"FUNKTION doppelt(wert)\n  RÜCKGABE wert * 2\nENDE FUNKTION\n\nergebnis ← doppelt(6)"}</CodeBlock>,
    scenario: { title: "Messwerte auswerten", situation: <p>Die Liste enthält [12, 18, 15]. Eine Funktion summiert alle Werte und teilt durch die Anzahl.</p>, tasks: ["Welche Parameter braucht die Funktion?", "Welcher Mittelwert entsteht?"], solution: <p>Die Werteliste genügt als Parameter. Summe 45 geteilt durch 3 ergibt 15; eine leere Liste müsste gesondert behandelt werden.</p> },
    takeaway: ["Parameter sind Eingaben, Rückgabewerte Ergebnisse.", "Listen brauchen dokumentierte Grenzen.", "Wiederverwendbare Funktionen halten Abläufe übersichtlich."],
  },
  "oop-grundlagen-und-fehlersuche": {
    objectives: ["Klasse und Objekt unterscheiden", "Attribute und Methoden zuordnen", "public/private grundlegend einordnen", "einfache Logikfehler systematisch finden"],
    intro: <p>Eine Klasse beschreibt gemeinsame Struktur und Verhalten; ein Objekt ist eine konkrete Instanz. Für FISI-Grundlagen genügt dieses Modell ohne Vererbungsarchitektur.</p>,
    sections: [
      { title: "Struktur und Verhalten", paragraphs: [<>Die Klasse <code>Gerät</code> kann Attribute wie Inventarnummer und Status sowie eine Methode <code>istErreichbar()</code> beschreiben. <code>Notebook-17</code> wäre ein konkretes Objekt dieser Klasse.</>, <><code>public</code> bezeichnet von außen zugängliche Teile, <code>private</code> verbirgt interne Details. Sichtbarkeit ersetzt keine Autorisierung in einem echten IT-System.</>], activity: <SingleChoiceCheck title="Klasse oder Objekt?" question="Was ist Notebook-17 mit konkreter Seriennummer im Modell?" inputName="programming-object" correctOptionId="object" successMessage="Es ist eine konkrete Instanz der Klasse Gerät." options={[{id:"class",label:"die allgemeine Klasse",explanation:"Die Klasse ist die Vorlage."},{id:"object",label:"ein Objekt",explanation:"Konkrete Werte kennzeichnen eine Instanz."},{id:"method",label:"eine Methode",explanation:"Eine Methode beschreibt Verhalten."},{id:"visibility",label:"eine Sichtbarkeit",explanation:"public/private sind Sichtbarkeiten."}]} /> },
      { title: "Fehler mit Evidenz suchen", paragraphs: [<>Syntaxfehler verletzen Schreibregeln, Laufzeitfehler treten während der Ausführung auf, Logikfehler liefern ein falsches Ergebnis trotz ausführbarem Ablauf. Pseudocodeübungen fokussieren häufig Logik und Grenzen.</>, <>Teste kleine Eingaben, Grenzwerte und erwartete Zwischenergebnisse. Ändere nicht mehrere Stellen gleichzeitig, sonst bleibt die Ursache unklar.</>] },
    ],
    visual: <ResponsiveTable caption="OOP-Grundbegriffe" headers={["Begriff", "Bedeutung", "Beispiel"]} rows={[["Klasse", "Vorlage/Typ", "Gerät"],["Objekt", "konkrete Instanz", "Notebook-17"],["Attribut", "gespeicherte Eigenschaft", "status"],["Methode", "Verhalten", "istErreichbar()"]]} />,
    scenario: { title: "Falscher Alarmstatus", situation: <p>Eine Methode soll WAHR liefern, wenn <code>temperatur &gt; 80</code>. Sie verwendet versehentlich <code>&lt; 80</code>.</p>, tasks: ["Welche Fehlerart liegt vor?", "Mit welchen Testwerten prüfst du die Grenze?"], solution: <p>Es ist ein Logikfehler. Sinnvolle Tests sind 79, 80 und 81; erwartet wird nur bei 81 WAHR, sofern die Grenze strikt größer als 80 lautet.</p> },
    takeaway: ["Klassen beschreiben, Objekte konkretisieren.", "Attribute speichern Zustand, Methoden beschreiben Verhalten.", "Grenzwerttests helfen bei Logikfehlern."],
  },
};

export function ProgrammingLesson({ lessonSlug }: { lessonSlug: string }) {
  const lesson = lessons[lessonSlug];
  if (!lesson) return null;
  return <FundamentalsLesson lessonId={`programming-${lessonSlug}`} {...lesson}>{lesson.visual}</FundamentalsLesson>;
}
