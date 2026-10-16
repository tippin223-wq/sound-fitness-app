import type { PlanEditor } from "@/lib/localData/workoutPlanData";
import { keepPlanDraft, type PlanDraftEditor, type PlanFormDraft } from "./planEditorDraft";

type Scheduler = { schedule: (callback: () => void) => () => void };
const defaultScheduler: Scheduler = { schedule: callback => { const timer = setTimeout(callback, 800); return () => clearTimeout(timer); } };

/** One explicitly enabled editor session. A failed write stops all automatic retries. */
export function createPlanDraftAutosave(
  draftEditor: PlanDraftEditor,
  callbacks: { saved: (editor: PlanDraftEditor, form: PlanFormDraft) => void; failed: (message: string) => void },
  scheduler: Scheduler = defaultScheduler,
) {
  let currentEditor = { ...draftEditor };
  let pending: { form: PlanFormDraft; editor: PlanEditor } | null = null;
  let cancel: (() => void) | null = null;
  let stopped = false;
  let lastSavedInput = "";
  function stop() { stopped = true; cancel?.(); cancel = null; pending = null; }
  function flush() {
    cancel?.(); cancel = null;
    if (stopped) return false;
    if (!pending) return true;
    const next = pending; pending = null;
    try {
      currentEditor = keepPlanDraft(next.form, next.editor, currentEditor);
      lastSavedInput = JSON.stringify(next);
      callbacks.saved({ ...currentEditor }, JSON.parse(JSON.stringify(next.form)) as PlanFormDraft);
      return true;
    } catch (cause) {
      stop();
      callbacks.failed(cause instanceof Error ? cause.message : "Draft autosave failed. Export your open form before leaving.");
      return false;
    }
  }
  function queue(form: PlanFormDraft, editor: PlanEditor) {
    if (stopped) return;
    cancel?.();
    cancel = null; pending = null;
    const json = JSON.stringify({ form, editor });
    if (json === lastSavedInput) return;
    pending = JSON.parse(json) as NonNullable<typeof pending>;
    cancel = scheduler.schedule(() => { flush(); });
  }
  return { queue, flush, stop };
}
