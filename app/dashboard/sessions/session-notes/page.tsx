import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** Member session reflections share the journal's guarded drafts and history. */
export default function SessionNotesPage() {
  redirect(ROUTES.dashboard.journal);
}
