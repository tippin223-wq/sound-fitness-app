# Review Log

- 2026-09-08: Moved the Profile Question X / Y selector above the active question and removed its shared pill border, fill, blur, and shadow. Increased the question content's top clearance so centered questions remain clear of the bare navigation strip.
- 2026-09-08: Replaced the expanded Profile question card's light row-colored fill with a neutral dark inner surface while preserving row color on its title, border, indicators, and controls.
- 2026-09-08: Flattened expanded Profile question cards by removing the generic inner section shell and neutralizing the active question group's redundant outer border/background. Added a measured question-deck marker so the single active question centers within the main 3D card while long content remains internally scrollable.
- 2026-09-08: Changed Profile row-title progress to the aggregate completion across all cards in that row, leaving card badges as per-card progress. Replaced eyebrow truncation with a width-safe wrapped treatment and changed the row badge to use the permanent row icon.
- 2026-09-08: Removed the leftover decorative horizontal centerline from Profile's left vertical indicator rail while retaining the radial glow and layered 3D icon treatment.
- 2026-09-08: Stabilized Profile's left vertical navigation with one permanent semantic icon per row (Overview, Readiness, Recovery, Nutrition, Coach/App), independent of the selected card. Reserved a centered safe width for narrow row-title eyebrows so long row names truncate before reaching the completion badge.
- 2026-09-08: Corrected the Profile hero summary rail so its CSS sizes the actual button tabs, fits all four complete cards when the viewport permits, and reserves clearance for active glows and overflow arrows. Retimed overflowing selected values to pause at the beginning, travel once, fade out, reset invisibly, and fade back in.
- 2026-09-08: Removed the duplicate Goals row and Goal Direction/Goal Stage cards from the Member Profile orbiter because the complete shared-data goal editor already lives on `/dashboard/goals`. Added distinct row-level color systems for Overview, Training Readiness, Pain/Recovery, Nutrition, and Coach/App, propagating each accent through row headers, selectors, cards, liquid fill, badges, and left-rail indicators.

Codex will use this note to record reviewed screenshots, interpretation notes, and edits completed from the vault.

## 2026-09-08 — Profile summary overflow arrows

- Added bare left/right arrows beneath the Profile summary-tab rail. They render only when the rail overflows, track native swipe/wheel/keyboard movement, and disable at the corresponding edge.
- Positioned the controls outside normal layout height to preserve the hero's short-screen fit, with an additional short-landscape offset. Pointer and wheel input remain isolated from vertical row navigation.
- Fixed an intermediate hook-order error before completion; the Profile recovered with no data mutation. Live checks confirmed 0 → 122px → 0 navigation, correct disabled states, and hero row retention. TypeScript, quiet ESLint, CSS parsing, regression tests, and diff checks passed.

## 2026-09-08 — Scrollable Profile summary tabs

- Made the four summary tabs beneath the Profile hero a complete horizontal overflow rail with swipe support, mouse-wheel-to-horizontal movement, snap points, and Left/Right keyboard control. Kept its scrollbar hidden and isolated all rail input from the vertical Profile row navigator.
- Live verification at the current width confirmed 638px of content inside a 516px viewport, keyboard movement from 0 to the 122px maximum and back, with the hero row remaining active. TypeScript, quiet ESLint, CSS parsing, rail regression tests, and diff checks passed.

## 2026-09-08 — Profile hero gutters and lower-row indicator lane

- Added responsive side gutters around the Profile hero and summary strip.
- Hid the vertical row navigator on the hero. On subsequent rows it now appears on the left without a shared background container; lower rows reserve a dedicated left lane so the rail and active card do not overlap.
- Kept neighboring indicators compact and changed title disclosure so only the selected row expands vertically to show its wrapped title. Removed the old whole-rail hover/focus expansion state and timers.
- Live verification at the current 561x653 CSS viewport showed 17px/28px hero edge clearance and over 50px between the active indicator and card. Verified only Goals was revealed while selected. TypeScript, quiet ESLint, CSS parsing, interaction/source regression tests, and diff checks passed.

## 2026-09-08 — Roomier medium-height Profile hero

- Added a dedicated portrait tier for medium-height displays so they no longer inherit the short-phone compression. Increased the avatar, internal spacing, identity/plan type, controls, pill height, and summary-card padding while retaining horizontal pill rails.
- Verified the user's current 469x653 CSS viewport: the hero grew from about 288px to 357px, the avatar from 48px to 68px, and hero/summary content still fits the 555px row with no internal vertical overflow. Short-screen rules remain scoped below this tier. CSS parsing, pill-rail interaction regression, and diff checks passed.

## 2026-09-08 — Compact Profile hero

- Replaced wrapped Member, training-plan, and Readiness pills with independent horizontal rails, bare arrows, keyboard control, and hidden scrollbars. Preserved all member/plan values and readiness signals.
- Kept the photo beside identity details, tightened spacing responsively, removed the 640px viewport minimum, and made the four summary cards a compact horizontal strip. Name editing and full readiness details open in native modal dialogs without expanding the hero.
- Verified hero plus summary fit at emulated 320x568, 844x390, 568x320, and 1280x800 (browser zoom yields smaller CSS viewports). Verified pill scrolling does not change rows, readiness open/close, and identity open/cancel; restored original preview dimensions.
- TypeScript passed; lint had no errors (24 warnings in the existing large Profile page). New pill-rail interaction tests, shared-header regression, exercise-clearance regression, and diff checks passed. React review informed gesture isolation and keyboard-accessible controls.

## 2026-09-08 — Proportional nav typography

- Balanced all three header nav lines against one responsive base size: category 67%, section 83%, page 100%, with matching line height and letter spacing.
- Live compact sizes are 10.184px / 12.616px / 15.2px; all three labels fit their text allocation without horizontal overflow. CSS parsing passed.

## 2026-09-08 — Larger third-line nav page title

- Enlarged the shared header's third text line to responsive 15.2–20px type; kept the first two category lines at their original sizes. Widened the title's text allocation to prevent Dashboard being truncated.
- Verified the open Profile header: Training 8px, Sessions 10px, Dashboard 15.2px; the full Dashboard text fits with no horizontal text overflow. CSS parsing and exercise-clearance regression passed.

## 2026-09-08 — Open-header fit controls idle exercise visibility

- The exercise accent now requires a successful, settled open-header clearance check before appearing in either mode. Idle geometry cannot override a failed open fit; viewport/title/category changes require a fresh open check.
- Verified the live Profile sequence: hidden in initial idle, hidden in the crowded open header, and still hidden after returning to idle. Extended regression coverage for open-to-idle persistence, initial idle, resizing, changed text, and transitions; tests, TypeScript, and targeted ESLint passed.

## 2026-09-08 — Header title and exercise clearance

- Removed only the shared header's urgency pill beneath the page title; retained the title, journey label, and other header controls.
- Replaced the decorative exercise figure's negative-margin layout with an out-of-flow accent, positioned 14px after the title's longest text and measured using its full figure, label, and level bounds. It hides when clearance from controls/viewport edges is insufficient and retains measurable geometry so it can return without resizing navigation.
- Verified the live Profile header: no title urgency pill, figure visible with space in compact/wide layouts, and hidden beside the crowded expanded controls. TypeScript, targeted ESLint, shared-header regression, and dedicated clearance tests passed.

## 2026-09-08 — Shared Dashboard header on Profile

- Added the exact Dashboard header menu to Profile while retaining it on the main Dashboard. Recorded the user's preference: do not infer removal when adding an existing feature elsewhere.
- Reused the existing header implementation in `components/dashboard/DashboardExperience.tsx`, with a thin Dashboard route and a header-only composition around the existing Profile content. Preserved Profile's background, forms, and row controls.
- Header-only mode does not mount Dashboard body rows, lock the document scroll, or capture Profile's wheel/arrow navigation. The header's account, meter, and trophy overlays retain their existing behavior.
- Verified Profile's shared header, meter open/close, and Profile row navigation in the browser; confirmed Dashboard still has one header and its original body. TypeScript, targeted ESLint, shared-header regression, favorites, constellation, calendar sync, adaptive indicators, and fuel carousel checks passed.

## 2026-06-21

- Set up the vault as a whole-app reference system.
- Added app reference notes, screenshot workflow, user preferences, and route map.
- Added a root `AGENTS.md` pointer so future Codex sessions know to read the vault.
- No app source behavior changed.

## 2026-07-08

