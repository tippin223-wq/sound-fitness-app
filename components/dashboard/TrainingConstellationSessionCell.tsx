import { Star } from "lucide-react";
import type { TrainingConstellationSession } from "@/lib/training-constellation";

type Props = {
  sessions: TrainingConstellationSession[];
  color: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  compact?: boolean;
};

export default function TrainingConstellationSessionCell({
  sessions, color, selectedId, onSelect, compact = false,
}: Props) {
  return (
    <div className={`relative z-10 flex min-w-0 flex-col justify-center gap-1 border-r border-white/[0.045] py-1 last:border-r-0 ${compact ? "px-0.5" : "px-1"}`}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-px opacity-40" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {sessions.length ? sessions.map((session) => (
        <button
          aria-label={`Open ${session.title} session details, ${session.fullDate}, ${session.time}, ${session.statusText}`}
          aria-pressed={selectedId === session.id}
          className={`group relative flex w-full min-w-0 flex-col items-center gap-1 rounded-lg py-1.5 text-center transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200 ${compact ? "px-0.5" : "px-1"} ${selectedId === session.id ? "bg-white/10" : ""}`}
          key={session.id}
          onClick={() => onSelect(session.id)}
          type="button"
          title={`${session.title} · ${session.time} · ${session.statusText}`}
        >
          <span
            aria-hidden="true"
            className={`grid shrink-0 place-items-center rounded-full border-2 bg-slate-950 ring-[3px] ring-slate-950/90 ${compact ? "h-6 w-6" : "h-7 w-7"}`}
            style={{ borderColor: color, borderStyle: session.status === "complete" ? "solid" : "dashed", boxShadow: `0 0 ${selectedId === session.id ? 16 : 7}px ${color}` }}
          >
            <Star className="h-3.5 w-3.5 fill-current" style={{ color }} />
          </span>
          <span className={`w-full break-words text-[8px] font-black leading-tight text-slate-100 ${compact ? "line-clamp-2 [overflow-wrap:anywhere]" : ""}`}>{session.title}</span>
          <span className="text-[7px] font-bold leading-tight text-slate-300">{session.time}</span>
          {compact ? null : <span className="text-[6px] font-black uppercase tracking-wide text-slate-400">{session.statusText}</span>}
        </button>
      )) : (
        <span aria-label="Nothing planned" className="relative mx-auto grid h-5 w-5 place-items-center rounded-full bg-slate-950 ring-[3px] ring-slate-950/90">
          <Star aria-hidden="true" className="h-2.5 w-2.5 fill-current opacity-35" style={{ color }} />
        </span>
      )}
    </div>
  );
}
