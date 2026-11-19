export type ProgressTone = "blue" | "teal" | "violet" | "amber" | "emerald";

type ProgressBarProps = { value: number; label: string; tone?: ProgressTone };

const indicatorClassNames: Record<ProgressTone, string> = {
  blue: "bg-blue-600",
  teal: "bg-teal-600",
  violet: "bg-violet-600",
  amber: "bg-amber-600",
  emerald: "bg-emerald-600",
};

export function ProgressBar({ value, label, tone = "blue" }: ProgressBarProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-600">{label}</span><span className="font-bold text-slate-900">{value} %</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${indicatorClassNames[tone]}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