- Updated the pre-login starting plan orbit cards from browser annotation feedback.
- Replaced the goal card planning photo with a generated deep-squat fitness image saved at `public/onboarding-deep-squat-goal.png`.
- Added richer card transition background effects, photo drift, accent glows, and reduced-motion coverage.
- Replaced the third starting-focus orbit card photo with a real workout image saved at `public/onboarding-workout-focus-photo.jpg`.
- Moved the login page member sign-in pill treatment under the lock icon and removed the duplicate left-column pill.
- Squared the questionnaire option cards, added a roughly two-second selected-card flicker before the fade-to-next-question transition, and removed the manual skip/continue path from the card flow.
- Simplified the starting-plan result screen by removing the detailed answer recap, bottom login button, and bottom full-assessment button. Kept create-account and email-plan actions, and surfaced the website intake as a short top-left utility link.
- Renamed the result CTAs to keep conversion hierarchy clear: primary `Sign Up Now`, secondary `Email Me My Results`.
- Lowered the result-stage panel content so the recommendation progress row clears the `Already have an account?` utility link.
- Reworked the welcome starting-step carousel so the photo card stays centered while only the number/text layer orbits through a shadowy warm glow before each card fade.
- Deferred saved onboarding-answer hydration until after the first browser paint to avoid the pre-login progress mismatch warning.
- Restored steadier welcome polish effects: logo sparkles now shimmer consistently at rest, benefit-pill sparkles run independently from the long highlight cycle, and the starting-step cards use a quicker nonblank fade with a stronger number halo.
- Updated the welcome utility link copy to direct in-home personal-training leads to the full website assessment.
- Tightened the welcome `Build My Fitness Plan` CTA so it sizes to its label instead of stretching like a full-width banner.
- Added a blue/cyan animated highlight background to the `Already have an account?` welcome link while keeping it bare at rest.
- Reworked the welcome crest entrance into an upright curveball-style swoop with one settling loop, more fly-in sparkle bursts, and a fuller subtle resting sparkle field.
- Slowed the welcome starting-step carousel to roughly six seconds per step and kept the card frame visible while only the photo/fill layer fades.
- Strengthened the welcome benefit-pill highlight with larger scale, brighter aura/sheen effects, stronger sparkles, and made the starting-step number halo bolder and circular.
- Synced the welcome benefit-pill animation so one card owns the combined movement/aura/sparkle effect at a time, and widened the starting-step text visibility window so the label stays readable over the active photo.
- Densified the welcome crest fly-in rail with many point-to-point arc segments, added six more sparkle nodes, and made the entrance sparkle burst more dramatic while preserving a subtler resting shimmer.
- Split the welcome starting-step carousel motion so the number and label travel separately while the stronger shadowy glow appears only at the centered landing point.
- Reworked the welcome utility-link hover treatment into feathered glow edges, with blue for member login and orange for the in-home trainer assessment link.
- Smoothed the welcome crest entrance with a CSS motion rail and added constant benefit-pill bubble motion that bursts outward during each highlighted state.
- Corrected the welcome starting-step animation so the number and label enter from the left together while the circular glow ring stays fixed at center and appears only on arrival.
- Added dedicated real-photo training-location backgrounds to the questionnaire option cards while preserving the icon and label overlay for readability.
- Increased the top-left in-home trainer assessment link contrast and added a warmer feathered hover/focus glow to both text lines.
- Added a small timed glint to the welcome starting-step number right as it fades out.
- Restricted questionnaire real-photo card backgrounds to the training-location/setup question only.
- Dimmed incomplete questionnaire progress nodes by basing progress on passed steps and limiting glow effects to active or completed nodes.
- Squared up the questionnaire option cards across all sections with taller tile proportions, wider gutters, and a tighter icon inset radius.
- Smoothed the welcome starting-step center spin so it fades into a drifting smoke-like tail instead of stopping during the transition break.
- Feathered both top welcome utility-link hover effects so the blue account aura and orange in-home trainer aura bloom without a hard pill outline.
- Moved real-photo option backgrounds onto the step 2 support cards only and sharpened the assessment card/icon corners further so all option tiles read more squared.
- Kept the welcome starting-step center ring rotating through the number hold so the halo no longer freezes before fading into smoke.
- Removed resting pre-highlights from saved questionnaire answers and made the active card click state a short brighter burst with icon lift and small sparks.
- Enabled the existing accurate real-photo backgrounds for the training-location cards while keeping other questionnaire sections icon/color based.
- Converted the equipment question into a real multi-select step with photo-backed equipment cards, selected-card feedback, and a dedicated `Next` button before advancing.
- Reworded the experience question to ask how familiar the user is with working out instead of how familiar workouts should feel.
- Converted the training-comfort question into a multi-select inventory of exercise styles and equipment types with a dedicated `Next` button before advancing.
- Converted the coaching-support question into a multi-select step with selected-card feedback and a dedicated `Next` button.
- Shortened the questionnaire card selection burst by about one second and removed deselect burst effects from multi-select cards.
- Converted the recovery-baseline question into a multi-select step so users can choose multiple recovery factors before advancing.
- Stacked the question-stage utility links and compact crest vertically at tablet widths so the header stays centered and clears the progress path.
- Rebuilt step 12 as a profile-ready results-delivery form with name, email, phone, city/ZIP, a free in-home intro-session checkbox, and a single `Send My Results` action before the result screen.
- Tightened the 9-option questionnaire grid so the training-comfort multi-select cards fit above the footer at tablet-height viewports without clipping the bottom row.
- Replaced the equipment-step reused gym photos with more accurate real-photo assets for dumbbells, resistance bands, bench work, and cardio equipment.
- Split questionnaire card selection motion so single-select uses a slower confirmation pulse while multi-select cards use a distinct shorter check/settle animation and no deselect burst.
- Added hover-only centered white icon overlays to both welcome utility links so the in-home assessment and member login highlights have a clearer focal symbol without changing the resting layout.
- Reordered the tablet/mobile questionnaire header stack so the compact crest sits above the in-home personal-trainer link, followed by the account link and progress path.
- Added the accurate dumbbell photo background to only the step 6 training-comfort `Dumbbells` card while keeping the rest of that multi-select section icon/color based.
- Moved questionnaire Back navigation into a compact top control on question/result pages and removed the bottom Back button so tall multi-select grids cannot bury the way back.
- Lowered the welcome crest fly-in rail, fallback launch arc, and welcome stack position so the animated logo no longer clips against the top of the shell.
- Added abbreviated welcome utility-link copy at small widths so the in-home trainer assessment prompt stays visible without crowding the crest or account link.
- Removed the small top-right selected indicator bubbles from questionnaire option cards across all sections while leaving selected borders and glow states intact.
- Strengthened selected questionnaire option cards with larger scale, brighter neon borders, stronger glow, and lifted icon/text states so highlighted cards read clearly without corner badges.
- Reworked questionnaire option grids to use centered, squarer cards instead of wide banner-like rectangles, with compact square-ish handling for 9-option multi-select steps.
- Flattened the final results-delivery step by removing the nested lead-card treatment and tightening the field/action layout so the form fits on one screen more reliably.
- Tightened the Step 12 contact form further with smaller field padding, reduced helper spacing, a compact interest checkbox row, and contact-step-only short-viewport rules to keep the send action visible.
- Added tablet/short-viewport density rules for the questionnaire stage so the stacked header, progress rail, top Back control, question copy, and option cards fit inside the modal shell without clipping.
- Enlarged the hover-only utility-link icon layer and clipped it inside a soft rounded mask so the top assessment/account highlights get a bigger white symbol without creating a hard container edge.
- Tightened questionnaire card sizing at tablet and narrow widths so option tiles shrink more gracefully, and reset each newly opened forward step so no card appears preselected when a section first loads.
- Updated the final results-delivery step to reassure users they will still see results immediately after sending, added an optional promo/update consent checkbox, and compacted the checkbox/action row so it stays screen-friendly.

## Pending

