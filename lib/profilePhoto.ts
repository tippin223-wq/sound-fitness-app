import { supabase } from "@/lib/supabaseClient";
/** Rasterize a small, metadata-free photo before sending it to the shared website bucket. */
export async function uploadProfilePhoto(source: string, expectedAccount: string): Promise<string> {
  const image = new Image(); image.src = source; await image.decode();
  const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d"); if (!context) throw new Error("Your photo could not be prepared.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Your photo could not be prepared.")), "image/webp", .82));
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== expectedAccount) throw new Error("Sign in to save your photo online.");
  const result = await fetch("/api/profile/photo", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": blob.type }, body: blob });
  const payload = await result.json();
  if (!result.ok || typeof payload.url !== "string") throw new Error(payload.error || "Your photo could not be saved online.");
  return payload.url;
}
