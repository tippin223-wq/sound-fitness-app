import type { WebGLRenderer, WebGLRendererParameters } from "three";

type ThreeModule = typeof import("three");

let dashboardThreePromise: Promise<ThreeModule> | null = null;
let dashboardWebGlPreloadPromise: Promise<boolean> | null = null;
let dashboardWebGlStartQueue: Promise<void> = Promise.resolve();

const DASHBOARD_WEBGL_STILL_DELAY_MS = 980;
const DASHBOARD_WEBGL_AUTO_STILL_ENABLED = true;
const DASHBOARD_WEBGL_RELEASE_STILL_CONTEXT_ENABLED = false;
const DASHBOARD_WEBGL_WAKE_HOLD_MS = 1400;
const DASHBOARD_WEBGL_START_SPACING_MS = 80;
const DASHBOARD_WEBGL_DEFAULT_RENDERER_BUDGET = 8;
const DASHBOARD_WEBGL_LOW_POWER_RENDERER_BUDGET = 5;
const DASHBOARD_WEBGL_BUDGET_WAIT_MS = 900;
const DASHBOARD_WEBGL_PRIORITY_BUDGET_WAIT_MS = 1800;
const DASHBOARD_WEBGL_SNAPSHOT_SPACING_MS = 70;
const DASHBOARD_WEBGL_SNAPSHOT_CLASS = "dashboard-webgl-snapshot-layer";
const DASHBOARD_WEBGL_SNAPSHOT_STORAGE_PREFIX = "dashboard-webgl-snapshot:";
const DASHBOARD_WEBGL_MIN_SNAPSHOT_URL_LENGTH = 1800;
export const DASHBOARD_WEBGL_IMAGE_MODE_EVENT =
  "sound-fitness-dashboard-webgl-image-mode-change";
export const DASHBOARD_WEBGL_IMAGE_MODE_STORAGE_KEY =
  "sound-fitness-dashboard-webgl-image-mode";
const DASHBOARD_PRIORITY_WEBGL_RETRY_DELAYS_MS = [320, 900, 1800, 3600, 7200];
const DASHBOARD_WEBGL_SNAPSHOT_DATASET_KEYS = [
  "basketballRenderer",
  "categoryUfoRenderer",
  "dashboardDumbbellRenderer",
  "dashboardFeatureRowIconRenderer",
  "dashboardGearIconRenderer",
  "dashboardProfileIconRenderer",
  "dashboardRealLifeIconRenderer",
  "dashboardScrollButtonRenderer",
  "dashboardSparklesRenderer",
  "lightningBoltRenderer",
  "logoRenderer",
  "marketingCtaRenderer",
  "meterMenuIconRenderer",
  "phoneRenderer",
  "soundCoinRenderer",
  "soundPointsTeslaRenderer",
  "stepNumberRenderer",
  "tornadoRenderer",
  "treasureChestRenderer",
  "trophyRenderer",
  "whistleRenderer",
] as const;

const dashboardWebGlActiveRenderers = new Set<WebGLRenderer>();
const dashboardWebGlBudgetWaiters: {
  resolve: () => void;
  timeoutId: ReturnType<typeof globalThis.setTimeout>;
}[] = [];
let dashboardWebGlLastSnapshotCaptureAt = 0;

/**
 * Every dashboard 3D component runs its own requestAnimationFrame loop that
 * calls renderer.render() every frame — even while the canvas is scrolled far
 * off-screen. On a page with dozens of canvases that is a lot of wasted GPU
 * work. A single shared IntersectionObserver marks each canvas on/off-screen
 * (dataset flag), and the wrapped render() below skips the GL draw entirely
 * while it is off-screen. The rAF loop keeps spinning cheaply and resumes
 * drawing the instant the canvas scrolls back into view, so there is no visible
 * change — only fewer draws for things you cannot see. A generous rootMargin
 * pre-warms canvases just before they enter the viewport.
 */
const DASHBOARD_WEBGL_VISIBILITY_ROOT_MARGIN = "240px";

// Backing-buffer area budget (device pixels) used to decide how much a scene
// may supersample. Small icons (rewards gems, coins, header marks) stay well
// under this even at a high pixel ratio, so they keep their crisp supersampled
// quality; only large scene canvases — where supersampling is the real
// fragment-shading cost — get clamped toward native density.
const DASHBOARD_WEBGL_PIXEL_BUDGET = 90_000;
let dashboardWebGlVisibilityObserver: IntersectionObserver | null = null;

function getDashboardWebGlVisibilityObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;

  dashboardWebGlVisibilityObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const canvas = entry.target as HTMLCanvasElement;
        if (entry.isIntersecting) {
          delete canvas.dataset.dashboardWebglOffscreen;
        } else {
          canvas.dataset.dashboardWebglOffscreen = "true";
        }
      }
    },
    { rootMargin: DASHBOARD_WEBGL_VISIBILITY_ROOT_MARGIN },
  );

  return dashboardWebGlVisibilityObserver;
}

export const loadDashboardThree = () => {
  dashboardThreePromise ??= import("three");
  return dashboardThreePromise;
};

