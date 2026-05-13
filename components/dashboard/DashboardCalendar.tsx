export type DashboardCalendarItem = {
  dateLabel: string;
  title: string;
  type: "training" | "recovery" | "nutrition" | "completed";
  status?: string;
};

type DashboardCalendarProps = {
  items?: DashboardCalendarItem[];
};

const fallbackItems: DashboardCalendarItem[] = [
  { dateLabel: "Mon", title: "Full Body Strength", type: "completed", status: "Done" },
  { dateLabel: "Tue", title: "Protein prep", type: "nutrition", status: "Plan" },
  { dateLabel: "Wed", title: "Upper / Pull", type: "training", status: "Planned" },
  { dateLabel: "Thu", title: "Mobility reset", type: "recovery", status: "Recovery" },
  { dateLabel: "Fri", title: "Lower Body", type: "training", status: "Planned" },
  { dateLabel: "Sat", title: "Zone 2 walk", type: "recovery", status: "Optional" },
  { dateLabel: "Sun", title: "Reflection", type: "nutrition", status: "Review" },
];

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const typeStyles: Record<DashboardCalendarItem["type"], string> = {
  completed: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  nutrition: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  recovery: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
  training: "border-sky-300/30 bg-sky-300/10 text-sky-100",
};

export default function DashboardCalendar({ items = fallbackItems }: DashboardCalendarProps) {
  const safeItems = items.length ? items : fallbackItems;

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/15 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
            Dashboard Calendar
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
            Training, recovery, and nutrition markers
          </h2>
        </div>
        <div className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-300">
          Safe module
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-7">
        {dayLabels.map((day) => {
          const dayItems = safeItems.filter((item) => item.dateLabel === day);
          return (
            <div
              key={day}
              className="min-h-[148px] rounded-3xl border border-white/10 bg-slate-950/55 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">{day}</span>
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.55)]" />
              </div>
              <div className="mt-3 space-y-2">
                {dayItems.map((item) => (
                  <div
                    key={`${item.dateLabel}-${item.title}`}
                    className={`rounded-2xl border px-3 py-2 ${typeStyles[item.type]}`}
                  >
                    <div className="text-xs font-black leading-tight">{item.title}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
                      {item.status || item.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
