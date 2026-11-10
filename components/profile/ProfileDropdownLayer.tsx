"use client";

import { cloneElement, useLayoutEffect, useState, type CSSProperties, type ReactElement, type RefObject } from "react";
import { createPortal } from "react-dom";

/** Keep menus outside scrolling cards and transformed orbit stacking contexts. */
export default function ProfileDropdownLayer({ anchorRef, children }: {
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactElement<{ style?: CSSProperties }>;
}) {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    const anchor = anchorRef.current?.querySelector<HTMLElement>('[aria-haspopup="listbox"]');
    if (!anchor) return;
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewTop = viewport?.offsetTop ?? 0, viewLeft = viewport?.offsetLeft ?? 0;
      const height = viewport?.height ?? window.innerHeight, width = viewport?.width ?? window.innerWidth;
      const bottom = viewTop + height;
      const below = Math.max(0, bottom - rect.bottom - 14);
      const above = Math.max(0, rect.top - viewTop - 14);
      const opensAbove = below < 280 && above > below;
      const menuWidth = Math.min(Math.max(rect.width, 200), width - 16);
      const next: CSSProperties = {
        position: "fixed", zIndex: 100050,
        left: Math.max(viewLeft + 8, Math.min(rect.left, viewLeft + width - menuWidth - 8)),
        top: opensAbove ? Math.max(viewTop + 72, rect.top - 6) : Math.min(rect.bottom + 6, bottom - 72),
        transform: opensAbove ? "translateY(-100%)" : undefined,
        width: menuWidth, maxHeight: Math.min(320, Math.max(64, opensAbove ? above : below)),
        overflowY: "auto", overscrollBehavior: "contain", borderRadius: 16,
        scrollbarWidth: "thin", scrollbarColor: "#22d3ee #0f172a",
      };
      setPosition(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    const observer = new ResizeObserver(update);
    observer.observe(anchor);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [anchorRef]);
  if (!position) return null;
  return createPortal(<div data-profile-dropdown-layer="true" style={position}
    onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()}
    onMouseDown={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()} onClick={event => event.stopPropagation()} onWheel={event => event.stopPropagation()}
    onKeyDown={event => { if (event.key === "Escape") anchorRef.current?.querySelector<HTMLElement>('[aria-haspopup="listbox"]')?.focus(); }}>
    {cloneElement(children, { style: { ...children.props.style, position: "relative", inset: "auto", width: "100%", maxHeight: "none", overflow: "visible", margin: 0 } })}
  </div>, document.body);
}