- 2026-07-17: Updated the Admin Finances row from static indicators to clickable, color-coded Income, Expenses & Debt, and Total ledger views. Consolidated payroll, liability, and tax planning into the red risk ledger; kept the total financial position as a dedicated cyan ledger.
- 2026-07-17: Constrained Admin Services detail panels to the usable dashboard canvas beneath the admin header and beside the joystick, rather than covering the entire screen.
- 2026-07-17: Moved the expanded calendar's range readout and previous/today/next navigator beneath the day-card horizontal scroller, leaving view controls and filters at the top.
- 2026-07-17: Let the Finance Summary metric columns use their full available vertical space, removing forced truncation and distributing labels, values, and statuses through each panel.
- 2026-07-17: Rebalanced the expanded Finance Summary so its metric strip is compact and fixed-height, giving the active ledger table the majority of the available vertical space.
- 2026-07-18: Added transparent, non-medical training readiness scoring to assessment results. The score factors in experience, time, training space, equipment, confidence, recovery, limitations, and preferred support, then explains the suggested starting level.
- 2026-07-18: Added a three-second assessment insight popup for each selected option. Each message explains how that choice affects the personalized plan, while multi-select insights update without blocking further choices.
- 2026-07-18: Moved the compact assessment insight toast to a fixed safe-bottom viewport position so it remains fully visible on compressed mobile question layouts.
- 2026-07-18: Reworked the insight toast centering to use bounded left/right positioning instead of transforms, preventing animated question pages from clipping the toast horizontally.
- 2026-07-18: Moved the insight toast outside the animated question-page container so its viewport-fixed placement is no longer masked by the question transition layer.
- 2026-07-18: Added a slow cyan, emerald, and amber diagonal gradient sweep beneath the assessment particle field, with a reduced-motion fallback.
- 2026-07-18: Increased the top inset for the assessment crest so it has clearer breathing room from the panel border on mobile and desktop.
- 2026-07-18: Lowered the mobile assessment crest slightly to give it clearer top padding without changing the question layout.
- 2026-07-18: Replaced the welcome-page trust-chip wrapping with an even two-by-two mobile grid and a four-across layout when space allows.
- 2026-07-18: Kept welcome trust chips at their natural content width within the grid rather than stretching them to fill each column.
- 2026-07-18: Reworked the welcome trust chips into one centered no-wrap flex row, with all four pills expanding and compressing together instead of forming separate rows.
- 2026-07-18: Replaced the welcome trust-chip row with compact, color-coded icon indicators; the active indicator expands into its labeled bubble and cycles automatically, while remaining directly selectable.
- 2026-07-18: Restored the welcome focus indicators' sparkle and drifting particle effects inside the active expanded bubble while keeping resting icons visually quiet.
- 2026-07-18: Let active focus-bubble particles extend beyond the pill edge and widened the active state so every focus label stays fully readable.
- 2026-07-18: Added a dense, staggered particle field to the active focus bubble so glowing particles fill the open pill and drift upward through its bubble effects.
- 2026-07-18: Doubled the focus-indicator particle density, added a quieter particle drift to resting icon bubbles, and contained every particle animation within its respective pill.
- 2026-07-18: Slowed the welcome focus-indicator rotation and active-particle cycle to five seconds.
- 2026-07-18: Reworked mobile focus indicators into a compact 3D orbit: the active bubble is centered and only its next icon appears as a receding preview.
- 2026-07-18: Made each expanded focus pill and its mobile orbit preview offset label-specific, removing unused right-side space on shorter labels.
- 2026-07-18: Changed multi-select assessment insights to a single holistic three-second summary after `Next`; individual multi-select taps now stay interruption-free.
- 2026-07-18: Restyled assessment insights as compact plan-readout cards with a glass scan treatment, icon badge, stronger information hierarchy, and a timed progress rail.
- 2026-07-18: Centered the assessment plan-readout overlay and gave its inner card a squarer, more transparent glass treatment.
- 2026-07-18: Reshaped the plan-readout from a wide banner into a narrower, taller compact glass card so its proportions read much closer to square.
- 2026-07-18: Made plan-readouts content-sized, increased the display text, extended their duration to five seconds, and color-coded each readout to its active assessment theme.
- 2026-07-18: Anchored assessment plan-readouts above or below their triggering option or `Next` control, clamped within the viewport so they never cover the selected control.
- 2026-07-18: Made `No major limits` mutually exclusive with all specific limitation selections, including clearing it automatically if a specific protection is later chosen.
- 2026-07-18: Reworded the first assessment question to ask what the plan should improve most, clarifying that it identifies the primary goal.
- 2026-07-18: Added a low-contrast animated particle field behind the assessment question panel, using cyan, gold, and white micro-particles while preserving content contrast and reduced-motion support.
- 2026-07-18: Color-coded assessment progress icons by their question theme, including subtle tinted inactive states and stronger matching colors for active and completed steps.
- 2026-07-17: Expanded the weekly calendar rail to use the free vertical space above the lower range navigator, with day cards and timeline entries stretching cleanly inside it.
- 2026-07-17: Removed the duplicate left/right Sound Assets orbit buttons; navigation remains available through the joystick, drag interaction, and row indicators.
- 2026-07-17: Added Stationery Marketing and Merch cards to the Admin Marketing Campaigns orbit, each with its own status, destination, and four-stage workflow.
- 2026-07-17: Moved Admin Settings navigation into the shared upper row-title indicators, made each indicator clickable, and removed the duplicate horizontal arrows and bottom dot rail.
- 2026-07-17: Replaced the admin dashboard page joystick's fragile WebGL visual with a persistent CSS control and visible four-way directional cues, preserving its existing drag, wheel, click, and keyboard navigation.
- 2026-06-23: Added `checklists/single-3d-render-per-page.md` to preserve the plan for fixing broken 3D placeholders by moving toward one page-owned/live 3D render surface and polished fallbacks.
- 2026-07-18: Added a small label-safe width buffer to the active focus pills and adjusted their orbit preview offsets so all expanded text remains visible.
- 2026-07-18: Added a slow cyan highlight sweep and soft glow to the "Plan Built" welcome headline line, with a reduced-motion fallback.
- 2026-07-18: Anchored multi-select assessment readouts to the option-grid bottom edge and refined single-card positioning to choose the clearer side of each selected card.
- 2026-07-18: Reduced the assessment readout anchor gap from 12px to 2px so each readout sits immediately beside its selected card or option grid.
- 2026-07-18: Corrected assessment readout coordinates for the transformed glass-shell containing block so readouts visually attach to their selected card or grid.
- 2026-07-18: Portaled assessment readouts outside the clipped glass shell so bottom-aligned multi-select summaries remain fully visible without overlapping the shell edge.
- 2026-07-18: Made the coaching-style choices "Reminders" and "Minimal nudges" mutually exclusive.
- 2026-07-18: Added a subtle darkened, lightly blurred backdrop behind each assessment readout so the selected-plan insight becomes the clear focus.
- 2026-07-18: Renamed the assessment equipment option from "Dumbbells" to "Free weights" across matching prompts, visuals, and scoring.
- 2026-07-18: Softened the assessment readout's outer corners to an 8px radius while preserving its structured glass treatment.
- 2026-07-18: Connected assessment readout accents to the selected card's own color, including multi-select summaries using the most recently selected card accent.
- 2026-07-18: Color-coded the assessment step counter so the active step number uses that question's accent and the total step count uses a softer matching tint.
- 2026-07-18: Limited the compact focus-pill orbit to screens 520px and below so wider mobile/tablet layouts show every icon preview.
- 2026-07-18: Strengthened the selected-card accent across assessment readout glass fills and borders so the popup no longer reads as generic gray.
- 2026-07-18: Removed the repeating audio-trigger breathing animation and softened its active state to a quiet static indicator.
- 2026-07-18: Brought the narrow-screen focus-pill preview forward with a brighter foreground treatment and orbit-in transition; widened layouts now retain the full icon-preview row.
- 2026-07-18: Added a width-gated left preview to the mobile focus-pill orbit and reserved side clearance so preview pills cannot cover active-label text.
- 2026-07-18: Corrected the active focus-pill orbit breakpoint in source to 520px so every focus preview returns as the viewport grows beyond compact mobile.
- 2026-07-18: Kept the welcome CTA icons static while retaining the button's ambient gradient and sparkle effects, eliminating intermittent icon jitter.
- 2026-07-18: Matched the welcome focus-pill cycle to the six-second starting-plan card carousel cadence so both advance together.
- 2026-07-18: Applied the focus-pill cadence and compact-layout corrections to the live welcome rules after earlier generic replacements missed their intended targets.
- 2026-07-18: Offset the welcome focus-pill changeover so its transition settles alongside the incoming starting-plan card number rather than at the beginning of the card movement.
- 2026-07-18: Staggered the welcome focus-pill and starting-plan card landings so the two animations alternate instead of arriving simultaneously.
- 2026-07-18: Added a small width buffer to the first expanded focus pill so its label no longer sits against the right edge.
- 2026-07-18: Kept "Free weights" in the broad equipment prompt while restoring "Dumbbells" in the more specific training-options prompt.
- 2026-07-18: Refocused readiness criteria pills on physical starting signals while leaving schedule, session length, equipment, and location in the setup lane.
- 2026-07-18: Made checkout's "Back to results" link restore the saved assessment directly into its results stage instead of reopening the welcome screen.
- 2026-07-18: Anchored the sound settings dropdown below its trigger and kept the trigger icon visible while the menu is open.
- 2026-07-18: Lowered the mobile welcome sound trigger slightly to align it with the surrounding header controls while preserving the wider-layout position.
- 2026-07-18: Made answered assessment-progress icons return directly to their question and replaced browser titles with themed, step-specific glass tooltips.
- 2026-07-18: Added an animated circular progress dial around the assessment readiness score, proportionate to the final percentage.
- 2026-07-18: Added a soft overlay cutout around the selected assessment card or grid so it remains visually above the surrounding shaded backdrop.
- 2026-07-19: Lowered the mobile assessment crest within the question header for more comfortable top spacing while preserving the wider desktop position.
- 2026-07-19: Restored visible mobile form labels above every results-contact field, including email, now that the contact step has sufficient vertical space.
- 2026-07-19: Kept the welcome sign-in control in its header position at compact widths by giving its label a deliberate two-line treatment before the smallest-screen icon-only mode.
- 2026-07-19: Matched the compact sign-in control's icon and two-line label rhythm to the left header utility link, and reclaimed a small amount of welcome-stack height in that range.
- 2026-07-19: Shifted the compact two-line sign-in control toward the right edge and lowered the welcome sound control slightly to balance the header.
- 2026-07-19: Added distinct compact-header press states: orange for the in-home assessment badge and blue for the member sign-in badge.
- 2026-07-19: Right-aligned the compact account icon and two-line label inside its header pill so its content uses the available right-side space.
- 2026-07-19: Kept the compact account icon visually paired with its two-line label by constraining the label to a dedicated text column.
- 2026-07-19: Reworked the compact account copy into two explicit, content-sized lines so the icon and label remain tightly paired without spacer width.
- 2026-07-19: Reserved a consistent two-line label area for large assessment option cards so their icon row stays aligned across varying labels.
- 2026-07-19: Split the open sound menu into a fitted volume-slider pill and a separate icon-control panel below it.
- 2026-07-19: Squared the volume pill, replaced its round thumb with a flat level marker, and made the filled track hue respond to the current volume.
- 2026-07-19: Rebuilt the welcome plan CTA as a thicker cyan-to-amber frame around a layered, translucent glass gradient fill.
- 2026-07-19: Added a linear cyan-to-amber light sweep that travels along the welcome plan CTA border, with a brighter, faster pass on hover.
- 2026-07-19: Constrained assessment choice readouts to an inset safe area inside the active questionnaire panel so they cannot cross its visible border.
- 2026-07-19: Tightened large-screen assessment option-card label layout so multiword labels use natural line spacing rather than spreading vertically inside the card grid.
- 2026-07-19: Added a small tone-matched pulse and spark behind the active number in the assessment "Step X of 12" label.
- 2026-07-29: Rebalanced compact dashboard-header padding so its main menu sits lower within the header band on mobile.
- 2026-07-29: Extended the compact dashboard-header alignment through the tablet-width range so embedded mobile views keep the corrected vertical position.
- 2026-07-29: Lowered the compact dashboard header's rendered orbit, logo, meter, and joystick layers rather than relying on wrapper padding alone.
- 2026-07-30: Moved the avatar emote-loop status into the avatar figure's top-right corner and condensed it to a tooltip-equipped dance icon.
- 2026-07-30: Upgraded the dashboard athlete avatar with configurable suit, skin, hair, gear, and motion presets, including richer suit detailing and accessory rendering.
- 2026-07-30: Connected both Avatar Lab triggers to a viewport-safe live editor and persisted the selected avatar configuration locally between visits.
- 2026-07-30: Rebuilt the dashboard athlete as a nested articulated rig with independent shoulder, elbow, hip, and knee pivots; sleeves, wristbands, pants, knee panels, boots, and shoes now inherit the motion of their matching body segments.
- 2026-07-30: Added persisted male and female athlete profiles to Avatar Lab, sharing the same clothing, gear, and motion systems while using profile-specific proportions, torso shaping, face details, and hair treatment.
- 2026-07-30: Reworked assessment choice cards across steps 1-12 so oversized, unframed icons fill the card background and larger labels remain clearly layered above them.
- 2026-07-30: Added beveled lighting, layered extrusion shadows, subtle perspective tilt, and press/lift motion to questionnaire option cards while preserving their oversized icon artwork and readable labels.
- 2026-07-30: Shortened assessment question 2 to "What would help you stay on track?" by removing "first."
- 2026-07-30: Renamed assessment question 1 to "What is your primary goal?"
- 2026-07-30: Made assessment selection readouts more transparent and glass-like with lighter tinting, stronger backdrop refraction, and a brighter reflective rim.
- 2026-07-30: Re-anchored the questionnaire crest to the true horizontal centerline, restored desktop header clearance above the progress rail, and moved the active-step tooltip onto the "Step X of 12" counter.
- 2026-07-30: Replaced the assessment readout's linear countdown with a color-matched circular timer around its icon; hovering the glass panel or pressing and holding it on touch now pauses both the timer and the pending question advance.
- 2026-07-30: Replaced step 6's compact dumbbell artwork for the "Barbells" option with a long-shaft barbell silhouette using distinct inner and outer weight plates.
- 2026-07-30: Removed the old square tile behind assessment readout icons so the circular countdown ring is their only visible frame.
- 2026-08-01: Reworked questionnaire Next buttons as translucent glass controls with a static cyan-to-emerald-to-amber rim, refracted hover highlights, and a distinct subdued disabled state while preserving the launch shockwave.
- 2026-08-01: Kept the Next button's refracted highlight inside its rim and added results sharing for both a personalized readiness summary and a friend-facing assessment invitation, with native share and copy fallback behavior.
- 2026-08-01: Tightened the result share actions to content-width controls and rebuilt Sign Up Now as a translucent, refracted glass CTA while preserving its particles and bounce cue.
## 2026-08-01

