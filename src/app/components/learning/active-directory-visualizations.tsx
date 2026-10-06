function Card({ title, detail }: { title: string; detail: string }) {
  return <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-center"><strong className="block text-slate-950">{title}</strong><span className="mt-1 block break-words text-sm leading-6">{detail}</span></div>;
}

function Arrow({ label = "danach" }: { label?: string }) {
  return <li aria-label={label} className="text-center font-bold text-blue-700" aria-hidden="true">↓</li>;
}

export function ActiveDirectoryPurposeFlow() {
  return <figure><figcaption className="text-2xl font-bold text-slate-950">Vom Anmelden zum erlaubten Zugriff</figcaption><p className="mt-3">Der Ablauf trennt die Prüfung der Identität von der Entscheidung über konkrete Ressourcenrechte.</p><ol className="mx-auto mt-5 grid max-w-2xl gap-2"><li><Card title="Benutzer" detail="gibt Domänen-Anmeldedaten an" /></li><Arrow label="sendet Domänen-Anmeldedaten" /><li><Card title="Domain Controller / AD DS" detail="authentifiziert die Domänenidentität" /></li><Arrow label="liefert authentifizierte Identität und Sicherheitskontext" /><li><Card title="Sicherheitskontext" detail="enthält unter anderem Identität und Gruppen" /></li><Arrow label="wird an einer Ressource ausgewertet" /><li><Card title="Autorisierte Ressourcen" detail="zum Beispiel eine erlaubte Dateifreigabe" /></li></ol><div className="mt-5 grid gap-3 sm:grid-cols-3"><Card title="Benutzerobjekt" detail="Identität einer Person oder eines Dienstkontos" /><Card title="Computerobjekt" detail="Identität eines Domänencomputers" /><Card title="Gruppenobjekt" detail="fasst Mitgliedschaften für Rollen oder Ressourcen zusammen" /></div></figure>;
}

export function LocalDomainComparison() {
  return <figure><figcaption className="text-2xl font-bold text-slate-950">Lokale Konten und Domänenidentitäten</figcaption><div className="mt-5 grid gap-4 md:grid-cols-2"><section className="rounded-xl border border-slate-200 p-4"><h3 className="font-bold text-slate-950">Arbeitsgruppe / nur lokal</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><Card title="PC01" detail="lokales Konto PC01\\Anna" /><Card title="PC02" detail="separates lokales Konto PC02\\Anna" /></div><p className="mt-3 text-sm">Gleicher Anzeigename bedeutet nicht dieselbe Sicherheitsidentität.</p></section><section className="rounded-xl border border-blue-200 bg-blue-50 p-4"><h3 className="font-bold text-slate-950">Domänenumgebung</h3><Card title="AD-Domäne firma.test" detail="Domänenkonto FIRMA\\Anna beziehungsweise Anna@firma.test" /><ul className="mt-3 grid gap-2 text-center text-sm sm:grid-cols-3"><li className="rounded-lg bg-white p-3">PC01</li><li className="rounded-lg bg-white p-3">PC02</li><li className="rounded-lg bg-white p-3">Fileserver</li></ul><p className="mt-3 text-sm">Die Systeme nehmen an der Domänenumgebung teil; lokale Konten und Einstellungen verschwinden dadurch nicht.</p></section></div></figure>;
}

export function AdHierarchyVisualization() {
  return <figure><figcaption className="text-2xl font-bold text-slate-950">Logische AD-Hierarchie</figcaption><ol className="mx-auto mt-5 grid max-w-2xl gap-2"><li><Card title="Forest" detail="firma.test – oberste AD-DS-Struktur" /></li><Arrow label="enthält" /><li><Card title="Domäne" detail="firma.test – logischer Verzeichnis- und Verwaltungsbereich" /></li><Arrow label="enthält" /><li className="grid gap-3 sm:grid-cols-2"><Card title="OU Benutzer" detail="zum Beispiel Verwaltung und Support" /><Card title="OU Computer" detail="zum Beispiel Clients und Server" /></li><Arrow label="enthält" /><li className="grid gap-3 sm:grid-cols-2"><Card title="Benutzerobjekt" detail="Anna" /><Card title="Computerobjekt" detail="PC01" /></li></ol><p className="mt-4 text-sm">OUs können weitere OUs enthalten. Die Darstellung ist ein Beispiel, keine universelle Vorlage.</p></figure>;
}

export function LogicalNetworkComparison() {
  return <figure><figcaption className="text-2xl font-bold text-slate-950">Eine Domäne, verschiedene IP-Subnetze</figcaption><div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4"><h3 className="text-center font-bold text-slate-950">AD-Domäne: <code>firma.test</code></h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><Card title="PC01" detail="192.168.10.25 – Subnetz 192.168.10.0/24" /><Card title="PC02" detail="192.168.20.25 – Subnetz 192.168.20.0/24" /></div></div><p className="mt-3">Beide Computer können zur selben AD-Domäne gehören. Subnetze beschreiben IP-Netze; Domänen und OUs beschreiben die logische Verzeichnisstruktur.</p></figure>;
}

export function AdObjectOverview() {
  const items = [["Benutzer", "Personen- oder dienstähnliche Identität"], ["Computer", "Sicherheitsidentität eines Domänencomputers"], ["Security Group", "Mitgliedschaft für Autorisierung"], ["Distribution Group", "Verteilung beziehungsweise Messaging, nicht ACL-Autorisierung"], ["OU", "Organisatorischer Container, keine Berechtigungsgruppe"]] as const;
  return <figure><figcaption className="text-2xl font-bold text-slate-950">Objekttypen im Überblick</figcaption><dl className="mt-5 grid gap-3 sm:grid-cols-2">{items.map(([term, detail]) => <div key={term} className="rounded-xl border border-slate-200 bg-white p-4"><dt className="font-bold text-slate-950">{term}</dt><dd className="mt-1 text-sm leading-6">{detail}</dd></div>)}</dl></figure>;
}

