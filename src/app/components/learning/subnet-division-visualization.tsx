const subnets = [
  ["Subnetz A", "192.168.10.0/26"],
  ["Subnetz B", "192.168.10.64/26"],
  ["Subnetz C", "192.168.10.128/26"],
  ["Subnetz D", "192.168.10.192/26"],
] as const;

export function SubnetDivisionVisualization() {
  return (
    <figure className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-6">
      <figcaption className="font-bold text-blue-950">Vorschau: Ein Netz wird zu vier kleineren Netzen</figcaption>
      <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4 text-center">
        <span className="block text-sm font-semibold text-slate-600">Größerer Adressblock</span>
        <code className="mt-1 block break-all text-lg font-bold text-blue-950">192.168.10.0/24</code>
      </div>
      <p aria-hidden="true" className="py-3 text-center text-2xl font-bold text-blue-700">↓</p>
      <ol className="grid gap-3 sm:grid-cols-2">
        {subnets.map(([name, address]) => (
          <li key={name} className="min-w-0 rounded-xl border border-blue-200 bg-white p-4">
            <span className="block text-sm font-semibold text-slate-600">{name}</span>
            <code className="mt-1 block break-all font-bold text-blue-950">{address}</code>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm leading-6 text-blue-950">Wie diese Grenzen berechnet werden, lernst du in den nächsten Lektionen.</p>
    </figure>
  );
}

export function NetworkSegmentationComparison() {
  return (
    <figure className="mt-6 grid gap-4 lg:grid-cols-2">
      <figcaption className="sr-only">Konzeptioneller Vergleich einer größeren Netzstruktur mit mehreren gerouteten Netzen</figcaption>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-500">Vorher · ein größeres logisches Netz</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {["Clients", "Server", "Gastgeräte"].map((label) => <div key={label} className="rounded-lg bg-slate-100 p-3 text-center font-semibold text-slate-800">{label}</div>)}
        </div>
      </div>
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <p className="text-sm font-semibold text-blue-800">Danach · mögliche geroutete Struktur</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {["Clients-Subnetz", "Server-Subnetz", "Gäste-Subnetz"].map((label) => <div key={label} className="rounded-lg border border-blue-200 bg-white p-3 text-center font-semibold text-blue-950">{label}</div>)}
        </div>
        <div className="mt-3 rounded-lg bg-blue-950 p-3 text-center text-sm font-bold text-white">Router / Layer-3-Gerät</div>
      </div>
    </figure>
  );
}
