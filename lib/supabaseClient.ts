import {
  createBrowserClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * "Remember me" support. When the user opts out at sign-in, every auth cookie
 * is written WITHOUT Max-Age/Expires, so the session ends when the browser
 * closes. The choice rides in a session-scoped marker cookie so the proxy can
 * strip lifetimes from its own token-refresh writes too (see proxy.ts). The
 * marker dying with the browser is consistent: the session cookies it
 * governed die with it.
 */
export const SUPABASE_SESSION_ONLY_COOKIE = "sf-session-only";

const isSessionOnly = () =>
  typeof document !== "undefined" &&
  document.cookie
    .split("; ")
    .some((cookie) => cookie.startsWith(`${SUPABASE_SESSION_ONLY_COOKIE}=`));

export const setSupabaseSessionPersistence = (remember: boolean) => {
  if (typeof document === "undefined") return;
  document.cookie = remember
    ? `${SUPABASE_SESSION_ONLY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
    : `${SUPABASE_SESSION_ONLY_COOKIE}=1; Path=/; SameSite=Lax`;
};

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    getAll() {
      if (typeof document === "undefined") return [];
      return parseCookieHeader(document.cookie).map(({ name, value }) => ({
        name,
        value: value ?? "",
      }));
    },
    setAll(cookiesToSet) {
      if (typeof document === "undefined") return;
      for (const { name, value, options } of cookiesToSet) {
        const cookieOptions = { ...options };
        // Strip lifetimes only from real writes; deletions (Max-Age 0) must
        // keep theirs or sign-out would leave session cookies behind.
        if (
          isSessionOnly() &&
          typeof cookieOptions.maxAge === "number" &&
          cookieOptions.maxAge > 0
        ) {
          delete cookieOptions.maxAge;
          delete cookieOptions.expires;
        }
        document.cookie = serializeCookieHeader(name, value, cookieOptions);
      }
    },
  },
});

type SupabaseUserResponse = Awaited<ReturnType<typeof supabase.auth.getUser>>;

let pendingSupabaseUser: Promise<SupabaseUserResponse> | null = null;

const createSupabaseUserErrorResponse = (
  error: unknown,
): SupabaseUserResponse =>
  ({
    data: { user: null },
    error: error instanceof Error ? error : new Error(String(error)),
  }) as SupabaseUserResponse;

export const getSupabaseUser = async (): Promise<SupabaseUserResponse> => {
  if (!pendingSupabaseUser) {
    pendingSupabaseUser = supabase.auth
      .getUser()
      .catch(createSupabaseUserErrorResponse)
      .finally(() => {
        pendingSupabaseUser = null;
      });
  }

  return pendingSupabaseUser;
};
