import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AddressClassificationCheck, type AddressClassification } from "../../../components/learning/address-classification-check";
import { BitwiseAndVisualization } from "../../../components/learning/bitwise-and-visualization";
import { DhcpIntroductionLesson, DhcpLeasePoolLesson, DoraLesson } from "../../../components/learning/dhcp-lessons";
import { DhcpFiliusLesson, DhcpRelayLesson, DhcpTroubleshootingLesson } from "../../../components/learning/dhcp-advanced-lessons";
import { DnsIntroductionLesson, DnsRecordsLesson, DnsResolutionLesson } from "../../../components/learning/dns-lessons";
import { DnsFiliusLesson, DnsTroubleshootingLesson, DnsZonesLesson } from "../../../components/learning/dns-advanced-lessons";
import { Ipv4RangeOverview, type Ipv4Range } from "../../../components/learning/ipv4-range-overview";
import { KnowledgeCheck } from "../../../components/learning/knowledge-check";
import { LearningObjectives } from "../../../components/learning/learning-objectives";
import { LessonLayout } from "../../../components/learning/lesson-layout";
import { AnonymousLessonAccessGate, LockedLearningAccess } from "../../../components/learning/learning-progression-ui";
import { MultipleSelectionCheck, type MultipleSelectionOption } from "../../../components/learning/multiple-selection-check";
import { NatNetworkVisualization } from "../../../components/learning/nat-network-visualization";
import { NetworkBroadcastCheck } from "../../../components/learning/network-broadcast-check";
import { NetworkHostClassificationCheck, type OctetClassification } from "../../../components/learning/network-host-classification-check";
import { NetworkHostVisualization } from "../../../components/learning/network-host-visualization";
import { PrefixMaskMatchingCheck } from "../../../components/learning/prefix-mask-matching-check";
import { PrefixBitVisualization, PrefixMaskComparison, ValidMaskOctetOverview } from "../../../components/learning/prefix-mask-visualizations";
import { NetworkSegmentationComparison, SubnetDivisionVisualization } from "../../../components/learning/subnet-division-visualization";
import { SubnetLessonFive } from "../../../components/learning/subnet-lesson-five";
import { SubnetLessonSix } from "../../../components/learning/subnet-lesson-six";
import { SubnetLessonFour } from "../../../components/learning/subnet-lesson-four";
import { SubnetLessonThree } from "../../../components/learning/subnet-lesson-three";
import { HttpRequestResponseLesson, HttpUrlMethodsStatusLesson, WebServerIntroductionLesson } from "../../../components/learning/webserver-lessons";
import { HttpsTlsLesson, WebserverFiliusLesson, WebserverTroubleshootingLesson } from "../../../components/learning/webserver-advanced-lessons";
import { LinuxFilesystemLesson, LinuxIntroductionLesson, LinuxTerminalLesson } from "../../../components/learning/linux-lessons";
import { LinuxAdministrationLesson, LinuxFileManagementLesson, LinuxInventoryLesson, LinuxPermissionsLesson } from "../../../components/learning/linux-advanced-lessons";
import { WindowsAdministrationLesson, WindowsFilesystemLesson, WindowsIntroductionLesson, WindowsInventoryLesson, WindowsPermissionsLesson, WindowsShellLesson } from "../../../components/learning/windows-lessons";
import { ActiveDirectoryIntroductionLesson, ActiveDirectoryObjectsLesson, ActiveDirectoryStructureLesson } from "../../../components/learning/active-directory-lessons";
import { ActiveDirectoryControllerLesson, ActiveDirectoryGroupPolicyLesson, ActiveDirectoryPracticeLesson, ActiveDirectoryTroubleshootingLesson } from "../../../components/learning/active-directory-advanced-lessons";
import { ClientIpLocalNetworkLesson, GatewayRoutingReachabilityLesson, TroubleshootingMethodLesson } from "../../../components/learning/network-troubleshooting-lessons";
import { DhcpDnsTroubleshootingLesson, NetworkTroubleshootingPracticeLesson, PortsServicesSymptomsLesson } from "../../../components/learning/network-troubleshooting-advanced-lessons";
import { BackupLesson } from "../../../components/learning/backup-lessons";
import { NetworkDeviceLesson } from "../../../components/learning/network-device-lessons";
import { NetworkTopologyLesson } from "../../../components/learning/network-topology-lessons";
import { OsiTcpIpLesson } from "../../../components/learning/osi-tcp-ip-lessons";
import { HardwareLesson } from "../../../components/learning/hardware-lessons";
import { DataCalculationLesson } from "../../../components/learning/data-calculation-lessons";
import { ClientInstallationLesson } from "../../../components/learning/client-installation-lessons";
import { PrivacyLesson } from "../../../components/learning/privacy-lessons";
import { SecurityLesson } from "../../../components/learning/security-lessons";
import { StorageRaidLesson } from "../../../components/learning/storage-raid-lessons";
import { ProgrammingLesson } from "../../../components/learning/programming-lessons";
import { ModelingLesson } from "../../../components/learning/modeling-lessons";
import { ProjectManagementLesson } from "../../../components/learning/project-management-lessons";
import { EconomicsLesson } from "../../../components/learning/economics-lessons";
import { SoftwareLicensingLesson } from "../../../components/learning/software-licensing-lessons";
import { VirtualizationCloudLesson } from "../../../components/learning/virtualization-cloud-lessons";
import { CustomerContractLesson } from "../../../components/learning/customer-contract-lessons";
import { QualityHandoverLesson } from "../../../components/learning/quality-handover-lessons";
import { getLearningModule, getLesson, learningModules } from "../../../data/learning-modules";
import { getLessonProgression } from "../../../lib/learning-progression";
import { getCurrentLearningProgression } from "../../../lib/server/learning-progression-service";

type Props = { params: Promise<{ slug: string; lessonSlug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return learningModules.flatMap((learningModule) => learningModule.lessons?.map((lesson) => ({ slug: learningModule.slug, lessonSlug: lesson.slug })) ?? []);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lessonSlug } = await params;
  const lesson = getLesson(slug, lessonSlug);
  return { title: lesson?.title ?? "Lektion nicht gefunden" };
}

export default async function LessonPage({ params }: Props) {
  const { slug, lessonSlug } = await params;
  const learningModule = getLearningModule(slug);
  const lesson = getLesson(slug, lessonSlug);
  if (!learningModule || !lesson) notFound();
  const currentProgression = await getCurrentLearningProgression(learningModule.slug);
  const serverLesson = currentProgression.audience === "learner" || currentProgression.audience === "staff"
    ? getLessonProgression(currentProgression.progression, lesson.slug)
    : undefined;
  const renderWithProgression = (content: ReactNode) => {
    if (currentProgression.audience === "unavailable") {
      return <LockedLearningAccess kind="lesson" moduleSlug={learningModule.slug} reason="Der serverseitige Lernstand konnte für diese Kontositzung nicht sicher geprüft werden." />;
    }
    if (serverLesson && !serverLesson.unlocked) {
      return <LockedLearningAccess kind="lesson" moduleSlug={learningModule.slug} reason={serverLesson.lockReason ?? "Diese Lektion ist noch gesperrt."} prerequisite={serverLesson.prerequisite} />;
    }
    return currentProgression.audience === "anonymous"
      ? <AnonymousLessonAccessGate learningModule={learningModule} lesson={lesson}>{content}</AnonymousLessonAccessGate>
      : content;
  };

  const advancedLinuxLessons = {
    "dateien-und-verzeichnisse": LinuxFileManagementLesson,
    "benutzer-gruppen-berechtigungen": LinuxPermissionsLesson,
    "prozesse-dienste-paketverwaltung": LinuxAdministrationLesson,
    "linux-system-untersuchen": LinuxInventoryLesson,
  } as const;
  const AdvancedLinuxLesson = learningModule.slug === "linux-grundlagen"
    ? advancedLinuxLessons[lesson.slug as keyof typeof advancedLinuxLessons]
    : undefined;
  if (AdvancedLinuxLesson) {
    return renderWithProgression(<LessonLayout learningModule={learningModule} lesson={lesson}><AdvancedLinuxLesson /></LessonLayout>);
  }

  const windowsLessons = {
    "windows-verstehen": WindowsIntroductionLesson,
    "cmd-powershell-terminal": WindowsShellLesson,
    "dateisystem-laufwerke-pfade": WindowsFilesystemLesson,
    "benutzer-gruppen-ntfs": WindowsPermissionsLesson,
    "prozesse-dienste-software-updates": WindowsAdministrationLesson,
    "windows-system-untersuchen": WindowsInventoryLesson,
  } as const;
  const WindowsLesson = learningModule.slug === "windows-grundlagen"
    ? windowsLessons[lesson.slug as keyof typeof windowsLessons]
    : undefined;
  if (WindowsLesson) {
    return renderWithProgression(<LessonLayout learningModule={learningModule} lesson={lesson}><WindowsLesson /></LessonLayout>);
  }

  const activeDirectoryLessons = {
    "was-ist-active-directory": ActiveDirectoryIntroductionLesson,
    "domaenen-forests-und-ous": ActiveDirectoryStructureLesson,
    "benutzer-computer-gruppen": ActiveDirectoryObjectsLesson,
    "domaenencontroller-dns-replikation": ActiveDirectoryControllerLesson,
    "gruppenrichtlinien": ActiveDirectoryGroupPolicyLesson,
    "active-directory-fehleranalyse": ActiveDirectoryTroubleshootingLesson,
    "active-directory-praxis": ActiveDirectoryPracticeLesson,
  } as const;
  const ActiveDirectoryLesson = learningModule.slug === "active-directory-grundlagen"
    ? activeDirectoryLessons[lesson.slug as keyof typeof activeDirectoryLessons]
    : undefined;
  if (ActiveDirectoryLesson) {
    return renderWithProgression(<LessonLayout learningModule={learningModule} lesson={lesson}><ActiveDirectoryLesson /></LessonLayout>);
  }

  const networkTroubleshootingLessons = {
    "troubleshooting-methode": TroubleshootingMethodLesson,
    "client-ip-lokales-netz": ClientIpLocalNetworkLesson,
    "gateway-routing-erreichbarkeit": GatewayRoutingReachabilityLesson,
    "dhcp-dns-fehleranalyse": DhcpDnsTroubleshootingLesson,
    "ports-dienste-fehlersymptome": PortsServicesSymptomsLesson,
    "netzwerkfehler-praxis": NetworkTroubleshootingPracticeLesson,
  } as const;
  const NetworkTroubleshootingLesson = learningModule.slug === "netzwerkfehler-systematisch-analysieren"
    ? networkTroubleshootingLessons[lesson.slug as keyof typeof networkTroubleshootingLessons]
    : undefined;
  if (NetworkTroubleshootingLesson) {
    return renderWithProgression(<LessonLayout learningModule={learningModule} lesson={lesson}><NetworkTroubleshootingLesson /></LessonLayout>);
  }

  const newFundamentalsLessons = {
    "osi-tcp-ip-modell": OsiTcpIpLesson,
    "netzwerk-koppelelemente": NetworkDeviceLesson,
    "netzwerktopologien": NetworkTopologyLesson,
    "backup-datensicherung": BackupLesson,
    "arbeitsplatz-hardware": HardwareLesson,
    "datenmengen-zahlensysteme-uebertragungsrechnungen": DataCalculationLesson,
    "clientinstallation-boot-datentraeger": ClientInstallationLesson,
    "storage-und-raid": StorageRaidLesson,
    "it-sicherheit": SecurityLesson,
    "datenschutz": PrivacyLesson,
    "programmierung-und-pseudocode": ProgrammingLesson,
    "uml-und-datenmodellierung": ModelingLesson,
    "projektmanagement": ProjectManagementLesson,
    "wirtschaftlichkeit-und-beschaffung": EconomicsLesson,
    "software-und-lizenzierung": SoftwareLicensingLesson,
    "virtualisierung-und-cloud": VirtualizationCloudLesson,
    "kundenauftrag-kommunikation-und-vertraege": CustomerContractLesson,
    "qualitaetssicherung-und-uebergabe": QualityHandoverLesson,
  } as const;
  const NewFundamentalsLesson = newFundamentalsLessons[learningModule.slug as keyof typeof newFundamentalsLessons];
  if (NewFundamentalsLesson) {
    return renderWithProgression(<LessonLayout learningModule={learningModule} lesson={lesson}><NewFundamentalsLesson lessonSlug={lesson.slug} /></LessonLayout>);
  }

  return renderWithProgression(
    <LessonLayout learningModule={learningModule} lesson={lesson}>
      {learningModule.slug === "dns" && lesson.slug === "dns-zonen-und-delegation" ? <DnsZonesLesson /> : learningModule.slug === "dns" && lesson.slug === "dns-fehleranalyse" ? <DnsTroubleshootingLesson /> : learningModule.slug === "dns" && lesson.slug === "dns-mit-filius" ? <DnsFiliusLesson /> : <>
      {learningModule.slug === "linux-grundlagen" && lesson.slug === "linux-kernel-distributionen-shell" ? <LinuxIntroductionLesson /> : learningModule.slug === "linux-grundlagen" && lesson.slug === "terminal-und-befehle" ? <LinuxTerminalLesson /> : learningModule.slug === "linux-grundlagen" && lesson.slug === "dateisystem-pfade-verzeichnisstruktur" ? <LinuxFilesystemLesson /> : learningModule.slug === "webserver-grundlagen" && lesson.slug === "was-ist-ein-webserver" ? <WebServerIntroductionLesson /> : learningModule.slug === "webserver-grundlagen" && lesson.slug === "http-anfrage-und-antwort" ? <HttpRequestResponseLesson /> : learningModule.slug === "webserver-grundlagen" && lesson.slug === "urls-methoden-header-statuscodes" ? <HttpUrlMethodsStatusLesson /> : learningModule.slug === "webserver-grundlagen" && lesson.slug === "https-und-tls" ? <HttpsTlsLesson /> : learningModule.slug === "webserver-grundlagen" && lesson.slug === "webserver-fehleranalyse" ? <WebserverTroubleshootingLesson /> : learningModule.slug === "webserver-grundlagen" && lesson.slug === "webserver-mit-filius" ? <WebserverFiliusLesson /> : learningModule.slug === "dns" && lesson.slug === "was-ist-dns" ? <DnsIntroductionLesson /> : learningModule.slug === "dns" && lesson.slug === "dns-aufloesung" ? <DnsResolutionLesson /> : learningModule.slug === "dns" && lesson.slug === "dns-records" ? <DnsRecordsLesson /> : learningModule.slug === "dhcp" && lesson.slug === "was-ist-dhcp" ? <DhcpIntroductionLesson /> : learningModule.slug === "dhcp" && lesson.slug === "dhcp-ablauf-dora" ? <DoraLesson /> : learningModule.slug === "dhcp" && lesson.slug === "leases-adresspool-und-optionen" ? <DhcpLeasePoolLesson /> : learningModule.slug === "dhcp" && lesson.slug === "dhcp-relay" ? <DhcpRelayLesson /> : learningModule.slug === "dhcp" && lesson.slug === "dhcp-fehleranalyse" ? <DhcpTroubleshootingLesson /> : learningModule.slug === "dhcp" && lesson.slug === "dhcp-mit-filius" ? <DhcpFiliusLesson /> : learningModule.slug === "subnetting" && lesson.slug === "warum-subnetten-wir" ? <WhySubnetLesson /> : learningModule.slug === "subnetting" && lesson.slug === "praefixlaenge-und-subnetzmaske" ? <PrefixMaskLesson /> : learningModule.slug === "subnetting" && lesson.slug === "blockgroesse-adressen-und-hosts" ? <SubnetLessonThree /> : learningModule.slug === "subnetting" && lesson.slug === "netzbereiche-bestimmen" ? <SubnetLessonFour /> : learningModule.slug === "subnetting" && lesson.slug === "subnetze-planen-und-pruefen" ? <SubnetLessonFive /> : learningModule.slug === "subnetting" && lesson.slug === "subnetting-mit-filius" ? <SubnetLessonSix /> : lesson.slug === "was-ist-eine-ip-adresse" ? <IpAddressLesson /> : lesson.slug === "aufbau-einer-ipv4-adresse" ? <Ipv4StructureLesson /> : lesson.slug === "subnetzmaske" ? <SubnetMaskLesson /> : lesson.slug === "private-und-oeffentliche-adressen" ? <PrivatePublicAddressLesson /> : lesson.slug === "netzadresse-und-broadcast" ? <NetworkBroadcastLesson /> : <LessonPlaceholder description={lesson.description} />}
      </>}
    </LessonLayout>
  );
}

