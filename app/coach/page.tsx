import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// Canonical coach dashboard route is /coach/dashboard.
export default function CoachRootRedirectPage() {
  redirect(ROUTES.coach.dashboard);
}