function getDashboardWebGlRendererBudget() {
  if (typeof window === "undefined") {
    return DASHBOARD_WEBGL_DEFAULT_RENDERER_BUDGET;
  }

  const deviceMemory =
    "deviceMemory" in navigator && typeof navigator.deviceMemory === "number"
      ? navigator.deviceMemory
      : null;
  const lowPowerDevice =
    window.matchMedia("(max-width: 767px)").matches ||
    (deviceMemory !== null && deviceMemory <= 4) ||
    navigator.hardwareConcurrency <= 4;

  return lowPowerDevice
    ? DASHBOARD_WEBGL_LOW_POWER_RENDERER_BUDGET
    : DASHBOARD_WEBGL_DEFAULT_RENDERER_BUDGET;
}

function syncDashboardWebGlBudgetState() {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.dashboardWebglActiveRenderers = String(
    dashboardWebGlActiveRenderers.size,
  );
  document.documentElement.dataset.dashboardWebglRendererBudget = String(
    getDashboardWebGlRendererBudget(),
  );
}

/**
 * Decorative canvases may not take the last slot in the budget — it's held for
 * callers that ask with `priority` (brand marks: the header wordmark, the
 * dashboard logo). Without this, whoever mounts first wins, and a page with
 * enough decoration starves the logo into its flat-text fallback.
 */
const DASHBOARD_WEBGL_PRIORITY_RESERVED_SLOTS = 1;

function hasDashboardWebGlRendererCapacity(priority = false) {
  const budget = getDashboardWebGlRendererBudget();
  const limit = priority
    ? budget
    : Math.max(1, budget - DASHBOARD_WEBGL_PRIORITY_RESERVED_SLOTS);

  return dashboardWebGlActiveRenderers.size < limit;
}

function resolveNextDashboardWebGlBudgetWaiter() {
  if (!hasDashboardWebGlRendererCapacity()) return;

  const waiter = dashboardWebGlBudgetWaiters.shift();
  if (!waiter) return;

  globalThis.clearTimeout(waiter.timeoutId);
  waiter.resolve();
}

function waitForDashboardWebGlRendererCapacity(priority: boolean) {
  if (hasDashboardWebGlRendererCapacity(priority)) {
    syncDashboardWebGlBudgetState();
    return Promise.resolve();
  }

  const timeoutMs = priority
    ? DASHBOARD_WEBGL_PRIORITY_BUDGET_WAIT_MS
    : DASHBOARD_WEBGL_BUDGET_WAIT_MS;

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      const index = dashboardWebGlBudgetWaiters.findIndex(
        (waiter) => waiter.resolve === finish,
      );
      if (index >= 0) {
        dashboardWebGlBudgetWaiters.splice(index, 1);
      }
      syncDashboardWebGlBudgetState();
      resolve();
    };
    const timeoutId = globalThis.setTimeout(finish, timeoutMs);

    if (priority) {
      dashboardWebGlBudgetWaiters.unshift({ resolve: finish, timeoutId });
    } else {
      dashboardWebGlBudgetWaiters.push({ resolve: finish, timeoutId });
    }
  });
}

function trackDashboardWebGlRenderer(
  renderer: WebGLRenderer,
  canvas: HTMLCanvasElement,
) {
  let released = false;
  dashboardWebGlActiveRenderers.add(renderer);
  delete canvas.dataset.webglBudgetDeferred;
  syncDashboardWebGlBudgetState();

  return () => {
    if (released) return;

    released = true;
    dashboardWebGlActiveRenderers.delete(renderer);
    delete canvas.dataset.webglBudgetDeferred;
    syncDashboardWebGlBudgetState();
    resolveNextDashboardWebGlBudgetWaiter();
  };
}

export const isDashboardWebGlImageModeEnabled = () => {
  if (typeof document === "undefined") return false;

  return document.documentElement.dataset.dashboardWebglImageMode === "still";
};

export const setDashboardWebGlImageMode = (enabled: boolean) => {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.dashboardWebglImageMode = enabled
    ? "still"
    : "live";

  try {
    window.localStorage.setItem(
      DASHBOARD_WEBGL_IMAGE_MODE_STORAGE_KEY,
      enabled ? "still" : "live",
    );
  } catch {
    // Render mode persistence is best-effort.
  }

  window.dispatchEvent(
    new CustomEvent(DASHBOARD_WEBGL_IMAGE_MODE_EVENT, {
      detail: { enabled },
    }),
  );
};

export const syncDashboardWebGlImageModeFromStorage = () => {
  if (typeof document === "undefined") return false;

  let enabled = false;
  try {
    enabled =
      window.localStorage.getItem(DASHBOARD_WEBGL_IMAGE_MODE_STORAGE_KEY) ===
      "still";
  } catch {
    enabled = false;
  }

  document.documentElement.dataset.dashboardWebglImageMode = enabled
    ? "still"
    : "live";

  return enabled;
};

