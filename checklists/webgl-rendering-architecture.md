# WebGL Rendering Architecture

Status: Active
Created: 2026-06-22

## Goal

Reduce WebGL context pressure, main-thread stalls, and render snapshot timeouts across the marketing and member preview pages.

## Why It Matters

The app currently uses many independent Three.js renderers and canvas-backed UI objects. On weaker devices, too many active WebGL contexts can crash, stall, or trigger browser context loss. The long-term fix is to centralize renderer management and make decorative 3D assets degrade to cached images when needed.

## Initial Scope

- `/`
- `/member-dashboard-preview`
- Shared marketing header 3D controls
- Shared dashboard WebGL snapshot utilities

## Tasks

- [x] Audit every component that creates `new THREE.WebGLRenderer`.
- [x] Count which 3D components can mount at the same time on `/`.
- [x] Count which 3D components can mount at the same time on `/member-dashboard-preview`.
- [x] Identify components that should render live versus cached/still only.
- [x] Add or tighten a renderer budget so too many live contexts cannot start at once.
- [x] Centralize snapshot queue behavior in `components/dashboard/dashboardWebGlRenderer.ts`.
- [x] Process snapshot captures sequentially instead of all at once.
- [x] Add explicit geometry/material disposal guidance or helpers where repeated scenes are created.
- [ ] Verify that still-image mode does not create extra overlapping canvases.
- [ ] Decide whether OffscreenCanvas/Web Worker rendering is necessary after the renderer budget is stable.

## Notes

- Browsers commonly cap active WebGL contexts, often around 8 to 16.
- The safest first milestone is not a worker. It is a shared budget/queue that prevents runaway renderer creation.
- OffscreenCanvas worker rendering may be valuable later, but it is a larger compatibility step for Next.js and Three.js.

## Step 1 Audit Results - 2026-06-22

Direct `new THREE.WebGLRenderer` usage is centralized:

| File | Line | Notes |
| --- | ---: | --- |
| `components/dashboard/dashboardWebGlRenderer.ts` | 797 | Only direct constructor. All app 3D components should go through `createDashboardWebGlRenderer`. |

Renderer factory requests found: **30 call sites across 25 files**.

| File | Calls | Lines |
| --- | ---: | --- |
| `components/AssessmentWebGlIcon.tsx` | 1 | 672 |
| `components/MarketingEnergyLine3D.tsx` | 1 | 182 |
| `components/MarketingHeaderLogo3D.tsx` | 1 | 699 |
| `components/MarketingSectionHeading3D.tsx` | 1 | 504 |
| `components/MemberPreviewRowLabels3D.tsx` | 1 | 174 |
| `components/dashboard/DashboardBasketball3D.tsx` | 1 | 196 |
| `components/dashboard/DashboardCategoryUfoScene3D.tsx` | 1 | 868 |
| `components/dashboard/DashboardDumbbell3D.tsx` | 1 | 75 |
| `components/dashboard/DashboardFeatureRowIcons3D.tsx` | 1 | 431 |
| `components/dashboard/DashboardLevelMeterBar3D.tsx` | 1 | 122 |
| `components/dashboard/DashboardLightningBolt3D.tsx` | 1 | 94 |
| `components/dashboard/DashboardLogo3D.tsx` | 1 | 144 |
| `components/dashboard/DashboardMeterMenuIcon3D.tsx` | 1 | 101 |
| `components/dashboard/DashboardPhone3D.tsx` | 1 | 106 |
| `components/dashboard/DashboardProfileActionIcons3D.tsx` | 2 | 92, 334 |
| `components/dashboard/DashboardRealLifeIcons3D.tsx` | 1 | 172 |
| `components/dashboard/DashboardScrollButton3D.tsx` | 1 | 160 |
| `components/dashboard/DashboardSoundPointsTeslaCoil3D.tsx` | 1 | 1515 |
| `components/dashboard/DashboardSparkles3D.tsx` | 1 | 102 |
| `components/dashboard/DashboardStepNumber3D.tsx` | 1 | 382 |
| `components/dashboard/DashboardTornadoEmeralds3D.tsx` | 4 | 406, 946, 2445, 2611 |
| `components/dashboard/DashboardTreasureChest3D.tsx` | 2 | 1126, 1369 |
| `components/dashboard/DashboardTrophy3D.tsx` | 1 | 310 |
| `components/dashboard/DashboardWhistle3D.tsx` | 1 | 225 |
| `components/dashboard/dashboardWebGlRenderer.ts` | 1 | 701 |

