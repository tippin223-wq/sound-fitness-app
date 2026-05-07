import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function LegacyWorkoutBuilderSavePage() {
  redirect(ROUTES.workoutBuilder.home);
}
