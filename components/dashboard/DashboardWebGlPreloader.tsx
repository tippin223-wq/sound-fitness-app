"use client";

import { useEffect } from "react";
import { preloadDashboardWebGlRuntime } from "./dashboardWebGlRenderer";

export default function DashboardWebGlPreloader() {
  useEffect(() => {
    let cancelled = false;

    const preload = async () => {
      const ready = await preloadDashboardWebGlRuntime();
      if (cancelled || typeof document === "undefined") return;

      document.documentElement.dataset.dashboardWebgl = ready
        ? "ready"
        : "fallback";
    };

    void preload();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
