import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function LegacyWorkoutBuilderSetsRepsPage() {
  redirect(ROUTES.workoutBuilder.home);
}
