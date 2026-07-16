# Screenshot Workflow

Use this workflow for annotated screenshot edits.

## Folder Convention

- New screenshots: `screenshots/inbox`
- Handled screenshots: `screenshots/reviewed`
- Review notes: [[../Review Log]]

## When User Says `start edits`

1. List image files in `screenshots/inbox`.
2. Open every unreviewed screenshot visually.
3. Extract each requested change and group changes by route/component.
4. Inspect the matching source files.
5. Make the requested edits in the real app.
6. Verify in the browser when the change is visual or route-facing.
7. Move handled screenshots to `screenshots/reviewed`.
8. Update [[../Review Log]] with reviewed files, interpretation, changed files, verification, and anything unresolved.

## Supported Image Types

- `.png`
- `.jpg`
- `.jpeg`
- `.webp`

## Good Annotation Habits

- Mark the route or page area when possible.
- Circle the target and write the intended change nearby.
- If the change is about removal, use clear wording such as `remove`, `hide`, or `delete`.
- If the change is about style, note color, spacing, size, or alignment.
