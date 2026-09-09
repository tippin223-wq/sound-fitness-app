"use client";

import { Children, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** A compact, one-habit-at-a-time rail, isolated from the outer card orbit. */
export default function FuelLoadingCarousel({ children }: { children: ReactNode }) {
  const id = useId();
  const railRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const count = Children.count(children);

  const select = (index: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const next = Math.max(0, Math.min(count - 1, index));
    const slide = rail.children[next] as HTMLElement | undefined;
    if (!slide) return;
    targetRef.current = next;
    setActiveIndex(next);
    rail.scrollTo({
      left: slide.offsetLeft,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          select(targetRef.current + (event.key === "ArrowRight" ? 1 : -1));
        }
      }}
    >
      <div
        ref={railRef}
        id={id}
        role="region"
        aria-label="Fuel habits"
        aria-roledescription="carousel"
        tabIndex={0}
        className="relative flex w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60 [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
        onScroll={() => {
          const rail = railRef.current;
          if (!rail) return;
          const nearest = Math.max(0, Math.min(count - 1, Math.round(rail.scrollLeft / (rail.clientWidth + 12))));
          setActiveIndex(nearest);
        }}
        onScrollEnd={() => {
          const rail = railRef.current;
          if (rail) targetRef.current = Math.max(0, Math.min(count - 1, Math.round(rail.scrollLeft / (rail.clientWidth + 12))));
        }}
      >
        {children}
      </div>
      <div className="mt-1 flex items-center justify-center gap-4" aria-label="Fuel habit controls">
        <button
          type="button"
          aria-label="Previous fuel habit"
          aria-controls={id}
          disabled={activeIndex === 0}
          onClick={() => select(targetRef.current - 1)}
          className="grid h-9 w-9 place-items-center text-cyan-100 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200 disabled:opacity-25"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="text-[9px] font-bold tabular-nums text-slate-400" aria-live="polite" aria-atomic="true">
          {activeIndex + 1} / {count}
        </span>
        <button
          type="button"
          aria-label="Next fuel habit"
          aria-controls={id}
          disabled={activeIndex >= count - 1}
          onClick={() => select(targetRef.current + 1)}
          className="grid h-9 w-9 place-items-center text-cyan-100 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200 disabled:opacity-25"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
