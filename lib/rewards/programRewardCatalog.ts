/** Authored designs, not inventory grants. Each needs its own reviewed wearable
 * or background asset before a track can be published to members. */
export type ProgramCosmeticKind = "shirt" | "glasses" | "necklace" | "headwear" | "calendar-background" | "avatar-background";
export type ProgramCosmetic = {
  id: string;
  name: string;
  kind: ProgramCosmeticKind;
  design: string;
  assetStatus: "design";
};

const designs: Array<[ProgramCosmeticKind, string, string, string]> = [
  ["shirt", "echo-contour", "Echo Contour Tee", "Three offset contour waves wrap from the left shoulder to the opposite hem; small chest crest."],
  ["glasses", "apex-brow", "Apex Brow Glasses", "Straight metal brow bar, rounded rectangular lenses, and open lower rims."],
  ["necklace", "pulse-disc", "Pulse Disc Necklace", "Round brushed disc with a recessed heartbeat groove on a fine curb chain."],
  ["headwear", "split-panel", "Split Panel Cap", "Five-panel crown, contrast center seam, woven side label, and rounded bill."],
  ["calendar-background", "tidal-paper", "Tidal Paper Calendar", "Layered paper-cut coastline with broad quiet areas behind date cells."],
  ["avatar-background", "sunrise-pier", "Sunrise Pier Stage", "Timber pier, distant sailboats, low sunrise, and a circular inset standing platform."],
  ["shirt", "ridge-topography", "Ridge Topography Tee", "A topographic mountain panel crosses the lower torso beneath a centered wordmark."],
  ["glasses", "orbit-round", "Orbit Round Glasses", "Circular wire frames with a doubled bridge and small engraved end pieces."],
  ["necklace", "compass-four", "Four Point Compass", "Open four-point compass pendant with a free center and a rope chain."],
  ["headwear", "trail-bucket", "Trail Bucket Hat", "Downward stitched brim, vent eyelets, and a short woven crest patch."],
  ["calendar-background", "alpine-window", "Alpine Window Calendar", "Layered snowy ridgelines framed by a cabin window with clear glass behind dates."],
  ["avatar-background", "rooftop-court", "Rooftop Court Stage", "Urban roof court, mesh perimeter, warm city lights, and painted floor markings."],
  ["shirt", "rhythm-bars", "Rhythm Bars Tee", "Stepped equalizer bars form a diagonal chest panel with a small offset Sound title."],
  ["glasses", "prism-hex", "Prism Hex Glasses", "Six-sided lenses, slim beveled rims, and straight architectural temples."],
  ["necklace", "sound-fork", "Sound Fork Pendant", "Sculpted tuning-fork pendant with a joined bail on a flat box chain."],
  ["headwear", "court-visor", "Court Visor", "Open crown sports visor with a broad fabric sweatband and stitched curved bill."],
  ["calendar-background", "botanical-press", "Botanical Press Calendar", "Pressed fern silhouettes around parchment edges and an uncluttered center."],
  ["avatar-background", "bamboo-courtyard", "Bamboo Courtyard Stage", "Stone courtyard, bamboo screen, shallow water channel, and a raised stepping stone."],
  ["shirt", "crest-blueprint", "Crest Blueprint Tee", "Large crest construction drawing with measured arcs and drafting ticks."],
  ["glasses", "stride-wrap", "Stride Wrap Shades", "Continuous curved sports lens with separate vented arms and a low nose bridge."],
  ["necklace", "mountain-open", "Open Ridge Pendant", "Hollow triangular mountain silhouette suspended from two upper corners on a cable chain."],
  ["headwear", "ribbed-watch", "Ribbed Watch Beanie", "Rib-knit crown, folded cuff, and a small rectangular woven badge."],
  ["calendar-background", "observatory-grid", "Observatory Calendar", "Star-chart border, fine constellation lines, and a dark matte date field."],
  ["avatar-background", "orbital-observatory", "Orbital Observatory Stage", "Curved observation window, slow planetary horizon, and an illuminated metal dais."],
  ["shirt", "kinetic-sash", "Kinetic Sash Tee", "Interlocking ribbon sash over one shoulder with negative-space motion chevrons."],
  ["glasses", "harbor-aviator", "Harbor Aviators", "Teardrop lenses, double bridge, and textured metal temple tips."],
  ["necklace", "echo-rings", "Echo Rings Necklace", "Three nested offset rings hung from a single rear bail on a wheat chain."],
  ["headwear", "runner-six", "Runner Six Cap", "Low six-panel crown, perforated side panels, short bill, and reflective piping."],
  ["calendar-background", "desert-arch", "Desert Arch Calendar", "Sandstone arches along the edges with long dusk shadows beneath the date grid."],
  ["avatar-background", "canyon-bridge", "Canyon Bridge Stage", "Suspended footbridge between sandstone walls with a broad safe standing landing."],
  ["shirt", "night-circuit", "Night Circuit Tee", "Printed circuit traces join small crest nodes across the back and one chest pocket shape."],
  ["glasses", "studio-cat-eye", "Studio Cat Eye Glasses", "Swept upper corners, gently rounded lower rims, and inset temple plates."],
  ["necklace", "crest-medallion", "Laurel Crest Medallion", "Raised Sound crest within a scalloped laurel medallion on a rounded Figaro chain."],
  ["headwear", "heritage-flat", "Heritage Flat Cap", "Soft wedge crown with a sewn-down short peak and side panel seams."],
  ["calendar-background", "rain-glass", "Rain Glass Calendar", "Rain beads and blurred garden bokeh around a clear central frosted pane."],
  ["avatar-background", "rain-garden", "Rain Garden Stage", "Covered garden terrace, visible rainfall beyond the roof, and a dry slate platform."],
  ["shirt", "laurel-loop", "Laurel Loop Tee", "An asymmetric open laurel surrounds the Sound title with a small embroidered-style sleeve mark."],
  ["glasses", "chroma-square", "Chroma Square Frames", "Chunky translucent square rims with chamfered corners and broad tapered arms."],
  ["necklace", "tide-bar", "Tide Bar Necklace", "Horizontal curved bar engraved with tidal lines, attached at both ends to a belcher chain."],
  ["headwear", "knotted-band", "Knotted Training Band", "Narrow fabric band with a small rear knot, short tails, and a front stitch motif."],
  ["calendar-background", "ink-garden", "Ink Garden Calendar", "Brush-painted bamboo and river stones at the corners on textured rice paper."],
  ["avatar-background", "sculpture-hall", "Sculpture Hall Stage", "Tall gallery arches, abstract stone sculptures, and a polished round floor inset."],
  ["shirt", "horizon-block", "Horizon Block Tee", "Wide horizon bands interrupted by a cutout sun and a compact vertical Sound wordmark."],
  ["glasses", "bridge-rimless", "Bridge Rimless Glasses", "Rimless oval lenses joined by a sculpted saddle bridge with exposed screw details."],
  ["necklace", "lightning-cut", "Lightning Cut Pendant", "Solid beveled lightning silhouette with a recessed center channel on a snake chain."],
  ["headwear", "crest-beret", "Crest Beret", "Soft circular crown, fitted lower band, and a side-mounted enamel crest pin."],
  ["calendar-background", "copper-workshop", "Copper Workshop Calendar", "Brushed copper margins, restrained rivet details, and a dark drafting-board center."],
  ["avatar-background", "neon-arcade", "Neon Arcade Stage", "Retro arcade alcove with geometric light strips and a checker floor podium."],
  ["shirt", "wave-pocket", "Wave Pocket Tee", "An illustrated breaking wave emerges from a printed chest-pocket outline; small back-neck title."],
  ["glasses", "summit-shield", "Summit Shield Shades", "Broad shield lens with a pronounced upper ridge and floating side vents."],
  ["necklace", "orbit-cage", "Orbit Cage Pendant", "A small sphere enclosed by two crossing metal hoops on a twisted rope chain."],
  ["headwear", "mesh-trucker", "Mesh Crest Trucker", "Structured front panels, open rear mesh, stitched patch, and snap closure."],
  ["calendar-background", "aurora-drift", "Aurora Drift Calendar", "Soft aurora ribbons across the upper border over a low arctic horizon."],
  ["avatar-background", "glacier-dome", "Glacier Dome Stage", "Glass geodesic shelter overlooking blue ice with a warm timber standing disk."],
  ["shirt", "motion-mosaic", "Motion Mosaic Tee", "Angular mosaic panels assemble into an abstract running figure with a clear centered crest."],
  ["glasses", "tempo-octagon", "Tempo Octagon Glasses", "Eight-sided thin rims with a stepped bridge and alternating brushed edges."],
  ["necklace", "finish-ribbon", "Finish Ribbon Pendant", "Folded ribbon-shaped metal pendant with an inset crest on a flat mariner chain."],
  ["headwear", "quilted-ear", "Quilted Winter Cap", "Quilted short-bill crown with fold-up ear flaps and a small front crest label."],
  ["calendar-background", "prism-studio", "Prism Studio Calendar", "Translucent geometric prisms around a clean ivory date surface with soft refracted shadows."],
  ["avatar-background", "floating-sanctuary", "Floating Sanctuary Stage", "Suspended circular garden, trailing plants, open sky, and a stone center dais."],
];

export const PROGRAM_COSMETICS: readonly Readonly<ProgramCosmetic>[] = Object.freeze(designs.map(([kind, id, name, design]) => Object.freeze({
  id: `program-cosmetic:${id}`, name, kind, design, assetStatus: "design" as const,
})));

/** Ordinary levels use fixed amounts. Emeralds are deliberately absent from
 * the common pool: they redeem real services and need a separate award policy. */
export const PROGRAM_COMMON_REWARDS = Object.freeze([
  Object.freeze({ asset: "coins", amount: 50, weight: 60 }),
  Object.freeze({ asset: "bolts", amount: 5, weight: 20 }),
  Object.freeze({ asset: "sapphire", amount: 1, weight: 10 }),
  Object.freeze({ asset: "topaz", amount: 1, weight: 7 }),
  Object.freeze({ asset: "ruby", amount: 1, weight: 3 }),
] as const);
