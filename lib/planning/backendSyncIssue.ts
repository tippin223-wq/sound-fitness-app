/** Classify only explicit backend codes; transport failures and business conflicts keep their own handling. */
export function backendSyncIssue(error: unknown, scope: "planning" | "workouts") {
  if (!error || typeof error !== "object" || Array.isArray(error) || !("code" in error) || typeof error.code !== "string") return null;
  const subject = scope === "planning" ? "planning sync" : "workout sync";
  if (["PGRST205", "PGRST202", "42703"].includes(error.code)) return {
    kind: "setup" as const,
    message: `Backend setup required · ${subject} is unavailable. Saved device data is preserved; retry after setup is completed.`,
  };
  if (error.code === "42501") return {
    kind: "access" as const,
    message: `Cloud access needs review · ${subject} is unavailable. Saved device data is preserved; retry after access is restored.`,
  };
  return null;
}
