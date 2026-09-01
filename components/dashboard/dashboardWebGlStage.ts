"use client";

import type {
  Camera,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
  WebGLRenderTarget,
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
  /**
   * Header-inactive dim, lerped: 0 = full brightness, 1 = fully dimmed.
   * A single-step multiplyScalar snap read as a "blink" every time the pointer
   * crossed the header/content boundary (and it landed 320ms late, behind the
   * deferred focus commit), so the stage eases current toward target per frame.
   */
  dimCurrent: number;
  dimTarget: number;
  /**
   * Mirrors "the stage is currently skipping this widget" onto the anchor as
   * data-webgl-culled, so CSS fallbacks keyed on data-webgl-ready alone can
   * exclude culled widgets — ready never meant "actually drawn", and a culled
   * widget with a ready-suppressed fallback renders as nothing at all.
   */
  culled: boolean;
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
   * Widgets under [data-dashboard-webgl-header-exempt] answer only to their
   * own `paused` prop: they skip BOTH freeze sets (header and content). The
   * meter panel's tornado is content-classified but lives in the header's
   * interaction zone, so the content freeze (active whenever the header
   * leads) otherwise held it still until the header idled.
   */
  freezeExempt: boolean;
  /**
   * Widgets under [data-dashboard-webgl-transition-fallback] hide their 3D
   * while the header shell carries data-header-transitioning and let the DOM
   * fallback ride the motion instead: a composited translate/scale moves the
   * chrome at display rate while gBCR sampling lags a frame behind, so the 3D
   * visibly detaches from its box (the meter icon rode high through the idle
   * drop). The fallback lives inside the moving box and tracks it exactly.
   */
  transitionFallback: boolean;
  /**
   * False until this widget's shaders finish compiling. We compile every
   * widget in parallel off the main thread (compileAsync) and skip drawing it
   * until ready, so they all appear together instead of popping in one at a
   * time behind serial, main-thread-blocking shader compiles.
   */
  ready: boolean;
  /** Consecutive update()/render() throws; the widget is dropped (and its
      fallback restored) after a few so one broken scene can't spam uncaught
      errors 30x/second. */
  failures: number;
  /**
   * Per-widget scene cache: the scene renders into its own RenderTarget only
   * when ITS content or size changes; every present then just composites the
   * cached textures as quads. One animating widget no longer re-shades every
   * sibling scene — the previous all-or-nothing redraw was the single biggest
   * cost of the open header under software rasterization.
   */
  renderTarget: WebGLRenderTarget | null;
  rtWidth: number;
  rtHeight: number;
  quad: Mesh<PlaneGeometry, MeshBasicMaterial> | null;
};

// Safety valve: draw a widget even if async compile never resolves.
const DASHBOARD_STAGE_COMPILE_TIMEOUT_MS = 4000;

let stageCanvas: HTMLCanvasElement | null = null;
let stageRenderer: WebGLRenderer | null = null;
let stageThree: ThreeModule | null = null;
// performance.now() of the last webglcontextlost, 0 while healthy. The frame
// loop's watchdog rebuilds the surface if the browser never restores it.
let stageContextLostAt = 0;
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

// The dim lerp runs in the frame loop: ~250ms to match the header chrome's own
// CSS filter transition, instead of the old instant x0.48 snap.
const DASHBOARD_STAGE_DIM_SECONDS = 0.25;
const DASHBOARD_STAGE_DIM_COLOR = 0.48;
const DASHBOARD_STAGE_DIM_EMISSIVE = 0.28;

function setWidgetCulled(widget: RegisteredWidget, culled: boolean): void {
  if (widget.culled === culled) return;
  widget.culled = culled;
  if (culled) {
    widget.anchor.dataset.webglCulled = "true";
  } else {
    delete widget.anchor.dataset.webglCulled;
  }
}

