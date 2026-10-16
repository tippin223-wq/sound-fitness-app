import { loadMemberSessions, type MemberSession } from "@/lib/member-services";
import { planningOwner, planningAccountGeneration, PLANNING_UPDATED } from "./store";

let owner: string | null = null;
let generation: number | null = null;
let sessions: MemberSession[] = [];
let status = "";
let request = 0;
let loadingOwner: { account: string; generation: number } | null = null;
export const bookingRefreshStatus = () => owner === planningOwner() && generation === planningAccountGeneration() ? status : "";
export function bookedCalendarItems() {
  if (owner !== planningOwner() || generation !== planningAccountGeneration()) return [];
  return projectBookedSessions(sessions);
}
export function projectBookedSessions(rows: MemberSession[]) {
  return rows.filter(row => ["scheduled", "pending_approval", "completed"].includes(row.status)).flatMap(row => {
    const start = new Date(row.starts_at);
    if (Number.isNaN(start.getTime())) return [];
    const type = /nutrition/i.test(row.service_type || "") ? "Nutrition" : /stretch|mobility/i.test(row.service_type || "") ? "Mobility" : "Strength";
    return [{ id: `website-booking:${row.id}`, bookingId: row.id,
      date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
      time: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
      title: row.service_type || "Coaching session", duration: row.duration_minutes,
      notes: [row.coach_name, row.location].filter(Boolean).join(" · "), type,
      status: row.status === "completed" ? "Completed" : row.status === "pending_approval" ? "Pending Approval" : "Planned",
    }];
  });
}
export async function refreshBookedSessions() {
  const account = planningOwner(), accountGeneration = planningAccountGeneration();
  if (!account || account === "local-preview" || loadingOwner?.account === account && loadingOwner.generation === accountGeneration) return;
  const token = ++request;
  loadingOwner = { account, generation: accountGeneration };
  if (owner !== account || generation !== accountGeneration) { owner = account; generation = accountGeneration; sessions = []; }
  status = "Refreshing website bookings…";
  window.dispatchEvent(new Event(PLANNING_UPDATED));
  try {
    const rows = await loadMemberSessions();
    if (token !== request || planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return;
    sessions = rows; status = "Website bookings updated";
  } catch {
    if (token === request && planningOwner() === account && planningAccountGeneration() === accountGeneration) status = "Website bookings unavailable · Retry";
  } finally {
    if (token === request) { loadingOwner = null; window.dispatchEvent(new Event(PLANNING_UPDATED)); }
  }
}
