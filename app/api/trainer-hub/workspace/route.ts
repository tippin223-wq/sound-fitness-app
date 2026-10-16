import { NextResponse } from "next/server";
import { emptyHub, hubDocumentIssue } from "@/lib/trainer-hub/model";
import { trainerContext } from "@/lib/trainer-hub/server";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
const unavailable = () => reply({ error: "Workspace storage is unavailable. Your administrator needs to activate the Trainer Hub database migration before live records can be saved." }, 503);

export async function GET(request: Request) {
  const context = await trainerContext(request);
  if ("error" in context) return reply({ error: context.error }, context.status);
  const { data, error } = await context.db.from("trainer_hub_workspaces").select("document, revision").eq("owner_id", context.user.id).maybeSingle();
  if (error) return unavailable();
  if (data && hubDocumentIssue(data.document)) return reply({ error: "Your stored workspace needs review. Its original records have not been changed." }, 422);
  return reply(data ?? { document: emptyHub(), revision: 0 });
}

export async function PUT(request: Request) {
  const context = await trainerContext(request);
  if ("error" in context) return reply({ error: context.error }, context.status);
  if (Number(request.headers.get("content-length") || 0) > 1_000_000) return reply({ error: "This workspace is too large to save." }, 413);
  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 1_000_000) return reply({ error: "This workspace is too large to save." }, 413);
    body = JSON.parse(raw);
  } catch { return reply({ error: "Send a valid workspace document." }, 400); }
  if (!body || !Number.isSafeInteger(body.revision) || body.revision < 0 || typeof body.mutationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.mutationId)) return reply({ error: "A workspace revision and save identity are required." }, 400);
  const issue = hubDocumentIssue(body.document);
  if (issue) return reply({ error: issue }, 400);
  const { data, error } = await context.db.rpc("save_trainer_hub_workspace", { p_document: body.document, p_expected_revision: body.revision, p_mutation_id: body.mutationId });
  if (error?.code === "40001" || error?.code === "23505") return reply({ error: "This workspace changed in another tab. Your unsaved form is still here. Reload the workspace before saving again." }, 409);
  if (error?.code === "42501") return reply({ error: "Your account cannot save this workspace." }, 403);
  if (error) return unavailable();
  return reply(data);
}
