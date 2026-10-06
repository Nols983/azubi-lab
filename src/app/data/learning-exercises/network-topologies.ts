import type { LearningExercise } from "../../lib/learning-exercise.ts";

const moduleSlug = "netzwerktopologien";

export const networkTopologyExerciseDefinitions = {
  identification: {
    id: "topology-identification",
    moduleSlug,
    lessonSlug: "was-ist-eine-netzwerktopologie",
    type: "assignment",
    title: "Topologien anhand ihrer Struktur erkennen",
    instruction: "Ordne jede Beschreibung der passenden Grundform zu. Reale Netze können mehrere Formen kombinieren.",
    targets: [
      { id: "point", label: "Punkt-zu-Punkt" },
      { id: "bus", label: "Bus" },
      { id: "ring", label: "Ring" },
      { id: "star", label: "Stern" },
      { id: "tree", label: "Baum" },
      { id: "full-mesh", label: "Vollvermaschung" },
      { id: "partial-mesh", label: "Teilvermaschung" },
    ],
    items: [
      { id: "two", label: "Genau zwei Endpunkte sind direkt miteinander verbunden.", correctTargetId: "point", feedback: "Eine direkte Verbindung zwischen genau zwei Endpunkten ist Punkt-zu-Punkt." },
      { id: "shared", label: "Mehrere Stationen nutzen ein gemeinsames lineares Medium.", correctTargetId: "bus", feedback: "Das gemeinsame lineare Medium beschreibt die klassische Bustopologie." },
      { id: "closed", label: "Jeder Knoten hat im Grundbild zwei Nachbarn in einem geschlossenen Pfad.", correctTargetId: "ring", feedback: "Ein geschlossener Nachbarschaftspfad kennzeichnet den Ring." },
      { id: "central", label: "Alle Arbeitsplatzleitungen enden an einem zentralen Switch.", correctTargetId: "star", feedback: "Ein zentraler Knoten mit einzelnen Ästen bildet einen Stern." },
      { id: "hierarchy", label: "Mehrere Sterne sind über Verteil- und Core-Ebenen hierarchisch verbunden.", correctTargetId: "tree", feedback: "Hierarchisch verbundene Sterne ergeben eine Baumstruktur." },
      { id: "everyone", label: "Jeder der vier Standorte besitzt einen Direktlink zu jedem anderen Standort.", correctTargetId: "full-mesh", feedback: "Direktlinks zwischen jedem Knotenpaar ergeben Full Mesh." },
      { id: "selected", label: "Nur wichtige Standortpaare besitzen zusätzliche Direktlinks.", correctTargetId: "partial-mesh", feedback: "Gezielte zusätzliche Verbindungen ohne vollständige Vermaschung sind Partial Mesh." },
    ],
    successExplanation: "Die Grundformen beschreiben Verbindungsstrukturen. Ein reales Unternehmensnetz ist häufig eine dokumentierte Hybridkombination daraus.",
    retryHint: "Suche nach gemeinsamem Medium, Zentrum, Hierarchie, geschlossenem Pfad oder Zahl der Direktverbindungen.",
  },
  starFailures: {
    id: "topology-star-failures",
    moduleSlug,
    lessonSlug: "stern",
    type: "assignment",
    title: "Ausfälle im Stern eingrenzen",
    instruction: "Ein Büro besitzt einen zentralen Switch und je Arbeitsplatz ein eigenes Kabel. Ordne die wahrscheinlich direkte Wirkung zu.",
    targets: [
      { id: "one-host", label: "nur der betroffene Arbeitsplatz" },
      { id: "all-hosts", label: "alle Teilnehmer dieses Sterns" },
      { id: "no-network-effect", label: "kein direkter Netzausfall" },
    ],
    items: [
      { id: "cable", label: "Das Kabel von PC-07 bricht.", correctTargetId: "one-host", feedback: "Jeder Arbeitsplatz besitzt einen eigenen Ast; dessen Kabelbruch bleibt normalerweise lokal." },
      { id: "switch", label: "Der zentrale Switch fällt vollständig aus.", correctTargetId: "all-hosts", feedback: "Der zentrale Knoten ist ein gemeinsamer Ausfallpunkt für seine angeschlossenen Äste." },
      { id: "unused", label: "Ein unbenutztes Patchkabel im Lager ist defekt.", correctTargetId: "no-network-effect", feedback: "Ein nicht eingesetztes Kabel liegt nicht im aktiven Kommunikationspfad." },
    ],
    successExplanation: "Ein Endkabelausfall betrifft meist einen Ast; der Ausfall der zentralen Komponente betrifft den gesamten daran angeschlossenen Stern.",
    retryHint: "Verfolge, welche aktiven Pfade die ausgefallene Komponente gemeinsam nutzen.",
  },
  failureEffects: {
    id: "topology-tree-mesh-failures",
    moduleSlug,
    lessonSlug: "topologien-praktisch-auswaehlen",
    type: "assignment",
    title: "Hierarchie und Redundanz bei Ausfällen bewerten",
    instruction: "Ordne die direkte Wirkung im beschriebenen, funktionierend konfigurierten Netz zu.",
    targets: [
      { id: "access-branch", label: "ein lokaler Access-Bereich fällt aus" },
      { id: "tree-branches", label: "mehrere nachgelagerte Äste verlieren Verbindung" },
      { id: "alternate-path", label: "Verkehr kann auf einen Alternativpfad wechseln" },
    ],
    items: [
      { id: "access", label: "Ein einzelner Access-Switch im Baum fällt aus.", correctTargetId: "access-branch", feedback: "Seine direkt angeschlossenen Endgeräte bilden den hauptsächlich betroffenen Ast." },
      { id: "distribution", label: "Ein nicht redundant angebundener Verteiler oberhalb mehrerer Access-Switches fällt aus.", correctTargetId: "tree-branches", feedback: "Ein höherer gemeinsamer Knoten kann alle untergeordneten Äste betreffen." },
      { id: "wan", label: "In einem korrekt gerouteten Partial Mesh fällt ein unabhängiger WAN-Link aus; ein ausreichend dimensionierter zweiter Pfad bleibt.", correctTargetId: "alternate-path", feedback: "Redundanz kann einen Alternativpfad ermöglichen, sofern Routing, Unabhängigkeit und Kapazität tatsächlich funktionieren." },
    ],
    successExplanation: "Im Baum wächst der mögliche Wirkungsbereich mit der Hierarchieebene. Eine Teilvermaschung kann Ausfälle umgehen, wenn der alternative Pfad unabhängig, konfiguriert und ausreichend dimensioniert ist.",
    retryHint: "Prüfe gemeinsame Abhängigkeiten und ob wirklich ein nutzbarer zweiter Pfad vorhanden ist.",
  },
  physicalLogical: {
    id: "topology-physical-logical",
    moduleSlug,
    lessonSlug: "physische-und-logische-topologie",
    type: "assignment",
    title: "Physische und logische Aussagen trennen",
    instruction: "Ordne danach, ob die Aussage reale Medien/Geräteverbindungen oder Kommunikationsdomänen und virtuelle Pfade beschreibt.",
    targets: [
      { id: "physical", label: "physische Topologie" },
      { id: "logical", label: "logische Topologie" },
    ],
    items: [
      { id: "cables", label: "Alle Kupferkabel einer Etage enden im selben Verteilerraum.", correctTargetId: "physical", feedback: "Kabelwege und Verteilerorte beschreiben die physische Sicht." },
      { id: "vlan", label: "VLAN 20 bildet eine eigene Broadcast-Domäne über mehrere Switches.", correctTargetId: "logical", feedback: "VLAN-Mitgliedschaft und Broadcast-Domäne beschreiben die logische Kommunikation." },
      { id: "trunk", label: "Der Kabelplan zeigt einen gemeinsamen Glasfaser-Uplink für mehrere Switches.", correctTargetId: "physical", feedback: "Der ausdrücklich betrachtete Kabelweg und Uplink sind eine physische Abhängigkeit." },
      { id: "vpn", label: "Ein VPN-Tunnel wirkt zwischen zwei Standorten wie eine direkte Verbindung.", correctTargetId: "logical", feedback: "Der Tunnel ist eine logische Verbindung über ein komplexeres physisches Underlay." },
    ],
    successExplanation: "Physische Pläne zeigen Geräte, Medien und Trassen; logische Pläne zeigen VLANs, Netze, Routing und Tunnel. Beide Sichten können unterschiedliche gemeinsame Risiken offenlegen.",
    retryHint: "Frage, ob du etwas anfassen/verkabeln kannst oder ob eine Kommunikationsbeziehung beschrieben wird.",
  },
  requirementChoice: {
    id: "topology-requirement-choice",
    moduleSlug,
    lessonSlug: "topologien-praktisch-auswaehlen",
    type: "single-choice",
    title: "Eine Topologie aus Anforderungen ableiten",
    instruction: "Drei Standorte benötigen alternative WAN-Wege, aber nicht jedes Standortpaar rechtfertigt einen eigenen Direktlink. Welche Grundidee passt am besten?",
    options: [
      { id: "bus", label: "Ein historischer gemeinsamer Koax-Bus über alle Standorte", feedback: "Ein gemeinsames Busmedium erfüllt die moderne WAN- und Redundanzanforderung nicht sinnvoll." },
      { id: "full", label: "Zwingend Full Mesh, unabhängig von Kosten und Bedarf", feedback: "Full Mesh bietet viele Direktpfade, ist aber nicht automatisch wirtschaftlich oder erforderlich." },
      { id: "partial", label: "Ein begründetes Partial Mesh mit unabhängigen, getesteten Alternativpfaden", feedback: "Eine gezielte Teilvermaschung kann Redundanz dort bereitstellen, wo sie benötigt wird." },
      { id: "star-only", label: "Ein einzelner Zentral-Link ohne irgendeinen Alternativpfad", feedback: "Damit bleibt der zentrale Pfad ein klarer Single Point of Failure." },
    ],
    correctOptionId: "partial",
    successExplanation: "Partial Mesh kann kritische Pfade gezielt absichern. Provider, Trassen, Routingkonvergenz, Kapazität und Kosten müssen trotzdem separat geprüft werden.",
    retryHint: "Suche nach einer Lösung, die Redundanz gezielt statt absolut einsetzt.",
  },
} as const satisfies Record<string, LearningExercise>;

export const networkTopologyExercises = Object.freeze(Object.values(networkTopologyExerciseDefinitions));
