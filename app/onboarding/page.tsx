import { Suspense } from "react";
import OnboardingQuestionnaire from "@/components/onboarding/OnboardingQuestionnaire";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#020713]" />}>
      <OnboardingQuestionnaire />
    </Suspense>
  );
}