Immediate observations:

- The constructor itself is already centralized, so the next fix should happen in `createDashboardWebGlRenderer` / `waitForDashboardWebGlStart`, not by chasing 25 files first.
- `dashboardWebGlRenderer.ts` also creates a preload/test renderer through the same helper.
- `DashboardTornadoEmeralds3D.tsx`, `DashboardTreasureChest3D.tsx`, and `DashboardProfileActionIcons3D.tsx` contain multiple renderer-producing variants and should be watched closely during route mount counts.
- Snapshot capture is centralized in `attachDashboardWebGlSnapshotCapture`, but still capture currently happens inside wrapped `renderer.render`, so route-level overload can still occur before enough snapshots settle.

## Step 2 Homepage Mount Count - 2026-06-22

The `/` route is implemented in `app/page.tsx`. It does not create renderers directly, but it mounts many components that call `createDashboardWebGlRenderer`.

Estimated maximum renderer-producing mounts on `/`: **29**.

| Area | Renderer-producing mounts | Count | Notes |
| --- | --- | ---: | --- |
| Sticky header | `MarketingHeaderLogo3D` | 1 | `MarketingCtaButton3D`, `SoundHeaderAppPill`, and `WebGlRenderModeToggle` do not create WebGL renderers. |
| Hero journey cards | object scene plus `DashboardStepNumber3D` per card | 6 | 3 journey cards, each with 1 object renderer and 1 step-number renderer. |
| Required first step header | `MarketingSectionHeading3D` | 2 | Eyebrow heading plus main heading. |
| Required first step cards | icon, `DashboardStepNumber3D`, and `MarketingEnergyLine3D` per card | 9 | 3 cards x 3 renderer-producing children. |
| Member app header | `MarketingSectionHeading3D` | 2 | Eyebrow heading plus main heading. |
| Member app feature cards | feature icon renderers | 4 | 4 app feature cards. |
| Built for real life header | `MarketingSectionHeading3D` | 2 | Eyebrow heading plus main heading. |
| Built for real life benefit cards | real-life icon renderers | 3 | 3 benefit cards. |

Immediate observations:

- This route alone can exceed the common 8 to 16 WebGL-context browser limit.
- Because these sections are all rendered in one page tree, below-the-fold 3D components still mount unless we add lazy mounting, a renderer budget, or a still-image-first path.
- `MarketingCtaButton3D` has a 3D name but is CSS/SVG-style presentation, so it should not be included in WebGL context budgets.
- The next practical fix should be a shared renderer start budget/queue before visual polish continues.

## Step 3 Member Preview Mount Count - 2026-06-22

The `/member-dashboard-preview` route is implemented in `app/member-dashboard-preview/page.tsx` and pulls in several nested preview components.

Estimated maximum renderer-producing mounts on `/member-dashboard-preview`: **51**.

| Area | Renderer-producing mounts | Count | Notes |
| --- | --- | ---: | --- |
| Sticky header | `MarketingHeaderLogo3D` | 1 | CTA buttons, app pill, and render-mode toggle do not create WebGL renderers. |
| Hero heading/card shell | coin, 2 headings, and background dumbbell | 4 | Includes `DashboardSpinningSoundCoin3D`, 2 `MarketingSectionHeading3D`, and 1 `DashboardDumbbell3D`. |
| Profile reward orbit | reward objects | 3 | All 3 reward orbit objects are mounted, even though only one is visually active. |
| Goal milestones | milestone icons | 3 | All 3 flip-card backs mount their WebGL icon side. |
| Preview row labels and icons | label renderer plus 4 row icons | 5 | `MemberPreviewRowLabels3D` renders labels in one canvas; row icons are separate renderers. |
| `MarketingAppOrbitPreview` | coin plus joystick | 2 | Slide stills and journey balls use regular DOM/SVG, not WebGL. |
| Member app feature heading | `MarketingSectionHeading3D` | 2 | Eyebrow heading plus main heading. |
| `MemberAppFeatureAccordion` summary icons | column hero icons | 3 | One per accordion column. |
| `MemberAppFeatureAccordion` module icons | row icons | 14 | Closed `<details>` panels still render their contents, so all module icons mount. |
| Extra feature note | `DashboardSparkles3D` | 1 | "And so much more" icon. |
| `MemberAppPricingSelector` | gem cluster, selected gem, and 3 plan icons | 5 | The CSS-hidden gem cluster is still mounted in React. |
| Built for real life heading | `MarketingSectionHeading3D` | 2 | Eyebrow heading plus main heading. |
| Built for real life cards | step numbers plus icons | 6 | 3 cards x 2 renderer-producing children. |

