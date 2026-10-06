import type { ReactNode } from "react";
import { networkTopologyExerciseDefinitions } from "../../data/learning-exercises/network-topologies";
import { FundamentalsLesson, ResponsiveTable, TextFlow, type LessonSection } from "./fundamentals-lesson-elements";
import { PracticeExercise } from "./practice-exercise";

type TopologyLesson = {
  objectives: readonly string[];
  intro: ReactNode;
  sections: readonly LessonSection[];
  visual?: ReactNode;
  scenario: { title: string; situation: ReactNode; tasks: readonly ReactNode[]; solution: ReactNode };
  takeaway: readonly ReactNode[];
};

const overviewRows = [
  ["Punkt-zu-Punkt", "zwei Endpunkte direkt", "einfach, vorhersehbar", "keine eingebaute alternative Route"],
  ["Bus", "gemeinsames lineares Medium", "wenig Kabel im historischen Aufbau", "gemeinsames Medium und empfindliche Busfehler"],
  ["Ring", "Knoten bilden geschlossenen Pfad", "geregelter Umlauf; Redundanz möglich", "Ausfallverhalten hängt stark vom Ringverfahren ab"],
  ["Stern", "Endpunkte an zentralem Knoten", "übersichtlich, einzelne Anschlussfehler lokal", "zentrale Komponente ist kritisch"],
  ["Baum", "hierarchisch verbundene Sterne", "skalierbare Struktur", "Ausfälle oben betreffen ganze Äste"],
  ["vermascht", "mehrere alternative Verbindungen", "Redundanz und Pfadwahl", "Kosten und Komplexität"],
] as const;

