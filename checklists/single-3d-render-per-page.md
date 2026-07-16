# Single 3D Render Per Page

Status: Active
Created: 2026-06-23

## Goal

Move the marketing and preview pages toward one page-owned WebGL render surface, or one explicitly approved live 3D owner per route while the page renderer is being built. All other 3D-looking objects should render as CSS, SVG, DOM text, or cached still images unless they are registered into the page render surface.

## Why It Matters

The root page currently shows blank white 3D placeholders near the hero/header area. The earlier WebGL audit found that `/` can mount about 29 renderer-producing components and `/member-dashboard-preview` can mount about 51. Even with a shared renderer budget, per-component canvases still create failure modes: context pressure, delayed snapshots, hidden canvases, broken fallback boxes, and hard-to-debug overlap around header/sign-in controls.

## Relationship To Existing Checklist

This checklist builds on `webgl-rendering-architecture.md`.

- `webgl-rendering-architecture.md` tracks the immediate renderer budget, queue, snapshot, and disposal fixes.
- This checklist tracks the next architecture pass: page-level ownership of 3D rendering so components stop creating isolated renderers by default.

## Working Definition

"Single 3D render per page" means:

- Each route has at most one live WebGL renderer/canvas mounted for decorative/product 3D.
- Repeated icons, headings, labels, cards, and inactive states do not create their own WebGL renderer.
- Components that need live 3D register a render request with the page render owner instead of calling `createDashboardWebGlRenderer` themselves.
- Components that do not get the live slot must have a polished fallback, not a blank white box or broken image placeholder.

## Render Fallback Ladder

Use this order when a component wants a 3D effect:

1. Page-owned live WebGL slot for the highest-value object on the route.
2. 2D live-looking render for backup motion, using CSS transforms, SVG, Canvas 2D, or sprite frames without creating a WebGL context.
3. Static cached still image or normal DOM fallback.

The 2D live-looking path is important because it can preserve the "alive" feel when WebGL is unavailable, over budget, or disabled, without reintroducing the original problem of many independent Three.js renderers.

## Additional Techniques

- Progressive enhancement: render readable DOM/CSS first, then upgrade to 2D motion or WebGL only after the page is stable.
- Capability detection: check WebGL support, reduced-motion preference, device memory, viewport size, and active renderer budget before choosing a render mode.
- Context-loss handling: listen for `webglcontextlost` and `webglcontextrestored`, immediately swap to fallback on loss, and avoid aggressive auto-retry loops.
- Visibility gating: use `IntersectionObserver` so below-the-fold decorative objects do not request live rendering until near the viewport.
- Priority scheduling: reserve the live WebGL slot for hero/header/product-critical elements before decorative icons and repeated cards.
- 2D impostors: use CSS perspective, SVG gradients/filters, Canvas 2D, image sequences, or sprite sheets to mimic depth without a WebGL context.
- Static asset manifests: give important 3D components committed fallback stills in `public/` so broken runtime snapshots never produce empty boxes.
- Shared measurement: use `ResizeObserver` for slot bounds so fallback and live render layouts stay the same size.
- Resource reuse: share geometries, materials, textures, and generated stills where possible; dispose anything route-specific on unmount.
- Diagnostics: expose route-level debug attributes for active renderer count, fallback mode, context-loss count, and registered slots.
- Visual regression: verify desktop and mobile screenshots, including canvas-pixel checks where a blank render could pass DOM tests.
- Accessibility fallback: keep real text/labels in DOM and treat decorative canvases as hidden from assistive tech unless they carry meaningful content.

## Recent Rendering Research - 2026-06-23

Primary-source check:

- The app is already on `three` `0.184.0`, and the official Three.js GitHub releases page lists `r184` as the latest release checked today.
- Three.js `WebGPURenderer` is now documented as the newer alternative to `WebGLRenderer`; it attempts WebGPU when supported and can fall back to a WebGL 2 backend.
- Three.js exposes a `WebGPU.isAvailable()` capability helper, which should be used before any WebGPU experiment.
- WebGPU is still not a safe baseline dependency for the public pages. MDN marks relevant WebGPU canvas APIs as limited availability and secure-context dependent, so WebGL/2D/static fallbacks remain required.
- `OffscreenCanvas` can provide 2D, WebGL, WebGL2, and WebGPU contexts and can run in workers, but moving Three.js route rendering to a worker should remain a later optimization after the one-renderer/page-owner architecture is stable.
- Three.js `BundleGroup` can help static groups under `WebGPURenderer` with a WebGPU backend, but it is not a fix for the current blank-placeholder problem because the current problem is too many isolated renderers and weak fallback behavior.
- Three.js `WebGLRenderer.setNodesHandler()` exists for Node Material / TSL migration toward WebGPU. Treat this as future migration support, not as a near-term requirement for fixing the current pages.
- Three.js `r184` added `HTMLTexture`; keep it in mind for future DOM-to-texture experiments, but do not use it as the first fallback strategy because normal DOM/CSS/SVG is simpler and more robust for marketing text and icons.

