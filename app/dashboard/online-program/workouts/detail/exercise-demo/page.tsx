import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// Legacy Online Program route retained as a compatibility wrapper.
export default function LegacyOnlineProgramExerciseDemoPage() {
  redirect(ROUTES.workoutBuilder.exerciseDemo);
}
