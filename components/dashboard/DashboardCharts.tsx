type ChartPoint = {
  label: string;
  value: number;
};

type DashboardChartsProps = {
  recoveryTrend?: ChartPoint[];
};

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
  recoveryTrend = fallbackRecovery,
}: DashboardChartsProps) {
  return (
    <section>
      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/15 backdrop-blur">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">
          Recovery / Readiness Trend
        </p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-white">
          Safe CSS chart fallback
        </h2>
        <div className="mt-4">
          <Sparkline
            data={recoveryTrend.length ? recoveryTrend : fallbackRecovery}
          />
        </div>
      </div>
    </section>
  );
}