Immediate observations:

- This route is the highest-risk page in the initial scope.
- Several inactive or visually hidden elements still create renderers: closed feature accordion bodies, inactive reward orbit items, hidden pricing gem cluster, and milestone flip-card backs.
- `live={false}`, `paused`, or inactive props reduce animation intent, but they do not prevent renderer creation in the audited components.
- The shared budget should treat renderer creation as a scarce resource, independent of whether the component is visible, paused, or intended to snapshot.

## Step 4 Live vs Still Candidates - 2026-06-22

Keep live by default:

- Above-the-fold brand/header pieces: `MarketingHeaderLogo3D`, primary hero objects, and main visible page headings.
- Interactive controls that respond directly to user motion: dashboard scroll joystick, selected reward orbit item, selected pricing card icon, and active milestone flip faces.
- Member dashboard reward/header objects where motion is part of the product feel.

Prefer still/cached or budget fallback first:

- Eyebrow/subheading 3D text.
- Repeated card icons in grids and accordions.
- Below-the-fold feature icons.
- Closed accordion body icons.
- Inactive reward orbit items.
- CSS-hidden decorative clusters.
- Milestone back-face icons until the card is actively flipping.

## Step 5 Renderer Budget Guard - 2026-06-22

Implemented in `components/dashboard/dashboardWebGlRenderer.ts`:

- Added a shared active renderer budget: 8 by default, 5 on narrower or lower-power devices.
- Added a central budget wait queue in `waitForDashboardWebGlStart`.
- Added a hard guard in `createDashboardWebGlRenderer` so over-budget components fall back to cached snapshots instead of creating more WebGL contexts.
- Added document-level debug data: `data-dashboard-webgl-active-renderers` and `data-dashboard-webgl-renderer-budget`.
- Renderer slots are released through wrapped `dispose()` and `forceContextLoss()`.

## Step 6 Snapshot Queue - 2026-06-22

Implemented in `components/dashboard/dashboardWebGlRenderer.ts`:

- Centralized snapshot throttling so `toDataURL()` captures are spaced by 70ms instead of happening in a burst.
- Added `data-dashboard-webgl-snapshot-queued` while a canvas is waiting for its snapshot turn.
- Updated render-loop logic so paused/non-live canvases can settle into their still snapshot instead of being treated as live forever.

## Step 7 Disposal Guidance - 2026-06-22

Audit result:

- Most renderer-producing components already dispose geometry/materials on cleanup through a local `disposeObject` helper or equivalent cleanup block.
- The disposal helper pattern is duplicated across many files, especially icon/rendering components in `components/dashboard/`.
- The highest-risk files remain the multi-scene assets: `DashboardTornadoEmeralds3D.tsx`, `DashboardTreasureChest3D.tsx`, `DashboardSoundPointsTeslaCoil3D.tsx`, and large dashboard scenes.

Guidance for future 3D edits:

- Every component that creates `THREE.Geometry`, `THREE.BufferGeometry`, material instances, textures, or render targets must dispose them in the React effect cleanup path.
- Prefer traversing the scene/root object and disposing each mesh geometry plus single or array materials.
- Dispose standalone shared geometries/materials/textures that are not reachable by scene traversal.
- Always call `renderer.dispose()` in cleanup; call `renderer.forceContextLoss()` only for components that already use it intentionally or where the shared renderer budget requires immediate slot release.
- Do not add new per-component renderer constructors. Use `createDashboardWebGlRenderer`.

## Verification

- [x] `npx tsc --noEmit`
- [x] Lint touched files.
- [x] `/` loads.
- [x] `/member-dashboard-preview` loads.
- [ ] Confirm no obvious blank 3D placeholders.
- [ ] Confirm still-image mode does not overlap sign-in/header controls.
