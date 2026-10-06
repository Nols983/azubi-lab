export function LearningObjectives({ objectives, title = "Lernziele", context = "module" }: { objectives: readonly string[]; title?: string; context?: "lesson" | "module" }) {
  return (
    <section aria-labelledby="learning-objectives-heading">
      <h2 id="learning-objectives-heading" className="text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-3 leading-7 text-slate-600">Nach Abschluss {context === "lesson" ? "dieser Lektion" : "des Moduls"} kannst du:</p>
      <ul className="mt-4 space-y-3">
        {objectives.map((objective) => (
          <li key={objective} className="flex gap-3 leading-7 text-slate-700"><span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-blue-600" />{objective}</li>
        ))}
      </ul>
    </section>
  );
}
