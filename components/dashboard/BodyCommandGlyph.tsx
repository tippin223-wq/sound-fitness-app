import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Glyphs for the circular level rings in Training Categories and Support
 * Signals. These are drawn as bright filled illustrations rather than line
 * icons — at the size they render at, filled shapes carrying their own colour
 * read far better than strokes, which is exactly why emoji are built this way.
 *
 * Two construction rules keep the anatomy legible:
 *
 * 1. Every body part reads as ONE outlined silhouette. The trunk is a single
 *    closed path; the limbs are built by stroking a skeleton twice — once fat
 *    in the outline colour, then thinner in the fill — so joints and bulges
 *    merge into one smooth contour instead of a visible pile of shapes.
 * 2. The trunk carries arms. Deltoids live where the arm meets the torso, so
 *    without arms there is nowhere for "shoulders" to point at.
 *
 * The fills stay flat. Depth comes from the glyph sitting IN FRONT of the
 * level meter — drawn large enough to cover the ring and break its rim at the
 * top, with a contact shadow underneath — not from shading the artwork.
 *
 * The support signals deliberately share no silhouette with each other or with
 * the anatomy: moon, head, battery, plaster, stretching figure, trunk, apple,
 * water drop. At ring size the outline is the whole message, so two signals
 * that resolve to similar blobs would be indistinguishable however different
 * their detail.
 */
export type BodyCommandGlyphName =
  | "arms"
  | "back"
  | "chest"
  | "core"
  | "fatigue"
  | "fuel"
  | "hydration"
  | "legs"
  | "neck"
  | "recovery"
  | "shoulders"
  | "sleep"
  | "soreness"
  | "stress";

export type BodyCommandGlyphTone =
  | "blue"
  | "cyan"
  | "emerald"
  | "gold"
  | "lime"
  | "purple"
  | "rose"
  | "teal";

const SKIN = "#F3AC80";
const SKIN_SHADE = "#CE8055";
const SKIN_LINE = "#A85F3B";
const MUSCLE = "var(--body-muscle-color, #FF6F45)";
const MUSCLE_LIGHT = "var(--body-muscle-light, #FFA277)";

/**
 * A limb segment: the same skeleton stroked fat in the outline colour and
 * again thinner in the fill. Every segment's outline pass runs before every
 * fill pass, so interior seams get painted over and the limb ends up with one
 * continuous contour.
 */
const limb = (d: string, width: number, outline: boolean) => (
  <path
    d={d}
    fill="none"
    key={`${d}-${outline ? "o" : "f"}`}
    stroke={outline ? SKIN_LINE : SKIN}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={outline ? width + 1.1 : width}
  />
);

const STRETCH_SPINE = "M12 7.4V14.4";
const STRETCH_ARMS = "M12 8.8L7.2 4.8M12 8.8L16.8 4.8";
const STRETCH_LEGS = "M12 14.2L9.4 20.4M12 14.2L14.6 20.4";

