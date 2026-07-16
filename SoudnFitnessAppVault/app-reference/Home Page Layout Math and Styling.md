# Home Page Layout Math and Styling

Durable rules for the public home page at `/`, implemented primarily in `app/page.tsx`.

For reusable heading/text style names across routes, also read [[Text Styles]].

## Section Order

The home page scroll sequence is:

1. Top hero
2. Services
3. Pre-assessment
4. Preview the app
5. Fewer barriers

Each snap target must use `data-home-snap-section` and `.home-snap-section`. The top hero may snap to `start`; the other body sections should snap to `center`.

## Scroll Stage Math

- Header offset is controlled with `scroll-padding-top: clamp(6.75rem, 10vw, 8.5rem)`.
- Short body sections need enough stage height to avoid the next section visually crowding the current one. Use:
  `min-height: calc(100svh - clamp(6.75rem, 10vw, 8.5rem))`.
- The member app and fewer barriers sections are scroll stages, not compact content rows. Keep them centered with `display: grid` and `align-items: center`.
- Do not shrink a snap section below its visual content height just to reduce whitespace. If a section feels crowded, reduce the heading canvas height or grid density before reducing stage height.

## Heading Style Contract

The three body-section titles are:

- `In-home training starts with the pre-assessment.`
- `Preview the app, then choose your access.`
- `Fewer barriers. More follow-through.`

These three should match each other. Use:

- `MarketingSectionHeading3D`
- `scale="section"`
- `variant="ice"`
- `density="tight"`
- `effects="starfield"`
- `className` should include `home-section-title-3d` so fallback rendering uses the same controlled 3D sizing when the page is in 2D image mode.

Do not use the heavy orange-rim preset for these body-section titles:

- Avoid `scale="hero"` for these three.
- Avoid `weight="heavy"` for these three.
- Avoid `letterMotion="pivot"` for these three.

That heavy hero style is too visually loud for the body sections and has repeatedly caused line crowding/overlap.

## Subheading Style Contract

- Section eyebrows such as `Required first step`, `Member App`, and `Built for real life` can use the small cyan 3D style.
- The last two sections, `Preview the app` and `Fewer barriers`, should use 3D subheading blocks below the main title. Do not leave these as plain paragraph text unless the user explicitly asks to simplify.
- Subheading 3D blocks should use `scale="section"`, `variant="cyan"`, `density="tight"`, and an explicit height. Keep at least `mt-4` between title and subheading.
- Subheading `className` should include `home-section-subheading-3d` so fallback text is small enough to fit inside the explicit canvas height.

## Heading Canvas Math

The WebGL/snapshot heading canvas is not the same as the visible text footprint. Dimensional shadows, rim offsets, and glow extend outside the apparent letters. Reserve space for the full visual object, then place the next block below that reserved area.

- For 3-line home body titles such as `Preview the app, then choose your access.`, use at least `h-[176px] sm:h-[198px] lg:h-[218px]`.
- For 2-line home body titles such as `Fewer barriers. More follow-through.`, use at least `h-[146px] sm:h-[166px] lg:h-[184px]`.
- Use at least `mt-7 sm:mt-8` between a body title canvas and a 3D subheading canvas. `mt-4` is too tight for these title glows.
- For 3-line cyan subheadings, use at least `h-[68px] sm:h-[78px]`; for 2-line cyan subheadings, use at least `h-[58px] sm:h-[66px]`.
- If a title line count changes, recompute before shipping: visible title height must be less than canvas height minus a 24px glow/descender buffer, and the next block must start after the canvas plus the title/subheading gap.

## Overlap Checks

Before finishing home page heading edits, verify in the browser:

- The three body-section titles do not visually overlap their own line boxes.
- The member app title, 3D subheading, buttons, and feature cards are all distinct.
- The fewer barriers title, 3D subheading, and benefit cards are all distinct.
- At the bottom of the page, fewer barriers can become the active snap section.
- No body-level horizontal overflow was introduced.
