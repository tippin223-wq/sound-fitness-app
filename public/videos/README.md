# Recommendation videos

Each recommendation card on the assessment result screen opens a popup that
plays its **own** short video. Drop one MP4 per recommendation here, named
`reco-<slug>.mp4`, where `<slug>` is the recommendation label lowercased with
non-alphanumerics turned into dashes.

Examples (the label → the file it loads):

- **Guided strength** → `reco-guided-strength.mp4`
- **Guided mobility** → `reco-guided-mobility.mp4`
- **Recovery blocks** → `reco-recovery-blocks.mp4`
- **Gentle strength** → `reco-gentle-strength.mp4`
- **Mobility routines** → `reco-mobility-routines.mp4`
- **Recovery** → `reco-recovery.mp4`
- **Full-body strength** → `reco-full-body-strength.mp4`
- **Workouts** → `reco-workouts.mp4`
- **Nutrition habits** → `reco-nutrition-habits.mp4`
- **Accountability** → `reco-accountability.mp4`
- **Performance strength** → `reco-performance-strength.mp4`
- **Control** → `reco-control.mp4`
- **Reminders** → `reco-reminders.mp4`
- **Streaks** → `reco-streaks.mp4`
- **Weekly checkpoints** → `reco-weekly-checkpoints.mp4`
- **Mobility** → `reco-mobility.mp4`
- **Recovery support** → `reco-recovery-support.mp4`

Notes:

- These should be **unique clips made for the app**, not the marketing-site
  videos.
- Any missing file degrades gracefully: the popup shows the card photo with a
  "Video coming soon" overlay instead of an error.
- The popup is color-coded to each recommendation's accent automatically — no
  per-video config needed beyond the file itself.
- 9:16 or 16:9 both work; the player uses a 16:9 frame with `object-cover`.
- Recovery clips (`reco-recovery*.mp4`) show **assisted stretching** — one
  person manually stretching another (Pexels 3195218, free license, commercial
  use allowed). Sound Fitness does assisted stretch, so: no massage footage,
  and no reformer/"stretching gear" apparatus either — that reads as pilates,
  which they also don't do.
- Mobility clips (`reco-mobility*.mp4`, `reco-control.mp4`) show **foam
  rolling** — Sound Fitness does not do pilates, so keep these to foam
  rolling or assisted stretch, not pilates/mat-flow footage. (Foam-roller
  clip sourced from Pexels, free license, commercial use allowed.)
- `reco-reminders.mp4` shows **someone checking their phone** (Pexels
  8992552) — it illustrates app reminders, not exercise. `reco-streaks.mp4`
  is push-ups (Pexels 4367576) and `reco-weekly-checkpoints.mp4` is a couple
  training together (Pexels 4859227); all Pexels free license.
