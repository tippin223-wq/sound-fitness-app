import PublicPortalPreview from "@/components/PublicPortalPreview";

export default function PublicPerformancePage() {
  return (
    <PublicPortalPreview
      eyebrow="Performance Portal"
      title="Power, conditioning, and athletic progress."
      subtitle="A safe public shell for sprint, power, agility, conditioning, and performance tracking previews."
      dashboardHref="/dashboard/performance"
      modules={["Power", "Plyometrics", "Conditioning", "Performance Testing"]}
    />
  );
}
