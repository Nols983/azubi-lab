import { subnetReferences } from "../../data/subnet-reference";

export type SubnetRange = {
  cidr: string;
  network: string;
  firstHost: string;
  lastHost: string;
  broadcast: string;
  mask?: string;
  label?: string;
  purpose?: string;
};

export function SubnetReferenceVisualization() {
  return (
    <figure className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-6">
      <figcaption className="font-bold text-blue-950">Präfixe von /24 bis /28 im Vergleich</figcaption>
      <p className="mt-2 text-sm leading-6 text-blue-950">Jede Karte zeigt dieselben Größen in derselben Reihenfolge und bleibt auch auf schmalen Bildschirmen lesbar.</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {subnetReferences.map((item) => (
          <div key={item.prefix} className="min-w-0 rounded-xl border border-blue-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><dt className="text-xl font-bold text-blue-950"><code>/{item.prefix}</code></dt><dd><code className="break-all font-semibold">{item.mask}</code></dd></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <ReferenceValue label="Hostbits" value={item.hostBits} />
              <ReferenceValue label="Adressen" value={item.totalAddresses} />
              <ReferenceValue label="Gewöhnliche Hosts" value={item.traditionalHostCount} />
              <ReferenceValue label="Blockgröße" value={item.blockSize} />
            </div>
          </div>
        ))}
      </dl>
    </figure>
  );
}

function ReferenceValue({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-semibold text-slate-600">{label}</dt><dd className="mt-1 font-mono font-bold text-slate-950">{value}</dd></div>;
}

export function SubnetRangeVisualization({ ranges, caption }: { ranges: readonly SubnetRange[]; caption: string }) {
  return (
    <figure className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
      <figcaption className="font-bold text-slate-950">{caption}</figcaption>
      <ol className="mt-4 grid gap-4 md:grid-cols-2">
        {ranges.map((range) => (
          <li key={range.cidr} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="text-sm font-semibold text-slate-500">{range.label ?? "Subnetz"}</span><code className="break-all font-bold text-blue-950">{range.cidr}</code></div>
            <dl className="mt-4 space-y-3 text-sm">
              <RangeRow label="Netz" value={range.network} />
              {range.mask && <RangeRow label="Maske" value={range.mask} />}
              <RangeRow label="Hostbereich" value={`${range.firstHost}–${range.lastHost}`} />
              <RangeRow label="Broadcast" value={range.broadcast} />
              {range.purpose && <RangeRow label="Zweck" value={range.purpose} code={false} />}
            </dl>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function RangeRow({ label, value, code = true }: { label: string; value: string; code?: boolean }) {
  return <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]"><dt className="font-semibold text-slate-600">{label}</dt><dd className="min-w-0 break-words font-semibold text-slate-950">{code ? <code className="break-all">{value}</code> : value}</dd></div>;
}
