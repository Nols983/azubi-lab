const devices = [
  { name: "Laptop", address: "192.168.10.25" },
  { name: "Smartphone", address: "192.168.10.30" },
  { name: "Drucker", address: "192.168.10.40" },
] as const;

export function NatNetworkVisualization() {
  return (
    <figure className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <figcaption className="font-bold text-slate-950">Typischer NAT-Kontext im Heim- oder Firmennetz</figcaption>
      <div className="mt-5 grid items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
        <div className="grid gap-2">
          {devices.map((device) => (
            <div key={device.address} className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
              <p className="text-sm font-bold text-slate-950">{device.name}</p>
              <code className="mt-1 block break-all text-sm font-semibold text-blue-900">{device.address}</code>
            </div>
          ))}
        </div>
        <FlowArrow />
        <div className="rounded-xl border-2 border-blue-300 bg-white p-4 text-center">
          <p className="font-bold text-slate-950">Router</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">private LAN-Seite</p>
          <p className="text-sm leading-6 text-slate-600">NAT-Kontext</p>
          <p className="text-sm leading-6 text-slate-600">Provider-/Außenseite</p>
        </div>
        <FlowArrow />
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-center">
          <p className="font-bold text-slate-950">Externes Netzwerk</p>
          <p className="mt-1 text-sm text-slate-600">zum Beispiel das Internet</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">Die Darstellung zeigt eine häufige Architektur. Private Netze können auch anders aufgebaut sein und müssen nicht grundsätzlich NAT verwenden.</p>
    </figure>
  );
}

function FlowArrow() {
  return <div aria-hidden="true" className="flex items-center justify-center font-bold text-blue-700"><span className="md:hidden">↓</span><span className="hidden md:inline">→</span></div>;
}