function applyWidgetDim(widget: RegisteredWidget): void {
  if (!widget.materialColors) return;
  const t = widget.dimCurrent;
  const colorFactor = 1 - (1 - DASHBOARD_STAGE_DIM_COLOR) * t;
  const emissiveFactor = 1 - (1 - DASHBOARD_STAGE_DIM_EMISSIVE) * t;
  for (const material of widget.materialColors) {
    if (material.color && material.originalColor) {
      material.color.copy(material.originalColor);
      if (t > 0) material.color.multiplyScalar(colorFactor);
    }
    if (material.emissive && material.originalEmissive) {
      material.emissive.copy(material.originalEmissive);
      if (t > 0) material.emissive.multiplyScalar(emissiveFactor);
    }
    if (typeof material.originalOpacity === "number") {
      material.material.opacity = material.originalOpacity * colorFactor;
      material.material.transparent =
        t > 0 ? true : material.originalTransparent;
      material.material.needsUpdate = true;
    }
  }
}

function setWidgetSceneDimmed(
  widget: RegisteredWidget,
  dimmed: boolean,
  snap = false,
): void {
  const target = dimmed ? 1 : 0;
  if (widget.dimTarget === target && (!snap || widget.dimCurrent === target)) {
    return;
  }

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

  widget.dimTarget = target;
  if (snap) {
    widget.dimCurrent = target;
    applyWidgetDim(widget);
  }
  // Otherwise the frame loop lerps dimCurrent toward the target and re-applies
  // per frame (each step marks the widget changed so it is actually drawn).
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
  // While the whole stage is blanked, every widget is culled — surface that on
  // the anchors so CSS fallbacks can stand in. On wake the frame loop clears
  // the flag per widget as each one is drawn again.
  if (hidden) {
    for (const widget of stageWidgets) setWidgetCulled(widget, true);
  }
}

// While a full-screen overlay that sits BELOW the z-430 stage canvas is open
// (the profile hub at z-240), widgets outside it would paint straight through
// its scrim. A blanket stage blank is wrong because such overlays can host
// stage widgets of their own (the hub's emeralds/coin/bolt) — so instead,
// only widgets whose anchor lives inside this scope element keep painting.
let stageVisibleScopeElement: HTMLElement | null = null;

export function setDashboardStageVisibleScope(
  scope: HTMLElement | null,
): void {
  if (stageVisibleScopeElement === scope) return;
  stageVisibleScopeElement = scope;
  stageNeedsRedraw = true;
  if (scope) {
    // Cull outsiders immediately so their pixels clear on the next present
    // instead of waiting for the staggered visibility cadence.
    for (const widget of stageWidgets) {
      if (!scope.contains(widget.anchor)) setWidgetCulled(widget, true);
    }
  }
}

/**
 * Force every widget's cached checkVisibility result to refresh on the next
 * stage frame. The cache holds for ~6 frames (~200ms), which reads as a blink
 * when a state flip the page just made (focus flip, panel rotation) shows or
 * hides widget anchors — call this alongside such flips.
 */
export function invalidateDashboardStageVisibility(): void {
  for (const widget of stageWidgets) {
    widget.lastVisibleFrame = -6;
  }
  stageNeedsRedraw = true;
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
      // Deliberately NOT loseContext()ing the probe: an explicit loseContext
      // counts as a PAGE-CAUSED context loss, and Chrome's backoff then
      // blocks the next context creation ("Web page caused context loss and
      // was blocked") — which is exactly what runs next, since this probe
      // feeds createStageSurface's antialias option. One probe context per
      // page is reclaimed by GC along with its canvas.
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
  if (stageCompositeCamera) {
    // The composite camera maps CSS pixels: x right, y down (negated).
    stageCompositeCamera.left = 0;
    stageCompositeCamera.right = width;
    stageCompositeCamera.top = 0;
    stageCompositeCamera.bottom = -height;
    stageCompositeCamera.updateProjectionMatrix();
  }
}

/**
 * The stage composites a full-viewport transparent layer over the whole page,
 * so every frame it draws costs the compositor a full-screen blend regardless
 * of how small the widgets are. These are decorative icons, not gameplay —
 * capping them halves that cost with no perceptible difference, and leaves
 * the freed budget to the page's own scrolling and interactions. Software
 * rasterizers (the user's GPU-less viewer) pay per-fragment on the CPU, so
 * they get a lower 20fps cap.
 */
const stageFrameIntervalMs = () =>
  isStageSoftwareRenderer() ? 1000 / 20 : 1000 / 30;
let stageLastDrawTime = 0;

