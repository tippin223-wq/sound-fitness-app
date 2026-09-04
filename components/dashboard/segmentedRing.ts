/**
 * Dash patterns for a progress ring drawn as one notch per prescribed unit —
 * set, rep, check, session — so 5 of 10 reads as five of ten notches lit
 * rather than a half-arc.
 *
 * Both patterns assume the circle has `pathLength={100}`, so the numbers are
 * percentages of the circumference. `track` repeats forever (every slot);
 * `filled` lists exactly the first `done` slots and then a gap longer than
 * the whole path, so nothing past them is drawn. Two circles, any count.
 */
export function getSegmentedRingDashes(done: number, total: number) {
  const count = Math.max(1, Math.min(120, Math.round(total)));
  const slot = 100 / count;
  // The gap scales down with the slot so dense rings stay mostly notch.
  const gap = Math.min(1.4, slot * 0.3);
  const notch = slot - gap;
  const lit = Math.max(0, Math.min(count, Math.round(done)));
  const pair = `${notch} ${gap}`;

  return {
    track: pair,
    filled:
      lit > 0
        ? `${Array.from({ length: lit }, () => pair).join(" ")} 0 1000`
        : "0 1000",
  };
}