Decision from research:

- Do not pause the current plan for a new rendering stack.
- Keep the first implementation focused on one page-owned live WebGL surface, 2D live-looking fallbacks, static committed fallbacks, and clear capability/failure handling.
- Add WebGPU/OffscreenCanvas only as optional future milestones once the current blank placeholders and renderer-count problems are fixed.

## Candidate Routes

- `/`
- `/member-dashboard-preview`
- `/login`
- `/onboarding/assessment`
- Any dashboard route that mounts multiple dashboard 3D widgets at once

## Tasks

- [ ] Capture current broken-state screenshots for `/` and `/member-dashboard-preview`.
- [ ] Record which exact components produce the visible blank white placeholders.
- [ ] Confirm whether the first milestone is "one live 3D object per page" or "one shared WebGL canvas that can render multiple registered objects."
- [ ] Define a route-level render owner API before changing individual 3D components.
- [ ] Pick the first pilot route, preferably `/` because the broken placeholder is visible above the fold.
- [ ] Choose the one live 3D owner for the pilot route.
- [ ] Define which components need a 2D live-looking fallback versus a static still fallback.
- [ ] Convert non-owner above-the-fold 3D elements to stable DOM/CSS/SVG/still-image fallbacks.
- [ ] Make every fallback occupy the same layout box as the 3D version.
- [ ] Ensure failed WebGL setup renders the fallback immediately instead of leaving an empty canvas or image icon.
- [ ] Add context-loss handling that falls back cleanly without retry loops.
- [ ] Gate below-the-fold render requests with visibility/priority rules.
- [ ] Add route-level debug attributes for live renderer count, registered render requests, and fallback count.
- [ ] Verify the header/sign-in/render-mode area has no overlapping blank boxes.
- [ ] Repeat the same setup for `/member-dashboard-preview` after the root route is stable.

## Proposed Page Render Owner API

Keep this conceptual until the first implementation pass proves the shape:

- `PageWebGlStage` owns the only live renderer/canvas for the route.
- `PageWebGlProvider` exposes registration through React context.
- `usePageWebGlSlot()` lets a component register a slot with bounds, priority, live/still preference, and fallback state.
- Priority decides which elements are live when budget or visibility is constrained.
- Intersection/resize observers update slot bounds without each component creating a renderer.
- The provider must be optional so components can still render a fallback outside supported routes.

## Fallback Rules

- No blank white rectangles.
- No browser broken-image icons.
- No hidden canvas that still affects layout.
- No fallback may create a new WebGL renderer.
- No inline `<style>` text leaking into headings or accessibility text.
- Decorative 3D text should have readable DOM text as the accessibility and no-WebGL fallback.
- Repeated icon grids should prefer CSS/SVG/still assets until the shared stage exists.
- 2D live-looking fallbacks should be lightweight and deterministic: CSS transforms, SVG filters/gradients, Canvas 2D, or committed sprite frames.
- Still snapshots must be generated from a known good render, not from a failed or empty canvas.

## Open Questions

- Should the first implementation only enforce one live 3D object per page, or should it immediately introduce the shared route-level canvas?
- Which homepage object is the highest-value live render: header logo, hero object, or primary 3D heading?
- Which effects deserve 2D live-looking fallbacks, and which should just be static stills?
- Should the render-mode toggle become a diagnostic-only control after the architecture is stable?
- Should cached stills live in `public/` as committed assets, or be generated at runtime and stored in memory/local storage?

## Notes

- The current broken root page shows a large blank white placeholder near the top hero/header area and a smaller blank placeholder lower on the first viewport.
- The likely root cause is not one individual object being "bad"; it is the page mounting too many isolated 3D/canvas objects and some fallback paths rendering visibly.
- Existing components should continue using `createDashboardWebGlRenderer` until the route-level owner exists, but new 3D components should not add more independent renderer call sites.

## Verification

- [ ] `npx tsc --noEmit`
- [ ] Lint touched files.
- [ ] `/` loads with no blank 3D placeholders.
- [ ] `/member-dashboard-preview` loads with no blank 3D placeholders.
- [ ] Browser console has no WebGL context loss errors.
- [ ] The document reports no more than one active live WebGL renderer for the target route.
- [ ] 2D live-looking fallback mode has motion without creating extra WebGL contexts.
- [ ] Fallback mode still looks intentional on mobile and desktop.
