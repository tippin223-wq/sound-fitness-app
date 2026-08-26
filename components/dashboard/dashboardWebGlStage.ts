"use client";

import type {
  Camera,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { loadDashboardThree } from "./dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

/**
 * Shared-context WebGL stage.
 *
 * Instead of every dashboard 3D element owning its own <canvas> + WebGL context
 * (dozens of them, which the browser reclaims and starves — the "times out over
 * time" problem), a single full-viewport canvas hosts ONE WebGL context. Each
 * registered widget draws into the screen-space rectangle of its DOM anchor via
 * the scissor/viewport, so it appears exactly where its placeholder sits and
 * tracks scroll/resize automatically (we read the anchor rect every frame).
 *
 * One context total, no budget contention, no context loss.
 */

export type DashboardWidgetContext = {
  THREE: ThreeModule;
};

export type DashboardWidgetInstance = {
  scene: Scene;
  camera: Camera;
  /** Advance animation. Called each frame before the widget is drawn. */
  /**
   * Advance the scene. Return `false` to signal that nothing visible changed
   * this frame (fully settled while paused): when every drawn widget reports
   * false and no rectangle moved, the stage skips the frame entirely — the
   * canvas simply keeps its pixels. Returning nothing (void) is treated as
   * "changed", so unmigrated widgets keep today's always-render behaviour.
   */
  update?: (elapsedSeconds: number, deltaSeconds: number) => void | boolean;
  /**
   * Called when the widget's on-screen size changes, with its CSS pixel size.
   * Use it for custom camera setup (e.g. orthographic frustum). If omitted, a
   * PerspectiveCamera's aspect is updated automatically.
   */
  resize?: (cssWidth: number, cssHeight: number) => void;
  /** Free geometry/materials when the widget unregisters. */
  dispose?: () => void;
};

export type DashboardWidgetBuilder = (
  ctx: DashboardWidgetContext,
) => DashboardWidgetInstance;

type RegisteredWidget = {
  /** Stable identity for the frame-skip draw-key. */
  id: number;
  /** Cached checkVisibility result; refreshed every few frames (it forces a
      style recalc, which dominated the per-frame cost at idle). */
  lastVisible: boolean;
  lastVisibleFrame: number;
  anchor: HTMLElement;
  instance: DashboardWidgetInstance;
  lastCssWidth: number;
  lastCssHeight: number;
  /**
   * Original material colors captured before the header's inactive treatment is
   * applied. Shared-stage pixels live outside the header DOM subtree, so CSS
   * brightness filters cannot reach them; the stage must dim their scene
   * materials directly and restore the exact colors when the header is active.
   */
  materialColors: Array<{
    color?: { copy: (source: unknown) => unknown; multiplyScalar: (value: number) => unknown };
    emissive?: { copy: (source: unknown) => unknown; multiplyScalar: (value: number) => unknown };
    originalColor?: unknown;
    originalEmissive?: unknown;
    material: {
      needsUpdate?: boolean;
      opacity?: number;
      transparent?: boolean;
    };
    originalOpacity?: number;
    originalTransparent?: boolean;
  }> | null;
  dimmed: boolean;
  /**
   * The dashboard header ("vortex shell") ancestor, if this widget lives in the
   * header. When the header times out into its idle-animation overlay, its
   * header widgets must not paint on top of that overlay — but the stage canvas
   * sits above the overlay (z 430), so we skip drawing header widgets while the
   * shell's data-dashboard-header-timeout flag is "true". Non-header widgets
   * (e.g. the page level meter) have a null host and always draw.
   */
  headerHost: HTMLElement | null;
  /**
   * False until this widget's shaders finish compiling. We compile every
   * widget in parallel off the main thread (compileAsync) and skip drawing it
   * until ready, so they all appear together instead of popping in one at a
   * time behind serial, main-thread-blocking shader compiles.
   */
  ready: boolean;
};

// Safety valve: draw a widget even if async compile never resolves.
const DASHBOARD_STAGE_COMPILE_TIMEOUT_MS = 4000;

let stageCanvas: HTMLCanvasElement | null = null;
let stageRenderer: WebGLRenderer | null = null;
let stageThree: ThreeModule | null = null;
let stageRafId = 0;
let stageStartedAt = 0;
let stageLastTime = 0;
let stageInitPromise: Promise<void> | null = null;
const stageWidgets = new Set<RegisteredWidget>();
let stageWidgetIdCounter = 1;

/**
 * Zone freeze for the dashboard's "only one set of animations at a time" toggle.
 * A frozen widget holds its last pose (we skip its per-frame `update`) but stays
 * drawn. The header shell (data-dashboard-header-timeout) is the boundary:
 * `headerHost !== null` widgets are the header set, the rest are the content set.
 * When the header is the active zone we freeze the content widgets; when the
 * content is active we freeze the header widgets — so every 3D widget follows
 * the zone regardless of whether it also wires up a `paused` prop.
 */
let contentWidgetsFrozen = false;
let headerWidgetsFrozen = false;

/**
 * While the header's idle scene is showing, hide the entire 3D stage. The idle
 * scene is DOM/SVG and the stage canvas sits above it (z 430), so ANY widget
 * would paint over it — including stray ones (e.g. the page scroll joystick)
 * whose anchor doesn't resolve the header host and so slip past the per-widget
 * header skip. Nothing on the stage belongs on the idle scene, so we blank all.
 */
let stageIdleHidden = false;

function setWidgetSceneDimmed(widget: RegisteredWidget, dimmed: boolean): void {
  if (widget.dimmed === dimmed) return;

  if (!widget.materialColors) {
    const materialColors: NonNullable<RegisteredWidget["materialColors"]> = [];
    const seenMaterials = new Set<unknown>();

    widget.instance.scene.traverse((object) => {
      const objectWithMaterial = object as unknown as {
        material?: unknown | unknown[];
      };
      const materials = Array.isArray(objectWithMaterial.material)
        ? objectWithMaterial.material
        : objectWithMaterial.material
          ? [objectWithMaterial.material]
          : [];

      for (const material of materials) {
        if (!material || seenMaterials.has(material)) continue;
        seenMaterials.add(material);

        const colorMaterial = material as {
          color?: {
            clone: () => unknown;
            copy: (source: unknown) => unknown;
            multiplyScalar: (value: number) => unknown;
          };
          emissive?: {
            clone: () => unknown;
            copy: (source: unknown) => unknown;
            multiplyScalar: (value: number) => unknown;
          };
          needsUpdate?: boolean;
          opacity?: number;
          transparent?: boolean;
        };
        if (
          !colorMaterial.color &&
          !colorMaterial.emissive &&
          typeof colorMaterial.opacity !== "number"
        ) {
          continue;
        }

        materialColors.push({
          material: colorMaterial,
          color: colorMaterial.color,
          emissive: colorMaterial.emissive,
          originalColor: colorMaterial.color?.clone(),
          originalEmissive: colorMaterial.emissive?.clone(),
          originalOpacity: colorMaterial.opacity,
          originalTransparent: colorMaterial.transparent,
        });
      }
    });
    widget.materialColors = materialColors;
  }

  for (const material of widget.materialColors) {
    if (material.color && material.originalColor) {
      material.color.copy(material.originalColor);
      if (dimmed) material.color.multiplyScalar(0.48);
    }
    if (material.emissive && material.originalEmissive) {
      material.emissive.copy(material.originalEmissive);
      if (dimmed) material.emissive.multiplyScalar(0.28);
    }
    if (typeof material.originalOpacity === "number") {
      material.material.opacity = dimmed
        ? material.originalOpacity * 0.48
        : material.originalOpacity;
      material.material.transparent = dimmed
        ? true
        : material.originalTransparent;
      material.material.needsUpdate = true;
    }
  }
  widget.dimmed = dimmed;
}

export function setDashboardContentWidgetsFrozen(frozen: boolean): void {
  contentWidgetsFrozen = frozen;
  stageNeedsRedraw = true;
}

export function setDashboardHeaderWidgetsFrozen(frozen: boolean): void {
  headerWidgetsFrozen = frozen;
  stageNeedsRedraw = true;
  for (const widget of stageWidgets) {
    if (widget.headerHost) setWidgetSceneDimmed(widget, frozen);
  }
}

export function setDashboardStageIdleHidden(hidden: boolean): void {
  if (stageIdleHidden !== hidden) stageNeedsRedraw = true;
  stageIdleHidden = hidden;
}

// Software rasterizers (SwiftShader in GPU-less environments, llvmpipe in VMs)
// pay per-fragment on the CPU, so supersampling and MSAA multiply main-thread
// cost 2.25-4x for no visible benefit at widget sizes. Probe the renderer name
// once; real GPUs keep the crisp supersampled path below.
let stageSoftwareRendererCached: boolean | null = null;
const isStageSoftwareRenderer = (): boolean => {
  if (stageSoftwareRendererCached !== null) return stageSoftwareRendererCached;
  let software = false;
  try {
    const probe = document.createElement("canvas");
    const gl =
      probe.getContext("webgl2") ??
      (probe.getContext("webgl") as WebGLRenderingContext | null);
    if (gl) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const rendererName = String(
        info
          ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
      );
      software = /swiftshader|software|llvmpipe/i.test(rendererName);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    software = false;
  }
  stageSoftwareRendererCached = software;
  return software;
};

// The stage canvas spans the viewport but only DRAWS inside each widget's small
// scissor rectangle, so supersampling is cheap here — on a real GPU. A 1.5
// floor keeps small header icons crisp on low-DPI (1x) displays; capped at 2
// for retina. Software rasterizers get 1x: every extra pixel is CPU time.
const clampStagePixelRatio = () =>
  isStageSoftwareRenderer()
    ? 1
    : Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);