const glyphArt: Record<BodyCommandGlyphName, ReactNode> = {
  // Flexed bicep: upper arm, forearm and fist merged into one contour, with
  // the bicep swelling above the arm's own line.
  arms: (<><path d="M3 18.5 5 14l3-1c1-3 3-4 5-2l2 1 1-5-2-1 .8-3 3-.8 2.2 2.8-.6 10c-.2 4-3.4 6-7.4 6H6Z" fill="#33485b" stroke="#8ca5b7" strokeWidth=".8" strokeLinejoin="round"/><path d="M7 15c1-3 3-5 5-3s2 5-1 6l-5 .5Z" fill={MUSCLE}/><path d="m16.8 8-.8 6.5c-.3 2-1 3-2.5 3.5" fill="none" stroke={MUSCLE} strokeWidth="2.4" strokeLinecap="round"/><path d="M8.8 14c1-1.3 2-1.4 2.8-.2" fill="none" stroke={MUSCLE_LIGHT} strokeWidth=".8" strokeLinecap="round"/></>),
  // Rear double-biceps. Arms and head go down first so the trunk's own outline
  // lands on top as the shoulder seam; lats spread from the armpits to the
  // waist. It gets a head because a pose without one reads as decapitated
  // between two raised fists.
  back: (<><path d="m7 3 3 1h4l3-1 4 4-2 4-2 10H7L5 11 3 7Z" fill="#33485b" stroke="#8ca5b7" strokeWidth=".8" strokeLinejoin="round"/><path d="M5.5 7.5 10.8 10l.2 9-3-2.5ZM18.5 7.5 13.2 10l-.2 9 3-2.5Z" fill={MUSCLE}/><path d="m8 5 4 3 4-3-1 4-3 2-3-2Z" fill={MUSCLE}/><path d="M12 4v16" stroke="#a8bac7" strokeWidth=".7"/><path d="m6.8 8 2.5 1.5m7.9-1.5-2.5 1.5" stroke={MUSCLE_LIGHT} strokeWidth=".8" strokeLinecap="round"/></>),
  // Two pec slabs under the collarbone, with a sternum gap.
  chest: (<><path d="m8 3 2 1h4l2-1 5 4-1 6-3 1-1 7H8l-1-7-3-1-1-6Z" fill="#33485b" stroke="#8ca5b7" strokeWidth=".8" strokeLinejoin="round"/><path d="M4.5 8c2-2.3 4.5-2.4 7-.8v6c-2.5 2-5.5.6-6.8-1.2ZM19.5 8c-2-2.3-4.5-2.4-7-.8v6c2.5 2 5.5.6 6.8-1.2Z" fill={MUSCLE}/><path d="M6 8.5c1.5-.8 3-.8 4.2-.2m3.6 0c1.2-.6 2.7-.6 4.2.2" stroke={MUSCLE_LIGHT} fill="none" strokeWidth=".8" strokeLinecap="round"/><path d="M12 6v9" stroke="#a8bac7" strokeWidth=".6"/></>),
  // Eight blocks running from below the pecs down to the waist. Gaps of skin
  // define them far better than lines scored across one slab.
  core: (<><path d="M5 2.5 9 4h6l4-1.5-2 9 1 8-6 2-6-2 1-8Z" fill="#33485b" stroke="#8ca5b7" strokeWidth=".8" strokeLinejoin="round"/><path d="m6.6 7 2.2 2-.3 8-1.1 2-.2-7Zm10.8 0-2.2 2 .3 8 1.1 2 .2-7Z" fill={MUSCLE}/>{[6.5,10,13.5,17].map((y,i)=><g key={y}><rect x={9.5+i*.12} y={y} width={2-i*.1} height="2.6" rx=".6" fill={MUSCLE}/><rect x="12.5" y={y} width={2-i*.1} height="2.6" rx=".6" fill={MUSCLE}/></g>)}</>),
  // Battery run down: the accumulated cost of work, training and life.
  fatigue: (
    <>
      <rect
        fill="#E8F1FA"
        height="9.4"
        rx="2.8"
        stroke="#6F849A"
        strokeWidth="0.9"
        width="16.6"
        x="2.4"
        y="7.3"
      />
      <rect
        fill="#E8F1FA"
        height="3.4"
        rx="1.1"
        stroke="#6F849A"
        strokeWidth="0.9"
        width="2.4"
        x="19.4"
        y="10.3"
      />
      <rect fill="#FF6B45" height="5.4" rx="1.1" width="3.6" x="4.4" y="9.3" />
    </>
  ),
  // Food, not a flame — the calorie side of the day.
  fuel: (
    <>
      <path
        d="M12 7.6C13.4 6 16.6 5.8 18.4 7.6C20.2 9.4 20 13.8 17.8 17C16.6 18.8 15 20 13.6 19.8C12.8 19.7 12.4 19.4 12 19.4C11.6 19.4 11.2 19.7 10.4 19.8C9 20 7.4 18.8 6.2 17C4 13.8 3.8 9.4 5.6 7.6C7.4 5.8 10.6 6 12 7.6Z"
        fill="#F2543D"
      />
      <path
        d="M12 7.4C11.8 5.8 11.9 4.4 12.6 3.4"
        fill="none"
        stroke="#8B5A2B"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <path d="M12.9 5.2C14.1 3.8 16.1 3.4 17.5 4C17.1 5.6 15.5 6.6 13.7 6.4Z" fill="#4ADE80" />
    </>
  ),
  // Hydration: a single water drop, distinct from the apple/fuel silhouette.
  hydration: (
    <>
      <path
        d="M12 2.4C15.9 7.1 18.2 10.8 18.2 14.3C18.2 18.3 15.5 21.4 12 21.4C8.5 21.4 5.8 18.3 5.8 14.3C5.8 10.8 8.1 7.1 12 2.4Z"
        fill="#5EEAD4"
        stroke="#0F766E"
        strokeLinejoin="round"
        strokeWidth="0.95"
      />
      <path
        d="M9.1 14.1C9.1 16.4 10.5 18.1 12.6 18.6"
        fill="none"
        stroke="#CCFBF1"
        strokeLinecap="round"
        strokeWidth="1.45"
      />
      <path
        d="M10 8.8C11.1 7.1 11.8 6.1 12 5.8C12.6 6.6 13.4 7.9 14.3 9.3"
        fill="none"
        opacity="0.5"
        stroke="#F0FDFA"
        strokeLinecap="round"
        strokeWidth="1"
      />
    </>
  ),
  // One leg from the side, a single closed outline. No creases: at this size
  // they read as wrinkles, not anatomy — the knee, calf and heel are all in
  // the contour itself.
  legs: (<><path d="M6 2.5h12l.7 7.5-2.1 7 .2 3.5 2 1H14l-.4-5-1.6-7-1.6 7-.4 5H5.2l2-1 .2-3.5-2.1-7Z" fill="#33485b" stroke="#8ca5b7" strokeWidth=".8" strokeLinejoin="round"/><path d="m7 4 3.7.2-.7 7.3-2-1.3Zm10 0-3.7.2.7 7.3 2-1.3Z" fill={MUSCLE}/><path d="m7.6 13 2 .4-.5 5H7.8Zm8.8 0-2 .4.5 5h1.3Z" fill={MUSCLE}/><path d="m8 5-.3 4m8.3-4 .3 4" stroke={MUSCLE_LIGHT} strokeWidth=".8" strokeLinecap="round"/></>),
  // A figure mid-stretch — this signal tracks whether the recovery sessions
  // actually happened, so it shows someone doing one.
  recovery: (
    <>
      {limb(STRETCH_SPINE, 4.4, true)}
      {limb(STRETCH_ARMS, 2.8, true)}
      {limb(STRETCH_LEGS, 3.2, true)}
      <circle cx="12" cy="3.6" fill={SKIN_LINE} r="3.05" />
      {limb(STRETCH_SPINE, 4.4, false)}
      {limb(STRETCH_ARMS, 2.8, false)}
      {limb(STRETCH_LEGS, 3.2, false)}
      <circle cx="12" cy="3.6" fill={SKIN} r="2.5" />
    </>
  ),
  // Deltoids: caps straddling the shoulder corner, where the arm meets the
  // trap line. Any lower and they read as the top of the bicep.
  shoulders: (<>
    <path d="M9 2.5v3c-1.7.2-3.3.8-4.5 1.8C2.2 9.2 2 12.6 2.8 17L6 18l1-6.2 1.6 1h6.8l1.6-1 1 6.2 3.2-1c.8-4.4.6-7.8-1.7-9.7-1.2-1-2.8-1.6-4.5-1.8v-3" fill="#33485b" stroke="#8ca5b7" strokeWidth=".8" strokeLinejoin="round" />
    <path d="M6.9 6.5c-2.2.4-3.9 2-4 4.6 0 1.5.4 3 1.2 4.1l2.4-.7.5-3.2 1.4-2.7Zm10.2 0c2.2.4 3.9 2 4 4.6 0 1.5-.4 3-1.2 4.1l-2.4-.7-.5-3.2-1.4-2.7Z" fill={MUSCLE} />
    <path d="m8.4 7.5 3.6 1 3.6-1M12 8.5v2" fill="none" stroke="#9eb4c4" strokeWidth=".8" strokeLinecap="round" />
    <path d="M5.8 8.3c-1 .8-1.4 1.8-1.4 3.2m13.8-3.2c1 .8 1.4 1.8 1.4 3.2" fill="none" stroke={MUSCLE_LIGHT} strokeWidth=".9" strokeLinecap="round" />
  </>),
  sleep: (
    <>
      <path d="M20.8 14.4A9 9 0 1 1 9.6 3.2 7 7 0 0 0 20.8 14.4Z" fill="#FFD966" />
      <circle cx="7.4" cy="12.6" fill="#F0BE3F" r="1.5" />
      <circle cx="11.4" cy="17.2" fill="#F0BE3F" r="1.1" />
      <circle cx="12.2" cy="10.8" fill="#F0BE3F" r="0.9" />
    </>
  ),
  // Bust in silhouette (Joey's pick from a sheet of seven): round head, jaw
  // notch, a neck about half the head's width, traps flaring into shoulders,
  // all one outline. A short crop of hair over the crown gives the head a
  // front and a top, which is what kept the bare version from reading as a
  // person. A jawline separates head from neck; the accent is the neck alone.
  neck: (<><path d="M10 2c4-1 7 1.5 7 5l1 2-1.5 1-.3 2-2.2 1v3l5 4v2H4v-2l4-4 .5-5C6 8.5 6.5 3.5 10 2Z" fill="#33485b" stroke="#8ca5b7" strokeWidth=".8" strokeLinejoin="round"/><path d="m10 11 3 2-.5 4 4 3h-5L9 17Zm-1 3-.4 3-3 3h4l1-2Z" fill={MUSCLE}/><path d="m10.5 13 1.2 3.5" stroke={MUSCLE_LIGHT} strokeWidth=".8" strokeLinecap="round"/></>),
  // A dressing: where you are still carrying yesterday's session.
  soreness: (
    <g transform="rotate(-35 12 12)">
      <rect
        fill="#FFC38A"
        height="6.6"
        rx="3.3"
        stroke="#CF8B52"
        strokeWidth="0.85"
        width="18.8"
        x="2.6"
        y="8.7"
      />
      <rect fill="#FFEBD6" height="5.6" width="7.2" x="8.4" y="9.2" />
      <circle cx="10.4" cy="10.7" fill="#E0A272" r="0.68" />
      <circle cx="13.6" cy="10.7" fill="#E0A272" r="0.68" />
      <circle cx="10.4" cy="13.3" fill="#E0A272" r="0.68" />
      <circle cx="13.6" cy="13.3" fill="#E0A272" r="0.68" />
    </g>
  ),
  // A head under load — the only glyph in the set built on a head, so it never
  // collides with the bolt-like shapes elsewhere.
  stress: (
    <>
      <circle cx="12" cy="12.8" fill={SKIN} r="6.5" stroke={SKIN_LINE} strokeWidth="0.9" />
      <path d="M13.3 8 9.5 14h2.6l-.8 4.2 3.9-5.6h-2.4Z" fill="#FFD54A" />
      <path
        d="M12 2.6v2.4M6.2 4.6 7.9 6.4M17.8 4.6 16.1 6.4"
        fill="none"
        stroke="#F0ABFC"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </>
  ),
};