const subnettingReasonOptions: readonly MultipleSelectionOption[] = [
  { id: "structure", label: "Adressbereiche logisch strukturieren", explanation: "Klare Adressbereiche erleichtern Planung und Verwaltung." },
  { id: "broadcast", label: "kleinere geroutete Broadcast-Domänen planen", explanation: "Layer-3-Grenzen begrenzen lokalen IPv4-Broadcast-Verkehr." },
  { id: "routing", label: "unterschiedliche Netzbereiche gezielt über Layer 3 verbinden", explanation: "Routing verbindet verschiedene IP-Subnetze kontrolliert." },
  { id: "operations", label: "Netzdesign und Fehlersuche übersichtlicher gestalten", explanation: "Eine nachvollziehbare Struktur hilft bei Betrieb und Diagnose." },
  { id: "encryption", label: "Datenverkehr automatisch verschlüsseln", explanation: "Subnetting stellt keine Verschlüsselung bereit. Dafür sind eigene Verschlüsselungsprotokolle nötig." },
  { id: "firewall", label: "eine Firewall vollständig ersetzen", explanation: "Subnetting und Firewalling erfüllen verschiedene Aufgaben. Regeln einer Firewall oder ACL kontrollieren Verkehr." },
  { id: "speed", label: "jedes Gerät automatisch schneller machen", explanation: "Subnetting kann Broadcast-Bereiche und das Netzdesign beeinflussen, macht aber nicht automatisch jeden Endpunkt schneller." },
  { id: "never-communicate", label: "sicherstellen, dass unterschiedliche Subnetze niemals miteinander kommunizieren können", explanation: "Verschiedene Subnetze können kommunizieren, wenn Layer-3-Routing vorhanden ist und die Richtlinien den Verkehr erlauben." },
];

