import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPostLoginRedirectPath, type AuthRole } from "@/lib/authRedirects";
import { ROUTES } from "@/lib/routes";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type PendingCookie = {
  name: string;
  options: CookieOptions;
  value: string;
};

export type AuthProvider = "google" | "facebook";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  // Which button started this. Anything unexpected falls back to "google" so a
  // tampered/absent value can't produce a nonsense message.
  const providerParam = requestUrl.searchParams.get("provider");
  const provider: AuthProvider =
    providerParam === "facebook" ? "facebook" : "google";
  const cookieStore = await cookies();
  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders = new Headers();

  const redirectWithAuthCookies = (path: string) => {
    const response = NextResponse.redirect(new URL(path, requestUrl.origin));

    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    pendingHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  };

  const failWith = (reason: string) =>
    redirectWithAuthCookies(
      `${ROUTES.auth.login}?auth_error=${reason}&provider=${provider}`,
    );

  if (!code) {
    return failWith("oauth");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        pendingCookies.push(...cookiesToSet);
        Object.entries(headers).forEach(([key, value]) => {
          pendingHeaders.set(key, value);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return failWith("oauth");
  }

  // Facebook can hand back an account with no email (phone-only accounts, or
  // the user declined the email permission). Everything downstream — results,
  // receipts, password recovery — is keyed on email, so don't let a session
  // like that through.
  if (!data.user.email) {
    await supabase.auth.signOut();
    return failWith("email");
  }

  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const needsMfa =
    aalData?.nextLevel === "aal2" && aalData.currentLevel !== "aal2";

  if (needsMfa) {
    const params = new URLSearchParams({ mfa: "required" });
    if (next) params.set("next", next);
    return redirectWithAuthCookies(`${ROUTES.auth.login}?${params.toString()}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile?.role) {
    await supabase.auth.signOut();
    return failWith("profile");
  }

  const destination = getPostLoginRedirectPath(profile.role as AuthRole, next);
  return redirectWithAuthCookies(destination);
}