// The ring's own colour, reused as the glow behind the glyph. Tailwind v4
// publishes its palette as theme variables, so these stay in step with the
// gradient classes the rings already use.
const toneGlow: Record<BodyCommandGlyphTone, string> = {
  blue: "var(--color-sky-300)",
  cyan: "var(--color-cyan-300)",
  emerald: "var(--color-emerald-300)",
  gold: "var(--color-amber-300)",
  lime: "var(--color-lime-300)",
  purple: "var(--color-fuchsia-300)",
  rose: "var(--color-rose-300)",
  teal: "var(--color-teal-300)",
};

export default function BodyCommandGlyph({
  className,
  name,
  tone,
}: {
  className?: string;
  name: BodyCommandGlyphName;
  tone?: BodyCommandGlyphTone;
}) {
  const glow = tone ? toneGlow[tone] : null;

  return (
    <svg
      aria-hidden="true"
      className={className}
      style={
        glow
          ? {
              // Tone aura, then a contact shadow cast down onto the meter so
              // the glyph reads as floating in front of the ring.
              filter: `drop-shadow(0 0 3px ${glow}) drop-shadow(0 3px 3px rgba(2,6,23,0.55))`,
              overflow: "visible",
            }
          : { overflow: "visible" }
      }
      viewBox="0 0 24 24"
    >
      {glyphArt[name]}
    </svg>
  );
}