- Simplified the mobile dashboard's vertical row indicators to icon-only controls while preserving their touch targets.
- Restored the expanded mobile dashboard header's original alignment and gave the compact idle header its own lower offsets for the logo, selector, joystick, and meter.
- Raised the expanded mobile header as one group, then independently raised the compact idle crest and meter while preserving the corrected idle orbit position.
- Corrected the sub-430px compact header by anchoring the meter inside the right edge without stacked transforms and raising the idle crest independently.
- Reduced the member hero row's oversized left reservation at mobile, tablet, and desktop widths so the Welcome Back / Body Command card sits close to the vertical row indicators without covering their controls.
- Kept Goal Focus and Position in content-aware side-by-side columns inside the member summary, eliminating the unnecessary stacked row on compact cards.
- Changed the movable bottom-right accessibility navigator to default closed while keeping its compact Nav trigger available.
- Sized the member hero orbit to the available dashboard height, removed its redundant outer vertical scroller, and kept overflow scrolling inside the Welcome Back / Body Command card only.
- Removed the Athlete Avatar State status card and the Sound Athlete badge from the member hero while preserving the avatar controls and Avatar Lab action.
- Moved Active Profile beside the Welcome Back heading and relocated the Widgets trigger two hero panels right into the needle-meter card.
- Moved the avatar dance control to the inside-left of the avatar frame, added a compact face button beneath it for Avatar Lab, and removed the wide Avatar Lab button.
- Changed the avatar to rest by default and added a contained seven-option emote wheel; selected emotes play briefly before returning to rest.
- Pulled the three avatar detail indicators directly beneath the avatar frame and removed their surrounding pill container.
- Replaced the muscle-group loading bars with compact, color-coded circular percentage loaders.
- Centered each muscle name and status inside its circular loader, removed visible percentages, and moved the ring start to the lower-right.
- Framed the circular muscle loaders in taller rectangular cards and changed the muscle layout to two columns on larger screens.
- Reduced the avatar frame to the same centered width as its three detail indicators.
- Moved Training Categories beneath the avatar on larger layouts and added a Muscle Levels heading above the right-side level cards.
- Moved Support Signals beneath the avatar on larger layouts and replaced their horizontal bars with circular progress loaders.
- Changed Support Signals to a compact horizontal loader rail and contained Muscle Levels in a right-side vertical scroller so the dashboard card stays fully framed.
- Added edge-aware arrow controls to the Training Categories and Support Signals horizontal rails and to the Muscle Levels vertical scroller.
- Removed excess Body Command Center scrolling by keeping its lower ambient glow inside the frame and limiting whole-card scrolling to the one-column layout.
- Kept Body Command Center two-column at compact sizes with a smaller avatar, a one-card-wide Muscle Levels rail, and the horizontal Support Signals row beneath the avatar so the full card fits without page scrolling.
- Hid the native Support Signals and Muscle Levels scrollbars and added highlighted draggable rail surfaces while preserving arrow controls.
- Moved the avatar emote control to the right side of the avatar frame and made its emote wheel open inward from that edge.
- Stacked the readiness pill above Active Profile text in both dashboard header variants and prevented the Muscle Levels arrow controls from being clipped by their column.
- Changed all three Body Command Center rails to advance and visibly outline one item per arrow press, and placed the Muscle Levels controls in a dedicated unclipped column beside the cards.
- Moved the Muscle Levels arrows into the upper open lane beside the avatar, widened the compact muscle column by narrowing the avatar area, and transferred loader selection highlights from their rectangular cards to the circular progress rings.
- Repositioned the Muscle Levels controls into a horizontal row directly beneath the section title, with the down arrow on the left and the up arrow on the right above the cards.
- Made each Muscle Levels arrow press visibly advance the rail by aligning the newly highlighted card to the top instead of leaving already-visible cards stationary.

## 2026-08-02

- Replaced the avatar's fixed rectangular body hotspots with anatomical SVG highlights attached to the articulated shoulders, arms, torso, core, and legs so selected regions remain aligned during movement.
- Made Back selection rotate the avatar 180 degrees with a dedicated rear head, hair, and neck view; selecting a front body region smoothly returns the avatar to face forward.
- Added a persisted Face category to Avatar Lab with Relaxed, Bright, Focused, and Defined presets, plus natural blinking and subtle gaze movement to soften the avatar's default expression.
- Split the Chest muscle-level view into separate Upper Chest, Mid Chest, and Lower Chest loaders while preserving the shared chest avatar highlight.
- Moved Active Profile into the member card's top utility row and placed the Welcome Back heading on its own full-width row beneath it to prevent narrow-column wrapping.
- Reclaimed narrow dashboard width by moving the vertical row rail to the far-left edge, reducing the member card gutter, and simplifying row urgency badges to compact color-only dots.
- Removed the visible frames from the Avatar Lab and emote controls, and converted the three avatar detail indicators into a single-row mobile rail with a leading right-arrow control.
- Made the Training Categories, Support Signals, and Muscle Levels arrows continuously move and scroll their highlights, including true row-aware up/down movement in the two-column muscle layout.
- Removed the individual rectangular tiles and top-edge accents from Muscle Levels and Support Signals so their circular loaders sit directly in the shared rails.
- Replaced the separate compact Muscle Levels and Support Signals areas with one right-side panel that a bare leading chevron toggles between, while preserving the two simultaneous sections on larger layouts.
# 2026-08-02

