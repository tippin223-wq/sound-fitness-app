# Angles browser app

Open `http://localhost:3000/angles` with the existing Sound Fitness development server (`npm run dev`). This is the real browser implementation, alongside the native Android app at `C:\Users\josep\01_Business\Sound Fitness\sound-fitness-movement-assessor`.

## Included

- Native-inspired Home, a noninteractive scrolling menu preview for signed-out visitors, and working navigation during the free assessment or after sign-in.
- Two swipeable pricing columns: Angles standalone at **$10/month**; Sound Fitness App Only at $29/month, Hybrid at $79/month and Online Coaching at $199/month. The two higher tiers describe Angles inclusion. Checkout and bundle activation remain coming soon; these labels do not grant paid entitlements.
- Five existing Android exercise videos, used directly as demonstrations.
- Front/rear camera selection, on-device MediaPipe Pose Landmarker, skeleton overlay, knee estimates, conservative squat counting, pause/resume, restart confirmation and Finish & save. Model inference runs in a dedicated worker with one frame in flight. Camera tracks, workers and animation frames close on exit. Backgrounding pauses analysis and invalidates a partial rep.
- The exercise-video analysis option exercises the real model without accessing a webcam. It is labeled as demo analysis and cannot save a personal result.
- Versioned, validated, account-separated browser History. Guest results are not silently attached to an account. Failed storage writes retain the completed in-memory result for retry. Existing corrupt records are not overwritten. Unsaved sessions prompt before leaving; drafts are not restored after a page reload.
- Existing Sound Fitness Supabase browser identity and cookies, password sign-in and enrolled TOTP verification. No provider replacement, auth redirect changes or privileged keys. Account settings/recovery open the existing Sound Fitness portal.
- Explicit account History sync against the already-installed `angles_assessments` schema/RPCs. Sync paginates, checks ownership/MFA and confirmations, rejects conflicts, honors cloud tombstones and preserves browser originals on error. It sends summaries only. No migration or production test data was created for the browser implementation.

## Local verification

```text
npx tsc --noEmit
npx eslint app/angles lib/angles
node --test scripts/test-angles.cjs scripts/test-angles-cloud.cjs
```

Eleven isolated tests cover aspect-ratio-correct angles, confidence/framing, dwell thresholds and interrupted reps, local idempotency and account separation, corrupt/quota preservation, cloud ownership/MFA, tombstones, conflicts, acknowledgements, concurrent local results and account changes. Cloud tests use in-memory fixtures, never the production service.

Browser checks: `/angles` returns HTTP 200; Home renders, both pricing columns switch, the pricing account button opens the shared-account dialog, library selection changes the actual video, History shows its empty state, and the local worker processes the bundled video with a visible skeleton. No browser console errors. A browser session already signed in to Sound Fitness was recognized; no personal password was entered and no cloud summaries were written. Actual webcam permission/measurement accuracy and a real cross-device sync cycle still need user/device validation. Keep the native warning: emulator or demo results do not validate physical measurement accuracy.

An audit during setup reported existing `next` (critical) and transitive `zod` (high) advisories. The only dependency added here is pinned `@mediapipe/tasks-vision@1.2.0`; its addition did not introduce those packages. This localhost task does not deploy or upgrade the shared framework. Resolve the existing advisories before external release.

## Model assets

The worker, SDK and model are served from `/angles-assets/`, with no third-party model/CDN requests. MediaPipe SDK version is pinned in `package.json` / lockfile. To refresh its vendored browser files deliberately:

```powershell
Copy-Item node_modules/@mediapipe/tasks-vision/vision_bundle.js public/angles-assets/vision_bundle.js
Copy-Item node_modules/@mediapipe/tasks-vision/wasm/* public/angles-assets/wasm
```

The model and videos are the existing native app assets. Asset notices and hashes are in `public/angles-assets/NOTICE.md`.
