"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import {
  registerDashboardWidget,
  type DashboardWidgetBuilder,
} from "./dashboardWebGlStage";

type DashboardWebGlWidgetProps = {
  /**
   * Builds the widget's scene/camera/animation. Must be stable across renders
   * (registration happens once on mount) — close over refs for reactive props.
   */
  build: DashboardWidgetBuilder;
  className?: string;
  /**
   * Extra styles merged onto the placeholder. The shared stage draws into this
   * element's screen rectangle, so use it to control the widget's size/position
   * (e.g. an overflow "bleed"). Note: per-element CSS filters/blend-modes do NOT
   * affect the shared canvas pixels — only geometry/positioning transfers.
   */
  style?: CSSProperties;
};

/**
 * Placeholder element whose on-screen rectangle the shared WebGL stage draws
 * this widget into. Renders no canvas of its own — the pixels come from the one
 * shared stage canvas (see dashboardWebGlStage.ts).
 */
export default function DashboardWebGlWidget({
  build,
  className = "",
  style,
}: DashboardWebGlWidgetProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    let cancelled = false;
    let unregister: (() => void) | null = null;

    // `build` is a useMemo value in every caller: stable unless the widget's
    // reactive config (e.g. tone/variant) changes, in which case we re-register
    // with the rebuilt scene.
    registerDashboardWidget(anchor, build).then((dispose) => {
      if (cancelled) {
        dispose();
        return;
      }
      unregister = dispose;
    });

    return () => {
      cancelled = true;
      unregister?.();
    };
  }, [build]);

  return (
    <div
      ref={anchorRef}
      className={className}
      aria-hidden="true"
      style={{ width: "100%", height: "100%", pointerEvents: "none", ...style }}
    />
  );
}
