"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useId,
  useState,
} from "react";

type DashboardScrollIndicatorProps = {
  className?: string;
  label: string;
  /** Paged (scroll-snap) scrollers: jump handler for a clicked page segment. */
  onSelectPage?: (page: number) => void;
  /** Paged scrollers: number of snap pages; the track shows one tick each. */
  pageCount?: number;
  scroller: HTMLElement | null;
  trackClassName?: string;
  /** Overrides the track's default max width (the base class is dropped). */
  trackMaxWidthClassName?: string;
};

type ScrollMetrics = {
  /** Visible fraction of the content (thumb width). */
  size: number;
  /** Thumb start, as a fraction of the track. */
  start: number;
};

/**
 * Slim horizontal scroll-position indicator that sits above a horizontal card
 * scroller. The thumb tracks scrollLeft continuously (passive scroll listener,
 * at most one state write per frame), the track is clickable and arrow-key
 * steppable, and paged scrollers get one tick per page. Renders nothing while
 * there is nothing to scroll, so it can wrap any strip unconditionally.
 */
export default function DashboardScrollIndicator({
  className = "",
  label,
  onSelectPage,
  pageCount = 0,
  scroller,
  trackClassName = "",
  trackMaxWidthClassName = "max-w-[14rem]",
}: DashboardScrollIndicatorProps) {
  const [metrics, setMetrics] = useState<ScrollMetrics>({ size: 1, start: 0 });
  // role="scrollbar" requires aria-controls; the strips this wraps are plain
  // divs, so give one an id when it has none of its own.
  const generatedScrollerId = useId();
  const scrollerId = scroller?.id || generatedScrollerId;
  useEffect(() => {
    if (scroller && !scroller.id) scroller.id = generatedScrollerId;
  }, [generatedScrollerId, scroller]);
  const scrollBehavior: ScrollBehavior =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

  useEffect(() => {
    if (!scroller) return;
    let frame: number | null = null;
    const measure = () => {
      frame = null;
      const max = scroller.scrollWidth - scroller.clientWidth;
      const size =
        scroller.scrollWidth > 0
          ? Math.min(1, scroller.clientWidth / scroller.scrollWidth)
          : 1;
      const start =
        max > 0
          ? Math.min(
              1 - size,
              Math.max(0, (scroller.scrollLeft / max) * (1 - size)),
            )
          : 0;
      setMetrics((current) =>
        Math.abs(current.size - size) < 0.002 &&
        Math.abs(current.start - start) < 0.002
          ? current
          : { size, start },
      );
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(measure);
    };
    measure();
    scroller.addEventListener("scroll", schedule, { passive: true });
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(scroller);
    const content = scroller.firstElementChild;
    if (content) observer?.observe(content);
    return () => {
      scroller.removeEventListener("scroll", schedule);
      observer?.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [scroller]);

  const paged = pageCount > 1;
  if (!paged && metrics.size >= 0.999) return null;

  const travel = Math.max(0.000001, 1 - metrics.size);
  const progress = Math.min(1, metrics.start / travel);
  const activePage = paged ? Math.round(progress * (pageCount - 1)) : 0;

  const goToPage = (page: number) => {
    if (!scroller) return;
    const next = Math.max(0, Math.min(pageCount - 1, page));
    if (onSelectPage) {
      onSelectPage(next);
      return;
    }
    scroller.scrollTo({
      behavior: scrollBehavior,
      left: next * scroller.clientWidth,
    });
  };

  const handleTrackClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!scroller) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const fraction = Math.min(
      0.999,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );
    if (paged) {
      goToPage(Math.floor(fraction * pageCount));
      return;
    }
    const max = scroller.scrollWidth - scroller.clientWidth;
    const target = ((fraction - metrics.size / 2) / travel) * max;
    scroller.scrollTo({
      behavior: scrollBehavior,
      left: Math.max(0, Math.min(max, target)),
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!scroller) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    if (paged) {
      goToPage(activePage + direction);
      return;
    }
    scroller.scrollBy({
      behavior: scrollBehavior,
      left: direction * scroller.clientWidth * 0.8,
    });
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div
        aria-controls={scrollerId}
        aria-label={label}
        aria-orientation="horizontal"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={
          paged ? `Page ${activePage + 1} of ${pageCount}` : undefined
        }
        className={`relative h-2 w-full cursor-pointer rounded-full bg-white/12 outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${trackMaxWidthClassName} ${trackClassName}`}
        onClick={handleTrackClick}
        onKeyDown={handleKeyDown}
        role="scrollbar"
        tabIndex={0}
      >
        {paged
          ? Array.from({ length: pageCount }, (_, page) => (
              <span
                aria-hidden="true"
                className={`absolute top-1/2 h-1 w-1 -translate-y-1/2 rounded-full ${
                  page === activePage ? "bg-cyan-50" : "bg-white/45"
                }`}
                key={page}
                style={{ left: `calc(${((page + 0.5) / pageCount) * 100}% - 2px)` }}
              />
            ))
          : null}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 rounded-full bg-cyan-200 shadow-[0_0_10px_rgba(103,232,249,0.7)]"
          style={{
            left: `${metrics.start * 100}%`,
            width: `${Math.max(metrics.size, 0.08) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