let stageLastWidth = 0;
let stageLastHeight = 0;
let stageLastPixelRatio = 0;

function resizeStage() {
  if (!stageRenderer) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = clampStagePixelRatio();
  // setSize reassigns the canvas backing buffer even when nothing changed, so
  // calling it unconditionally every frame stalls the GPU pipeline. Only touch
  // the renderer when the viewport or device pixel ratio actually changes.
  if (
    width === stageLastWidth &&
    height === stageLastHeight &&
    pixelRatio === stageLastPixelRatio
  ) {
    return;
  }
  stageLastWidth = width;
  stageLastHeight = height;
  stageLastPixelRatio = pixelRatio;
  stageNeedsRedraw = true;
  stageRenderer.setPixelRatio(pixelRatio);
  stageRenderer.setSize(width, height, false);
}

/**
 * The stage composites a full-viewport transparent layer over the whole page,
 * so every frame it draws costs the compositor a full-screen blend regardless
 * of how small the widgets are. These are decorative icons, not gameplay —
 * capping them at ~30fps halves that cost with no perceptible difference, and
 * leaves the freed budget to the page's own scrolling and interactions.
 */
const DASHBOARD_STAGE_FRAME_INTERVAL_MS = 1000 / 30;
let stageLastDrawTime = 0;

