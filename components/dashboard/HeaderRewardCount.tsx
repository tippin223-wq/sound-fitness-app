"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Keep semantic text in the button, with its visible copy above the shared
 * WebGL canvas. Raising z-index inside the header cannot escape its context. */
export default function HeaderRewardCount({ value }: { value: string }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const overlay = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    const source = anchor.current, target = overlay.current;
    if (!mounted || !source || !target) return;
    const header = source.closest<HTMLElement>(".dashboard-header-vortex-shell");
    let frame = 0, until = 0;
    const update = () => {
      frame = 0;
      const rect = source.getBoundingClientRect(), style = getComputedStyle(source);
      const visible = source.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      const scale = source.offsetHeight ? rect.height / source.offsetHeight : 1;
      Object.assign(target.style, {
        visibility: visible && rect.width > 0 ? "visible" : "hidden",
        opacity: header?.dataset.headerFocus === "content" ? "0.4" : "1",
        left: `${rect.left}px`, top: `${rect.top}px`, height: `${rect.height}px`,
        fontFamily: style.fontFamily, fontSize: `${Number.parseFloat(style.fontSize) * scale}px`,
        fontWeight: style.fontWeight, lineHeight: `${rect.height}px`, color: style.color,
        letterSpacing: style.letterSpacing === "normal" ? "normal" : `${Number.parseFloat(style.letterSpacing) * scale}px`,
      });
      if (performance.now() < until) frame = requestAnimationFrame(update);
    };
    const follow = () => {
      until = performance.now() + 500;
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(follow);
    resize.observe(source);
    const mutations = new MutationObserver(follow);
    if (header) {
      mutations.observe(header, { attributes: true, attributeFilter: ["class", "style", "data-header-focus"] });
      const stage = header.querySelector(".dashboard-header-main-orbit-stage--stable");
      if (stage) mutations.observe(stage, { attributes: true, attributeFilter: ["class", "style", "data-narrow-account-item", "data-mobile-header-panel"] });
      const row = header.querySelector(".dashboard-header-menu-content");
      if (row) mutations.observe(row, { attributes: true, attributeFilter: ["style"] });
    }
    header?.addEventListener("pointerover", follow, { passive: true });
    header?.addEventListener("pointerout", follow, { passive: true });
    window.addEventListener("resize", follow);
    window.addEventListener("scroll", follow, { passive: true, capture: true });
    follow();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect();
      header?.removeEventListener("pointerover", follow);
      header?.removeEventListener("pointerout", follow);
      window.removeEventListener("resize", follow);
      window.removeEventListener("scroll", follow, true);
    };
  }, [mounted, value]);
  return <>
    <span ref={anchor} className="dashboard-header-reward-count-anchor" style={mounted ? { textShadow: "none", WebkitTextFillColor: "transparent" } : undefined}>{value}</span>
    {mounted && createPortal(<span ref={overlay} aria-hidden="true" className="dashboard-header-reward-count-overlay" style={{ position: "fixed", zIndex: 435, pointerEvents: "none", whiteSpace: "nowrap", visibility: "hidden", textShadow: "0 1px 3px #020617, 0 0 5px #020617" }}>{value}</span>, document.body)}
  </>;
}
