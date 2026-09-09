type Box = { left: number; right: number; top: number; bottom: number };

export const HEADER_EXERCISE_GAP = 14;

export function exerciseHasClearance(box: Box, viewport: Box, obstacles: Box[], gap = HEADER_EXERCISE_GAP) {
  return box.left >= viewport.left + gap && box.right <= viewport.right - gap &&
    box.top >= viewport.top && box.bottom <= viewport.bottom &&
    obstacles.every(other => box.right + gap <= other.left || box.left - gap >= other.right ||
      box.bottom + gap <= other.top || box.top - gap >= other.bottom);
}

// Include overflowing labels, not just the narrow stick figure's layout box.
function paintedBounds(elements: Element[]): Box | null {
  const boxes = elements.map(element => element.getBoundingClientRect()).filter(box => box.width && box.height);
  return boxes.length ? {
    left: Math.min(...boxes.map(box => box.left)), right: Math.max(...boxes.map(box => box.right)),
    top: Math.min(...boxes.map(box => box.top)), bottom: Math.max(...boxes.map(box => box.bottom)),
  } : null;
}

function textRightEdge(element: Element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let edge = element.getBoundingClientRect().left;
  while (walker.nextNode()) {
    if (!walker.currentNode.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(walker.currentNode);
    edge = Math.max(edge, range.getBoundingClientRect().right);
  }
  return edge;
}

export function watchHeaderExerciseClearance(shell: HTMLElement) {
  let disposed = false;
  let openFitKey = "";
  let fitsOpenHeader = false;
  const measure = () => {
    if (disposed || document.hidden) return;
    const dock = shell.querySelector<HTMLElement>(".dashboard-header-selector-category-dock");
    const title = shell.querySelector<HTMLElement>(".dashboard-header-selector-copy");
    if (!dock || !title) return;
    const fitKey = `${document.documentElement.clientWidth}|${window.innerHeight}|${title.textContent}|${dock.textContent}`;
    // A shrunken idle pose cannot prove the figure fits at its working size.
    // Hide until this viewport/title/category has passed a settled OPEN fit.
    // Do not replace that result with intermediate expansion/collapse geometry.
    if (shell.dataset.headerTransitioning === "true") {
      dock.dataset.exerciseHidden = "true";
      return;
    }
    const pieces = Array.from(dock.querySelectorAll(".dashboard-header-category-actor__figure, .dashboard-header-category-actor__label, .dashboard-header-category-actor__level"));
    let bounds = paintedBounds(pieces);
    const dockBox = dock.getBoundingClientRect();
    if (!bounds || !dockBox.width || !dock.offsetWidth) return;

    // The decoration does not participate in navigation sizing. Anchor its
    // *complete* silhouette (including the longest text) after the title.
    const scale = dockBox.width / dock.offsetWidth;
    const dx = textRightEdge(title) + HEADER_EXERCISE_GAP - bounds.left;
    const previous = Number.parseFloat(dock.style.getPropertyValue("--exercise-offset-x")) || 0;
    const next = Math.round((previous + dx / scale) * 100) / 100;
    if (Math.abs(next - previous) > 0.25) {
      dock.style.setProperty("--exercise-offset-x", `${next}px`);
      bounds = { ...bounds, left: bounds.left + dx, right: bounds.right + dx };
    }
    const obstacles = Array.from(shell.querySelectorAll<HTMLElement>("button, a, [role='button'], .dashboard-header-news-chyron"))
      .filter(element => element !== title && !dock.contains(element) && !element.contains(dock) &&
        element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
      .map(element => element.getBoundingClientRect()).filter(box => box.width && box.height);
    const shellBox = shell.getBoundingClientRect();
    const clear = exerciseHasClearance(bounds, {
      left: Math.max(0, shellBox.left), right: Math.min(document.documentElement.clientWidth, shellBox.right),
      top: Math.max(0, shellBox.top), bottom: Math.min(window.innerHeight, shellBox.bottom),
    }, obstacles);
    if (shell.dataset.headerFocus === "header" &&
      title.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
      openFitKey = fitKey;
      fitsOpenHeader = clear;
    }
    const nextHidden = clear && fitsOpenHeader && openFitKey === fitKey ? "false" : "true";
    if (dock.dataset.exerciseHidden !== nextHidden) dock.dataset.exerciseHidden = nextHidden;
  };
  const frame = requestAnimationFrame(measure);
  // Covers the existing animated/scaled header and rotating category labels
  // without React renders or observing our own style writes. Hidden elements
  // retain measurable geometry, so they can reappear without a layout loop.
  const timer = window.setInterval(measure, 150);
  window.addEventListener("resize", measure);
  document.fonts.ready.then(measure);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.clearInterval(timer);
    window.removeEventListener("resize", measure);
  };
}
