import { readWorkoutBuilderTemplatesForSave, workoutTemplateContentVersion, type LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";
import { planningOwner, planningAccountGeneration } from "./store";

export function captureBuilderTemplateEditor(template?: LocalWorkoutBuilderTemplate, account = planningOwner()) {
  return { account, generation: planningAccountGeneration(), template: template ? JSON.parse(JSON.stringify(template)) as LocalWorkoutBuilderTemplate : null,
    version: template ? workoutTemplateContentVersion(template) : null };
}
export type BuilderTemplateEditor = ReturnType<typeof captureBuilderTemplateEditor>;

export function assertBuilderTemplateEditor(editor: BuilderTemplateEditor) {
  if (!editor.account || planningOwner() !== editor.account || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Keep your unsaved workout and reload Builder before saving.");
  const originals = readWorkoutBuilderTemplatesForSave();
  if (!editor.template) return;
  const current = originals.find(template => template.id === editor.template!.id);
  if (!current || workoutTemplateContentVersion(current) !== editor.version) throw new Error("The loaded workout changed or was removed. Keep your unsaved edits and reload its current version before saving.");
}
