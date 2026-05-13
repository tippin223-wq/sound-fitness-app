type ChartPoint = {
  label: string;
  value: number;
  target?: number;
};

type DashboardChartsProps = {
  trainingVolume?: ChartPoint[];
  nutritionConsistency?: ChartPoint[];
  recoveryTrend?: ChartPoint[];
  goalProgressPercent?: number;
};

const fallbackVolume: ChartPoint[] = [
  { label: "Mon", value: 12, target: 18 },
  { label: "Tue", value: 8, target: 18 },
  { label: "Wed", value: 18, target: 18 },
  { label: "Thu", value: 6, target: 18 },
  { label: "Fri", value: 15, target: 18 },
  { label: "Sat", value: 10, target: 18 },
  { label: "Sun", value: 4, target: 18 },
];

const fallbackNutrition: ChartPoint[] = [
  { label: "Protein", value: 78, target: 100 },
  { label: "Hydration", value: 64, target: 100 },
  { label: "Meals", value: 82, target: 100 },
];

const fallbackRecovery: ChartPoint[] = [
  { label: "Mon", value: 72 },
  { label: "Tue", value: 68 },
  { label: "Wed", value: 75 },
  { label: "Thu", value: 61 },
  { label: "Fri", value: 79 },
  { label: "Sat", value: 84 },
  { label: "Sun", value: 76 },
];

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(Math.max(Number.isFinite(value) ? value : 0, min), max);

function BarSeries({ data }: { data: ChartPoint[] }) {
  const max = Math.max(...data.map((point) => point.target || point.value), 1);

  return (
    <div className="flex h-48 items-end gap-2 rounded-3xl border border-white/10 bg-slate-950/55 p-4">
      {data.map((point) => {
        const height = clamp((point.value / max) * 100, 6, 100);
        return (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end rounded-full bg-white/[0.04]">
              <div
                className="w-full rounded-full bg-gradient-to-t from-cyan-400 to-amber-300 shadow-[0_0_20px_rgba(34,211,238,0.18)]"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              {point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ProgressRows({ data }: { data: ChartPoint[] }) {
  return (
    <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/55 p-4">
      {data.map((point) => {
        const percent = clamp((point.value / (point.target || 100)) * 100);
        return (
          <div key={point.label}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-black uppercase tracking-[0.16em] text-slate-400">
                {point.label}
              </span>
              <span className="font-black text-white">{Math.round(percent)}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Sparkline({ data }: { data: ChartPoint[] }) {
  const values = data.map((point) => clamp(point.value));
  const polyline = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - value;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
      <svg viewBox="0 0 100 100" role="img" aria-label="Recovery readiness trend" className="h-48 w-full">
        <defs>
          <linearGradient id="dashboard-recovery-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <polyline
          points={polyline}
          fill="none"
          stroke="url(#dashboard-recovery-gradient)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
      </svg>
    </div>
  );
}

export default function DashboardCharts({
  trainingVolume = fallbackVolume,
  nutritionConsistency = fallbackNutrition,
  recoveryTrend = fallbackRecovery,
  goalProgressPercent = 42,
}: DashboardChartsProps) {
  const progress = clamp(goalProgressPercent);

  return (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/15 backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
              Weekly Training Volume
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Load, consistency, and goal progress
            </h2>
          </div>
          <div className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100">
            {Math.round(progress)}% goal progress
          </div>
        </div>

        <div className="mt-5">
          <BarSeries data={trainingVolume.length ? trainingVolume : fallbackVolume} />
        </div>
      </div>

      <div className="grid gap-5">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/15 backdrop-blur">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
            Nutrition Consistency
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-white">
            Fuel behaviors
          </h2>
          <div className="mt-4">
            <ProgressRows data={nutritionConsistency.length ? nutritionConsistency : fallbackNutrition} />
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/15 backdrop-blur">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">
            Recovery / Readiness Trend
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-white">
            Safe CSS chart fallback
          </h2>
          <div className="mt-4">
            <Sparkline data={recoveryTrend.length ? recoveryTrend : fallbackRecovery} />
          </div>
        </div>
      </div>
    </section>
  );
}
