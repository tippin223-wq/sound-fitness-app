import "server-only";
import { createClient } from "@supabase/supabase-js";

export async function trainerContext(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return { error: "Sign in with a coach or admin account to open your workspace.", status: 401 } as const;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { error: "Trainer sign-in is not configured on this deployment.", status: 503 } as const;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return { error: "Your session expired. Sign in again.", status: 401 } as const;
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profileError || !["coach", "admin"].includes(profile?.role)) return { error: "This workspace requires a coach or admin account.", status: 403 } as const;
  return { db, user };
}
