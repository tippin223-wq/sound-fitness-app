import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const protectedRoutes = [
  "/admin",
  "/coach",
  "/dashboard",
  "/member",
  "/performance",
  "/recovery",
];

const publicAuthRoutes = [
  "/login",
  "/admin/login",
  "/coach/login",
  "/forgot-password",
  "/update-password",
  "/reset-password-sent",
];

function getLoginPath(pathname: string) {
  if (pathname.startsWith("/admin")) return "/admin/login";
  if (pathname.startsWith("/coach")) return "/coach/login";
  return "/login";
}

function getLoggedOutEntryPath(pathname: string) {
  if (pathname.startsWith("/admin") || pathname.startsWith("/coach")) {
    return getLoginPath(pathname);
  }

  return "/";
}

function matchesRouteBoundary(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

// Skip the Supabase round-trip only when the access token has at least this
// long before expiry, so getUser() still runs early enough to refresh.
const SESSION_FRESHNESS_BUFFER_SECONDS = 120;

function base64UrlDecode(segment: string): string | null {
  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

// Reassemble the @supabase/ssr auth cookie: a whole `sb-<ref>-auth-token`
// cookie first, otherwise its `.0`/`.1`/... chunks joined in order (mirrors
// @supabase/ssr's combineChunks).
function readAuthTokenCookie(request: NextRequest): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  let projectRef: string | undefined;
  try {
    projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  } catch {
    return null;
  }
  if (!projectRef) return null;

  const baseName = `sb-${projectRef}-auth-token`;
  const whole = request.cookies.get(baseName)?.value;
  if (whole) return whole;

  const chunks: string[] = [];
  for (let i = 0; ; i++) {
    const chunk = request.cookies.get(`${baseName}.${i}`)?.value;
    if (!chunk) break;
    chunks.push(chunk);
  }
  return chunks.length > 0 ? chunks.join("") : null;
}

// Pull the access token out of the cookie payload, which may be
// "base64-<base64url(JSON)>", raw JSON, URI-encoded JSON, a session object
// with an `access_token` field, or a legacy array whose first entry is the
// token. Returns null on anything unexpected.
function extractAccessToken(cookieValue: string): string | null {
  let raw = cookieValue;

  if (raw.startsWith("base64-")) {
    const decoded = base64UrlDecode(raw.slice("base64-".length));
    if (decoded === null) return null;
    raw = decoded;
  }

  if (!raw.startsWith("{") && !raw.startsWith("[")) {
    try {
      raw = decodeURIComponent(raw);
    } catch {
      return null;
    }
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return parsed[0];
    }
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "access_token" in parsed &&
      typeof (parsed as { access_token: unknown }).access_token === "string"
    ) {
      return (parsed as { access_token: string }).access_token;
    }
  } catch {
    return null;
  }
  return null;
}

// Best-effort read of the access token's `exp` claim. No signature
// verification: this is only a "should we refresh yet" heuristic, never an
// auth decision — data access still verifies the token server-side.
function readAccessTokenExp(request: NextRequest): number | null {
  const cookieValue = readAuthTokenCookie(request);
  if (!cookieValue) return null;

  const accessToken = extractAccessToken(cookieValue);
  if (!accessToken) return null;

  const segments = accessToken.split(".");
  if (segments.length !== 3) return null;

  const payloadJson = base64UrlDecode(segments[1]);
  if (payloadJson === null) return null;

  try {
    const payload: unknown = JSON.parse(payloadJson);
    if (
      payload !== null &&
      typeof payload === "object" &&
      "exp" in payload &&
      typeof (payload as { exp: unknown }).exp === "number" &&
      Number.isFinite((payload as { exp: number }).exp)
    ) {
      return (payload as { exp: number }).exp;
    }
  } catch {
    return null;
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  let response = NextResponse.next({
    request,
  });

  if (publicAuthRoutes.includes(pathname)) {
    return response;
  }

  const isProtected = protectedRoutes.some((route) =>
    matchesRouteBoundary(pathname, route),
  );

  if (!isProtected) {
    return response;
  }

  // Fast path: the only thing getUser() gates here is "does a session exist"
  // for the redirect below. When the cookie holds a token that is nowhere
  // near expiry, pass the request through with cookies untouched instead of
  // paying a Supabase network round-trip. Any parse failure, missing cookie,
  // or near-expiry token falls through to the full getUser() path unchanged.
  const accessTokenExp = readAccessTokenExp(request);
  if (
    accessTokenExp !== null &&
    accessTokenExp - Date.now() / 1000 > SESSION_FRESHNESS_BUFFER_SECONDS
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // "Remember me" opt-out: the sf-session-only marker (set at sign-in)
          // means auth cookies must stay session-scoped, so token refreshes
          // here must not re-add a Max-Age. Deletions keep theirs.
          const sessionOnly = request.cookies.has("sf-session-only");

          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = { ...options };
            if (
              sessionOnly &&
              typeof cookieOptions.maxAge === "number" &&
              cookieOptions.maxAge > 0
            ) {
              delete cookieOptions.maxAge;
              delete cookieOptions.expires;
            }
            response.cookies.set(name, value, cookieOptions);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loggedOutEntryUrl = request.nextUrl.clone();
    loggedOutEntryUrl.pathname = getLoggedOutEntryPath(pathname);
    loggedOutEntryUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loggedOutEntryUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json|woff|woff2|ttf)$).*)",
  ],
};
