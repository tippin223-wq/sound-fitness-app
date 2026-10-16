# User Preferences

These notes are meant to reduce repeated misunderstandings. New user instructions always override older notes.

## Working Style

- When the user asks to open or show an existing app area, navigate to the real app route. Do not create a mock page.
- Avoid creating extra files, servers, or demos unless the user explicitly asks for a new artifact.
- The user may annotate screenshots directly and place them in the vault; treat those screenshots as edit instructions when they say `start edits`.
- Keep explanations concise and practical.
- Preserve existing features unless the user explicitly asks to remove them. Adding the dashboard header to Profile means sharing it on both pages, not removing it from Dashboard.

## Current Known Route Language

- Profile's hero should fit the available screen height. Keep training-plan and Readiness pills in horizontal, scrollbar-free rails. Put View readiness details at the end of the Readiness rail. Give each rail a clear nearest-pill highlight that follows horizontal scrolling, using distinct plan and readiness accents. Move Membership, Sound Points, Member Since, and Training Age out of the identity-area pill rail and into the four summary cards beneath the hero, replacing the duplicate plan/profile summaries there.
- The four Profile summary tabs below the hero are a horizontal overflow rail with hidden scrollbars, touch/mouse scrolling, Left/Right keyboard control, and bare arrows underneath when overflow exists.
- Give the Profile hero balanced lateral gutters. Its vertical row indicators begin only after the hero and live in a reserved left-side lane that does not overlap lower cards. Keep every row title open in the full-height rail; clicking changes the highlighted row rather than revealing its title.

- "member area dashboard" means the existing member dashboard at `/dashboard`.
- "Codex browser" means the in-app browser.
- In dashboard orbit selectors, the center effect is the "aura" and the outer page icons are "planets", not moons.
- "start edits" means review unhandled annotated screenshots from the vault and apply changes to the real app.

## Accuracy Expectations

- Check browser state, source routes, and vault notes before acting on ambiguous app navigation.
- Do not infer a file path from natural language unless the user gives an actual path.
- If a screenshot annotation conflicts with current text instructions, ask or follow the newest explicit text instruction.

## Calendar Editor

- Training Constellation reflects the training calendar's week, events, dates, times, and updates. Exclude Nutrition from the constellation; keep its entries in the calendar for use elsewhere.
- Training Constellation's All Tracks filter is a dropdown with independently selectable, color-highlighted tracks. Allow multiple tracks together and keep the dropdown open while toggling options.
- Keep all selected constellation tracks visible without horizontal scrolling: use tight fluid columns and a narrow day gutter, with compact event summaries and full details on selection.
- Keep one clock icon on the right of the time field, opening hour, minute, and AM/PM columns together.
- Use the calendar's full available height when editing so the editor controls and Save/Cancel fit without scrolling the popup.
- Put bare up/down arrows beneath the hour and minute columns.
- Use icon cards with visible labels for Add to this day and Sound Session options; horizontal scrolling is welcome when they do not all fit.

## Dashboard Row Navigation

- In Account paging, tight phone widths may keep the Account/avatar step near the center. When the header has enough room for the rewards/gift side to read to the right, the Account/avatar step should right-align to preserve the full-size header's account-on-the-right perception. Rewards may remain centered on its own step.
- When Account paging is active, let Rewards and the meter share the same horizontal position only when their measured open-header footprints fit with breathing room. Tight phone widths should keep the meter as its own next scroll position.
- Center the open header's complete navigation group (joystick, rail, and title) in its available menu lane. Move Rewards to the next horizontal scroll position before it crowds Account; use the controls' full open footprints and a clear gap, not only a hard-coded phone breakpoint or compressed idle sizes.
- Preserve the original trophy-above-crest positions and sizes in the header. They are separate actions: crest returns to the dashboard, trophy opens the Sound popup. Give each its own hover/focus highlight animation; do not separate them by rearranging or shrinking the artwork.
- Shared header: omit the urgency pill beneath the page title. The decorative exercise figure needs clearance measured from its full/longest text, not just its body; hide it when it would overlap controls or extend off-screen, without shrinking navigation to make it fit.
- The exercise figure must fit the fully open header to appear in either open or idle mode. Extra room created by the smaller idle state must never bring back a figure that fails the open-header fit.
- The header's page title is the third nav text line (for example, Dashboard beneath Training / Sessions). Keep all three proportionate, scaling together with category / section / page sizes at roughly 67% / 83% / 100%.

