import AppHeader from "@/components/AppHeader";
import { ProfileProvider } from "@/components/profile/ProfileProvider";
import { NutritionPortalNav } from "./_components/NutritionPortal";

export const metadata = {
  title: "Nutrition Portal | Sound Fitness",
  description: "Fuel performance, recovery, and body-composition goals.",
};

export default function NutritionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileProvider>
      <AppHeader />
      <div className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.15),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.12),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] text-white">
        <div className="mx-auto w-full max-w-[1500px] space-y-5 px-3 py-5 sm:px-5 lg:px-8">
          <NutritionPortalNav />
          {children}
        </div>
      </div>
    </ProfileProvider>
  );
}
