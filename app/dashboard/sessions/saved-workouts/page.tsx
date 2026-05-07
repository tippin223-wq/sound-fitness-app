import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// Legacy saved-workouts route retained as a compatibility wrapper.
export default function LegacySessionSavedWorkoutsPage() {
  redirect(ROUTES.dashboard.sessions);
}
