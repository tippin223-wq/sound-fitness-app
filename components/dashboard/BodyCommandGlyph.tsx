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
 * the anatomy: moon, head, battery, plaster, stretching figure, trunk, apple.
 * At ring size the outline is the whole message, so two signals that resolve to
 * similar blobs would be indistinguishable however different their detail.
 */
export type BodyCommandGlyphName =
  | "arms"
  | "back"
  | "chest"
  | "core"
  | "fatigue"
  | "fuel"
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
const MUSCLE = "#FF6F45";
const MUSCLE_LIGHT = "#FFA277";
const HAIR = "#6E4428";

// Neck, sloping traps, both arms hanging past an armpit notch, and a trunk
// tapering to the waist — one closed path.
const FIGURE =
  "M10.7 2.8H13.3V5C14.9 5.2 16 5.5 16.8 6.2C18.4 7 19.6 7.6 19.6 9.4V15.4C19.6 16.7 18.9 17.6 17.9 17.6C16.9 17.6 16.3 16.7 16.3 15.4V10.6C15.9 10.2 15.6 10 15.2 9.8C15.6 13.4 15.4 17.2 14.9 20C14.8 20.7 14.2 21.2 13.5 21.2H10.5C9.8 21.2 9.2 20.7 9.1 20C8.6 17.2 8.4 13.4 8.8 9.8C8.4 10 8.1 10.2 7.7 10.6V15.4C7.7 16.7 7.1 17.6 6.1 17.6C5.1 17.6 4.4 16.7 4.4 15.4V9.4C4.4 7.6 5.6 7 7.2 6.2C8 5.5 9.1 5.2 10.7 5Z";

const figure = (
  <path d={FIGURE} fill={SKIN} stroke={SKIN_LINE} strokeWidth="0.85" />
);

// One ab block. Four rows of two, tapering in as they descend, seated below
// the pec line rather than up against it.
const abBlock = (x: number, y: number, w: number) => (
  <rect fill={MUSCLE} height="1.8" key={`${x}-${y}`} rx="0.8" width={w} x={x} y={y} />
);

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

const ARM_TUBE = "M5.2 18.4H15.6L17.2 7.8";
// A leg from the side, drawn as one closed outline rather than stroked
// segments — tubes with round joins always read as a sausage. Clockwise from
// the hip: front of the thigh, kneecap, shin, over the foot to the toe, back
// along the sole, up the heel and achilles, out over the calf, into the back
// of the knee, and up the hamstring.
const LEG =
  "M8.4 2.6C10.4 1.6 12.8 1.6 14.8 2.6C15.6 5.4 15.4 8.4 15 11.2C15.9 11.9 15.8 13.1 15.2 13.7C14.6 15.3 13.9 16.9 13.5 18.4L19.6 20.1C20.5 20.4 20.6 21.4 19.9 21.8H9.4C8.5 21.8 8.1 21.1 8.4 20.3L9 18.6C7.4 17 6.8 14.4 8.2 12.6C8.8 11.8 9.4 11.4 9.7 10.9C8 8.4 7.4 5.6 8.4 2.6Z";
// Rear double-biceps. Each arm is one shaped contour, not a stroked skeleton
// with circles on it: out along the triceps to the point of the elbow, up the
// outer forearm, over the fist, down the inner forearm into the crook, then up
// and over the bicep peak to the shoulder. The closing edge sits under the
// trunk, which is drawn afterwards.
const BACK_ARM_RIGHT =
  "M15.4 9.9C17.4 10.3 19.6 10.3 21.6 10C22.3 9.8 22.5 9 22.2 8.3C21.9 6.8 21.7 5.2 21.5 3.6C21.4 2 20.6 1.2 19.7 1.1C18.8 1.1 18.1 1.8 18.1 2.9C18.1 4.2 18.4 5.5 18.8 6.7C18.3 5.4 17.7 4.5 16.8 4.6C15.8 4.7 15.1 5.6 14.9 6.9Z";
const BACK_ARM_LEFT =
  "M8.6 9.9C6.6 10.3 4.4 10.3 2.4 10C1.7 9.8 1.5 9 1.8 8.3C2.1 6.8 2.3 5.2 2.5 3.6C2.6 2 3.4 1.2 4.3 1.1C5.2 1.1 5.9 1.8 5.9 2.9C5.9 4.2 5.6 5.5 5.2 6.7C5.7 5.4 6.3 4.5 7.2 4.6C8.2 4.7 8.9 5.6 9.1 6.9Z";
const BACK_TORSO =
  "M12 5.4C13.7 5.4 15.3 5.9 16.4 6.8C17.2 7.4 17.5 8.4 17.3 9.4L15.9 18.6C15.7 20 14.6 21 13.3 21.2C12.4 21.3 11.6 21.3 10.7 21.2C9.4 21 8.3 20 8.1 18.6L6.7 9.4C6.5 8.4 6.8 7.4 7.6 6.8C8.7 5.9 10.3 5.4 12 5.4Z";
