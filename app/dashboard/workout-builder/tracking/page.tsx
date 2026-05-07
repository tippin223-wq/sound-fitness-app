import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// Legacy workout tracking route retained as a compatibility wrapper.
export default function LegacyBuilderTrackingPage() {
  redirect(ROUTES.dashboard.stats);
}
