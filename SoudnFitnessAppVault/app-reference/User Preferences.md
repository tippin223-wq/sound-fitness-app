# User Preferences

These notes are meant to reduce repeated misunderstandings. New user instructions always override older notes.

## Working Style

- When the user asks to open or show an existing app area, navigate to the real app route. Do not create a mock page.
- Avoid creating extra files, servers, or demos unless the user explicitly asks for a new artifact.
- The user may annotate screenshots directly and place them in the vault; treat those screenshots as edit instructions when they say `start edits`.
- Keep explanations concise and practical.

## Current Known Route Language

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

- Remove urgency/status dots from the left vertical row indicators; keep the current-row selection highlight.
- Row icons should look solid and three-dimensional, with visible sides, bevels, and highlights rather than faint outline glyphs.
- Keep left-side row indicators free of background containers. Use a fine luminous circular highlight for the active/hovered icon and show row-name tooltips on hover and keyboard focus.
