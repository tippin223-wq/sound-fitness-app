"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
  useRef,
} from "react";
import styles from "./ProfileHero.module.css";

type ProfileHeroPillRailProps = {
  accent?: "cyan" | "orange";
  children: ReactNode;
  label: string;
  singleItem?: boolean;
};

export default function ProfileHeroPillRail({
  accent = "cyan",
  label,
  children,
  singleItem = false,
}: ProfileHeroPillRailProps) {
  const track = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const markClosestPill = (element: HTMLDivElement) => {
    const pills = Array.from(element.children) as HTMLElement[];
    if (!pills.length) return;

    const trackCenter = element.scrollLeft + element.clientWidth / 2;
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    let closestIndex =
      element.scrollLeft <= 1
        ? 0
        : element.scrollLeft >= maxScroll - 1
          ? pills.length - 1
          : 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    if (element.scrollLeft > 1 && element.scrollLeft < maxScroll - 1) {
      pills.forEach((pill, index) => {
        const pillCenter = pill.offsetLeft + pill.offsetWidth / 2;
        const distance = Math.abs(pillCenter - trackCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
    }
    pills.forEach((pill, index) => {
      pill.dataset.profilePillHighlighted =
        index === closestIndex ? "true" : "false";
    });
  };
  const step = (direction: number) => {
    const element = track.current;
    if (!element) return;
    element.scrollBy({
      left: direction * Math.max(120, element.clientWidth * 0.75),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  const highlightedChildren = Children.map(children, (child, index) =>
    isValidElement<Record<string, unknown>>(child)
      ? cloneElement(child, {
          "data-profile-pill-highlighted": index === 0 ? "true" : "false",
        })
      : child,
  );

  if (singleItem) {
    const singleItemChildren = items.map((child, index) =>
      isValidElement<Record<string, unknown>>(child)
        ? cloneElement(child, {
            "data-profile-pill-active": index === 0 ? "true" : "false",
            "data-profile-pill-highlighted": index === 0 ? "true" : "false",
            hidden: index !== 0,
          })
        : child,
    );
    const showNextItem = () => {
      const element = track.current;
      if (!element) return;
      const pills = Array.from(element.children) as HTMLElement[];
      if (!pills.length) return;
      const currentIndex = Math.max(0, pills.findIndex((pill) => pill.dataset.profilePillActive === "true"));
      const nextIndex = (currentIndex + 1) % pills.length;
      pills.forEach((pill, index) => {
        const isActive = index === nextIndex;
        pill.hidden = !isActive;
        pill.dataset.profilePillActive = isActive ? "true" : "false";
        pill.dataset.profilePillHighlighted = isActive ? "true" : "false";
      });
    };

    return (
      <div
        className={styles.rail}
        data-profile-pill-accent={accent}
        data-profile-pill-mode="single"
        data-profile-pill-rail={label}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label={`Show next ${label}`}
          onClick={showNextItem}
        >
          ›
        </button>
        <div className={styles.track} ref={track} role="status" aria-live="polite" aria-label={label}>
          {singleItemChildren}
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.rail}
      data-profile-pill-accent={accent}
      data-profile-pill-rail={label}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        event.stopPropagation();
        step(event.key === "ArrowRight" ? 1 : -1);
      }}
    >
      <button
        type="button"
        aria-label={`Scroll ${label} left`}
        onClick={() => step(-1)}
      >
        ‹
      </button>
      <div
        className={styles.track}
        ref={track}
        role="region"
        aria-label={label}
        tabIndex={0}
        onScroll={(event) => markClosestPill(event.currentTarget)}
      >
        {highlightedChildren}
      </div>
      <button
        type="button"
        aria-label={`Scroll ${label} right`}
        onClick={() => step(1)}
      >
        ›
      </button>
    </div>
  );
}
