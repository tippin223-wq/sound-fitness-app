"use client";

import { useEffect } from "react";

const SNAP_SELECTOR = "[data-home-snap-section]";
const SCROLL_LOCK_MS = 680;
const WHEEL_THRESHOLD = 18;

export default function HomeScrollSnapManager() {
  useEffect(() => {
    const root = document.documentElement;
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(SNAP_SELECTOR),
    );

    if (sections.length === 0) {
      return;
    }

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const ratios = new Map<HTMLElement, number>();
    let activeSection: HTMLElement | null = null;
    let activeIndex = 0;
    let lockedUntil = 0;
    let releaseTimer = 0;

    const setActive = (section: HTMLElement) => {
      activeSection = section;
      activeIndex = sections.indexOf(section);

      sections.forEach((item) => {
        if (item === section) {
          item.setAttribute("data-home-snap-active", "true");
        } else {
          item.removeAttribute("data-home-snap-active");
        }
      });
    };

    const isAtPageEnd = () =>
      Math.ceil(window.scrollY + window.innerHeight) >=
      document.documentElement.scrollHeight - 4;

    const chooseNearest = () => {
      if (isAtPageEnd()) {
        setActive(sections[sections.length - 1]);
        return activeIndex;
      }

      const viewportCenter = window.innerHeight / 2;
      let nearestSection = sections[0];
      let nearestDistance = Number.POSITIVE_INFINITY;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const distance = Math.abs(sectionCenter - viewportCenter);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSection = section;
        }
      });

      setActive(nearestSection);
      return activeIndex;
    };

    const chooseMostVisible = () => {
      if (isAtPageEnd()) {
        setActive(sections[sections.length - 1]);
        return;
      }

      let nextSection: HTMLElement | null = null;
      let bestRatio = 0;

      sections.forEach((section) => {
        const ratio = ratios.get(section) ?? 0;

        if (ratio > bestRatio) {
          bestRatio = ratio;
          nextSection = section;
        }
      });

      if (nextSection) {
        setActive(nextSection);
        return;
      }

      chooseNearest();
    };

    chooseNearest();
    root.classList.add("home-scroll-snap-enabled");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target instanceof HTMLElement) {
            ratios.set(entry.target, entry.intersectionRatio);
          }
        });

        chooseMostVisible();
      },
      {
        root: null,
        rootMargin: "-16% 0px -28% 0px",
        threshold: [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84],
      },
    );

    sections.forEach((section) => observer.observe(section));

    const releaseScrollLock = () => {
      lockedUntil = 0;
      chooseNearest();
    };

    const scrollToSection = (index: number) => {
      const section = sections[index];

      if (!section) {
        return;
      }

      const sectionName = section.dataset.homeSnapSection;

      setActive(section);
      section.scrollIntoView({
        behavior: reducedMotionQuery.matches ? "auto" : "smooth",
        block: sectionName === "top" ? "start" : "center",
      });
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || reducedMotionQuery.matches) {
        return;
      }

      const x = Math.abs(event.deltaX);
      const y = Math.abs(event.deltaY);

      if (y < WHEEL_THRESHOLD || x > y) {
        return;
      }

      const direction = event.deltaY > 0 ? 1 : -1;
      const now = window.performance.now();

      if (now < lockedUntil) {
        event.preventDefault();
        return;
      }

      const currentIndex =
        activeSection && sections.includes(activeSection)
          ? activeIndex
          : chooseNearest();
      const nextIndex = currentIndex + direction;

      if (nextIndex < 0 || nextIndex >= sections.length) {
        return;
      }

      event.preventDefault();
      lockedUntil = now + SCROLL_LOCK_MS;
      scrollToSection(nextIndex);

      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(releaseScrollLock, SCROLL_LOCK_MS);
    };

    const onResize = () => chooseNearest();

    document.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });

    return () => {
      observer.disconnect();
      document.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.clearTimeout(releaseTimer);
      sections.forEach((section) =>
        section.removeAttribute("data-home-snap-active"),
      );
      root.classList.remove("home-scroll-snap-enabled");
    };
  }, []);

  return null;
}
