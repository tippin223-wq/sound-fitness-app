export function onlineVideoSession(service: string | null | undefined, status: string) {
  return status === "scheduled" && Boolean(service?.toLowerCase().includes("online"));
}
export function videoCallWindow(startsAt: string, now = Date.now()) {
  const starts = Date.parse(startsAt);
  if (!Number.isFinite(starts)) return "This session time needs review.";
  if (now < starts - 30 * 60000) return "Video opens 30 minutes before your session.";
  if (now > starts + 3 * 3600000) return "This video session has ended.";
  return "";
}
