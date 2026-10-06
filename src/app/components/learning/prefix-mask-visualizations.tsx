const maskOctets = [
  { decimal: 0, binary: "00000000", networkBits: 0 },
  { decimal: 128, binary: "10000000", networkBits: 1 },
  { decimal: 192, binary: "11000000", networkBits: 2 },
  { decimal: 224, binary: "11100000", networkBits: 3 },
  { decimal: 240, binary: "11110000", networkBits: 4 },
  { decimal: 248, binary: "11111000", networkBits: 5 },
  { decimal: 252, binary: "11111100", networkBits: 6 },
  { decimal: 254, binary: "11111110", networkBits: 7 },
  { decimal: 255, binary: "11111111", networkBits: 8 },
] as const;

const commonPrefixes = [
  { prefix: 8, mask: "255.0.0.0" },
  { prefix: 16, mask: "255.255.0.0" },
  { prefix: 24, mask: "255.255.255.0" },
  { prefix: 25, mask: "255.255.255.128" },
  { prefix: 26, mask: "255.255.255.192" },
  { prefix: 27, mask: "255.255.255.224" },
  { prefix: 28, mask: "255.255.255.240" },
] as const;

export function PrefixBitVisualization() {
  return (
    <figure className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <figcaption className="font-bold text-slate-950">32 Bit in Netz- und Hostbits aufteilen</figcaption>
      <p className="mt-2 text-sm leading-6 text-slate-600"><strong>N</strong> steht für Netzbit, <strong>H</strong> für Hostbit. Die Zeichen sind in vier Oktette mit je 8 Bit gruppiert.</p>
      <div className="mt-5 space-y-5">
        <BitExample prefix="/24" networkBits={24} hostBits={8} octets={["NNNNNNNN", "NNNNNNNN", "NNNNNNNN", "HHHHHHHH"]} />
        <BitExample prefix="/26" networkBits={26} hostBits={6} octets={["NNNNNNNN", "NNNNNNNN", "NNNNNNNN", "NNHHHHHH"]} />
      </div>
    </figure>
  );
}

function BitExample({ prefix, networkBits, hostBits, octets }: { prefix: string; networkBits: number; hostBits: number; octets: readonly string[] }) {
  return <div><div className="flex flex-wrap items-baseline justify-between gap-2"><code className="font-bold text-blue-950">{prefix}</code><span className="text-sm"><strong>{networkBits}</strong> Netzbits · <strong>{hostBits}</strong> Hostbits</span></div><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={`${prefix}: ${networkBits} Netzbits und ${hostBits} Hostbits`}>{octets.map((octet, index) => <code key={`${prefix}-${index}`} className="rounded-lg border border-blue-200 bg-blue-50 px-1 py-3 text-center text-xs font-bold tracking-wider text-blue-950 sm:text-sm">{octet}</code>)}</div></div>;
}

export function ValidMaskOctetOverview() {
  return (
    <figure className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-6">
      <figcaption className="font-bold text-blue-950">Gültige Werte am Übergang im Oktett</figcaption>
      <p className="mt-2 text-sm leading-6 text-blue-950">Von links kommen zusammenhängende 1-Bits, danach nur noch 0-Bits.</p>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {maskOctets.map((item) => <div key={item.decimal} className="grid grid-cols-[3.5rem_1fr] items-center gap-x-3 rounded-xl border border-blue-200 bg-white p-3"><dt className="row-span-2 text-xl font-bold text-blue-950">{item.decimal}</dt><dd><code className="font-bold text-slate-950">{item.binary}</code></dd><dd className="text-xs leading-5 text-slate-600">{item.networkBits} {item.networkBits === 1 ? "Netzbit" : "Netzbits"} in diesem Oktett</dd></div>)}
      </dl>
    </figure>
  );
}

export function PrefixMaskComparison() {
  return (
    <figure className="mt-6">
      <figcaption className="font-bold text-slate-950">Häufige Präfixe im Vergleich</figcaption>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {commonPrefixes.map(({ prefix, mask }) => <div key={prefix} className="grid grid-cols-[4rem_1fr] gap-x-3 rounded-xl border border-slate-200 bg-white p-4"><code className="row-span-2 text-xl font-bold text-blue-950">/{prefix}</code><code className="break-all font-semibold text-slate-950">{mask}</code><p className="mt-1 text-sm text-slate-600">{prefix} Netzbits · {32 - prefix} Hostbits</p></div>)}
      </div>
    </figure>
  );
}
