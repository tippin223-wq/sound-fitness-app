# Codex Start Here

This vault is the app memory layer for Sound Fitness. Read this before making app changes.

## Before Editing

1. Read [[app-reference/User Preferences]].
2. Read [[app-reference/App Map]].
3. Read [[app-reference/Routes and Areas]] if the task touches navigation or page ownership.
4. Read [[app-reference/Text Styles]] for heading, eyebrow, and display text edits.
5. Read [[app-reference/Home Page Layout Math and Styling]] for public home page layout or heading edits.
6. If the user says `start edits`, follow [[app-reference/Screenshot Workflow]].
7. Inspect the actual source files before changing code. The vault helps with intent, but code is the implementation source of truth.

## Current App

- Repo: `C:\Users\josep\sound-fitness-app`
- Dev server commonly runs at `http://localhost:3000`
- Member area dashboard: `http://localhost:3000/dashboard`
- Root app pointer for agents: `AGENTS.md`

## Accuracy Rules

- Do not create mock pages, temporary dashboards, or helper servers when the user asks to open or show an existing app page.
- If a request is ambiguous, first inspect the current app, route map, browser state, and vault notes.
- Prefer changing the real app in place over creating one-off artifacts.
- Update [[Review Log]] after acting on screenshots or durable app decisions.