/**
 * Temporary escape from the present cap, for the length of a header
 * open/idle transition.
 *
 * Those transitions move every widget's anchor over ~240ms. At 20-30fps the
 * stage only lands 5-7 positions across that window while the DOM chrome
 * around each widget animates at display rate, so the 3D visibly steps along
 * behind its own button — most obvious on the joysticks closing to idle, where
 * the anchor both moves and shrinks. Boosting for the transition costs a few
 * hundred milliseconds of uncapped frames on a deliberate user action.
 */
let stageBoostUntilMs = 0;
const stageNow = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export function boostDashboardStageFrameRate(durationMs = 460): void {
  stageBoostUntilMs = Math.max(stageBoostUntilMs, stageNow() + durationMs);
  markDashboardStageDirty();
}

/**
 * Deep sleep: once every widget has been settled for ~a second, pass 1's
 * per-frame work (a rect read per widget plus update() polling) is itself
 * waste — sample layout only every 4th tick until something wakes the stage.
 * Wake sources: any dirty mark (markDashboardStageDirty, visibility
 * invalidation, freeze/dim flips, registration/reveal) and scrolling (a
 * capture-phase document listener — scrolls move anchor rects and the pixels
 * must track within a frame, not a 4-tick lag).
 */
const DASHBOARD_STAGE_SLEEP_AFTER_IDLE_FRAMES = 20;
let stageIdleFrameStreak = 0;
let stageTickCounter = 0;

// Composite pass state: one ortho scene of textured quads, one per widget.
let stageCompositeScene: Scene | null = null;
let stageCompositeCamera: OrthographicCamera | null = null;

const ensureWidgetQuad = (widget: RegisteredWidget) => {
  if (widget.quad) return widget.quad;
  const THREE = stageThree!;
  const material = new THREE.MeshBasicMaterial({
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    transparent: true,
  });
  // The render targets hold premultiplied color (scenes composite onto
  // transparent black) — blend ONE / ONE_MINUS_SRC_ALPHA or edges darken.
  material.premultipliedAlpha = true;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  quad.renderOrder = widget.id;
  quad.frustumCulled = false;
  stageCompositeScene?.add(quad);
  widget.quad = quad;
  return quad;
};

/** (Re)size the widget's render target; returns true when it was recreated. */
const ensureWidgetRenderTarget = (
  widget: RegisteredWidget,
  cssWidth: number,
  cssHeight: number,
  pixelRatio: number,
): boolean => {
  const THREE = stageThree!;
  const needWidth = Math.max(1, Math.ceil(cssWidth * pixelRatio));
  const needHeight = Math.max(1, Math.ceil(cssHeight * pixelRatio));
  if (
    widget.renderTarget &&
    widget.rtWidth === needWidth &&
    widget.rtHeight === needHeight
  ) {
    return false;
  }
  // During a frame-rate boost the header anchors resize every displayed
  // frame — recreating the target (texture + FBO + depth) per 1px change is
  // pure churn, and targetRecreated would also force full re-renders of
  // settled widgets. Stretch the cached texture through the motion instead;
  // the first post-boost frame resizes it crisp.
  if (widget.renderTarget && performance.now() < stageBoostUntilMs) {
    return false;
  }
  widget.renderTarget?.dispose();
  const renderTarget = new THREE.WebGLRenderTarget(needWidth, needHeight, {
    depthBuffer: true,
    stencilBuffer: false,
  });
  renderTarget.texture.colorSpace = THREE.SRGBColorSpace;
  widget.renderTarget = renderTarget;
  widget.rtWidth = needWidth;
  widget.rtHeight = needHeight;
  return true;
};

