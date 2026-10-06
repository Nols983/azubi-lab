const configurationValues = ["IPv4-Adresse", "Subnetzmaske / Präfix", "Standardgateway", "DNS-Server"];

export function DhcpConfigurationVisualization() {
  return <figure className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6" aria-labelledby="dhcp-config-caption">
    <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
      <Node title="Client" detail="benötigt Konfiguration" />
      <div className="text-center text-sm font-bold text-blue-900"><span className="block sm:hidden">Anfrage ↓ · Konfiguration ↑</span><span className="hidden sm:block">Anfrage →<br />← Konfiguration</span></div>
      <Node title="DHCP-Server" detail="verwaltet passende Werte" />
    </div>
    <div className="mt-5 rounded-xl border border-blue-200 bg-white p-4">
      <p className="font-bold text-slate-950">Ergebnis am Client</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">{configurationValues.map((value) => <li key={value} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">{value}</li>)}</ul>
    </div>
    <figcaption id="dhcp-config-caption" className="mt-4 text-sm leading-6 text-blue-950">Vereinfachtes Modell: Der Client fragt nach Netzwerkkonfiguration; der DHCP-Server kann passende Werte bereitstellen. Der genaue Nachrichtenaustausch folgt in Lektion 2.</figcaption>
  </figure>;
}

function Node({ title, detail }: { title: string; detail: string }) { return <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm"><p className="font-bold text-slate-950">{title}</p><p className="mt-1 text-sm text-slate-600">{detail}</p></div>; }

const doraSteps = [
  { letter: "D", message: "Discover", direction: "Client → Server(s)", purpose: "DHCP-Server suchen", ports: "UDP 68 → 67", reverse: false },
  { letter: "O", message: "Offer", direction: "Server → Client", purpose: "Konfiguration anbieten", ports: "UDP 67 → 68", reverse: true },
  { letter: "R", message: "Request", direction: "Client → Server(s)", purpose: "Angebot und Server auswählen", ports: "UDP 68 → 67", reverse: false },
  { letter: "A", message: "Acknowledge", direction: "Server → Client", purpose: "Konfiguration bestätigen", ports: "UDP 67 → 68", reverse: true },
] as const;

export function DoraSequence() {
  return <figure className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6" aria-labelledby="dora-caption">
    <div className="flex justify-between text-sm font-bold text-blue-950"><span>Client</span><span>Server</span></div>
    <ol className="mt-4 space-y-3">{doraSteps.map((step) => <li key={step.letter} className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[2.5rem_8rem_minmax(0,1fr)_7rem] sm:items-center">
      <span className="grid size-10 place-items-center rounded-full bg-blue-950 font-bold text-white">{step.letter}</span>
      <span className="font-bold text-slate-950">{step.message}</span>
      <span className="col-start-2 text-sm text-slate-700 sm:col-auto"><strong className="block">{step.direction}</strong>{step.purpose}</span>
      <code className="col-start-2 break-words text-xs font-semibold text-blue-800 sm:col-auto sm:text-right">{step.ports}</code>
    </li>)}</ol>
    <figcaption id="dora-caption" className="mt-4 text-sm leading-6 text-blue-950">Grundlegender initialer IPv4-DHCP-Ablauf. Die ausgeschriebenen Richtungen und Zwecke ergänzen die visuelle Folge; reale Abläufe können weitere Nachrichten oder Wiederholungen enthalten.</figcaption>
  </figure>;
}

const poolSegments = [
  { range: ".0", label: "Netzadresse", style: "bg-slate-200" },
  { range: ".1–.99", label: "außerhalb des Beispiel-Pools", style: "bg-white" },
  { range: ".100–.200", label: "DHCP-Pool", style: "bg-blue-100" },
  { range: ".201–.254", label: "außerhalb des Beispiel-Pools", style: "bg-white" },
  { range: ".255", label: "Broadcast", style: "bg-slate-200" },
] as const;

export function DhcpPoolVisualization() {
  return <figure className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6" aria-labelledby="pool-caption">
    <p className="font-bold text-blue-950"><code>192.168.10.0/24</code></p>
    <ol className="mt-4 grid gap-2 lg:grid-cols-[0.7fr_1.4fr_1.8fr_1.4fr_0.7fr]">{poolSegments.map((segment) => <li key={segment.range} className={`min-w-0 rounded-lg border border-slate-300 p-3 ${segment.style}`}><code className="break-words font-bold text-slate-950">{segment.range}</code><span className="mt-1 block text-xs leading-5 text-slate-700">{segment.label}</span></li>)}</ol>
    <figcaption id="pool-caption" className="mt-4 text-sm leading-6 text-blue-950"><strong>Beispiel eines administrativen Plans:</strong> Nur <code>.100–.200</code> ist hier dynamischer Pool. Diese Aufteilung ist keine Eigenschaft eines <code>/24</code>; Bereiche außerhalb können gemäß Netzdesign anderen geplanten Zwecken dienen.</figcaption>
  </figure>;
}
