"use client";

import { useId, useSyncExternalStore } from "react";
import { Box, Image as ImageGlyph } from "lucide-react";
import {
  DASHBOARD_WEBGL_IMAGE_MODE_EVENT,
  setDashboardWebGlImageMode,
  syncDashboardWebGlImageModeFromStorage,
} from "@/components/dashboard/dashboardWebGlRenderer";

type WebGlRenderModeToggleProps = {
  className?: string;
};

export default function WebGlRenderModeToggle({
  className = "",
}: WebGlRenderModeToggleProps) {
  const switchId = useId();
  const imageMode = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(DASHBOARD_WEBGL_IMAGE_MODE_EVENT, onStoreChange);
      return () => {
        window.removeEventListener(
          DASHBOARD_WEBGL_IMAGE_MODE_EVENT,
          onStoreChange,
        );
      };
    },
    syncDashboardWebGlImageModeFromStorage,
    () => false,
  );

  const toggleMode = () => {
    setDashboardWebGlImageMode(!imageMode);
  };

  return (
    <button
      aria-checked={imageMode}
      aria-labelledby={`${switchId}-label`}
      className={[
        "group inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.11em] transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70",
        imageMode
          ? "border-cyan-200/55 bg-cyan-300/14 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]"
          : "border-sky-300/18 bg-slate-950/35 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-sky-200/40 hover:text-slate-100",
        className,
      ].join(" ")}
      onClick={toggleMode}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        className={[
          "relative h-4 w-8 rounded-full border transition duration-200",
          imageMode
            ? "border-cyan-100/55 bg-cyan-300/22"
            : "border-slate-500/35 bg-slate-950/55",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1/2 grid h-3.5 w-3.5 -translate-y-1/2 place-items-center rounded-full transition duration-200",
            imageMode
              ? "left-[1.02rem] bg-cyan-100 text-cyan-950 shadow-[0_0_12px_rgba(103,232,249,0.55)]"
              : "left-0.5 bg-slate-500/70 text-slate-950",
          ].join(" ")}
        >
          {imageMode ? (
            <ImageGlyph className="h-2.5 w-2.5" strokeWidth={2.7} />
          ) : (
            <Box className="h-2.5 w-2.5" strokeWidth={2.7} />
          )}
        </span>
      </span>
      <span id={`${switchId}-label`} className="whitespace-nowrap">
        {imageMode ? "2D image" : "Live 3D"}
      </span>
    </button>
  );
}
