import PublicPortalPreview from "@/components/PublicPortalPreview";

export default function PublicRecoveryPage() {
  return (
    <PublicPortalPreview
      eyebrow="Recovery Portal"
      title="Readiness, soreness, and low-load support."
      subtitle="A safe public shell for recovery protocols, cooldowns, mobility, tissue care, and alternate training options."
      dashboardHref="/dashboard/recovery"
      modules={["Cooldowns", "Breathing", "Pain-Aware Alternatives", "Readiness"]}
    />
  );
}