- Isolated the Training Categories, Muscle Levels, and Support Signals arrow controls from the surrounding draggable dashboard hero orbit so clicks and taps reliably advance their own highlighted item.

- Rebuilt the compact dashboard metrics as two independent single-loader rows: Muscle Levels first and Support Signals second, each controlled by left/right arrows.

- Fixed the Muscle Levels up/down controls so they move the highlighted ring exactly one muscle at a time on every screen size, including two-item muscle groups.

## 2026-08-03

- Kept dashboard tooltips inside the viewport by making controls near the left and right edges open inward, including the narrow left-side vertical row indicators.
- Strengthened the global tooltip bounds for both axes and connected the Body Command Center arrow controls to the styled dashboard tooltip system with shorter directional wording.
- Moved the Training Categories arrow controls beneath the category rail and added enough internal rail spacing to keep the selected category ring and glow fully visible.
- Added a palm-tree Avatar Scene action beneath Avatar Lab with four persistent avatar-container backgrounds: Command Grid, Palm Coast, Night Gym, and Alpine Air.
- Replaced the Avatar Scene gradients and oversized symbols with four full environmental scenes: a holographic command room, tropical training deck, neon night gym, and alpine overlook.
- Color-coded Training Categories, Muscle Levels, and Support Signals by training family, then separated seven-day plan status into amber under-target, emerald on-target, and rose over-target fills across pills and circular loaders.
- Matched the Body Command Center to the Exercise Library category palette, simplified muscle loaders to name plus completed/target sets, and added a navigable muscle-detail dialog with sub-regions, recent training, plan volume, and a status-specific insight.
- Moved Training Categories into a full-width bottom row and grouped the Avatar, Support Signals, and Muscle Levels across the upper Body Command Center workspace.
- Bottom-aligned the Avatar section in the upper workspace so it sits immediately above the Training Categories row.
- Removed the Avatar scene's fixed height ceiling so it grows upward through the available upper workspace while keeping its detail rail above Training Categories.
- Expanded each Avatar scene photo across the entire section, removed the inner frame, and bottom-aligned both the scene image and avatar rig so the character stands on the apparent floor at every size.
- Removed the Active Profile header cluster from the Body Command Center, including its small logo, readiness pill, label, and stage text.
- Promoted the selected Avatar scene photo to the background of the entire Welcome Back Member card and made the avatar section transparent so the character stands directly in the full-card environment.
- Removed the avatar rig's remaining internal stage shade and brightened the full-card scene wash so the environment reads clearly behind the dashboard content.
- Removed the reusable avatar component's residual gradient background image and clipping boundary so no rectangular stage remains around the character.
- Rebuilt the Training Constellation hero beside Welcome Member as a synchronized Recovery, Strength, and Cardio weekly timeline with workload rings, completion states, cross-lane relationships, responsive lane controls, horizontal navigation, and in-card session details.
- Moved the Training Constellation arrows beneath the timeline and made them advance a highlighted day across a deliberately scrollable weekly track without triggering the surrounding dashboard orbit.
- Removed the individual rounded and tinted containers from the Recovery, Strength, and Cardio constellation tracks while preserving their aligned labels and session nodes.
- Turned the Training Constellation lane pills into working all-screen filters with an All Tracks reset, removed the remaining visible inner timeline frame, and rebuilt each lane title with a large containerless icon centered behind full-width text.
- Added a compact color-coded horizontal hero-card indicator strip along the cards' inside top edge; the indicators switch panels without consuming layout height or changing the Welcome Member card dimensions.
- Replaced the hero strip's plain bars with small clickable, color-coded icons for Body Command, Training Constellation, Meters, and Challenges, plus a minimal active underline.

## 2026-08-05

- Fixed the hero-card icon row so every icon directly selects and synchronizes its matching card, moved the row into the clear top-right card space away from the eyebrow, and prevented the collapsed header's invisible overflow layer from intercepting those clicks or expanding the header.
- Rebuilt the mobile Training Constellation as a downward-scrolling date timeline with Recovery, Strength, and Cardio columns; its left control now advances downward and its right control moves upward, while desktop keeps the horizontal timeline.
- Kept the hero-card selector in a compact top-right corner opposite each card eyebrow, then color-coded every Training Constellation star by Recovery, Strength, or Cardio and connected only matching stars: exactly three vertical track lines on mobile and one horizontal line per track on desktop.
- Deepened the Training Constellation into a star map with a layered, gently glimmering night-sky field, varied anchor-star glints, and true star-shaped session nodes whose glow follows each track color.
- Moved the Challenges card's `3 active` status pill into the Reward Track eyebrow row and reserved the upper-right corner exclusively for the shared card-switching icons.
- Reworked Challenges into a width-first, non-scrolling card: compact challenge rows on narrow screens, three challenge columns when space allows, and a shallow four-metric reward summary strip that keeps the entire experience visible.
- Rebuilt Challenges around a square 3-by-3 color-coded category selector; each icon now swaps in three category-specific challenges, while the reward-track action lives inside the selector and the summary updates with the active category.
- Constrained the Challenges category icon grid to the space above Open Rewards so all nine controls stay evenly sized and never overlap the embedded reward action.
- Made the selected challenges become three equal square cards on large screens while preserving the compact stacked treatment on smaller screens, giving the Challenges workspace a balanced full-width grid.
- Matched the large-screen Support Signals layout to Muscle Levels with a vertical circular-loader rail, vertical snap scrolling, and dedicated up/down controls while retaining the compact mobile presentation.
- Enlarged the shared top-right hero-card selector to comfortable 28px compact and 36px large-screen targets, increased the icon sizes, strengthened hover/focus feedback, and expanded the Challenges header reserve so the controls remain easy to click without covering content.
- Aligned each Training Constellation track directly through its node centers, replaced the desktop full-width strokes with clean per-cell segments that stop before and resume after every icon, and added matching dark node masks on mobile so track colors never draw across the stars.
- Split the former combined Meters panel into three independent hero-row cards for Needle Meter, Achievements, and Favorite Workouts, then added Widgets as a dedicated seventh card after Challenges with direct widget shortcuts and its existing drawer action.

## 2026-09-06

- Removed the shared pill container and the individual circular containers from the Daily Tools pager arrows while preserving their spacing, page dots, hit areas, focus rings, and disabled states.

## 2026-09-07

- Expanded My Training Calendar toward the row's right and bottom edges, tightened its internal week padding, and added a live red current-time line with a clock label in today's column.
- Kept the highlighted Week calendar cell centered within the usable time-grid viewport when possible and hid the grid's native scrollbars without disabling scrolling.
- Added bare Up/Down controls on the left of the Week calendar and Left/Right controls below it, with a cyan-highlighted time cell that moves through hours and days without introducing return-to-today bubbles.
- Rebuilt the calendar Week view as a vertical hourly schedule with events placed at assigned times; moved bare previous/next arrows to either side of the week range and removed the Today / Week in view bubble.
- Removed the Cardio, Meal, Strength, and Recovery indicator tabs from My Training Calendar and anchored the Week/Month selector to the card's top-right corner at every width.
- Renamed the dashboard card to My Training Calendar, moved the Week/Month toggle to its top-right, moved week navigation below the title, and removed the duplicate top scroll indicator.
- Simplified the My Sound horizontal signal indicators to compact icon-only controls while preserving labels for tooltips and accessibility.
- Added clickable, horizontally scrollable signal indicators to My Sound and gave every left-side row indicator icon a shared beveled 3D treatment.
- Replaced the My Sound vertical row indicator with the Sound Fitness crest and removed the urgency/eyebrow markers above both My Sound and Workout / Sessions.
- Left-aligned the floating Dashboards card title, including Workout / Sessions, and its selector with the shared row content edge, and removed the stray decorative line above it.

- Aligned every member dashboard row below the hero to the hero's 60/80/96px responsive left gutter, matched its 1180px content cap, and reclaimed the oversized side padding for more usable row width.
- Constrained the dashboard Calendar card to the row's available display height; month weeks flex within that height, while dense week timelines scroll inside their day cards instead of forcing the calendar below the viewport.
- Reset each dashboard row to its starting card as soon as the user leaves it, across wheel, swipe, keyboard, joystick, and indicator navigation; returning to the hero row now restores the Body Command Center instead of the News page.
- Switched Muscle Levels to its compact presentation at every short viewport height, including wide landscape resolutions, and gave compact mode a dedicated 64px padding-free cell so the full ring stays inside its measured viewport.
- Sized the Support Signals viewport to an exact whole-card width so the right edge shows either a complete signal ring or none of it.
- Removed the circular containers around the Support Signals scroll arrows while retaining their full click targets and focus behavior.
- Spread the vertical dashboard row indicators across more of their rail and reduced their short-landscape size so adjacent controls and the active highlight no longer overlap.
- Widened the Body Command Center's landscape control column to at least 320px from 700px upward so Training Categories and Muscle Levels retain clear lateral space for their scroll arrows.
- On wide Body Command Center cards, moved Support Signals beneath the Training Categories and Muscle Levels column so the avatar can use the full vertical space on the left.
- Added a short-height Body Command Center layout that places Training Categories and Muscle Levels side by side, preventing the Muscle Levels control from collapsing beneath Support Signals.
- Moved the Body Command Center's expanded two-column breakpoint from 760px to 900px so medium-width hero cards keep the avatar centered and retain a visible compact Muscle Levels control.
- Color-coded all eight News & Events category tabs, with distinct active, idle, hover, and glow treatments for faster category recognition.
- Reduced the active left-rail indicator glow and added a small responsive paint-safe gutter so the highlighted state cannot visually overlap the hero card.
- Moved the left dashboard row indicators into a dedicated responsive gutter and pulled the hero card left, removing both the wasted left gap and indicator/card overlap.
- Removed the expanding tooltips from the left dashboard row indicators so their labels no longer open across the active card; the buttons retain accessible row labels.
- Increased the Weekly Recap orbit spacing so inactive cards and their indicators no longer overlap the active card's left or right edges.
- Changed the Weekly Recap card indicators into one horizontally scrollable row so they no longer wrap into multiple lines on narrower screens.
- Removed the two pills above the Weekly Recap row title (the row label and urgency status) and reclaimed their spacing so the title sits cleanly at the top.

