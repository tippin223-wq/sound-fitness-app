import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// Legacy workout progress route retained as a compatibility wrapper.
export default function LegacyBuilderTrackingProgressPage() {
  redirect(ROUTES.dashboard.stats);
}
