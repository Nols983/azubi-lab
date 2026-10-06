type Props = { eyebrow: string; title: string; description: string };

export function PlaceholderPage({ eyebrow, title, description }: Props) {
  return (
    <div className="mx-auto max-w-3xl">
      <header><p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1></header>
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10" aria-labelledby="coming-soon-heading">
        <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl bg-blue-50 text-xl text-blue-800">…</span><h2 id="coming-soon-heading" className="mt-6 text-xl font-bold text-slate-950">Dieser Bereich entsteht als Nächstes.</h2><p className="mt-3 max-w-xl leading-7 text-slate-600">{description}</p><p className="mt-4 text-sm font-medium text-slate-500">Noch keine Daten oder Funktionen – aktuell ist dies eine statische Vorschau.</p>
      </section>
    </div>
  );
}