- Renamed the dashboard hero news card to News & Events and removed the pill styling from its story-count and updated-date status.
- Reworked News & Events with a clearer What's Happening eyebrow, a two-line Next Event chyron that keeps the date visible, eight topic filters, and bare horizontal arrows that cycle and center the highlighted category.
- Fixed the dashboard orbit's rectangular aura edges by containing the glow, mist, and icon-shadow gradient fades; standardized the center as the aura and outer page icons as planets, including accessible controls.
- Removed the icon beside the selected planet's page title, matched its raised 3D text to the planet's colour, and replaced the framed arrows with bare chevrons while preserving focus feedback and click targets.
- Kept the planet orbit moving during pointer hover and clicks; only visible keyboard focus pauses the orbit, with reduced-motion and offscreen pauses preserved.
- Gave Recent Workout Activity a full-width heading and readable stacked entries. Replaced empty placeholder status/route rows with one Start a workout link to the workout logger, removing duplicate summaries and nested containers.
- Kept Recent Workout Activity visually complete when empty by using a three-column Exercise, Load, and Details table with understated placeholder rows and the single Start a workout action in its footer.
- Lifted only the active Recent Workout Activity card within the Weekly Recap orbit far enough to keep its full lower edge visible across normal and extra-short dashboard viewport heights.
- Bound Week calendar quick-add actions to the active highlighted day and hour, and exposed that target time in the selected-day panel so new events render in the chosen cell.
- Centered the calendar's selected-event popup within the calendar card, with responsive inset padding and a slightly stronger backdrop for visual focus.
- Removed the selected-day marker-count pill and allowed the full weekday/date heading to display without truncation.
- Added a two-step Sound Session calendar quick-add with In-Home Strength Training, Assisted Stretch, Online Training, and Nutrition choices that inherit the highlighted day and time.
- Added inline title/time editing and confirmation-based deletion for user-created calendar events; dashboard-provided schedule markers remain read-only.
- Scoped the selected-day popup body to the highlighted hour, added a clear empty-cell message, and added color-coded same-day event pills beneath the date that jump to occupied time cells.
- Made same-day event pills close the popup and reveal the corresponding centered, highlighted calendar cell.
- Changed Week calendar cell clicks to a two-step interaction: the first click selects and centers a different cell, and a second click on that highlighted cell opens its popup.
- Raised the selected-day popup above all sticky calendar headers and event layers so no part of the calendar can render over it.
- Restyled the event editor time input as a labeled dark control with a clock icon, integrated picker treatment, and a clearer cyan focus state.
- Kept the selected-day popup open when a same-day event pill is clicked, replacing the popup body in place with that event's highlighted time slot.
- Replaced the browser-native event time field with explicit hour, minute, and AM/PM selectors so the selected time stays visible and editable across browser layouts.
- Refined the event editor time control into a single time field with one clock icon on the right; opening it reveals styled hour, minute, and AM/PM selection columns centered on the current time.
- Made event editing fill the calendar card's available height, with only the edited event shown and Save/Cancel always below the picker; day-add actions return after editing. Added bare up/down arrows beneath the hour and minute columns, with independent wrapping and automatic selection centering. Verified the full editor and arrow changes in the narrow live browser; TypeScript and lint passed with only existing warnings.
- Replaced Add to this day buttons and Sound Session choices with matching color-coded icon cards. Both menus use horizontally scrolling, snapping rows with bare navigation arrows; Sound Session uses the existing crest and the submenu resets to its first card. Preserved full labels and highlighted date/time behavior, and constrained the popup to the calendar height. Verified both menus in the narrow live browser; TypeScript and lint passed with existing warnings only.
- Removed the urgency/status dots from the left dashboard row navigation and replaced the small outline glyphs with filled, beveled SVG icons showing side faces and highlights. Preserved the welcome smile, branded Sound crest, current-row ring, accessible row labels, and fixed rail spacing. Checked the hero and Calendar states live at the narrow browser width; TypeScript passed and the browser reported no errors.
- Connected Training Constellation to the training calendar through shared date/time normalization and a persisted live event store. Calendar additions, edits, deletions, cross-tab changes, and the selected week now drive the constellation. Replaced the static July sample week and invented load/duration/insight values with calendar dates, times, and statuses; render all same-day events rather than only the first. Included Performance and Check-In lanes, and excluded Nutrition from the constellation at the user's request while retaining its calendar entries. TypeScript, targeted lint, and the isolated regression suite (`node scripts/test-training-calendar-sync.cjs`) passed; verified the synced week/events in the narrow live browser.
- Removed the left row indicators' background, border, blur, and button shadows while preserving sculpted 3D glyphs. Added a thin conic light ring and soft edge glow for active/hover/focus states, contained within the fixed rail slots with reduced-motion support. Reused the shared tooltip layer for row labels on hover/focus, added tooltip semantics and Escape/click dismissal, and moved the rail rules into the dedicated runtime stylesheet with an updated version. TypeScript and CSS/TSX syntax checks passed; verified transparent button surfaces and the Daily Tools hover label in the live narrow browser.
  - Final refreshed screenshot confirmed the luminous active-row ring, bare inactive icons, and unchanged rail spacing.
- Centered each sculpted row icon's SVG artwork in its frame and removed icon-only perspective/lift transforms so the light ring stays aligned through active, hover, and focus states. Live SVG measurements confirmed matching artwork/button centers; targeted ESLint, CSS/TSX syntax checks, and diff checks passed.
- Fixed the first row indicator's partially blocked hover/click target: the collapsed header's empty menu-content overflow now passes pointer events through, while its real logo, joystick, and meter controls remain interactive. Preserved the main header stage's idle guard and expanded dropdown behavior. Verified the previously blocked upper portion shows the Weekly Snapshot tooltip and clicking it returns to the hero; no browser errors or error overlay detected.

## 2026-09-08