export function AgdlpVisualization() {
  const stages = [["Accounts", "Anna, Ben"], ["Global role group", "GG_Support"], ["Domain Local resource group", "DL_Files_Support_Modify"], ["Permission", "Ändern auf \\\\fileserver\\support"]] as const;
  return <figure><figcaption className="text-2xl font-bold text-slate-950">AGDLP: Rollen und Ressourcen trennen</figcaption><ol className="mx-auto mt-5 grid max-w-2xl gap-2">{stages.map(([label, value], index) => <li key={label}>{index > 0 && <div aria-hidden="true" className="pb-2 text-center font-bold text-blue-700">↓</div>}<div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-center"><span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><code className="mt-1 block break-words font-bold text-slate-950">{value}</code></div></li>)}</ol><p className="mt-4 text-sm"><strong>AGDLP</strong> bedeutet Accounts → Global Groups → Domain Local Groups → Permissions. Es ist ein bewährtes Entwurfsmuster, keine Protokollpflicht.</p></figure>;
}

function Flow({ title, steps, description }: { title: string; steps: readonly string[]; description: string }) {
  return <figure className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7"><figcaption className="text-xl font-bold text-slate-950">{title}</figcaption><ol className="mt-5 grid gap-2">{steps.map((step, index) => <li key={step}>{index > 0 && <div aria-hidden="true" className="pb-2 text-center font-bold text-blue-700">↓</div>}<div className="min-w-0 rounded-xl border border-blue-100 bg-white p-4 text-center font-semibold text-slate-900"><span className="break-words">{step}</span></div></li>)}</ol><p className="mt-4 text-sm leading-6 text-slate-600">{description}</p></figure>;
}

export function DomainServiceLocationFlow() {
  return <Flow title="Dienstsuche: DNS findet, der DC authentifiziert" steps={["Domänenclient", "DNS-Anfrage nach AD-Dienst", "SRV-Antwort", "Domain-Controller-Kandidat", "Authentifizierungs- oder Verzeichnisdienst"]} description="DNS liefert Dienstsuchinformationen. Die Authentifizierung selbst übernimmt der passende AD-Dienst auf dem Domain Controller." />;
}

export function AdReplicationOverview() {
  return <figure className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><figcaption className="text-xl font-bold text-slate-950">Zwei Sites, eine Domäne</figcaption><div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><Node title="Site-A · DC01" detail="192.168.10.0/24" /><span aria-hidden="true" className="text-center text-2xl font-bold text-blue-700">↔</span><Node title="Site-B · DC02" detail="192.168.20.0/24" /></div><p className="mt-4 text-sm leading-6">Beide beschreibbaren DCs dienen <code>firma.test</code>. Verzeichnisänderungen werden repliziert und konvergieren schließlich; sie müssen nicht überall im exakt selben Moment sichtbar sein.</p></figure>;
}

export function GroupPolicyHierarchy() {
  return <figure className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7"><figcaption className="text-xl font-bold text-slate-950">GPO-Verarbeitung entlang der Struktur</figcaption><div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.4fr]"><dl className="grid gap-3"><Node title="Domain Baseline" detail="Link an firma.test" /><Node title="Client Policy" detail="Link an OU Clients" /></dl><ol className="grid gap-2">{["Domain firma.test", "OU Computer", "OU Clients", "PC01"].map((item, index) => <li key={item}>{index > 0 && <div aria-hidden="true" className="pb-2 text-center font-bold text-blue-700">↓</div>}<div className="rounded-xl border border-slate-200 bg-white p-3 text-center font-semibold">{item}</div></li>)}</ol></div><p className="mt-4 text-sm leading-6">PC01 kann anwendbare geerbte Domain-Einstellungen und die Client Policy erhalten. Security Filtering und weitere Verarbeitungsregeln können den tatsächlichen Umfang verändern.</p></figure>;
}

export function AdTroubleshootingFlow() {
  return <Flow title="Evidenzbasierter Diagnosepfad" steps={["Fehlerbild präzisieren · lokal oder Domäne?", "IP-Konfiguration und DNS-Resolver", "AD-DNS und DC-Dienstsuche", "Netzpfad und Systemzeit", "Kontostatus und Anmeldedaten", "Gruppen, Autorisierung und GPO", "DC, Sitzung, Zeitpunkt und Replikation"]} description="Erst Beobachtungen sammeln und korrelieren. Neustart, Domain-Rejoin oder erzwungene Aktualisierungen sind keine normalen ersten Schritte." />;
}

export function AdPracticeDesignOverview() {
  return <figure className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><figcaption className="text-xl font-bold text-slate-950">Einfacher, begründbarer Entwurf</figcaption><div className="mt-5 grid gap-4 md:grid-cols-2"><Node title="Forest und Domain" detail="1 Forest · firma.test" /><Node title="DC und DNS" detail="DC01 · DC02 · geeignete interne DNS-Dienste" /><Node title="Sites" detail="Site-A: 192.168.10.0/24 · Site-B: 192.168.20.0/24" /><Node title="AGDLP" detail="Konten → Rollengruppe → Ressourcengruppe → Modify" /></div><p className="mt-4 text-sm leading-6">Zwei Subnetze und zwei Sites bleiben Teil derselben Domäne. OU-, Gruppen- und Site-Design erfüllen unterschiedliche Aufgaben.</p></figure>;
}

function Node({ title, detail }: { title: string; detail: string }) {
  return <div className="min-w-0 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="font-bold text-blue-950">{title}</p><p className="mt-1 break-words text-sm leading-6 text-slate-700">{detail}</p></div>;
}
