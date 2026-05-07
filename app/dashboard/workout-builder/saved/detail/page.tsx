import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// Legacy saved-template detail route retained as a compatibility wrapper.
export default function LegacyBuilderSavedDetailPage() {
  redirect(ROUTES.workoutBuilder.home);
}