/**
 * Render-on-demand: the shared canvas keeps its pixels between frames, so when
 * no widget changed and no rectangle moved there is nothing to redraw. Any
 * out-of-band mutation (freeze/dim flips, registration, resize, idle overlay)
 * sets this flag; per-widget change detection covers the rest.
 */
let stageNeedsRedraw = true;

export function markDashboardStageDirty(): void {
  stageNeedsRedraw = true;
}

type StageDrawEntry = {
  widget: RegisteredWidget;
  rect: DOMRect;
  changed: boolean;
};

const stageRectKey = (rect: DOMRect) =>
  `${Math.round(rect.left * 2)}:${Math.round(rect.top * 2)}:${Math.round(rect.width * 2)}:${Math.round(rect.height * 2)}`;
let stageLastDrawKey = "";
let stageFrameCounter = 0;

function runStageFrame(time: number) {
  stageRafId = window.requestAnimationFrame(runStageFrame);

  const renderer = stageRenderer;
  if (!renderer) return;

  if (time - stageLastDrawTime < DASHBOARD_STAGE_FRAME_INTERVAL_MS) return;
  stageLastDrawTime = time;

  resizeStage();

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  stageFrameCounter++;
  const elapsed = (time - stageStartedAt) / 1000;
  const delta = Math.min(0.05, Math.max(0, (time - stageLastTime) / 1000));
  stageLastTime = time;

  // ---- Pass 1: collect the draw list, advance scenes, detect change. ----
  const drawList: StageDrawEntry[] = [];
  let drawKey = stageIdleHidden ? "idle-hidden" : "";
  let anyWidgetChanged = false;

  if (!stageIdleHidden) {
    for (const widget of stageWidgets) {
      // Not drawn until its shaders have compiled (in parallel, off-thread).
      if (!widget.ready) continue;

      // While the header is in its idle-animation overlay, don't paint header
      // widgets over it (the stage canvas sits above the overlay).
      if (
        widget.headerHost &&
        widget.headerHost.dataset.dashboardHeaderTimeout === "true"
      ) {
        continue;
      }

      const rect = widget.anchor.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      // Cull widgets fully off-screen.
      if (
        rect.bottom <= 0 ||
        rect.top >= viewportHeight ||
        rect.right <= 0 ||
        rect.left >= viewportWidth
      ) {
        continue;
      }

      // Cull widgets hidden by CSS. Inactive hero-orbit cards keep real layout
      // rects but sit at visibility:hidden / opacity:0, so rect culling alone
      // leaves their scenes updating and rendering every frame.
      // checkVisibility forces a style recalc, so it runs every sixth stage
      // frame per widget (~200ms) with the result cached — visibility flips
      // are rare and a one-widget 200ms lag over a fading card is invisible.
      if (stageFrameCounter - widget.lastVisibleFrame >= 6) {
        const anchorWithVisibility = widget.anchor as HTMLElement & {
          checkVisibility?: (options?: {
            checkOpacity?: boolean;
            checkVisibilityCSS?: boolean;
          }) => boolean;
        };
        widget.lastVisible =
          typeof anchorWithVisibility.checkVisibility !== "function" ||
          anchorWithVisibility.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          });
        widget.lastVisibleFrame = stageFrameCounter;
      }
      if (!widget.lastVisible) continue;

      const { camera, update, resize } = widget.instance;

      // Notify the widget of size changes (custom camera setup); otherwise
      // keep a PerspectiveCamera's aspect in sync automatically.
      if (
        rect.width !== widget.lastCssWidth ||
        rect.height !== widget.lastCssHeight
      ) {
        widget.lastCssWidth = rect.width;
        widget.lastCssHeight = rect.height;
        anyWidgetChanged = true;
        if (resize) {
          resize(rect.width, rect.height);
        } else {
          const perspective = camera as PerspectiveCamera;
          if (perspective.isPerspectiveCamera) {
            perspective.aspect = rect.width / rect.height;
            perspective.updateProjectionMatrix();
          }
        }
      }

      // Freeze the widgets in the inactive zone: hold their last frame (skip
      // update) but keep drawing them, so only one set animates at a time.
      const frozen =
        widget.headerHost !== null ? headerWidgetsFrozen : contentWidgetsFrozen;
      let widgetChanged = false;
      if (!frozen && update) {
        // void return = "changed" so unmigrated widgets keep rendering.
        if (update(elapsed, delta) !== false) widgetChanged = true;
      }
      if (widgetChanged) anyWidgetChanged = true;

      drawList.push({ widget, rect, changed: widgetChanged });
      drawKey += widget.id + "@" + stageRectKey(rect) + ";";
    }
  }

  // ---- Skip the frame when nothing visible changed. ----
  const rectsChanged = drawKey !== stageLastDrawKey;
  stageLastDrawKey = drawKey;
  if (!anyWidgetChanged && !rectsChanged && !stageNeedsRedraw) {
    return;
  }
  // Partial redraw: when the layout is stable and nothing external changed,
  // only the widgets whose scenes advanced need repainting — a scissored
  // clear erases just their rectangles while every settled widget keeps its
  // pixels. Any rect movement or external change falls back to a full pass
  // (a moved widget leaves stale pixels at its old position otherwise).
  const partial = !rectsChanged && !stageNeedsRedraw;
  stageNeedsRedraw = false;

  // ---- Pass 2: clear, then draw each (changed) widget into its rect. ----
  if (!partial) {
    renderer.setScissorTest(false);
    renderer.clear();
  }
  renderer.setScissorTest(true);

  for (const entry of drawList) {
    if (partial && !entry.changed) continue;
    const { widget, rect } = entry;
    // three.js's setViewport/setScissor take CSS pixels and multiply by the
    // renderer's pixelRatio internally. Passing device pixels (rect * dpr) here
    // double-applied the ratio, pushing every widget's viewport off the backing
    // buffer so nothing drew. Pass CSS pixels.
    const cssWidth = Math.max(1, rect.width);
    const cssHeight = Math.max(1, rect.height);
    const cssLeft = rect.left;
    // WebGL's viewport origin is bottom-left; the DOM's is top-left — flip Y.
    const cssBottom = viewportHeight - rect.bottom;

    renderer.setViewport(cssLeft, cssBottom, cssWidth, cssHeight);
    renderer.setScissor(cssLeft, cssBottom, cssWidth, cssHeight);
    if (partial) renderer.clear();
    renderer.render(widget.instance.scene, widget.instance.camera);
  }

  renderer.setScissorTest(false);
}