export const markDashboardWebGlFallback = (canvas: HTMLCanvasElement) => {
  canvas.dataset.webglFallback = "true";
  delete canvas.dataset.webglReady;
  delete canvas.dataset.dashboardWebglActive;
  delete canvas.dataset.dashboardWebglStill;
  delete canvas.dataset.dashboardWebglStillPending;
  delete canvas.dataset.dashboardWebglSnapshotQueued;
  delete canvas.dataset.webglContext;
  syncDashboardWebGlChildReady(canvas, false);

  if (shouldSuppressDashboardWebGlFallbackSnapshot(canvas)) {
    removeDashboardWebGlCachedSnapshot(canvas);
    cleanupDashboardWebGlSnapshotArtifacts(canvas);
    return;
  }

  restoreDashboardWebGlCachedSnapshot(canvas);
  setDashboardWebGlSnapshotVisible(canvas, true);
};

export const clearDashboardWebGlFallback = (canvas: HTMLCanvasElement) => {
  delete canvas.dataset.webglFallback;
  setDashboardWebGlSnapshotVisible(canvas, false);
};

export const wakeDashboardWebGlCanvas = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return;
  if (isDashboardWebGlImageModeEnabled()) return;

  delete canvas.dataset.dashboardWebglStill;
  delete canvas.dataset.dashboardWebglStillPending;
  setDashboardWebGlSnapshotVisible(canvas, false);
};

export const setDashboardWebGlCanvasActive = (
  canvas: HTMLCanvasElement | null,
  active: boolean,
) => {
  if (!canvas) return;

  if (active) {
    canvas.dataset.dashboardWebglActive = "true";
  } else {
    delete canvas.dataset.dashboardWebglActive;
  }

  if (isDashboardWebGlImageModeEnabled()) return;

  wakeDashboardWebGlCanvas(canvas);
};

export const waitForDashboardPriorityWebGlRetry = (attempt: number) =>
  new Promise<void>((resolve) => {
    const delay =
      DASHBOARD_PRIORITY_WEBGL_RETRY_DELAYS_MS[
        Math.min(attempt, DASHBOARD_PRIORITY_WEBGL_RETRY_DELAYS_MS.length - 1)
      ] ?? DASHBOARD_PRIORITY_WEBGL_RETRY_DELAYS_MS[0];

    window.setTimeout(resolve, delay);
  });

function getDashboardWebGlSnapshotLayer(canvas: HTMLCanvasElement) {
  const parent = canvas.parentElement;
  if (!parent) return null;

  return parent.querySelector<HTMLImageElement>(
    `:scope > .${DASHBOARD_WEBGL_SNAPSHOT_CLASS}`,
  );
}

function getDashboardWebGlSnapshotCacheKey(canvas: HTMLCanvasElement) {
  const explicitKey = canvas.dataset.dashboardWebglSnapshotKey;
  if (explicitKey) return explicitKey;

  for (const key of DASHBOARD_WEBGL_SNAPSHOT_DATASET_KEYS) {
    const value = canvas.dataset[key];
    if (value) return `${key}:${value}`;
  }

  for (const [key, value] of Object.entries(canvas.dataset)) {
    if (!value || key === "webglContext") continue;
    if (key.endsWith("Renderer")) return `${key}:${value}`;
  }

  const className =
    typeof canvas.className === "string" ? canvas.className.trim() : "";
  if (className) {
    return className.split(/\s+/)[0] ?? "";
  }

  return canvas.dataset.webglContext || "";
}

function readDashboardWebGlCachedSnapshot(canvas: HTMLCanvasElement) {
  if (typeof window === "undefined") return "";

  const cacheKey = getDashboardWebGlSnapshotCacheKey(canvas);
  if (!cacheKey) return "";

  try {
    return (
      window.sessionStorage.getItem(
        `${DASHBOARD_WEBGL_SNAPSHOT_STORAGE_PREFIX}${cacheKey}`,
      ) || ""
    );
  } catch {
    return "";
  }
}

function removeDashboardWebGlCachedSnapshot(canvas: HTMLCanvasElement) {
  if (typeof window === "undefined") return;

  const cacheKey = getDashboardWebGlSnapshotCacheKey(canvas);
  if (!cacheKey) return;

  try {
    window.sessionStorage.removeItem(
      `${DASHBOARD_WEBGL_SNAPSHOT_STORAGE_PREFIX}${cacheKey}`,
    );
  } catch {
    // Snapshot cache cleanup is best-effort.
  }
}

function shouldSuppressDashboardWebGlFallbackSnapshot(canvas: HTMLCanvasElement) {
  return (
    canvas.dataset.logoRenderer === "three" ||
    canvas.dataset.trophyRenderer === "three"
  );
}

function writeDashboardWebGlCachedSnapshot(
  canvas: HTMLCanvasElement,
  snapshotUrl: string,
) {
  if (typeof window === "undefined") return;

  const cacheKey = getDashboardWebGlSnapshotCacheKey(canvas);
  if (
    !cacheKey ||
    !snapshotUrl.startsWith("data:image/png;base64,") ||
    snapshotUrl.length < DASHBOARD_WEBGL_MIN_SNAPSHOT_URL_LENGTH
  ) {
    removeDashboardWebGlCachedSnapshot(canvas);
    return;
  }

  try {
    window.sessionStorage.setItem(
      `${DASHBOARD_WEBGL_SNAPSHOT_STORAGE_PREFIX}${cacheKey}`,
      snapshotUrl,
    );
  } catch {
    // Snapshot cache is best-effort; a full storage bucket should not break UI.
  }
}