- The My Sound row indicator must preserve the original crest silhouette and proportions; do not draw an extra shield behind it.
- Column indicators (Weekly Recap, Workout / Sessions, System Row, and My Sound) stay flat and left-aligned with the header text when all options fit. Switch to a 3D orbit only on actual overflow, then return to flat when enough space is available. Keep the selected card unchanged across layout changes.
- In System Row, always show the currently highlighted option's title beneath its icon/aura, updating as selection changes.
- Remove urgency/status dots from the left vertical row indicators; keep the current-row selection highlight.
- Row icons should look solid and three-dimensional, with visible sides, bevels, and highlights rather than faint outline glyphs.
- Keep left-side row indicators free of background containers. Use a fine luminous circular highlight for the active/hovered icon and show row-name tooltips on hover and keyboard focus.
- In Profile's left vertical row rail, use each row's currently selected card icon in place of the completion/urgency dot. Keep every control visually bare with no surrounding card/container and no persistent title text. Render the icon with a layered 3D extrusion and card-colored light aura; reveal the row title only as a hover/keyboard-focus tooltip.
- Show one bare up arrow above Profile's left vertical icon rail whenever a non-hero row is active. It returns directly to the Member Profile hero rather than stepping through previous rows.

## Hero Cards

- Support Signals should show every whole circle that fits, including even counts. Keep the highlight centered when possible (nearest middle slot for even counts); do not hide an otherwise fitting circle just to force exact centering. Clamp at list ends without empty slots.
- Muscle Levels must show complete rings on short/mobile cards. Base compact/expanded training controls on their actual available space, not just viewport height.
- Consistency and Achievements are complete cards centered on their existing meters, with their summaries and actions visible at once on mobile.
- Challenges uses the full available card height and sits immediately before Achievements. The hero row ends with Favorite Workouts; omit the Widgets card.

## Profile Orbiter