/** Free a widget's GPU-side cache (unregister, context restore, drop). */
const releaseWidgetGpuCache = (widget: RegisteredWidget) => {
  widget.renderTarget?.dispose();
  widget.renderTarget = null;
  widget.rtWidth = 0;
  widget.rtHeight = 0;
  if (widget.quad) {
    stageCompositeScene?.remove(widget.quad);
    widget.quad.geometry.dispose();
    widget.quad.material.dispose();
    widget.quad = null;
  }
};

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

  // Context-loss watchdog: if the browser never fires webglcontextrestored
  // (long-idle eviction), rebuild on a fresh canvas element once the page is
  // visibly waiting on it.
  if (
    stageContextLostAt !== 0 &&
    document.visibilityState === "visible" &&
    time - stageContextLostAt > 4000
  ) {
    rebuildStageSurfaceAfterContextLoss();
    return;
  }

  // rAF's timestamp shares performance.now()'s clock, so it can be compared
  // with the boost deadline directly.
  const stageBoosted = time < stageBoostUntilMs;
  if (!stageBoosted && time - stageLastDrawTime < stageFrameIntervalMs()) {
    return;
  }
  stageLastDrawTime = time;

  stageTickCounter++;
  // Deep sleep (see the streak's comment): everything settled for a while and
  // nothing marked dirty — only sample layout every 4th tick. A boost means a
  // transition is in flight and every anchor is moving, so the layout sampling
  // this skips is exactly the work that has to happen.
  if (
    !stageBoosted &&
    stageIdleFrameStreak >= DASHBOARD_STAGE_SLEEP_AFTER_IDLE_FRAMES &&
    !stageNeedsRedraw &&
    (stageTickCounter & 3) !== 0
  ) {
    return;
  }

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

      // A below-stage overlay is open — only its own widgets may paint.
      if (
        stageVisibleScopeElement &&
        !stageVisibleScopeElement.contains(widget.anchor)
      ) {
        setWidgetCulled(widget, true);
        continue;
      }

      // While the header is in its idle-animation overlay, don't paint header
      // widgets over it (the stage canvas sits above the overlay).
      if (
        widget.headerHost &&
        widget.headerHost.dataset.dashboardHeaderTimeout === "true"
      ) {
        setWidgetCulled(widget, true);
        continue;
      }

      // During header transitions, opted-in widgets swap to their DOM
      // fallback so the moving chrome and the icon stay glued together
      // (see transitionFallback on RegisteredWidget).
      if (
        widget.transitionFallback &&
        widget.headerHost &&
        widget.headerHost.dataset.headerTransitioning === "true"
      ) {
        setWidgetCulled(widget, true);
        continue;
      }

      const rect = widget.anchor.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        setWidgetCulled(widget, true);
        continue;
      }
      // Cull widgets fully off-screen.
      if (
        rect.bottom <= 0 ||
        rect.top >= viewportHeight ||
        rect.right <= 0 ||
        rect.left >= viewportWidth
      ) {
        setWidgetCulled(widget, true);
        continue;
      }

      // Cull widgets hidden by CSS. Inactive hero-orbit cards keep real layout
      // rects but sit at visibility:hidden / opacity:0, so rect culling alone
      // leaves their scenes updating and rendering every frame.
      // checkVisibility forces a style recalc, so it runs every sixth stage
      // frame per widget (~200ms) with the result cached — visibility flips
      // are rare and a one-widget 200ms lag over a fading card is invisible.
      // The (frame + id) phase staggers the checks so all widgets don't burst
      // one big style recalc on the same frame; an explicit invalidation
      // (lastVisibleFrame pushed far negative) bypasses the phase gate.
      // A widget that has never been checked is checked on its very first
      // frame, before it can be drawn. Registration assumes lastVisible:true,
      // and at load stageFrameCounter starts near zero, so the staggered gate
      // below cannot pass for 5-11 frames (~250-550ms at the present cap) --
      // long enough for a widget the CSS hides at narrow widths (the header
      // meter icon) to paint on the stage over a header that has already
      // hidden its DOM, then vanish. Rect culling has no such delay, which is
      // why only on-screen-but-hidden widgets showed the flash. The burst this
      // adds is cheap: the widgets register together, so the first call
      // recalculates style and the rest read it clean in the same frame.
      const visibilityAge = stageFrameCounter - widget.lastVisibleFrame;
      if (
        widget.lastVisibleFrame < 0 ||
        (visibilityAge >= 6 &&
          ((stageFrameCounter + widget.id) % 6 === 0 || visibilityAge >= 12))
      ) {
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
      if (!widget.lastVisible) {
        setWidgetCulled(widget, true);
        continue;
      }
      setWidgetCulled(widget, false);

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
      const frozen = widget.freezeExempt
        ? false
        : widget.headerHost !== null
          ? headerWidgetsFrozen
          : contentWidgetsFrozen;
      let widgetChanged = false;
      // Advance the inactive-dim lerp (runs even while frozen — freezing is
      // exactly when the dim engages, and the glide must still be drawn).
      if (widget.dimCurrent !== widget.dimTarget) {
        const step = Math.max(delta, 1 / 60) / DASHBOARD_STAGE_DIM_SECONDS;
        widget.dimCurrent =
          widget.dimCurrent < widget.dimTarget
            ? Math.min(widget.dimTarget, widget.dimCurrent + step)
            : Math.max(widget.dimTarget, widget.dimCurrent - step);
        applyWidgetDim(widget);
        widgetChanged = true;
      }
      if (!frozen && update) {
        try {
          // void return = "changed" so unmigrated widgets keep rendering.
          if (update(elapsed, delta) !== false) widgetChanged = true;
          widget.failures = 0;
        } catch (error) {
          // A throwing scene must not take the whole stage (or, uncaught at
          // 30/s, the app) down with it: count, and after a few strikes drop
          // the widget so its DOM fallback comes back.
          if (++widget.failures >= 3) {
            stageWidgets.delete(widget);
            delete widget.anchor.dataset.webglReady;
            // Mirror the render()-throw drop path — without this the render
            // target and composite quad leak for the page's lifetime.
            releaseWidgetGpuCache(widget);
          }
          console.error("dashboard stage widget update failed", error);
          continue;
        }
      }
      if (widgetChanged) anyWidgetChanged = true;

      drawList.push({ widget, rect, changed: widgetChanged });
      drawKey += widget.id + "@" + stageRectKey(rect) + ";";
    }
  }

  // ---- Skip the frame when nothing visible changed. ----
  // Skipping presents nothing, so the canvas keeps showing its LAST presented
  // frame. The idle streak feeds the deep-sleep gate at the top of the frame.
  const rectsChanged = drawKey !== stageLastDrawKey;
  stageLastDrawKey = drawKey;
  // The boost bypasses this too, not just the rate gate above. stageRectKey
  // quantizes to half a pixel, which is the right trade at rest — sub-pixel
  // layout noise should not cost a present. During a transition it is exactly
  // wrong: the closing curve's long tail moves each anchor well under 0.5px
  // per frame, so the key stops changing, the frame is dropped, and the 3D
  // holds still while the DOM chrome around it keeps easing. Raising the frame
  // rate alone did nothing because the frames were being skipped here, not
  // there.
  if (!stageBoosted && !anyWidgetChanged && !rectsChanged && !stageNeedsRedraw) {
    stageIdleFrameStreak++;
    return;
  }
  stageIdleFrameStreak = 0;
  stageNeedsRedraw = false;

  // ---- Pass 2: refresh changed widgets' cached textures, then composite. ----
  // Each widget's scene renders into its OWN RenderTarget, and only when its
  // content or size changed — a pure position move just moves its quad. Every
  // present is then a cheap composite of the cached textures, so one animating
  // widget costs its own scene plus N textured quads instead of re-shading
  // every sibling scene (the previous full clear + redraw-all).
  const pixelRatio = renderer.getPixelRatio();
  renderer.setScissorTest(false);

  for (const widget of stageWidgets) {
    if (widget.quad) widget.quad.visible = false;
  }

  for (const entry of drawList) {
    const { widget, rect, changed } = entry;
    const cssWidth = Math.max(1, rect.width);
    const cssHeight = Math.max(1, rect.height);
    const targetRecreated = ensureWidgetRenderTarget(
      widget,
      cssWidth,
      cssHeight,
      pixelRatio,
    );
    if ((changed || targetRecreated) && widget.renderTarget) {
      renderer.setRenderTarget(widget.renderTarget);
      renderer.clear();
      try {
        renderer.render(widget.instance.scene, widget.instance.camera);
        widget.failures = 0;
      } catch (error) {
        if (++widget.failures >= 3) {
          stageWidgets.delete(widget);
          delete widget.anchor.dataset.webglReady;
          releaseWidgetGpuCache(widget);
        }
        console.error("dashboard stage widget render failed", error);
      }
    }
    if (!widget.renderTarget) continue;
    const quad = ensureWidgetQuad(widget);
    if (quad.material.map !== widget.renderTarget.texture) {
      quad.material.map = widget.renderTarget.texture;
      quad.material.needsUpdate = true;
    }
    quad.visible = true;
    quad.scale.set(cssWidth, cssHeight, 1);
    quad.position.set(rect.left + cssWidth / 2, -(rect.top + cssHeight / 2), 0);
  }
  renderer.setRenderTarget(null);

  if (stageCompositeScene && stageCompositeCamera) {
    renderer.clear();
    renderer.render(stageCompositeScene, stageCompositeCamera);
  }
}

