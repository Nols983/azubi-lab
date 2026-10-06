function FlowStep({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 rounded-xl border border-blue-200 bg-white p-4 text-center font-semibold text-slate-900"><span className="break-words">{children}</span></div>;
}

export function TroubleshootingMethodFlow() {
  const steps = ["Problem gemeldet", "Umfang eingrenzen", "Aktuelle Konfiguration", "Lokale Verbindung", "Gateway und Routing", "Unterstützende Dienste", "Zieldienst und Anwendung", "Hypothese", "Kontrollierte Aktion", "Erneut testen und dokumentieren"];
  return <figure className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7"><figcaption className="text-xl font-bold text-slate-950">Vom Bericht zur belegten Lösung</figcaption><ol className="mx-auto mt-5 grid max-w-2xl gap-2">{steps.map((step, index) => <li key={step}>{index > 0 && <div aria-hidden="true" className="pb-2 text-center font-bold text-blue-700">↓</div>}<FlowStep>{step}</FlowStep></li>)}</ol><p className="mt-4 text-sm leading-6 text-slate-600">Der Ablauf ist ein praktisches Denkmodell, keine starre OSI-Prüfliste. Beobachtungen können einen gezielten Sprung zur wahrscheinlich betroffenen Schicht begründen.</p></figure>;
}

export function EvidenceComparison() {
  const examples = [
    ["DNS ist kaputt.", <><code>nslookup server.firma.test</code> liefert einen Timeout.</>],
    ["Das Gateway ist kaputt.", <>Der Client erreicht einen bekannten Same-Subnet-Peer, aber nicht die erwartete Gateway-Adresse.</>],
    ["Der Server ist down.", <>DNS löst auf und der Pfad ist plausibel, aber der TCP-Endpunkt lehnt die Verbindung ab.</>],
  ] as const;
  return <figure><figcaption className="text-xl font-bold text-slate-950">Annahme oder Evidenz?</figcaption><div className="mt-5 grid gap-4 lg:grid-cols-3">{examples.map(([assumption, evidence]) => <article key={assumption} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Annahme</p><p className="mt-1 font-semibold">„{assumption}“</p></div><div className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Beobachtung</p><p className="mt-1 break-words text-sm leading-6">{evidence}</p></div></article>)}</div><p className="mt-4 text-sm leading-6">Auch Evidenz bestimmt nicht automatisch eine einzige Ursache. Sie grenzt den nächsten sinnvollen Untersuchungsbereich ein.</p></figure>;
}

export function LocalNetworkDiagnosticOverview() {
  return <figure className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7"><figcaption className="text-xl font-bold text-slate-950">Lokales Netz und Remote-Verkehr</figcaption><div className="mt-5 grid gap-3 text-center sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Node title="PC A" detail="192.168.10.50/24" /><span aria-hidden="true" className="font-bold text-blue-700">↔</span><Node title="Switch" detail="lokale Verbindung" /><span className="hidden sm:block" /><span aria-hidden="true" className="hidden font-bold text-blue-700 sm:block">↙ ↘</span><span className="hidden sm:block" /><Node title="PC B" detail="192.168.10.60/24" /><span aria-hidden="true" className="font-bold text-blue-700">·</span><Node title="Gateway" detail="192.168.10.1" /></div><dl className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-blue-200 bg-white p-4"><dt className="font-bold">A ↔ B</dt><dd className="mt-1 text-sm">Gleiches <code>/24</code>: gewöhnliche Kommunikation bleibt lokal.</dd></div><div className="rounded-xl border border-blue-200 bg-white p-4"><dt className="font-bold">A → entferntes Netz</dt><dd className="mt-1 text-sm">Der Host nutzt eine passende Route, häufig über das Default Gateway.</dd></div></dl><p className="mt-4 text-sm leading-6">Ein Switch versteht nicht automatisch die IP-Subnetzlogik des Hosts. Linkstatus allein beweist keine funktionierende Layer-3-Kommunikation.</p></figure>;
}

export function RoutingDecisionVisualization() {
  return <figure className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7"><figcaption className="text-xl font-bold text-slate-950">Route zu einem entfernten Ziel</figcaption><ol className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-center">{[["PC", "192.168.10.50/24"], ["Gateway", "192.168.10.1"], ["Router / Netz", "weiterer Pfad"], ["Server", "192.168.20.20/24"]].map(([title, detail], index) => <li key={title} className="contents"><Node title={title} detail={detail} />{index < 3 && <span aria-hidden="true" className="py-1 text-center font-bold text-blue-700">→</span>}</li>)}</ol><p className="mt-4 text-sm leading-6">Der Client erkennt das entfernte Präfix, wählt eine passende Route und sendet zum Next Hop. Hin- und Rückweg können verschieden sein; beide müssen für die Kommunikation funktionieren.</p></figure>;
}

export function RouteTableOverview() {
  const routes = [["192.168.10.0/24", "on-link"], ["192.168.20.0/24", "192.168.10.254"], ["0.0.0.0/0", "192.168.10.1"]] as const;
  return <figure><figcaption className="text-xl font-bold text-slate-950">Beispiel-Routingtabelle</figcaption><div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-[32rem] w-full border-collapse text-left text-sm"><thead><tr><th className="bg-slate-100 p-3">Zielpräfix</th><th className="bg-slate-100 p-3">Next Hop</th><th className="bg-slate-100 p-3">Beispielziel</th></tr></thead><tbody>{routes.map(([prefix, nextHop], index) => <tr key={prefix}><th className="border-t border-slate-200 p-3"><code>{prefix}</code></th><td className="border-t border-slate-200 p-3"><code>{nextHop}</code></td><td className="border-t border-slate-200 p-3"><code>{["192.168.10.80", "192.168.20.40", "203.0.113.10"][index]}</code></td></tr>)}</tbody></table></div><p className="mt-3 text-sm leading-6">Das spezifischste passende Präfix gewinnt: lokal <code>/24</code>, entferntes <code>/24</code>, sonst die am wenigsten spezifische Default Route.</p></figure>;
}

export function DhcpDnsComparison() {
  const dhcpValues = ["IPv4-Adresse", "Maske / Präfix", "Gateway", "DNS-Server-Adressen", "weitere Optionen"];
  return <figure className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7"><figcaption className="text-xl font-bold text-slate-950">DHCP und DNS: verbunden, aber getrennt</figcaption><div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center"><section className="min-w-0 rounded-xl border border-blue-200 bg-white p-5"><h3 className="font-bold text-blue-950">DHCP</h3><p className="mt-2 text-sm">Wie bekommt der Client seine Netzwerkkonfiguration?</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{dhcpValues.map((value) => <li key={value}>{value}</li>)}</ul></section><div className="text-center text-sm font-bold text-blue-700"><span className="block lg:hidden" aria-hidden="true">↓</span><span className="hidden lg:block" aria-hidden="true">→</span><span className="mx-auto block max-w-40">nennt den zu verwendenden Resolver</span><span className="block lg:hidden" aria-hidden="true">↓</span><span className="hidden lg:block" aria-hidden="true">→</span></div><section className="min-w-0 rounded-xl border border-emerald-200 bg-white p-5"><h3 className="font-bold text-emerald-950">DNS</h3><p className="mt-2 text-sm">Wie wird ein Name aufgelöst oder ein Dienst gefunden?</p><p className="mt-3 text-sm">DNS liefert namensbezogene Records und Antworten.</p></section></div><p className="mt-4 text-sm leading-6"><strong>Trennung:</strong> DHCP kann dem Client sagen, welchen DNS-Server er verwenden soll. Gewöhnliche DNS-Anfragen beantwortet DHCP nicht selbst.</p></figure>;
}

export function DhcpDnsDiagnosticFlow() {
  const dhcp = ["DHCP oder statisch?", "IP und Präfix plausibel?", "Gateway und DNS plausibel?", "Lease und Umfang?", "Link, VLAN, Relay oder Serverpfad?"];
  const dns = ["IP-Pfad plausibel?", "Welcher Resolver?", "Welcher exakte Name?", "Antwort, NXDOMAIN, SERVFAIL oder Timeout?", "Antwort korrekt, Cache/TTL oder Datenquelle?"];
  return <figure><figcaption className="text-xl font-bold text-slate-950">Zwei Diagnosepfade</figcaption><div className="mt-5 grid gap-5 lg:grid-cols-2"><DiagnosticColumn title="DHCP-Evidenz" steps={dhcp} /><DiagnosticColumn title="DNS-Evidenz" steps={dns} /></div><p className="mt-4 text-sm leading-6">Beide Pfade beginnen mit Beobachtung. Cache leeren, Lease erneuern oder Werte überschreiben sind keine ersten Diagnoseschritte.</p></figure>;
}

export function ServiceLayerPath() {
  const steps = [["Name", "DNS-Fehler"], ["IP", "Zieladresse"], ["Route", "Timeout möglich"], ["TCP/UDP-Endpunkt", "refused oder Timeout"], ["Dienst", "Listener/Prozess"], ["Anwendung/Backend", "HTTP 404/503"]] as const;
  return <figure className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7"><figcaption className="text-xl font-bold text-slate-950">Vom Namen bis zur Anwendung</figcaption><ol className="mx-auto mt-5 grid max-w-2xl gap-2">{steps.map(([title, symptom], index) => <li key={title}>{index > 0 && <div aria-hidden="true" className="pb-2 text-center font-bold text-blue-700">↓</div>}<div className="min-w-0 rounded-xl border border-blue-200 bg-white p-4 text-center"><p className="break-words font-bold text-slate-950">{title}</p><p className="mt-1 break-words text-xs text-blue-800">{symptom}</p></div></li>)}</ol><p className="mt-4 text-sm leading-6">Eine spätere Antwort belegt, dass frühere Schichten ausreichend funktionierten – nicht, dass jede Komponente vollständig gesund ist.</p></figure>;
}

export function ServiceSymptomComparison() {
  const items = [["Namensauflösungsfehler", "Keine erwartete IP-/Namensantwort", "DNS und Resolverpfad"], ["Connection refused", "TCP-Verbindung aktiv abgelehnt", "Endpunkt, Listener, Port oder ablehnende Policy"], ["Timeout", "Keine rechtzeitige erwartete Antwort", "Pfad, Drop, Host, Rückweg oder Auslastung"], ["HTTP-Fehler", "Anwendungsprotokoll antwortet mit Status", "Ressource, Anwendung oder Backend"], ["Erwartete Funktion", "Anwendung verhält sich wie vorgesehen", "Ende-zu-Ende-Test bestanden"]] as const;
  return <figure><figcaption className="text-xl font-bold text-slate-950">Fehlersymptom ist nicht Grundursache</figcaption><div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{items.map(([title, evidence, next]) => <article key={title} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"><h3 className="break-words font-bold text-slate-950">{title}</h3><p className="mt-2 break-words text-sm leading-6">{evidence}</p><p className="mt-3 text-xs font-bold uppercase tracking-wide text-blue-700">Nächster Bereich</p><p className="mt-1 break-words text-sm">{next}</p></article>)}</div></figure>;
}

export function PracticeTopology() {
  return <figure className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7"><figcaption className="text-xl font-bold text-slate-950">Firma.test: gesunder Sollpfad</figcaption><div className="mt-5 grid gap-3 text-center md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center"><Node title="PC01" detail="192.168.10.50/24" /><span aria-hidden="true" className="font-bold text-blue-700">→</span><Node title="Gateway" detail="192.168.10.1" /><span aria-hidden="true" className="font-bold text-blue-700">→</span><Node title="Routerpfad" detail="192.168.10.0/24 ↔ 192.168.20.0/24" /><span aria-hidden="true" className="font-bold text-blue-700">→</span><Node title="Webserver" detail="192.168.20.20 · TCP 80" /></div><div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 text-sm"><strong>DNS/DHCP:</strong> <code>192.168.10.10</code> · <code>portal.firma.test → 192.168.20.20</code></div></figure>;
}

export function PracticeEvidenceMatrix() {
  const rows = [["169.254.x.x", "DHCP / lokale Konfiguration", "DHCP-Server selbst ist nicht als tot bewiesen"], ["NXDOMAIN", "DNS-Namespace / Daten", "Routing ist nicht zwingend gestört"], ["TCP refused", "Endpunkt / Listener / Dienst", "DNS ist nicht zwingend gestört"], ["HTTP 404", "Ressource / Anwendungsrouting", "Host ist nicht unerreichbar"], ["HTTP 503", "Dienst / Anwendung / Backend", "Client-IP ist nicht automatisch falsch"]] as const;
  return <figure><figcaption className="text-xl font-bold text-slate-950">Evidenzmatrix</figcaption><div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[44rem] border-collapse text-left text-sm"><thead><tr>{["Evidenz", "Nächste Schicht", "Noch nicht bewiesen"].map((heading) => <th key={heading} className="bg-slate-100 p-3">{heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell} className="border-t border-slate-200 p-3">{index === 0 ? <code>{cell}</code> : cell}</td>)}</tr>)}</tbody></table></div></figure>;
}

export function FullTroubleshootingDecisionTree() {
  const steps = ["Interface / Link gültig?", "IP und Maske plausibel?", "Lokales Subnetz?", "Gateway und Pfad?", "DHCP-Konfiguration / Quelle?", "DNS-Antwort korrekt?", "Zielport erreichbar?", "Anwendungsantwort?", "Backend / Dienst?", "Dokumentieren"];
  return <figure className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7"><figcaption className="text-xl font-bold text-slate-950">Entscheidungsbaum für den Gesamtpfad</figcaption><ol className="mx-auto mt-5 grid max-w-2xl gap-2">{steps.map((step, index) => <li key={step}>{index > 0 && <div aria-hidden="true" className="pb-2 text-center font-bold text-blue-700">↓</div>}<FlowStep>{step}</FlowStep></li>)}</ol><p className="mt-4 text-sm leading-6">Starke vorhandene Evidenz darf einen gezielten Einstieg an einer späteren Schicht begründen. Der Baum ist ein Denkmodell, kein starres Ritual.</p></figure>;
}

function DiagnosticColumn({ title, steps }: { title: string; steps: readonly string[] }) {
  return <section className="rounded-xl border border-blue-200 bg-slate-50 p-4"><h3 className="font-bold text-blue-950">{title}</h3><ol className="mt-3 space-y-2">{steps.map((step, index) => <li key={step} className="rounded-lg bg-white p-3 text-sm"><strong className="text-blue-700">{index + 1}.</strong> {step}</li>)}</ol></section>;
}

function Node({ title, detail }: { title: string; detail: string }) {
  return <div className="min-w-0 rounded-xl border border-blue-200 bg-white p-4 text-center"><p className="font-bold text-slate-950">{title}</p><code className="mt-1 block break-words text-sm text-blue-900">{detail}</code></div>;
}
