"use client";

import LibraryPageShell, {
  type LibraryItem,
} from "@/components/dashboard/library/LibraryPageShell";

const categories = [
  "Neck",
  "Shoulders",
  "Thoracic",
  "Hips",
  "Ankles",
  "Wrists",
  "Spine",
  "Full Body Flows",
];

const mobilityItems: LibraryItem[] = [
  {
    id: "neck-cars",
    title: "Neck CARs",
    category: "Neck",
    description: "Controlled neck circles for cervical awareness and gentle range exposure.",
    stats: [
      { label: "Joint", value: "Neck" },
      { label: "Direction", value: "Global" },
      { label: "Duration", value: "3 min" },
      { label: "Level", value: "Easy" },
    ],
    tags: ["Warm-up", "Desk Reset", "Low Load", "Recovery"],
    details: ["Move slowly", "Stay below pain", "Use small ranges first"],
    recommendation: "Good first option when neck/traps feel stiff.",
  },
  {
    id: "shoulder-wall-slide",
    title: "Shoulder Wall Slide",
    category: "Shoulders",
    description: "Shoulder flexion and upward rotation prep for pressing and overhead work.",
    stats: [
      { label: "Joint", value: "Shoulder" },
      { label: "Direction", value: "Flexion" },
      { label: "Duration", value: "5 min" },
      { label: "Level", value: "Easy" },
    ],
    tags: ["Warm-up", "Shoulders", "Pressing", "Mobility"],
    details: ["Ribs down", "Slide without shrugging", "Pair with breathing if tight"],
  },
  {
    id: "open-book",
    title: "Open Book Rotation",
    category: "Thoracic",
    description: "Thoracic rotation drill for upper-back range and rotational comfort.",
    stats: [
      { label: "Joint", value: "T-Spine" },
      { label: "Direction", value: "Rotation" },
      { label: "Duration", value: "5 min" },
      { label: "Level", value: "Easy" },
    ],
    tags: ["Warm-up", "Cooldown", "Rotation", "Spine"],
    details: ["Keep hips stacked", "Exhale into the open position", "Move gently"],
    recommendation: "Useful before rows, presses, throws, or rotation patterns.",
  },
  {
    id: "ankle-dorsiflexion-rock",
    title: "Ankle Dorsiflexion Rock",
    category: "Ankles",
    description: "Ankle range drill for squats, lunges, step-ups, and running mechanics.",
    stats: [
      { label: "Joint", value: "Ankle" },
      { label: "Direction", value: "Dorsiflexion" },
      { label: "Duration", value: "4 min" },
      { label: "Level", value: "Easy" },
    ],
    tags: ["Warm-up", "Lower Body", "Squat", "Ankle"],
    details: ["Heel stays down", "Knee tracks over toes", "Use controlled pressure"],
  },
  {
    id: "worlds-greatest-stretch",
    title: "World's Greatest Stretch",
    category: "Full Body Flows",
    description: "Full-body flow for hips, hamstrings, thoracic rotation, and session prep.",
    stats: [
      { label: "Joint", value: "Full body" },
      { label: "Direction", value: "Mixed" },
      { label: "Duration", value: "8 min" },
      { label: "Level", value: "Moderate" },
    ],
    tags: ["Warm-up", "Full Body", "Hips", "Thoracic"],
    details: ["Lunge position", "Elbow reach", "Rotate toward front leg"],
  },
];

export default function MobilityLibraryPage() {
  return (
    <LibraryPageShell
      actionLabel="Add to Warm-Up / Cooldown"
      categories={categories}
      heroEyebrow="Mobility Library"
      heroMetrics={[
        { label: "Items", value: String(mobilityItems.length), helper: "Joint-specific prep" },
        { label: "Best Use", value: "Before / After", helper: "Warm-up or cooldown" },
        { label: "Intensity", value: "Low", helper: "Movement quality first" },
        { label: "Storage", value: "Local", helper: "Saved to soundFitnessMobilityLibrary" },
      ]}
      items={mobilityItems}
      libraryId="mobility"
      planStorageKey="soundFitnessRecoveryPlan"
      storageKey="soundFitnessMobilityLibrary"
      subtitle="Joint-specific mobility and movement prep for better training positions."
      title="🧘 Mobility Library"
    />
  );
}