// One canvas + renderer, shared by init and the context-loss rebuild.
// getContext() on a canvas whose context was reclaimed can only hand back the
// same dead context, so real recovery means a brand-new canvas element.
function createStageSurface(THREE: ThreeModule): {
  canvas: HTMLCanvasElement;
  renderer: WebGLRenderer;
} {
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

  // Context loss (GPU-process reclaim after hours idle, driver resets) blanks
  // the canvas while every widget's data-webgl-ready kept the DOM fallbacks
  // hidden — invisible icons until reload. Bring fallbacks back during the
  // outage and force a full repaint on restore (render-on-demand would
  // otherwise never redraw: nothing "changed" from its point of view).
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    // A lost context can composite as an opaque white sheet over the whole
    // dashboard — hide the canvas for the duration of the outage so even a
    // stalled recovery never whites out the app.
    canvas.style.opacity = "0";
    stageContextLostAt = performance.now();
    stageLastDrawKey = "";
    for (const widget of stageWidgets) {
      widget.ready = false;
      delete widget.anchor.dataset.webglReady;
    }
  });
  canvas.addEventListener("webglcontextrestored", () => {
    canvas.style.opacity = "1";
    stageContextLostAt = 0;
    stageNeedsRedraw = true;
    stageLastDrawKey = "";
    for (const widget of stageWidgets) {
      widget.ready = true;
      widget.anchor.dataset.webglReady = "true";
      widget.lastVisibleFrame = -1;
      // The old render targets died with the context — drop them so the
      // next frame re-creates and re-renders each cache.
      releaseWidgetGpuCache(widget);
    }
  });

  // Create the renderer BEFORE putting the canvas in the DOM: if the GPU
  // process is still down (the very condition the context-loss watchdog
  // rebuilds under), context creation throws — and a canvas appended first
  // would be left orphaned in the DOM.
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    // MSAA resolves on the CPU under a software rasterizer — skip it there.
    antialias: !isStageSoftwareRenderer(),
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // We manage clearing ourselves (render targets and the composite pass).
  renderer.autoClear = false;
  document.body.appendChild(canvas);

  return { canvas, renderer };
}

