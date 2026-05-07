import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function LegacyWorkoutBuilderAddExercisesPage() {
  redirect(ROUTES.workoutBuilder.addExercises);
}
