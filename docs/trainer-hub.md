# Trainer Hub

Working name for the education-centered trainer product inside Sound Fitness. The proposed offer is **$500 paid once for 24 months of access, without automatic renewal**. The access duration is a working default pending the user's two-versus-three-year choice. `HUB_BRAND` and `HUB_OFFER` in `lib/trainer-hub/model.ts` centralize the name and offer.

## Working product

- `/trainer-hub`: introduction and proposed offer.
- `/trainer-hub/preview`: fictional sample workspace persisted separately in this browser. Never enter real client information here. Reset sample records through Your practice.
- `/trainer-hub/workspace`: personal workspace for existing Sound Fitness coach/admin accounts. The coach portal links here.
- `/api/trainer-hub/workspace`: authenticated GET/PUT. Account identity comes from the verified bearer token, not submitted document data.

The first version contains six introductory workflow lessons and knowledge checks, the existing canonical exercise catalog (currently 73 exercises), favorites, editable reusable programs, client goals/context, program assignments, dated coach-entered check-ins, a practice offer editor, and JSON exports. Records drive displayed counts. Monthly service value is an estimate of active clients' recorded rates, not collected revenue. This is an introductory curriculum, not the completed paid textbook or a certification.

## Storage and activation

Apply `supabase/migrations/20261012100000_trainer_hub.sql` to the intended Supabase environment before using live saves. It was tested in an isolated PGlite database; it has not been applied to production. It adds an independent trainer-owned document table and a coach/admin-only save RPC. Existing member workouts and billing records are unaffected.

The RPC serializes saves, compares document revisions, and supports exact retry identities. RLS restricts reads to the current owner with a coach/admin role. Authenticated users cannot write the table directly. The API validates bounded documents and relationships before calling the RPC. Invalid stored documents are retained for review. Pending forms survive save failures; reload deliberately refreshes the workspace baseline. Preview storage checks revisions to detect earlier writes in other tabs, but localStorage does not provide fully atomic concurrent transactions.

Existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuration is reused. No service-role key is needed. Workspace component state remounts on account changes; preview storage is never imported into a real account.

Payment collection, purchase entitlements and expiry enforcement, public trainer enrollment, client portal/delivery, and the full curriculum are **not activated**. Existing coach/admin access is for development/internal use and does not imply a paid entitlement. Before sales, connect a one-time checkout and verified payment webhook to an entitlement with a fixed expiry, then gate live product access on that entitlement. Finalize the duration, included support, curriculum, and expiry/export policy before enabling purchases.

## Verification

Run `node --test scripts/test-trainer-hub.cjs scripts/test-trainer-hub-database.mjs` for document validation, computed metrics, history preservation, safe login destinations, tenant isolation, role rejection, direct-write denial, stale-save conflicts, exact retries, and malformed database shapes.

Run ESLint on `app/trainer-hub components/trainer-hub lib/trainer-hub lib/authRedirects.ts app/coach/CoachDashboardContent.tsx` and the repository TypeScript check. Browser checks cover a lesson completion, client creation, assignment, check-in note, program creation, persistence after reload, and the mobile layout. Preview changes are fictional and remain local to the browser.
