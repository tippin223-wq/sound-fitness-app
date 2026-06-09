import type { WebGLRenderer, WebGLRendererParameters } from "three";

type ThreeModule = typeof import("three");

let nextDashboardWebGlStartAt = 0;
let dashboardThreePromise: Promise<ThreeModule> | null = null;
let dashboardWebGlPreloadPromise: Promise<boolean> | null = null;

const DASHBOARD_WEBGL_STILL_DELAY_MS = 900;
const DASHBOARD_WEBGL_WAKE_HOLD_MS = 1400;
const DASHBOARD_WEBGL_SNAPSHOT_CLASS = "dashboard-webgl-snapshot-layer";
const DASHBOARD_WEBGL_SNAPSHOT_STORAGE_PREFIX = "dashboard-webgl-snapshot:";
const DASHBOARD_PRIORITY_WEBGL_RETRY_DELAYS_MS = [320, 900, 1800, 3600, 7200];

export const loadDashboardThree = () => {
  dashboardThreePromise ??= import("three");
  return dashboardThreePromise;
};

export const markDashboardWebGlFallback = (canvas: HTMLCanvasElement) => {
  canvas.dataset.webglFallback = "true";
  delete canvas.dataset.webglReady;
  delete canvas.dataset.dashboardWebglActive;
  delete canvas.dataset.dashboardWebglStill;
  delete canvas.dataset.dashboardWebglStillPending;
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

  const className =
    typeof canvas.className === "string" ? canvas.className.trim() : "";
  if (className) {
    return className.split(/\s+/)[0] ?? "";
  }

  return (
    canvas.dataset.logoRenderer ||
    canvas.dataset.trophyRenderer ||
    canvas.dataset.dashboardScrollButtonRenderer ||
    canvas.dataset.webglContext ||
    ""
  );
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
  if (!cacheKey || !snapshotUrl.startsWith("data:image/png;base64,")) return;

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
  if (!parent || !getDashboardWebGlSnapshotLayer(canvas)) return;

  if (visible) {
    canvas.dataset.dashboardWebglSnapshotVisible = "true";
    parent.dataset.dashboardWebglSnapshotVisible = "true";
    return;
  }

  delete canvas.dataset.dashboardWebglSnapshotVisible;
  delete parent.dataset.dashboardWebglSnapshotVisible;
}

function positionDashboardWebGlSnapshotLayer(
  canvas: HTMLCanvasElement,
  layer: HTMLImageElement,
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
    if (existingLayer) positionDashboardWebGlSnapshotLayer(canvas, existingLayer);
    return true;
  }

  let snapshotUrl = "";
  try {
    snapshotUrl = canvas.toDataURL("image/png");
  } catch {
    return false;
  }

  if (!snapshotUrl || snapshotUrl === "data:,") return false;

  const layer = ensureDashboardWebGlSnapshotLayer(canvas);
  if (!layer) return false;

  layer.src = snapshotUrl;
  positionDashboardWebGlSnapshotLayer(canvas, layer);
  writeDashboardWebGlCachedSnapshot(canvas, snapshotUrl);
  return true;
}

