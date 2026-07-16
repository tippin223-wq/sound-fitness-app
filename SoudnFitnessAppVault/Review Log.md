# Review Log

Codex will use this note to record reviewed screenshots, interpretation notes, and edits completed from the vault.

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

- 2026-06-23: Added `checklists/single-3d-render-per-page.md` to preserve the plan for fixing broken 3D placeholders by moving toward one page-owned/live 3D render surface and polished fallbacks.
