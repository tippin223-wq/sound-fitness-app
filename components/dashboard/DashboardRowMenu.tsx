"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./DashboardRowMenu.module.css";

/** Overlay navigation never reserves space in the active card. */
export default function DashboardRowMenu({ children, label = "dashboard row menu", icon, closeOnSelect = false, open, onOpenChange, renderTrigger }: { children: ReactNode; label?: string; icon?: ReactNode; closeOnSelect?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; renderTrigger?: (toggle: () => void, open: boolean) => ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [manual, setManual] = useState(false);
  const id = useId();
  const visible = open ?? manual;
  const customTrigger = Boolean(renderTrigger);
  const setVisible = useCallback((next: boolean) => { setManual(next); onOpenChange?.(next); }, [onOpenChange]);

  useEffect(() => {
    if (!visible) return;
    const section = root.current?.closest("section");
    let timeout: ReturnType<typeof setTimeout>;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setVisible(false), 5000);
    };
    const handleActivity = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-dashboard-row-menu], [data-dashboard-hero-toolbar]")) resetTimeout();
    };
    resetTimeout();
    for (const name of ["pointerdown", "pointermove", "keydown", "wheel", "focusin"]) section?.addEventListener(name, handleActivity, true);
    return () => {
      clearTimeout(timeout);
      for (const name of ["pointerdown", "pointermove", "keydown", "wheel", "focusin"]) section?.removeEventListener(name, handleActivity, true);
    };
  }, [visible, setVisible]);

  useEffect(() => {
    const section = root.current?.closest("section");
    if (!section) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setVisible(false);
    };
    section.addEventListener("pointerdown", outside, true);
    return () => {
      section.removeEventListener("pointerdown", outside, true);
    };
  }, [setVisible]);

  useEffect(() => {
    const host = root.current;
    const section = host?.closest("section");
    const header = section?.querySelector<HTMLElement>(".dashboard-header-vortex-shell");
    const content = header?.querySelector<HTMLElement>(".dashboard-header-menu-content");
    if (!host || !header || !content) return;
    let previousTop = "";
    const alignBelowHeader = () => {
      host.dataset.headerActive = String(header.getAttribute("data-header-focus") === "header" && header.getAttribute("data-dashboard-header-timeout") !== "true");
      // Follow the visible header, including its collapsing footprint.
      const bottom = header.getBoundingClientRect().bottom;
      // Leave breathing room above the up arrow when it becomes available.
      const gap = customTrigger ? 6 : 8;
      const top = `${Math.ceil(bottom - host.getBoundingClientRect().top + gap)}px`;
      if (top !== previousTop) {
        previousTop = top;
        host.style.setProperty("--dashboard-row-menu-top", top);
      }
    };
    const observer = new ResizeObserver(alignBelowHeader);
    observer.observe(header);
    observer.observe(content);
    const mutations = new MutationObserver(alignBelowHeader);
    mutations.observe(header, { attributes: true, attributeFilter: ["class", "style", "data-header-focus", "data-dashboard-header-timeout"] });
    window.addEventListener("resize", alignBelowHeader);
    section?.addEventListener("scroll", alignBelowHeader, { passive: true, capture: true });
    alignBelowHeader();
    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", alignBelowHeader);
      section?.removeEventListener("scroll", alignBelowHeader, true);
    };
  }, [customTrigger]);

  return (
    <div ref={root} className={styles.root} data-dashboard-row-menu data-row-menu-open={visible}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        setVisible(false);
        (trigger.current ?? root.current?.querySelector("button"))?.focus();
      }}>
      {renderTrigger ? <div className={styles.joystickTab}>{renderTrigger(() => setVisible(!visible), visible)}</div> : <button ref={trigger} type="button" className={styles.tab}
        aria-label={`${visible ? "Hide" : "Open"} ${label}`}
        aria-expanded={visible} aria-controls={id}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setVisible(!visible);
        }}>
        {icon ?? <svg className={styles.menuIcon} aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="5" height="5" rx="1.5" fill="#fbbf24" />
          <rect x="3" y="10" width="5" height="5" rx="1.5" fill="#a78bfa" />
          <rect x="3" y="17" width="5" height="5" rx="1.5" fill="#34d399" />
          <path d="M12 5.5h9M12 12.5h9M12 19.5h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>}
        <svg className={styles.chevron} aria-hidden="true" width="20" height="14" viewBox="0 0 20 14" fill="none">
          <path d="m4.5 4.5 5.5 5 5.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>}
      <div id={id} className={styles.panel} inert={!visible} onClick={event => { if (closeOnSelect && event.target instanceof Element && event.target.closest("button")) setVisible(false); }}>
        {children}
      </div>
    </div>
  );
}