function ensureDashboardWebGlSnapshotLayer(canvas: HTMLCanvasElement) {
  const parent = canvas.parentElement;
  if (!parent) return null;

  let layer = getDashboardWebGlSnapshotLayer(canvas);
  if (!layer) {
    layer = document.createElement("img");
    layer.alt = "";
    layer.setAttribute("aria-hidden", "true");
    layer.className = DASHBOARD_WEBGL_SNAPSHOT_CLASS;
    layer.decoding = "async";
    layer.draggable = false;
    layer.onerror = () => {
      removeDashboardWebGlCachedSnapshot(canvas);
      delete layer?.dataset.dashboardWebglSnapshotValid;
      layer?.removeAttribute("src");
      setDashboardWebGlSnapshotVisible(canvas, false);
    };
    parent.appendChild(layer);
  }

  parent.classList.add("dashboard-webgl-snapshot-host");
  parent.dataset.dashboardWebglSnapshot = "true";
  canvas.dataset.dashboardWebglSnapshot = "true";
  return layer;
}

function setDashboardWebGlSnapshotVisible(
  canvas: HTMLCanvasElement,
  visible: boolean,
) {
  const parent = canvas.parentElement;
  const layer = getDashboardWebGlSnapshotLayer(canvas);
  if (!parent || !layer) return;

  if (visible) {
    const snapshotSource = layer.getAttribute("src") || "";
    if (
      layer.dataset.dashboardWebglSnapshotValid !== "true" ||
      !snapshotSource.startsWith("data:image/")
    ) {
      cleanupDashboardWebGlSnapshotArtifacts(canvas);
      return;
    }

    canvas.dataset.dashboardWebglSnapshotVisible = "true";
    parent.dataset.dashboardWebglSnapshotVisible = "true";
    return;
  }

  delete canvas.dataset.dashboardWebglSnapshotVisible;
  delete parent.dataset.dashboardWebglSnapshotVisible;
}

function setDashboardWebGlReleasedSnapshotStyles(
  canvas: HTMLCanvasElement,
  released: boolean,
) {
  const layer = getDashboardWebGlSnapshotLayer(canvas);

  if (released) {
    canvas.style.setProperty("opacity", "0", "important");
    canvas.style.setProperty("visibility", "hidden", "important");
    if (layer) {
      layer.style.setProperty("opacity", "1", "important");
      layer.style.setProperty("visibility", "visible", "important");
    }
    return;
  }

  canvas.style.removeProperty("opacity");
  canvas.style.removeProperty("visibility");
  layer?.style.removeProperty("opacity");
  layer?.style.removeProperty("visibility");
}

function positionDashboardWebGlSnapshotLayer(
  canvas: HTMLCanvasElement,
  layer: HTMLElement,
) {
  const parent = canvas.parentElement;
  if (!parent) return;

  const parentStyle = window.getComputedStyle(parent);
  if (parentStyle.position === "static") {
    parent.dataset.dashboardWebglSnapshotPositioned = "true";
    parent.style.position = "relative";
  }

  const canvasRect = canvas.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  layer.style.height = `${Math.max(1, canvasRect.height)}px`;
  layer.style.left = `${canvasRect.left - parentRect.left}px`;
  layer.style.top = `${canvasRect.top - parentRect.top}px`;
  layer.style.width = `${Math.max(1, canvasRect.width)}px`;
}

function captureDashboardWebGlSnapshot(
  canvas: HTMLCanvasElement,
  force = false,
) {
  const parent = canvas.parentElement;
  if (!parent || canvas.width <= 0 || canvas.height <= 0) return false;

  if (!force && canvas.dataset.dashboardWebglSnapshot === "true") {
    const existingLayer = getDashboardWebGlSnapshotLayer(canvas);
    const existingSnapshotSource = existingLayer?.getAttribute("src") || "";
    if (
      existingLayer &&
      existingLayer.dataset.dashboardWebglSnapshotValid === "true" &&
      existingSnapshotSource.startsWith("data:image/")
    ) {
      positionDashboardWebGlSnapshotLayer(canvas, existingLayer);
      return true;
    }
  }

  const now = performance.now();
  if (
    now - dashboardWebGlLastSnapshotCaptureAt <
    DASHBOARD_WEBGL_SNAPSHOT_SPACING_MS
  ) {
    canvas.dataset.dashboardWebglSnapshotQueued = "true";
    return false;
  }

  dashboardWebGlLastSnapshotCaptureAt = now;
  delete canvas.dataset.dashboardWebglSnapshotQueued;

  let snapshotUrl = "";
  try {
    snapshotUrl = canvas.toDataURL("image/png");
  } catch {
    return false;
  }

  if (
    !snapshotUrl ||
    snapshotUrl === "data:," ||
    snapshotUrl.length < DASHBOARD_WEBGL_MIN_SNAPSHOT_URL_LENGTH
  ) {
    removeDashboardWebGlCachedSnapshot(canvas);
    return false;
  }

  const layer = ensureDashboardWebGlSnapshotLayer(canvas);
  if (!layer) return false;

  layer.src = snapshotUrl;
  layer.dataset.dashboardWebglSnapshotValid = "true";
  positionDashboardWebGlSnapshotLayer(canvas, layer);
  writeDashboardWebGlCachedSnapshot(canvas, snapshotUrl);
  return true;
}

