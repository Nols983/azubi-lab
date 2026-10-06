import type { ReactNode } from "react";
import { osiTcpIpExerciseDefinitions } from "../../data/learning-exercises/osi-tcp-ip";
import { FundamentalsLesson, ResponsiveTable, TextFlow, type LessonSection } from "./fundamentals-lesson-elements";
import { PracticeExercise } from "./practice-exercise";

type OsiLesson = {
  objectives: readonly string[];
  intro: ReactNode;
  sections: readonly LessonSection[];
  visual?: ReactNode;
  scenario: { title: string; situation: ReactNode; tasks: readonly ReactNode[]; solution: ReactNode };
  takeaway: readonly ReactNode[];
};

const mappingRows = [
  ["TCP/IP: Anwendung", "OSI 5–7", "HTTP(S), DNS, DHCP, SSH", "Anwendungsnahe Kommunikation und Datenformate"],
  ["TCP/IP: Transport", "OSI 4", "TCP, UDP", "Ende-zu-Ende-Transport, Ports, Zuverlässigkeit je nach Protokoll"],
  ["TCP/IP: Internet", "OSI 3", "IPv4, IPv6, ICMP", "Logische Adressierung und Weiterleitung zwischen Netzen"],
  ["TCP/IP: Netzzugang", "OSI 1–2", "Ethernet, WLAN", "Lokale Übertragung, Frames, Medium und Signale"],
] as const;

const osiRows = [
  ["7 Anwendung", "Netzdienste für Anwendungen", "HTTP, DNS, SMTP", "Daten"],
  ["6 Darstellung", "Darstellung, Codierung, Kompression, Verschlüsselung als Modellaufgaben", "UTF-8, JPEG, TLS wird oft schichtübergreifend eingeordnet", "Daten"],
  ["5 Sitzung", "Sitzungssteuerung und Dialogorganisation als Modellaufgaben", "Sitzungskonzepte, Checkpoints", "Daten"],
  ["4 Transport", "Transport zwischen Endpunkten, Ports, Zuverlässigkeit", "TCP, UDP", "Segment/Datagramm"],
  ["3 Vermittlung", "Logische Adressen und Routing", "IPv4, IPv6, ICMP", "Paket"],
  ["2 Sicherung", "Lokale Frames, MAC-Adressen, Medienzugriff", "Ethernet, WLAN, VLAN", "Frame"],
  ["1 Bitübertragung", "Bits als elektrische, optische oder Funksignale", "Kupfer, Glasfaser, Funk, Stecker", "Bits"],
] as const;

