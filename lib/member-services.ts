import { getSupabaseUser, supabase } from "@/lib/supabaseClient";
import { planningAccountGeneration, planningOwner, planningRecordVersion, readPlanning, writePlanningValues } from "@/lib/planning/store";
import { validDateOnly } from "@/lib/planning/dates";

export type MemberMessage = { id: string; sent_by: "member" | "coach"; body: string; created_at: string };
export type MemberSession = { id: string; starts_at: string; duration_minutes: number; service_type: string | null; location: string | null; status: string; coach_name: string | null };
export type SessionBalances = { training: number | null; stretch: number | null; nutrition: number | null };

async function memberId(generation: number) {
  const requestedOwner = planningOwner();
  const { data, error } = await getSupabaseUser();
  if (error || !data.user) throw new Error("Sign in again to load your account.");
  const owner = planningOwner();
  if (generation !== planningAccountGeneration() || owner !== requestedOwner || !owner || owner !== data.user.id) throw new Error("Your account changed. Reload this page.");
  return data.user.id;
}
function assertMember(id: string, generation: number) {
  if (planningOwner() !== id || generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload this page.");
}
type OwnedRow = Record<string, unknown> & { id: string; member_id: string };
const sessionColumns = "id,member_id,starts_at,duration_minutes,service_type,location,status,coach_name";
const messageColumns = "id,member_id,sent_by,body,created_at";
// Shared database timestamps must identify a real instant; Date.parse alone rolls invalid dates forward.
const timestamp = (value: unknown): value is string => typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) &&
  validDateOnly(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
const messageUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function captureCoachMessageEditor() {
  return { account: planningOwner(), generation: planningAccountGeneration(), draftVersion: planningRecordVersion("coachMessageDraft"), requestVersion: planningRecordVersion("coachMessageRequest") };
}
function assertCoachMessageEditor(editor: ReturnType<typeof captureCoachMessageEditor>) {
  if (!editor.account || planningOwner() !== editor.account || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Copy your draft before reloading messages.");
  if (editor.draftVersion !== planningRecordVersion("coachMessageDraft") || editor.requestVersion !== planningRecordVersion("coachMessageRequest")) throw new Error("Your message draft changed in another tab. Copy this text before reloading to review the saved draft.");
}
export function saveCoachMessageDraft(body: string, editor: ReturnType<typeof captureCoachMessageEditor>) {
  assertCoachMessageEditor(editor);
  if (typeof body !== "string" || body.length > 2000) throw new Error("Keep your message draft within 2,000 characters.");
  const unchanged = readPlanning("coachMessageDraft", "") === body;
  writePlanningValues({ coachMessageDraft: body, coachMessageRequest: unchanged ? readPlanning("coachMessageRequest", null) : null });
  return captureCoachMessageEditor();
}
export function prepareCoachMessageSend(body: string, editor: ReturnType<typeof captureCoachMessageEditor>) {
  assertCoachMessageEditor(editor);
  if (typeof body !== "string" || !body.trim() || body.length > 2000) throw new Error("Write a message of 1–2,000 characters.");
  const existing = readPlanning("coachMessageDraft", "") === body ? readPlanning<unknown>("coachMessageRequest", null) : null;
  if (existing !== null && !messageUuid(existing)) throw new Error("The message request needs review. Copy your draft before editing or reloading.");
  const requestId = existing || crypto.randomUUID();
  writePlanningValues({ coachMessageDraft: body, coachMessageRequest: requestId });
  return { requestId, editor: captureCoachMessageEditor() };
}
export function finishCoachMessageDraft(editor: ReturnType<typeof captureCoachMessageEditor>) {
  assertCoachMessageEditor(editor);
  writePlanningValues({ coachMessageDraft: "", coachMessageRequest: null });
  return captureCoachMessageEditor();
}
const nullableText = (value: unknown) => value === null || typeof value === "string";
function validSession(row: OwnedRow) {
  return timestamp(row.starts_at) && Number.isSafeInteger(row.duration_minutes) && Number(row.duration_minutes) > 0 &&
    typeof row.status === "string" && row.status.length > 0 &&
    [row.service_type, row.location, row.coach_name].every(nullableText);
}
function validMessage(row: OwnedRow) {
  return (row.sent_by === "member" || row.sent_by === "coach") && typeof row.body === "string" && row.body.trim().length > 0 && row.body.trim().length <= 2000 && timestamp(row.created_at);
}
// An immutable id cursor avoids offset shifts. Only an empty page proves the end:
// the backend can impose a smaller cap than our requested page size.
async function loadMemberRows(id: string, table: "member_sessions" | "member_messages", columns: string, valid: (row: OwnedRow) => boolean, generation: number): Promise<OwnedRow[]> {
  const rows: OwnedRow[] = [];
  const deadline = AbortSignal.timeout(60000);
  let cursor: string | null = null;
  while (true) {
    assertMember(id, generation);
    if (deadline.aborted) throw new Error("Your account records took too long to load. Try again.");
    let query = supabase.from(table).select(columns).eq("member_id", id).order("id", { ascending: true }).limit(200);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query.abortSignal(AbortSignal.any([deadline, AbortSignal.timeout(12000)]));
    assertMember(id, generation);
    if (error) throw new Error(table === "member_sessions" ? "Website bookings could not be refreshed. Try again." : "Messages could not be loaded. Try again.");
    if (!Array.isArray(data)) throw new Error("Your account records returned an invalid response. Try again.");
    if (!data.length) return rows;
    let last: string | null = cursor;
    const page: unknown[] = data;
    for (const value of page) {
      const row = value as OwnedRow;
      if (!row || typeof row.id !== "string" || !row.id || row.member_id !== id || last !== null && row.id <= last || !valid(row)) {
        throw new Error("Your account records returned invalid data or page order. Try again.");
      }
      last = row.id;
      rows.push(row);
      if (rows.length > 100000) throw new Error("Your account records are too large to load safely.");
    }
    cursor = last;
  }
}
async function memberSessions(id: string, generation: number): Promise<MemberSession[]> {
  const rows = await loadMemberRows(id, "member_sessions", sessionColumns, validSession, generation);
  assertMember(id, generation);
  return rows.map(row => ({ id: row.id, starts_at: row.starts_at as string, duration_minutes: row.duration_minutes as number,
    service_type: row.service_type as string | null, location: row.location as string | null, status: row.status as string, coach_name: row.coach_name as string | null,
  })).sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at) || a.id.localeCompare(b.id));
}
export async function loadMemberMessages(): Promise<MemberMessage[]> {
  const generation = planningAccountGeneration();
  const id = await memberId(generation);
  const rows = await loadMemberRows(id, "member_messages", messageColumns, validMessage, generation);
  assertMember(id, generation);
  return rows.map(row => ({ id: row.id, sent_by: row.sent_by as MemberMessage["sent_by"], body: row.body as string, created_at: row.created_at as string }))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id));
}
export async function sendMemberMessage(body: string, requestId: string): Promise<MemberMessage> {
  const trimmed = typeof body === "string" ? body.trim() : "";
  if (!trimmed || trimmed.length > 2000) throw new Error("Write a message of 1–2,000 characters.");
  if (!messageUuid(requestId)) throw new Error("The message request needs review. Your draft is preserved; reload before retrying.");
  const generation = planningAccountGeneration();
  const id = await memberId(generation);
  assertMember(id, generation);
  const { data, error } = await supabase.rpc("send_app_member_message", { message_body: trimmed, request_id: requestId, expected_member_id: id }).abortSignal(AbortSignal.timeout(12000));
  assertMember(id, generation);
  if (error) {
    if (error.message?.includes("wait a minute")) throw new Error("Please wait a minute before sending another message.");
    throw new Error("Your message was not confirmed sent. Your draft is still here; retry safely.");
  }
  const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
  if (!row || typeof row !== "object" || !messageUuid(row.id) || row.member_id !== id || row.sent_by !== "member" || row.body !== trimmed || !timestamp(row.created_at) || !messageUuid(row.app_request_id) || row.app_request_id.toLowerCase() !== requestId.toLowerCase()) throw new Error("Your message was not confirmed sent. Your draft is still here; retry safely.");
  return { id: row.id, sent_by: row.sent_by, body: row.body, created_at: row.created_at };
}
export async function loadMemberSchedule(): Promise<{ sessions: MemberSession[]; balances: SessionBalances }> {
  const generation = planningAccountGeneration();
  const id = await memberId(generation);
  const [sessions, balances] = await Promise.all([memberSessions(id, generation), memberBalances(id, generation)]);
  assertMember(id, generation);
  return { sessions, balances };
}
async function memberBalances(id: string, generation: number): Promise<SessionBalances> {
  assertMember(id, generation);
  const profile = await supabase.from("profiles").select("id,sessions_remaining_training,sessions_remaining_stretch,sessions_remaining_nutrition_intro").eq("id", id).abortSignal(AbortSignal.timeout(12000)).single();
  assertMember(id, generation);
  if (profile.error || !profile.data || profile.data.id !== id) throw new Error("Your schedule or session balances could not be loaded. Try again.");
  const balance = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
  return {
    training: balance(profile.data.sessions_remaining_training), stretch: balance(profile.data.sessions_remaining_stretch), nutrition: balance(profile.data.sessions_remaining_nutrition_intro),
  };
}
export async function loadMemberSessionBalances(): Promise<SessionBalances> {
  const generation = planningAccountGeneration();
  return memberBalances(await memberId(generation), generation);
}

export async function loadMemberSessions(): Promise<MemberSession[]> {
  const generation = planningAccountGeneration();
  return memberSessions(await memberId(generation), generation);
}
