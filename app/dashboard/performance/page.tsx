"use client";

import LibraryPageShell, {
  type LibraryItem,
} from "@/components/dashboard/library/LibraryPageShell";

const categories = [
  "Power",
  "Plyometrics",
  "Sprinting",
  "Agility",
  "Carries",
  "Throws",
  "Conditioning",
  "Core Power",
  "Sport Prep",
];

const performanceItems: LibraryItem[] = [
  {
    id: "med-ball-rotational-throw",
    title: "Med Ball Rotational Throw",
    category: "Throws",
    description: "Rotational power drill for hips, trunk, and athletic sequencing.",
    stats: [
      { label: "Quality", value: "Power" },
      { label: "Intensity", value: "High" },
      { label: "Duration", value: "8 min" },
      { label: "Equipment", value: "Med ball" },
    ],
    tags: ["Core Power", "Sport Prep", "Rotation", "Explosive"],
    details: ["Keep reps crisp", "Stop before speed drops", "Pair with lower-volume strength"],
    recommendation: "Use when readiness is good and the goal is athletic output.",
  },
  {
    id: "farmer-carry",
    title: "Farmer Carry",
    category: "Carries",
    description: "Full-body trunk, grip, and gait challenge that fits strength or conditioning days.",
    stats: [
      { label: "Quality", value: "Capacity" },
      { label: "Intensity", value: "Medium" },
      { label: "Duration", value: "6-10 min" },
      { label: "Equipment", value: "DB / KB" },
    ],
    tags: ["Grip", "Core", "Conditioning", "Strength"],
    details: ["Tall posture", "Controlled steps", "Load only as heavy as position allows"],
  },
  {
    id: "box-jump",
    title: "Box Jump",
    category: "Plyometrics",
    description: "Low-rep power expression for lower-body explosiveness.",
    stats: [
      { label: "Quality", value: "Power" },
      { label: "Intensity", value: "High" },
      { label: "Duration", value: "5 min" },
      { label: "Equipment", value: "Box" },
    ],
    tags: ["Power", "Jumps", "Lower Body", "Readiness Required"],
    details: ["Land quietly", "Step down", "Avoid fatigue chasing"],
    recommendation: "Best before heavy lower body if joints feel ready.",
  },
  {
    id: "tempo-run-intervals",
    title: "Tempo Run Intervals",
    category: "Conditioning",
    description: "Moderate conditioning session for aerobic support without max sprint stress.",
    stats: [
      { label: "Quality", value: "Engine" },
      { label: "Intensity", value: "Medium" },
      { label: "Duration", value: "20 min" },
      { label: "Equipment", value: "Open space" },
    ],
    tags: ["Conditioning", "Running", "Fat Loss", "Performance"],
    details: ["Stay smooth", "Use walk-back recovery", "Keep last rep as clean as first"],
  },
  {
    id: "lateral-shuffle-cut",
    title: "Lateral Shuffle + Cut",
    category: "Agility",
    description: "Change-of-direction practice for lateral control and deceleration quality.",
    stats: [
      { label: "Quality", value: "Agility" },
      { label: "Intensity", value: "Medium" },
      { label: "Duration", value: "8 min" },
      { label: "Equipment", value: "Cones" },
    ],
    tags: ["Sport Prep", "Agility", "Deceleration", "Athletic"],
    details: ["Own the stop", "Keep knees tracking", "Use quality over volume"],
  },
];

export default function PerformanceLibraryPage() {
  return (
    <LibraryPageShell
      actionLabel="Add to Workout Builder"
      categories={categories}
      heroEyebrow="Performance Library"
      heroMetrics={[
        { label: "Items", value: String(performanceItems.length), helper: "Power and athlete tools" },
        { label: "Readiness", value: "Required", helper: "Quality drops when fatigued" },
        { label: "Plan Fit", value: "Athletic", helper: "Feeds Builder and phases" },
        { label: "Storage", value: "Local", helper: "Saved to soundFitnessPerformanceLibrary" },
      ]}
      items={performanceItems}
      libraryId="performance"
      planStorageKey="soundFitnessPerformancePlan"
      storageKey="soundFitnessPerformanceLibrary"
      subtitle="Athletic development for speed, power, conditioning, agility, carries, and throws."
      title="⚡ Performance Library"
    />
  );
}