function restoreDashboardWebGlCachedSnapshot(canvas: HTMLCanvasElement) {
  const snapshotUrl = readDashboardWebGlCachedSnapshot(canvas);
  if (!snapshotUrl) return false;
  if (
    !snapshotUrl.startsWith("data:image/png;base64,") ||
    snapshotUrl.length < DASHBOARD_WEBGL_MIN_SNAPSHOT_URL_LENGTH
  ) {
    removeDashboardWebGlCachedSnapshot(canvas);
    return false;
  }

  const layer = ensureDashboardWebGlSnapshotLayer(canvas);
  if (!layer) return false;

  layer.src = snapshotUrl;
  layer.dataset.dashboardWebglSnapshotValid = "true";
  positionDashboardWebGlSnapshotLayer(canvas, layer);
  return true;
}

function cleanupDashboardWebGlSnapshotArtifacts(canvas: HTMLCanvasElement) {
  const parent = canvas.parentElement;
  if (!parent) return;

  parent
    .querySelectorAll(`:scope > .${DASHBOARD_WEBGL_SNAPSHOT_CLASS}`)
    .forEach((layer) => layer.remove());

  if (parent.dataset.dashboardWebglSnapshotPositioned === "true") {
    parent.style.removeProperty("position");
  }

  parent.classList.remove("dashboard-webgl-snapshot-host");
  delete parent.dataset.dashboardWebglSnapshot;
  delete parent.dataset.dashboardWebglSnapshotPositioned;
  delete parent.dataset.dashboardWebglSnapshotReleased;
  delete parent.dataset.dashboardWebglSnapshotVisible;
  delete canvas.dataset.dashboardWebglSnapshotReleased;
  delete canvas.dataset.dashboardWebglSnapshotVisible;
  delete canvas.dataset.dashboardWebglSnapshotQueued;
  delete canvas.dataset.dashboardWebglSnapshot;
  setDashboardWebGlReleasedSnapshotStyles(canvas, false);
}

function syncDashboardWebGlChildReady(canvas: HTMLCanvasElement, ready: boolean) {
  const parent = canvas.parentElement;
  if (!parent) return;

  if (ready) {
    parent.dataset.dashboardWebglChildReady = "true";
    return;
  }

  if (!parent.querySelector('canvas[data-webgl-ready="true"]')) {
    delete parent.dataset.dashboardWebglChildReady;
  }
}

