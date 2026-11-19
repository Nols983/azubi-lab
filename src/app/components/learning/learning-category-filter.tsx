import type { LearningCategory } from "../../data/learning-modules";

export type LearningCategoryFilterValue = "Alle" | LearningCategory;
type Props = { categories: readonly LearningCategoryFilterValue[]; selectedCategory: LearningCategoryFilterValue; onSelect: (category: LearningCategoryFilterValue) => void };

export function LearningCategoryFilter({ categories, selectedCategory, onSelect }: Props) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0" aria-label="Lernmodule nach Kategorie filtern">
      <div className="flex w-max min-w-full gap-2" role="group">
        {categories.map((category) => {
          const isSelected = category === selectedCategory;
          return <button key={category} type="button" aria-pressed={isSelected} onClick={() => onSelect(category)} className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition-[background-color,border-color,color,transform] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 motion-reduce:transform-none motion-reduce:transition-none ${isSelected ? "border-blue-950 bg-blue-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"}`}><span aria-hidden="true" className={`size-1.5 rounded-full ${isSelected ? "bg-blue-200" : "bg-slate-300"}`} />{category}</button>;
        })}
      </div>
    </div>
  );
}
