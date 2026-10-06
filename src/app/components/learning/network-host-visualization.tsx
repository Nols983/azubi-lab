type Portion = "network" | "host";

type Props = {
  addressOctets: readonly [string, string, string, string];
  maskOctets: readonly [string, string, string, string];
  portions: readonly [Portion, Portion, Portion, Portion];
  prefixLength?: number;
};

const portionPresentation = {
  network: { label: "Netzanteil", className: "border-blue-200 bg-blue-50 text-blue-950" },
  host: { label: "Hostanteil", className: "border-amber-300 bg-amber-50 text-amber-950" },
} as const;

export function NetworkHostVisualization({ addressOctets, maskOctets, portions, prefixLength }: Props) {
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <figcaption className="font-bold text-slate-950">IPv4-Adresse und Subnetzmaske im Vergleich</figcaption>
      <div className="mt-5 space-y-3">
        <OctetRow label="IP-Adresse" octets={addressOctets} portions={portions} emphasize />
        <OctetRow label="Subnetzmaske" octets={maskOctets} portions={portions} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-bold sm:text-sm">
        {portions.map((portion, index) => {
          const presentation = portionPresentation[portion];
          return <span key={`${portion}-${index}`} className={`rounded-lg border px-1 py-2 ${presentation.className}`}>{presentation.label}</span>;
        })}
      </div>
      {prefixLength !== undefined && <p className="mt-4 text-sm text-slate-600">Präfixlänge: <code className="font-bold text-slate-950">/{prefixLength}</code></p>}
    </figure>
  );
}

function OctetRow({ label, octets, portions, emphasize = false }: { label: string; octets: readonly string[]; portions: readonly Portion[]; emphasize?: boolean }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="grid grid-cols-4 gap-2 font-mono text-center">
        {octets.map((octet, index) => <code key={`${label}-${index}`} className={`min-w-0 rounded-lg border px-1 py-3 ${portionPresentation[portions[index]].className} ${emphasize ? "text-lg font-bold sm:text-2xl" : "text-sm font-semibold sm:text-lg"}`}>{octet}</code>)}
      </div>
    </div>
  );
}