- Moved Profile hero photo removal into the avatar action menu. The always-visible Remove button beneath the account icon is gone; selecting the avatar now opens Edit Photo and Remove when a profile image exists, with outside-click and Escape dismissal. Verified the live menu showed both options and the persistent Remove button was absent.
- Fixed expanded Profile card bottom navigation clipping by reducing the expanded row's outer vertical padding and tightening the header/card/nav gap while preserving the question card's fixed footprint. Live measurement at 561x653 showed the bottom nav fully visible with 18px viewport clearance. TypeScript, quiet page lint, profile rail regression checks, and diff checks passed.
- Improved expanded Profile question-card aesthetics without changing the card's outer size. The active question page now stretches through the available card body, auto-detected question titles receive a larger centered gradient treatment, and the answer/control area has more even spacing. Live geometry confirmed the same 341px card height with the active page filling more of the 339px scroller. TypeScript, quiet page lint, CSS parsing, profile rail regression checks, and diff checks passed.
- Promoted Profile info popups to a fixed page-layer portal so helper text opened from expanded 3D question cards is no longer clipped by the internal scroll/card containers. Kept the existing info icon styling and click/hover/focus behavior. TypeScript, quiet page lint, profile rail regression checks, and diff checks passed.
- Replaced expanded Profile cards' continuous question list with semantic question paging. A dedicated inner arrow set shows one grouped question at a time with a Question X / Y counter; inactive groups are hidden, long active groups retain internal scrolling, and switching 3D cards resets the inner pager. Relabeled the existing lower navigation counter to Card X of Y. Live verification confirmed Vital Statistics pages Gender, Birthday / Age, and Height separately, with Question 1 / 3 advancing to Question 2 / 3 and no unrelated question remaining visible.
- Combined Profile's duplicated expanded-card heading with the row header above it. The enriched header now carries the row context, gradient active-card title, helper details, completion badge/icon, and all card selectors; removed the inner Profile Questions title panel so each scrollable card starts directly with its questions. Live narrow-browser verification confirmed the single Vital Statistics heading, complete metadata/indicators, visible internal scrollbar, fixed question navigation, and no browser errors.
- Made expanded Profile question-card content explicitly vertically scrollable with an always-present thin scrollbar. Added a stable gutter, contained overscroll/touch behavior, and a cyan-to-orange scrollbar thumb while keeping the outer Profile page locked to the viewport.
- Transferred the complete Profile questionnaire from the lower 2D detail stack into the matching 3D orbital cards. Every card now opens its real fields through Open Questions, with previous/next question-card controls and exclusive accordion state; added Journey Map as a Coach + App orbital card so the master journey remains available. Narrow layouts render one expanded question card, keep its navigation fully visible, and reserve a measured gap beside the left indicator rail. Removed the old lower stack and locked Profile's shared header shell to the viewport, eliminating both page-level scrollbars while retaining the internal hidden-scroll 3D rows and question content. Live verification at 561x653 confirmed one expanded card, 10.5px rail clearance, full question controls, next-card navigation from Vital Statistics to My Body, a 653px page/viewport match, no detail stack, and no browser errors. TypeScript, quiet lint, CSS parsing, diff checks, and the extended Profile regression test passed.
- Smoothed Weekly Recap indicator selection: reserved a constant marker width and removed the selected button's extra scale, preventing ResizeObserver-driven spacing shifts. Wrapped label pills now fade through their corresponding outside edge instead of traversing the selected center; retained reduced-motion support and inert hidden options. Verified unchanged pill widths across forward, reverse, and end-to-start selection live. Extended motion regression tests, TypeScript, and quiet lint passed; no browser errors reported.
- Fixed the header joystick overlapping the crest: reduced the obsolete collapsed negative margin and reserved a positive open-state gap around the crest's beveled artwork. Header navigation fitting now accounts for positive neighbor margins. Updated the runtime stylesheet version. Live measurements showed about 12px collapsed and 8px expanded clearance; also checked narrow collapsed geometry and restored the viewport. TypeScript, page lint, and CSS syntax checks passed.
- Gave long indicator pills separate width-aware orbit geometry: one neighbor per side, wider horizontal spacing, gentler rotation, and deeper placement; compact icon orbits remain unchanged. Verified Weekly Recap labels remain separated and fully contained at 343px and 227px strip widths, with working selection. TypeScript, component lint, and extended adaptive-indicator regression tests passed; restored the viewport.
- Added shared adaptive column indicators for Weekly Recap, Workout / Sessions, System Row, and My Sound. Observe untransformed item widths and available strip width to enable a 3D orbit only during actual overflow, retaining flat left-aligned strips otherwise. Preserve selection, colors, and tooltips; support neighboring-item clicks, horizontal swipes/wheel, and wrapping keyboard navigation with focus. TypeScript, quiet lint, and regression checks passed. Live verification confirmed Weekly Recap orbit-to-flat resizing and selection preservation, System Row narrow orbit with keyboard wrap to Achievements, and My Sound staying flat when it fits. Restored the normal viewport.
- Converted Nutrition Consistency's stacked fuel bars into a one-habit horizontal snap slider with bare previous/next arrows, keyboard controls, swipe synchronization, and isolation from the outer card orbit. Removed repeated target labels. Corrected row-fit calculations to reserve in-flow mobile heading height. Removed the invented shield behind My Sound's authentic crest and centered its undistorted image. TypeScript, targeted lint, and fuel carousel interaction regression checks passed.
  - Live checks confirmed the full card fits the current view and a short-phone viewport, arrows select Hydration/Meals without changing the outer card, and the crest contains only the original image. Restored the normal viewport; no browser errors reported.
- Replaced the small Workout / Sessions and System Row header indicator orbits with flat, left-aligned, equal-size icon tabs. Removed perspective, positional transforms, overlapping slots, and distance-based scaling. Kept color-coded selection and tooltips, exposed every option in order with horizontal overflow only when needed, and matched My Sound's strip spacing/alignment. Preserved the larger orbit card visuals. TypeScript and isolated render/click tests passed for all six command-center and nine system options.
  - Live verification confirmed all options fit the current view, no indicator transforms, exact left-edge alignment with text in all three rows, and working Appointments/Recovery selection. Quiet lint passed and no browser errors were reported.
- Restored the active System Row option's title beneath its aura. System cards have no child journey steps, which previously caused their selected title to disappear. Reused the existing color-coded raised title style and announce selection changes politely; preserved other rows and the orbit interactions.
- Removed the individual pill backgrounds, borders, and rounding from the Plan Timeline detail slider entries, retaining their label/value spacing and existing arrow/swipe navigation.
- Removed the shared background, border, rounded shell, shadow, and backdrop blur around the bottom Master Training Journey steps. Preserved the height-aware layout, individual cards, connectors, highlights, and arrow controls.
- Made Master Training Journey fit its available row height with a compact title card, flexible timeline height, reserved arrow controls, and short-height spacing/type adjustments. Removed the title icon's background/border container. Live checks at normal narrow, short-phone, and desktop sizes showed no vertical row, rail, or card overflow; verified arrow navigation and restored the original viewport. TypeScript, CSS parsing, and diff checks passed.
- Moved Build first workout one step later in the setup timeline, after Make the plan. Kept the displayed day offsets chronological and preserved each card's destination, icon, and styling.
- Removed the continuous decorative line behind the Master Training Journey step cards and their top-edge line accents, keeping only the individual connectors in the gaps between steps.
- Replaced the Master Training Journey steps scrollbar with bare previous/next arrows beneath the cards and a compact step count. The arrows move a cyan selection highlight, center the selected step where possible, and stop at either end; keyboard focus also selects a step and leaving the row resets to the first. Preserved existing step links and touch scrolling. TypeScript, quiet lint, diff checks, and production-handler tests for navigation bounds and 15 centering cases passed. Live browser checks confirmed hidden scrollbar, centered second step, previous navigation, and row reset.
- Moved Current Focus into the first position of the Plan Timeline detail slider, keeping the distinct Next Action entry and removing the standalone focus line to save vertical space. The existing arrow/swipe navigation includes all four details automatically.
- Moved the Plan Timeline percentage badge to its top-right corner and changed the label from mapped to completed, reserving space above the icon/title to prevent overlap. Removed the entire second-card header (decorative dots, Current Plan Screenshot label, duplicate scroll indicator, and step count), retaining the timeline cards and native horizontal scrolling. TypeScript, quiet lint, and diff checks passed; refreshed browser content confirms the completed label and removed header.
- Reduced the Plan Timeline title card height: moved its heading beside a smaller icon, moved the mapped-percentage badge alongside the progress bar, and tightened vertical gaps while preserving the horizontal detail strip. Verified the refreshed card visually with aligned title/icon and no browser errors; TypeScript passed.
- Removed both overlapping yellow Master Training Journey headers and their reserved top space, leaving Plan Timeline as the row's main title card. Replaced the stacked Plan Source / Next Action / Training Data pills with a swipeable, snapping horizontal detail strip and one bare right-facing arrow on its left; the arrow cycles back to the first detail and leaving the row resets it. Stacked each detail's label/value to keep small-phone text readable. TypeScript, quiet page lint, diff checks, and isolated production-handler tests for three widths, wrapping, and reduced motion passed; checked the updated row and arrow navigation in the live browser.
- Fixed the Training Constellation session popup's X by isolating popup pointer events from the hero swipe controller and recognizing SVG targets inside interactive hero controls. Enlarged the close target and added Escape dismissal. Added View in calendar, which resets/mounts the calendar on the selected event's exact day/hour, opens its details, and prioritizes that event when several share an hour. Leaving Calendar clears the handoff so old popups do not reopen. Preserved edit/delete for user-created events and readonly derived markers; labeled edit/delete buttons by event title. Verified the X, event handoff, mobile popup placement, and reset live; isolated regression tests cover close/Escape, pointer isolation, exact handoff, and opening the editor without touching saved data.
- Restored maximum whole-circle counts in Support Signals (two/four slots are no longer reduced to one/three); even windows keep the highlight in a nearest-center slot. Fixed Muscle Levels clipping with scoped, container-sized training controls: side-by-side compact controls when wide but short, stacked adaptive rings in narrow columns, and the full grid only when a complete row fits. Tightened header/support spacing on short phones to preserve ring space. Live checks at 320x568, 390x720, 506x655, 1280x720, and 1440x1000 showed whole visible muscle rings and working navigation; no browser errors. Nine-width Support Signals regression tests, targeted ESLint, and CSS syntax checks passed. Restarted the stopped local dev server and repaired a malformed generated route-types tail during verification.
- Centered Support Signals' arrow-selected item within a whole-circle horizontal window, clamping at list ends. Use odd visible counts while overflowing to retain a true middle slot, align scroll snapping with the rail padding, and recenter the current selection on resize. Removed scroll side effects from the state updater. Verified live 355px/506px/1309px viewports, forward/back wraparound, centered middle selections, complete edge circles, and no browser errors. TypeScript, targeted ESLint, diff checks, and the new production-callback regression test across seven rail widths passed.
- Fixed Challenges mobile spacing by separating its height rules from the meter deck, increasing section/card gutters, aligning reward/progress content below titles, and allowing wrapped titles to set each row's minimum height. At 320x568, verified every progress bar stays within its card and the challenge list has no internal overflow or overlap with the summary/footer.
- Rebuilt Favorite Workouts as a full-height hero with a clear title, saved count, featured template, bounded exercise preview, bare previous/next controls, start/resume action, and builder/history links. Its empty state has a centered workout icon and one Create a workout action rather than a nested horizontal strip and placeholder statistics. Preserved active/saved template sourcing and launch behavior. Verified empty-state fit at normal narrow and 320x568 sizes; added isolated render/interaction regression tests for empty/saved states, preview counts, cycling, stale selection fallback, launch, and resume without changing user data. TypeScript, page ESLint (no errors), CSS syntax, regression tests, and diff checks passed; browser reported no errors.

