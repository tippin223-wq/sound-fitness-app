# Planning backend activation

The app logic and isolated database tests are implemented. This guide does not establish that the migrations are active or that authenticated production flows have passed. The latest local baseline is 967 combined tests and a successful production build (2026-10-14 03:54 UTC).

## Observed production metadata (2026-10-14 04:36 UTC)

Read-only review of the signed-in Supabase dashboard confirmed the target is main / PRODUCTION for the configured project. The [public table inventory](https://supabase.com/dashboard/project/phacfkbgqrnfbjdbaxzq/database/tables) loaded 50 tables: base workout tables and shared website member-service tables exist, but planning_documents is absent. The [public function inventory](https://supabase.com/dashboard/project/phacfkbgqrnfbjdbaxzq/database/functions) contains no planning save/capability functions. The [migration history](https://supabase.com/dashboard/project/phacfkbgqrnfbjdbaxzq/database/migrations) lists only 20261004195500 privacy_rights and 20261004202000 retention_schedule_approvals; none of the six staged app migrations is recorded.

Migration history alone cannot exclude manually applied SQL. The separate missing planning table/function observations establish an incomplete planning schema. This review inspected metadata only: no SQL was executed, no member records were opened, and no schema, policies, roles or data were changed. Dashboard administrator access does not establish app-member authentication or owner isolation. Inspect existing columns/policies and activate the reviewed unapplied migrations before running controlled authenticated acceptance checks. The local verification baseline has since advanced to 986 passing tests and a successful build at 04:33 UTC; that remains isolated proof.

## Dependency compatibility inspected (2026-10-14 04:39 UTC)

The existing workout_set_logs metadata shows the 16 base columns expected by the repository base migration, including UUID workout_log_id/profile_id, numeric weight, int4 reps/sets/order_index and timestamptz performed_at. It has neither weight_unit nor semantic_metadata. The existing shared member_messages definition matches the messaging endpoint prerequisite: UUID id/member_id, text sent_by/body and timestamptz created_at, all non-null; app_request_id is absent.

The dashboard shows RLS enabled on all four base workout tables, with select/insert/update/delete owner policies present. The inspected workout-log SELECT predicate is profile_id = auth.uid(). Shared member_messages has an authenticated SELECT policy with auth.uid() = member_id. No direct member write policy was listed for messages, consistent with the staged owner-checked message function. These observations support the expected prerequisites but do not replace inspecting the remaining constraints/grants or proving behavior with authenticated test members. No policies were saved and no rows were opened.

## Default privileges checked and staged grants corrected (2026-10-14 04:43 UTC)

Two metadata-only SELECTs inspected existing columns/constraints, RLS flags, authenticated table grants and public default privileges. The six prerequisite tables match the base schema constraints, including the composite workout-set ownership foreign key. Authenticated SELECT/INSERT/UPDATE grants exist on the workout tables; profiles permits SELECT and withholds INSERT/UPDATE. This does not prove a member can pass RLS or save through the app.

The project explicitly grants function EXECUTE to anon and authenticated by default for postgres and supabase_admin. Revoking PUBLIC alone does not remove that direct anon grant. Before activation, all eleven function-revocation statements across the six staged migrations were corrected to revoke PUBLIC and anon, then grant authenticated execution explicitly. The save functions' authentication checks remain. No existing deployed function or privilege was changed.

The isolated database fixture now reproduces those explicit default grants and asserts anonymous execution is denied while authenticated execution remains for all eight final planning/message/metadata functions. All 986 combined tests pass with that fixture. A production build was not repeated for this SQL-only change; the latest app build remains successful. The temporary metadata query was not saved and its browser tab was closed; the user's existing SQL draft was preserved.

## New planning table permissions narrowed (2026-10-14 04:48 UTC)

Production defaults grant broad table privileges to anon and authenticated, including TRUNCATE. The staged planning_documents migration now removes inherited PUBLIC/anon/authenticated table grants and grants authenticated only SELECT, INSERT and UPDATE. Existing owner RLS policies still qualify those operations; no client DELETE, TRUNCATE, REFERENCES or TRIGGER grant is retained. Service-role/owner permissions and existing website/workout tables are not changed.

The isolated database fixture now reproduces broad production table defaults before creation, instead of applying a blanket grant after the migrations. Fourteen table privilege assertions prove the intended role/operation matrix. Actual anonymous read/TRUNCATE and member DELETE/TRUNCATE attempts are refused, with both members' complete documents unchanged; existing owner saves and stale revision checks still pass. All 986 combined tests pass. This is staged and isolated verification only, with no live privilege changes.

## Transactional activation package prepared (2026-10-14 04:51 UTC)

The review artifact is [planning-backend-activation-review.sql](../test-results/planning-backend-activation-review.sql), SHA256 9b3932b3d6fa65fc5549e909e401182170a65a7b04b871ebab3c8db16bd8bf5a. It contains only the six reviewed migrations in order, each with its source hash, inside BEGIN/COMMIT with a five-second lock timeout and sixty-second statement timeout. A precondition rejects an existing planning table or any staged column, requiring partial activation review instead of blind replay. Recheck the artifact/source hashes and production metadata immediately before execution; regenerate and re-review if sources changed.

The exact package installed successfully in isolated PGlite using the base schema and production-like default grants. Injecting an error before COMMIT rolled back the new planning table and added workout columns. Post-install assertions retained the narrowed table grants and anonymous function denial. This dry run made no network connection. The current target screenshot is [the production migration review](../test-results/planning-backend-activation-review.jpg).

Explicit confirmation has been requested before applying this package through the production browser dashboard. The Computer Use Confirmation Policy requires action-time confirmation for creating or expanding security-sensitive access; the package introduces owner policies and authenticated database functions. No confirmation has been received and no production activation performed. Preserve this pending request across heartbeat runs; do not treat another heartbeat or elapsed time as approval. After approval, perform the final state/hash checks, apply only this reviewed scope atomically, verify metadata and complete controlled authenticated acceptance checks. SQL-editor execution does not automatically establish migration-history registration; record the exact applied hashes and verify history separately.

## Target and prerequisites

The configured Supabase project reference is `phacfkbgqrnfbjdbaxzq`. Confirm the intended environment and its migration history before applying changes. Some files create tables or columns without rerun guards; an existing installation needs inspection rather than blind reapplication.

The six migrations below depend on the existing `public.profiles` and `public.member_messages` schema and workout tables from [the base workout migration](../supabase/migrations/20260506233000_workout_templates_and_logs.sql). Confirm those dependencies and existing policies in the target database. Do not create replacement member identities or infer links from matching names or emails.

## Reviewed migration order

Apply only the reviewed, unapplied app migrations, in this order:

| Migration | Behavior |
| --- | --- |
| [20261012090000_planning_documents.sql](../supabase/migrations/20261012090000_planning_documents.sql) | Owner-scoped planning documents and revision checks |
| [20261012091000_planning_workout_completion.sql](../supabase/migrations/20261012091000_planning_workout_completion.sql) | Atomic completion, immutable retry checks and recorded load units |
| [20261012092000_member_app_messages.sql](../supabase/migrations/20261012092000_member_app_messages.sql) | Owner-checked, idempotent member messages with rate limits |
| [20261012093000_atomic_workout_templates.sql](../supabase/migrations/20261012093000_atomic_workout_templates.sql) | Atomic template saves, revisions and stable exercise ordering |
| [20261013130000_workout_exercise_semantics.sql](../supabase/migrations/20261013130000_workout_exercise_semantics.sql) | Recorded variation metadata on templates and completions |
| [20261013133000_workout_template_identity.sql](../supabase/migrations/20261013133000_workout_template_identity.sql) | Original template keys independent of relational UUIDs |

Other migrations in the repository belong to separate workstreams. This guide does not authorize applying them together with these six.

## Local verification

From the app repository:

```powershell
npm run test:planning
npm run build
```

The test command includes isolated browser/storage, PGlite database, and mocked backend-preflight tests. It does not connect to production or establish deployed RLS behavior.

## Read-only target preflight

After target configuration or schema changes, run:

```powershell
npm run check:planning-backend -- --json
```

Use `--development` to select the development environment configuration. The script uses the existing public browser configuration, makes ten GET-only probes, requests zero table rows, rejects administrative keys and emits a sanitized report. It performs no mutations.

Table/column availability is separate from authenticated capability visibility. A public capability result of `access_unverified` does not prove that a function is missing. A successful public preflight does not prove authenticated saves, owner isolation or website identity mapping. The saved vault preflight from 2026-10-13 predates the latest variation/template-key probes.

## Authenticated proof still required

Use controlled test members and records in the intended environment. Preserve existing member originals. Record the environment, applied migrations, test results and test record identities without saving tokens or keys.

1. Verify each authenticated capability returns the number `1`: `planning_workout_load_unit_version()`, `planning_workout_semantics_version()` and `planning_workout_template_identity_version()`.
2. With two member identities, prove each can read and update only its own planning document. A stale revision must refuse without overwriting the saved document.
3. Save and update a workout template. Prove authored targets, repeated exercise variations, modifier IDs, ordering and original client key round-trip. A lost-response retry must not duplicate or increment the same mutation; a stale revision must refuse. A failed replacement must preserve the prior exercises.
4. Complete a workout with recorded units, repeated variations and plan links. Prove the completion and its entries commit atomically, exact retries retain the original identity, and changed content or assignment collisions refuse without rewriting history. Verify the original template key survives an unuploaded or later unavailable template.
5. Verify member-message owner/request checks, exact idempotent retry, changed-body conflict, rate limit and inability to impersonate a coach. Use controlled test messages only.
6. Refresh app History, My Plan and Progress from a fresh authenticated session. Confirm the saved workout appears once, units and variation details remain recorded, and the exact plan assignment is recognized. Verify a second member cannot read these records.

These are acceptance criteria, not completed production checks. Retain the client capability checks and atomic endpoints during activation.

## Website and rewards dependencies

The website source uses shared Supabase profiles for member schedules and credits, alongside a separate account database and cookie session. Additional cross-system actions require an authenticated, verified relationship to the app's Supabase member UUID. Source-level similarity is not proof of that relationship.

Existing app booking and credit readers already enforce owner/session checks, preserve zero credits and keep unknown balances unavailable. Booking edits and financial actions should use the website's authoritative services once identity is verified; local planning records cannot establish purchases or consume credits.

A real rewards ledger is still required before earned currency or purchases can be represented as confirmed. Backend activation, authenticated proof, website identity verification and rewards integration remain release dependencies.
