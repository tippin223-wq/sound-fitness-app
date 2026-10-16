"use client";

import { useState } from "react";
import { exportLibraryActivityRecovery, type LibraryActivityRecovery } from "@/lib/planning/libraryActivityRecovery";
import { localDate } from "@/lib/planning/dates";
import { ROUTES } from "@/lib/routes";

export default function LibraryActivityRecoveryView({ review }: { review: LibraryActivityRecovery }) {
  const [error, setError] = useState("");
  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
    <section aria-label="Exercise activity recovery" className="mx-auto max-w-3xl space-y-4 rounded-3xl border border-amber-300/30 p-6">
      <h1 className="text-3xl font-bold">Review saved exercise activity</h1>
      <p>Original records remain saved. Library reporting and logging are paused while these collections need review.</p>
      <ul className="list-disc space-y-2 pl-5 text-amber-200">{review.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>
      <p className="text-sm text-slate-300">The export contains the original exercise activity and workout collections available for this account, plus exact device-cache text when cache recovery is needed. Exporting does not repair, remove, or upload records.</p>
      <button type="button" className="text-cyan-200 underline" onClick={() => {
        try {
          const content = exportLibraryActivityRecovery(review);
          const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
          const link = document.createElement("a"); link.href = url; link.download = `sound-fitness-exercise-activity-recovery-${localDate()}.json`; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000); setError("");
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Export could not be created. Original records remain saved."); }
      }}>Export original activity as JSON</button>
      {error ? <p role="alert" className="text-rose-300">{error}</p> : null}
      <details><summary className="cursor-pointer text-cyan-200">Preview original records</summary>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-300">{JSON.stringify(review.originals, null, 2).slice(0, 12000)}</pre>
        <p className="mt-2 text-xs text-slate-400">Preview limited to 12,000 characters. Export includes the complete collections.</p>
      </details>
      <a href={ROUTES.dashboard.plan} className="block text-cyan-200 underline">Open My Plan</a>
    </section>
  </main>;
}
