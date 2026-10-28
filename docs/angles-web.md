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

## Connected accounts — 2026-10-27

Angles uses the existing Sound Fitness Supabase identity UUID and credentials. There is no account copying or email-based merging. The account dialog supports existing coach/client logins and Angles-specific free registration. New registrations send only `full_name` and a cosmetic `signup_product: angles` label; the existing hardened shared trigger creates a basic profile. Signup neither creates a coaching relationship nor activates billing. Email confirmation remains required by the provider; confirm the email and return to Angles to sign in. Production email delivery/redirect behavior still needs a real mailbox check.

Installed additive migration: `supabase/migrations/20261027090000_angles_account_context.sql`. `angles_accounts` stores Angles enrollment source and trusted product grants separately from website coaching/billing. `get_angles_account_context()` derives the user from the verified JWT, enforces existing MFA, enrolls only that user idempotently, and maps exactly the website `coach` role to Angles `coach`. All other website roles have `training_user` capabilities in Angles, without an Angles admin role. Existing clients can sign in without migrating their account. Enrollment source describes where an account joined, **not** whether they are a coaching client.

Only trusted server operations can change `access_plan` or its expiry. The default is `free`; expired grants resolve to `free`. Price labels, signup metadata, website package names and coach status do not activate paid access. Checkout/webhook entitlement fulfillment is not implemented. Coach/client assignment and consented assessment sharing are not implemented; coaches retain only their own History access. The shared schema is compatible with existing Android identity and assessment sync; this change updates the browser account UI, not Android role screens.

Verification: 13 isolated assessment/account tests, TypeScript and scoped app/library ESLint pass. The live PostgreSQL verifier tests the actual function and RLS using disposable fixtures in a transaction that always rolls back: metadata escalation, approved coach mapping, admin-to-training-user mapping, foreign row isolation, denied direct writes and profile role changes, expiry, anonymous denial, and enrolled MFA/AAL2. Re-run explicitly with `node scripts/verify-angles-accounts.cjs --env-file <server-env> --postgres-module <postgres/src/index.js> --ca <trusted-ca>`; `--apply` installs only this migration after a successful trial and skips an already installed schema. No fixture accounts persist. Browser verification recognized the existing signed-in website identity and showed the server-provided role and free access. No personal password was entered or session signed out.

The broader ESLint command including CommonJS test scripts hits an existing global React-hooks plugin configuration error; the scoped TS/TSX app/library lint passes. Both CommonJS scripts also pass Node syntax checks.

## Model assets

The worker, SDK and model are served from `/angles-assets/`, with no third-party model/CDN requests. MediaPipe SDK version is pinned in `package.json` / lockfile. To refresh its vendored browser files deliberately:

```powershell
Copy-Item node_modules/@mediapipe/tasks-vision/vision_bundle.js public/angles-assets/vision_bundle.js
Copy-Item node_modules/@mediapipe/tasks-vision/wasm/* public/angles-assets/wasm
```

The model and videos are the existing native app assets. Asset notices and hashes are in `public/angles-assets/NOTICE.md`.
