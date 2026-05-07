import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// Legacy workout log route retained as a compatibility wrapper.
export default function LegacyBuilderTrackingLogPage() {
  redirect(ROUTES.dashboard.sessionWorkout);
}
