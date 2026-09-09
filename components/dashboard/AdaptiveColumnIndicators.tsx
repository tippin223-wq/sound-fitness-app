"use client";

import { Children, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export default function AdaptiveColumnIndicators({
  children, label, activeIndex, onSelect, className = "", role = "tablist",
}: {
  children: ReactNode;
  label: string;
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
  role?: "tablist" | "group";
}) {
  const items = Children.toArray(children);
  const count = items.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  const wheelRef = useRef(0);
  const [layout, setLayout] = useState({ width: 0, required: 0, widest: 32 });
  const orbit = layout.width > 0 && layout.required > layout.width + 1;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const measure = () => {
      // offsetWidth is untransformed in both modes, so entering the orbit
      // cannot make the items appear to fit and cause a resize feedback loop.
      const widths = Array.from(root.children, (child) => (child as HTMLElement).offsetWidth);
      const next = {
        width: root.clientWidth,
        required: widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * 4,
        widest: Math.max(32, ...widths),
      };
      setLayout((previous) => previous.width === next.width && previous.required === next.required && previous.widest === next.widest ? previous : next);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    Array.from(root.children).forEach((child) => observer.observe(child));
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [count]);

  const select = (index: number, focus = false) => {
    if (!count) return;
    const next = (index + count) % count;
    onSelect(next);
    if (focus) requestAnimationFrame(() => rootRef.current?.children[next]?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }));
  };
  // Label pills need their own orbit geometry. Icon-slot spacing crowds long
  // labels, especially when a fourth pill is squeezed behind the neighbors.
  const labelOrbit = layout.widest > 56;
  const visibleDistance = labelOrbit ? 1 : layout.width >= 280 ? 2 : 1;
  const depthStep = labelOrbit ? 36 : 24;
  const angle = labelOrbit ? 32 : 38;
  const perspectiveScale = 700 / (700 + depthStep);
  const projectedWidthFactor = Math.cos(angle * Math.PI / 180) * perspectiveScale;
  const neighborScale = labelOrbit
    ? Math.min(0.82, Math.max(0.35, (layout.width / 2 - layout.widest * 0.52 - 22) / (layout.widest * projectedWidthFactor)))
    : 0.76;
  const step = labelOrbit
    ? (layout.widest * 0.52 + layout.widest * neighborScale * projectedWidthFactor / 2 + 14) / perspectiveScale
    : Math.min(74, Math.max(24, (layout.width / 2 - layout.widest * 0.4 - 8) / visibleDistance));

  const previousSlotsRef = useRef<Array<{ distance: number; transform: string; opacity: string }>>([]);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !orbit || !labelOrbit) {
      previousSlotsRef.current = [];
      return;
    }
    const previous = previousSlotsRef.current;
    const slots = Array.from(root.children) as HTMLElement[];
    previousSlotsRef.current = slots.map((slot) => ({
      distance: Number(slot.dataset.orbitDistance),
      transform: slot.style.transform,
      opacity: slot.style.opacity,
    }));
    const animations: Animation[] = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    slots.forEach((slot, index) => {
      const old = previous[index];
      const next = previousSlotsRef.current[index];
      if (!old || Math.abs(old.distance - next.distance) <= count / 2) return;
      // Circular indices jump from one edge to the other. Fade through the
      // outside edge instead of letting the CSS transition cross the center.
      slot.getAnimations().forEach((animation) => animation.cancel());
      const entering = Math.abs(next.distance) <= visibleDistance;
      const side = Math.sign(entering ? next.distance : old.distance);
      const edge = `translate(-50%, -50%) translateX(${side * (visibleDistance + 1) * step}px) translateZ(-72px) rotateY(${-side * angle}deg) scale(0.56)`;
      animations.push(slot.animate(
        entering
          ? [{ transform: edge, opacity: 0 }, { transform: next.transform, opacity: next.opacity }]
          : [{ transform: old.transform, opacity: old.opacity }, { transform: edge, opacity: 0 }],
        { duration: 360, easing: "cubic-bezier(0.22, 0.8, 0.24, 1)" },
      ));
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, [activeIndex, orbit, labelOrbit, count, visibleDistance, step, angle]);

  return (
    <div
      ref={rootRef}
      aria-label={label}
      role={role}
      data-column-indicator-layout={orbit ? "orbit" : "flat"}
      className={`pointer-events-auto relative flex h-11 w-full min-w-0 max-w-full items-center justify-start gap-1 overflow-hidden [perspective:700px] [touch-action:pan-y] ${className}`}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        select(event.key === "Home" ? 0 : event.key === "End" ? count - 1 : activeIndex + (event.key === "ArrowRight" ? 1 : -1), true);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        swipedRef.current = false;
        pointerRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerCancel={() => { pointerRef.current = null; }}
      onPointerUp={(event) => {
        event.stopPropagation();
        const start = pointerRef.current;
        pointerRef.current = null;
        if (!orbit || !start) return;
        const dx = event.clientX - start.x;
        if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
          swipedRef.current = true;
          select(activeIndex + (dx < 0 ? 1 : -1));
        }
      }}
      onClickCapture={(event) => {
        if (swipedRef.current) { event.preventDefault(); event.stopPropagation(); swipedRef.current = false; }
      }}
      onWheel={(event) => {
        event.stopPropagation();
        if (!orbit || Math.abs(event.deltaX) < 12 || Date.now() - wheelRef.current < 260) return;
        wheelRef.current = Date.now();
        select(activeIndex + (event.deltaX > 0 ? 1 : -1));
      }}
    >
      {items.map((child, index) => {
        let distance = (index - activeIndex + count) % count;
        if (distance > count / 2) distance -= count;
        const depth = Math.abs(distance);
        const hidden = orbit && depth > visibleDistance;
        return (
          <div
            key={(child as { key?: string }).key ?? index}
            role="presentation"
            inert={hidden}
            aria-hidden={hidden || undefined}
            data-orbit-distance={distance}
            className="w-max shrink-0 transition-[transform,opacity] duration-[360ms] ease-[cubic-bezier(0.22,0.8,0.24,1)] motion-reduce:transition-none"
            style={orbit ? {
              position: "absolute", left: "50%", top: "50%",
              transform: `translate(-50%, -50%) translateX(${distance * step}px) translateZ(${-depth * depthStep}px) rotateY(${-Math.sign(distance) * (depth ? angle : 0)}deg) scale(${depth === 0 ? 1 : depth === 1 ? neighborScale : 0.56})`,
              opacity: hidden ? 0 : depth === 0 ? 1 : depth === 1 ? 0.78 : 0.48,
              zIndex: count - depth,
              pointerEvents: hidden ? "none" : undefined,
            } : undefined}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