function WhySubnetLesson() {
  return (
    <div className="space-y-10 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
      <LearningObjectives context="lesson" objectives={["Subnetting konzeptionell erklären", "begründen, warum ein größeres IPv4-Netz in kleinere Netze aufgeteilt werden kann", "praktische Gründe für Subnetting nennen", "erklären, dass Kommunikation zwischen verschiedenen IP-Subnetzen normalerweise Layer-3-Routing benötigt", "beschreiben, wie geroutete Subnetzgrenzen lokalen IPv4-Broadcast-Verkehr begrenzen", "erkennen, dass Subnetting allein keine Sicherheitsrichtlinie durchsetzt", "IP-Subnetze und VLANs als verwandte, aber unterschiedliche Konzepte einordnen", "Subnetting als Grundlage strukturierter Adressplanung erkennen"]} />

      <section aria-labelledby="meaning-heading">
        <h2 id="meaning-heading" className="text-2xl font-bold tracking-tight text-slate-950">Was bedeutet Subnetting?</h2>
        <div className="mt-4 space-y-4">
          <p><strong>Subnetting</strong> bedeutet, einen IP-Adressraum in mehrere kleinere IP-Netze aufzuteilen. Aus einem größeren Adressblock wie <code>192.168.10.0/24</code> können durch einen längeren Präfix mehrere kleinere Blöcke entstehen.</p>
          <p>Als Vorschau kann ein <code>/24</code>-Netz in mehrere kleinere <code>/26</code>-Netze geteilt werden. Hier geht es nur um das Bild <strong>„ein größerer Adressblock → mehrere kleinere Adressblöcke“</strong>. Die Berechnung folgt erst in späteren Lektionen.</p>
        </div>
        <SubnetDivisionVisualization />
      </section>

      <section aria-labelledby="prefix-longer-heading">
        <h2 id="prefix-longer-heading" className="text-2xl font-bold tracking-tight text-slate-950">Der Präfix wird länger</h2>
        <p className="mt-4">Aus den IPv4-Grundlagen kennst du Netz- und Hostanteil: Beim Unterteilen werden mehr Bits für den Netzpräfix verwendet. Dadurch bleiben weniger Hostbits übrig und jedes neue Subnetz enthält weniger Adressen. Ein <code>/24</code> kann beispielsweise in kleinere <code>/25</code>- oder <code>/26</code>-Netze geteilt werden.</p>
        <aside className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-slate-900"><strong>Noch keine Rechnung:</strong> Formeln, Blockgrößen und Hostanzahlen sind bewusst nicht Teil dieser Lektion. Zunächst zählt das Prinzip: <strong>Längerer Präfix → kleinerer Adressblock.</strong></aside>
      </section>

      <section aria-labelledby="reasons-heading">
        <h2 id="reasons-heading" className="text-2xl font-bold tracking-tight text-slate-950">Warum machen wir das überhaupt?</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ReasonCard title="Strukturierte Adressplanung">Bereiche wie Verwaltung, Produktion, Server, Gäste oder IT können klar erkennbare Adressräume erhalten. Das ist ein häufiges Planungsmuster, aber keine Pflicht, Abteilungen exakt auf Subnetze abzubilden.</ReasonCard>
          <ReasonCard title="Adressorganisation">Office-Clients, Server und Gastgeräte lassen sich konzeptionell getrennt adressieren. Eine nachvollziehbare Zuordnung erleichtert Administration und Fehlersuche; je nach Anforderungen sind auch andere Entwürfe sinnvoll.</ReasonCard>
          <ReasonCard title="Kleinere Broadcast-Bereiche">Lokaler IPv4-Broadcast-Verkehr endet normalerweise an Layer-3-Grenzen: Router leiten ihn üblicherweise nicht in andere geroutete Subnetze weiter. Mehrere geroutete Subnetze können daher die Zahl der Geräte reduzieren, die dieselbe IP-Broadcast-Domäne teilen.</ReasonCard>
          <ReasonCard title="Routing und Richtlinien">Verkehr zwischen IP-Subnetzen läuft normalerweise über einen Router oder Layer-3-Switch. Dort können Routingentscheidungen, Firewallregeln und Zugriffsrichtlinien angewendet werden.</ReasonCard>
        </div>
        <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6"><strong>Wichtig:</strong> Nur die Subnetzmaske auf PCs zu ändern erzeugt nicht automatisch getrennte Ethernet-Broadcast-Domänen. Eine reale Trennung braucht ein konsistentes Adresskonzept und passende Netzwerkinfrastruktur mit Layer-3-Grenzen.</p>
        <NetworkSegmentationComparison />
        <p className="mt-3 text-sm leading-6 text-slate-600">Die Darstellung zeigt eine mögliche Struktur, keine vorgeschriebene Architektur.</p>
      </section>

      <section aria-labelledby="security-heading" className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 sm:p-7">
        <h2 id="security-heading" className="text-2xl font-bold tracking-tight text-slate-950">Subnetting ist keine Sicherheitsfunktion</h2>
        <p className="mt-4"><strong>Falsch:</strong> „Geräte in unterschiedlichen Subnetzen sind automatisch voreinander geschützt.“</p>
        <p className="mt-3"><strong>Richtig:</strong> Verschiedene Subnetze schaffen Layer-3-Grenzen und benötigen Routing. Ob Verkehr erlaubt oder blockiert wird, bestimmen Routing, Firewall, ACL beziehungsweise Sicherheitsrichtlinie und der tatsächliche Netzaufbau. Subnetting unterstützt Segmentierung, setzt aber allein keine Sicherheitsrichtlinie durch.</p>
      </section>

      <section aria-labelledby="vlan-heading">
        <h2 id="vlan-heading" className="text-2xl font-bold tracking-tight text-slate-950">Subnetz und VLAN sind nicht dasselbe</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5"><dt className="font-bold text-blue-950">IP-Subnetz</dt><dd className="mt-2 text-sm leading-6">Ein Konzept der Layer-3-IP-Adressierung.</dd></div>
          <div className="rounded-xl border border-slate-200 bg-white p-5"><dt className="font-bold text-slate-950">VLAN</dt><dd className="mt-2 text-sm leading-6">Eine Technologie zur Layer-2-Segmentierung.</dd></div>
        </dl>
        <p className="mt-4">In realen Netzen ist häufig ein VLAN einem IPv4-Subnetz zugeordnet. Separate VLANs bilden üblicherweise separate Layer-2-Broadcast-Domänen und werden oft mit separaten IP-Subnetzen kombiniert. Technisch sind VLAN und Subnetz trotzdem nicht dasselbe.</p>
      </section>

      <section aria-labelledby="communication-heading">
        <h2 id="communication-heading" className="text-2xl font-bold tracking-tight text-slate-950">Kommunikation zwischen Subnetzen</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><AddressCard name="PC A" address="192.168.10.20/24" /><AddressCard name="PC B" address="192.168.20.30/24" /></div>
        <p className="mt-4">Die beiden Adressen gehören zu unterschiedlichen <code>/24</code>-Netzen. Für normale IP-Kommunikation zwischen ihnen ist Layer-3-Routing erforderlich. Die Subnetzmaske hilft jedem Host zu erkennen, welche Ziele lokal sind und welche Layer-3-Weiterleitung benötigen. Eine physische Kabelverbindung allein legt die IP-Subnetzzugehörigkeit nicht fest.</p>
      </section>

      <MultipleSelectionCheck title="Gute Gründe fürs Subnetting" question="Welche Aussagen sind sinnvolle Gründe oder mögliche Vorteile einer Subnetzstruktur?" options={subnettingReasonOptions} correctOptionIds={["structure", "broadcast", "routing", "operations"]} successMessage="Richtig: Eine Subnetzstruktur unterstützt logische Adressplanung, begrenzte geroutete Broadcast-Bereiche, gezielte Layer-3-Verbindungen und einen übersichtlicheren Betrieb." missedCorrectMessage="Wähle alle vier Aussagen aus, die Planung, Routing oder Übersichtlichkeit betreffen." inputName="subnetting-reasons" />

      <section aria-labelledby="scenario-heading">
        <h2 id="scenario-heading" className="text-2xl font-bold tracking-tight text-slate-950">Kleines Szenario</h2>
        <p className="mt-4">Eine Firma plant Büro-PCs, Server und Gastgeräte bisher in einer großen Adressstruktur. Für eine klarere Organisation könnten Büro-Clients, Server und Gäste jeweils ein eigenes Subnetz erhalten.</p>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-5"><h3 className="font-bold text-blue-950">Welche Vorteile kann diese Aufteilung für Administration und Netzwerkdesign haben?</h3><p className="mt-2 text-sm leading-6 text-blue-950">Bereiche werden leichter erkennbar, DHCP-Bereiche und Schnittstellen lassen sich nachvollziehbarer zuordnen, Fehler können gezielter eingegrenzt und Verkehrswege über Layer 3 geplant werden. Welche Aufteilung passt, hängt von den Anforderungen ab; Sicherheit entsteht erst durch passende Richtlinien.</p></div>
      </section>

      <section aria-labelledby="practice-heading">
        <h2 id="practice-heading" className="text-2xl font-bold tracking-tight text-slate-950">Praxisbezug für FISI</h2>
        <p className="mt-4">Systemadministratoren begegnen Subnetzen bei DHCP-Scopes, VLANs, Router-Schnittstellen, Firewall-Richtlinien sowie Server-, Gäste-, VPN- und Virtualisierungsnetzen. Du musst diese Technologien hier noch nicht konfigurieren; ihre Planung baut aber auf nachvollziehbaren IP-Netzen auf.</p>
      </section>

      <section aria-labelledby="filius-heading">
        <h2 id="filius-heading" className="text-2xl font-bold tracking-tight text-slate-950">Filius-Mini-Praxis</h2>
        <p className="mt-4">Erstelle oder untersuche drei PCs mit der Maske <code>255.255.255.0</code>:</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><AddressCard name="PC1" address="192.168.10.20" /><AddressCard name="PC2" address="192.168.10.30" /><AddressCard name="PC3" address="192.168.20.30" /></div>
        <ol className="mt-5 list-decimal space-y-2 pl-6"><li>Welche zwei PCs liegen im selben <code>/24</code>-Netz?</li><li>Welcher PC gehört zu einem anderen <code>/24</code>-Netz?</li><li>Welche Gerätefunktion wird normalerweise für Kommunikation zwischen den IP-Subnetzen benötigt?</li></ol>
        <details className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-bold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Konzeptionelle Lösung anzeigen</summary><p className="mt-3 text-sm leading-6">PC1 und PC2 liegen im selben <code>192.168.10.0/24</code>-Netz. PC3 liegt im anderen <code>192.168.20.0/24</code>-Netz. Zwischen beiden Netzen wird normalerweise Layer-3-Routing, beispielsweise durch einen Router, benötigt. Eine Routing-Konfiguration ist noch nicht Teil der Aufgabe.</p></details>
      </section>

      <section aria-labelledby="mistakes-subnetting-heading">
        <h2 id="mistakes-subnetting-heading" className="text-2xl font-bold tracking-tight text-slate-950">Typische Denkfehler</h2>
        <dl className="mt-5 space-y-4">
          <Misconception idea="Subnetting bedeutet einfach, die Subnetzmaske auf einem PC zu ändern." correction="Ein reales Subnetzdesign muss bei Adressierung und Netzwerkinfrastruktur konsistent umgesetzt werden." />
          <Misconception idea="Ein Subnetz ist dasselbe wie ein VLAN." correction="Subnetting ist Layer-3-Adressierung, VLAN ist Layer-2-Segmentierung. Beide werden häufig kombiniert, sind aber verschiedene Konzepte." />
          <Misconception idea="Zwei verschiedene Subnetze können niemals miteinander kommunizieren." correction="Mit geeignetem Layer-3-Routing können sie kommunizieren, sofern die Richtlinien den Verkehr erlauben." />
          <Misconception idea="Subnetting ist automatisch eine Firewall." correction="Subnetting schafft logische Netzgrenzen; Sicherheitsregeln benötigen geeignete Kontrollen wie Firewall oder ACL." />
          <Misconception idea="Ein /26-Netz ist grundsätzlich besser als ein /24-Netz." correction="Die passende Subnetzgröße hängt von den Anforderungen ab. Kleiner ist nicht automatisch besser." />
        </dl>
      </section>

      <aside aria-labelledby="subnet-memory-heading" className="rounded-2xl border border-blue-200 bg-blue-950 p-5 text-white sm:p-6"><h2 id="subnet-memory-heading" className="text-sm font-bold uppercase tracking-[0.12em] text-blue-200">Merksätze</h2><ul className="mt-3 space-y-2 font-semibold"><li>Subnetting = ein größeres IP-Netz in kleinere IP-Netze aufteilen.</li><li>Längerer Präfix → kleineres Subnetz.</li><li>Kommunikation zwischen verschiedenen IP-Subnetzen benötigt normalerweise Layer-3-Routing.</li><li>Subnetting ≠ VLAN</li><li>Subnetting ≠ Firewall</li></ul></aside>

      <section aria-labelledby="next-lesson-heading" className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6"><p className="text-sm font-semibold text-blue-700">Nächste Lektion</p><h2 id="next-lesson-heading" className="mt-1 text-xl font-bold text-slate-950">Präfixlänge und Subnetzmaske</h2><p className="mt-3 text-sm leading-6">Dort lernst du, wie <code>/24</code>, <code>/25</code> und <code>/26</code> mit Subnetzmasken und Subnetzgrößen zusammenhängen. Die Navigation darunter wird aus den kanonischen Moduldaten erzeugt.</p></section>
    </div>
  );
}

function ReasonCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{children}</p></article>;
}

function AddressCard({ name, address }: { name: string; address: string }) {
  return <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-center"><p className="font-bold text-slate-950">{name}</p><code className="mt-1 block break-all text-sm font-semibold text-blue-900">{address}</code></div>;
}