- Keep goal planning and goal questionnaires on the dedicated Goals page. The Profile orbiter should contain member identity, body, readiness, recovery, nutrition, and app/coach context without a duplicate Goals row.
- Give every Profile orbiter row its own distinct accent. Apply that row accent consistently to its combined title, selector icons, cards, liquid fill, progress badge, and left-rail indicator so cards within one row read as a coordinated set.
- Give each Profile row one permanent left-rail icon based on the row itself; changing the active card must not swap the vertical navigation icon. Keep the narrow row-title eyebrow inside a center-safe lane so it never collides with the completion badge.
- Show the complete Profile row eyebrow; wrap it on narrow displays rather than clipping it. The row-title percentage represents aggregate completion across every card in that row, while percentages shown on cards remain card-specific.
- Keep the Profile left indicator rail visually clean: retain the individual icon glows and depth, but do not draw a decorative horizontal line through the center of the rail.
- Label the Profile hero as Member Profile. The avatar itself is the add/change-photo control, with a hover/focus edit highlight but no persistent corner camera badge; do not show a separate Add Photo button.
- Keep Profile photo actions inside the avatar's action menu. Selecting the photo/edit affordance should reveal Edit Photo and, when an uploaded image exists, Remove; do not show a persistent Remove button beneath the avatar.
- Keep the Profile hero Readiness rail to Risk, Sleep, Pain/Soreness, and View Details. Show one item at a time and cycle forward with one bare right-facing arrow on the item's left. Do not repeat the computed readiness label beneath the Readiness heading.
- Give the four Profile hero summary tabs a prominent single selected state. Selecting a tab may center it horizontally but must not move the page vertically. If the selected tab's value is clipped, animate that value as a slow chyron so its complete text becomes readable; leave values still when they fit and respect reduced-motion preferences.
- Keep every Profile hero summary tab fully framed whenever the row width can accommodate all four; reserve vertical breathing room for selected glows and overflow arrows. A clipped selected value's chyron pauses at its starting text, travels once, fades out, resets while hidden, and fades back in before repeating.
- Center each row title and its active card on the same axis, with a clear, even vertical gap and enough symmetric side clearance for the left row indicator rail.
- Use the card icons as the row title's card selectors instead of urgency/completion dots. Omit the large previous/next card-scroll arrows; icon selection and visible orbit cards provide navigation.
- Do not show Save Profile buttons in row titles. Persist Profile progress automatically as fields, toggles, and sliders are changed.
- Show a Profile orbiter's 3D neighboring-card preview only when a useful portion (roughly half or more) fits inside the row; hide narrow slivers and rely on the title icons for direct navigation.
- Let the left Profile row indicators use the full row height without stretching them across its extreme top and bottom. Keep the open labels in a compact, vertically centered stack with modest non-overlapping gaps. When every open indicator label fits, show the complete set with every title visible and omit up/down arrows; clicking changes selection, not label visibility. Retain compact arrow navigation with only the active title revealed on genuinely short displays.
- Keep Profile's page-level horizontal overflow clipped so no browser scrollbar appears along the bottom. Preserve horizontal scrolling only inside the deliberately swipeable pill, summary, and card rails.
- Keep every Profile question inside its appropriate 3D orbital card; do not repeat the questionnaire as a 2D stack beneath the orbiter. Replace generic Details controls with Open Questions and previous/next question navigation that keeps one expanded card visible at a time on small screens. Expanded cards must leave a clear gap beside the left row-indicator lane. Keep the Profile shell locked to the viewport with no browser-level right scrollbar; vertical movement belongs to the internal 3D row scroller. For now, long question content should have a visible vertical scrollbar inside its card so its remaining content is discoverable.
- Use one combined Profile row header above an expanded card rather than repeating the active card title inside the card. The combined header shows the row name, colorful active-card title, completion, and the card-selector indicators; the scrollable card begins directly with its questions.
- Keep the combined Profile row header compact: omit the selected card's helper/description beneath its title and preserve that information inside the card itself. Use the reclaimed header space for larger card-selector icons and a stronger active-icon highlight.
- Expanded Profile cards show one semantic question group at a time. Use a dedicated inner previous/next arrow set and Question X / Y label to switch question groups; reserve the lower outer arrows for switching 3D cards and label that counter Card X of Y. A long active question may still scroll internally, but inactive questions must not remain visible as a list.
- Keep expanded Profile questions visually flat inside the main 3D card: remove the generic nested shell and the active question group's redundant outer border/background. Center the active question horizontally and vertically when its content height permits, while preserving internal scrolling for long questions.
- Put the bare Question X / Y arrow control above the active Profile question. Do not wrap this question selector in a pill, border, background, or shadow container.
- Use a neutral dark surface inside expanded Profile question cards rather than filling the question area with the row accent; retain the row color on orientation details such as the title, outline, icons, and highlights.
- Keep expanded Profile question cards the same outer size, but let the active question group fill the available card body. Elevate the active group's title with a polished centered treatment and keep the answer controls spacious rather than cramped into a small nested panel.
- Keep the bottom Card X / Y navigation for expanded Profile cards fully visible inside short viewports. Tighten row padding or spacing before changing the card's outer footprint.
- Info popups inside expanded Profile question cards must float above the card through the page layer. They should not render inside the internal question scroller or any clipped 3D card container.
- On narrow Profile layouts, keep the expanded-card collapse arrow entirely inside the gap between the combined row title and question card; it must not overlap either surface. The larger side control is reserved for widths with enough lateral room.
- Reserve the full active row-title height when positioning a closed Profile card, including on short row stages. Keep a visible title-to-card gap and color-code the combined row title to the selected card's accent.

## Weekly Recap

- Long Weekly Recap indicator pills need wider, width-aware 3D spacing than icon-only indicators. Show one neighbor on each side of the centered selection with clear gaps and keep the complete visible pills within the strip.
- Keep Nutrition Consistency compact: fuel habit bars use a one-at-a-time horizontal slider with two bare arrows below instead of a tall stacked list. Preserve all habits and reset to the first when leaving the card/row.

## Master Training Journey

- Plan Timeline is the row's title card; omit the two small yellow row headings above it.
- Keep the Plan Timeline title beside its icon to reduce the title card's height.
- Put the percentage completed badge in the title card's top-right corner. Omit the second timeline card's decorative header strip and Current Plan Screenshot text.
- Current Focus, Plan Source, Next Action, and Training Data share a horizontal detail strip with one bare right-facing arrow on the left. Do not repeat Current Focus above the strip.
- Timeline steps use bare left/right arrows below the cards instead of a visible scrollbar. Arrows move the highlighted step and center it where possible; leaving the row resets selection to the first step.
- Timeline lines appear only in the gaps between step cards; no continuous line behind the cards or extra top-edge line accents.
- The setup timeline order is Define the goal, Make the plan, Build first workout, Start session, Video review.
- Fit the complete Master Training Journey row in its available height without vertical scrolling. Keep the Plan Timeline title icon bare, with no background or border container.
- Keep the bottom timeline steps free of a shared outer card container; retain the individual step cards, highlights, connectors, and arrows.
- Plan Timeline details (Current Focus, Plan Source, Next Action, Training Data) use bare text without individual pill backgrounds or borders; retain the slider and arrow.