/**
 * One line of a ring's face that swaps between its text label and its glyph.
 *
 * The text sits in normal flow; the glyph is taken out of it, anchored to the
 * bottom of that line and drawn large enough to stand over the level meter and
 * break its rim at the top. Because it is out of flow, none of that changes
 * the ring's layout. Both layers share a single hidden pose — parked low,
 * shrunk and transparent — so the leaving layer sinks and fades while the
 * arriving one rises and pops, with a short delay that stops the two reads
 * overlapping.
 */
export function BodyCommandRingFace({
  children,
  capGlyph = false,
  glyph,
  glyphClassName = "h-4 w-4",
  caption,
  captionClassName = "",
  holdOutgoingGlyph = true,
  showGlyph,
  tone,
}: {
  children: ReactNode;
  /** Draw the glyph as a small raised cap above the label instead of replacing it. */
  capGlyph?: boolean;
  glyph: BodyCommandGlyphName;
  glyphClassName?: string;
  /** The ring's name, shown small under the glyph — a moon on its own could
   *  be Sleep or Recovery. Rises in with the glyph, in the label's slot. */
  caption?: string;
  captionClassName?: string;
  holdOutgoingGlyph?: boolean;
  showGlyph: boolean;
  tone?: BodyCommandGlyphTone;
}) {
  const swap =
    "transition-[opacity,translate,scale] duration-200 ease-out motion-reduce:transition-none";
  const shown = "translate-y-0 scale-100 opacity-100 delay-[80ms]";
  const hidden = "translate-y-[7px] scale-90 opacity-0";
  const textHidden = showGlyph && !capGlyph;
  const glyphLayerClassName = capGlyph
    ? "pointer-events-none absolute bottom-[calc(100%-0.55rem)] left-1/2 z-20 grid w-max -translate-x-1/2 place-items-center"
    : "pointer-events-none absolute bottom-0 left-1/2 grid w-max -translate-x-1/2 place-items-center";
  const halo: CSSProperties | undefined = tone
    ? {
        background: `radial-gradient(circle, ${toneGlow[tone]} 0%, transparent 68%)`,
        opacity: 0.32,
      }
    : undefined;

  // When the glyph changes while it is showing — stepping to the next ring in
  // the same slot — hold a ghost of the outgoing one for a single exit
  // animation. Without this the old icon vanishes in one frame while the new
  // label rises, which reads as a jump cut rather than a hand-off.
  const [ghost, setGhost] = useState<{
    caption?: string;
    glyph: BodyCommandGlyphName;
    tone?: BodyCommandGlyphTone;
  } | null>(null);
  // The ghost is captured DURING render, not in an effect: an effect runs
  // after the first paint, so there would be one painted frame with no icon
  // before the ghost appeared. Capturing here puts the outgoing face in the
  // same commit as the change. The refs hold the previous commit's values.
  const [seenGlyph, setSeenGlyph] = useState(glyph);
  const lastFaceRef = useRef({ caption, showGlyph, tone });
  if (glyph !== seenGlyph) {
    const last = lastFaceRef.current;
    if (holdOutgoingGlyph && last.showGlyph) {
      setGhost({ caption: last.caption, glyph: seenGlyph, tone: last.tone });
    }
    setSeenGlyph(glyph);
  }
  useEffect(() => {
    lastFaceRef.current = { caption, showGlyph, tone };
  });
  useEffect(() => {
    if (!ghost) return;
    const timer = window.setTimeout(() => setGhost(null), 260);
    return () => window.clearTimeout(timer);
  }, [ghost]);
  const ghostHalo: CSSProperties | undefined = ghost?.tone
    ? {
        background: `radial-gradient(circle, ${toneGlow[ghost.tone]} 0%, transparent 68%)`,
        opacity: 0.32,
      }
    : undefined;

  return (
    <span className="relative grid w-full justify-items-center">
      <span
        aria-hidden={textHidden ? "true" : undefined}
        className={`${swap} col-start-1 row-start-1 flex w-full flex-col items-center ${capGlyph ? "relative z-30" : ""} ${textHidden ? hidden : shown}`}
      >
        {children}
      </span>
      {ghost ? (
        <span
          aria-hidden="true"
          className={`sf-ring-face-ghost ${glyphLayerClassName}`}
        >
          {ghostHalo ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-[-22%] rounded-full"
              style={ghostHalo}
            />
          ) : null}
          <BodyCommandGlyph
            className={`relative ${glyphClassName}`}
            name={ghost.glyph}
            tone={ghost.tone}
          />
          {ghost.caption && !capGlyph ? (
            <span
              className={`relative mt-0.5 max-w-[66px] text-center text-[7px] font-black uppercase leading-[1.05] tracking-[0.04em] ${captionClassName}`}
            >
              {ghost.caption}
            </span>
          ) : null}
        </span>
      ) : null}
      {/* Keyed by glyph: when a slot's content changes (category step in
          the trio/compact layouts) the incoming glyph must MOUNT in the
          hidden pose. Reusing the node made it inherit the outgoing glyph's
          raised pose and transition down next to the ghost — two icons
          sinking — before rising again after the settle beat. */}
      <span
        className={`${swap} ${glyphLayerClassName} ${showGlyph ? shown : hidden}`}
        key={glyph}
      >
        {halo ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[-22%] rounded-full"
            style={halo}
          />
        ) : null}
        <BodyCommandGlyph
          className={`relative ${glyphClassName}`}
          name={glyph}
          tone={tone}
        />
        {caption && !capGlyph ? (
          <span
            className={`relative mt-0.5 max-w-[66px] text-center text-[7px] font-black uppercase leading-[1.05] tracking-[0.04em] ${captionClassName}`}
          >
            {caption}
          </span>
        ) : null}
      </span>
    </span>
  );
}