async function ensureStage(): Promise<void> {
  if (stageRenderer) return;

  stageInitPromise ??= (async () => {
    const THREE = await loadDashboardThree();
    stageThree = THREE;

    const canvas = document.createElement("canvas");
    canvas.className = "dashboard-webgl-stage";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    // The 3D icons are foreground marks, so the stage sits above the sticky
    // header shell (z 120) and the reward/points dropdowns (z 420) — otherwise
    // opaque header/dropdown chrome paints over the icons. pointer-events:none
    // keeps the underlying buttons clickable.
    canvas.style.zIndex = "430";
    document.body.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      // MSAA resolves on the CPU under a software rasterizer — skip it there.
      antialias: !isStageSoftwareRenderer(),
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // We manage clearing ourselves so each scissored widget composites onto the
    // shared transparent buffer.
    renderer.autoClear = false;

    stageCanvas = canvas;
    stageRenderer = renderer;
    stageStartedAt = performance.now();
    stageLastTime = stageStartedAt;
    resizeStage();

    stageRafId = window.requestAnimationFrame(runStageFrame);
  })();

  return stageInitPromise;
}

/**
 * Register a widget to be drawn into its anchor's screen rectangle on the shared
 * stage. Returns an unregister function that also disposes the widget's scene.
 */
export async function registerDashboardWidget(
  anchor: HTMLElement,
  builder: DashboardWidgetBuilder,
): Promise<() => void> {
  await ensureStage();
  const THREE = stageThree;
  if (!THREE) {
    // Stage couldn't init (no WebGL) — flag fallback so the CSS keeps each
    // widget's static fallback image/snapshot visible.
    anchor.dataset.webglFallback = "true";
    return () => {};
  }

  const instance = builder({ THREE });
  const widget: RegisteredWidget = {
    id: stageWidgetIdCounter++,
    lastVisible: true,
    lastVisibleFrame: -1,
    anchor,
    instance,
    lastCssWidth: 0,
    lastCssHeight: 0,
    materialColors: null,
    dimmed: false,
    ready: false,
    headerHost: anchor.closest<HTMLElement>("[data-dashboard-header-timeout]"),
  };
  if (widget.headerHost && headerWidgetsFrozen) {
    setWidgetSceneDimmed(widget, true);
  }
  stageWidgets.add(widget);

  // Compile this widget's shaders in parallel, off the main thread, then let it
  // draw. Every widget kicks this off on mount, so they compile together and
  // appear together instead of serially blocking the main thread one by one.
  const compileAsync = (
    stageRenderer as (WebGLRenderer & {
      compileAsync?: (scene: unknown, camera: unknown) => Promise<unknown>;
    }) | null
  )?.compileAsync;
  if (stageRenderer && typeof compileAsync === "function") {
    const markReady = () => {
      widget.ready = true;
      // Signals the CSS to hide this widget's static fallback image now that
      // the shared-stage 3D is drawing (see .dashboard-header-logo-3d__image).
      anchor.dataset.webglReady = "true";
    };
    const timeoutId = globalThis.setTimeout(
      markReady,
      DASHBOARD_STAGE_COMPILE_TIMEOUT_MS,
    );
    Promise.resolve(
      compileAsync.call(stageRenderer, instance.scene, instance.camera),
    )
      .catch(() => undefined)
      .finally(() => {
        globalThis.clearTimeout(timeoutId);
        markReady();
      });
  } else {
    widget.ready = true;
    anchor.dataset.webglReady = "true";
  }

  return () => {
    stageWidgets.delete(widget);
    instance.dispose?.();
  };
}
