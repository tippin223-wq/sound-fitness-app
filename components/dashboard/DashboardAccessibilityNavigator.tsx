"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type Position = { left: number; top: number };

const DOUBLE_PRESS_MS = 360;
const HEADER_CLEARANCE_PX = 8;
const VIEWPORT_GUTTER_PX = 8;

export default function DashboardAccessibilityNavigator({
  children,
}: {
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const lastPointerDownAtRef = useRef(0);
  const toggleTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{
    offsetX: number;
    offsetY: number;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setMounted(true));
    return () => {
      window.cancelAnimationFrame(frameId);
      if (toggleTimerRef.current !== null) {
        window.clearTimeout(toggleTimerRef.current);
      }
    };
  }, []);

  const clampPosition = (left: number, top: number): Position => {
    const wrapper = wrapperRef.current;
    const width = wrapper?.offsetWidth ?? 110;
    const height = wrapper?.offsetHeight ?? 84;
    const header = document.querySelector<HTMLElement>(
      ".dashboard-header-vortex-shell",
    );
    const minimumTop = Math.max(
      VIEWPORT_GUTTER_PX,
      (header?.getBoundingClientRect().bottom ?? 0) + HEADER_CLEARANCE_PX,
    );

    return {
      left: Math.min(
        Math.max(VIEWPORT_GUTTER_PX, left),
        Math.max(VIEWPORT_GUTTER_PX, window.innerWidth - width),
      ),
      top: Math.min(
        Math.max(minimumTop, top),
        Math.max(minimumTop, window.innerHeight - height - VIEWPORT_GUTTER_PX),
      ),
    };
  };

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !open) return;

    const rect = wrapper.getBoundingClientRect();
    suppressClickRef.current = true;
    if (toggleTimerRef.current !== null) {
      window.clearTimeout(toggleTimerRef.current);
      toggleTimerRef.current = null;
    }
    setPosition({ left: rect.left, top: rect.top });
    dragRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleTabPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const now = Date.now();
    const isSecondPress = now - lastPointerDownAtRef.current <= DOUBLE_PRESS_MS;
    lastPointerDownAtRef.current = now;
    if (isSecondPress) beginDrag(event);
  };

  const handleTabPointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition(
      clampPosition(
        event.clientX - drag.offsetX,
        event.clientY - drag.offsetY,
      ),
    );
    event.preventDefault();
  };

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const handleTabClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (toggleTimerRef.current !== null) {
      window.clearTimeout(toggleTimerRef.current);
    }
    toggleTimerRef.current = window.setTimeout(() => {
      setOpen((current) => !current);
      toggleTimerRef.current = null;
    }, DOUBLE_PRESS_MS);
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[460] flex items-center"
      ref={wrapperRef}
      style={
        position
          ? { left: position.left, top: position.top }
          : { bottom: "6rem", right: 0 }
      }
    >
      <button
        aria-expanded={open}
        aria-label={
          open
            ? "Hide accessibility page navigator"
            : "Show accessibility page navigator"
        }
        className="pointer-events-auto grid h-12 w-7 cursor-grab place-items-center rounded-l-xl border border-r-0 border-cyan-100/30 bg-slate-950/95 text-[0.48rem] font-black uppercase tracking-[0.12em] text-cyan-100 shadow-[-8px_8px_20px_rgba(0,0,0,0.4)] outline-none transition hover:w-8 hover:border-amber-100/45 hover:text-white active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-cyan-100/75 [writing-mode:vertical-rl]"
        data-dashboard-tooltip={
          open
            ? "Click to hide. Double-click and hold to move."
            : "Click to show accessibility navigator."
        }
        onClick={handleTabClick}
        onLostPointerCapture={finishDrag}
        onPointerCancel={finishDrag}
        onPointerDown={handleTabPointerDown}
        onPointerMove={handleTabPointerMove}
        onPointerUp={finishDrag}
        type="button"
      >
        {open ? "Hide" : "Nav"}
      </button>
      {open ? (
        <div className="pointer-events-none grid h-[5.25rem] w-[4.35rem] place-items-center">
          {children}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
