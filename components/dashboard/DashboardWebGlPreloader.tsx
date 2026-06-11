"use client";

import { useEffect } from "react";
import { preloadDashboardWebGlRuntime } from "./dashboardWebGlRenderer";

const DASHBOARD_WEBGL_BATCH_SELECTOR = [
  ".dashboard-header-trophy-3d",
  ".dashboard-header-logo-3d__webgl",
  ".dashboard-header-scroll-button__webgl",
  ".dashboard-sound-level-badge__webgl",
  ".dashboard-shared-gem-stage-3d",
  ".dashboard-profile-points-trigger__webgl-coin",
  ".dashboard-profile-points-trigger__webgl-bolt",
  ".dashboard-profile-points-trigger__claim-webgl",
  ".dashboard-profile-action-gear__webgl",
  ".dashboard-header-meter-menu-trigger__webgl-icon",
].join(",");

const DASHBOARD_WEBGL_BATCH_TIMEOUT_MS = 7000;

export default function DashboardWebGlPreloader() {
  useEffect(() => {
    let cancelled = false;
    let animationFrameId = 0;
    const startedAt = performance.now();

    document.documentElement.dataset.dashboardWebgl = "warming";

    const markReadyWhenBatchRendered = () => {
      if (cancelled || typeof document === "undefined") return;

      const canvases = Array.from(
        document.querySelectorAll<HTMLCanvasElement>(
          DASHBOARD_WEBGL_BATCH_SELECTOR,
        ),
      );
      const hasCanvasBatch = canvases.length > 0;
      const batchRendered =
        hasCanvasBatch &&
        canvases.every(
          (canvas) =>
            canvas.dataset.webglReady === "true" ||
            canvas.dataset.webglFallback === "true",
        );
      const timedOut =
        performance.now() - startedAt > DASHBOARD_WEBGL_BATCH_TIMEOUT_MS;

      if (batchRendered) {
        document.documentElement.dataset.dashboardWebgl = "ready";
        return;
      }

      if (timedOut) {
        document.documentElement.dataset.dashboardWebgl = "fallback";
      }

      animationFrameId = window.requestAnimationFrame(markReadyWhenBatchRendered);
    };

    const preload = async () => {
      void preloadDashboardWebGlRuntime();
      if (cancelled || typeof document === "undefined") return;
      animationFrameId = window.requestAnimationFrame(markReadyWhenBatchRendered);
    };

    void preload();

    return () => {
      cancelled = true;
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return null;
}