function restoreDashboardWebGlCachedSnapshot(canvas: HTMLCanvasElement) {
  const snapshotUrl = readDashboardWebGlCachedSnapshot(canvas);
  if (!snapshotUrl) return false;

  const layer = ensureDashboardWebGlSnapshotLayer(canvas);
  if (!layer) return false;

  layer.src = snapshotUrl;
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
  delete parent.dataset.dashboardWebglSnapshotVisible;
  delete canvas.dataset.dashboardWebglSnapshotVisible;
  delete canvas.dataset.dashboardWebglSnapshot;
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
) => {
  const originalRender = renderer.render.bind(renderer);
  const originalDispose = renderer.dispose.bind(renderer);
  const originalSetSize = renderer.setSize.bind(renderer);
  let stillTimeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  let wakeUntil = 0;

  const shouldStayLive = () => canvas.dataset.dashboardWebglActive === "true";

  const clearStillTimeout = () => {
    if (stillTimeoutId === null) return;

    globalThis.clearTimeout(stillTimeoutId);
    stillTimeoutId = null;
  };

  const requestStillSnapshot = () => {
    if (
      shouldStayLive() ||
      canvas.dataset.dashboardWebglStill === "true" ||
      canvas.dataset.dashboardWebglStillPending === "true"
    ) {
      return;
    }

    if (stillTimeoutId !== null) return;

    stillTimeoutId = globalThis.setTimeout(() => {
      stillTimeoutId = null;
      if (shouldStayLive() || performance.now() < wakeUntil) {
        requestStillSnapshot();
        return;
      }

      captureDashboardWebGlSnapshot(canvas, true);
      canvas.dataset.dashboardWebglStillPending = "true";
    }, DASHBOARD_WEBGL_STILL_DELAY_MS);
  };

  const wakeLiveCanvas = () => {
    wakeUntil = performance.now() + DASHBOARD_WEBGL_WAKE_HOLD_MS;
    clearStillTimeout();
    wakeDashboardWebGlCanvas(canvas);
    requestStillSnapshot();
  };

  const interactiveTarget = canvas.parentElement ?? canvas;
  interactiveTarget.addEventListener("pointerenter", wakeLiveCanvas, {
    passive: true,
  });
  interactiveTarget.addEventListener("pointerdown", wakeLiveCanvas, {
    passive: true,
  });
  interactiveTarget.addEventListener("focusin", wakeLiveCanvas);

  renderer.setSize = ((...args: Parameters<WebGLRenderer["setSize"]>) => {
    wakeLiveCanvas();
    return originalSetSize(...args);
  }) as WebGLRenderer["setSize"];

  renderer.render = ((...args: Parameters<WebGLRenderer["render"]>) => {
    const liveForMotion = shouldStayLive();

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
    captureDashboardWebGlSnapshot(
      canvas,
      canvas.dataset.dashboardWebglStillPending === "true",
    );

    if (liveForMotion) {
      setDashboardWebGlSnapshotVisible(canvas, false);
      return;
    }

    if (canvas.dataset.dashboardWebglStillPending === "true") {
      canvas.dataset.dashboardWebglStill = "true";
      delete canvas.dataset.dashboardWebglStillPending;
      setDashboardWebGlSnapshotVisible(canvas, true);
    } else {
      requestStillSnapshot();
    }
  }) as WebGLRenderer["render"];

  renderer.dispose = (() => {
    clearStillTimeout();
    interactiveTarget.removeEventListener("pointerenter", wakeLiveCanvas);
    interactiveTarget.removeEventListener("pointerdown", wakeLiveCanvas);
    interactiveTarget.removeEventListener("focusin", wakeLiveCanvas);
    delete canvas.dataset.webglReady;
    delete canvas.dataset.dashboardWebglActive;
    syncDashboardWebGlChildReady(canvas, false);
    cleanupDashboardWebGlSnapshotArtifacts(canvas);
    return originalDispose();
  }) as WebGLRenderer["dispose"];
};

const waitForDashboardBrowserIdle = (timeout = 420) =>
  new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => resolve(), { timeout });
      return;
    }

    globalThis.setTimeout(resolve, Math.min(timeout, 120));
  });

export const preloadDashboardWebGlRuntime = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(false);
  }

  dashboardWebGlPreloadPromise ??= (async () => {
    await waitForDashboardBrowserIdle(560);

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

export const waitForDashboardWebGlStart = async ({
  priority = false,
}: {
  priority?: boolean;
} = {}) => {
  await preloadDashboardWebGlRuntime();

  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    if (priority) {
      void waitForDashboardBrowserIdle(120).then(resolve);
      return;
    }

    const now = performance.now();
    const scheduledAt = Math.max(now, nextDashboardWebGlStartAt);
    nextDashboardWebGlStartAt = scheduledAt + 80;
    const delay = Math.min(1200, scheduledAt - now);

    window.setTimeout(() => {
      void waitForDashboardBrowserIdle(240).then(resolve);
    }, delay);
  });
};

export const createDashboardWebGlRenderer = (
  THREE: ThreeModule,
  canvas: HTMLCanvasElement,
  options: Omit<WebGLRendererParameters, "canvas" | "context">,
): WebGLRenderer | null => {
  clearDashboardWebGlFallback(canvas);

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
    attachDashboardWebGlSnapshotCapture(renderer, canvas);

    return renderer;
  } catch {
    markDashboardWebGlFallback(canvas);
    return null;
  }
};