function PrefixMaskLesson() {
  return (
    <div className="space-y-10 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
      <LearningObjectives context="lesson" objectives={["erklären, was die Präfixschreibweise /n bedeutet", "erklären, dass eine IPv4-Subnetzmaske 32 Bit enthält und /24 für 24 führende, zusammenhängende 1-Bits steht", "die häufigen Präfixe /8, /16, /24, /25, /26, /27 und /28 in punktierte Subnetzmasken umwandeln", "diese häufigen Subnetzmasken wieder in Präfixnotation umwandeln", "begründen, warum in Maskenoktetten nur bestimmte Dezimalwerte möglich sind", "Netzbits und Hostbits mithilfe der Präfixlänge unterscheiden", "erklären, warum ein längerer Präfix weniger Hostbits übrig lässt", "offensichtlich ungültige Subnetzmaskenmuster erkennen"]} />

      <section aria-labelledby="prefix-24-heading">
        <h2 id="prefix-24-heading" className="text-2xl font-bold tracking-tight text-slate-950">Was bedeutet /24?</h2>
        <div className="mt-4 space-y-4"><p>Aus den IPv4-Grundlagen kennst du <code>/24</code>. Eine IPv4-Subnetzmaske hat insgesamt <strong>32 Bit</strong>. Die Präfixlänge <code>/24</code> zählt die ersten <strong>24 führenden, zusammenhängenden 1-Bits</strong> der Maske. Die übrigen 8 Bit sind 0-Bits.</p><p>Die Zahl hinter dem Schrägstrich zählt damit die Bits des <strong>Netzpräfixes</strong> – nicht Hosts, Subnetznummern oder VLANs.</p></div>
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center"><code className="block break-words text-sm font-bold text-blue-950 sm:text-base">11111111.<wbr />11111111.<wbr />11111111.<wbr />00000000</code><span aria-hidden="true" className="block py-1">=</span><code className="block font-bold text-blue-950">255.255.255.0</code><span aria-hidden="true" className="block py-1">=</span><code className="block text-xl font-bold text-blue-950">/24</code></div>
      </section>

      <section aria-labelledby="split-heading"><h2 id="split-heading" className="text-2xl font-bold tracking-tight text-slate-950">32 Bit aufteilen</h2><p className="mt-4">Die Präfixlänge legt die Grenze zwischen Netz- und Hostanteil fest. Bei <code>/24</code> bleiben 8 Hostbits, bei <code>/26</code> nur noch 6.</p><PrefixBitVisualization /></section>

      <section aria-labelledby="rule-heading"><h2 id="rule-heading" className="text-2xl font-bold tracking-tight text-slate-950">Die Kernregel der Präfixlänge</h2><p className="mt-4">Weil IPv4 genau 32 Bit hat, gilt: <strong>Hostbits = 32 − Präfixlänge</strong>.</p><dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">{[[24, 8], [25, 7], [26, 6], [27, 5], [28, 4]].map(([prefix, hosts]) => <div key={prefix} className="rounded-xl border border-slate-200 bg-white p-4 text-center"><dt><code className="font-bold text-blue-950">/{prefix}</code></dt><dd className="mt-1 text-sm">{hosts} Hostbits</dd></div>)}</dl><aside className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-900"><strong>Hier endet die Rechnung vorerst:</strong> Aus den Hostbits berechnen wir noch keine Adressanzahl, gewöhnlich nutzbaren Hosts oder Blockgrößen. Das folgt in Lektion 3.</aside></section>

      <section aria-labelledby="mask-values-heading"><h2 id="mask-values-heading" className="text-2xl font-bold tracking-tight text-slate-950">Wie entstehen Maskenwerte?</h2><p className="mt-4">Ein Oktett besitzt die Bitgewichte <code>128 64 32 16 8 4 2 1</code>. In einer normalen Subnetzmaske stehen alle 1-Bits zusammenhängend von links; danach folgen nur noch 0-Bits. So wird beispielsweise <code>11000000</code> zu <code>128 + 64 = 192</code>.</p><ValidMaskOctetOverview /><p className="mt-4 text-sm leading-6">Diese Werte dürfen nicht beliebig auf die vier Stellen verteilt werden: Auch die <strong>gesamte 32-Bit-Maske</strong> muss aus zusammenhängenden 1-Bits und anschließend zusammenhängenden 0-Bits bestehen.</p></section>

      <section aria-labelledby="common-prefixes-heading"><h2 id="common-prefixes-heading" className="text-2xl font-bold tracking-tight text-slate-950">Häufige Präfixe übersetzen</h2><p className="mt-4">Du brauchst keine riesige Tabelle von <code>/0</code> bis <code>/32</code>. Für den Einstieg reicht dieses häufige Set; der Übergang liegt ab <code>/25</code> im vierten Oktett.</p><PrefixMaskComparison /></section>

      <section aria-labelledby="prefix-26-heading"><h2 id="prefix-26-heading" className="text-2xl font-bold tracking-tight text-slate-950">Das zentrale Beispiel: /26</h2><dl className="mt-5 grid gap-3 sm:grid-cols-3"><ValueCard label="Präfixlänge" value="/26" /><ValueCard label="Binäre Maske" value="11111111.11111111.11111111.11000000" /><ValueCard label="Punktierte Maske" value="255.255.255.192" /></dl><ul className="mt-5 list-disc space-y-2 pl-6"><li><code>/26</code> bedeutet 26 führende 1-Bits.</li><li>Die ersten drei Oktette enthalten 24 Netzbits.</li><li>Zwei weitere Netzbits stehen im vierten Oktett: <code>11000000 = 192</code>.</li><li>Danach bleiben 6 Hostbits.</li></ul></section>

      <section aria-labelledby="inside-octet-heading"><h2 id="inside-octet-heading" className="text-2xl font-bold tracking-tight text-slate-950">Warum /26 nicht einfach „drei Netz-Oktette“ ist</h2><p className="mt-4">Bei <code>/24</code> liegt die Grenze genau zwischen dem dritten und vierten Oktett. Bei <code>/26</code> liegt sie <strong>innerhalb</strong> des vierten Oktetts. Dezimalpunkte sind daher keine dauerhafte Regel für die Netzgrenze.</p><figure className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5"><figcaption className="text-sm font-bold text-slate-700">Die senkrechte Markierung trennt Netz- und Hostbits</figcaption><code className="mt-3 block break-words font-bold text-slate-950">11111111.<wbr />11111111.<wbr />11111111.<wbr />11<span className="mx-0.5 border-l-2 border-slate-950" aria-label="Grenze zwischen Netz- und Hostbits">|</span>000000</code></figure></section>

      <PrefixMaskMatchingCheck />

      <section aria-labelledby="invalid-heading"><h2 id="invalid-heading" className="text-2xl font-bold tracking-tight text-slate-950">Ungültige Subnetzmasken erkennen</h2><p className="mt-4">Eine Standard-Subnetzmaske darf nach dem ersten Hostbit mit Wert 0 nicht wieder zu 1-Bits zurückkehren.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><InvalidMask value="255.255.255.123" reason="123 ist binär 01111011 und damit kein Muster aus führenden 1-Bits und anschließenden 0-Bits." /><InvalidMask value="255.255.0.255" reason="Nach dem Null-Oktett haben die Host-0-Bits begonnen; das letzte Oktett kehrt unzulässig zu 1-Bits zurück." /><InvalidMask value="255.255.255.191" reason="191 ist binär 10111111. Nach einer 0 folgen wieder 1-Bits; das Muster ist nicht zusammenhängend." /></div></section>

      <section aria-labelledby="longer-heading"><h2 id="longer-heading" className="text-2xl font-bold tracking-tight text-slate-950">Wenn der Präfix länger wird</h2><div className="mt-5 flex flex-wrap items-center gap-2 font-bold text-blue-950"><code>/24</code><span aria-hidden="true">→</span><code>/25</code><span aria-hidden="true">→</span><code>/26</code><span aria-hidden="true">→</span><code>/27</code></div><p className="mt-4">Mit jedem Schritt beschreibt ein weiteres Bit das Netzwerk und ein Bit weniger bleibt für Hosts. Der Präfix wird länger und der dargestellte Adressblock kleiner. Die exakten Blockgrößen berechnen wir bewusst erst in Lektion 3.</p></section>

      <section aria-labelledby="prefix-mistakes-heading"><h2 id="prefix-mistakes-heading" className="text-2xl font-bold tracking-tight text-slate-950">Typische Denkfehler</h2><dl className="mt-5 space-y-4"><Misconception idea="/26 bedeutet 26 Hosts." correction="26 ist die Zahl der Präfix- beziehungsweise Netzbits." /><Misconception idea="/24 bedeutet immer, dass die ersten drei Zahlen die Netzadresse sind." correction="Die ersten 24 Bits bilden den Netzpräfix. Eine Netzadresse ist dagegen eine vollständige 32-Bit-Adresse, die mithilfe der Maske bestimmt wird." /><Misconception idea="Eine Subnetzmaske darf beliebige Werte von 0 bis 255 enthalten." correction="Gültig sind nur Muster aus zusammenhängenden 1-Bits von links und danach ausschließlich 0-Bits." /><Misconception idea="255.255.255.128 ist /24." correction="Die Maske enthält 25 führende 1-Bits und entspricht daher /25." /><Misconception idea="Subnetzgrenzen liegen immer zwischen zwei Oktetten." correction="Präfixe wie /25 oder /26 legen die Grenze innerhalb eines Oktetts fest." /></dl></section>

      <section aria-labelledby="admin-heading"><h2 id="admin-heading" className="text-2xl font-bold tracking-tight text-slate-950">Praxisbezug in der Administration</h2><p className="mt-4">Windows zeigt mit <code>ipconfig</code> häufig eine punktierte Subnetzmaske wie <code>255.255.255.0</code>. Linux zeigt mit <code>ip addr</code> oft eine Adresse wie <code>192.168.10.25/24</code>. Beim Lesen von Router-Konfigurationen, Firewallregeln, DHCP-Scopes und VPN-Netzen übersetzen Administratoren regelmäßig zwischen beiden Schreibweisen.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><CommandExample system="Windows" command="ipconfig" /><CommandExample system="Linux" command="ip addr" /></div></section>

      <section aria-labelledby="prefix-filius-heading"><h2 id="prefix-filius-heading" className="text-2xl font-bold tracking-tight text-slate-950">Filius-Mini-Praxis</h2><p className="mt-4">Untersuche oder konfiguriere PC1 zunächst mit folgender IPv4-Adresse. Berechne dabei noch keine Hostbereiche.</p><div className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">PC1</h3><dl className="mt-3 grid gap-2 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt>IP-Adresse</dt><dd><code>192.168.10.20</code></dd></div><div className="flex flex-wrap justify-between gap-2"><dt>Maske 1</dt><dd><code>255.255.255.0</code></dd></div><div className="flex flex-wrap justify-between gap-2"><dt>Maske 2</dt><dd><code>255.255.255.192</code></dd></div></dl></div><details className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4"><summary className="cursor-pointer font-bold text-blue-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Lösung anzeigen</summary><p className="mt-3 text-sm leading-6 text-blue-950">Maske 1 entspricht <code>/24</code>. Maske 2 entspricht <code>/26</code>.</p></details></section>

      <aside aria-labelledby="prefix-memory-heading" className="rounded-2xl border border-blue-200 bg-blue-950 p-5 text-white sm:p-6"><h2 id="prefix-memory-heading" className="text-sm font-bold uppercase tracking-[0.12em] text-blue-200">Merksätze</h2><ul className="mt-3 space-y-2 font-semibold"><li>IPv4-Maske = 32 Bit</li><li><code>/n</code> = Anzahl der führenden Netzbits</li><li>Hostbits = 32 − Präfixlänge</li><li>Längerer Präfix = kleinerer Adressblock</li><li>Im Grenzoktett entstehen <code>0, 128, 192, 224, 240, 248, 252, 254, 255</code> aus zusammenhängenden 1-Bits von links.</li></ul></aside>

      <section aria-labelledby="block-preview-heading" className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6"><p className="text-sm font-semibold text-blue-700">Nächste Lektion</p><h2 id="block-preview-heading" className="mt-1 text-xl font-bold text-slate-950">Blockgröße, Adressen und Hosts</h2><p className="mt-3 text-sm leading-6">Dort beantwortest du: Wie viele Adressen enthält <code>/26</code>? Wie viele gewöhnliche Hostadressen sind verfügbar? Warum liegen Subnetzgrenzen in bestimmten Abständen? Die Antworten und Berechnungen gehören bewusst erst dorthin.</p></section>
    </div>
  );
}