const lessons: Record<string, TopologyLesson> = {
  "was-ist-eine-netzwerktopologie": {
    objectives: ["Netzwerktopologie definieren", "physische und logische Sicht unterscheiden", "Struktur von Produktnamen trennen", "Topologien anhand von Anforderungen vergleichen"],
    intro: <><p>Eine Netzwerktopologie beschreibt, wie Komponenten und Verbindungen angeordnet sind oder wie Kommunikation logisch fließt. Sie ist ein Modell für Struktur und Abhängigkeiten, keine vollständige Konfiguration.</p></>,
    sections: [
      { title: "Physische Topologie", paragraphs: [<>Die physische Sicht zeigt Kabel, Funkzellen, Ports, Racks und Geräteverbindungen. Moderne Ethernet-Arbeitsplätze sind meist physisch sternförmig an Switches angeschlossen; mehrere Switch-Ebenen ergeben häufig einen Baum.</>, <>Diese Sicht hilft bei Kabelbruch, Stromversorgung, Rackplanung, Portkapazität und physischen Single Points of Failure.</>] },
      { title: "Logische Topologie", paragraphs: [<>Die logische Sicht beschreibt Verkehrswege, Broadcast-Domänen, VLANs, Tunnel und Protokollbeziehungen. Zwei physisch nahe Ports können logisch getrennt sein; ein Tunnel kann entfernte Standorte logisch verbinden.</>, <>Physische und logische Topologie können daher unterschiedlich aussehen. Dokumentationen sollten deutlich benennen, welche Sicht dargestellt ist.</>] },
      { title: "Keine universell beste Form", paragraphs: [<>Kosten, Verfügbarkeit, Skalierbarkeit, Latenz, Verkabelung und Betrieb bestimmen die Auswahl. Eine Vollvermaschung bietet viele direkte Pfade, wäre für hunderte Arbeitsplatz-PCs aber meist unnötig teuer und komplex.</>, <>Reale Netze sind häufig hybrid: sternförmige Access-Bereiche, hierarchische Verteilung und teilweise vermaschte Kern- oder WAN-Verbindungen.</>], activity: <PracticeExercise exercise={networkTopologyExerciseDefinitions.identification} /> },
    ],
    visual: <ResponsiveTable caption="Grundtopologien und zentrale Abwägung" headers={["Topologie", "Struktur", "Stärke", "Grenze"]} rows={overviewRows} />,
    scenario: { title: "Zwei unterschiedliche Zeichnungen", situation: <p>Ein Plan zeigt jeden PC mit eigenem Kabel zum Switch. Ein anderer Plan zeigt VLAN 10 über mehrere Switches und Access Points.</p>, tasks: ["Welche Zeichnung ist eher physisch?", "Welche ist eher logisch?", "Können beide dasselbe Netz beschreiben?"], solution: <p>Der Verkabelungsplan ist physisch, der VLAN-/Verkehrsplan logisch. Beide können verschiedene Sichten derselben Umgebung darstellen und widersprechen sich nicht automatisch.</p> },
    takeaway: ["Topologie beschreibt Struktur oder logischen Verkehrsfluss.", "Physische und logische Sicht sind getrennt zu dokumentieren.", "Die passende Topologie folgt Anforderungen, nicht einem universellen Ranking."],
  },
  "punkt-zu-punkt-und-bus": {
    objectives: ["Punkt-zu-Punkt- und Bustopologie erklären", "historische Busnetze einordnen", "Fehlerfolgen vergleichen", "gemeinsames Medium von direkter Verbindung unterscheiden"],
    intro: <><p>Die einfachste Verbindung führt direkt zwischen zwei Endpunkten. Ein Bus lässt dagegen mehrere Teilnehmer ein gemeinsames lineares Medium nutzen.</p></>,
    sections: [
      { title: "Punkt-zu-Punkt", paragraphs: [<>Eine Punkt-zu-Punkt-Verbindung verbindet genau zwei Endpunkte, etwa zwei Router über einen WAN-Link oder einen PC mit einem Switchport. Der Link ist leicht abzugrenzen und seine Kapazität wird nicht mit weiteren Teilnehmern desselben Links geteilt.</>, <>Ohne zweiten Pfad trennt ein Link- oder Portausfall die beiden Endpunkte. Redundanz entsteht erst durch zusätzliche unabhängig geplante Wege.</>] },
      { title: "Bus", paragraphs: [<>Bei einer Bustopologie hängen mehrere Stationen an einem gemeinsamen linearen Medium. Historisches Koax-Ethernet wie 10BASE2/10BASE5 benötigte korrekte Terminierung an den Enden.</>, <>Ein Kabel-, Stecker- oder Terminierungsfehler konnte den gesamten Bus beeinträchtigen. Alle Teilnehmer teilten sich Medium und Kollisionsbereich; Erweiterung und Fehlersuche waren aufwendig.</>] },
      { title: "Heutige Einordnung", paragraphs: [<>Klassische Ethernet-Busse sind in modernen LANs weitgehend verschwunden. Busähnliche physische oder logische Strukturen existieren in anderen technischen Systemen, dürfen aber nicht pauschal mit altem Koax-Ethernet gleichgesetzt werden.</>, <>Moderne Switchlinks sind physisch einzelne Punkt-zu-Punkt-Verbindungen, die zusammen häufig eine Stern- oder Baumstruktur bilden.</>] },
    ],
    visual: <ResponsiveTable caption="Punkt-zu-Punkt und Bus vergleichen" headers={["Merkmal", "Punkt-zu-Punkt", "Bus"]} rows={[["Teilnehmer je Link/Medium", "zwei", "mehrere"], ["Fehlerwirkung", "betrifft diesen Link", "Mediumfehler kann alle betreffen"], ["Erweiterung", "zusätzlicher Link/Port", "historisch Eingriff ins gemeinsame Medium"], ["heutiges Ethernet-LAN", "an Switchports üblich", "klassisch historisch"]]} />,
    scenario: { title: "Koax-Netz mit offenem Ende", situation: <p>In einem historischen 10BASE2-Segment wird ein Terminator entfernt. Mehrere Stationen verlieren gleichzeitig die Verbindung.</p>, tasks: ["Warum ist der Fehler nicht auf einen Arbeitsplatz begrenzt?", "Wie unterscheidet sich das vom einzelnen Kabel in einem Stern?"], solution: <p>Alle Stationen teilen den Bus; falsche Terminierung stört das gemeinsame Medium. In einer Sternverkabelung betrifft ein defektes Endgerätekabel normalerweise nur diesen Anschluss, solange der zentrale Switch gesund ist.</p> },
    takeaway: ["Punkt-zu-Punkt verbindet genau zwei Endpunkte.", "Ein Bus teilt Medium und Fehlerbereich mit mehreren Teilnehmern.", "Klassisches Ethernet nutzt heute üblicherweise geswitchte Links statt Koax-Bus."],
  },
  "ring": {
    objectives: ["Ringtopologie beschreiben", "physischen und logischen Ring unterscheiden", "Ausfallverhalten mit und ohne Schutzmechanismus erklären", "historische und moderne Ringbeispiele einordnen"],
    intro: <><p>In einem Ring ist jeder Knoten mit Nachbarn verbunden, sodass ein geschlossener Weg entsteht. Kommunikation kann in eine Richtung oder über zwei Richtungen geführt werden.</p></>,
    sections: [
      { title: "Einfacher Ring", paragraphs: [<>Bei einem einfachen gerichteten Ring durchläuft Verkehr nacheinander Knoten. Ein einzelner unterbrochener Link oder ausgefallener Knoten kann ohne Umgehung den Ring öffnen und die Kommunikation vieler Teilnehmer stören.</>, <>Historisches Token Ring regelte den Medienzugriff logisch über ein Token. Die physische Verkabelung konnte durch Konzentratoren anders aussehen als der logische Ring.</>] },
      { title: "Redundante Ringe", paragraphs: [<>Industrie-, Metro- und Providernetze können Ringstrukturen mit zweitem Weg und Schutzprotokollen verwenden. Bei einem Fehler wird Verkehr kontrolliert über die verbleibende Richtung geführt.</>, <>Ein zweites Kabel allein garantiert keine Redundanz. Umschaltverfahren, Schleifenschutz, getrennte Trassen, Kapazität und getestete Konvergenz gehören zum Design.</>] },
      { title: "Vor- und Nachteile", paragraphs: [<>Ein Ring kann planbare Wege und mit geeignetem Verfahren Redundanz bieten. Gleichzeitig wachsen Abhängigkeiten, Umlaufwege und Betriebsaufwand.</>, <>Ob ein Ring aktuell oder historisch ist, hängt von der Technologie ab: Token Ring im Büro ist historisch, Ringkonzepte in Transport- oder Industrienetzen sind weiterhin relevant.</>] },
    ],
    visual: <TextFlow caption="Logischer Ringpfad" steps={["Knoten A", "Knoten B", "Knoten C", "Knoten D", "zurück zu A"]} />,
    scenario: { title: "Ein Link im Schutzring fällt aus", situation: <p>Vier Standorte sind als Ring mit einem dokumentierten Schutzverfahren verbunden. Eine Trasse wird getrennt.</p>, tasks: ["Muss der gesamte Ring ausfallen?", "Welche Faktoren entscheiden?"], solution: <p>Mit funktionierendem Schutzverfahren kann der verbleibende Weg übernehmen. Entscheidend sind reale Trassentrennung, Protokollzustand, Umschaltzeit und ausreichende Restkapazität. Ohne Schutzmechanismus kann die Unterbrechung den Ring zerlegen.</p> },
    takeaway: ["Ring beschreibt einen geschlossenen Nachbarschaftspfad.", "Ausfallverhalten hängt vom Verfahren und vorhandenen Gegenweg ab.", "Physische und logische Ringform können verschieden sein."],
  },
  "stern": {
    objectives: ["Sterntopologie erklären", "Endgeräte- und Zentralfehler unterscheiden", "moderne Ethernet- und WLAN-Beispiele einordnen", "Single Points of Failure erkennen"],
    intro: <><p>Bei einer Sterntopologie besitzt jeder Endpunkt eine eigene Verbindung zu einer zentralen Komponente. Im Ethernet-LAN ist das typischerweise ein Switch; im WLAN bildet ein Access Point den Funk-Zugangspunkt einer Zelle.</p></>,
    sections: [
      { title: "Lokalisierbare Anschlussfehler", paragraphs: [<>Fällt das Kabel eines Arbeitsplatzes aus, bleibt die Kommunikation anderer Switchports normalerweise erhalten. Der Fehlerbereich ist klarer als bei einem gemeinsamen Bus.</>, <>Auch Portfehler, falsche VLAN-Zuordnung oder die Netzwerkkarte des Clients lassen sich einem einzelnen Ast zuordnen.</>] },
      { title: "Kritisches Zentrum", paragraphs: [<>Fällt der einzige zentrale Switch samt Stromversorgung aus, verlieren alle direkt angeschlossenen Teilnehmer ihre Verbindung. Die übersichtliche Struktur bündelt also zugleich ein Risiko.</>, <>Redundante Switches, Uplinks und Stromversorgung können Risiken reduzieren, benötigen aber korrektes Design. Endgeräte mit nur einem Anschluss bleiben eventuell weiterhin von einem einzelnen Pfad abhängig.</>], activity: <PracticeExercise exercise={networkTopologyExerciseDefinitions.starFailures} /> },
      { title: "WLAN als Infrastrukturstern", paragraphs: [<>WLAN-Clients kommunizieren in einer Infrastrukturzelle über den Access Point. Physisch ist das ein Funkstern, obwohl sich alle Clients das Funkmedium teilen und Medienzugriff anders funktioniert als bei Full-Duplex-Ethernet.</>, <>Mehrere Access Points mit zentralem Management ergeben keine einzige einfache Sternform; die Gesamtstruktur wird oft hybrid oder hierarchisch.</>] },
    ],
    visual: <ResponsiveTable caption="Ausfälle in einem einfachen Stern" headers={["Fehler", "typische direkte Wirkung", "mögliche Vorsorge"]} rows={[["Clientkabel", "ein Client betroffen", "Ersatzkabel/zweiter Pfad bei Bedarf"], ["ein Switchport", "ein Anschluss betroffen", "anderer Port/Redundanz"], ["zentraler Switch", "alle angeschlossenen Äste betroffen", "redundante Komponenten/Uplinks"], ["Strom am Verteiler", "zentrale Komponente fällt aus", "USV und getrennte Versorgung"]]} />,
    scenario: { title: "Ein Arbeitsplatzkabel fällt aus", situation: <p>PC-07 verliert wegen eines gebrochenen Patchkabels den Link. Alle anderen PCs am Switch arbeiten weiter.</p>, tasks: ["Welche Topologie passt?", "Warum bleibt der Fehler lokal?", "Welcher andere Fehler hätte größere Wirkung?"], solution: <p>Das passt zum Stern. Jeder Client hat einen eigenen Ast; sein Kabelausfall betrifft diesen Ast. Ein Ausfall des zentralen Switches oder seines Uplinks könnte dagegen alle angeschlossenen Teilnehmer treffen.</p> },
    takeaway: ["Sternstrukturen isolieren viele Endanschlussfehler.", "Die zentrale Komponente ist ein möglicher Single Point of Failure.", "Modernes Ethernet nutzt typischerweise physische Sterne."],
  },
  "baum": {
    objectives: ["Baumtopologie als Hierarchie von Sternen erklären", "Access-, Distribution- und Core-Ebenen konzeptionell einordnen", "Ausfallfolgen je Hierarchieebene beurteilen", "Skalierung und Redundanz abwägen"],
    intro: <><p>Eine Baumtopologie verbindet mehrere Sterne hierarchisch. Arbeitsplatz-Switches führen zu Verteilern, die wiederum an einen Kern oder zentrale Dienste angebunden sind.</p></>,
    sections: [
      { title: "Hierarchische Struktur", paragraphs: [<>Access-Komponenten binden Endgeräte an. Distribution sammelt Bereiche und kann Richtlinien oder Routing übernehmen. Ein Core transportiert große Verkehrsmengen zwischen zentralen Teilen.</>, <>Nicht jedes kleine Netz braucht drei physisch getrennte Ebenen. Die Begriffe beschreiben Rollen, die je nach Größe zusammengefasst werden können.</>] },
      { title: "Ausfälle folgen dem Ast", paragraphs: [<>Ein Endkabel betrifft einen Teilnehmer, ein Access-Switch eine Gruppe und dessen einzelner Uplink den gesamten nachgelagerten Ast. Ein zentraler Core-Ausfall kann sehr viele Bereiche betreffen.</>, <>Daher erhalten höher gelegene, stärker geteilte Komponenten häufig mehr Redundanz, Kapazität, Überwachung und Schutz.</>] },
      { title: "Skalierbarkeit und Grenzen", paragraphs: [<>Hierarchie erleichtert strukturierte Verkabelung, Adressierung und Betrieb. Neue Access-Bereiche lassen sich planbar ergänzen.</>, <>Zu tiefe oder ungleich dimensionierte Bäume können Engpässe und lange Fehlerketten erzeugen. Oversubscription, Uplink-Kapazität und Pfadredundanz müssen zu den Anforderungen passen.</>] },
    ],
    visual: <TextFlow caption="Vereinfachter Hierarchiepfad" steps={["Endgerät", "Access-Switch", "Distribution", "Core", "Server/anderer Bereich"]} />,
    scenario: { title: "Uplink eines Etagen-Switches", situation: <p>Der Switch selbst läuft, aber sein einziger Uplink zur Verteilung fällt aus.</p>, tasks: ["Welche Geräte können lokal noch Link haben?", "Welche Kommunikation ist wahrscheinlich betroffen?", "Wo würde Redundanz helfen?"], solution: <p>Clients können weiterhin einen lokalen Link zum Access-Switch zeigen. Ziele außerhalb dieses isolierten Layer-2-Bereichs sind jedoch nicht erreichbar; je nach Design auch lokale Dienste. Ein unabhängig geführter, korrekt konfigurierter zweiter Uplink könnte den Ast absichern.</p> },
    takeaway: ["Ein Baum ist eine hierarchische Verbindung mehrerer Sterne.", "Je höher ein Fehler liegt, desto größer ist oft sein Wirkungsbereich.", "Redundanz und Kapazität sollten dem geteilten Risiko folgen."],
  },
  "vermaschte-netze": {
    objectives: ["vollständige und teilweise Vermaschung unterscheiden", "Zahl direkter Links einer Vollvermaschung einordnen", "Redundanznutzen und Routingbedarf erklären", "WAN-Einsätze bewerten"],
    intro: <><p>In einem vermaschten Netz besitzt ein Knoten Verbindungen zu mehreren anderen Knoten. Alternative Pfade können Ausfälle umgehen, erhöhen aber Aufwand und Steuerungsbedarf.</p></>,
    sections: [
      { title: "Vollvermaschung", paragraphs: [<>Bei Full Mesh ist jeder Knoten direkt mit jedem anderen verbunden. Für <em>n</em> Knoten werden <code>n × (n − 1) / 2</code> ungerichtete Links benötigt.</>, <>Vier Standorte benötigen sechs, zehn Standorte bereits 45 direkte Links. Das bietet direkte Wege, skaliert aber hinsichtlich Ports, Leitungen, Kosten und Betrieb schlecht.</>] },
      { title: "Teilweise Vermaschung", paragraphs: [<>Partial Mesh gibt besonders wichtigen Knoten oder Pfaden mehrere Verbindungen, während andere Standorte weniger angebunden sind. Das ist in WANs und Kernnetzen häufig wirtschaftlicher.</>, <>Nicht jeder zusätzliche Link ist unabhängig. Zwei Leitungen im selben Kabelkanal oder über denselben Providerknoten können gemeinsam ausfallen.</>] },
      { title: "Pfadauswahl und Konvergenz", paragraphs: [<>Routing- oder Steuerungsprotokolle müssen nutzbare Pfade auswählen und nach einem Fehler auf Alternativen wechseln. Schleifen, asymmetrische Wege und Kapazität sind zu berücksichtigen.</>, <>Redundanz ist erst belastbar, wenn Fehlerfälle getestet, überwacht und dokumentiert sind.</>] },
    ],
    visual: <ResponsiveTable caption="Voll- und Teilvermaschung" headers={["Kriterium", "Full Mesh", "Partial Mesh"]} rows={[["Direkte Pfade", "zwischen jedem Knotenpaar", "nur für ausgewählte Paare"], ["Skalierung", "Linkzahl wächst quadratisch", "gezielt steuerbar"], ["Kosten", "hoch", "meist geringer"], ["Redundanz", "viele Alternativen", "abhängig vom Entwurf"], ["typischer Einsatz", "kleine kritische Gruppen", "WAN/Core mit priorisierten Knoten"]]} />,
    scenario: { title: "Vier Standorte mit Zentrale", situation: <p>Alle drei Filialen haben einen Link zur Zentrale. Zusätzlich verbindet ein Link Filiale A und B.</p>, tasks: ["Ist das Full Mesh?", "Wo besteht ein Alternativpfad?", "Welche Filiale bleibt einfach angebunden?"], solution: <p>Es ist Partial Mesh. A und B können je nach Routing über ihren Zusatzlink und die Zentrale alternative Wege haben. Filiale C besitzt nur den direkten Zentral-Link und bleibt von diesem Pfad abhängig.</p> },
    takeaway: ["Full Mesh verbindet jedes Knotenpaar direkt.", "Partial Mesh setzt Redundanz gezielt ein.", "Mehr Links helfen nur mit unabhängigen Wegen und funktionierender Pfadsteuerung."],
  },
  "hybridtopologien": {
    objectives: ["Hybridtopologie definieren", "kombinierte Strukturen in realen Netzen erkennen", "Abhängigkeiten über Teilbereiche hinweg analysieren", "eine Hybridstruktur verständlich dokumentieren"],
    intro: <><p>Reale Netze folgen selten nur einer Grundform. Eine Hybridtopologie kombiniert beispielsweise Sterne auf Etagen, einen Baum im Gebäude und teilweise vermaschte WAN-Verbindungen.</p></>,
    sections: [
      { title: "Kombination nach Bedarf", paragraphs: [<>Arbeitsplätze profitieren von übersichtlichen Sternen, Gebäude von hierarchischer Verteilung und kritische Standortverbindungen von alternativen Pfaden. Hybrid bedeutet hier bewusste Kombination, nicht ungeplantes Durcheinander.</>, <>Auch WLAN-Zellen, VPN-Tunnel, Cloud-Anbindungen und virtuelle Netze bringen zusätzliche physische und logische Sichten.</>] },
      { title: "Gesamtpfad statt Einzelskizze", paragraphs: [<>Eine redundante WAN-Wolke hilft nicht, wenn beide Wege am selben ungeschützten Access-Switch enden. Umgekehrt kann ein lokaler redundanter Core einen einzelnen Providerlink nicht ersetzen.</>, <>Analysiere Strom, Kabeltrassen, Geräte, Layer-2-/Layer-3-Pfade, Provider und Dienste über die gesamte Kette.</>] },
      { title: "Dokumentation in Ebenen", paragraphs: [<>Nutze getrennte Pläne für physische Verkabelung, Layer-2/VLAN, Layer-3/Routing und Dienste. Verweise über eindeutige Gerätenamen und Schnittstellen zwischen den Plänen.</>, <>Eine einzige überladene Grafik ist oft weniger hilfreich als mehrere klare Sichten mit gemeinsamem Namensschema.</>] },
    ],
    visual: <TextFlow caption="Beispiel einer Hybridstruktur" steps={["PC-Sterne", "Etagenbaum", "redundanter Core", "teilvermaschtes WAN", "Standortstern"]} />,
    scenario: { title: "Firma mit drei Standorten", situation: <p>Jeder Standort nutzt Stern-/Baumverkabelung. Die Zentrale hat Links zu beiden Filialen; die Filialen besitzen zusätzlich einen Backup-Link zueinander.</p>, tasks: ["Welche Grundformen sind kombiniert?", "Welche Ausfallfrage muss zusätzlich geprüft werden?"], solution: <p>Lokal entstehen Sterne beziehungsweise Bäume, zwischen den Standorten eine Teilvermaschung. Zu prüfen sind unter anderem unabhängige Trassen/Provider, Routingkonvergenz, Restkapazität und gemeinsame zentrale Abhängigkeiten.</p> },
    takeaway: ["Hybridtopologien kombinieren passende Grundformen.", "Redundanz muss über den gesamten Dienstpfad betrachtet werden.", "Mehrere klar getrennte Dokumentationssichten erleichtern Betrieb und Fehlersuche."],
  },
  "physische-und-logische-topologie": {
    objectives: ["physische und logische Topologie sicher unterscheiden", "VLANs, WLAN und Tunnel aus beiden Sichten einordnen", "unterschiedliche Fehlerbilder ableiten", "Pläne korrekt beschriften"],
    intro: <><p>Ein Kabelplan beantwortet nicht automatisch, wer logisch miteinander kommuniziert. Umgekehrt zeigt ein VLAN- oder Routingplan nicht, durch welchen Kabelkanal ein kritischer Pfad führt.</p></>,
    sections: [
      { title: "Ein Kabel, mehrere logische Netze", paragraphs: [<>Ein VLAN-Trunk kann Frames mehrerer VLANs über denselben physischen Link transportieren. Logisch bestehen getrennte Broadcast-Domänen, physisch teilen sie jedoch Kabel, Port und Gerät.</>, <>Ein Ausfall des Trunks trifft damit mehrere logische Netze gleichzeitig. Eine rein logische Zeichnung könnte diese gemeinsame physische Abhängigkeit verbergen.</>] },
      { title: "Ein logisches Netz, mehrere Medien", paragraphs: [<>Ein Client-VLAN kann über Kupferports, Glasfaser-Uplinks und Access Points geführt werden. Die physische Topologie wechselt Medien, während die Layer-2-Domäne logisch zusammenhängt.</>, <>Bei WLAN teilen Clients das Funkmedium einer Zelle; hinter dem Access Point folgt häufig eine geswitchte kabelgebundene Infrastruktur.</>] },
      { title: "Tunnel und Overlay", paragraphs: [<>VPN- oder Overlay-Verbindungen können logisch direkte Nachbarschaften über viele physische und geroutete Zwischenstationen erzeugen. Ein logischer Tunnel ist daher keine eigene direkte Kabelverbindung.</>, <>Für Fehleranalyse sind Underlay (tragendes Netz) und Overlay (logische Verbindung) getrennt zu prüfen.</>], activity: <PracticeExercise exercise={networkTopologyExerciseDefinitions.physicalLogical} /> },
    ],
    visual: <ResponsiveTable caption="Zwei Sichten auf dieselbe Umgebung" headers={["Beispiel", "physische Sicht", "logische Sicht", "typisches Risiko"]} rows={[["VLAN-Trunk", "ein Kabel/Port", "mehrere VLANs", "ein Linkausfall trifft mehrere Netze"], ["WLAN-Client", "Funk zur AP-Zelle", "Mitglied eines VLAN/IP-Netzes", "Funk und Uplink sind getrennte Fehlerbereiche"], ["Site-to-Site-VPN", "mehrere Internet-/Provider-Hops", "logischer Tunnel", "Underlay oder Tunnelkonfiguration kann ausfallen"]]} />,
    scenario: { title: "Zwei VLANs gleichzeitig gestört", situation: <p>VLAN 10 und VLAN 20 funktionieren auf einem Etagen-Switch lokal, erreichen aber beide den Core nicht mehr.</p>, tasks: ["Welche gemeinsame physische Abhängigkeit ist plausibel?", "Warum sind es trotzdem zwei logische Domänen?"], solution: <p>Ein gemeinsamer Trunk/Uplink oder dessen Port ist ein starker Untersuchungsbereich. VLAN 10 und 20 bleiben logisch getrennte Broadcast-Domänen, teilen hier aber dieselbe physische Transportverbindung.</p> },
    takeaway: ["Physisch beschreibt Verbindungen und Medien, logisch den Kommunikationsaufbau.", "Getrennte logische Netze können gemeinsame Hardware nutzen.", "Underlay und Overlay benötigen getrennte Evidenz."],
  },
  "topologien-praktisch-auswaehlen": {
    objectives: ["Anforderungen in Topologieentscheidungen übersetzen", "Ausfall- und Wartungsszenarien bewerten", "Kosten und Verfügbarkeit abwägen", "eine begründete Auswahl dokumentieren"],
    intro: <><p>Eine Topologie wird passend, wenn sie Geschäfts- und Betriebsanforderungen erfüllt. „Redundant“ oder „modern“ allein ist keine ausreichende Begründung.</p></>,
    sections: [
      { title: "Anforderungen sammeln", paragraphs: [<>Erfasse Standorte, Teilnehmer, Datenströme, Bandbreite, Latenz, Wachstum, Budget, Verkabelungswege, Wartungsfenster sowie RPO-/Verfügbarkeitsziele des Dienstes.</>, <>Unterscheide kritische und unkritische Bereiche. Nicht jeder Drucker benötigt zwei unabhängige Pfade, während zentrale Virtualisierung oder Standortkopplung höhere Anforderungen haben kann.</>] },
      { title: "Fehlerfälle durchspielen", paragraphs: [<>Prüfe Endkabel, Access-Switch, Uplink, Verteiler, Strom, Trasse und Provider. Frage für jeden Fehler: Wer ist betroffen, erkennt Monitoring ihn und wie wird wiederhergestellt?</>, <>Redundanz kann neue Komplexität und Fehlerbilder erzeugen. Sie benötigt geeignete Protokolle, Kapazität, Wartung und regelmäßige Tests.</>], activity: <PracticeExercise exercise={networkTopologyExerciseDefinitions.failureEffects} /> },
      { title: "Begründete Entscheidung", paragraphs: [<>Ein typisches Büro nutzt physische Sterne an Access-Switches und eine Baumstruktur zur Verteilung. Kritische Core-/WAN-Pfade können teilweise vermascht oder redundant ausgelegt werden.</>, <>Das ist kein Pflichtmuster. Dokumentiere Alternativen, Annahmen, Restrisiken und warum der gewählte Entwurf für diesen Betrieb angemessen ist.</>], activity: <PracticeExercise exercise={networkTopologyExerciseDefinitions.requirementChoice} /> },
    ],
    visual: <ResponsiveTable caption="Bewertungsmatrix für Topologieentscheidungen" headers={["Kriterium", "Leitfrage", "mögliche Evidenz", "Trade-off"]} rows={[["Verfügbarkeit", "Welche Ausfälle müssen überlebt werden?", "SLA, Geschäftsprozess", "mehr Pfade erhöhen Kosten/Komplexität"], ["Skalierung", "Wie wachsen Nutzer und Datenverkehr?", "Forecast, Port-/Uplink-Auslastung", "Reserve kostet heute"], ["Betrieb", "Kann das Team die Technik überwachen?", "Werkzeuge, Know-how, Runbooks", "Komplexität muss beherrschbar sein"], ["Physik", "Sind Wege wirklich unabhängig?", "Trassen-, Strom- und Providerplan", "scheinbare Redundanz kann gemeinsame Ursachen haben"]]} />,
    scenario: { title: "Kleines Büro mit kritischem Internet", situation: <p>25 Clients arbeiten sternförmig an einem Switch. Cloud-Telefonie ist geschäftskritisch; Switch und Internetanschluss sind jeweils einfach vorhanden.</p>, tasks: ["Wo liegen zentrale Ausfallpunkte?", "Welche Maßnahmen sind denkbar?", "Warum gibt es nicht nur eine richtige Lösung?"], solution: <p>Switch, Stromversorgung/Uplink und Providerzugang sind zentrale Abhängigkeiten. Denkbar sind Ersatz-/Stackkonzept, USV, zweiter Anbieter oder Mobilfunk-Fallback und getestete Umschaltung. Auswahl und Umfang hängen von RTO, Budget, Risiko und betrieblicher Beherrschbarkeit ab.</p> },
    takeaway: ["Topologien werden aus Anforderungen und Fehlerfällen abgeleitet.", "Redundanz braucht unabhängige Pfade und getestete Umschaltung.", "Eine fachlich gute Lösung benennt Trade-offs und Restrisiken."],
  },
};

export function NetworkTopologyLesson({ lessonSlug }: { lessonSlug: string }) {
  const lesson = lessons[lessonSlug];
  if (!lesson) return null;
  return <FundamentalsLesson lessonId={`topology-${lessonSlug}`} {...lesson} relatedLinks={[{ href: "/lernen/netzwerk-koppelelemente", label: "Netzwerk-Koppelelemente" }, { href: "/lernen/netzwerkfehler-systematisch-analysieren", label: "Netzwerkfehler systematisch analysieren" }]}>{lesson.visual}</FundamentalsLesson>;
}

export const networkTopologyLessonSlugs = Object.freeze(Object.keys(lessons));
