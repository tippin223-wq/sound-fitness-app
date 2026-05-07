import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function LegacyWorkoutBuilderBuildPage() {
  redirect(ROUTES.workoutBuilder.home);
}