// Chrome does not reliably fire webglcontextrestored after evicting a
// long-idle tab's context — overnight the stage stayed lost and composited
// as an opaque white sheet over the whole dashboard. When the watchdog sees
// a loss that never restores, it swaps in a fresh canvas + renderer.
function rebuildStageSurfaceAfterContextLoss(): void {
  const THREE = stageThree;
  if (!THREE || !stageCanvas || !stageRenderer) return;
  let surface: { canvas: HTMLCanvasElement; renderer: WebGLRenderer };
  try {
    surface = createStageSurface(THREE);
  } catch {
    // Context creation failed — the GPU process is still down (overnight
    // eviction can outlast the first watchdog fire). Leave the DOM fallbacks
    // up and re-arm the watchdog to try again in another interval.
    stageContextLostAt = performance.now();
    return;
  }
  stageContextLostAt = 0;
  const oldCanvas = stageCanvas;
  try {
    stageRenderer.dispose();
  } catch {
    // A dead context can throw during teardown; the canvas swap below is the
    // actual recovery.
  }
  oldCanvas.remove();
  stageCanvas = surface.canvas;
  stageRenderer = surface.renderer;
  for (const widget of stageWidgets) {
    widget.ready = true;
    widget.anchor.dataset.webglReady = "true";
    widget.lastVisibleFrame = -1;
    releaseWidgetGpuCache(widget);
  }
  stageNeedsRedraw = true;
  stageLastDrawKey = "";
  stageIdleFrameStreak = 0;
  // The size guards still hold the OLD renderer's values and the viewport
  // usually hasn't changed since the loss — without zeroing them,
  // resizeStage() early-returns and the brand-new renderer stays at the
  // 300x150 canvas default, stretched over the viewport (permanent blur).
  stageLastWidth = 0;
  stageLastHeight = 0;
  stageLastPixelRatio = 0;
  resizeStage();
}

