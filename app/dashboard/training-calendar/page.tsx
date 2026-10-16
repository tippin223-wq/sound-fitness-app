import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** Keep older calendar links on the canonical member schedule. */
export default function WorkoutCalendarPage() {
  redirect(ROUTES.dashboard.calendar);
}