- Rebuilt the needle hero as a complete Consistency card around the existing meter, with weekly goal/day summaries, a seven-day activity strip, reset timing, and a workout action. Reworked Achievements around its existing badge meter/orbit with earned/in-progress/locked totals, next-milestone progress, bare navigation arrows, and an achievements action. Added height-aware scoped styles so all primary content fits in the mobile card; verified normal narrow and 320x568 layouts and achievement navigation. Preserved existing data sources (including the existing achievement examples), without adding invented activity.
- Expanded Challenges through the full hero height with a compact category selector, three flexible challenge rows, summary, and rewards action. Moved it between Consistency and Achievements and removed the final Widgets hero entry; updated the deck count to prevent an empty trailing card. Isolated category pointer handling from the hero swipe control and verified a Cardio selection updates all challenge rows and the average. Verified 320x568 fit, no vertical overflow, correct tab order, and no Widgets tab. TypeScript, page ESLint (no errors), CSS syntax, hero-order/count checks, and calendar-sync regression tests passed.

- Added bare previous/next week arrows around Training Constellation's date-range eyebrow and removed its My Training Calendar prefix. Navigation updates the shared calendar week, resets constellation focus to Monday, clears selected session details, and refreshes an already-mounted calendar to the same week. Verified forward/back navigation, synchronized calendar dates, unchanged hero selection, and the narrow layout in the live browser; no browser errors. TypeScript, calendar-sync regression tests (including DST/year-boundary week stepping), and diff checks passed.

- Rebalanced the Profile orbiter rows around a single centered content lane. Row title shells and active cards now share the same measured center, title shells cannot overflow their stage, narrow cards respect the reserved indicator clearance, and the title-to-card gap is consistently about 15-16px. Removed the large previous/next card arrows and replaced the title bar's completion/urgency dots with clickable card icons. Verified Overview, Goals, and Training Readiness live, including icon selection; TypeScript, targeted lint, CSS parsing, source regression tests, and diff checks passed.
- Removed Save Profile from every Profile orbiter row title and added a 450ms debounced autosave for profile field, toggle, and slider changes. Body-metric history now adds a point only when its tracked values actually change, preventing unrelated edits from duplicating measurements. Tightened the cleaner title-to-card gap to about 21px. Verified autosave by toggling a real Profile setting, reloading to confirm persistence, restoring it, and reloading again; no user data was left changed.
- Made Profile's 3D neighbor-card previews visibility-aware with container queries. Hide all neighbors below a 520px row stage, admit only the first neighbor from 520px, the second from 800px, and the third from 1040px, so a preview appears only when roughly half or more can be shown. At the live 404px stage, verified the active card stays 100% visible and all seven clipped background fragments are removed; title icon navigation remains available.
- Expanded Profile's left row indicators across the full available orbiter height. A measured fit check distributes all six indicators from 7% to 93%, keeps the active label's 3D emphasis, and removes up/down arrows whenever the complete set fits; compact short-height mode retains them only when needed. Live verification showed all indicators visible without overlap, no arrows at the current height, and about 21px clearance beneath the bottommost expanded Coach + App indicator.
- Kept every Profile row title visibly open in the full-height left rail. Updated the fit measurement for six expanded labels and softened inactive 3D depth so all row names stay legible; clicking now changes only the highlighted row. Genuinely short displays retain the compact active-title fallback and arrow navigation.
- Tightened the open Profile left-side indicators into a fixed 64px-centered stack instead of stretching them toward the rail's top and bottom as viewport height grows. Live verification showed all six labels visible, no arrows or overlap, and approximately 12-21px of visual separation between neighboring controls at the current display size.
- Clipped horizontal overflow at the Profile page boundary to remove the browser-level scrollbar caused by the full-viewport orbiter exceeding the usable width beside the vertical scrollbar. Kept intentional internal pill, summary, and card rails horizontally scrollable.
- Replaced the four duplicate Profile summary cards beneath the hero with the former identity-area Member details: Membership, Sound Points, Member Since, and Training Age. Removed the redundant Member pill rail beside Add Photo while retaining the same live values in the lower horizontal summary-card rail.
- Moved View readiness details from the Readiness heading into the end of its horizontal pill rail. Added a nearest-pill highlight that follows rail scrolling, with a distinct orange treatment for Training Plan and cyan treatment for Readiness; preserved arrow, keyboard, swipe, and dialog behavior.
- Renamed the Profile hero eyebrow to Member Profile and made the avatar itself the accessible photo add/change target, with a camera badge plus hover/focus edit treatment; removed the separate Add Photo control while preserving conditional removal for an existing image. Simplified Readiness to Risk, Sleep, Pain/Soreness, and View Details, showing one item at a time behind one bare forward arrow on the left, and removed the duplicate readiness-status line. Verified all four items cycle in order in the live browser and the compact hero fits cleanly.
- Fixed the expanded Profile card/title overlap at narrow widths. The collapse control previously sat 52px above the question card and its 44px shell intruded into the combined row-title card; it is now a compact bare arrow fitted within the measured 24px title-to-card gap. Wider layouts retain the larger side control. Live geometry confirmed no title overlap at the active 561px viewport.
- Corrected the separate closed-card overlap by giving the collapsed 3D orbit a 15.5rem minimum centerline, so short stages reserve the complete active row-title height instead of centering beneath it. The live 561×653 layout now has a measured 21px clear gap between the closed My Body card and its title. Color-coded the combined row-title border, glow, wash, eyebrow, and title text from each selected card's own accent.
- Replaced Profile's remaining left-rail completion/urgency dots with the selected card icon for each row. Each icon now uses its card accent for border, color, and active/inactive glow while preserving all row labels, selection, fit logic, and navigation. Verified the complete six-row rail live with distinct Overview, Goals, Training Readiness, Pain/Recovery, Nutrition, and Coach/App icons.
- Removed the Profile left rail's indicator card shells and persistent text. The rail is now six bare, color-coded icons with a dark offset extrusion, bright face, depth shadow, and a circular light aura on active/hover/focus. Row names appear only as tooltips, while full accessible button labels remain. Tightened icon-only spacing from 64px to 52px and updated the fit threshold so compact arrow navigation appears only when the bare controls truly cannot fit. Verified the clean icon stack live at 561×653.
- Removed the helper sentence beneath the active card title in Profile's combined row header and enlarged its card-selector controls from 20/24px to 28/32px, with 16/18px icons and a stronger active glow. The description remains in the closed/expanded card. Live verification showed all eight Overview selectors contained within the 98px header at the current 561px viewport.
- Added a permanent bare up arrow above Profile's left icon rail for every non-hero row. It jumps directly to the Member Profile hero and replaces the former short-layout step-up action; the compact lower arrow remains available when rows do not fit. Verified the control live from Overview and confirmed the hero returned fully into the internal viewport.
- Removed the persistent camera badge from the member photo's bottom-right corner. The avatar remains the accessible add/change-photo control and still reveals its centered Edit treatment on hover or keyboard focus.
- Added a prominent cyan selected state to the four Profile hero summary tabs, with dimmer inactive tabs and click selection. The selected value now receives a measured chyron only when its actual scroll width exceeds its visible width; fitting values stay still and reduced-motion disables the animation. Selection centers only within the horizontal rail, avoiding vertical page movement. Live checks confirmed Membership overflow at 41px and Training Age overflow at 16-24px trigger the chyron while Sound Points and Member Since do not.

- Tightened Training Constellation to fit its container without horizontal scrolling: replaced the narrow view's 88px minimum track columns with equal fractional columns and a 32px day gutter, and removed the wide weekly grid's 1400px minimum. Added compact event cells with two-line summaries and smaller markers; full title/time/status remain available through accessible labels, hover titles, and the selected-session readout. Kept the multi-track filter and vertical day scrolling. TypeScript, component ESLint, TSX syntax, and diff checks passed. Live visual verification was attempted but blocked by repeated browser diagnostic timeouts after refresh; responsive browser confirmation remains pending.

- Replaced Training Constellation's single-select track pills with an All Tracks dropdown containing independent color-coded checkbox options, Select All, and Clear. Kept it open during selection, added a clear no-tracks state, and made both timeline layouts and counts reflect the chosen combination. Hidden-track session details no longer remain visible. Anchored the dropdown outside the clipped hero card, with viewport bounds, keyboard focus/Escape, outside dismissal, and isolated scrolling. Verified multiple simultaneous selections, empty state, Select All, narrow-screen fit, horizontal scroll isolation, and Escape focus return in the live browser. TypeScript, component lint, calendar-sync regression tests, and TSX syntax passed; page lint completed with existing warnings only.