function ValueCard({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl border border-blue-200 bg-blue-50 p-4"><dt className="text-sm font-semibold text-blue-800">{label}</dt><dd className="mt-1"><code className="break-all text-sm font-bold text-blue-950">{value}</code></dd></div>; }
function InvalidMask({ value, reason }: { value: string; reason: string }) { return <article className="rounded-xl border border-amber-300 bg-amber-50 p-4"><h3><code className="font-bold text-slate-950">{value}</code></h3><p className="mt-2 text-sm leading-6 text-slate-700">{reason}</p></article>; }

function NetworkBroadcastLesson() {
  return (
    <div className="space-y-10 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
      <LearningObjectives context="lesson" objectives={["den Begriff Netzadresse erklären", "den Begriff Broadcast-Adresse erklären", "Netzanteil und Netzadresse unterscheiden", "die Netzadresse eines einfachen /24-Netzes bestimmen", "die Broadcast-Adresse eines einfachen /24-Netzes bestimmen", "den gewöhnlich nutzbaren Host-Adressbereich in einem einfachen /24-Beispiel erkennen", "erklären, warum Netz- und Broadcast-Adresse gewöhnlich nicht an normale Hosts vergeben werden", "auf konzeptioneller Ebene verstehen, wie bitweises AND eine Netzadresse ermittelt", "verstehen, dass diese Berechnungen von der Subnetzmaske abhängen"]} />

      <section aria-labelledby="network-address-heading">
        <h2 id="network-address-heading" className="text-2xl font-bold tracking-tight text-slate-950">Was ist die Netzadresse?</h2>
        <div className="mt-4 space-y-4">
          <p>Die <strong>Netzadresse</strong> identifiziert das Subnetz selbst. In einem klassischen IPv4-Subnetz entsteht sie, indem die Netzbits beibehalten und alle Hostbits auf <strong>0</strong> gesetzt werden.</p>
          <p>Bei <code>192.168.10.25</code> mit <code>255.255.255.0</code> beziehungsweise <code>/24</code> gehören die ersten 24 Bit zum <strong>Netzanteil</strong>; die letzten 8 Bit sind Hostbits. Werden diese Hostbits auf 0 gesetzt, lautet die vollständige Netzadresse <code>192.168.10.0</code>.</p>
        </div>
        <aside className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-slate-900"><strong>Begriffe sauber trennen:</strong> Der Netzanteil beschreibt, <em>welche Bits</em> zum Netz gehören. Die Netzadresse ist eine vollständige IPv4-Adresse, bei der alle Hostbits 0 sind. <code>192.168.10</code> ist daher keine vollständige Netzadresse.</aside>
      </section>

      <section aria-labelledby="and-heading">
        <h2 id="and-heading" className="text-2xl font-bold tracking-tight text-slate-950">Netzadresse mit bitweisem AND</h2>
        <p className="mt-4">Computer bestimmen die Netzadresse durch ein bitweises <strong>AND</strong> von IP-Adresse und Subnetzmaske. Das Ergebnis ist nur dann 1, wenn beide verglichenen Bits 1 sind:</p>
        <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
          {["0 AND 0 = 0", "0 AND 1 = 0", "1 AND 0 = 0", "1 AND 1 = 1"].map((rule) => <li key={rule} className="rounded-lg border border-slate-200 bg-white p-3 text-center font-bold text-slate-900">{rule}</li>)}
        </ul>
        <BitwiseAndVisualization />
        <p className="mt-4">Die 1-Bits der <code>/24</code>-Maske erhalten die ersten 24 Bits der IP-Adresse. Die acht 0-Bits der Maske machen das letzte Ergebnis-Oktett zu <code>00000000</code>. Das Ergebnis ist <code>192.168.10.0</code>.</p>
      </section>

      <section aria-labelledby="broadcast-heading">
        <h2 id="broadcast-heading" className="text-2xl font-bold tracking-tight text-slate-950">Was ist die Broadcast-Adresse?</h2>
        <div className="mt-4 space-y-4">
          <p>In einem klassischen IPv4-Subnetz mit Broadcast-Semantik steht die <strong>Broadcast-Adresse</strong> für alle Hosts in diesem lokalen IPv4-Broadcast-Domain beziehungsweise Subnetz. Sie ist nicht für eine Aussendung an das gesamte Internet gedacht.</p>
          <p>Dafür bleiben die Netzbits unverändert und alle Hostbits werden auf <strong>1</strong> gesetzt. Im Netz <code>192.168.10.0/24</code> gibt es 8 Hostbits. <code>11111111</code> entspricht dezimal <code>255</code>; die Broadcast-Adresse lautet daher <code>192.168.10.255</code>.</p>
        </div>
      </section>

      <section aria-labelledby="complete-example-heading">
        <h2 id="complete-example-heading" className="text-2xl font-bold tracking-tight text-slate-950">Das vollständige /24-Beispiel</h2>
        <p className="mt-4">IP-Adresse und Subnetzmaske gehören zusammen. Erst die Maske legt fest, welche Bits Netz- und Hostbits sind.</p>
        <AddressOverview items={[["IP-Adresse", "192.168.10.25"], ["Subnetzmaske", "255.255.255.0"], ["Präfix", "/24"], ["Netzadresse", "192.168.10.0"], ["Erster gewöhnlicher Host", "192.168.10.1"], ["Letzter gewöhnlicher Host", "192.168.10.254"], ["Broadcast-Adresse", "192.168.10.255"]]} />
        <p className="mt-5">In diesem klassischen <code>/24</code>-Subnetz reicht der gewöhnlich nutzbare Hostbereich von <code>192.168.10.1</code> bis <code>192.168.10.254</code>. Netzadresse und Broadcast-Adresse erfüllen besondere Aufgaben und werden normalen Hosts beziehungsweise Schnittstellen gewöhnlich nicht zugewiesen.</p>
        <aside className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6"><strong>Präzisionshinweis:</strong> Bei besonderen Präfixen wie <code>/31</code> und <code>/32</code> gelten die traditionellen Netz-/Broadcast- und Hostregeln anders. Deshalb ist „immer zwei Adressen abziehen“ keine universelle Regel; berechnen musst du diese Sonderfälle hier noch nicht.</aside>
      </section>

      <section aria-labelledby="second-example-heading">
        <h2 id="second-example-heading" className="text-2xl font-bold tracking-tight text-slate-950">Ein zweites /24-Beispiel</h2>
        <p className="mt-4">Auch bei <code>10.20.30.77</code> mit <code>255.255.255.0</code> beziehungsweise <code>/24</code> bilden die letzten 8 Bit den Hostanteil. Das Muster hängt hier an der <code>/24</code>-Maske – nicht an einer allgemeinen Regel über das letzte Oktett.</p>
        <AddressOverview items={[["IP-Adresse", "10.20.30.77"], ["Netzadresse", "10.20.30.0"], ["Erster gewöhnlicher Host", "10.20.30.1"], ["Letzter gewöhnlicher Host", "10.20.30.254"], ["Broadcast-Adresse", "10.20.30.255"]]} />
      </section>

      <NetworkBroadcastCheck />

      <section aria-labelledby="network-broadcast-misconceptions-heading">
        <h2 id="network-broadcast-misconceptions-heading" className="text-2xl font-bold tracking-tight text-slate-950">Typische Denkfehler</h2>
        <dl className="mt-5 space-y-4">
          <Misconception idea="Die Netzadresse ist einfach die IP ohne die letzte Zahl." correction="Nur wenn die Netz-/Host-Grenze passend liegt, etwa bei diesem /24, lässt sich das Beispiel so betrachten. Die Subnetzmaske bestimmt die Grenze; eine Netzadresse bleibt immer eine vollständige IPv4-Adresse." />
          <Misconception idea="Die Netzadresse ist dasselbe wie der Netzanteil." correction="Der Netzanteil beschreibt, welche Bits zum Netz gehören. Die Netzadresse ist die vollständige IPv4-Adresse, die entsteht, wenn alle Hostbits auf 0 gesetzt werden." />
          <Misconception idea="Broadcast bedeutet immer .255." correction="Nur bei bestimmten Masken wie /24 endet die Broadcast-Adresse so. Andere Präfixlängen können andere Broadcast-Werte ergeben; diese berechnen wir hier noch nicht." />
          <Misconception idea="Man kann Netz- und Broadcast-Adresse normal an Clients vergeben." correction="In traditionellen IPv4-Subnetzen dienen sie besonderen Zwecken und sind keine gewöhnlichen Hostadressen. Sonderpräfixe bleiben eine Ausnahme." />
          <Misconception idea="Bei jedem Netz sind immer genau zwei Adressen unbenutzbar." correction="Das ist eine nützliche Faustregel für traditionelle Subnetze, aber nicht universell: Besondere /31- und /32-Präfixe werden anders behandelt." />
        </dl>
      </section>

      <section aria-labelledby="network-practice-heading">
        <h2 id="network-practice-heading" className="text-2xl font-bold tracking-tight text-slate-950">Praxisbezug</h2>
        <p className="mt-4">Lies deine Netzwerkkonfiguration nur aus. Suche die eigene IPv4-Adresse und die zugehörige Subnetzmaske oder Präfixlänge. <code>ip route</code> kann unter Linux zusätzlich die erkannten Routen und Netzpräfixe zeigen.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><CommandExample system="Windows" command="ipconfig" /><CommandExample system="Linux" command="ip addr" /></div>
        <CommandExample system="Linux (optional)" command="ip route" />
        <p className="mt-4">Falls du ein einfaches <code>/24</code>-Beispiel findest, bestimme dazu gedanklich Netzadresse und Broadcast-Adresse. Ändere dabei keine Schnittstellen- oder Routing-Konfiguration.</p>
      </section>

      <section aria-labelledby="filius-heading">
        <h2 id="filius-heading" className="text-2xl font-bold tracking-tight text-slate-950">Praxisübung mit Filius</h2>
        <p className="mt-4">Erstelle zwei PCs ohne Router und trage folgende Konfigurationen ein:</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><PracticeCard title="PC1" address="192.168.10.20" /><PracticeCard title="PC2" address="192.168.10.30" /></div>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-5 text-blue-950"><p className="font-bold">Bestimme für beide PCs</p><ul className="mt-2 list-disc space-y-1 pl-5"><li>die Netzadresse,</li><li>die Broadcast-Adresse,</li><li>ob beide Adressen im selben <code>/24</code>-Netz liegen.</li></ul><p className="mt-3 text-sm leading-6">Kontrolllösung: Beide gehören zu <code>192.168.10.0/24</code>; die Broadcast-Adresse ist <code>192.168.10.255</code>.</p></div>
      </section>

      <aside aria-labelledby="network-memory-heading" className="rounded-2xl border border-blue-200 bg-blue-950 p-5 text-white sm:p-6">
        <h2 id="network-memory-heading" className="text-sm font-bold uppercase tracking-[0.12em] text-blue-200">Merksätze</h2>
        <ul className="mt-3 space-y-2 font-semibold"><li>Netzadresse: alle Hostbits = 0</li><li>Broadcast-Adresse: alle Hostbits = 1</li><li>Die Subnetzmaske bestimmt, welche Bits Hostbits sind.</li><li>Im Beispiel gilt: <code>192.168.10.25/24</code> → Netz <code>192.168.10.0</code>, Broadcast <code>192.168.10.255</code>.</li></ul>
      </aside>

      <section aria-labelledby="module-summary-heading">
        <h2 id="module-summary-heading" className="text-2xl font-bold tracking-tight text-slate-950">IPv4-Grundlagen im Zusammenhang</h2>
        <p className="mt-4">Dieses Modul behandelt damit fünf Grundlagen:</p>
        <ol className="mt-4 list-decimal space-y-2 pl-6"><li>Zweck der IPv4-Adressierung</li><li>32-Bit-Aufbau und vier Oktette</li><li>Subnetzmaske sowie Netz- und Hostanteil</li><li>private, öffentliche und besondere Adressierung</li><li>Netz- und Broadcast-Adressen</li></ol>
        <p className="mt-4">Darauf kann ein späterer Subnetting-Kurs mit weiteren Präfixlängen und Berechnungen aufbauen.</p>
      </section>
    </div>
  );
}

function AddressOverview({ items }: { items: readonly (readonly [string, string])[] }) {
  return <dl className="mt-5 grid gap-3 sm:grid-cols-2">{items.map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"><dt className="text-sm font-semibold text-slate-500">{label}</dt><dd className="mt-1"><code className="break-all font-bold text-blue-950">{value}</code></dd></div>)}</dl>;
}

function PracticeCard({ title, address }: { title: string; address: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-bold text-slate-950">{title}</h3><dl className="mt-2 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt>IPv4-Adresse</dt><dd><code>{address}</code></dd></div><div className="mt-1 flex flex-wrap justify-between gap-2"><dt>Subnetzmaske</dt><dd><code>255.255.255.0</code></dd></div></dl></div>;
}

const subnetClassificationOctets: readonly OctetClassification[] = [
  { value: "192", correctPortion: "network", explanation: "Die zugehörige 255 besteht aus acht 1-Bits. Sie markiert dieses Oktett bei dieser Maske als Netzanteil." },
  { value: "168", correctPortion: "network", explanation: "Die zugehörige 255 besteht aus acht 1-Bits. Sie markiert dieses Oktett bei dieser Maske als Netzanteil." },
  { value: "10", correctPortion: "network", explanation: "Die zugehörige 255 besteht aus acht 1-Bits. Sie markiert dieses Oktett bei dieser Maske als Netzanteil." },
  { value: "25", correctPortion: "host", explanation: "Bei 255.255.255.0 gehören die letzten 8 Bit zum Hostanteil; die zugehörige Maskenstelle ist 0." },
];

const privateIpv4Ranges: readonly Ipv4Range[] = [
  { name: "Privater 10er-Bereich", cidr: "10.0.0.0/8", firstAddress: "10.0.0.0", lastAddress: "10.255.255.255", pattern: "Das erste Oktett ist immer 10." },
  { name: "Privater 172er-Bereich", cidr: "172.16.0.0/12", firstAddress: "172.16.0.0", lastAddress: "172.31.255.255", pattern: "Das erste Oktett ist 172, das zweite liegt zwischen 16 und 31." },
  { name: "Privater 192.168er-Bereich", cidr: "192.168.0.0/16", firstAddress: "192.168.0.0", lastAddress: "192.168.255.255", pattern: "Die ersten beiden Oktette sind immer 192.168." },
];

const addressClassifications: readonly AddressClassification[] = [
  { address: "10.20.30.40", correctCategory: "private", explanation: "10.0.0.0/8 ist einer der drei privaten RFC1918-Bereiche." },
  { address: "192.168.1.50", correctCategory: "private", explanation: "192.168.0.0/16 ist privater RFC1918-Adressraum." },
  { address: "172.20.5.10", correctCategory: "private", explanation: "Der private 172er-Bereich reicht von 172.16.0.0 bis 172.31.255.255." },
  { address: "172.32.5.10", correctCategory: "not-private", explanation: "172.32.x.x liegt bereits außerhalb des privaten Bereichs 172.16.0.0/12. Ohne weitere Prüfung ist damit nur die vorsichtige Kategorie „nicht privat / möglicherweise global routbar“ sicher." },
  { address: "127.0.0.1", correctCategory: "special", explanation: "127.0.0.0/8 ist für Loopback reserviert und kein RFC1918-Privatbereich." },
  { address: "169.254.20.5", correctCategory: "special", explanation: "169.254.0.0/16 ist IPv4 Link-Local und kein RFC1918-Privatbereich." },
];

function PrivatePublicAddressLesson() {
  return (
    <div className="space-y-10 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
      <LearningObjectives context="lesson" objectives={["erklären, warum private IPv4-Bereiche existieren", "die drei privaten RFC1918-Adressbereiche nennen und erkennen", "private RFC1918-Adressierung von global routbarer Adressierung unterscheiden", "auf Einsteigerniveau erklären, warum NAT häufig verwendet wird", "Loopback und IPv4 Link-Local als wichtige Sonderbereiche erkennen", "verstehen, dass „nicht privat“ nicht automatisch „öffentlich nutzbar“ bedeutet", "Beispieladressen sinnvoll einordnen"]} />

      <section aria-labelledby="why-private-heading">
        <h2 id="why-private-heading" className="text-2xl font-bold tracking-tight text-slate-950">Warum private IP-Adressen?</h2>
        <div className="mt-4 space-y-4">
          <p>Der IPv4-Adressraum ist begrenzt. Deshalb wurden bestimmte Bereiche für die Nutzung innerhalb privater Netze reserviert. Haushalte und Organisationen können diese Adressen intern wiederverwenden, ohne dass jede davon im öffentlichen Internet weltweit eindeutig sein muss.</p>
          <p>So kann in sehr vielen voneinander unabhängigen Heimnetzen gleichzeitig ein Gerät <code>192.168.1.10</code> verwenden. Das funktioniert, weil private Adressen nach <strong>RFC1918</strong> nicht als gewöhnliche Ziele über das öffentliche Internet global geroutet werden.</p>
        </div>
        <aside className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-slate-900">
          <p className="font-bold">Privat bedeutet nicht automatisch sicher</p>
          <p className="mt-2 text-sm leading-6">„Private IP-Adresse“ bedeutet nicht: „Diese Adresse beziehungsweise dieses Gerät ist automatisch sicher.“ Private Adressierung und Netzwerksicherheit sind getrennte Konzepte.</p>
        </aside>
      </section>

      <section aria-labelledby="private-ranges-heading">
        <h2 id="private-ranges-heading" className="text-2xl font-bold tracking-tight text-slate-950">Die drei privaten IPv4-Bereiche</h2>
        <p className="mt-4">RFC1918 definiert genau diese drei Bereiche. Du musst dabei nicht jede einzelne Adresse auswendig lernen, sondern die Grenzen und Muster erkennen.</p>
        <Ipv4RangeOverview ranges={privateIpv4Ranges} />
        <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 sm:p-6">
          <h3 className="font-bold text-slate-950">Achtung beim 172er-Bereich</h3>
          <p className="mt-2"><strong>Nicht jede Adresse, die mit 172 beginnt, ist privat.</strong> Nur <code>172.16.x.x</code> bis <code>172.31.x.x</code> gehört zu RFC1918.</p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <RangeExample address="172.20.10.5" result="privat" />
            <RangeExample address="172.31.200.10" result="privat" />
            <RangeExample address="172.32.1.5" result="nicht RFC1918-privat" />
            <RangeExample address="172.15.1.5" result="nicht RFC1918-privat" />
          </dl>
        </div>
      </section>

      <section aria-labelledby="private-public-heading">
        <h2 id="private-public-heading" className="text-2xl font-bold tracking-tight text-slate-950">Privat, global routbar oder Sonderbereich?</h2>
        <div className="mt-4 space-y-4">
          <p>Eine private RFC1918-Adresse wie <code>192.168.10.25</code> wird typischerweise innerhalb eines lokalen oder privaten Netzes eingesetzt. Global routbare öffentliche IPv4-Adressen werden für Kommunikation über das öffentliche Internet weltweit koordiniert.</p>
          <p>Doch IPv4 kennt zusätzlich <strong>Sonderbereiche</strong> mit einem festgelegten Zweck. Deshalb ist die Regel „Alles außerhalb von RFC1918 ist öffentlich“ falsch.</p>
        </div>
        <ol className="mt-5 space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-5 text-blue-950">
          <li><strong>1.</strong> Ist die Adresse RFC1918-privat?</li>
          <li><strong>2.</strong> Gehört sie zu einem bekannten Sonderbereich?</li>
          <li><strong>3.</strong> Erst danach kommt infrage, dass sie global routbar beziehungsweise öffentlich sein könnte.</li>
        </ol>
      </section>

      <section aria-labelledby="nat-heading">
        <h2 id="nat-heading" className="text-2xl font-bold tracking-tight text-slate-950">NAT im Alltag</h2>
        <p className="mt-4">In vielen Heim- und Firmennetzen verwenden mehrere Geräte private IPv4-Adressen. Ein Router kann mit <strong>Network Address Translation (NAT)</strong> Adressinformationen beim Übergang zu externen Netzen übersetzen. So können beispielsweise Laptop und Smartphone über den Router nach außen kommunizieren. Das häufige Viele-zu-eins-Verhalten wird technisch oft durch Portübersetzung ergänzt; die Konfiguration ist hier noch nicht Thema.</p>
        <NatNetworkVisualization />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <FactCard text="RFC1918 legt fest, welche Bereiche privat sind – nicht NAT." />
          <FactCard text="Private Netze müssen nicht grundsätzlich NAT verwenden." />
          <FactCard text="NAT und Firewalling sind verschiedene Funktionen, auch wenn Router oft beides übernehmen." />
        </div>
      </section>

      <section aria-labelledby="special-heading">
        <h2 id="special-heading" className="text-2xl font-bold tracking-tight text-slate-950">Wichtige Sonderbereiche</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <SpecialRange title="Loopback" cidr="127.0.0.0/8" example="127.0.0.1">
            Loopback-Verkehr führt zum lokalen Host zurück. <code>127.0.0.1</code> ist das vertraute Beispiel. In der Praxis heißt der Hostname <code>localhost</code> und wird normalerweise in eine oder mehrere Loopback-Adressen aufgelöst. Der Bereich ist weder RFC1918-privat noch gewöhnlich global routbar.
          </SpecialRange>
          <SpecialRange title="IPv4 Link-Local" cidr="169.254.0.0/16" example="169.254.20.5">
            Link-Local-Adressen können bei automatischer Konfiguration ohne normale DHCP-Konfiguration auftreten. Auf einem typischen Windows-Client ist <code>169.254.x.x</code> ein starker Hinweis, dass keine normale DHCP-Konfiguration bezogen wurde – aber kein Beweis, dass der DHCP-Server „kaputt“ ist. Der Bereich ist weder RFC1918-privat noch gewöhnlich global routbar.
          </SpecialRange>
        </div>
        <aside className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-bold text-slate-950">Auch Beispiele können reserviert sein</h3>
          <p className="mt-2 text-sm leading-6">Bereiche wie <code>192.0.2.0/24</code>, <code>198.51.100.0/24</code> und <code>203.0.113.0/24</code> sind für Dokumentation vorgesehen. Du musst sie hier nicht auswendig lernen. Sie zeigen erneut: Nicht privat bedeutet nicht automatisch global nutzbar.</p>
        </aside>
      </section>

      <AddressClassificationCheck addresses={addressClassifications} />

      <section aria-labelledby="private-misconceptions-heading">
        <h2 id="private-misconceptions-heading" className="text-2xl font-bold tracking-tight text-slate-950">Typische Denkfehler</h2>
        <dl className="mt-5 space-y-4">
          <Misconception idea="192.168.x.x ist der einzige private Bereich." correction="RFC1918 definiert drei Bereiche: 10.0.0.0/8, 172.16.0.0/12 und 192.168.0.0/16." />
          <Misconception idea="Alle 172.x.x.x-Adressen sind privat." correction="Nur 172.16.0.0 bis 172.31.255.255 gehört zum privaten RFC1918-Bereich." />
          <Misconception idea="Eine private IP-Adresse kann im Internet niemals irgendeine Rolle spielen." correction="Private Adressen werden nicht als gewöhnliche Ziele global geroutet. Geräte, die sie intern verwenden, kommunizieren aber häufig über Routing und Mechanismen wie NAT mit externen Netzen." />
          <Misconception idea="Nicht privat bedeutet automatisch öffentlich." correction="Es gibt zusätzlich Sonderbereiche, zum Beispiel für Loopback und IPv4 Link-Local. Erst eine weitere Prüfung erlaubt eine Aussage zur globalen Routbarkeit." />
          <Misconception idea="NAT ist eine Firewall." correction="NAT übersetzt Adressinformationen; Firewalling kontrolliert Verkehr nach Regeln. Viele Router bieten beides, technisch sind es getrennte Funktionen." />
        </dl>
      </section>

      <section aria-labelledby="private-practice-heading">
        <h2 id="private-practice-heading" className="text-2xl font-bold tracking-tight text-slate-950">Praxisbezug</h2>
        <p className="mt-4">Lies die Netzwerkkonfiguration deines Computers aus, ohne Einstellungen zu verändern. Suche eine IPv4-Adresse an einer aktiven Schnittstelle.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><CommandExample system="Windows" command="ipconfig" /><CommandExample system="Linux" command="ip addr" /></div>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-5 text-blue-950">
          <p className="font-bold">Ordne deine gefundene Adresse ein</p>
          <ul className="mt-2 list-disc space-y-1 pl-5"><li>Liegt sie in <code>10.0.0.0/8</code>?</li><li>Liegt sie in <code>172.16.0.0/12</code>?</li><li>Liegt sie in <code>192.168.0.0/16</code>?</li><li>Beginnt sie mit <code>169.254</code>?</li><li>Oder ist es eine andere Adresse?</li></ul>
        </div>
        <p className="mt-4 text-sm leading-6">VPN, Virtualisierung, Docker, Tailscale oder andere Software kann zusätzliche Netzwerkschnittstellen erzeugen. Deshalb kann ein Gerät mehrere IPv4-Adressen anzeigen.</p>
        <aside className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><p className="font-bold text-slate-950">Kurzer Filius-Bezug</p><p className="mt-2 text-sm leading-6">Konfiguriere drei PCs mit Adressen aus <code>192.168.10.0/24</code>. Welcher RFC1918-Bereich enthält diese Adressen? Vergleiche anschließend gedanklich mit Adressen wie <code>10.10.10.x</code>.</p></aside>
      </section>

      <aside aria-labelledby="private-memory-heading" className="rounded-2xl border border-blue-200 bg-blue-950 p-5 text-white sm:p-6">
        <h2 id="private-memory-heading" className="text-sm font-bold uppercase tracking-[0.12em] text-blue-200">Merksätze</h2>
        <ul className="mt-3 space-y-2 font-semibold"><li><code>10.0.0.0/8</code></li><li><code>172.16.0.0/12</code></li><li><code>192.168.0.0/16</code></li><li className="pt-2 text-amber-200">Nicht privat ≠ automatisch öffentlich.</li><li><code>127.x.x.x</code> → Loopback · <code>169.254.x.x</code> → Link-Local</li></ul>
      </aside>
    </div>
  );
}

function RangeExample({ address, result }: { address: string; result: string }) {
  return <div className="rounded-lg border border-amber-200 bg-white p-3"><dt><code className="font-bold text-slate-950">{address}</code></dt><dd className="mt-1 font-semibold text-slate-700">→ {result}</dd></div>;
}

function FactCard({ text }: { text: string }) {
  return <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-950">{text}</p>;
}

function SpecialRange({ title, cidr, example, children }: { title: string; cidr: string; example: string; children: React.ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-blue-700">Sonderbereich</p><h3 className="mt-1 text-xl font-bold text-slate-950">{title}</h3><p className="mt-3"><code className="font-bold">{cidr}</code></p><p className="mt-1 text-sm">Beispiel: <code className="font-bold">{example}</code></p><p className="mt-3 text-sm leading-6 text-slate-700">{children}</p></article>;
}

function SubnetMaskLesson() {
  return (
    <div className="space-y-10 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
      <LearningObjectives context="lesson" objectives={["den Zweck einer IPv4-Subnetzmaske erklären", "Netzanteil und Hostanteil begrifflich unterscheiden", "die Subnetzmaske 255.255.255.0 interpretieren", "erklären, warum 255.255.255.0 der Präfixlänge /24 entspricht", "in einem einfachen /24-Beispiel Netz- und Hostanteil erkennen", "erkennen, dass eine gültige Subnetzmaske aus zusammenhängenden 1-Bits und danach zusammenhängenden 0-Bits besteht", "verstehen, dass dieselbe IP-Adresse mit verschiedenen Subnetzmasken unterschiedlich interpretiert wird"]} />

      <section aria-labelledby="mask-purpose-heading">
        <h2 id="mask-purpose-heading" className="text-2xl font-bold tracking-tight text-slate-950">Warum gibt es eine Subnetzmaske?</h2>
        <div className="mt-4 space-y-4"><p>Eine IPv4-Adresse allein beschreibt noch nicht vollständig, welche Bits den <strong>Netzanteil</strong> und welche den <strong>Hostanteil</strong> innerhalb dieses Netzes bilden. Dafür wird die IPv4-Adresse zusammen mit einer <strong>32 Bit langen Subnetzmaske</strong> betrachtet.</p><p>Die Maske trennt die Adresse nicht physisch. Sie legt bitweise fest, wie die Adresse interpretiert wird: 1-Bits der Maske markieren den Netzanteil, 0-Bits den Hostanteil. Der Hostanteil bezeichnet dabei keine dauerhafte Gerätekennung.</p></div>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-5 text-blue-950"><p><span className="font-bold">IP-Adresse:</span> <code>192.168.10.25</code></p><p><span className="font-bold">Subnetzmaske:</span> <code>255.255.255.0</code></p></div>
      </section>

      <section aria-labelledby="simple-example-heading">
        <h2 id="simple-example-heading" className="text-2xl font-bold tracking-tight text-slate-950">Das einfache /24-Beispiel</h2>
        <p className="mt-4">Bei genau dieser Maske gehören die ersten 24 Bit – hier die Oktette <code>192</code>, <code>168</code> und <code>10</code> – zum Netzanteil. Die letzten 8 Bit, hier das Oktett <code>25</code>, bilden den Hostanteil.</p>
        <div className="mt-6"><NetworkHostVisualization addressOctets={["192", "168", "10", "25"]} maskOctets={["255", "255", "255", "0"]} portions={["network", "network", "network", "host"]} prefixLength={24} /></div>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-800"><strong>Wichtig:</strong> Die ersten drei Oktette sind nicht immer der Netzanteil. Das gilt hier, weil die verwendete Maske <code>255.255.255.0</code> beziehungsweise <code>/24</code> lautet.</p>
      </section>

      <section aria-labelledby="binary-mask-heading">
        <h2 id="binary-mask-heading" className="text-2xl font-bold tracking-tight text-slate-950">Warum bedeutet 255 „Netz“?</h2>
        <p className="mt-4">Aus Lektion 2 kennst du Oktette als Gruppen aus acht Bit. <code>255</code> ist binär <code>11111111</code>, während <code>0</code> binär <code>00000000</code> ist. Bei diesem einfachen Beispiel markiert deshalb jede 255 ein vollständiges Netz-Oktett und die 0 ein vollständiges Host-Oktett.</p>
        <BinaryMask octets={["11111111", "11111111", "11111111", "00000000"]} />
        <p className="mt-4">Die Maske enthält <strong>24 1-Bits</strong> und danach <strong>8 0-Bits</strong>. Daher umfasst der Netzanteil hier 24 Bit und der Hostanteil 8 Bit.</p>
      </section>

      <section aria-labelledby="prefix-heading">
        <h2 id="prefix-heading" className="text-2xl font-bold tracking-tight text-slate-950">Was bedeutet /24?</h2>
        <p className="mt-4"><code>/24</code> ist keine IP-Adresse, sondern die kompakte <strong>Präfixlänge</strong>. Sie sagt: Die Subnetzmaske beginnt mit 24 zusammenhängenden 1-Bits.</p>
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center text-blue-950 sm:p-6"><code className="block font-bold">255.255.255.0</code><span className="block font-bold" aria-hidden="true">=</span><code className="block break-words text-sm font-bold sm:text-base">11111111.11111111.11111111.00000000</code><span className="block font-bold" aria-hidden="true">=</span><code className="block text-2xl font-bold">/24</code></div>
      </section>

      <section aria-labelledby="valid-masks-heading">
        <h2 id="valid-masks-heading" className="text-2xl font-bold tracking-tight text-slate-950">Gültige Subnetzmasken</h2>
        <p className="mt-4">Eine normale IPv4-Subnetzmaske besteht aus zusammenhängenden 1-Bits, gefolgt von zusammenhängenden 0-Bits. Nach der ersten 0 darf also keine 1 mehr folgen.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><MaskExample label="Gültig" decimal="255.255.255.0" binary="11111111.11111111.11111111.00000000" valid /><MaskExample label="Gültig" decimal="255.255.0.0" binary="11111111.11111111.00000000.00000000" valid /><MaskExample label="Ungültig als Subnetzmaske" decimal="255.0.255.0" binary="11111111.00000000.11111111.00000000" /></div>
        <p className="mt-4 text-sm leading-6">Beim ungültigen Beispiel wechseln die Bits von 1 zu 0 und danach wieder zurück zu 1.</p>
      </section>

      <section aria-labelledby="same-ip-heading">
        <h2 id="same-ip-heading" className="text-2xl font-bold tracking-tight text-slate-950">Gleiche IP-Adresse, andere Maske</h2>
        <p className="mt-4">Betrachte dieselbe Adresse <code>192.168.10.25</code> einmal mit <code>255.255.255.0</code> und einmal mit <code>255.255.0.0</code>. Im ersten Fall markieren 24 führende 1-Bits den Netzanteil, im zweiten nur 16.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><ComparisonCard mask="255.255.255.0" prefix="/24" description="24 Bit Netzanteil, danach 8 Bit Hostanteil" /><ComparisonCard mask="255.255.0.0" prefix="/16" description="16 Bit Netzanteil, danach 16 Bit Hostanteil" /></div>
        <p className="mt-4 font-semibold text-slate-900">Für die Interpretation der Netzzugehörigkeit gehören IP-Adresse und Subnetzmaske zusammen.</p>
      </section>

      <NetworkHostClassificationCheck address="192.168.10.25" mask="255.255.255.0" octets={subnetClassificationOctets} />

      <section aria-labelledby="misconceptions-heading">
        <h2 id="misconceptions-heading" className="text-2xl font-bold tracking-tight text-slate-950">Typische Denkfehler</h2>
        <dl className="mt-5 space-y-4"><Misconception idea="Die ersten drei Oktette gehören immer zum Netz." correction="Das gilt nur bei passenden Masken wie 255.255.255.0 beziehungsweise /24. Die Grenze kann auch innerhalb eines Oktetts liegen." /><Misconception idea="255 bedeutet einfach immer Netzwerk und 0 immer Host." correction="Für einfache Masken mit vollständigen Oktetten hilft diese Darstellung. Masken können aber auch Werte wie 128, 192, 224, 240, 248, 252 oder 254 enthalten, weil die Grenze innerhalb eines Oktetts liegen kann. Diese Werte folgen später." /><Misconception idea="Die Subnetzmaske ist das Standardgateway." correction="Subnetzmaske und Standardgateway sind verschiedene Konfigurationswerte mit unterschiedlichen Aufgaben. Die Maske beschreibt Netz- und Hostbits; das Gateway ist ein Ziel für die Weiterleitung in andere Netze." /></dl>
      </section>

      <section aria-labelledby="mask-practice-heading">
        <h2 id="mask-practice-heading" className="text-2xl font-bold tracking-tight text-slate-950">Praxisbezug</h2>
        <p className="mt-4">Lies die Netzwerkkonfiguration deines Computers nur aus und ändere keine Einstellungen. Windows zeigt häufig IPv4-Adresse, Subnetzmaske und Standardgateway getrennt. Linux schreibt den Präfix oft direkt hinter die Adresse, zum Beispiel <code>192.168.10.25/24</code>.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><CommandExample system="Windows" command="ipconfig" /><CommandExample system="Linux" command="ip addr" /></div>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-5 text-blue-950"><p className="font-bold">Beobachtungsaufgabe</p><ul className="mt-2 list-disc space-y-1 pl-5"><li>Finde eine IPv4-Adresse.</li><li>Finde ihre Subnetzmaske oder Präfixlänge.</li><li>Prüfe, ob die Anzeige eine punktierte Maske oder einen CIDR-Präfix verwendet.</li></ul></div>
        <aside className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><p className="font-bold text-slate-950">Kurzer Filius-Bezug</p><p className="mt-2 text-sm leading-6">Erstelle oder untersuche einen PC mit <code>192.168.10.25</code> und <code>255.255.255.0</code>. Welcher Teil der Adresse gehört bei dieser Maske zum Netzanteil?</p></aside>
      </section>

      <aside aria-labelledby="memory-heading" className="rounded-2xl border border-blue-200 bg-blue-950 p-5 text-white sm:p-6"><h2 id="memory-heading" className="text-sm font-bold uppercase tracking-[0.12em] text-blue-200">Merksätze</h2><ul className="mt-3 space-y-2 font-semibold"><li>Die IP-Adresse sagt nicht allein, wo der Netzanteil endet.</li><li>Die Subnetzmaske markiert Netz- und Hostbits.</li><li><code>255.255.255.0 = /24</code></li><li><code>/24</code> bedeutet: 24 Netzbits.</li></ul></aside>
    </div>
  );
}

function BinaryMask({ octets }: { octets: readonly string[] }) { return <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={octets.join(".")}>{octets.map((octet, index) => <code key={`${octet}-${index}`} className={`rounded-lg border px-2 py-3 text-center text-sm font-bold ${index < 3 ? "border-blue-200 bg-blue-50 text-blue-950" : "border-amber-300 bg-amber-50 text-amber-950"}`}>{octet}</code>)}</div>; }
function MaskExample({ label, decimal, binary, valid = false }: { label: string; decimal: string; binary: string; valid?: boolean }) { return <div className={`rounded-xl border p-4 ${valid ? "border-blue-200 bg-blue-50" : "border-amber-300 bg-amber-50"}`}><p className="text-sm font-bold text-slate-900">{label}</p><code className="mt-2 block font-bold text-slate-950">{decimal}</code><code className="mt-1 block break-words text-xs text-slate-700">{binary}</code></div>; }
function ComparisonCard({ mask, prefix, description }: { mask: string; prefix: string; description: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><code className="block font-bold text-blue-950">192.168.10.25</code><p className="mt-2 text-sm"><code>{mask}</code> <strong>{prefix}</strong></p><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>; }
function Misconception({ idea, correction }: { idea: string; correction: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><dt className="font-bold text-slate-950">„{idea}“</dt><dd className="mt-2 text-sm leading-6 text-slate-700">{correction}</dd></div>; }

function IpAddressLesson() {
  return (
    <div className="space-y-10 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
      <LearningObjectives title="Lernziel" context="lesson" objectives={["erklären, was eine IP-Adresse ist", "erklären, warum Geräte beziehungsweise ihre Netzwerkschnittstellen IP-Adressen benötigen", "eine IP-Adresse begrifflich von einem Geräte- oder Hostnamen unterscheiden", "verstehen, dass IPv4-Adressen Schnittstellen innerhalb von IP-Netzwerken identifizieren"]} />

      <section aria-labelledby="explanation-heading">
        <h2 id="explanation-heading" className="text-2xl font-bold tracking-tight text-slate-950">Wie funktioniert eine IP-Adresse?</h2>
        <div className="mt-4 space-y-4">
          <p><strong>IP</strong> steht für <strong>Internet Protocol</strong>. Damit Daten in einem IP-Netzwerk ihr vorgesehenes Ziel erreichen können, benötigen die beteiligten Netzwerkschnittstellen eine IP-Adressierung. Die Adresse macht es möglich, Kommunikation an die vorgesehene Schnittstelle zu richten.</p>
          <p>IPv4 ist eine Version des Internet Protocol. Eine IPv4-Adresse wird üblicherweise als vier Dezimalzahlen geschrieben, die durch Punkte getrennt sind. Jede dieser Zahlen – ein sogenanntes Oktett – kann einen Wert von <strong>0 bis 255</strong> haben.</p>
        </div>
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5 sm:p-6"><p className="text-sm font-semibold text-blue-800">Beispiel für eine IPv4-Adresse</p><code className="mt-2 block font-mono text-2xl font-bold text-blue-950">192.168.10.25</code></div>
        <p className="mt-4">Eine IP-Adresse ist dabei keine unveränderliche Kennzeichnung der physischen Hardware. Ein Gerät kann mehrere Netzwerkschnittstellen und mehrere IP-Adressen besitzen; Adressen können sich außerdem ändern.</p>
      </section>

      <section aria-labelledby="analogy-heading">
        <h2 id="analogy-heading" className="text-2xl font-bold tracking-tight text-slate-950">Vergleich mit einer Postadresse</h2>
        <div className="mt-4 space-y-4"><p>Als erste Orientierung hilft der Vergleich mit Post: Ein Name beschreibt, <em>wer oder was</em> gemeint ist. Eine Adresse gibt an, <em>wohin</em> eine Sendung adressiert wird. Ähnlich kann ein Gerätename ein System verständlich benennen, während die IP-Adresse die Netzwerkkommunikation an eine Schnittstelle adressierbar macht.</p><p>Der Vergleich ist bewusst vereinfacht: IP-Adressen sind keine buchstäblichen Ortsangaben, können wechseln und ein Gerät kann mehr als eine davon verwenden.</p></div>
      </section>

      <section aria-labelledby="network-example-heading">
        <h2 id="network-example-heading" className="text-2xl font-bold tracking-tight text-slate-950">Beispielnetzwerk</h2>
        <div className="mt-5 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <NetworkNode name="Laptop" address="192.168.10.20" />
          <div aria-hidden="true" className="flex items-center justify-center text-blue-700"><span className="sm:hidden">↕</span><span className="hidden sm:inline">←────→</span></div>
          <NetworkNode name="Server" address="192.168.10.30" />
        </div>
        <p className="mt-4">Die beiden IPv4-Adressen ermöglichen es, Kommunikation im IP-Netzwerk an die jeweilige Netzwerkschnittstelle von Laptop oder Server zu richten. Wie Netze abgegrenzt und Daten zwischen ihnen weitergeleitet werden, folgt in späteren Lektionen.</p>
      </section>

      <KnowledgeCheck />

      <section aria-labelledby="practice-heading">
        <h2 id="practice-heading" className="text-2xl font-bold tracking-tight text-slate-950">Praxisbezug</h2>
        <p className="mt-4">Finde heraus, welche IPv4-Adresse deinem eigenen Computer aktuell zugewiesen ist. Du liest die Konfiguration dabei nur aus und änderst nichts.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><CommandExample system="Windows" command="ipconfig" /><CommandExample system="Linux" command="ip addr" /></div>
        <p className="mt-4">Suche in der Ausgabe bei der gerade verwendeten Netzwerkschnittstelle nach einer Angabe wie „IPv4-Adresse“ oder „inet“. Der Name der Schnittstelle unterscheidet sich je nach Gerät und Verbindung.</p>
      </section>
    </div>
  );
}

const ipv4ValidityOptions: readonly MultipleSelectionOption[] = [
  { id: "private-example", label: "192.168.10.25", explanation: "Die Angabe ist syntaktisch gültig." },
  { id: "short-example", label: "10.0.0.1", explanation: "Die Angabe ist syntaktisch gültig." },
  { id: "third-example", label: "172.16.5.200", explanation: "Die Angabe ist syntaktisch gültig." },
  { id: "too-large", label: "192.168.1.256", explanation: "256 liegt außerhalb des erlaubten Bereichs von 0 bis 255 für ein Oktett." },
  { id: "three-octets", label: "192.168.10", explanation: "Die punktierte Dezimalschreibweise verlangt genau vier Oktette; hier sind es nur drei." },
  { id: "five-octets", label: "10.20.30.40.50", explanation: "Die Angabe enthält fünf statt genau vier Oktette." },
];

function Ipv4StructureLesson() {
  const octets = ["192", "168", "10", "25"];
  const bitPositions = ["128", "64", "32", "16", "8", "4", "2", "1"];
  const binaryDigits = ["1", "1", "0", "0", "0", "0", "0", "0"];
  const mistakes = [
    ["192.168.1", "Nur drei Oktette – benötigt werden genau vier."],
    ["192.168.1.10.5", "Fünf Oktette – erlaubt sind genau vier."],
    ["192.168.300.5", "300 liegt außerhalb des Bereichs von 0 bis 255."],
    ["192.168.-1.5", "Negative Oktettwerte sind ungültig."],
    ["192.168.one.5", "Die normale punktierte Dezimalschreibweise verwendet Dezimalwerte."],
  ] as const;

  return (
    <div className="space-y-10 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
      <LearningObjectives context="lesson" objectives={["erklären, dass eine IPv4-Adresse aus 32 Bit besteht", "beschreiben, wie IPv4 diese Bits in vier Gruppen zu je 8 Bit aufteilt", "den Begriff „Oktett“ definieren", "die punktierte Dezimalschreibweise von IPv4 erkennen", "erklären, warum ein dezimales Oktett Werte von 0 bis 255 annehmen kann", "syntaktisch gültige und ungültige IPv4-Schreibweisen unterscheiden", "den grundlegenden Zusammenhang zwischen Binär- und Dezimalschreibweise verstehen"]} />

      <section aria-labelledby="octets-heading">
        <h2 id="octets-heading" className="text-2xl font-bold tracking-tight text-slate-950">Die vier Oktette</h2>
        <p className="mt-4">Eine IPv4-Adresse besteht aus insgesamt <strong>32 Bit</strong>. Diese Bits sind in <strong>vier gleich große Gruppen</strong> aufgeteilt. Jede Gruppe enthält 8 Bit und heißt <strong>Oktett</strong>.</p>
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {octets.map((octet, index) => <div key={octet} className="rounded-xl border border-blue-200 bg-white p-3 text-center shadow-sm"><code className="block text-2xl font-bold text-blue-950">{octet}</code><span className="mt-1 block text-xs font-semibold text-slate-600">{index + 1}. Oktett</span></div>)}
          </div>
          <p className="mt-4 text-center font-mono text-sm font-bold text-blue-950 sm:text-base">192 · 168 · 10 · 25</p>
          <p className="mt-3 text-center font-semibold text-blue-950">8 Bit + 8 Bit + 8 Bit + 8 Bit = 32 Bit</p>
        </div>
      </section>

      <section aria-labelledby="octet-definition-heading">
        <h2 id="octet-definition-heading" className="text-2xl font-bold tracking-tight text-slate-950">Was bedeutet „Oktett“?</h2>
        <div className="mt-4 space-y-4"><p>In Netzwerken bezeichnet ein <strong>Oktett</strong> ausdrücklich eine Gruppe aus genau <strong>8 Bit</strong>, also acht binären Stellen. IPv4 besteht aus vier solchen Oktetten.</p><p>In der üblichen IPv4-Schreibweise wird jedes Oktett als Dezimalzahl dargestellt. Der Fachbegriff „Oktett“ macht die feste Größe von acht Bits eindeutig; er ist deshalb hier genauer als eine allgemeine Gleichsetzung mit dem Begriff „Byte“ in jedem denkbaren Kontext.</p></div>
      </section>

      <section aria-labelledby="binary-heading">
        <h2 id="binary-heading" className="text-2xl font-bold tracking-tight text-slate-950">Binär und Dezimal</h2>
        <p className="mt-4">Computer stellen die acht Bits eines Oktetts mit Nullen und Einsen dar. Wir Menschen lesen dasselbe Oktett meist als Dezimalzahl. Für das erste Oktett unseres Beispiels sieht die Beziehung so aus:</p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2"><p className="rounded-lg bg-slate-50 p-3"><span className="block text-xs font-bold uppercase tracking-wide text-slate-500">Dezimal</span><code className="text-2xl font-bold text-slate-950">192</code></p><p className="rounded-lg bg-blue-50 p-3"><span className="block text-xs font-bold uppercase tracking-wide text-blue-700">Binär</span><code className="text-2xl font-bold text-blue-950">11000000</code></p></div>
          <div className="mt-5 grid grid-cols-8 gap-1 text-center text-xs sm:gap-2 sm:text-sm" aria-label="Bitstellen für den Dezimalwert 192">
            {bitPositions.map((position) => <div key={position} className="min-w-0"><span className="block truncate rounded-t-md bg-slate-100 px-0.5 py-2 font-semibold text-slate-700">{position}</span></div>)}
            {binaryDigits.map((digit, index) => <div key={`${digit}-${index}`} className="min-w-0"><span className="block rounded-b-md bg-blue-100 px-0.5 py-2 font-mono font-bold text-blue-950">{digit}</span></div>)}
          </div>
          <p className="mt-4 font-semibold text-slate-900"><code>128 + 64 = 192</code></p>
          <p className="mt-2 text-sm text-slate-600"><code>11000000₂ = 192₁₀</code> bedeutet nur: dieselbe Zahl, links im Binärsystem und rechts im Dezimalsystem geschrieben.</p>
        </div>
      </section>

      <section aria-labelledby="range-heading">
        <h2 id="range-heading" className="text-2xl font-bold tracking-tight text-slate-950">Warum nur 0 bis 255?</h2>
        <div className="mt-4 space-y-4"><p>Mit 8 Bit gibt es <strong>2<sup>8</sup> = 256</strong> mögliche Kombinationen. Weil die Zählung bei 0 beginnt, stellen sie die Dezimalwerte von <strong>0 bis 255 einschließlich</strong> dar.</p><p>Das größte binäre Oktett ist <code className="font-semibold text-slate-950">11111111</code>. Alle Stellen sind gesetzt: <code className="font-semibold text-slate-950">128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = 255</code>.</p></div>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-slate-900"><p><strong>0</strong> ist gültig. <strong>255</strong> ist gültig. <strong>256</strong> ist als Oktettwert ungültig.</p><p className="mt-2 text-sm leading-6">Syntaktisch gültig bedeutet noch nicht, dass eine Adresse in jedem Netzwerk als normale Hostadresse verwendet werden darf. Das hängt vom Netzkontext ab und folgt in späteren Lektionen.</p></div>
      </section>

      <section aria-labelledby="notation-heading">
        <h2 id="notation-heading" className="text-2xl font-bold tracking-tight text-slate-950">Punktierte Dezimalschreibweise</h2>
        <p className="mt-4">In der <strong>punktierten Dezimalschreibweise</strong> (englisch: <em>Dotted Decimal Notation</em>) stehen die vier Oktette als Dezimalwerte hintereinander. Punkte trennen sie. Die Standardschreibweise enthält genau vier Oktette, zum Beispiel <code className="font-semibold text-slate-950">192.168.10.25</code>.</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">{["192.168.10.25", "10.0.0.1", "172.16.5.200", "255.255.255.255"].map((address) => <li key={address} className="rounded-xl border border-slate-200 bg-white px-4 py-3"><code className="font-semibold text-blue-900">{address}</code><span className="ml-2 text-sm font-semibold text-slate-600">syntaktisch gültig</span></li>)}</ul>
        <p className="mt-4 text-sm leading-6 text-slate-600">Die Liste bewertet nur die Schreibweise. Sie sagt nicht, ob eine Adresse – insbesondere <code>255.255.255.255</code> – in einem bestimmten Netz als normale Hostadresse geeignet ist.</p>
      </section>

      <section aria-labelledby="mistakes-heading">
        <h2 id="mistakes-heading" className="text-2xl font-bold tracking-tight text-slate-950">Typische Fehler</h2>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">{mistakes.map(([address, problem]) => <div key={address} className="rounded-xl border border-slate-200 bg-white p-4"><dt><code className="break-all font-semibold text-red-800">{address}</code></dt><dd className="mt-1 text-sm leading-6 text-slate-600">{problem}</dd></div>)}</dl>
      </section>

      <MultipleSelectionCheck question="Welche der folgenden Angaben sind syntaktisch gültige IPv4-Adressen in punktierter Dezimalschreibweise?" options={ipv4ValidityOptions} correctOptionIds={["private-example", "short-example", "third-example"]} />

      <section aria-labelledby="structure-practice-heading">
        <h2 id="structure-practice-heading" className="text-2xl font-bold tracking-tight text-slate-950">Praxisbezug</h2>
        <p className="mt-4">Administratoren begegnen IPv4-Adressen regelmäßig. Unter Windows zeigt <code>ipconfig</code> die Netzwerkkonfiguration, unter Linux erfüllt <code>ip addr</code> diese Aufgabe. Auch bei einem Befehl wie <code>ping</code> können IPv4-Adressen auftauchen. Lies die Konfiguration nur aus und ändere sie nicht.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><CommandExample system="Windows" command="ipconfig" /><CommandExample system="Linux" command="ip addr" /></div>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-5"><p className="font-bold text-blue-950">Beobachtungsaufgabe</p><p className="mt-2 text-blue-950">Finde die IPv4-Adresse einer aktuell verwendeten Netzwerkschnittstelle und benenne ihre vier Oktette. Bei <code>192.168.10.25</code> gilt: Oktett 1 = 192, Oktett 2 = 168, Oktett 3 = 10, Oktett 4 = 25.</p></div>
      </section>

      <aside aria-label="Merksatz" className="rounded-2xl border border-blue-200 bg-blue-950 p-5 text-white sm:p-6"><p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-200">Merksatz</p><p className="mt-2 text-xl font-bold">IPv4 = 32 Bit = 4 Oktette × 8 Bit</p><p className="mt-1 font-semibold text-blue-100">Jedes Oktett: 0–255</p></aside>
    </div>
  );
}

function NetworkNode({ name, address }: { name: string; address: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm"><p className="font-bold text-slate-950">{name}</p><code className="mt-2 block font-mono text-sm font-semibold text-blue-800 sm:text-base">{address}</code></div>;
}

function CommandExample({ system, command }: { system: string; command: string }) {
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950"><p className="bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">{system}</p><pre className="overflow-x-auto p-4 text-sm text-blue-100"><code>{command}</code></pre></div>;
}

function LessonPlaceholder({ description }: { description: string }) {
  return <section aria-labelledby="lesson-notice-heading" className="rounded-xl border border-blue-100 bg-blue-50 p-5 sm:p-7"><h2 id="lesson-notice-heading" className="text-xl font-bold text-blue-950">Inhalt in Vorbereitung</h2><p className="mt-3 leading-7 text-blue-900">{description}</p><p className="mt-3 leading-7 text-blue-900">Der vollständige Inhalt dieser Lektion wird in einem späteren Meilenstein umgesetzt.</p></section>;
}