const attachDashboardWebGlSnapshotCapture = (
  renderer: WebGLRenderer,
  canvas: HTMLCanvasElement,
  releaseRendererSlot: () => void,
) => {
  const originalRender = renderer.render.bind(renderer);
  const originalDispose = renderer.dispose.bind(renderer);
  const originalForceContextLoss = renderer.forceContextLoss.bind(renderer);
  const originalSetSize = renderer.setSize.bind(renderer);
  let stillTimeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  let releasedStillContext = false;
  let wakeUntil = 0;

  const shouldStayLive = () => canvas.dataset.dashboardWebglActive === "true";

  const clearStillTimeout = () => {
    if (stillTimeoutId === null) return;

    globalThis.clearTimeout(stillTimeoutId);
    stillTimeoutId = null;
  };

  const requestStillSnapshot = () => {
    if (!DASHBOARD_WEBGL_AUTO_STILL_ENABLED) {
      clearStillTimeout();
      return;
    }

    const imageMode = isDashboardWebGlImageModeEnabled();
    if (
      (!imageMode && shouldStayLive()) ||
      canvas.dataset.dashboardWebglStill === "true" ||
      canvas.dataset.dashboardWebglStillPending === "true"
    ) {
      return;
    }

    if (stillTimeoutId !== null) return;

    stillTimeoutId = globalThis.setTimeout(() => {
      stillTimeoutId = null;
      if (
        !isDashboardWebGlImageModeEnabled() &&
        (shouldStayLive() || performance.now() < wakeUntil)
      ) {
        requestStillSnapshot();
        return;
      }

      canvas.dataset.dashboardWebglStillPending = "true";
    }, DASHBOARD_WEBGL_STILL_DELAY_MS);
  };

  const wakeLiveCanvas = () => {
    if (isDashboardWebGlImageModeEnabled()) {
      clearStillTimeout();
      canvas.dataset.dashboardWebglStillPending = "true";
      return;
    }

    if (releasedStillContext) {
      setDashboardWebGlSnapshotVisible(canvas, true);
      return;
    }

    wakeUntil = performance.now() + DASHBOARD_WEBGL_WAKE_HOLD_MS;
    clearStillTimeout();
    wakeDashboardWebGlCanvas(canvas);
    requestStillSnapshot();
  };

  const releaseStillContext = () => {
    if (
      releasedStillContext ||
      shouldStayLive() ||
      canvas.dataset.dashboardWebglStill !== "true" ||
      canvas.dataset.webglFallback === "true"
    ) {
      return;
    }

    const layer = getDashboardWebGlSnapshotLayer(canvas);
    const snapshotSource = layer?.getAttribute("src") || "";
    if (
      !layer ||
      layer.dataset.dashboardWebglSnapshotValid !== "true" ||
      !snapshotSource.startsWith("data:image/")
    ) {
      return;
    }

    releasedStillContext = true;
    clearStillTimeout();
    canvas.dataset.dashboardWebglSnapshotReleased = "true";
    if (canvas.parentElement) {
      canvas.parentElement.dataset.dashboardWebglSnapshotReleased = "true";
    }
    setDashboardWebGlSnapshotVisible(canvas, true);
    setDashboardWebGlReleasedSnapshotStyles(canvas, true);
    try {
      originalForceContextLoss();
    } catch {
      // Some browsers may reject forced loss after a context has already gone.
    }
    originalDispose();
    releaseRendererSlot();
  };

  const interactiveTarget = canvas.parentElement ?? canvas;
  interactiveTarget.addEventListener("pointerenter", wakeLiveCanvas, {
    passive: true,
  });
  interactiveTarget.addEventListener("pointerdown", wakeLiveCanvas, {
    passive: true,
  });
  interactiveTarget.addEventListener("focusin", wakeLiveCanvas);

  // Pause GL draws while this canvas is scrolled out of view (see the wrapped
  // render() above and the shared observer at the top of this module).
  const visibilityObserver = getDashboardWebGlVisibilityObserver();
  visibilityObserver?.observe(canvas);

  // Context-loss recovery. Browsers reclaim WebGL contexts as they accumulate
  // over a session; without preventDefault() a reclaimed context is gone for
  // good and the scene "times out" into a permanent blank. preventDefault lets
  // the browser fire webglcontextrestored so it can come back. Meanwhile we
  // free the budget slot (so a dead context can't starve the live ones) and
  // show the last-good snapshot instead of a blank. On restore, Three re-uploads
  // the scene's GPU resources on the next draw, so we just clear the fallback
  // and wake the canvas.
  const handleDashboardContextLost = (event: Event) => {
    event.preventDefault();
    delete canvas.dataset.webglReady;
    releaseRendererSlot();
    resolveNextDashboardWebGlBudgetWaiter();
    markDashboardWebGlFallback(canvas);
  };
  const handleDashboardContextRestored = () => {
    clearDashboardWebGlFallback(canvas);
    wakeDashboardWebGlCanvas(canvas);
  };
  canvas.addEventListener(
    "webglcontextlost",
    handleDashboardContextLost,
    false,
  );
  canvas.addEventListener(
    "webglcontextrestored",
    handleDashboardContextRestored,
    false,
  );

  const syncImageMode = () => {
    clearStillTimeout();

    if (isDashboardWebGlImageModeEnabled()) {
      delete canvas.dataset.dashboardWebglStill;
      canvas.dataset.dashboardWebglStillPending = "true";
      const layer = getDashboardWebGlSnapshotLayer(canvas);
      const snapshotSource = layer?.getAttribute("src") || "";
      if (
        layer?.dataset.dashboardWebglSnapshotValid === "true" &&
        snapshotSource.startsWith("data:image/")
      ) {
        setDashboardWebGlSnapshotVisible(canvas, true);
      }
      return;
    }

    delete canvas.dataset.dashboardWebglStill;
    delete canvas.dataset.dashboardWebglStillPending;
    delete canvas.dataset.dashboardWebglSnapshotReleased;
    if (canvas.parentElement) {
      delete canvas.parentElement.dataset.dashboardWebglSnapshotReleased;
    }
    setDashboardWebGlReleasedSnapshotStyles(canvas, false);
    setDashboardWebGlSnapshotVisible(canvas, false);
    wakeDashboardWebGlCanvas(canvas);
  };

  window.addEventListener(DASHBOARD_WEBGL_IMAGE_MODE_EVENT, syncImageMode);
  syncImageMode();

  renderer.setSize = ((...args: Parameters<WebGLRenderer["setSize"]>) => {
    wakeLiveCanvas();
    return originalSetSize(...args);
  }) as WebGLRenderer["setSize"];

  renderer.render = ((...args: Parameters<WebGLRenderer["render"]>) => {
    if (releasedStillContext) {
      canvas.dataset.dashboardWebglSnapshotReleased = "true";
      if (canvas.parentElement) {
        canvas.parentElement.dataset.dashboardWebglSnapshotReleased = "true";
      }
      setDashboardWebGlSnapshotVisible(canvas, true);
      setDashboardWebGlReleasedSnapshotStyles(canvas, true);
      return;
    }

    // Scrolled out of view — skip the GPU draw entirely. The component's rAF
    // loop keeps running but does almost nothing, and the canvas resumes
    // drawing on the first frame after it scrolls back into view.
    if (canvas.dataset.dashboardWebglOffscreen === "true") {
      return;
    }

    const imageMode = isDashboardWebGlImageModeEnabled();
    const liveForMotion = !imageMode && shouldStayLive();

    if (liveForMotion) {
      clearStillTimeout();
      wakeDashboardWebGlCanvas(canvas);
    } else if (canvas.dataset.dashboardWebglStill === "true") {
      setDashboardWebGlSnapshotVisible(canvas, true);
      return;
    }

    originalRender(...args);
    canvas.dataset.webglReady = "true";
    syncDashboardWebGlChildReady(canvas, true);
    const capturedSnapshot = captureDashboardWebGlSnapshot(
      canvas,
      imageMode || canvas.dataset.dashboardWebglStillPending === "true",
    );

    if (imageMode) {
      if (capturedSnapshot) {
        canvas.dataset.dashboardWebglStill = "true";
        delete canvas.dataset.dashboardWebglStillPending;
        setDashboardWebGlSnapshotVisible(canvas, true);
      } else {
        delete canvas.dataset.dashboardWebglStill;
        canvas.dataset.dashboardWebglStillPending = "true";
        setDashboardWebGlSnapshotVisible(canvas, false);
      }
      return;
    }

    if (liveForMotion) {
      setDashboardWebGlSnapshotVisible(canvas, false);
      return;
    }

    if (canvas.dataset.dashboardWebglStillPending === "true") {
      if (!capturedSnapshot) {
        delete canvas.dataset.dashboardWebglStillPending;
        requestStillSnapshot();
        return;
      }

      canvas.dataset.dashboardWebglStill = "true";
      delete canvas.dataset.dashboardWebglStillPending;
      setDashboardWebGlSnapshotVisible(canvas, true);
      if (DASHBOARD_WEBGL_RELEASE_STILL_CONTEXT_ENABLED) {
        globalThis.setTimeout(releaseStillContext, 0);
      }
    } else {
      requestStillSnapshot();
    }
  }) as WebGLRenderer["render"];

  renderer.dispose = (() => {
    clearStillTimeout();
    interactiveTarget.removeEventListener("pointerenter", wakeLiveCanvas);
    interactiveTarget.removeEventListener("pointerdown", wakeLiveCanvas);
    interactiveTarget.removeEventListener("focusin", wakeLiveCanvas);
    canvas.removeEventListener("webglcontextlost", handleDashboardContextLost);
    canvas.removeEventListener(
      "webglcontextrestored",
      handleDashboardContextRestored,
    );
    window.removeEventListener(DASHBOARD_WEBGL_IMAGE_MODE_EVENT, syncImageMode);
    visibilityObserver?.unobserve(canvas);
    delete canvas.dataset.webglReady;
    delete canvas.dataset.dashboardWebglActive;
    delete canvas.dataset.dashboardWebglOffscreen;
    delete canvas.dataset.dashboardWebglSnapshotReleased;
    setDashboardWebGlReleasedSnapshotStyles(canvas, false);
    syncDashboardWebGlChildReady(canvas, false);
    cleanupDashboardWebGlSnapshotArtifacts(canvas);
    releaseRendererSlot();
    if (releasedStillContext) return;
    return originalDispose();
  }) as WebGLRenderer["dispose"];

  renderer.forceContextLoss = (() => {
    releaseRendererSlot();
    return originalForceContextLoss();
  }) as WebGLRenderer["forceContextLoss"];
};

