"use client";

import LibraryPageShell, {
  type LibraryItem,
} from "@/components/dashboard/library/LibraryPageShell";

const categories = [
  "Mobility",
  "Stretching",
  "Activation",
  "Breathing",
  "Walking / Zone 2",
  "Soft Tissue",
  "Pain-Aware Alternatives",
  "Warm-Ups",
  "Cooldowns",
];

const recoveryItems: LibraryItem[] = [
  {
    id: "hips-t-spine-reset",
    title: "Hips + T-Spine Reset",
    category: "Mobility",
    description: "A compact flow for lower-body soreness, desk stiffness, and better session prep.",
    stats: [
      { label: "Area", value: "Hips / Spine" },
      { label: "Duration", value: "12 min" },
      { label: "Intensity", value: "Low" },
      { label: "Best Time", value: "Before lift" },
    ],
    tags: ["Warm-Ups", "Cooldowns", "Low fatigue", "Recovery"],
    details: ["90/90 switches", "Open books", "Hip flexor reach-back"],
    recommendation: "Use this when lower body is running hot but you still want useful movement.",
  },
  {
    id: "breathing-downshift",
    title: "Breathing Downshift",
    category: "Breathing",
    description: "Short parasympathetic reset for high-stress days or post-session cooldowns.",
    stats: [
      { label: "Area", value: "Nervous system" },
      { label: "Duration", value: "5 min" },
      { label: "Intensity", value: "Very low" },
      { label: "Best Time", value: "Evening" },
    ],
    tags: ["Cooldowns", "Stress", "Sleep", "Recovery"],
    details: ["Long exhale breathing", "Low-light setup", "Nasal breathing if comfortable"],
    recommendation: "Good choice when readiness is limited by stress or sleep.",
  },
  {
    id: "shoulder-activation",
    title: "Shoulder Activation Primer",
    category: "Activation",
    description: "Low-load shoulder prep for pressing, pulling, and posture-heavy days.",
    stats: [
      { label: "Area", value: "Shoulders" },
      { label: "Duration", value: "8 min" },
      { label: "Intensity", value: "Low" },
      { label: "Best Time", value: "Warm-up" },
    ],
    tags: ["Warm-Ups", "Pain-Aware Alternatives", "Upper Body", "Activation"],
    details: ["Band external rotations", "Scap push-ups", "Wall slides"],
  },
  {
    id: "zone-2-walk",
    title: "Zone 2 Recovery Walk",
    category: "Walking / Zone 2",
    description: "Low-stress aerobic work to support recovery, fat loss, and consistency.",
    stats: [
      { label: "Area", value: "Full body" },
      { label: "Duration", value: "20-40 min" },
      { label: "Intensity", value: "Easy" },
      { label: "Best Time", value: "Anytime" },
    ],
    tags: ["General Health", "Cut Friendly", "Low Impact", "Recovery"],
    details: ["Keep conversation pace", "Avoid turning it into intervals", "Great after heavy lower days"],
  },
  {
    id: "quad-soft-tissue",
    title: "Quad Soft Tissue + Range",
    category: "Soft Tissue",
    description: "Gentle tissue care and range exposure when quads feel dense after training.",
    stats: [
      { label: "Area", value: "Quads" },
      { label: "Duration", value: "10 min" },
      { label: "Intensity", value: "Low" },
      { label: "Best Time", value: "Cooldown" },
    ],
    tags: ["Cooldowns", "Lower Body", "Soreness", "Mobility"],
    details: ["Light quad rolling", "Couch stretch", "Heel-elevated knee rocks"],
    recommendation: "Useful when quads are hot and heavy knee-extension work should wait.",
  },
];

export default function RecoveryLibraryPage() {
  return (
    <LibraryPageShell
      actionLabel="Add to Recovery Plan"
      categories={categories}
      heroEyebrow="Recovery Library"
      heroMetrics={[
        { label: "Items", value: String(recoveryItems.length), helper: "Mobility and recovery options" },
        { label: "Intensity", value: "Low", helper: "Built to manage training heat" },
        { label: "Best Use", value: "Before / After", helper: "Warm-ups and cooldowns included" },
        { label: "Storage", value: "Local", helper: "Saved to soundFitnessRecoveryLibrary" },
      ]}
      items={recoveryItems}
      libraryId="recovery"
      planStorageKey="soundFitnessRecoveryPlan"
      storageKey="soundFitnessRecoveryLibrary"
      subtitle="Mobility, cooldowns, soreness support, low-load recovery, and tissue-care options."
      title="🩹 Recovery Library"
    />
  );
}
