import { createClient } from "@supabase/supabase-js";
import { sanitiseImage } from "@/lib/server/profilePhotoImage";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token || !url || !anon) return Response.json({ error: "Sign in to save your photo." }, { status: 401 });
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return Response.json({ error: "Sign in again to save your photo." }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 524288) return Response.json({ error: "Choose a smaller photo." }, { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Choose a photo." }, { status: 400 });
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.length;
    if (length > 524288) { await reader.cancel(); return Response.json({ error: "Choose a smaller photo." }, { status: 413 }); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const image = sanitiseImage(bytes);
  if (!image) return Response.json({ error: "Use a PNG or WebP photo." }, { status: 415 });
  // The website already owns the avatar bucket and privileged uploader. Pass
  // this verified member token only to that fixed first-party service.
  try {
    const response = await fetch("https://thesoundfitness.com/api/app/profile-photo", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": image.contentType },
      body: Buffer.from(image.bytes), signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok || typeof result.url !== "string" || !result.url.startsWith(`${url}/storage/v1/object/public/avatars/${user.id}/`)) {
      return Response.json({ error: "Your photo could not be saved online. Try again." }, { status: 502 });
    }
    return Response.json({ url: result.url }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Photo storage is temporarily unavailable. Your edits are still here." }, { status: 502 }); }
}