export const preloadDashboardWebGlRuntime = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(false);
  }

  dashboardWebGlPreloadPromise ??= (async () => {
    const THREE = await loadDashboardThree();
    const canvas = document.createElement("canvas");
    canvas.height = 16;
    canvas.width = 16;

    const renderer = createDashboardWebGlRenderer(THREE, canvas, {
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    if (!renderer) return false;

    try {
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(16, 16, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 8);
      camera.position.z = 2.8;

      const geometry = new THREE.SphereGeometry(0.42, 16, 8);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#22d3ee"),
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      renderer.compile(scene, camera);
      renderer.render(scene, camera);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      return true;
    } catch {
      renderer.dispose();
      return false;
    }
  })();

  return dashboardWebGlPreloadPromise;
};

const DASHBOARD_WEBGL_START_ROOT_MARGIN_PX = 320;
let dashboardWebGlStartObserver: IntersectionObserver | null = null;
const dashboardWebGlStartWaiters = new Map<Element, () => void>();

function isDashboardCanvasNearViewport(canvas: HTMLCanvasElement): boolean {
  const rect = canvas.getBoundingClientRect();
  // Unknown size (not laid out yet) — don't block; let it start.
  if (rect.width === 0 && rect.height === 0) return true;
  const m = DASHBOARD_WEBGL_START_ROOT_MARGIN_PX;
  const vh = window.innerHeight || 0;
  const vw = window.innerWidth || 0;
  return (
    rect.bottom >= -m &&
    rect.top <= vh + m &&
    rect.right >= -m &&
    rect.left <= vw + m
  );
}

// Resolve once the canvas is within a screenful of the viewport. Off-screen
// scenes use this to postpone their (expensive) init until you scroll near
// them, so they don't clog the start queue and main thread on first load.
function whenDashboardCanvasNearViewport(
  canvas: HTMLCanvasElement,
): Promise<void> {
  if (typeof IntersectionObserver === "undefined") return Promise.resolve();
  if (isDashboardCanvasNearViewport(canvas)) return Promise.resolve();

  return new Promise<void>((resolve) => {
    dashboardWebGlStartObserver ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const waiter = dashboardWebGlStartWaiters.get(entry.target);
          if (waiter) {
            dashboardWebGlStartWaiters.delete(entry.target);
            dashboardWebGlStartObserver?.unobserve(entry.target);
            waiter();
          }
        }
      },
      { rootMargin: `${DASHBOARD_WEBGL_START_ROOT_MARGIN_PX}px` },
    );
    dashboardWebGlStartWaiters.set(canvas, resolve);
    dashboardWebGlStartObserver.observe(canvas);
  });
}

