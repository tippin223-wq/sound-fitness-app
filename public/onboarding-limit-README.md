# "What should your plan avoid or protect?" option photos

The injury/limitation question shows a photo behind each option card. Drop a
focused, real photo for each at these exact paths (JPG). Until a file exists,
that card gracefully shows just its icon on the dark card (no broken image).

| Option | File | Ideal shot |
|--------|------|-----------|
| Pain or stiffness | `/public/onboarding-limit-pain.jpg` | Someone easing into a gentle stretch / holding a sore area, calm tone |
| Knees or hips | `/public/onboarding-limit-knees-hips.jpg` | Close, focused shot of a knee/hip during a supported movement |
| Back or neck | `/public/onboarding-limit-back-neck.jpg` | Focused shot of a lower back / neck mobility or support |
| Shoulders or wrists | `/public/onboarding-limit-shoulders-wrists.jpg` | Focused shot of a shoulder/wrist during controlled work |
| Low impact only | `/public/onboarding-limit-low-impact.jpg` | Low-impact movement — mat work, banded/bodyweight, controlled |
| No major limits | (uses `/public/onboarding-workout-focus-photo.jpg`) | already set — strong, unrestricted training |

Notes:
- Use images you have the rights to (owned, licensed, or royalty-free).
- Cards are landscape-ish and cropped with `object-fit: cover`; a subject that
  reads at a small size (tight, focused framing) works best.
- `photoPosition` per option is set in `optionVisuals` in
  `components/onboarding/OnboardingQuestionnaire.tsx` if you need to nudge the
  crop.
