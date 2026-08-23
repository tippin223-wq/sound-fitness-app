"use client";

import { useEffect } from "react";

/**
 * The dashboard header cycles through modes, keeping many decorative panels in
 * the DOM but hidden (visibility:hidden / opacity:0 / parked off-screen). Their
 * looping CSS animations keep ticking anyway — style recalc + paint every frame
 * for things nobody can see. On a busy dashboard ~70% of the running animations
 * are on hidden/off-screen elements, which is most of the per-frame paint cost.
 *
 * This pauses endless (infinite-iteration) animations while their element can't
 * be seen and resumes them when it reappears. It only touches animations it
 * paused itself, and never touches finite ones (intros/transitions), so there's
 * no visual change — just far less wasted work.
 */
export default function OffscreenAnimationPauser() {
  useEffect(() => {
    if (typeof document.getAnimations !== "function") return;

    const pausedByUs = new WeakSet<Animation>();
    let timer = 0;
    let raf = 0;
    let stopped = false;

    const sweep = () => {
      // Cache visibility per element for this sweep — many animations share a
      // target/ancestors, and getComputedStyle forces a style flush.
      const visCache = new Map<Element, boolean>();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const isHidden = (el: Element): boolean => {
        const cached = visCache.get(el);
        if (cached !== undefined) return cached;

        let hidden = false;
        const rect = (el as HTMLElement).getBoundingClientRect?.();
        if (
          rect &&
          (rect.width === 0 ||
            rect.height === 0 ||
            rect.bottom <= 0 ||
            rect.top >= vh ||
            rect.right <= 0 ||
            rect.left >= vw)
        ) {
          hidden = true;
        } else {
          let node: Element | null = el;
          while (node && node !== document.body) {
            const s = getComputedStyle(node);
            if (
              s.display === "none" ||
              s.visibility === "hidden" ||
              parseFloat(s.opacity) === 0
            ) {
              hidden = true;
              break;
            }
            node = node.parentElement;
          }
        }
        visCache.set(el, hidden);
        return hidden;
      };

      for (const anim of document.getAnimations()) {
        const effect = anim.effect as KeyframeEffect | null;
        const target = effect?.target;
        if (!target) continue;

        let iterations: number;
        try {
          iterations = effect.getComputedTiming().iterations ?? 1;
        } catch {
          continue;
        }
        // Only endless decorative loops — leave one-shot intros/transitions alone.
        if (iterations !== Infinity) continue;

        if (isHidden(target)) {
          if (anim.playState === "running") {
            try {
              anim.pause();
              pausedByUs.add(anim);
            } catch {
              /* animation may be finishing/cancelled */
            }
          }
        } else if (pausedByUs.has(anim) && anim.playState === "paused") {
          try {
            anim.play();
          } catch {
            /* ignore */
          }
          pausedByUs.delete(anim);
        }
      }
    };

    // Run on an idle cadence, aligned to a frame so reads hit fresh layout.
    // ~400ms is far cheaper than the per-frame paint it removes, and a hidden
    // loop resuming a few hundred ms late is imperceptible.
    const schedule = () => {
      if (stopped) return;
      timer = window.setTimeout(() => {
        raf = window.requestAnimationFrame(() => {
          if (stopped) return;
          sweep();
          schedule();
        });
      }, 400);
    };

    sweep();
    schedule();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