const lessons: Record<string, OsiLesson> = {
  "warum-schichtenmodelle": {
    objectives: ["den Zweck eines Schichtenmodells erklären", "Schnittstellen zwischen Aufgabenbereichen beschreiben", "Modelle als Denkwerkzeug statt als exakte Implementierung einordnen", "ein Fehlerbild schrittweise eingrenzen"],
    intro: <><p>Netzkommunikation verbindet viele Aufgaben: Ein Browser erzeugt eine HTTP-Anfrage, TCP organisiert den Transport, IP findet einen Weg und Ethernet oder WLAN überträgt lokal. <strong>Schichtenmodelle</strong> teilen diese Komplexität in verständliche Verantwortungsbereiche.</p><p>Das OSI- und das TCP/IP-Modell sind Landkarten. Sie helfen beim Erklären, Entwickeln und Diagnostizieren, sind aber nicht das Kabel, der Protokollstack oder die Konfiguration selbst.</p></>,
    sections: [
      { title: "Abgrenzung durch Dienste und Schnittstellen", paragraphs: [<>Eine Schicht nutzt Dienste der darunterliegenden Schicht und bietet der darüberliegenden Schicht eigene Dienste an. Die Anwendung muss beispielsweise nicht wissen, wie einzelne Lichtimpulse in einer Glasfaser entstehen.</>, <>Standards an diesen Grenzen ermöglichen Interoperabilität: Ein anderer Switch oder ein anderes Betriebssystem kann eingesetzt werden, solange die beteiligten Protokolle zusammenpassen.</>], points: ["Komplexe Aufgaben werden in handhabbare Teile zerlegt.", "Änderungen an einer Ebene müssen nicht jede andere Ebene verändern.", "Fachleute können Fehler und Verantwortlichkeiten präziser benennen."] },
      { title: "Modell und Wirklichkeit", paragraphs: [<>OSI beschreibt sieben konzeptionelle Schichten. Das im Internet praktisch verwendete TCP/IP-Modell fasst Aufgaben gröber zusammen.</>, <>Ein reales Protokoll kann mehrere Modellaufgaben berühren. TLS übernimmt beispielsweise Verschlüsselung und Sitzungseigenschaften, läuft aber gewöhnlich über TCP. Deshalb ist „TLS ist immer exakt Schicht 6“ zu starr.</>], note: <><strong>Prüfungsregel:</strong> Ordne nach der hauptsächlichen Funktion im gegebenen Kontext. Erkläre bei Grenzfällen deine Annahme.</> },
      { title: "Schichtenorientierte Fehlersuche", paragraphs: [<>„Das Netzwerk ist kaputt“ ist keine Diagnose. Prüfe zuerst den beobachtbaren Umfang: Link vorhanden? IP-Konfiguration plausibel? Ziel per IP erreichbar? Name auflösbar? TCP-Port offen? Antwortet die Anwendung korrekt?</>, <>Die Reihenfolge muss nicht immer streng von unten nach oben sein. Ein bekanntes Symptom kann einen gezielten Einstieg rechtfertigen; das Modell verhindert jedoch, dass unterschiedliche Ebenen ungeprüft vermischt werden.</>] },
    ],
    visual: <TextFlow caption="Vom Nutzerwunsch zur Übertragung" steps={["Browser und HTTP", "Transport mit TCP", "Routing mit IP", "lokaler Frame", "Bits und Signale"]} />,
    scenario: { title: "Ping funktioniert, HTTPS nicht", situation: <p>Ein Client erreicht den Webserver per IP mit ICMP Echo. Der Browser erhält beim HTTPS-Aufruf jedoch einen Timeout.</p>, tasks: ["Welche Erkenntnis liefert der erfolgreiche Ping?", "Welche Ebenen sind noch nicht bewiesen?", "Welche nächste Beobachtung ist sinnvoll?"], solution: <p>Ein Teil der IP-Erreichbarkeit ist belegt. TCP-Port 443, TLS und der Webdienst bleiben offen. Ein gezielter TCP-/Diensttest und Serverevidenz sind sinnvoller als ein wahlloser Kabeltausch.</p> },
    takeaway: ["Modelle reduzieren Komplexität und schaffen eine gemeinsame Sprache.", "OSI ist keine starre Bauanleitung realer Protokolle.", "Eine erfolgreiche Prüfung auf einer Ebene beweist nicht automatisch alle höheren Ebenen."],
  },
  "die-sieben-osi-schichten": {
    objectives: ["alle sieben OSI-Schichten in richtiger Reihenfolge nennen", "jeder Schicht ihre Hauptaufgabe zuordnen", "typische Protokolle und PDU-Begriffe einordnen", "Grenzfälle vorsichtig formulieren"],
    intro: <><p>Das Referenzmodell der International Organization for Standardization ordnet Kommunikation von der physischen Übertragung auf Schicht 1 bis zu anwendungsnahen Netzdiensten auf Schicht 7.</p><p>Die Schichtnummer ist weniger wichtig als die Frage: <strong>Welche Aufgabe wird hier gelöst?</strong></p></>,
    sections: [
      { title: "Von Signalen zu Anwendungen", paragraphs: [<>Die unteren Schichten kümmern sich um Medium, lokale Zustellung und netzübergreifende Weiterleitung. Die oberen Schichten organisieren Transport und anwendungsnahe Darstellung beziehungsweise Kommunikation.</>], points: ["Schicht 1–2: lokaler Übertragungsweg", "Schicht 3: Wege zwischen IP-Netzen", "Schicht 4: Transport zwischen Anwendungsendpunkten", "Schicht 5–7: sitzungs-, darstellungs- und anwendungsnahe Aufgaben"] },
      { title: "Protokolldateneinheiten (PDU)", paragraphs: [<>PDU bedeutet <strong>Protocol Data Unit</strong>. Je nach Schicht spricht man häufig von Daten, TCP-Segment beziehungsweise UDP-Datagramm, IP-Paket, Frame und Bits.</>, <>Die Benennungen helfen bei präziser Kommunikation. „Das Paket enthält eine MAC-Adresse“ ist ungenau, wenn eigentlich der Ethernet-Frame gemeint ist.</>] },
      { title: "Zuordnungen sind Kontextmodelle", paragraphs: [<>Ethernet umfasst Aspekte von Schicht 1 und 2. WLAN ebenso. Protokolle wie TLS passen je nach Darstellung nicht sauber in genau eine OSI-Schublade.</>, <>In Prüfungssituationen ist eine nachvollziehbare funktionale Begründung wertvoller als eine auswendig gelernte, aber absolut formulierte Zuordnung.</>], activity: <PracticeExercise exercise={osiTcpIpExerciseDefinitions.layerAssignment} /> },
    ],
    visual: <ResponsiveTable caption="Die sieben OSI-Schichten im Überblick" headers={["Schicht", "Hauptaufgabe", "Beispiele", "typische PDU"]} rows={osiRows} />,
    scenario: { title: "Eine Meldung präzisieren", situation: <p>Ein Ticket sagt nur: „Pakete kommen am Switch nicht an.“</p>, tasks: ["Welche PDU könnte mit „Pakete“ gemeint sein?", "Welche Rückfragen schaffen Klarheit?"], solution: <p>Am Switch sind Ethernet-Frames relevant, darin können IP-Pakete liegen. Frage nach Linkstatus, Schnittstelle/VLAN, MAC- und IP-Adressen, Testziel sowie genauer Beobachtung. So wird aus Umgangssprache prüfbare Evidenz.</p> },
    takeaway: ["Die sieben Schichten ordnen Aufgaben, nicht Produkte.", "PDU-Begriffe machen die betrachtete Ebene sichtbar.", "Reale Standards können mehrere Modellaufgaben abdecken."],
  },
  "osi-schichten-1-bis-3": {
    objectives: ["Aufgaben der OSI-Schichten 1 bis 3 unterscheiden", "MAC- und IP-Adresse auseinanderhalten", "Switch und Router schichtbezogen einordnen", "lokale und geroutete Weiterleitung erklären"],
    intro: <><p>Die Schichten 1 bis 3 bringen Daten über ein Medium, durch ein lokales Netz und bei Bedarf in andere IP-Netze. Ein Fehler auf jeder dieser Ebenen kann ähnlich wirken, benötigt aber andere Evidenz.</p></>,
    sections: [
      { title: "Schicht 1: Bitübertragung", paragraphs: [<>Diese Schicht beschreibt die Übertragung einzelner Bits als elektrische, optische oder Funksignale. Kabel, Steckverbindungen, Funkkanäle, Signalpegel und Datenraten gehören in diesen Aufgabenbereich.</>, <>Ein Link-Licht oder gemeldeter Linkstatus ist nützliche Evidenz, beweist aber noch keine korrekte VLAN-, IP- oder Anwendungskonfiguration.</>], points: ["Kupfer und Glasfaser", "WLAN-Funkübertragung", "Repeater und Medienumsetzung als typische physische Funktionen"] },
      { title: "Schicht 2: Sicherung", paragraphs: [<>Ethernet- und WLAN-Frames transportieren Daten im lokalen Layer-2-Bereich. MAC-Adressen identifizieren Schnittstellen für diese lokale Zustellung.</>, <>Ein Layer-2-Switch lernt Quell-MAC-Adressen und leitet Frames anhand der Ziel-MAC-Adresse weiter. VLANs können getrennte Layer-2-Broadcast-Domänen bilden.</>] },
      { title: "Schicht 3: Vermittlung", paragraphs: [<>IP-Adressen beschreiben logische Netzzugehörigkeit. Router betrachten Ziel-IP und Routingtabelle, wählen einen nächsten Hop und verbinden unterschiedliche IP-Netze.</>, <>MAC-Adressen gelten für den jeweiligen lokalen Übertragungsabschnitt; bei einem Routerübergang entsteht ein neuer Layer-2-Frame. Das IP-Paket bleibt grundsätzlich für den Ende-zu-Ende-Weg relevant, auch wenn Felder wie TTL angepasst werden.</>], note: <><strong>Nicht verwechseln:</strong> Ein Switch entscheidet im normalen Layer-2-Betrieb anhand von MAC-Adressen; ein Router trifft Layer-3-Entscheidungen anhand von IP-Netzen.</>, activity: <PracticeExercise exercise={osiTcpIpExerciseDefinitions.lowerLayerRoles} /> },
    ],
    visual: <ResponsiveTable caption="Adressen und Geräte der unteren Schichten" headers={["Ebene", "Information", "typisches Gerät", "Reichweite"]} rows={[["Layer 1", "Bits/Signale", "Repeater, Medienkonverter", "physischer Abschnitt"], ["Layer 2", "MAC-Adresse, VLAN", "Bridge, Switch, Access Point", "lokale Broadcast-Domäne"], ["Layer 3", "IP-Adresse und Präfix", "Router, Layer-3-Switch", "zwischen IP-Netzen"]]} />,
    scenario: { title: "Zwei Netze sollen kommunizieren", situation: <p>PC-A hat <code>192.168.10.20/24</code>, PC-B <code>192.168.20.30/24</code>. Beide hängen an einem reinen Layer-2-Switch.</p>, tasks: ["Warum reicht die MAC-Tabelle des Switches nicht?", "Welche Funktion fehlt?"], solution: <p>Die Hosts liegen in unterschiedlichen IP-Netzen. Sie benötigen eine Layer-3-Route und passende Gateway-Konfiguration, beispielsweise über einen Router oder Layer-3-Switch. Ein normaler Layer-2-Switch erzeugt diese Route nicht.</p> },
    takeaway: ["Layer 1 überträgt Signale, Layer 2 lokale Frames und Layer 3 Pakete zwischen Netzen.", "MAC- und IP-Adressen erfüllen unterschiedliche Aufgaben.", "Link vorhanden bedeutet nicht automatisch IP-Kommunikation vorhanden."],
  },
  "osi-schichten-4-bis-7": {
    objectives: ["TCP und UDP auf Schicht 4 unterscheiden", "Ports als Transportendpunkte erklären", "Aufgaben der Schichten 5 bis 7 konzeptionell beschreiben", "Anwendungsfehler von Transportfehlern abgrenzen"],
    intro: <><p>Ab Schicht 4 steht nicht mehr nur der Weg zum Host im Mittelpunkt, sondern die Kommunikation zwischen Anwendungsendpunkten und die Bedeutung der übertragenen Daten.</p></>,
    sections: [
      { title: "Schicht 4: Transport", paragraphs: [<>TCP stellt eine verbindungsorientierte, geordnete und bestätigte Übertragung bereit. UDP arbeitet verbindungslos und ohne dieselben eingebauten Zustellgarantien; Anwendungen können bei Bedarf eigene Mechanismen ergänzen.</>, <>Portnummern helfen, Daten einem Dienst beziehungsweise Prozesskontext zuzuordnen. Ein erreichbarer Host kann dennoch auf TCP-Port 443 keinen Dienst anbieten.</>], points: ["TCP: Sequenzierung, Bestätigungen, Fluss- und Überlastungssteuerung", "UDP: geringer Protokollaufwand, datagrammorientiert", "Die Wahl hängt von den Anforderungen der Anwendung ab."] },
      { title: "Schichten 5 und 6", paragraphs: [<>Die Sitzungsschicht modelliert Aufbau, Steuerung und Wiederaufnahme von Dialogen. Die Darstellungsschicht modelliert gemeinsame Datenrepräsentation, Codierung, Kompression und Verschlüsselung.</>, <>Moderne Protokollstacks bilden diese Aufgaben nicht zwingend als getrennte Softwaremodule ab. TLS, JSON, UTF-8 oder JPEG lassen sich funktional besprechen, ohne ihnen eine absolut exklusive OSI-Schicht zuzuschreiben.</>] },
      { title: "Schicht 7: Anwendung", paragraphs: [<>Hier liegen netznahe Dienste für Anwendungen, etwa HTTP, DNS, DHCP, SMTP oder SSH. „Anwendungsschicht“ bedeutet nicht nur grafisches Programm: Der Browser nutzt HTTP, aber HTTP ist nicht der Browser selbst.</>, <>Eine HTTP-Antwort <code>503 Service Unavailable</code> zeigt, dass mehrere untere Ebenen bereits funktioniert haben. Die Ursache liegt eher am Dienst oder seinen Abhängigkeiten als am fehlenden Kabel.</>] },
    ],
    visual: <ResponsiveTable caption="TCP und UDP vergleichen" headers={["Merkmal", "TCP", "UDP"]} rows={[["Kommunikationsart", "verbindungsorientiert", "verbindungslos/datagrammorientiert"], ["Reihenfolge und Bestätigung", "im Protokoll vorgesehen", "nicht im Basisprotokoll garantiert"], ["Beispiele", "HTTPS, SSH, SMTP", "DNS-Anfragen, DHCP, Echtzeitverkehr – abhängig von Anwendung"], ["Bewertung", "mehr Funktionen und Zustand", "geringerer Protokollaufwand"]]} />,
    scenario: { title: "IP erreichbar, Port abgelehnt", situation: <p>Der Server antwortet auf Ping. Eine TCP-Verbindung zu Port 22 wird sofort abgelehnt.</p>, tasks: ["Welche unteren Ebenen liefern bereits Evidenz?", "Was deutet die Ablehnung an?"], solution: <p>IP-Erreichbarkeit besteht zumindest für ICMP. Eine aktive Ablehnung spricht häufig dafür, dass der Zielhost erreichbar ist, aber kein passender Listener vorhanden ist oder eine Komponente aktiv ablehnt. Dienststatus, Zielport und Filterregeln sind jetzt relevanter als die IP-Adresse neu zu setzen.</p> },
    takeaway: ["TCP und UDP lösen Transportaufgaben mit unterschiedlichen Eigenschaften.", "Ports unterscheiden Transportendpunkte, nicht physische Anschlüsse.", "Anwendungsantworten sind wichtige Evidenz für funktionierende untere Ebenen."],
  },
  "tcp-ip-modell": {
    objectives: ["die vier Schichten des TCP/IP-Modells nennen", "typische Protokolle zuordnen", "das Modell als Internet-Protokollfamilie einordnen", "eine Kommunikation entlang der Schichten erklären"],
    intro: <><p>Das TCP/IP-Modell entstand aus der praktischen Internet-Protokollfamilie. Häufig wird es mit vier Schichten dargestellt: Netzzugang, Internet, Transport und Anwendung.</p><p>Literatur kann eine fünfschichtige Darstellung verwenden, in der Bitübertragung und Sicherung getrennt werden. Entscheidend ist, die verwendete Modellvariante zu benennen.</p></>,
    sections: [
      { title: "Netzzugang und Internet", paragraphs: [<>Die Netzzugangsschicht umfasst die lokale Übertragung über Technologien wie Ethernet oder WLAN. Sie deckt grob die OSI-Schichten 1 und 2 ab.</>, <>Die Internetschicht stellt mit IP logische Adressierung und paketvermittelte Weiterleitung über Netzgrenzen bereit. ICMP unterstützt Kontroll- und Fehlermeldungen.</>] },
      { title: "Transport und Anwendung", paragraphs: [<>TCP und UDP gehören zur Transportschicht. Darüber fasst die TCP/IP-Anwendungsschicht Aufgaben zusammen, die OSI auf Sitzung, Darstellung und Anwendung verteilt.</>, <>HTTP, DNS und DHCP nutzen die unteren Schichten, lösen aber unterschiedliche Anwendungsaufgaben. DNS ersetzt weder IP noch Routing; es liefert unter anderem Namensinformationen.</>] },
      { title: "Warum beide Modelle lernen?", paragraphs: [<>TCP/IP beschreibt die im Internet eingesetzte Protokollfamilie praxisnah. OSI liefert eine feinere gemeinsame Begriffswelt für Aufgaben und Fehlersuche.</>, <>FISI-Fachkräfte begegnen beiden Darstellungen in Dokumentationen, Prüfungen, Herstellerunterlagen und Gesprächen. Eine Übersetzung zwischen beiden verhindert Missverständnisse.</>] },
    ],
    visual: <ResponsiveTable caption="TCP/IP-Schichten mit typischen Beispielen" headers={["TCP/IP-Schicht", "OSI-Bezug", "Protokolle/Technologien", "Kernaufgabe"]} rows={mappingRows} />,
    scenario: { title: "Webaufruf im TCP/IP-Modell", situation: <p>Ein Browser öffnet <code>https://intranet.firma.test</code> über Ethernet.</p>, tasks: ["Welche vier TCP/IP-Schichten sind beteiligt?", "Welche Beispiele passen jeweils?"], solution: <p>Anwendung: DNS, HTTP und TLS-nahe Funktionen; Transport: üblicherweise TCP für HTTPS; Internet: IP; Netzzugang: Ethernet-Frames und physische Übertragung. Die genaue Implementierung ist umfangreicher, aber diese Zuordnung erklärt den Datenpfad.</p> },
    takeaway: ["TCP/IP fasst Kommunikationsaufgaben in vier verbreitete Schichten.", "Unterschiedliche Lehrdarstellungen können vier oder fünf Schichten nutzen.", "Das Modell ergänzt die feinere OSI-Begriffswelt."],
  },
  "osi-und-tcp-ip-vergleichen": {
    objectives: ["OSI- und TCP/IP-Schichten zueinander in Beziehung setzen", "Herkunft und Zweck beider Modelle unterscheiden", "unterschiedliche Mapping-Varianten bewerten", "absolute Fehlzuordnungen vermeiden"],
    intro: <><p>OSI ist ein allgemeines siebenschichtiges Referenzmodell. TCP/IP ist enger mit den tatsächlich eingesetzten Internetprotokollen verbunden und fasst mehrere OSI-Aufgaben zusammen.</p></>,
    sections: [
      { title: "Ähnlichkeiten", paragraphs: [<>Beide Modelle trennen lokale Übertragung, netzübergreifende Adressierung, Transport und anwendungsnahe Kommunikation. Beide helfen, Abhängigkeiten und Schnittstellen sichtbar zu machen.</>, <>IP passt funktional zur Vermittlung beziehungsweise Internetschicht; TCP und UDP passen zur Transportebene. Diese Zuordnungen sind im Alltag besonders stabil.</>] },
      { title: "Unterschiede", paragraphs: [<>OSI unterscheidet Sitzung, Darstellung und Anwendung. TCP/IP fasst diese gewöhnlich in der Anwendungsschicht zusammen. OSI trennt außerdem Bitübertragung und Sicherung, während ein vierstufiges TCP/IP-Modell beide im Netzzugang bündelt.</>, <>OSI ist primär Referenz- und Kommunikationsmodell. TCP/IP bezeichnet zugleich eine konkrete Protokollfamilie und ein daraus abgeleitetes Modell.</>], activity: <PracticeExercise exercise={osiTcpIpExerciseDefinitions.tcpIpMapping} /> },
      { title: "Keine perfekte Eins-zu-eins-Abbildung", paragraphs: [<>Protokolle und Systeme wurden nicht alle nach einer einzigen Modellzeichnung implementiert. VPN-Tunnel, TLS, MPLS oder virtuelle Switches berühren je nach Perspektive mehrere Ebenen.</>, <>Formuliere deshalb „wird typischerweise zugeordnet“ oder „übernimmt hauptsächlich“ statt „kann ausschließlich auf dieser Schicht existieren“.</>], note: <><strong>Merksatz:</strong> Modelle sollen die Realität verständlich machen. Wenn die Realität nicht perfekt in ein Kästchen passt, ist nicht automatisch die Realität falsch.</> },
    ],
    visual: <ResponsiveTable caption="Grobe Zuordnung von TCP/IP zu OSI" headers={["TCP/IP", "OSI", "wichtige Einschränkung", "Beispiel"]} rows={mappingRows} />,
    scenario: { title: "TLS zuordnen", situation: <p>In zwei Lernunterlagen wird TLS einmal der Darstellungs- und einmal der Anwendungsschicht zugeordnet.</p>, tasks: ["Ist zwingend eine Unterlage falsch?", "Wie formulierst du fachlich sauber?"], solution: <p>Nicht zwingend. TLS erfüllt unter anderem Darstellungs-/Sicherheitsfunktionen, ist im TCP/IP-Modell aber Teil des anwendungsnahen Stacks über dem Transport. Nenne Modell und Betrachtung, statt eine universelle exklusive Schicht zu behaupten.</p> },
    takeaway: ["OSI ist feiner, TCP/IP näher an der Internetprotokollpraxis.", "Die Zuordnung ist funktional und nicht überall exakt.", "Eine gute Antwort nennt Modell, Hauptfunktion und gegebenenfalls die Grenze der Vereinfachung."],
  },
  "kapselung-und-datenfluss": {
    objectives: ["Kapselung und Entkapselung erklären", "Header und Nutzdaten unterscheiden", "PDUs entlang eines Webaufrufs benennen", "Adressinformationen pro Übertragungsabschnitt einordnen"],
    intro: <><p>Beim Senden erhält die Nutzinformation schrittweise Steuerinformationen der beteiligten Protokolle. Dieser Vorgang heißt <strong>Kapselung</strong>. Am Ziel werden die Informationen ausgewertet und schrittweise entfernt: <strong>Entkapselung</strong>.</p></>,
    sections: [
      { title: "Vom HTTP-Inhalt zum Signal", paragraphs: [<>Die HTTP-Nachricht wird beispielsweise in einem TCP-Segment transportiert. Dieses wird Nutzlast eines IP-Pakets, das wiederum in einem Ethernet-Frame liegt. Der Frame wird als Bitfolge über das Medium übertragen.</>, <>Jeder Header enthält Informationen für seine Ebene: TCP-Ports, IP-Adressen sowie lokale MAC-Adressen. Ein zusätzlicher Trailer kann etwa eine Fehlererkennung für den Frame enthalten.</>], activity: <PracticeExercise exercise={osiTcpIpExerciseDefinitions.encapsulationOrder} /> },
      { title: "Am Router", paragraphs: [<>Ein Router empfängt einen lokalen Frame, prüft das enthaltene IP-Paket und wählt anhand der Ziel-IP einen Ausgang. Für den nächsten Link kapselt er das Paket in einen neuen Layer-2-Frame.</>, <>Darum können sich Quell- und Ziel-MAC-Adressen von Abschnitt zu Abschnitt ändern. Die Ende-zu-Ende-IP-Adressen bleiben bei normalem Routing grundsätzlich erhalten; NAT wäre eine zusätzliche Funktion, die Adressen verändern kann.</>] },
      { title: "Am Empfänger", paragraphs: [<>Die Netzwerkschnittstelle verarbeitet den Frame, IP liefert das Paket an das passende Transportprotokoll und TCP ordnet die Daten über Ports und Verbindungszustand zu. Schließlich verarbeitet der Webserver die HTTP-Anfrage.</>, <>Prüfsummen, Sequenznummern und weitere Felder haben je nach Protokoll unterschiedliche Aufgaben. „Jede Schicht verschlüsselt“ oder „jeder Header ist gleich“ wäre falsch.</>], activity: <PracticeExercise exercise={osiTcpIpExerciseDefinitions.decapsulationOrder} /> },
    ],
    visual: <TextFlow caption="Kapselung eines klassischen HTTPS-Datenstroms" steps={["HTTP-Nutzdaten", "TCP-Segment", "IP-Paket", "Ethernet-Frame", "Bits/Signal"]} />,
    scenario: { title: "Frame über zwei Router", situation: <p>Ein Client sendet ein IP-Paket über zwei Router an einen Server.</p>, tasks: ["Bleibt derselbe Ethernet-Frame vollständig erhalten?", "Welche Adressart steuert die Routerentscheidung?", "Was entsteht auf jedem Link neu?"], solution: <p>Der ursprüngliche Layer-2-Frame endet am ersten Router. Der Router entscheidet anhand der Ziel-IP und erzeugt für den nächsten Link einen passenden neuen Frame. Das wiederholt sich an weiteren Layer-3-Hops.</p> },
    takeaway: ["Kapselung fügt schichtspezifische Steuerinformationen hinzu.", "Router bilden neue lokale Frames für den nächsten Abschnitt.", "PDU-Begriffe zeigen, welche Ebene gerade untersucht wird."],
  },
  "fehlersuche-mit-schichtenmodell": {
    objectives: ["Symptome passenden Diagnoseebenen zuordnen", "Evidenz von Schlussfolgerungen trennen", "einen sinnvollen nächsten Test wählen", "Schichtenmodelle ohne starre Reihenfolge nutzen"],
    intro: <><p>Das Schichtenmodell ist ein Diagnosegerüst: Es erinnert daran, dass ein Anwendungsfehler viele Voraussetzungen hat. Eine gute Fehlersuche bestätigt diese Voraussetzungen mit gezielten Beobachtungen.</p></>,
    sections: [
      { title: "Von unten nach oben – wenn es passt", paragraphs: [<>Bei völlig fehlender Verbindung ist Linkstatus ein guter Start. Danach folgen IP-Konfiguration, lokaler Nachbar beziehungsweise Gateway, Routing, Namensauflösung, Transportport und Anwendung.</>, <>Bei einer klaren HTTP-Fehlermeldung wäre es ineffizient, zuerst jedes Kabel zu tauschen. Die Antwort selbst ist Evidenz, dass viele untere Schritte erfolgreich waren.</>], points: ["Layer 1: Link, Medium, Signal", "Layer 2: VLAN, MAC-Lernen, lokaler Framepfad", "Layer 3: Adresse, Präfix, Gateway, Route", "Layer 4: TCP/UDP, Port, Timeout oder Ablehnung", "Layer 7: DNS-/HTTP-/Dienstantwort und Logs"] },
      { title: "Tests richtig deuten", paragraphs: [<>Ein erfolgreicher Ping beweist keine DNS-Auflösung und keinen HTTPS-Dienst. Ein DNS-Ergebnis beweist keinen erreichbaren Zielport. Eine TCP-Verbindung beweist noch keine fachlich korrekte Webantwort.</>, <>Auch Fehlschläge sind selten eindeutige Ursachen: ICMP kann gefiltert sein, ein Timeout kann Hin- oder Rückweg, Filter oder einen hängenden Dienst betreffen.</>], activity: <PracticeExercise exercise={osiTcpIpExerciseDefinitions.troubleshootingFocus} /> },
      { title: "Dokumentierte Hypothesen", paragraphs: [<>Notiere Symptom, Umfang, Zeitpunkt, Known-Good-Vergleich, Hypothese, Test und Ergebnis. Ändere erst nach ausreichender Diagnose und möglichst nur einen kontrollierten Faktor.</>, <>Diese Arbeitsweise verbindet das Modell mit dem bestehenden Azubi-Lab-Modul zur systematischen Netzwerkfehleranalyse.</>] },
    ],
    visual: <ResponsiveTable caption="Evidenz entlang der Schichten" headers={["Beobachtung", "spricht für", "beweist nicht", "nächster Fokus"]} rows={[["Link up", "physische Verbindung erkannt", "korrektes VLAN/IP", "Layer 2/3"], ["Ping zur IP erfolgreich", "Teil der IP-/ICMP-Erreichbarkeit", "DNS, TCP-Port, Anwendung", "gezielter Diensttest"], ["DNS liefert Ziel-IP", "Namensauflösung antwortet", "Pfad oder Dienst gesund", "IP/Transport"], ["HTTP 503", "Anwendungspfad antwortet", "Backend gesund", "Dienst und Abhängigkeiten"]]} />,
    scenario: { title: "Website nur per IP erreichbar", situation: <p>Der Client erreicht <code>192.0.2.20</code> und öffnet dort eine Testseite. <code>intranet.firma.test</code> kann nicht aufgelöst werden.</p>, tasks: ["Welche Ebenen sind teilweise bestätigt?", "Welche Funktion ist der stärkste nächste Fokus?", "Welche Änderung wäre voreilig?"], solution: <p>Lokale Übertragung, IP-Pfad, Transport und Webantwort funktionieren im getesteten Pfad. Die Namensauflösung ist der klare Fokus. Router oder Switch ohne weitere Evidenz neu zu konfigurieren wäre voreilig.</p> },
    takeaway: ["Beginne mit der stärksten vorhandenen Evidenz.", "Ein Test bestätigt nur das, was er tatsächlich beobachtet.", "Schichten helfen beim Eingrenzen, ersetzen aber keine Hypothesen und Dokumentation."],
  },
};

export function OsiTcpIpLesson({ lessonSlug }: { lessonSlug: string }) {
  const lesson = lessons[lessonSlug];
  if (!lesson) return null;
  return <FundamentalsLesson lessonId={`osi-${lessonSlug}`} {...lesson} relatedLinks={[{ href: "/lernen/netzwerkfehler-systematisch-analysieren", label: "Netzwerkfehler systematisch analysieren" }, { href: "/lernen/ipv4-grundlagen", label: "IPv4 Grundlagen" }]}>{lesson.visual}</FundamentalsLesson>;
}

export const osiTcpIpLessonSlugs = Object.freeze(Object.keys(lessons));
