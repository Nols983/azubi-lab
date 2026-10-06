export type Ipv4Range = {
  name: string;
  cidr: string;
  firstAddress: string;
  lastAddress: string;
  pattern: string;
};

export function Ipv4RangeOverview({ ranges }: { ranges: readonly Ipv4Range[] }) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3" aria-label="Die drei privaten IPv4-Adressbereiche nach RFC1918">
      {ranges.map((range) => (
        <article key={range.cidr} className="min-w-0 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">{range.name}</p>
          <h3 className="mt-1 text-xl font-bold text-slate-950"><code>{range.cidr}</code></h3>
          <dl className="mt-4 space-y-3 text-sm leading-6">
            <div><dt className="font-semibold text-slate-500">Erste Adresse</dt><dd><code className="break-all font-bold text-slate-900">{range.firstAddress}</code></dd></div>
            <div><dt className="font-semibold text-slate-500">Letzte Adresse</dt><dd><code className="break-all font-bold text-slate-900">{range.lastAddress}</code></dd></div>
            <div><dt className="font-semibold text-slate-500">Erkennbares Muster</dt><dd className="text-slate-700">{range.pattern}</dd></div>
          </dl>
        </article>
      ))}
    </div>
  );
}
