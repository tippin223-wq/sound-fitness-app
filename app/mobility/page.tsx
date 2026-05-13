import PublicPortalPreview from "@/components/PublicPortalPreview";

export default function PublicMobilityPage() {
  return (
    <PublicPortalPreview
      eyebrow="Mobility Portal"
      title="Move better before you train harder."
      subtitle="A safe public shell for mobility prep, joint-specific flows, warm-ups, cooldowns, and movement quality."
      dashboardHref="/dashboard/mobility"
      modules={["Hips", "Shoulders", "Ankles", "Full Body Flows"]}
    />
  );
}
