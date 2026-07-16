# Background music

Drop ONE song file here named **`onboarding-theme.mp3`** and it becomes the
looping background track for the onboarding flow.

- Path the app loads: `/music/onboarding-theme.mp3`
- Any browser-playable format works if you rename it accordingly, but the code
  points at `onboarding-theme.mp3` — change `MUSIC_SRC` in `lib/soundFx.ts` if
  you use a different name/format.
- It loops seamlessly and its volume follows the in-app volume slider + mute.
- **No file here?** The app runs completely silent for music (no errors) — the
  UI sound effects still play.

Use a track you have the rights to (your own, licensed, or royalty-free).
A 1–3 minute loopable instrumental works best.