async function ensureStage(): Promise<void> {
  if (stageRenderer) return;

  stageInitPromise ??= (async () => {
    const THREE = await loadDashboardThree();
    stageThree = THREE;

    const { canvas, renderer } = createStageSurface(THREE);

    stageCompositeScene = new THREE.Scene();
    stageCompositeCamera = new THREE.OrthographicCamera(0, 1, 0, -1, -1, 1);

    // Scrolling moves every anchor rect and must wake the deep-sleep sampling
    // immediately — capture phase catches inner scrollers too.
    document.addEventListener(
      "scroll",
      () => {
        stageIdleFrameStreak = 0;
      },
      { capture: true, passive: true },
    );

    stageCanvas = canvas;
    stageRenderer = renderer;
    stageStartedAt = performance.now();
    stageLastTime = stageStartedAt;
    resizeStage();

    stageRafId = window.requestAnimationFrame(runStageFrame);
  })().catch((error) => {
    // A failed init (e.g. context creation transiently blocked by Chrome's
    // context-loss backoff) must not poison the cached promise — clear it so
    // the next ensureStage call retries instead of leaving the stage dead
    // until a full reload.
    stageInitPromise = null;
    throw error;
  });

  return stageInitPromise;
}

// ---- Batched header reveal --------------------------------------------------
// data-webgl-ready used to flip per widget as each shader compile finished, so
// the header icons popped in one-by-one over several seconds. Header-hosted
// widgets now reveal TOGETHER: the flag flush waits until every header widget
// registered so far has compiled (or a shared valve expires), then flips them
// all in one frame. Widgets registering after the flush reveal immediately.
const DASHBOARD_STAGE_HEADER_REVEAL_VALVE_MS = 4500;
let stageHeaderRevealFlushed = false;
let stageHeaderRevealValveId: ReturnType<typeof setTimeout> | 0 = 0;
const stageHeaderRevealPending = new Set<RegisteredWidget>();
const stageHeaderRevealCompiled = new Set<RegisteredWidget>();

const flushDashboardHeaderReveal = () => {
  if (stageHeaderRevealFlushed) return;
  stageHeaderRevealFlushed = true;
  if (stageHeaderRevealValveId) globalThis.clearTimeout(stageHeaderRevealValveId);
  for (const widget of stageHeaderRevealCompiled) {
    if (!stageWidgets.has(widget)) continue;
    widget.anchor.dataset.webglReady = "true";
    // Reset the visibility cache so the 6-frame throttle can't re-stagger the
    // coordinated reveal.
    widget.lastVisibleFrame = -1;
  }
  stageHeaderRevealPending.clear();
  stageHeaderRevealCompiled.clear();
  markDashboardStageDirty();
};