export const waitForDashboardWebGlStart = async ({
  priority = false,
  canvas = null,
}: {
  priority?: boolean;
  canvas?: HTMLCanvasElement | null;
} = {}) => {
  // Off-screen, non-priority scenes wait until they approach the viewport
  // before joining the start queue — this keeps the initial load focused on the
  // scenes you can actually see (header crest/trophy/rewards) instead of
  // spinning up all ~50 scenes at once.
  if (!priority && canvas) {
    await whenDashboardCanvasNearViewport(canvas);
  }

  void preloadDashboardWebGlRuntime();
  await loadDashboardThree();

  // Priority brand marks (logo, trophy) skip the serial start queue entirely so
  // they appear immediately instead of waiting behind dozens of other scenes —
  // previously "priority" only reserved a budget slot, not queue position.
  if (priority) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    return waitForDashboardWebGlRendererCapacity(true);
  }

  const queuedStart = dashboardWebGlStartQueue.then(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          window.setTimeout(resolve, DASHBOARD_WEBGL_START_SPACING_MS);
        });
      }),
  );

  const budgetedStart = queuedStart.then(() =>
    waitForDashboardWebGlRendererCapacity(false),
  );

  dashboardWebGlStartQueue = budgetedStart.catch(() => undefined);
  return budgetedStart;
};

export const createDashboardWebGlRenderer = (
  THREE: ThreeModule,
  canvas: HTMLCanvasElement,
  options: Omit<WebGLRendererParameters, "canvas" | "context">,
  { priority = false }: { priority?: boolean } = {},
): WebGLRenderer | null => {
  clearDashboardWebGlFallback(canvas);
  delete canvas.dataset.webglBudgetDeferred;

  if (!hasDashboardWebGlRendererCapacity(priority)) {
    canvas.dataset.webglBudgetDeferred = "true";
    markDashboardWebGlFallback(canvas);
    syncDashboardWebGlBudgetState();
    return null;
  }

  try {
    const contextAttributes: WebGLContextAttributes = {
      alpha: options.alpha,
      antialias: options.antialias,
      depth: options.depth,
      failIfMajorPerformanceCaveat:
        options.failIfMajorPerformanceCaveat ?? false,
      powerPreference: options.powerPreference,
      premultipliedAlpha: options.premultipliedAlpha,
      preserveDrawingBuffer: true,
      stencil: options.stencil,
    };
    const context =
      canvas.getContext("webgl2", contextAttributes) ||
      canvas.getContext("webgl", contextAttributes);

    if (!context) {
      markDashboardWebGlFallback(canvas);
      return null;
    }

    canvas.dataset.webglContext =
      typeof WebGL2RenderingContext !== "undefined" &&
      context instanceof WebGL2RenderingContext
        ? "webgl2"
        : "webgl";

    const renderer = new THREE.WebGLRenderer({
      ...options,
      canvas,
      context: context as WebGLRenderingContext,
      preserveDrawingBuffer: true,
    });

    // Several scenes request a pixel-ratio floor (Math.max(dpr, 1.4–1.6)),
    // which supersamples 1.4–2.6x above a 1x display's native density — a huge
    // fragment-shading cost the screen can't even show, on top of MSAA that
    // already smooths edges. Clamp every renderer to native density here so no
    // scene ever draws more pixels than the display presents. Quality is
    // preserved (native resolution + antialiasing); only the invisible
    // supersampling overhead is removed. One place, every scene.
    const originalSetPixelRatio = renderer.setPixelRatio.bind(renderer);
    renderer.setPixelRatio = ((ratio: number) => {
      const nativeDpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const rect = canvas.getBoundingClientRect();
      const cssArea = rect.width * rect.height;
      // Size not laid out yet — don't risk over-clamping; honor the request.
      if (!Number.isFinite(cssArea) || cssArea <= 0) {
        return originalSetPixelRatio(ratio);
      }
      // Cap the backing-buffer AREA, not the ratio itself. Small icons keep
      // their full requested (supersampled) ratio because they stay under
      // budget; large scene canvases clamp toward native density where the
      // supersampling is a real, invisible cost. Never below native.
      const budgetRatio = Math.sqrt(DASHBOARD_WEBGL_PIXEL_BUDGET / cssArea);
      const effective = Math.min(ratio, Math.max(nativeDpr, budgetRatio));
      return originalSetPixelRatio(effective);
    }) as WebGLRenderer["setPixelRatio"];

    const releaseRendererSlot = trackDashboardWebGlRenderer(renderer, canvas);
    attachDashboardWebGlSnapshotCapture(renderer, canvas, releaseRendererSlot);

    return renderer;
  } catch {
    markDashboardWebGlFallback(canvas);
    return null;
  }
};
