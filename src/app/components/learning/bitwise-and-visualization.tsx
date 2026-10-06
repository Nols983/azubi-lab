type AddressRow = {
  label: string;
  operator: string;
  decimal: readonly string[];
  binary: readonly string[];
};

const rows: readonly AddressRow[] = [
  {
    label: "IP-Adresse",
    operator: "",
    decimal: ["192", "168", "10", "25"],
    binary: ["11000000", "10101000", "00001010", "00011001"],
  },
  {
    label: "Subnetzmaske",
    operator: "AND",
    decimal: ["255", "255", "255", "0"],
    binary: ["11111111", "11111111", "11111111", "00000000"],
  },
  {
    label: "Netzadresse",
    operator: "=",
    decimal: ["192", "168", "10", "0"],
    binary: ["11000000", "10101000", "00001010", "00000000"],
  },
];

export function BitwiseAndVisualization() {
  return (
    <figure className="mt-6 rounded-2xl border border-blue-200 bg-slate-50 p-4 sm:p-6">
      <figcaption className="font-bold text-slate-950">IP-Adresse AND Subnetzmaske = Netzadresse</figcaption>
      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <div key={row.label} className={`rounded-xl border bg-white p-4 ${row.label === "Netzadresse" ? "border-blue-300" : "border-slate-200"}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-bold text-slate-950">{row.operator && <span className="mr-2 text-blue-700">{row.operator}</span>}{row.label}</p>
              <code className="text-sm font-bold text-blue-950">{row.decimal.join(".")}</code>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={`${row.label} binär: ${row.binary.join(" Punkt ")}`}>
              {row.binary.map((octet, index) => (
                <div key={`${row.label}-${index}`} className="min-w-0 rounded-lg bg-slate-100 px-1 py-2 text-center">
                  <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Oktett {index + 1}</span>
                  <code className="block text-xs font-bold text-slate-900 sm:text-sm">{octet}</code>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">Die Oktette sind einzeln gruppiert, damit Dezimal- und Binärdarstellung auch auf kleinen Bildschirmen lesbar bleiben.</p>
    </figure>
  );
}
