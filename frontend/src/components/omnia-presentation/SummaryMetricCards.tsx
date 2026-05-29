export interface MetricItem {
  label: string;
  value: string;
  tone?: "default" | "blue" | "green" | "red" | "amber";
}

const TONE: Record<NonNullable<MetricItem["tone"]>, string> = {
  default: "border-slate-200 bg-white text-slate-900",
  blue: "border-blue-200 bg-blue-50 text-blue-900",
  green: "border-emerald-200 bg-emerald-50 text-emerald-900",
  red: "border-rose-200 bg-rose-50 text-rose-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
};

export function SummaryMetricCards({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className={`rounded-xl border px-3 py-2.5 ${TONE[item.tone ?? "default"]}`}>
          <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">{item.label}</p>
          <p className="mt-1 text-lg font-semibold leading-tight">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
