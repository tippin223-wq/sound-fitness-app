import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type AdminSubmissionsErrorCode =
  | "forbidden"
  | "not_configured"
  | "unauthorized";

function jsonError(
  error: string,
  status: number,
  code: AdminSubmissionsErrorCode,
) {
  return NextResponse.json({ code, error }, { status });
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function getAdminSupabaseClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export async function GET(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return jsonError("Sign in as an admin to view submissions.", 401, "unauthorized");
  }

  const supabase = getAdminSupabaseClient();

  if (!supabase) {
    return jsonError(
      "Admin submissions require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      503,
      "not_configured",
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return jsonError("Your admin session could not be verified.", 401, "unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return jsonError("Only admin accounts can view submissions.", 403, "forbidden");
  }

  const { data, error } = await supabase
    .from("lead_assessments")
    .select(
      "id, created_at, email, full_name, phone, answers, result_title, result_focus, service_pills, emailed_at, email_error",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    submissions: data ?? [],
  });
}
