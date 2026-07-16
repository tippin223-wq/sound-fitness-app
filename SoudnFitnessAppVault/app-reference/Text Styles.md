# Text Styles

Durable reference for recurring Sound Fitness heading and text treatments. New user instructions override this note, but use these names when matching existing screenshots.

## Member Preview Cyan Eyebrow

Seen in the member dashboard preview screenshots as:

- `Early access preview`
- `Member app features`

Use this for small section labels above a larger 3D heading.

Implementation pattern:

- Component: `MarketingSectionHeading3D`
- Class hook: `member-preview-heading-3d`
- Props: `scale="eyebrow"`, `variant="cyan"`, `effects="starfield"`, `live={false}`
- Typical canvas height: `h-10` for compact labels, `h-14` when the label needs more breathing room.

Visual contract:

- Bright cyan/sky text.
- Wide uppercase letter spacing.
- Small, sharp, glowy, and restrained.
- Should read as a label, not a headline.
- Keep it close to the title it introduces, but leave enough vertical space that it does not visually collide with the 3D headline below.

Fallback CSS currently lives in `app/member-dashboard-preview/page.tsx` under `.member-preview-heading-3d.marketing-section-heading-3d--eyebrow .marketing-section-heading-3d__fallback`.

## Member Preview Orange-Rim Ice Headline

Seen in the member dashboard preview screenshots as:

- `Preview the member dashboard experience.`
- `Everything the app keeps organized.`

Use this for member-preview marketing display headings when the page should feel bold, dimensional, and app-like.

Implementation pattern:

- Component: `MarketingSectionHeading3D`
- Class hook: `member-preview-heading-3d`
- Optional hero hook: `member-preview-hero-heading-3d` for the top hero title.
- Props: `scale="hero"`, `variant="ice"`.
- Use `effects="full"` for the top hero title; section titles can omit effects or use the local default.
- Use explicit canvas heights and max widths, for example:
  - Top hero: `h-[220px] sm:h-[260px] lg:h-[285px]`
  - Body section title: `h-[170px] sm:h-[215px]`

Visual contract:

- White/ice fill with cyan-blue dimensional shadow.
- Strong orange rim/drop shadow offset behind the letters.
- Heavy uppercase display shape.
- Tight stacked line breaks, but never overlapped.
- Works best with a short energy divider and body copy below.

Do not casually apply this heavy orange-rim style to the three public home page body headings. The home page has a separate quieter body-heading contract in [[Home Page Layout Math and Styling]].

## Verification

For heading edits, check the live route in the browser:

- No heading lines overlap.
- Fallback/2D mode still fits inside the canvas.
- Eyebrow labels stay visibly smaller than the title.
- The title does not push body copy, cards, or CTAs into collisions.
