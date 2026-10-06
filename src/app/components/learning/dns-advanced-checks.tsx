"use client";

import { SingleChoiceCheck, type SingleChoiceOption } from "./single-choice-check";

const troubleshootingOptions: readonly SingleChoiceOption[] = [
  { id: "dns", label: "DNS-Resolver-Konfiguration prüfen und den Namen mit einem DNS-Werkzeug abfragen", explanation: "Das sammelt passende Belege: Welcher Resolver wird genutzt und welche DNS-Antwort liefert er?" },
  { id: "mask", label: "Sofort die Subnetzmaske ändern", explanation: "Gateway und direkte IP-Verbindung funktionieren; ohne weiteren Befund ist eine Maskenänderung verfrüht." },
  { id: "adapter", label: "Den Netzwerkadapter neu installieren", explanation: "Dafür gibt es noch keinen Hinweis. Zuerst die betroffene DNS-Funktion gezielt untersuchen." },
  { id: "dhcp", label: "Einen erschöpften DHCP-Pool annehmen", explanation: "Der Client besitzt funktionierende IP-Konnektivität; Pool-Erschöpfung erklärt den DNS-Befund nicht direkt." },
  { id: "gateway", label: "Das Standardgateway ersetzen", explanation: "Das Gateway ist erreichbar. Ein Austausch ohne Beleg wäre kein strukturierter Diagnoseschritt." },
];

const filiusOptions: readonly SingleChoiceOption[] = [
  { id: "correct", label: "Client-DNS: 192.168.50.10; A: server.firma.test → 192.168.50.20", explanation: "Der Client fragt den DNS-Dienst auf .10; der A-Record liefert die Adresse des Zielservers .20." },
  { id: "web-as-dns", label: "Client-DNS: 192.168.50.20; A: server.firma.test → 192.168.50.20", explanation: ".20 ist der Anwendungsserver und bietet in diesem Lab keinen DNS-Dienst." },
  { id: "dns-as-target", label: "Client-DNS: 192.168.50.10; A: server.firma.test → 192.168.50.10", explanation: "Der Resolver steht auf .10, aber der angefragte Anwendungsserver steht auf .20." },
  { id: "gateway", label: "Client-DNS: 192.168.50.1; A: server.firma.test → 192.168.50.1", explanation: "Das Gateway ist weder automatisch Resolver noch Ziel der Anwendung." },
  { id: "local", label: "Client-DNS: 192.168.50.10; A: server.firma.local → 192.168.50.20", explanation: "Das geplante Lab verwendet die sichere Lehrdomain firma.test; .local ist für mDNS reserviert." },
];

export function DnsTroubleshootingCheck() {
  return <SingleChoiceCheck title="Der nächste sinnvolle Prüfschritt" question="Gateway und 192.168.10.20 sind erreichbar, aber server.firma.test wird nicht aufgelöst. Was untersuchst du als Nächstes?" options={troubleshootingOptions} correctOptionId="dns" successMessage="Richtig: Der Befund lenkt auf Namensauflösung. Resolver-Konfiguration und eine direkte DNS-Abfrage liefern gezielte Belege, ohne andere Ursachen endgültig auszuschließen." inputName="dns-troubleshooting" />;
}

export function DnsFiliusCheck() {
  return <SingleChoiceCheck title="Client und Record richtig konfigurieren" question="Welche Kombination lässt den Client server.firma.test über den vorgesehenen DNS-Dienst auflösen?" options={filiusOptions} correctOptionId="correct" successMessage="Richtig: Die DNS-Server-Adresse bezeichnet den Resolver; der A-Record bezeichnet die IPv4-Adresse des Anwendungsservers." inputName="dns-filius" />;
}