const maybeFlushDashboardHeaderReveal = () => {
  if (stageHeaderRevealFlushed || stageHeaderRevealPending.size !== 0) return;
  // Debounced: header widgets register over several frames, so an instantly
  // compiled early widget must not flush the batch before its siblings even
  // join. The valve still bounds the total wait.
  globalThis.setTimeout(() => {
    if (!stageHeaderRevealFlushed && stageHeaderRevealPending.size === 0) {
      flushDashboardHeaderReveal();
    }
  }, 250);
};

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
    dimCurrent: 0,
    dimTarget: 0,
    // Read the DOM, not a literal: the same anchor can re-register (build
    // change) with a stale data-webgl-culled left from its previous life, and
    // the change-guard in setWidgetCulled would never clear it otherwise.
    culled: anchor.dataset.webglCulled === "true",
    ready: false,
    failures: 0,
    // A widget under [data-dashboard-webgl-header-exempt] opts out of the
    // header set even when it sits inside the header timeout scope — the
    // meter panel's tornado is only ever on screen while the open panel is
    // being read, so inheriting the header-idle scene dim just draped a
    // shadow over it.
    headerHost: anchor.closest("[data-dashboard-webgl-header-exempt]")
      ? null
      : anchor.closest<HTMLElement>("[data-dashboard-header-timeout]"),
    freezeExempt:
      anchor.closest("[data-dashboard-webgl-header-exempt]") !== null,
    transitionFallback:
      anchor.closest("[data-dashboard-webgl-transition-fallback]") !== null,
    renderTarget: null,
    rtWidth: 0,
    rtHeight: 0,
    quad: null,
  };
  if (widget.headerHost && headerWidgetsFrozen) {
    // Snap, not lerp: a widget registering into an already-inactive header
    // should first appear dimmed, not flash bright and fade.
    setWidgetSceneDimmed(widget, true, true);
  }
  // The frame loop (which normally mirrors cull state) is bypassed entirely
  // while the stage is idle-hidden — mark a widget registering into that
  // state culled here so its fallback isn't ready-suppressed over nothing.
  if (stageIdleHidden) {
    setWidgetCulled(widget, true);
  }
  stageWidgets.add(widget);
  // Wake the frame loop's deep sleep so the new widget is discovered on the
  // very next tick instead of the sleep-mode sampling cadence.
  markDashboardStageDirty();

  const joinsHeaderRevealBatch =
    widget.headerHost !== null && !stageHeaderRevealFlushed;
  if (joinsHeaderRevealBatch) {
    stageHeaderRevealPending.add(widget);
    if (!stageHeaderRevealValveId) {
      stageHeaderRevealValveId = globalThis.setTimeout(
        flushDashboardHeaderReveal,
        DASHBOARD_STAGE_HEADER_REVEAL_VALVE_MS,
      );
    }
  }

  const markReady = () => {
    // Unmounted while compiling — leave the DOM alone.
    if (!stageWidgets.has(widget)) return;
    // Compile settled after a context loss: the loss handler already restored
    // the fallbacks, and flagging ready on a dead context would re-hide them
    // while the stage can present nothing. The restore handler re-flags
    // everything when the context comes back.
    try {
      if (stageRenderer?.getContext()?.isContextLost()) return;
    } catch {
      // getContext unavailable — proceed as before.
    }
    widget.ready = true;
    if (joinsHeaderRevealBatch && !stageHeaderRevealFlushed) {
      // Header icons reveal together: hold the DOM flag for the batch flush.
      stageHeaderRevealPending.delete(widget);
      stageHeaderRevealCompiled.add(widget);
      maybeFlushDashboardHeaderReveal();
      return;
    }
    // Signals the CSS to hide this widget's static fallback image now that
    // the shared-stage 3D is drawing (see .dashboard-header-logo-3d__image).
    anchor.dataset.webglReady = "true";
    markDashboardStageDirty();
  };

  // Compile this widget's shaders in parallel, off the main thread, then let it
  // draw. Every widget kicks this off on mount, so they compile together and
  // appear together instead of serially blocking the main thread one by one.
  const compileAsync = (
    stageRenderer as (WebGLRenderer & {
      compileAsync?: (scene: unknown, camera: unknown) => Promise<unknown>;
    }) | null
  )?.compileAsync;
  let compileSettled: Promise<unknown> = Promise.resolve();
  if (stageRenderer && typeof compileAsync === "function") {
    const timeoutId = globalThis.setTimeout(
      markReady,
      DASHBOARD_STAGE_COMPILE_TIMEOUT_MS,
    );
    compileSettled = Promise.resolve(
      compileAsync.call(stageRenderer, instance.scene, instance.camera),
    ).catch(() => undefined);
    void compileSettled.then(() => {
      globalThis.clearTimeout(timeoutId);
      markReady();
    });
  } else {
    markReady();
  }

  return () => {
    stageWidgets.delete(widget);
    stageHeaderRevealPending.delete(widget);
    stageHeaderRevealCompiled.delete(widget);
    maybeFlushDashboardHeaderReveal();
    releaseWidgetGpuCache(widget);
    // The widget's quad is gone — present once so its pixels clear.
    markDashboardStageDirty();
    // Disposing mid-compile orphans the GPU programs/buffers compileAsync is
    // still uploading (dispose events fire before the renderer tracks the
    // objects) — repeated fast open/close of the reward scenes leaked GPU
    // memory that way. Wait for the compile to settle first.
    void compileSettled.then(() => {
      instance.dispose?.();
    });
  };
}