const STRETCH_SPINE = "M12 7.4V14.4";
const STRETCH_ARMS = "M12 8.8L7.2 4.8M12 8.8L16.8 4.8";
const STRETCH_LEGS = "M12 14.2L9.4 20.4M12 14.2L14.6 20.4";

const glyphArt: Record<BodyCommandGlyphName, ReactNode> = {
  // Flexed bicep: upper arm, forearm and fist merged into one contour, with
  // the bicep swelling above the arm's own line.
  arms: (
    <>
      {limb(ARM_TUBE, 5.2, true)}
      <circle cx="10.2" cy="16.2" fill={SKIN_LINE} r="4.55" />
      <circle cx="17.6" cy="6" fill={SKIN_LINE} r="3.95" />
      {limb(ARM_TUBE, 5.2, false)}
      <circle cx="10.2" cy="16.2" fill={SKIN} r="4" />
      <circle cx="17.6" cy="6" fill={SKIN} r="3.4" />
      <path
        d="M6.8 20C8.6 20.7 11.5 20.5 13.5 19.3"
        fill="none"
        stroke={SKIN_SHADE}
        strokeLinecap="round"
        strokeWidth="0.9"
      />
      <path
        d="M15.1 8.9C15.9 9.3 16.9 9.4 17.9 9.2"
        fill="none"
        stroke={SKIN_SHADE}
        strokeLinecap="round"
        strokeWidth="0.9"
      />
      <path
        d="M16 3.9v1.9M17.7 3.6v2M19.3 4.2v1.8"
        fill="none"
        stroke={SKIN_SHADE}
        strokeLinecap="round"
        strokeWidth="0.85"
      />
    </>
  ),
  // Rear double-biceps. Arms and head go down first so the trunk's own outline
  // lands on top as the shoulder seam; lats spread from the armpits to the
  // waist. It gets a head because a pose without one reads as decapitated
  // between two raised fists.
  back: (
    <>
      <path d={BACK_ARM_LEFT} fill={SKIN} stroke={SKIN_LINE} strokeWidth="0.85" />
      <path d={BACK_ARM_RIGHT} fill={SKIN} stroke={SKIN_LINE} strokeWidth="0.85" />
      <circle cx="12" cy="3.2" fill={SKIN} r="2.3" stroke={SKIN_LINE} strokeWidth="0.85" />
      <path d={BACK_TORSO} fill={SKIN} stroke={SKIN_LINE} strokeWidth="0.85" />
      <path
        d="M11.5 8.4C10.1 7.6 8.6 7.8 7.7 8.6C7.9 12.4 9 15.6 10.9 18.2C11.4 15.2 11.7 11.8 11.5 8.4Z"
        fill={MUSCLE}
      />
      <path
        d="M12.5 8.4C13.9 7.6 15.4 7.8 16.3 8.6C16.1 12.4 15 15.6 13.1 18.2C12.6 15.2 12.3 11.8 12.5 8.4Z"
        fill={MUSCLE}
      />
      <path
        d="M12 6.6v13"
        fill="none"
        stroke={SKIN_SHADE}
        strokeLinecap="round"
        strokeWidth="1.1"
      />
    </>
  ),
  // Two pec slabs under the collarbone, with a sternum gap.
  chest: (
    <>
      {figure}
      <path
        d="M11.8 7.4C10.6 6.7 9.1 6.9 8.6 8.1C8.2 9.2 8.8 10.6 10.2 11.1C11.2 11.4 11.8 10.9 11.8 10Z"
        fill={MUSCLE}
      />
      <path
        d="M12.2 7.4C13.4 6.7 14.9 6.9 15.4 8.1C15.8 9.2 15.2 10.6 13.8 11.1C12.8 11.4 12.2 10.9 12.2 10Z"
        fill={MUSCLE}
      />
      <path
        d="M9.4 8.4C10.1 8 11 8 11.6 8.4"
        fill="none"
        stroke={MUSCLE_LIGHT}
        strokeLinecap="round"
        strokeWidth="1"
      />
    </>
  ),
  // Eight blocks running from below the pecs down to the waist. Gaps of skin
  // define them far better than lines scored across one slab.
  core: (
    <>
      {figure}
      {abBlock(9.8, 11.8, 2)}
      {abBlock(12.2, 11.8, 2)}
      {abBlock(9.9, 13.9, 1.9)}
      {abBlock(12.2, 13.9, 1.9)}
      {abBlock(10, 16, 1.8)}
      {abBlock(12.2, 16, 1.8)}
      {abBlock(10.2, 18.1, 1.6)}
      {abBlock(12.2, 18.1, 1.6)}
    </>
  ),
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
  // One leg from the side, a single closed outline. No creases: at this size
  // they read as wrinkles, not anatomy — the knee, calf and heel are all in
  // the contour itself.
  legs: (
    <>
      <path d={LEG} fill={SKIN} stroke={SKIN_LINE} strokeWidth="0.85" />
    </>
  ),
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
  shoulders: (
    <>
      {figure}
      <path
        d="M15.9 8.6C16 7.1 16.9 6.1 18.1 5.9C19.1 6.3 19.6 7.4 19.5 8.7C19.3 9.7 18.4 10.3 17.4 10.2C16.5 10.1 15.9 9.5 15.9 8.6Z"
        fill={MUSCLE}
      />
      <path
        d="M8.1 8.6C8 7.1 7.1 6.1 5.9 5.9C4.9 6.3 4.4 7.4 4.5 8.7C4.7 9.7 5.6 10.3 6.6 10.2C7.5 10.1 8.1 9.5 8.1 8.6Z"
        fill={MUSCLE}
      />
      <path
        d="M17.2 8C17.5 7.3 17.9 6.9 18.4 6.7M6.8 8C6.5 7.3 6.1 6.9 5.6 6.7"
        fill="none"
        stroke={MUSCLE_LIGHT}
        strokeLinecap="round"
        strokeWidth="1"
      />
    </>
  ),
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
  neck: (
    <>
      <path
        d="M12 2.2C15.1 2.2 17.2 4.5 17.2 7.6C17.2 9.9 16.1 11.7 14.6 12.4C14.5 13.2 14.5 13.9 14.7 14.6C17 15.4 19.6 16.6 21 19C21.5 19.9 21.5 21.2 21.2 22.2H2.8C2.5 21.2 2.5 19.9 3 19C4.4 16.6 7 15.4 9.3 14.6C9.5 13.9 9.5 13.2 9.4 12.4C7.9 11.7 6.8 9.9 6.8 7.6C6.8 4.5 8.9 2.2 12 2.2Z"
        fill={SKIN}
        stroke={SKIN_LINE}
        strokeLinejoin="round"
        strokeWidth="0.85"
      />
      <path
        d="M6.9 7.4C6.9 4.2 9 2.1 12 2.1C15 2.1 17.1 4.2 17.1 7.4C16.2 6.6 15 6.3 14 6.8C13.2 6.2 10.8 6.2 10 6.8C9 6.3 7.8 6.6 6.9 7.4Z"
        fill={HAIR}
      />
      <path
        d="M9.6 12.9C10.7 13.4 13.3 13.4 14.4 12.9C14.5 13.7 14.6 14.4 14.8 14.9C13 15.6 11 15.6 9.2 14.9C9.4 14.4 9.5 13.7 9.6 12.9Z"
        fill={MUSCLE}
      />
      <path
        d="M9.3 12.4C10.8 13.5 13.2 13.5 14.7 12.4"
        fill="none"
        stroke={SKIN_SHADE}
        strokeLinecap="round"
        strokeWidth="0.9"
      />
    </>
  ),
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
            }
          : undefined
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
  glyph,
  glyphClassName = "h-4 w-4",
  caption,
  captionClassName = "",
  showGlyph,
  tone,
}: {
  children: ReactNode;
  glyph: BodyCommandGlyphName;
  glyphClassName?: string;
  /** The ring's name, shown small under the glyph — a moon on its own could
   *  be Sleep or Recovery. Rises in with the glyph, in the label's slot. */
  caption?: string;
  captionClassName?: string;
  showGlyph: boolean;
  tone?: BodyCommandGlyphTone;
}) {
  const swap =
    "transition-[opacity,translate,scale] duration-200 ease-out motion-reduce:transition-none";
  const shown = "translate-y-0 scale-100 opacity-100 delay-[80ms]";
  const hidden = "translate-y-[7px] scale-90 opacity-0";
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
    if (last.showGlyph) {
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
        aria-hidden={showGlyph ? "true" : undefined}
        className={`${swap} col-start-1 row-start-1 flex w-full flex-col items-center ${showGlyph ? hidden : shown}`}
      >
        {children}
      </span>
      {ghost ? (
        <span
          aria-hidden="true"
          className="sf-ring-face-ghost pointer-events-none absolute bottom-0 left-1/2 grid -translate-x-1/2 place-items-center"
        >
          {ghostHalo ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-[-26%] rounded-full"
              style={ghostHalo}
            />
          ) : null}
          <BodyCommandGlyph
            className={`relative ${glyphClassName}`}
            name={ghost.glyph}
            tone={ghost.tone}
          />
          {ghost.caption ? (
            <span
              className={`relative mt-0.5 max-w-[66px] text-center text-[7px] font-black uppercase leading-[1.05] tracking-[0.04em] ${captionClassName}`}
            >
              {ghost.caption}
            </span>
          ) : null}
        </span>
      ) : null}
      <span
        className={`${swap} pointer-events-none absolute bottom-0 left-1/2 grid -translate-x-1/2 place-items-center ${showGlyph ? shown : hidden}`}
      >
        {halo ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[-26%] rounded-full"
            style={halo}
          />
        ) : null}
        <BodyCommandGlyph
          className={`relative ${glyphClassName}`}
          name={glyph}
          tone={tone}
        />
        {caption ? (
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
