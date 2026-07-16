"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ROUTES } from "@/lib/routes";
import { soundFx } from "@/lib/soundFx";

const INTRO_ASSESSMENT_PATHS: ReadonlySet<string> = new Set([
  ROUTES.public.home,
  ROUTES.onboarding.home,
]);

/** Keeps the intro assessment soundtrack inside its own flow. */
export default function IntroAssessmentMusicStopper() {
  const pathname = usePathname();

  useEffect(() => {
    if (INTRO_ASSESSMENT_PATHS.has(pathname)) return;
    soundFx.pauseMusic();
  }, [pathname]);

  return null;
}
