"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import loadingStyles from "./DashboardLoading.module.css";
import { syncPreloaderAura } from "./preloaderAura";
import { preloadDashboardWebGlRuntime } from "./dashboardWebGlRenderer";

const DASHBOARD_WEBGL_BATCH_SELECTOR = [
  ".dashboard-header-logo-3d__webgl",
  ".dashboard-header-scroll-button__webgl",
  ".dashboard-shared-gem-stage-3d",
  ".dashboard-profile-points-trigger__webgl-coin",
  ".dashboard-profile-points-trigger__webgl-bolt",
  ".dashboard-profile-points-trigger__claim-webgl",
  ".dashboard-profile-action-gear__webgl",
  ".dashboard-header-meter-menu-trigger__webgl-icon",
].join(",");

// Deferred widgets mount late (render-on-demand); the batch gate must not flip
// to "ready" until at least one of each of these exists in the DOM, or the
// gems/coin/claim canvases pop in uncovered after the reveal.
const DASHBOARD_WEBGL_REQUIRED_SELECTORS = [
  ".dashboard-shared-gem-stage-3d",
  ".dashboard-profile-points-trigger__webgl-coin",
  ".dashboard-profile-points-trigger__claim-webgl",
];

const DASHBOARD_WEBGL_BATCH_TIMEOUT_MS = 7000;

export default function DashboardWebGlPreloader() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    let animationFrameId = 0;
    let idleCallbackId = 0;
    let idleTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const startedAt = performance.now();

    document.documentElement.dataset.dashboardWebgl = "warming";

    // These are next/dynamic ssr:false chunks; warming them at hydration
    // removes the extra network round-trip that made the points-trigger
    // gems/coin/chest icons pop in late, and pre-fetching also immunizes them
    // against stale-deploy 404s while the tab stays open.
    void import("@/components/dashboard/DashboardTornadoEmeralds3D");
    void import("@/components/dashboard/DashboardTreasureChest3D");

    const warmInteractionGatedChunks = () => {
      if (cancelled) return;
      void import("@/components/dashboard/DashboardSoundPointsTeslaCoil3D");
      void import("@/components/dashboard/DashboardCategoryUfoScene3D");
    };

    if (typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(warmInteractionGatedChunks);
    } else {
      idleTimeoutId = setTimeout(warmInteractionGatedChunks, 1500);
    }

    const markReadyWhenBatchRendered = () => {
      animationFrameId = 0;
      if (cancelled || typeof document === "undefined") return;

      const canvases = Array.from(
        document.querySelectorAll<HTMLCanvasElement>(
          DASHBOARD_WEBGL_BATCH_SELECTOR,
        ),
      );
      const hasCanvasBatch = canvases.length > 0;
      const requiredWidgetsPresent = DASHBOARD_WEBGL_REQUIRED_SELECTORS.every(
        (selector) => document.querySelector(selector) !== null,
      );
      const batchRendered =
        hasCanvasBatch &&
        requiredWidgetsPresent &&
        canvases.every(
          (canvas) =>
            canvas.dataset.webglReady === "true" ||
            canvas.dataset.webglFallback === "true",
        );
      const timedOut =
        performance.now() - startedAt > DASHBOARD_WEBGL_BATCH_TIMEOUT_MS;
      const avatarHost = document.querySelector("[data-dashboard-avatar-host]");
      const avatar = avatarHost?.querySelector<HTMLCanvasElement>("[data-sound-avatar-renderer]");
      const avatarSettled = !avatarHost || avatar?.dataset.soundAvatarReady === "true" || avatar?.dataset.webglFallback === "true";

      if (batchRendered) {
        document.documentElement.dataset.dashboardWebgl = "ready";
      } else if (timedOut) {
        document.documentElement.dataset.dashboardWebgl = "fallback";
      }
      if ((batchRendered && avatarSettled) || timedOut) setLoading(false);
      if (batchRendered && avatarSettled) {
        observer.disconnect();
        if (deadlineId !== undefined) clearTimeout(deadlineId);
        return;
      }

    };

    // Readiness changes only when widgets mount or mark their canvas ready.
    // Polling every animation frame otherwise continues forever for widgets
    // deliberately deferred until a menu opens.
    const observer = new MutationObserver(() => {
      if (!cancelled && animationFrameId === 0) {
        animationFrameId = window.requestAnimationFrame(markReadyWhenBatchRendered);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["data-webgl-ready", "data-webgl-fallback", "data-sound-avatar-ready"],
    });
    const deadlineId = setTimeout(markReadyWhenBatchRendered, DASHBOARD_WEBGL_BATCH_TIMEOUT_MS + 1);

    const preload = async () => {
      void preloadDashboardWebGlRuntime();
      if (cancelled || typeof document === "undefined") return;
      animationFrameId = window.requestAnimationFrame(markReadyWhenBatchRendered);
    };

    void preload();

    return () => {
      cancelled = true;
      observer.disconnect();
      if (deadlineId !== undefined) clearTimeout(deadlineId);
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (idleCallbackId !== 0 && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (idleTimeoutId !== undefined) {
        clearTimeout(idleTimeoutId);
      }
    };
  }, []);

  return <div ref={syncPreloaderAura} className={`${loadingStyles.page} ${loading ? "" : loadingStyles.complete}`}
    role={loading ? "status" : undefined} aria-live="polite" aria-hidden={!loading}>
    <Image src="/sound-crest-avatar.png" alt="Sound Fitness" width={160} height={160} priority unoptimized className={loadingStyles.crest} />
    <span className={loadingStyles.label}>Getting your dashboard ready</span>
  </div>;
}
