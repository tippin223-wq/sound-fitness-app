"use client";

import { Children, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./FuelLoadingCarousel.module.css";

/** A compact, one-habit-at-a-time rail, isolated from the outer card orbit. */
export default function FuelLoadingCarousel({ children, stackWhenRoom = false, controlsAbove = false, fitFullRows = false, overlay, label = "Fuel", trailingControl }: { children: ReactNode; stackWhenRoom?: boolean; controlsAbove?: boolean; fitFullRows?: boolean; overlay?: ReactNode; label?: string; trailingControl?: ReactNode }) {
  const id = useId();
  const railRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = useState(false);
  const targetRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const items = Children.toArray(children);
  const [rowsPerPage, setRowsPerPage] = useState(1);
  const count = fitFullRows ? Math.ceil(items.length / rowsPerPage) : items.length;

  useLayoutEffect(() => {
    if (!fitFullRows) return;
    const host = hostRef.current, rail = railRef.current;
    if (!host || !rail) return;
    const measure = () => {
      const rows = rail.querySelectorAll<HTMLElement>("[data-fuel-page] > *");
      const rowHeight = Math.max(0, ...Array.from(rows, row => row.getBoundingClientRect().height));
      const controls = host.querySelector<HTMLElement>('[data-carousel-controls]');
      const available = host.clientHeight - (controls?.offsetHeight ?? 36) - 8;
      if (rowHeight > 0) setRowsPerPage(Math.max(1, Math.min(items.length, Math.floor((available + 12) / (rowHeight + 12)))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    rail.querySelectorAll("[data-fuel-page] > *").forEach(row => observer.observe(row));
    return () => observer.disconnect();
  }, [fitFullRows, items.length, rowsPerPage]);

  useLayoutEffect(() => {
    if (!fitFullRows) return;
    targetRef.current = 0;
    setActiveIndex(0);
    railRef.current?.scrollTo({ left: 0, behavior: "instant" });
  }, [fitFullRows, rowsPerPage]);

  useLayoutEffect(() => {
    const host = hostRef.current, rail = railRef.current;
    if (!stackWhenRoom || !host || !rail) return;
    let frame = 0;
    const measure = () => {
      const pixels = (value: string) => parseFloat(value) || 0;
      const required = Array.from(rail.children).reduce((total, row) => {
        const css = getComputedStyle(row);
        const content = Array.from(row.children).reduce((height, part) => {
          const partCss = getComputedStyle(part);
          return height + part.getBoundingClientRect().height + pixels(partCss.marginTop) + pixels(partCss.marginBottom);
        }, 0);
        return total + content + pixels(css.paddingTop) + pixels(css.paddingBottom) + pixels(css.borderTopWidth) + pixels(css.borderBottomWidth);
      }, Math.max(0, count - 1) * 12);
      setStacked(host.clientHeight >= Math.ceil(required));
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(host);
    Array.from(rail.children).forEach(row => Array.from(row.children).forEach(part => observer.observe(part)));
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [stackWhenRoom, count]);

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
      ref={hostRef}
      data-stacked={stackWhenRoom && stacked ? "true" : undefined}
      className={`${controlsAbove ? "relative flex min-h-0 flex-1 flex-col overflow-hidden" : ""} ${stackWhenRoom ? styles.adaptive : ""}`}
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
        aria-label={`${label} rows`}
        tabIndex={0}
        className={`${styles.rail} relative flex w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60 [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden`}
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
        {fitFullRows ? Array.from({ length: count }, (_, page) => (
          <div key={page} data-fuel-page="true" className="flex w-full min-w-0 shrink-0 snap-start flex-col gap-3 self-start">
            {items.slice(page * rowsPerPage, (page + 1) * rowsPerPage)}
          </div>
        )) : children}
      </div>
      {overlay ? <div className="absolute inset-x-0 bottom-0 top-[44px] z-30 overflow-y-auto rounded-2xl bg-[#08221ff5] shadow-xl [scrollbar-width:thin]" data-dashboard-orbiter-local-scroll="true">{overlay}</div> : null}
      <div className={`${styles.controls} ${controlsAbove ? "order-first mb-2 shrink-0" : "mt-1"} flex items-center ${trailingControl ? "justify-start gap-1" : "justify-center gap-4"}`} data-carousel-controls="true" aria-label={`${label} row controls`}>
        <button
          type="button"
          aria-label={`Previous ${label.toLowerCase()} rows`}
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
          aria-label={`Next ${label.toLowerCase()} rows`}
          aria-controls={id}
          disabled={activeIndex >= count - 1}
          onClick={() => select(targetRef.current + 1)}
          className="grid h-9 w-9 place-items-center text-cyan-100 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200 disabled:opacity-25"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        {trailingControl ? <div className="ml-auto min-w-0">{trailingControl}</div> : null}
      </div>
    </div>
  );
}
