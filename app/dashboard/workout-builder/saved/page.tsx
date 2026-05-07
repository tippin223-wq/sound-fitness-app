import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// Legacy saved-template route retained as a compatibility wrapper.
export default function LegacyBuilderSavedPage() {
  redirect(ROUTES.workoutBuilder.home);
}
