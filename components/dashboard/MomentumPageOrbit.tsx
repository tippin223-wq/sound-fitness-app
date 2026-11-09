"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** One angle drives both the ring and its upright planet faces. */
export default function MomentumPageOrbit({ active, children, onInteract }: { active: boolean; children: ReactNode; onInteract: () => void }) {
  const scene = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; last: number; time: number; moved: boolean; direction: number } | null>(null);
  const velocity = useRef(-7.5);
  const angle = useRef(0);
  const suppressClick = useRef(false);

  useEffect(() => {
    const element = scene.current;
    const ring = element?.querySelector<HTMLElement>(".dashboard-star-system__ring");
    if (!element || !ring || !active) return;
    let frame = 0;
    let last = 0;
    let visible = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ring.style.setProperty("animation", "none", "important");
    const paint = () => ring.style.setProperty("--dashboard-star-orbit-angle", `${angle.current}deg`);
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.04) : 0;
      last = now;
      if (!drag.current) {
        const base = reduced ? 0 : -7.5;
        angle.current += velocity.current * dt;
        velocity.current = base + (velocity.current - base) * Math.exp(-2.2 * dt);
      }
      paint();
      if (visible) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      last = 0;
      if (visible) frame = requestAnimationFrame(tick);
    });
    paint();
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); ring.style.removeProperty("animation"); };
  }, [active]);

  return <div ref={scene} aria-hidden={active ? undefined : true}
    className={`dashboard-star-system__scene ${active ? "dashboard-star-system__scene--draggable" : "pointer-events-none"}`}
    onPointerDown={event => {
      if (!active || event.button !== 0) return;
      event.stopPropagation();
      onInteract();
      suppressClick.current = false;
      const planet = (event.target as Element).closest(".dashboard-star-system__planet-body");
      const centerY = event.currentTarget.getBoundingClientRect().top + event.currentTarget.clientHeight / 2;
      const planetBounds = planet?.getBoundingClientRect();
      // The near side moves left with positive rotation; the far side is reversed.
      const direction = planetBounds && planetBounds.top + planetBounds.height / 2 < centerY ? 1 : -1;
      drag.current = { direction, id: event.pointerId, x: event.clientX, last: event.clientX, time: event.timeStamp, moved: false };
    }}
    onPointerMove={event => {
      event.stopPropagation();
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      if (!state.moved && Math.abs(event.clientX - state.x) < 6) return;
      if (!state.moved) { state.moved = true; event.currentTarget.setPointerCapture(event.pointerId); }
      event.stopPropagation();
      const delta = event.clientX - state.last;
      const elapsed = Math.max(event.timeStamp - state.time, 8);
      angle.current += delta * state.direction * 0.65;
      velocity.current = Math.max(-540, Math.min(540, delta * state.direction * 0.65 / elapsed * 1000));
      state.last = event.clientX; state.time = event.timeStamp;
    }}
    onPointerUp={event => {
      const state = drag.current;
      if (!state) return;
      event.stopPropagation();
      suppressClick.current = state.moved;
      if (event.timeStamp - state.time > 100) velocity.current = 0;
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { drag.current = null; velocity.current = 0; }}
    onLostPointerCapture={() => { drag.current = null; }}
    onClickCapture={event => {
      if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; }
    }}
  >{children}</div>;
}
