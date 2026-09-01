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

    // Real Sets (not WeakSets) so the effect cleanup can resume everything it
    // holds — a Fast-Refresh remount otherwise orphans paused animations
    // forever (the new instance's sets are empty and the sticky WAAPI
    // override blocks any CSS rescue). Entries are pruned each sweep once an
    // animation is cancelled, so the sets stay bounded.
    const pausedByUs = new Set<Animation>();
    // Animations we're holding because a stylesheet says animation-play-state:
    // paused. Calling .play() on a CSSAnimation permanently overrides that
    // property (the CSS pause stops working forever), so instead of resuming
    // into a CSS pause we park the animation here until the rule lifts.
    const cssHeld = new Set<Animation>();
    // Every animation we ever .play()ed carries the sticky CSS-Animations-2
    // play-state override from then on — stylesheet pause blankets (meter
    // panel policy, meter-menu-open header quieting, trophy-logo hover, the
    // chyron pause, rest-state pauses) can no longer reach it. These are the
    // ONLY animations that need the computed-play-state repair scan, so
    // tracking them keeps the scan exact AND bounded, wherever they live.
    const stickyOverridden = new Set<Animation>();
    // Does this animation drive its own target's opacity? Cached per
    // animation — see the self-opacity carve-out in isHidden below.
    const opacityAnimated = new Map<Animation, boolean>();
    let timer = 0;
    let raf = 0;
    let stopped = false;

    const sweep = () => {
      // Cache visibility per element for this sweep — many animations share a
      // target/ancestors, and getComputedStyle forces a style flush.
      const visCache = new Map<Element, boolean>();
      // Same walk, but ignoring the target's OWN opacity (see isHidden).
      const visSelfOpacityExemptCache = new Map<Element, boolean>();
      const apsCache = new Map<Element, Map<string, boolean>>();

      // An element whose opacity is under animation control must not be
      // judged hidden while that opacity passes through 0: pausing then
      // freezes opacity at 0, so every later sweep still reads "hidden" and
      // it can never resume — a permanent self-inflicted freeze. The test is
      // per ELEMENT, not per animation: the rail particles pair an
      // offset-distance travel loop with a separate opacity pulse on the
      // same circle, and the travel loop is exactly what got frozen.
      // Ancestors still count normally.
      const animatesOpacity = (
        anim: Animation,
        effect: KeyframeEffect,
      ): boolean => {
        const cached = opacityAnimated.get(anim);
        if (cached !== undefined) return cached;
        let animates = false;
        try {
          animates = effect
            .getKeyframes()
            .some((frame) => "opacity" in frame);
        } catch {
          animates = false;
        }
        opacityAnimated.set(anim, animates);
        return animates;
      };

      const selfOpacityAnimatedCache = new Map<Element, boolean>();
      const selfOpacityIsAnimated = (el: Element): boolean => {
        const cached = selfOpacityAnimatedCache.get(el);
        if (cached !== undefined) return cached;
        let animated = false;
        try {
          animated = el.getAnimations().some((other) => {
            const otherEffect = other.effect as KeyframeEffect | null;
            return otherEffect ? animatesOpacity(other, otherEffect) : false;
          });
        } catch {
          animated = false;
        }
        selfOpacityAnimatedCache.set(el, animated);
        return animated;
      };

      const cssWantsPaused = (el: Element, pseudo: string): boolean => {
        let byPseudo = apsCache.get(el);
        if (!byPseudo) {
          byPseudo = new Map();
          apsCache.set(el, byPseudo);
        }
        const cached = byPseudo.get(pseudo);
        if (cached !== undefined) return cached;
        const paused = getComputedStyle(el, pseudo || undefined)
          .animationPlayState.split(",")
          .some((state) => state.trim() === "paused");
        byPseudo.set(pseudo, paused);
        return paused;
      };
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const isHidden = (el: Element, ignoreSelfOpacity: boolean): boolean => {
        const cache = ignoreSelfOpacity
          ? visSelfOpacityExemptCache
          : visCache;
        const cached = cache.get(el);
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
            const opacityHides =
              !(ignoreSelfOpacity && node === el) &&
              parseFloat(s.opacity) === 0;
            if (
              s.display === "none" ||
              s.visibility === "hidden" ||
              opacityHides
            ) {
              hidden = true;
              break;
            }
            node = node.parentElement;
          }
        }
        cache.set(el, hidden);
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

        const isCssAnimation =
          typeof CSSAnimation !== "undefined" && anim instanceof CSSAnimation;
        const pseudo = effect.pseudoElement ?? "";

        // A cancelled animation (display:none cycle, element replaced) can
        // never run again — drop it from the bookkeeping so the sets stay
        // bounded.
        if (anim.playState === "idle") {
          pausedByUs.delete(anim);
          cssHeld.delete(anim);
          stickyOverridden.delete(anim);
          opacityAnimated.delete(anim);
          continue;
        }

        if (isHidden(target, selfOpacityIsAnimated(target))) {
          if (anim.playState === "running") {
            try {
              anim.pause();
              pausedByUs.add(anim);
            } catch {
              /* animation may be finishing/cancelled */
            }
          }
        } else if (anim.playState === "paused") {
          if (pausedByUs.has(anim) || cssHeld.has(anim)) {
            if (isCssAnimation && cssWantsPaused(target, pseudo)) {
              // A stylesheet is holding this one (e.g. the meter-panel
              // highlight policy) — resuming now would override that rule
              // for good. Park it until the rule lifts.
              pausedByUs.delete(anim);
              cssHeld.add(anim);
            } else {
              try {
                anim.play();
                stickyOverridden.add(anim);
              } catch {
                /* ignore */
              }
              pausedByUs.delete(anim);
              cssHeld.delete(anim);
            }
          }
        } else if (
          isCssAnimation &&
          anim.playState === "running" &&
          stickyOverridden.has(anim) &&
          cssWantsPaused(target, pseudo)
        ) {
          // Our earlier .play() left a sticky override that is now defeating
          // a stylesheet pause — reassert it, and remember to resume when
          // the rule lifts. Only override-carrying animations are scanned,
          // so this costs one style read per such animation per sweep, not
          // one per animation page-wide.
          try {
            anim.pause();
            cssHeld.add(anim);
          } catch {
            /* ignore */
          }
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
      // Hand every held animation back before dying — a Fast-Refresh
      // replacement instance cannot adopt them (its sets start empty), and
      // the sticky override means CSS could never resume them on its own.
      // The successor's first sweep re-pauses whatever is genuinely hidden.
      for (const anim of pausedByUs) {
        try {
          anim.play();
        } catch {
          /* ignore */
        }
      }
      for (const anim of cssHeld) {
        try {
          anim.play();
        } catch {
          /* ignore */
        }
      }
      pausedByUs.clear();
      cssHeld.clear();
      stickyOverridden.clear();
      opacityAnimated.clear();
    };
  }, []);

  return null;
}
