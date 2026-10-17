// Flat, oversized charts. Every value passed in is real data; nothing here invents numbers.

export function Stat({ label, value, bg = "bg-paper" }: { label: string; value: string | number; bg?: string }) {
  return (
    <div className={`border-[3px] border-ink p-3 shadow-hardsm ${bg}`}>
      <p className="label">{label}</p>
      <p className="font-mono text-4xl font-extrabold leading-none sm:text-5xl">{value}</p>
    </div>
  );
}

/** Vertical bars, 0-100. Bars under `warnBelow` turn red. */
export function BarChart({ data, warnBelow = 50, unit = "%" }: {
  data: { label: string; value: number }[]; warnBelow?: number; unit?: string;
}) {
  return (
    <div role="img" aria-label={data.map((d) => `${d.label}: ${d.value}${unit}`).join(", ")}>
      <div className="flex h-44 items-end gap-1 border-b-[3px] border-l-[3px] border-ink px-1">
        {data.map((d, i) => (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <span className="mb-1 text-center font-mono text-[10px] font-bold">{d.value}</span>
            <div className={`border-[3px] border-b-0 border-ink ${d.value < warnBelow ? "bg-wrong" : "bg-lime"}`}
              style={{ height: `${Math.max(2, d.value)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1 px-1">
        {data.map((d, i) => (
          <span key={i} className="min-w-0 flex-1 truncate text-center font-mono text-[10px] font-bold">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal ranked bars, sorted by caller. */
export function HBars({ data }: { data: { label: string; pct: number; note?: string }[] }) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex justify-between gap-2 font-mono text-sm font-bold">
            <span className="truncate">{d.label.toUpperCase()}{d.pct < 60 && " · WEAK"}</span>
            <span className="shrink-0">{d.note ?? `${d.pct}%`}</span>
          </div>
          <div className="h-6 border-[3px] border-ink bg-paper">
            <div className={`h-full ${d.pct < 60 ? "bg-wrong" : "bg-lime"}`} style={{ width: `${d.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
