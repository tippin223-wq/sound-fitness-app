import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function LegacyCoachDashboardRedirectPage() {
  redirect(ROUTES.coach.dashboard);
}
