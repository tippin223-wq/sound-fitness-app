import { Star } from "lucide-react";
import type { TrainingConstellationSession } from "@/lib/training-constellation";

type Props = {
  sessions: TrainingConstellationSession[];
  color: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEmptySelect?: () => void;
  compact?: boolean;
  emptyLabel?: string;
  emptyTooltip?: string;
  isToday?: boolean;
  tooltipOnly?: boolean;
};

export default function TrainingConstellationSessionCell({
  sessions, color, selectedId, onSelect, onEmptySelect, compact = false, emptyLabel = "Schedule this open constellation spot", emptyTooltip = "Schedule", isToday = false, tooltipOnly = false,
}: Props) {
  return (
    <div className={`relative z-10 flex min-w-0 flex-col justify-center gap-1 border-r border-white/[0.045] py-1 last:border-r-0 ${compact ? "px-0.5" : "px-1"} ${tooltipOnly ? "overflow-visible" : ""} ${isToday ? "bg-emerald-300/[0.045] shadow-[inset_1px_0_0_rgba(110,231,183,0.16),inset_-1px_0_0_rgba(110,231,183,0.16)]" : ""}`}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-px opacity-40" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {sessions.length ? sessions.map((session) => (
        <button
          aria-label={`Open ${session.title} session details, ${session.fullDate}, ${session.time}, ${session.statusText}`}
          aria-pressed={selectedId === session.id}
          className={`group relative flex w-full min-w-0 flex-col items-center gap-1 rounded-lg py-1.5 text-center transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200 ${compact ? "px-0.5" : "px-1"} ${selectedId === session.id ? "bg-white/[0.06]" : ""}`}
          key={session.id}
          onClick={() => onSelect(session.id)}
          type="button"
        >
          <span
            aria-hidden="true"
            className={`grid shrink-0 place-items-center rounded-full border-2 bg-slate-950 ring-[3px] ring-slate-950/90 ${compact ? "h-6 w-6" : "h-7 w-7"}`}
            style={{ borderColor: color, borderStyle: session.status === "complete" ? "solid" : "dashed", boxShadow: `0 0 ${selectedId === session.id ? 16 : 7}px ${color}` }}
          >
            <Star className="h-3.5 w-3.5 fill-current" style={{ color }} />
          </span>
          {tooltipOnly ? null : (
            <>
              <span className={`relative isolate w-full break-words px-1 text-[10px] font-black leading-[1.08] text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)] [overflow-wrap:anywhere] [text-shadow:0_1px_2px_rgba(0,0,0,1),0_0_8px_rgba(15,23,42,0.95)] before:absolute before:-inset-x-1 before:-inset-y-0.5 before:-z-10 before:rounded-full before:bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.66)_46%,rgba(15,23,42,0)_76%)] before:blur-[3px] before:content-[''] ${compact ? "line-clamp-2" : ""}`}>{session.title}</span>
              <span className="relative isolate px-1 text-[8.5px] font-black leading-tight text-cyan-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] [text-shadow:0_1px_2px_rgba(0,0,0,1),0_0_7px_rgba(8,47,73,0.9)] before:absolute before:-inset-x-1.5 before:-inset-y-0.5 before:-z-10 before:rounded-full before:bg-[radial-gradient(ellipse_at_center,rgba(8,47,73,0.78)_0%,rgba(15,23,42,0.45)_52%,rgba(15,23,42,0)_78%)] before:blur-[3px] before:content-['']">{session.time}</span>
              {compact ? null : <span className="relative isolate px-1 text-[7.5px] font-black uppercase tracking-wide text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] before:absolute before:-inset-x-1.5 before:-inset-y-0.5 before:-z-10 before:rounded-full before:bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.7)_0%,rgba(15,23,42,0)_76%)] before:blur-[3px] before:content-['']">{session.statusText}</span>}
            </>
          )}
        </button>
      )) : onEmptySelect ? (
        <button
          aria-label={emptyLabel}
          className={`group/empty relative mx-auto grid place-items-center rounded-full bg-slate-950 text-current ring-[3px] ring-slate-950/90 transition hover:scale-110 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 motion-reduce:transform-none ${
            compact ? "h-6 w-6" : "h-7 w-7"
          }`}
          data-dashboard-tooltip={emptyTooltip}
          onClick={onEmptySelect}
          type="button"
        >
          <Star
            aria-hidden="true"
            className={`fill-current opacity-35 transition group-hover/empty:opacity-90 ${
              compact ? "h-3 w-3" : "h-3.5 w-3.5"
            }`}
            style={{
              color,
              filter: `drop-shadow(0 0 7px ${color})`,
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition group-hover/empty:opacity-100"
            style={{
              boxShadow: `0 0 16px ${color}`,
            }}
          />
        </button>
      ) : (
        <span aria-label="Nothing planned" className="relative mx-auto grid h-5 w-5 place-items-center rounded-full bg-slate-950 ring-[3px] ring-slate-950/90">
          <Star aria-hidden="true" className="h-2.5 w-2.5 fill-current opacity-35" style={{ color }} />
        </span>
      )}
    </div>
  );
}
