/** Both startup screens share one animation clock, so replacing account loading
 * with WebGL loading continues the same breath instead of starting over. */
export function syncPreloaderAura(element: HTMLDivElement | null) {
  if (!element) return;
  const duration = 4800;
  element.style.setProperty("--crest-aura-duration", `${duration}ms`);
  element.style.setProperty("--crest-aura-delay", `${-(performance.now() % duration)}ms`);
}
